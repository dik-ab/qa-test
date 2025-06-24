import { NextRequest, NextResponse } from 'next/server';
import { DocomoCSVParser } from '@/utils/csvParser';
import { generateCustomerSituation } from '@/utils/bedrock';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが選択されていません' },
        { status: 400 }
      );
    }

    // CSVファイルの内容を読み取り
    const csvContent = await file.text();
    
    // CSVをパース
    const qaData = DocomoCSVParser.parseCSV(csvContent);
    
    if (qaData.length === 0) {
      return NextResponse.json(
        { error: 'CSVファイルからデータを読み取れませんでした' },
        { status: 400 }
      );
    }

    console.log(`処理開始: ${qaData.length}件のQAデータ`);

    // 処理負荷軽減のため、最初の20件のみを処理対象とする
    const maxProcessCount = 20;
    const processCount = Math.min(qaData.length, maxProcessCount);
    
    console.log(`処理対象: ${processCount}件のQAデータ（最大${maxProcessCount}件まで）`);

    // 各QAペアに対して顧客の状況を推測
    const processedData = [];
    
    for (let i = 0; i < processCount; i++) {
      const qa = qaData[i];
      
      if (!qa.question || !qa.answer) {
        console.log(`スキップ: ${i + 1}件目 - 質問または回答が空です`);
        processedData.push({
          ...qa,
          customerSituation: ''
        });
        continue;
      }

      console.log(`処理中: ${i + 1}/${qaData.length}件目`);
      
      try {
        const customerSituation = await generateCustomerSituation(qa.question, qa.answer);
        processedData.push({
          ...qa,
          customerSituation
        });
      } catch (error) {
        console.error(`エラー: ${i + 1}件目の処理中にエラーが発生しました:`, error);
        processedData.push({
          ...qa,
          customerSituation: ''
        });
      }
    }

    // 新しいCSVを生成
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const csvHeader = 'No,カテゴリ名,カテゴリID,アンカーID,照会先,カテゴリ内並び順,（データ突合確認用）質問,ターゲット,質問,答え,再質問\n';
    
    let csvContent_output = csvHeader;
    
    processedData.forEach((data) => {
      const row = [
        data.no,
        data.categoryName,
        data.categoryId,
        data.anchorId,
        data.inquiryDestination,
        data.categoryOrder,
        data.dataMatchingQuestion,
        data.target,
        `"${data.question.replace(/"/g, '""')}"`,
        `"${data.answer.replace(/"/g, '""')}"`,
        `"${data.customerSituation.replace(/"/g, '""')}"`
      ].join(',');
      
      csvContent_output += row + '\n';
    });

    console.log(`処理完了: ${processedData.length}件のQAデータを処理しました`);

    // CSVファイルとして返す
    return new NextResponse(csvContent_output, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="qa_with_customer_situation_${timestamp}.csv"`
      }
    });

  } catch (error) {
    console.error('Error processing CSV:', error);
    return NextResponse.json(
      { error: 'CSVファイルの処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
