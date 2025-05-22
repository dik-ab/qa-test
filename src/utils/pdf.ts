import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * PDFファイルを一時的に保存し、テキストを抽出する
 * @param pdfBuffer PDFファイルのバッファ
 * @param filename ファイル名
 * @returns 抽出されたテキスト
 */
export async function extractTextFromPdf(pdfBuffer: Buffer, filename: string): Promise<string> {
  try {
    // 一時ファイルのパスを生成
    const tempDir = path.join(process.cwd(), 'public', 'temp');
    const tempFilePath = path.join(tempDir, filename);
    
    // PDFファイルを一時的に保存
    fs.writeFileSync(tempFilePath, pdfBuffer);
    
    // PDFからテキストを抽出（pdftotext コマンドを使用）
    try {
      // pdftotext コマンドが利用可能かチェック
      await execPromise('which pdftotext');
      
      // pdftotextを使用してテキストを抽出
      const textFilePath = tempFilePath.replace('.pdf', '.txt');
      await execPromise(`pdftotext "${tempFilePath}" "${textFilePath}"`);
      
      // 抽出されたテキストを読み込む
      const extractedText = fs.readFileSync(textFilePath, 'utf-8');
      
      // 一時ファイルを削除
      fs.unlinkSync(tempFilePath);
      fs.unlinkSync(textFilePath);
      
      return extractedText;
    } catch {
      // pdftotext が利用できない場合は、代替手段を使用
      console.log('pdftotext not available, using alternative method');
      
      // 一時ファイルを削除
      fs.unlinkSync(tempFilePath);
      
      // 代替手段として、テキスト抽出ができなかったことを示すメッセージを返す
      return `PDFファイル "${filename}" からのテキスト抽出に失敗しました。システム管理者にお問い合わせください。`;
    }
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
}

/**
 * 複数のPDFファイルからテキストを抽出して結合する
 * @param files アップロードされたファイルの配列
 * @returns 結合された抽出テキスト
 */
export async function extractTextFromMultiplePdfs(files: File[]): Promise<string> {
  try {
    const texts = [];
    // 各PDFからテキストを抽出（順次処理）
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const buffer = Buffer.from(await file.arrayBuffer());
      const filename = `temp_${Date.now()}_${i}_${file.name}`;
      
      const text = await extractTextFromPdf(buffer, filename);
      texts.push(text);
    }
    
    // 各PDFから抽出したテキストを結合
    console.log('test', texts)
    return texts.join('\n\n--- 次のPDFドキュメント ---\n\n');
  } catch (error) {
    console.error('Error extracting text from multiple PDFs:', error);
    throw error;
  }
}
