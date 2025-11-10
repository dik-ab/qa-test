import * as XLSX from 'xlsx';

/**
 * QAデータをXLSX形式に変換してダウンロードする
 * @param questions 質問と回答のリスト（拡張フィールドも含む）
 * @param filename ファイル名（デフォルト: qa_data.xlsx）
 */
export function downloadXLSX(
  questions: Array<{
    question: string;
    answer: string;
    pageNumber?: string;
    location?: string;
    expansionData?: string;
  }>,
  filename: string = 'qa_data.xlsx'
): void {
  // 拡張データが含まれているかチェック
  const hasExpansionData = questions.some(q => q.pageNumber || q.location || q.expansionData);
  
  // ワークシートのデータを準備
  const headers = hasExpansionData 
    ? ['質問', '回答', '質問拡張データ', 'ページ数', '場所']
    : ['質問', '回答'];
    
  const worksheetData = [
    headers, // ヘッダー行
    ...questions.map(item => {
      const baseFields = [item.question, item.answer];
      if (hasExpansionData) {
        return [...baseFields, item.expansionData || '', item.pageNumber || '', item.location || ''];
      }
      return baseFields;
    })
  ];

  // ワークシートを作成
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // 列幅を自動調整
  const columnWidths = hasExpansionData 
    ? [
        { wch: 50 }, // 質問列の幅
        { wch: 80 }, // 回答列の幅
        { wch: 60 }, // 質問拡張データ列の幅
        { wch: 15 }, // ページ数列の幅
        { wch: 30 }  // 場所列の幅
      ]
    : [
        { wch: 50 }, // 質問列の幅
        { wch: 80 }  // 回答列の幅
      ];
  worksheet['!cols'] = columnWidths;

  // セルのスタイルを設定（ヘッダー行を太字にする）
  const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:B1');
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) continue;
    
    worksheet[cellAddress].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'E6E6FA' } }, // 薄紫色の背景
      alignment: { horizontal: 'center' }
    };
  }

  // テキストの折り返しを有効にする
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:B1');
  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!worksheet[cellAddress]) continue;
      
      if (!worksheet[cellAddress].s) {
        worksheet[cellAddress].s = {};
      }
      worksheet[cellAddress].s.alignment = {
        ...worksheet[cellAddress].s.alignment,
        wrapText: true,
        vertical: 'top'
      };
    }
  }

  // ワークブックを作成
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'QAデータ');

  // ファイルをダウンロード
  XLSX.writeFile(workbook, filename);
}

/**
 * 現在の日時を使ってXLSXファイル名を生成する
 * @param prefix ファイル名のプレフィックス（デフォルト: qa_data）
 * @returns タイムスタンプ付きのファイル名
 */
export function generateTimestampedXLSXFilename(prefix: string = 'qa_data'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${prefix}_${year}${month}${day}_${hours}${minutes}${seconds}.xlsx`;
}

/**
 * QAデータをXLSX形式のバイナリデータに変換する
 * @param questions 質問と回答のリスト（拡張フィールドも含む）
 * @returns XLSX形式のArrayBuffer
 */
export function convertQuestionsToXLSX(
  questions: Array<{
    question: string;
    answer: string;
    pageNumber?: string;
    location?: string;
    expansionData?: string;
  }>
): ArrayBuffer {
  // 拡張データが含まれているかチェック
  const hasExpansionData = questions.some(q => q.pageNumber || q.location || q.expansionData);
  
  // ワークシートのデータを準備
  const headers = hasExpansionData 
    ? ['質問', '回答', '質問拡張データ', 'ページ数', '場所']
    : ['質問', '回答'];
    
  const worksheetData = [
    headers, // ヘッダー行
    ...questions.map(item => {
      const baseFields = [item.question, item.answer];
      if (hasExpansionData) {
        return [...baseFields, item.expansionData || '', item.pageNumber || '', item.location || ''];
      }
      return baseFields;
    })
  ];

  // ワークシートを作成
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // 列幅を自動調整
  const columnWidths = [
    { wch: 50 }, // 質問列の幅
    { wch: 80 }  // 回答列の幅
  ];
  worksheet['!cols'] = columnWidths;

  // ワークブックを作成
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'QAデータ');

  // ArrayBufferとして出力
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}
