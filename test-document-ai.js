const fs = require('fs');
const path = require('path');

// 環境変数を読み込み
require('dotenv').config();

async function testDocumentAI() {
  try {
    console.log('Document AI テストを開始します...');
    
    // テスト用PDFファイルのパス
    const pdfPath = path.join(__dirname, 'public', 'pdfs', '1752557033569_qa-test-large-volume.pdf');
    
    // PDFファイルが存在するかチェック
    if (!fs.existsSync(pdfPath)) {
      console.error('テスト用PDFファイルが見つかりません:', pdfPath);
      console.log('public/pdfsディレクトリにPDFファイルをアップロードしてからテストしてください。');
      return;
    }
    
    // PDFファイルを読み込み
    const pdfBuffer = fs.readFileSync(pdfPath);
    console.log(`PDFファイルを読み込みました: ${pdfBuffer.length} bytes`);
    
    // Document AI設定をチェック
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'aerial-mission-466203-p7';
    const location = process.env.DOCUMENT_AI_LOCATION || 'us';
    const processorId = process.env.DOCUMENT_AI_PROCESSOR_ID;
    
    console.log(`プロジェクトID: ${projectId}`);
    console.log(`ロケーション: ${location}`);
    console.log(`プロセッサーID: ${processorId}`);
    
    if (!processorId || processorId === 'your-processor-id') {
      console.log('\n=== 設定が必要です ===');
      console.log('1. Google Cloud ConsoleでDocument AIプロセッサーを作成してください');
      console.log('2. .envファイルのDOCUMENT_AI_PROCESSOR_IDを実際のプロセッサーIDに変更してください');
      console.log('3. Document AI APIが有効になっていることを確認してください');
      console.log('\n現在はpdftotext処理のみでテストします...');
      
      // pdftotext処理のテスト
      await testPdftotext(pdfBuffer);
      return;
    }
    
    // Document AIクライアントを初期化
    const { DocumentProcessorServiceClient } = require('@google-cloud/documentai');
    const keyFilePath = path.join(__dirname, 'aerial-mission-466203-p7-d52f2e3afc51.json');
    
    const client = new DocumentProcessorServiceClient({
      keyFilename: keyFilePath,
    });
    
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
    
    console.log('Document AI処理を開始します...');
    const startTime = Date.now();
    
    // Document AIでドキュメントを処理
    const [result] = await client.processDocument(request);
    const endTime = Date.now();
    
    if (!result.document) {
      throw new Error('Document AI returned no document');
    }
    
    // テキストを抽出
    const text = result.document.text || '';
    
    console.log(`\n=== Document AI 抽出結果 ===`);
    console.log(`処理時間: ${endTime - startTime}ms`);
    console.log(`抽出文字数: ${text.length}`);
    console.log(`\n=== 抽出テキスト（最初の500文字） ===`);
    console.log(text.substring(0, 500));
    
    if (text.length > 500) {
      console.log('\n...(続きは省略)...');
    }
    
    console.log('\n=== テスト完了 ===');
    
  } catch (error) {
    console.error('Document AI テスト中にエラーが発生しました:', error);
    
    if (error.message.includes('API has not been used')) {
      console.log('\n=== Document AI APIが有効化されていません ===');
      console.log('Google Cloud ConsoleでDocument AI APIを有効化してください');
    } else if (error.message.includes('not found')) {
      console.log('\n=== プロセッサーが見つかりません ===');
      console.log('プロセッサーIDが正しいか確認してください');
    }
    
    console.log('\npdftotext処理でフォールバックテストを実行します...');
    try {
      const pdfPath = path.join(__dirname, 'public', 'pdfs', '1752557033569_qa-test-large-volume.pdf');
      const pdfBuffer = fs.readFileSync(pdfPath);
      await testPdftotext(pdfBuffer);
    } catch (fallbackError) {
      console.error('フォールバックテストも失敗しました:', fallbackError);
    }
  }
}

async function testPdftotext(pdfBuffer) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execPromise = promisify(exec);
  
  try {
    // 一時ファイルを作成
    const tempDir = path.join(__dirname, 'public', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFilePath = path.join(tempDir, 'test-pdf.pdf');
    const textFilePath = path.join(tempDir, 'test-pdf.txt');
    
    // PDFファイルを一時的に保存
    fs.writeFileSync(tempFilePath, pdfBuffer);
    
    console.log('pdftotext処理を開始します...');
    const startTime = Date.now();
    
    try {
      // pdftotext コマンドが利用可能かチェック
      await execPromise('which pdftotext');
      
      // pdftotextを使用してテキストを抽出
      await execPromise(`pdftotext "${tempFilePath}" "${textFilePath}"`);
      
      // 抽出されたテキストを読み込む
      const extractedText = fs.readFileSync(textFilePath, 'utf-8');
      const endTime = Date.now();
      
      console.log(`\n=== pdftotext 抽出結果 ===`);
      console.log(`処理時間: ${endTime - startTime}ms`);
      console.log(`抽出文字数: ${extractedText.length}`);
      console.log(`\n=== 抽出テキスト（最初の500文字） ===`);
      console.log(extractedText.substring(0, 500));
      
      if (extractedText.length > 500) {
        console.log('\n...(続きは省略)...');
      }
      
    } catch (pdftotextError) {
      console.log('pdftotext が利用できません:', pdftotextError.message);
      console.log('Homebrewでpoppler-utilsをインストールしてください: brew install poppler');
    }
    
    // 一時ファイルを削除
    try {
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      if (fs.existsSync(textFilePath)) fs.unlinkSync(textFilePath);
    } catch (cleanupError) {
      console.warn('一時ファイルの削除に失敗:', cleanupError);
    }
    
  } catch (error) {
    console.error('pdftotext テスト中にエラーが発生しました:', error);
  }
}

// Node.jsから直接実行された場合のみテストを実行
if (require.main === module) {
  testDocumentAI();
}

module.exports = { testDocumentAI };
