export interface DocomoQAData {
  no: string;
  categoryName: string;
  categoryId: string;
  anchorId: string;
  inquiryDestination: string;
  categoryOrder: string;
  dataMatchingQuestion: string;
  target: string;
  question: string;
  answer: string;
}

export class DocomoCSVParser {
  /**
   * CSVファイルをパースしてDocomoQADataの配列を返す
   * 改行を含む答えの部分も正しく処理する
   */
  static parseCSV(csvContent: string): DocomoQAData[] {
    const results: DocomoQAData[] = [];
    
    // CSVの内容を行に分割
    const lines = csvContent.split('\n');
    
    // ヘッダー行をスキップ（最初の2行）
    let i = 2;
    
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // 空行をスキップ
      if (!line) {
        i++;
        continue;
      }
      
      // データ行の開始を検出（カンマで始まり、数字が続く）
      if (line.match(/^,\d+,/)) {
        const result = this.parseDataRow(lines, i);
        if (result.data) {
          results.push(result.data);
        }
        i = result.nextIndex;
      } else {
        i++;
      }
    }
    
    return results;
  }
  
  /**
   * データ行をパースする（複数行にまたがる可能性を考慮）
   */
  private static parseDataRow(lines: string[], startIndex: number): { data: DocomoQAData | null, nextIndex: number } {
    let fullContent = '';
    let currentIndex = startIndex;
    let openQuotes = 0;
    
    // 複数行にまたがるデータを結合
    while (currentIndex < lines.length) {
      const line = lines[currentIndex];
      
      // ダブルクォートの数をカウント
      for (const char of line) {
        if (char === '"') {
          openQuotes++;
        }
      }
      
      if (fullContent) {
        fullContent += '\n' + line;
      } else {
        fullContent = line;
      }
      
      // クォートが偶数個（すべて閉じられている）なら完了
      if (openQuotes % 2 === 0) {
        break;
      }
      
      currentIndex++;
    }
    
    // フィールドを分割
    const fields = this.parseCSVRow(fullContent);
    
    // フィールド数が足りない場合はスキップ
    if (fields.length < 11) {
      return { data: null, nextIndex: currentIndex + 1 };
    }
    
    const data: DocomoQAData = {
      no: this.cleanField(fields[1]),
      categoryName: this.cleanField(fields[2]),
      categoryId: this.cleanField(fields[3]),
      anchorId: this.cleanField(fields[4]),
      inquiryDestination: this.cleanField(fields[5]),
      categoryOrder: this.cleanField(fields[6]),
      dataMatchingQuestion: this.cleanField(fields[7]),
      target: this.cleanField(fields[8]),
      question: this.cleanField(fields[9]),
      answer: this.cleanField(fields[10])
    };
    
    return { data, nextIndex: currentIndex + 1 };
  }
  
  /**
   * CSV行をフィールドに分割
   */
  private static parseCSVRow(row: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < row.length) {
      const char = row[i];
      
      if (char === '"') {
        if (inQuotes && i + 1 < row.length && row[i + 1] === '"') {
          // エスケープされたクォート
          current += '"';
          i += 2;
        } else {
          // クォートの開始/終了
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // フィールドの区切り
        fields.push(current);
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
    
    // 最後のフィールドを追加
    fields.push(current);
    
    return fields;
  }
  
  /**
   * フィールドをクリーンアップ（前後の空白とクォートを除去）
   */
  private static cleanField(field: string): string {
    if (!field) return '';
    
    let cleaned = field.trim();
    
    // 前後のダブルクォートを除去
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }
    
    // エスケープされたダブルクォートを元に戻す
    cleaned = cleaned.replace(/""/g, '"');
    
    return cleaned;
  }
  
}
