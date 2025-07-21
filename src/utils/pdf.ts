import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { 
  extractTextFromPdfWithDocumentAI, 
  isDocumentAIAvailable,
  extractTextFromMultiplePdfsWithDocumentAI,
  savePdfsAndExtractTextWithDocumentAI
} from './documentai';

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
    
    // tempディレクトリが存在しない場合は作成
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFilePath = path.join(tempDir, filename);
    
    // PDFファイルを一時的に保存
    fs.writeFileSync(tempFilePath, pdfBuffer);
    
    let textFilePath: string | null = null;
    
    try {
      // PDFからテキストを抽出（pdftotext コマンドを使用）
      try {
        // pdftotext コマンドが利用可能かチェック
        await execPromise('which pdftotext');
        
        // pdftotextを使用してテキストを抽出
        textFilePath = tempFilePath.replace('.pdf', '.txt');
        await execPromise(`pdftotext "${tempFilePath}" "${textFilePath}"`);
        
        // 抽出されたテキストを読み込む
        const extractedText = fs.readFileSync(textFilePath, 'utf-8');
        
        return extractedText;
      } catch {
        // pdftotext が利用できない場合は、代替手段を使用
        console.log('pdftotext not available, using alternative method');
        
        // 代替手段として、テキスト抽出ができなかったことを示すメッセージを返す
        return `PDFファイル "${filename}" からのテキスト抽出に失敗しました。システム管理者にお問い合わせください。`;
      }
    } finally {
      // 一時ファイルを確実に削除
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
        if (textFilePath && fs.existsSync(textFilePath)) {
          fs.unlinkSync(textFilePath);
        }
      } catch (cleanupError) {
        console.error('Error cleaning up temporary files:', cleanupError);
      }
    }
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw error;
  }
}

/**
 * PDFファイルをpublicフォルダに永続的に保存する
 * @param pdfBuffer PDFファイルのバッファ
 * @param filename ファイル名
 * @returns 保存されたファイルのパス（publicフォルダからの相対パス）
 */
export async function savePdfToPublic(pdfBuffer: Buffer, filename: string): Promise<string> {
  try {
    // publicディレクトリのパスを生成
    const publicDir = path.join(process.cwd(), 'public');
    const pdfsDir = path.join(publicDir, 'pdfs');
    
    // pdfsディレクトリが存在しない場合は作成
    if (!fs.existsSync(pdfsDir)) {
      fs.mkdirSync(pdfsDir, { recursive: true });
    }
    
    // ファイル名の重複を避けるためにタイムスタンプを追加
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const finalFilename = `${timestamp}_${sanitizedFilename}`;
    const filePath = path.join(pdfsDir, finalFilename);
    
    // PDFファイルを保存
    fs.writeFileSync(filePath, pdfBuffer);
    
    // publicフォルダからの相対パスを返す
    return `/pdfs/${finalFilename}`;
  } catch (error) {
    console.error('Error saving PDF to public folder:', error);
    throw error;
  }
}

/**
 * PDFファイルを一時フォルダに保存する
 * @param pdfBuffer PDFファイルのバッファ
 * @param filename ファイル名
 * @returns 保存されたファイルの絶対パス
 */
export async function savePdfToTemp(pdfBuffer: Buffer, filename: string): Promise<string> {
  try {
    // 一時ディレクトリのパスを生成
    const tempDir = path.join(process.cwd(), 'public', 'temp');
    
    // tempディレクトリが存在しない場合は作成
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // ファイル名の重複を避けるためにタイムスタンプを追加
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const finalFilename = `temp_${timestamp}_${sanitizedFilename}`;
    const filePath = path.join(tempDir, finalFilename);
    
    // PDFファイルを保存
    fs.writeFileSync(filePath, pdfBuffer);
    
    // 絶対パスを返す
    return filePath;
  } catch (error) {
    console.error('Error saving PDF to temp folder:', error);
    throw error;
  }
}

/**
 * 複数のPDFファイルをpublicフォルダに保存し、テキストを抽出して結合する
 * @param files アップロードされたファイルの配列
 * @returns { texts: 結合された抽出テキスト, savedPaths: 保存されたファイルのパス配列 }
 */
