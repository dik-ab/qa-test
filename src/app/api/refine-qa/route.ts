import { NextRequest, NextResponse } from 'next/server';
import { refineQAWithDiff } from '@/utils/bedrock';

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

    console.log(`処理対象: ${limitedQAData.length}件のQAデータ`);

    // 新しい統合関数を使用して精査と差分生成を実行
    const result = await refineQAWithDiff(limitedQAData);

    console.log(`精査完了: ${result.refinedData.length}件のQAデータを処理しました`);
    console.log(`差分レポート: ${result.diffReportPath}`);

    return NextResponse.json({
      success: true,
      data: result.refinedData,
      diffReportPath: result.diffReportPath
    });

  } catch (error) {
    console.error('QA精査エラー:', error);
    return NextResponse.json(
      { error: 'QAデータの精査中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
