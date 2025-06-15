const fs = require('fs');
const path = require('path');

// CSV解析関数をNode.js用に移植
function parseCSV(csvContent) {
  const records = [];
  let currentRecord = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < csvContent.length) {
    const char = csvContent[i];
    const nextChar = csvContent[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // エスケープされたダブルクォート
        currentField += '"';
        i += 2;
      } else {
        // クォートの開始または終了
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // フィールドの区切り
      currentRecord.push(currentField);
      currentField = '';
      i++;
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // レコードの区切り
      currentRecord.push(currentField);
      
      // 空のレコードでなければ追加
      if (currentRecord.some(field => field.trim() !== '')) {
        records.push(currentRecord);
      }
      
      currentRecord = [];
      currentField = '';
      
      // \r\nの場合は次の文字もスキップ
      if (char === '\r' && nextChar === '\n') {
        i += 2;
      } else {
        i++;
      }
    } else {
      currentField += char;
      i++;
    }
  }
  
  // 最後のフィールドとレコードを追加
  if (currentField || currentRecord.length > 0) {
    currentRecord.push(currentField);
    if (currentRecord.some(field => field.trim() !== '')) {
      records.push(currentRecord);
    }
  }
  
  return records;
}

function cleanText(text) {
  if (!text) return '';
  
  return text
    .trim()
    .replace(/^\"|\"$/g, '') // 先頭と末尾のダブルクォートを削除
    .replace(/\"\"/g, '"')   // エスケープされたダブルクォートを元に戻す
    .trim();
}

function parseCSVToQuestions(csvContent) {
  const questions = [];
  
  try {
    // CSVを正しく解析（改行を含むフィールドに対応）
    const rows = parseCSV(csvContent);
    
    console.log(`総行数: ${rows.length}`);
    console.log(`ヘッダー行の列数: ${rows[0] ? rows[0].length : 0}`);
    
    // ヘッダー行をスキップして処理
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // docomo.csvの形式に合わせて質問と回答を抽出
      // 列10が質問、列11が回答（0ベースなので9と10）
      if (row.length >= 11 && row[9] && row[10]) {
        const question = cleanText(row[9]);
        const answer = cleanText(row[10]);
        
        if (question && answer) {
          questions.push({
            rowIndex: i + 1, // 1ベースの行番号
            question: question,
            answer: answer
          });
        }
      }
    }
  } catch (error) {
    console.error('CSV解析エラー:', error);
  }
  
  return questions;
}

// テスト実行
function testCSVParsing() {
  const csvPath = path.join(__dirname, 'public', 'docomo.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('CSVファイルが見つかりません:', csvPath);
    return;
  }
  
  console.log('CSVファイルを読み込み中...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  console.log(`ファイルサイズ: ${csvContent.length} 文字`);
  
  const questions = parseCSVToQuestions(csvContent);
  
  console.log(`\n解析結果:`);
  console.log(`取得できた質問と回答のペア数: ${questions.length}`);
  
  // 最初の5件を表示
  console.log('\n最初の5件:');
  questions.slice(0, 5).forEach((item, index) => {
    console.log(`\n--- ${index + 1}件目 (行${item.rowIndex}) ---`);
    console.log(`質問: ${item.question.substring(0, 100)}${item.question.length > 100 ? '...' : ''}`);
    console.log(`回答: ${item.answer.substring(0, 200)}${item.answer.length > 200 ? '...' : ''}`);
  });
  
  // 長い回答の例を表示
  console.log('\n長い回答の例:');
  const longAnswers = questions.filter(item => item.answer.length > 500);
  console.log(`500文字以上の回答数: ${longAnswers.length}`);
  
  if (longAnswers.length > 0) {
    const example = longAnswers[0];
    console.log(`\n例 (行${example.rowIndex}):`);
    console.log(`質問: ${example.question}`);
    console.log(`回答 (${example.answer.length}文字): ${example.answer}`);
  }
  
  // 短い回答の例を表示
  console.log('\n短い回答の例:');
  const shortAnswers = questions.filter(item => item.answer.length < 100);
  console.log(`100文字未満の回答数: ${shortAnswers.length}`);
  
  if (shortAnswers.length > 0) {
    const example = shortAnswers[0];
    console.log(`\n例 (行${example.rowIndex}):`);
    console.log(`質問: ${example.question}`);
    console.log(`回答 (${example.answer.length}文字): ${example.answer}`);
  }
  
  // 改行を含む回答の例を表示
  console.log('\n改行を含む回答の例:');
  const multilineAnswers = questions.filter(item => item.answer.includes('\n'));
  console.log(`改行を含む回答数: ${multilineAnswers.length}`);
  
  if (multilineAnswers.length > 0) {
    const example = multilineAnswers[0];
    console.log(`\n例 (行${example.rowIndex}):`);
    console.log(`質問: ${example.question}`);
    console.log(`回答: ${example.answer}`);
  }
  
  // 特定の質問「ランク毎にどんな特典があるのか？」の詳細確認
  console.log('\n=== 「ランク毎にどんな特典があるのか？」の詳細確認 ===');
  const rankBenefitQuestion = questions.find(item => 
    item.question.includes('ランク毎にどんな特典があるのか') || 
    item.question.includes('ランクごとにどんな特典があるのか')
  );
  
  if (rankBenefitQuestion) {
    console.log(`行番号: ${rankBenefitQuestion.rowIndex}`);
    console.log(`質問: ${rankBenefitQuestion.question}`);
    console.log(`回答の文字数: ${rankBenefitQuestion.answer.length}`);
    console.log(`回答の内容:`);
    console.log(rankBenefitQuestion.answer);
    console.log('\n回答に含まれるキーワードチェック:');
    console.log(`- "主な特典は以下のとおりです"が含まれているか: ${rankBenefitQuestion.answer.includes('主な特典は以下のとおりです')}`);
    console.log(`- "ポイント倍率アップ特典"が含まれているか: ${rankBenefitQuestion.answer.includes('ポイント倍率アップ特典')}`);
    console.log(`- "d払い特典"が含まれているか: ${rankBenefitQuestion.answer.includes('d払い特典')}`);
    console.log(`- "dポイントマーケット利用特典"が含まれているか: ${rankBenefitQuestion.answer.includes('dポイントマーケット利用特典')}`);
    console.log(`- "料金充当特典"が含まれているか: ${rankBenefitQuestion.answer.includes('料金充当特典')}`);
    console.log(`- "進呈率がアップします"が含まれているか: ${rankBenefitQuestion.answer.includes('進呈率がアップします')}`);
    
    // 回答が途中で切れていないかチェック
    if (rankBenefitQuestion.answer.length < 100) {
      console.log('\n⚠️ 警告: 回答が短すぎます。データが途中で切れている可能性があります。');
    }
    if (!rankBenefitQuestion.answer.includes('ポイント倍率アップ特典')) {
      console.log('\n⚠️ 警告: 期待されるキーワード「ポイント倍率アップ特典」が見つかりません。');
    }
  } else {
    console.log('「ランク毎にどんな特典があるのか？」の質問が見つかりません');
    
    // 類似の質問を検索
    console.log('\n類似の質問を検索中...');
    const similarQuestions = questions.filter(item => 
      item.question.includes('特典') || 
      item.question.includes('ランク')
    );
    console.log(`特典やランクに関する質問数: ${similarQuestions.length}`);
    similarQuestions.slice(0, 5).forEach((item, index) => {
      console.log(`${index + 1}. (行${item.rowIndex}) ${item.question}`);
    });
  }
  
  // 回答が短すぎる（不完全な可能性がある）データを確認
  console.log('\n=== 回答が短すぎる可能性があるデータ ===');
  const suspiciousAnswers = questions.filter(item => 
    item.answer.length < 50 && 
    !item.answer.includes('。') && 
    item.rowIndex > 2 // ヘッダー行以外
  );
  console.log(`疑わしいデータ数: ${suspiciousAnswers.length}`);
  
  suspiciousAnswers.slice(0, 5).forEach((item, index) => {
    console.log(`\n疑わしいデータ ${index + 1} (行${item.rowIndex}):`);
    console.log(`質問: ${item.question}`);
    console.log(`回答 (${item.answer.length}文字): "${item.answer}"`);
  });
}

// テスト実行
testCSVParsing();
