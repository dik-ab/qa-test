'use client';

import React, { useState, useRef, ChangeEvent } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
} from '@mui/material';
import PsychologyIcon from '@mui/icons-material/Psychology';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import HomeIcon from '@mui/icons-material/Home';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

export default function CustomerSituationPage() {
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingSituation, setIsGeneratingSituation] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const csvSituationInputRef = useRef<HTMLInputElement>(null);

  // 顧客の状況推測ハンドラー
  const handleGenerateCustomerSituation = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('CSVファイルを選択してください');
      return;
    }

    setIsGeneratingSituation(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/generate-customer-situation', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '顧客の状況推測中にエラーが発生しました');
      }

      // CSVファイルとしてダウンロード
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // ファイル名をレスポンスヘッダーから取得
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'qa_with_customer_situation.csv';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccessMessage(`顧客の状況推測が完了しました。ファイル「${filename}」をダウンロードしました。`);

      // ファイル入力をクリア
      if (csvSituationInputRef.current) {
        csvSituationInputRef.current.value = '';
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setIsGeneratingSituation(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* パンくずリスト */}
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
        sx={{ mb: 3 }}
      >
        <Link
          underline="hover"
          sx={{ display: 'flex', alignItems: 'center' }}
          color="inherit"
          href="/"
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          ホーム
        </Link>
        <Typography color="text.primary">顧客の状況推測</Typography>
      </Breadcrumbs>

      <Typography variant="h3" component="h1" gutterBottom align="center">
        顧客の状況推測ツール
      </Typography>
      <Typography variant="h6" color="text.secondary" align="center" sx={{ mb: 4 }}>
        FAQデータから顧客の状況を推測してRAG検索用ナレッジベースを作成
      </Typography>

      {/* 顧客の状況推測セクション */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          顧客の状況推測（RAG検索用ナレッジベース作成）
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          FAQデータの質問と回答から、その回答で課題が解決するお客様がどのような状況に置かれているかを推測し、「再質問」列として追加したCSVを生成します。
          <br />
          <strong>※ 現在は処理負荷軽減のため、最初の20件のみを処理対象とします。</strong>
        </Typography>
        
        <Box sx={{ mb: 3, pl: 2 }}>
          <Typography variant="body2" component="div">
            <strong>処理内容：</strong>
            <ul>
              <li>質問と回答のペアを分析</li>
              <li>回答で課題が解決する顧客の状況を推測</li>
              <li>「[理由]により、[特定のサービスなど]が[起きている事象]」の形式で出力</li>
              <li>推測した状況を「再質問」列として元のCSVに追加</li>
            </ul>
            <strong>出力例：</strong>
            <ul>
              <li>機種変更をしたことにより、dポイントクラブアプリが端末から消えてしまい、dポイントの残高を確認できなくなってしまった。</li>
              <li>dポイントの利用方法がわからないため、貯まったポイントを有効活用できずに困っている。</li>
            </ul>
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3, border: '2px dashed #1976d2', borderRadius: 2, bgcolor: '#f3f7ff' }}>
          <input
            type="file"
            accept=".csv"
            onChange={handleGenerateCustomerSituation}
            style={{ display: 'none' }}
            ref={csvSituationInputRef}
          />
          <Button
            variant="contained"
            color="primary"
            startIcon={<PsychologyIcon />}
            onClick={() => csvSituationInputRef.current?.click()}
            disabled={isGeneratingSituation}
            size="large"
            sx={{ mb: 2 }}
          >
            {isGeneratingSituation ? '顧客の状況を推測中...' : 'CSVファイルを選択して顧客の状況を推測'}
          </Button>
          <Typography variant="body2" color="text.secondary" align="center">
            docomo2.csvのような形式のCSVファイルに対応
            <br />
            処理完了後、「再質問」列が追加されたCSVファイルが自動でダウンロードされます
          </Typography>
        </Box>
      </Paper>

      {isGeneratingSituation && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            顧客の状況を推測中...これには数分かかる場合があります
          </Typography>
        </Box>
      )}

      {/* エラー表示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {/* 成功メッセージ表示 */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 4 }}>
          <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
            処理完了！
          </Typography>
          <Typography variant="body2">
            {successMessage}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            生成されたCSVファイルには、元のデータに加えて「再質問」列が追加されており、RAG検索用のナレッジベースとして活用できます。
          </Typography>
        </Alert>
      )}

      {/* 使用方法の説明 */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          使用方法
        </Typography>
        <Typography variant="body2" component="div">
          <ol>
            <li><strong>CSVファイルを準備：</strong> docomo2.csvのような形式のFAQデータCSVファイルを用意してください</li>
            <li><strong>ファイルを選択：</strong> 上記のボタンをクリックしてCSVファイルを選択します</li>
            <li><strong>処理開始：</strong> ファイル選択後、自動的に顧客の状況推測処理が開始されます</li>
            <li><strong>結果取得：</strong> 処理完了後、「再質問」列が追加されたCSVファイルが自動でダウンロードされます</li>
            <li><strong>活用：</strong> 生成されたCSVファイルをRAG検索システムのナレッジベースとして活用できます</li>
          </ol>
        </Typography>
      </Paper>
    </Container>
  );
}
