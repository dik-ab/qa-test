import { NextRequest, NextResponse } from 'next/server';
import { generateQuestionsFromText } from '@/utils/bedrock';

export async function POST(request: NextRequest) {
  try {
    const { qaData } = await request.json();

    if (!qaData || !Array.isArray(qaData)) {
      return NextResponse.json(
        { error: 'QAデータが提供されていません' },
        { status: 400 }
      );
    }

    // 最初の20個だけを処理（エラー回避のため）
    const limitedQAData = qaData.slice(0, 20);
    const refinedQAData = [];

    console.log(`処理対象: ${limitedQAData.length}件のQAデータ`);

    for (let i = 0; i < limitedQAData.length; i++) {
      const qa = limitedQAData[i];
      
      if (!qa.question || !qa.answer) {
        console.log(`スキップ: ${i + 1}件目 - 質問または回答が空です`);
        continue;
      }

      console.log(`処理中: ${i + 1}/${limitedQAData.length}件目`);
      console.log(`質問: ${qa.question.substring(0, 50)}...`);
      console.log(`回答: ${qa.answer.substring(0, 100)}...`);

      // 各QAペアを個別に精査
      const refinedResult = await refineQAPair(qa.question, qa.answer);
      refinedQAData.push(refinedResult);
    }

    console.log(`精査完了: ${refinedQAData.length}件のQAデータを処理しました`);

    return NextResponse.json({
      success: true,
      data: refinedQAData
    });

  } catch (error) {
    console.error('QA精査エラー:', error);
    return NextResponse.json(
      { error: 'QAデータの精査中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * 単一のQAペアを精査する
 */
async function refineQAPair(question: string, answer: string): Promise<{ question: string, answer: string }> {
  console.log
  
  
  ("ansser", answer)
  const prompt = `
以下の質問と回答のペアを分析し、FAQサイトに適した形式に精査してください。

【元の質問】
${question}

【元の回答】
${answer}

## 精査の要件：

### 質問の精査：
・質問文は変更しない（元の質問をそのまま使用する）

### 回答の精査：
・元の回答の意味や内容を絶対に変更しない
・FAQサイトはリテラシーの低い方も閲覧するため、回答の説明は丁寧な表現にする
・URLやリンクがある場合は、適切なリンク形式で出力する
・元の回答にある具体的な数値、日付、手順、条件などは必ず保持する

## 出力形式：
以下のJSON形式で返してください。JSONのみを返し、説明や追加のテキストは不要です：

{
  "question": "元の質問文をそのまま使用",
  "answer": "精査された回答文（元の意味と情報を完全に保持）"
}
`;

  try {
    // Bedrockを使用してQAペアを精査
    const result = await generateQuestionsFromText('', 1, prompt);
    
    if (result && result.length > 0) {
      return {
        question: result[0].question || question,
        answer: result[0].answer || answer
      };
    }
    
    // 精査に失敗した場合は元のデータを返す
    return { question, answer };
    
  } catch (error) {
    console.error('QAペア精査エラー:', error);
    // エラーの場合は元のデータを返す
    return { question, answer };
  }
}
