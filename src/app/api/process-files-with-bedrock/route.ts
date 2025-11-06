import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { generateQuestionsFromText } from '@/utils/bedrock';
import { DocumentType, getPromptForDocumentType } from '@/utils/document-type-prompts';
import { validateAndFixAnswers } from '@/utils/answer-validation';
import { generateFAQTwoStage } from '@/utils/two-stage-generation';
import { GenerationMode, generateFAQFlexible } from '@/utils/flexible-generation';

export const maxDuration = 60;

// AWS Bedrock クライアントの初期化
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.NODE_ENV === 'production' 
    ? {}
    : {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
      }
  ),
});

// Claude 4.5 Sonnet モデルID (PDFサポート付き)
const MODEL_ID = 'us.anthropic.claude-sonnet-4-5-20250929-v1:0';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const numQuestions = Number(formData.get('numQuestions') || 5);
    const comprehensiveMode = formData.get('comprehensiveMode') === 'true';
    const customPrompt = formData.get('customPrompt') as string | null;
    const fileType = formData.get('fileType') as string;
    const documentType = (formData.get('documentType') as DocumentType) || 'general';
    const enableValidation = formData.get('enableValidation') === 'true';
    const enableTwoStageGeneration = formData.get('enableTwoStageGeneration') === 'true';
    const generationMode = (formData.get('generationMode') as GenerationMode) || 'both';
    const useTE = formData.get('useTE') === 'true';
    const teQuestionPrompt = formData.get('teQuestionPrompt') as string | null;
    const teAnswerPrompt = formData.get('teAnswerPrompt') as string | null;
    const existingQuestionsJson = formData.get('existingQuestions') as string | null;
    const existingQuestions = existingQuestionsJson ? JSON.parse(existingQuestionsJson) : undefined;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'ファイルが提供されていません' },
        { status: 400 }
      );
    }

    const allExtractedTexts = [];

    // ファイル処理ループ
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      
      if (fileType === 'pdf') {
        // PDFの場合：Claude 4のPDFサポート機能で直接処理
        const base64Pdf = fileBuffer.toString('base64');
        
        const prompt = `このPDFドキュメントに含まれているテキストを全て正確に抽出してください。
以下の指示に従ってください：

1. PDF内の全てのテキストを読み取り、元の順序と構造を保持して出力してください
2. 表形式のデータは適切にフォーマットしてください
3. 見出し、本文、注釈などの階層構造を維持してください
4. 複数ページある場合は、ページごとに区切って表示してください
5. 読み取れない部分は「[読み取り不可]」と記載してください
6. 画像内のテキストも含めて抽出してください

抽出したテキストのみを出力し、説明や追加のコメントは含めないでください。`;

        const response = await bedrockClient.send(
          new InvokeModelCommand({
            modelId: MODEL_ID,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify({
              anthropic_version: 'bedrock-2023-05-31',
              max_tokens: 8192,
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: prompt
                    },
                    {
                      type: 'document',
                      source: {
                        type: 'base64',
                        media_type: 'application/pdf',
                        data: base64Pdf
                      }
                    }
                  ]
                }
              ]
            }),
          })
        );

        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const extractedText = responseBody.content[0].text;
        
        if (extractedText && extractedText.trim()) {
          allExtractedTexts.push(`--- PDF: ${file.name} ---\n${extractedText}`);
        }
      } else {
        // 画像ファイルの場合：直接処理
        const base64Image = fileBuffer.toString('base64');
        
        // 画像のMIMEタイプを判定
        let mimeType = file.type;
        if (!mimeType || mimeType === 'application/octet-stream') {
          const extension = file.name.split('.').pop()?.toLowerCase();
          const mimeTypeMap: { [key: string]: string } = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'bmp': 'image/bmp',
            'webp': 'image/webp'
          };
          mimeType = mimeTypeMap[extension || ''] || 'image/jpeg';
        }

        const prompt = `この画像に含まれているテキストを全て正確に抽出してください。
以下の指示に従ってください：

1. 画像内の全てのテキストを読み取り、元の順序と構造を保持して出力してください
2. 表形式のデータは適切にフォーマットしてください
3. 見出し、本文、注釈などの階層構造を維持してください
4. 読み取れない部分は「[読み取り不可]」と記載してください
5. 画像やグラフの説明は含めず、テキスト情報のみを抽出してください

抽出したテキストのみを出力し、説明や追加のコメントは含めないでください。`;

        const response = await bedrockClient.send(
          new InvokeModelCommand({
            modelId: MODEL_ID,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify({
              anthropic_version: 'bedrock-2023-05-31',
              max_tokens: 4096,
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'image',
                      source: {
                        type: 'base64',
                        media_type: mimeType,
                        data: base64Image
                      }
                    },
                    {
                      type: 'text',
                      text: prompt
                    }
                  ]
                }
              ]
            }),
          })
        );

        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const extractedText = responseBody.content[0].text;
        
        if (extractedText && extractedText.trim()) {
          allExtractedTexts.push(`--- 画像: ${file.name} ---\n${extractedText}`);
        }
      }
    }

    // 複数のファイルから抽出したテキストを結合
    const combinedText = allExtractedTexts.join('\n\n');

    // テキストが長すぎる場合は切り詰める
    const maxTextLength = 100000;
    const truncatedText = combinedText.length > maxTextLength
      ? combinedText.substring(0, maxTextLength) + '...(テキストが長すぎるため切り詰められました)'
      : combinedText;

    let questions;

    if (useTE) {
      // TE モードの場合
      console.log('Using TE mode with generation mode:', generationMode);
      questions = await generateFAQFlexible(
        truncatedText,
        generationMode,
        existingQuestions, // 既存の質問（answers_onlyモードで使用）
        teQuestionPrompt || undefined,
        teAnswerPrompt || undefined,
        numQuestions
      );
    } else if (enableTwoStageGeneration) {
      // 2段階生成モードの場合
      console.log('Using two-stage generation mode...');
      questions = await generateFAQTwoStage(
        truncatedText,
        numQuestions,
        documentType
      );
    } else {
      // 通常の1段階生成モード
      const promptToUse = getPromptForDocumentType(documentType, customPrompt || undefined);
      questions = await generateQuestionsFromText(
        truncatedText,
        numQuestions,
        promptToUse,
        comprehensiveMode
      );
    }

    // バリデーションが有効かつ2段階生成モード・TEモードでない場合のみ、回答を検証・修正
    // (2段階生成モードとTEモードでは既に精度の高い回答が生成されているため)
    if (enableValidation && !enableTwoStageGeneration && !useTE) {
      const validatedQuestions = await validateAndFixAnswers(questions, truncatedText);
      questions = validatedQuestions.map(({ question, answer }) => ({ question, answer }));
    }

    return NextResponse.json({
      questions,
      extractedText: truncatedText
    });
  } catch (error) {
    console.error('Error processing files with Bedrock:', error);
    return NextResponse.json(
      { error: 'ファイルの処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}