export async function savePdfsAndExtractText(files: File[]): Promise<{
  texts: string;
  savedPaths: string[];
}> {
  const tempFilePaths: string[] = [];
  
  try {
    const texts = [];
    const savedPaths = [];
    
    // 各PDFを保存してテキストを抽出（順次処理）
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // PDFをpublicフォルダに保存
      const savedPath = await savePdfToPublic(buffer, file.name);
      savedPaths.push(savedPath);
      
      // 一時ファイルとしても保存（pdftotext処理用）
      const tempPath = await savePdfToTemp(buffer, file.name);
      tempFilePaths.push(tempPath);
      
      // テキストを抽出
      const filename = `temp_${Date.now()}_${i}_${file.name}`;
      const text = await extractTextFromPdf(buffer, filename);
      texts.push(text);
    }
    
    // 各PDFから抽出したテキストを結合
    console.log('Extracted texts:', texts);
    console.log('Saved PDF paths:', savedPaths);
    
    return {
      texts: texts.join('\n\n--- 次のPDFドキュメント ---\n\n'),
      savedPaths
    };
  } catch (error) {
    console.error('Error saving PDFs and extracting text:', error);
    throw error;
  } finally {
    // 一時ファイルを削除
    for (const tempPath of tempFilePaths) {
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
          console.log(`Temporary file deleted: ${tempPath}`);
        }
      } catch (cleanupError) {
        console.error(`Error deleting temporary file ${tempPath}:`, cleanupError);
      }
    }
  }
}

/**
 * 複数のPDFファイルからテキストを抽出して結合する（既存の機能を維持）
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

/**
 * Document AIを優先してPDFからテキストを抽出する（フォールバック付き）
 * @param pdfBuffer PDFファイルのバッファ
 * @param filename ファイル名
 * @returns 抽出されたテキスト
 */
export async function extractTextFromPdfWithFallback(pdfBuffer: Buffer, filename: string): Promise<string> {
  try {
    // Document AIが利用可能かチェック
    const documentAIAvailable = await isDocumentAIAvailable();
    
    if (documentAIAvailable) {
      try {
        console.log(`Attempting Document AI extraction for: ${filename}`);
        const text = await extractTextFromPdfWithDocumentAI(pdfBuffer, filename);
        console.log(`Document AI extraction successful for: ${filename}`);
        return text;
      } catch (documentAIError) {
        console.warn(`Document AI extraction failed for ${filename}, falling back to pdftotext:`, documentAIError);
      }
    } else {
      console.log('Document AI not available, using pdftotext');
    }
    
    // Document AIが失敗した場合、または利用できない場合はpdftotext使用
    return await extractTextFromPdf(pdfBuffer, filename);
  } catch (error) {
    console.error('Error extracting text from PDF with fallback:', error);
    throw error;
  }
}

/**
 * 複数のPDFファイルからDocument AIを優先してテキストを抽出（フォールバック付き）
 * @param files アップロードされたファイルの配列
 * @returns 結合された抽出テキスト
 */
export async function extractTextFromMultiplePdfsWithFallback(files: File[]): Promise<string> {
  try {
    // Document AIが利用可能かチェック
    const documentAIAvailable = await isDocumentAIAvailable();
    
    if (documentAIAvailable) {
      try {
        console.log('Attempting Document AI extraction for multiple PDFs');
        const text = await extractTextFromMultiplePdfsWithDocumentAI(files);
        console.log('Document AI extraction successful for multiple PDFs');
        return text;
      } catch (documentAIError) {
        console.warn('Document AI extraction failed for multiple PDFs, falling back to pdftotext:', documentAIError);
      }
    } else {
      console.log('Document AI not available, using pdftotext for multiple PDFs');
    }
    
    // Document AIが失敗した場合、または利用できない場合はpdftotext使用
    return await extractTextFromMultiplePdfs(files);
  } catch (error) {
    console.error('Error extracting text from multiple PDFs with fallback:', error);
    throw error;
  }
}

/**
 * 複数のPDFファイルを保存してDocument AIを優先してテキストを抽出（フォールバック付き）
 * @param files アップロードされたファイルの配列
 * @returns { texts: 結合された抽出テキスト, savedPaths: 保存されたファイルのパス配列 }
 */
export async function savePdfsAndExtractTextWithFallback(files: File[]): Promise<{
  texts: string;
  savedPaths: string[];
}> {
  try {
    // Document AIが利用可能かチェック
    const documentAIAvailable = await isDocumentAIAvailable();
    
    if (documentAIAvailable) {
      try {
        console.log('Attempting Document AI extraction with save for multiple PDFs');
        const result = await savePdfsAndExtractTextWithDocumentAI(files);
        console.log('Document AI extraction with save successful for multiple PDFs');
        return result;
      } catch (documentAIError) {
        console.warn('Document AI extraction with save failed for multiple PDFs, falling back to pdftotext:', documentAIError);
      }
    } else {
      console.log('Document AI not available, using pdftotext for save and extract');
    }
    
    // Document AIが失敗した場合、または利用できない場合はpdftotext使用
    return await savePdfsAndExtractText(files);
  } catch (error) {
    console.error('Error saving PDFs and extracting text with fallback:', error);
    throw error;
  }
}
