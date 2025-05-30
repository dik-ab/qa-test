import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromMultiplePdfs } from '@/utils/pdf';
import { generateQuestionsFromText } from '@/utils/bedrock';

export const maxDuration = 60; // 60秒のタイムアウト（Vercel hobbyプランの上限）

export async function POST(request: NextRequest) {
  try {
    // multipart/form-dataからファイルを取得
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const numQuestions = Number(formData.get('numQuestions') || 5);
    const comprehensiveMode = formData.get('comprehensiveMode') === 'true';
    const customPrompt = formData.get('customPrompt') as string | null;

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'PDFファイルが提供されていません' },
        { status: 400 }
      );
    }

    // ファイルがPDFかどうかを確認
    const invalidFiles = files.filter(file => file.type !== 'application/pdf');
    if (invalidFiles.length > 0) {
      return NextResponse.json(
        { error: 'すべてのファイルがPDF形式である必要があります' },
        { status: 400 }
      );
    }

    // PDFからテキストを抽出
    const extractedText = await extractTextFromMultiplePdfs(files);

    // テキストが長すぎる場合は切り詰める（Claudeのコンテキストウィンドウに収まるように）
    const maxTextLength = 100000; // 適切な長さに調整
    const truncatedText = extractedText.length > maxTextLength
      ? extractedText.substring(0, maxTextLength) + '...(テキストが長すぎるため切り詰められました)'
      : extractedText;

    // クエスチョンデータを生成（カスタムプロンプトがあれば使用）
    const questions = await generateQuestionsFromText(
      truncatedText, 
      numQuestions, 
      customPrompt || undefined,
      comprehensiveMode
    );

    return NextResponse.json({ questions, extractedText });
  } catch (error) {
    console.error('Error processing PDFs:', error);
    return NextResponse.json(
      { error: 'PDFの処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
