import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import * as fs from 'fs';
import * as path from 'path';

// Google Cloud Document AI クライアントの初期化
let documentAIClient: DocumentProcessorServiceClient | null = null;

function getDocumentAIClient(): DocumentProcessorServiceClient {
  if (!documentAIClient) {
    // 環境変数からサービスアカウントキーを取得
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    
    if (serviceAccountKey) {
      // 環境変数からキーを使用（本番環境）
      const credentials = JSON.parse(serviceAccountKey);
      documentAIClient = new DocumentProcessorServiceClient({
        credentials,
      });
    } else {
      // ローカル開発環境ではキーファイルを使用
      const keyFilePath = path.join(process.cwd(), 'aerial-mission-466203-p7-d52f2e3afc51.json');
      
      if (fs.existsSync(keyFilePath)) {
        documentAIClient = new DocumentProcessorServiceClient({
          keyFilename: keyFilePath,
        });
      } else {
        throw new Error('Google Cloud service account key not found. Please set GOOGLE_SERVICE_ACCOUNT_KEY environment variable or provide the key file.');
      }
    }
  }
  
  return documentAIClient;
}

/**
 * Google Cloud Document AIを使用してPDFからテキストを抽出する
 * @param pdfBuffer PDFファイルのバッファ
 * @param filename ファイル名（ログ用）
 * @returns 抽出されたテキスト
 */
export async function extractTextFromPdfWithDocumentAI(
  pdfBuffer: Buffer,
  filename: string
): Promise<string> {
  try {
    const client = getDocumentAIClient();
    
    // プロジェクトIDとプロセッサーID（環境変数から取得、デフォルト値を設定）
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'aerial-mission-466203-p7';
    const location = process.env.DOCUMENT_AI_LOCATION || 'us'; // または 'eu', 'asia-northeast1' など
    const processorId = process.env.DOCUMENT_AI_PROCESSOR_ID || 'your-processor-id'; // 実際のプロセッサーIDに置き換える必要があります
    
    // プロセッサーのリソース名を構築
    const name = `projects/${projectId}/locations/${location}/processors/${processorId}`;
    
    // Document AIリクエストを構築
    const request = {
      name,
      rawDocument: {
        content: pdfBuffer.toString('base64'),
        mimeType: 'application/pdf',
      },
    };
    
    console.log(`Document AI processing started for: ${filename}`);
    
    // Document AIでドキュメントを処理
    const [result] = await client.processDocument(request);
    
    if (!result.document) {
      throw new Error('Document AI returned no document');
    }
    
    // テキストを抽出
    const text = result.document.text || '';
    
    console.log(`Document AI processing completed for: ${filename}, extracted ${text.length} characters`);
    
    return text;
  } catch (error) {
    console.error(`Error processing PDF with Document AI (${filename}):`, error);
    throw error;
  }
}

/**
 * Document AIの利用可能性をチェックする
 * @returns Document AIが利用可能かどうか
 */
export async function isDocumentAIAvailable(): Promise<boolean> {
  try {
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const keyFilePath = path.join(process.cwd(), 'aerial-mission-466203-p7-d52f2e3afc51.json');
    
    // 環境変数またはキーファイルの存在確認
    if (!serviceAccountKey && !fs.existsSync(keyFilePath)) {
      console.log('Document AI service account key not found (neither environment variable nor key file)');
      return false;
    }
    
    // 環境変数の確認
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'aerial-mission-466203-p7';
    const processorId = process.env.DOCUMENT_AI_PROCESSOR_ID;
    
    if (!processorId || processorId === 'your-processor-id') {
      console.log('Document AI processor ID not configured');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking Document AI availability:', error);
    return false;
  }
}

/**
 * 複数のPDFファイルをDocument AIで処理してテキストを抽出する
 * @param files アップロードされたファイルの配列
 * @returns 結合された抽出テキスト
 */
export async function extractTextFromMultiplePdfsWithDocumentAI(files: File[]): Promise<string> {
  try {
    const texts = [];
    
    // 各PDFからテキストを抽出（順次処理）
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const buffer = Buffer.from(await file.arrayBuffer());
      
      const text = await extractTextFromPdfWithDocumentAI(buffer, file.name);
      texts.push(text);
    }
    
    // 各PDFから抽出したテキストを結合
    console.log('Document AI extracted texts:', texts.map(t => `${t.length} chars`));
    return texts.join('\n\n--- 次のPDFドキュメント ---\n\n');
  } catch (error) {
    console.error('Error extracting text from multiple PDFs with Document AI:', error);
    throw error;
  }
}

/**
 * PDFファイルを保存してDocument AIでテキストを抽出する
 * @param files アップロードされたファイルの配列
 * @returns { texts: 結合された抽出テキスト, savedPaths: 保存されたファイルのパス配列 }
 */
export async function savePdfsAndExtractTextWithDocumentAI(files: File[]): Promise<{
  texts: string;
  savedPaths: string[];
}> {
  try {
    const texts = [];
    const savedPaths = [];
    
    // 各PDFを保存してテキストを抽出（順次処理）
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // PDFをpublicフォルダに保存（既存の関数を使用）
      const { savePdfToPublic } = await import('./pdf');
      const savedPath = await savePdfToPublic(buffer, file.name);
      savedPaths.push(savedPath);
      
      // Document AIでテキストを抽出（バッファから直接処理）
      const text = await extractTextFromPdfWithDocumentAI(buffer, file.name);
      texts.push(text);
    }
    
    // 各PDFから抽出したテキストを結合
    console.log('Document AI extracted texts:', texts.map(t => `${t.length} chars`));
    console.log('Saved PDF paths:', savedPaths);
    
    return {
      texts: texts.join('\n\n--- 次のPDFドキュメント ---\n\n'),
      savedPaths
    };
  } catch (error) {
    console.error('Error saving PDFs and extracting text with Document AI:', error);
    throw error;
  }
}
