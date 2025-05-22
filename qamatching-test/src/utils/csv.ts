/**
 * QAデータをCSV形式に変換する
 * @param questions 質問と回答のリスト
 * @returns CSV形式の文字列
 */
export function convertQuestionsToCSV(questions: Array<{ question: string, answer: string }>): string {
  // CSVヘッダー
  const headers = ['質問', '回答'];
  
  // CSVの行を作成
  const rows = questions.map(item => [
    escapeCSVField(item.question),
    escapeCSVField(item.answer)
  ]);
  
  // ヘッダーと行を結合
  const csvContent = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');
  
  return csvContent;
}

/**
 * CSVフィールドをエスケープする
 * @param field エスケープするフィールド
 * @returns エスケープされたフィールド
 */
function escapeCSVField(field: string): string {
  // 改行、カンマ、ダブルクォートが含まれている場合はダブルクォートで囲む
  if (field.includes(',') || field.includes('\n') || field.includes('"')) {
    // ダブルクォートをエスケープ（""に変換）
    const escapedField = field.replace(/"/g, '""');
    return `"${escapedField}"`;
  }
  
  return field;
}

/**
 * CSVファイルをダウンロードする
 * @param csvContent CSV形式の文字列
 * @param filename ファイル名（デフォルト: qa_data.csv）
 */
export function downloadCSV(csvContent: string, filename: string = 'qa_data.csv'): void {
  // BOMを追加してExcelで正しく表示されるようにする
  const BOM = '\uFEFF';
  const csvWithBOM = BOM + csvContent;
  
  // Blobを作成
  const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
  
  // ダウンロードリンクを作成
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // リンクをクリックしてダウンロードを開始
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // URLオブジェクトを解放
  URL.revokeObjectURL(url);
}

/**
 * 現在の日時を使ってファイル名を生成する
 * @param prefix ファイル名のプレフィックス（デフォルト: qa_data）
 * @returns タイムスタンプ付きのファイル名
 */
export function generateTimestampedFilename(prefix: string = 'qa_data'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${prefix}_${year}${month}${day}_${hours}${minutes}${seconds}.csv`;
}
