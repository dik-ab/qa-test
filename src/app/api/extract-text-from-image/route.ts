import { NextRequest, NextResponse } from 'next/server';
import { generateQuestionsFromText } from '@/utils/bedrock';

export const maxDuration = 60; // 60秒のタイムアウト（Vercel hobbyプランの上限）

export async function POST(request: NextRequest) {
  try {
    // multipart/form-dataからファイルを取得
    const formData = await request.formData();
    const extractedText = formData.get('extractedText') as string;
    const numQuestions = Number(formData.get('numQuestions') || 5);
    const comprehensiveMode = formData.get('comprehensiveMode') === 'true';
    const customPrompt = formData.get('customPrompt') as string | null;

    if (!extractedText) {
      return NextResponse.json(
        { error: '抽出されたテキストが提供されていません' },
        { status: 400 }
      );
    }

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

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Error processing text:', error);
    return NextResponse.json(
      { error: 'テキストの処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
