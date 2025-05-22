// テキストファイルのダウンロード関連のユーティリティ関数

/**
 * タイムスタンプ付きのテキストファイル名を生成
 * @param baseName ベースファイル名
 * @returns タイムスタンプ付きファイル名
 */
export const generateTimestampedTextFilename = (baseName: string): string => {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19);
  return `${baseName}_${timestamp}.txt`;
};

/**
 * テキストファイルをダウンロード
 * @param content テキストコンテンツ
 * @param filename ファイル名
 */
export const downloadTextFile = (content: string, filename: string): void => {
  // BOMを追加してUTF-8エンコーディングを明示
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { 
    type: 'text/plain;charset=utf-8' 
  });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // リンクをクリックしてダウンロードを開始
  document.body.appendChild(link);
  link.click();
  
  // クリーンアップ
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * テキストの改行を正規化（統一）
 * @param text 元のテキスト
 * @returns 改行が正規化されたテキスト
 */
export const normalizeLineBreaks = (text: string): string => {
  // Windows(\r\n)、Mac(\r)、Unix(\n)の改行を統一
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
};

/**
 * 抽出されたテキストを整形してダウンロード用に準備
 * @param extractedText 抽出されたテキスト
 * @returns 整形されたテキスト
 */
export const formatExtractedTextForDownload = (extractedText: string): string => {
  // 改行を正規化
  let formattedText = normalizeLineBreaks(extractedText);
  
  // 連続する空行を2行までに制限
  formattedText = formattedText.replace(/\n{3,}/g, '\n\n');
  
  // 先頭と末尾の空白を削除
  formattedText = formattedText.trim();
  
  // ダウンロード日時を追加
  const downloadDate = new Date().toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  const header = `抽出されたテキスト\nダウンロード日時: ${downloadDate}\n${'='.repeat(50)}\n\n`;
  
  return header + formattedText;
};
