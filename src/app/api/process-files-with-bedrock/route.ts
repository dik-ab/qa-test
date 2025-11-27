import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { generateQuestionsFromText, generateQuestionsDirectlyFromDocument, generateQAFlexibleDirectly } from '@/utils/bedrock';
import { DocumentType, getPromptForDocumentType } from '@/utils/document-type-prompts';
import { GenerationMode, generateFAQFlexible } from '@/utils/flexible-generation';
import { readFileSync } from 'fs';
import { join } from 'path';

export const maxDuration = 60;

// AWS Bedrock クライアントの初期化
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'ap-northeast-1',
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
const MODEL_ID = 'global.anthropic.claude-sonnet-4-5-20250929-v1:0';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const numQuestions = Number(formData.get('numQuestions') || 5);
    const customPrompt = formData.get('customPrompt') as string | null;
    const fileType = formData.get('fileType') as string;
    const documentType = (formData.get('documentType') as DocumentType) || 'consumer';
    const generationMode = (formData.get('generationMode') as GenerationMode) || 'both';
    const useTE = formData.get('useTE') === 'true';
    const teQuestionPrompt = formData.get('teQuestionPrompt') as string | null;
    const teAnswerPrompt = formData.get('teAnswerPrompt') as string | null;
    const existingQuestionsJson = formData.get('existingQuestions') as string | null;
    const existingQuestions = existingQuestionsJson ? JSON.parse(existingQuestionsJson) : undefined;
    const generateExpansion = formData.get('generateExpansion') === 'true';
    const enableStability = formData.get('enableStability') === 'true';
    const useDirectGeneration = formData.get('useDirectGeneration') === 'true';

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'ファイルが提供されていません' },
        { status: 400 }
      );
    }

    // 直接生成モードの場合
    if (useDirectGeneration) {
      let allQuestions: any[] = [];
      
      // プロンプトファイルから読み込み（TEモードまたはdocomoモード）
      let questionPrompt: string | undefined;
      let answerPrompt: string | undefined;
      
      if (useTE) {
        try {
          questionPrompt = readFileSync(join(process.cwd(), 'src/prompts/te-q.txt'), 'utf8');
          answerPrompt = readFileSync(join(process.cwd(), 'src/prompts/te-ans.txt'), 'utf8');
        } catch (error) {
          console.log('Using user-provided TE prompts');
          questionPrompt = teQuestionPrompt || undefined;
          answerPrompt = teAnswerPrompt || undefined;
        }
      } else if (documentType === 'enterprise') {
        // B/E向けの場合、docomoプロンプトを使用
        try {
          questionPrompt = readFileSync(join(process.cwd(), 'src/prompts/docomo-q.txt'), 'utf8');
          answerPrompt = readFileSync(join(process.cwd(), 'src/prompts/docomo-ans.txt'), 'utf8');
        } catch (error) {
          console.log('Using default prompts for enterprise');
        }
      }
      
      // 各ファイルに対して直接生成
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        
        // MIMEタイプの決定
        let mimeType = file.type;
        if (fileType === 'pdf') {
          mimeType = 'application/pdf';
        } else if (!mimeType || mimeType === 'application/octet-stream') {
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
        
        let questions;
        
        if (generationMode === 'both' && !useTE && documentType !== 'enterprise') {
          // 統合生成モード（C向けの通常モード）
          questions = await generateQuestionsDirectlyFromDocument(
            fileBuffer,
            fileType as 'pdf' | 'image',
            mimeType,
            numQuestions,
            customPrompt || undefined
          );
        } else {
          // 分離生成モード（TEモード、B/E向け、または分離モード指定時）
          questions = await generateQAFlexibleDirectly(
            fileBuffer,
            fileType as 'pdf' | 'image',
            mimeType,
            generationMode,
            numQuestions,
            existingQuestions,
            questionPrompt || customPrompt || undefined,
            answerPrompt || customPrompt || undefined,
            generateExpansion,
            enableStability
          );
        }
        
        allQuestions = allQuestions.concat(questions);
      }
      
      return NextResponse.json({
        questions: allQuestions,
        extractedText: '直接生成モードではテキスト抽出は行われません'
      });
    }
    
    // 従来のテキスト抽出モード
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
        numQuestions,
        true, // TEモード
        generateExpansion,
        enableStability
      );
    } else if (generationMode !== 'both') {
      // 2段階生成モードまたは通常モードで質問・回答を別々に生成する場合
      console.log('Using flexible generation mode:', generationMode);
      
      // C向けの場合、専用プロンプトを使用（カスタムプロンプトがない場合）
      questions = await generateFAQFlexible(
        truncatedText,
        generationMode,
        existingQuestions, // 既存の質問（answers_onlyモードで使用）
        customPrompt || undefined, // カスタム質問プロンプト
        customPrompt || undefined, // カスタム回答プロンプト
        numQuestions,
        false, // C向けなのでTEモードではない
        generateExpansion,
        enableStability
      );
    } else {
      // 通常の1段階生成モード
      const promptToUse = getPromptForDocumentType(documentType, customPrompt || undefined);
      questions = await generateQuestionsFromText(
        truncatedText,
        numQuestions,
        promptToUse
      );
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