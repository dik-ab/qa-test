const { DocomoCSVParser } = require('./src/utils/csvParser.ts');
const path = require('path');

// TypeScriptファイルを直接実行するためのrequire設定
require('ts-node/register');

async function testParser() {
  try {
    console.log('=== DocomoCSVParser テスト ===\n');
    
    const filePath = path.join(__dirname, 'public', 'docomo2.csv');
    console.log(`ファイルパス: ${filePath}\n`);
    
    // CSVファイルをパース
    const { DocomoCSVParser } = require('./src/utils/csvParser');
    const results = DocomoCSVParser.parseFromFile(filePath);
    
    console.log(`パースされたデータ数: ${results.length}\n`);
    
    if (results.length > 0) {
      console.log('=== 最初のデータ ===');
      const firstItem = results[0];
      console.log(`No: ${firstItem.no}`);
      console.log(`カテゴリ名: ${firstItem.categoryName}`);
      console.log(`カテゴリID: ${firstItem.categoryId}`);
      console.log(`アンカーID: ${firstItem.anchorId}`);
      console.log(`照会先: ${firstItem.inquiryDestination}`);
      console.log(`カテゴリ内並び順: ${firstItem.categoryOrder}`);
      console.log(`データ突合確認用質問: ${firstItem.dataMatchingQuestion}`);
      console.log(`ターゲット: ${firstItem.target}`);
      console.log(`質問: ${firstItem.question}`);
      console.log(`答え:\n${firstItem.answer}\n`);
      
      // 改行が正しく保持されているかチェック
      const lineCount = firstItem.answer.split('\n').length;
      console.log(`答えの行数: ${lineCount}`);
      
      if (lineCount > 1) {
        console.log('✅ 改行が正しく保持されています');
      } else {
        console.log('❌ 改行が失われている可能性があります');
      }
    }
    
    console.log('\n=== テスト完了 ===');
    
  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

testParser();
