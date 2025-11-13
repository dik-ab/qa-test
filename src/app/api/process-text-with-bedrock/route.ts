import { NextRequest, NextResponse } from 'next/server';
import { GenerationMode, generateFAQFlexible } from '@/utils/flexible-generation';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const text = formData.get('text') as string;
    const numQuestions = Number(formData.get('numQuestions') || 5);
    const generationMode = (formData.get('generationMode') as GenerationMode) || 'both';
    const useTE = formData.get('useTE') === 'true';
    const teQuestionPrompt = formData.get('teQuestionPrompt') as string | null;
    const teAnswerPrompt = formData.get('teAnswerPrompt') as string | null;
    const existingQuestionsJson = formData.get('existingQuestions') as string | null;
    const existingQuestions = existingQuestionsJson ? JSON.parse(existingQuestionsJson) : undefined;
    const generateExpansion = formData.get('generateExpansion') === 'true';
    const customPrompt = formData.get('customPrompt') as string | null;

    if (!text) {
      return NextResponse.json(
        { error: 'テキストが提供されていません' },
        { status: 400 }
      );
    }

    const questions = await generateFAQFlexible(
      text,
      generationMode,
      existingQuestions,
      teQuestionPrompt || customPrompt || undefined,
      teAnswerPrompt || customPrompt || undefined,
      numQuestions,
      useTE,
      generateExpansion
    );

    return NextResponse.json({
      questions,
      extractedText: text // テキストを返す（UI側で必要な場合のため）
    });
  } catch (error) {
    console.error('Error processing text with Bedrock:', error);
    return NextResponse.json(
      { error: 'テキストの処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}