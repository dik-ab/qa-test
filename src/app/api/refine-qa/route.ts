import { NextRequest, NextResponse } from 'next/server';
import { refineQAPair } from '@/utils/bedrock';

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
