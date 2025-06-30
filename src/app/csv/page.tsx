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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Breadcrumbs,
  Link,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DownloadIcon from '@mui/icons-material/Download';
import HomeIcon from '@mui/icons-material/Home';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

import { convertQuestionsToCSV, downloadCSV, generateTimestampedFilename, parseCSVToQuestions } from '@/utils/csv';

interface Question {
  question: string;
  answer: string;
}

export default function CSVPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [diffReportPath, setDiffReportPath] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // CSV読み込みハンドラー
  const handleCSVUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('CSVファイルを選択してください');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvContent = e.target?.result as string;
        const parsedQuestions = parseCSVToQuestions(csvContent);
        
        if (parsedQuestions.length === 0) {
          setError('CSVファイルから質問データを読み込めませんでした。ファイル形式を確認してください。');
          return;
        }

        setQuestions(parsedQuestions);
        setError(null);
        
        // ファイル入力をクリア
        if (csvInputRef.current) {
          csvInputRef.current.value = '';
        }
      } catch {
        setError('CSVファイルの読み込み中にエラーが発生しました');
      }
    };

    reader.readAsText(file, 'UTF-8');
  };

  // QA精査ハンドラー
  const handleRefineQA = async () => {
    if (questions.length === 0) {
      setError('精査する質問データがありません');
      return;
    }

    setIsRefining(true);
    setError(null);

    try {
      const response = await fetch('/api/refine-qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qaData: questions }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'QA精査中にエラーが発生しました');
      }

      const data = await response.json();
      setQuestions(data.data);
      setDiffReportPath(data.diffReportPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setIsRefining(false);
    }
  };

  // CSVダウンロードハンドラー
  const handleDownloadCSV = () => {
    if (questions.length === 0) {
      setError('ダウンロードする質問データがありません');
      return;
    }

    try {
      const csvContent = convertQuestionsToCSV(questions);
      const filename = generateTimestampedFilename('refined_qa_data');
      downloadCSV(csvContent, filename);
    } catch {
      setError('CSVファイルの生成中にエラーが発生しました');
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
        <Typography color="text.primary">CSVデータ精査</Typography>
      </Breadcrumbs>

      <Typography variant="h3" component="h1" gutterBottom align="center">
        CSVデータ精査ツール
      </Typography>
      <Typography variant="h6" color="text.secondary" align="center" sx={{ mb: 4 }}>
        CSVファイルからQAデータを読み込んで、粒度を揃える精査を行います
      </Typography>


      {/* CSV読み込みとQA精査セクション */}
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          CSVデータの読み込みと精査
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          docomo.csvのようなCSVファイルからQAデータを読み込んで、FAQサイトに適した形式に精査します。
          <br />
          <strong>※ 現在は処理負荷軽減のため、最初の20件のみを精査対象とします。</strong>
          <br />
          精査では以下の要件に従って質問と回答を整理します：
        </Typography>
        
        <Box sx={{ mb: 3, pl: 2 }}>
          <Typography variant="body2" component="div">
            <strong>質問の精査：</strong>
            <ul>
              <li>質問文は変更しません（元の質問をそのまま保持）</li>
            </ul>
            <strong>回答の精査：</strong>
            <ul>
              <li>元の回答の意味や内容を完全に保持</li>
              <li>シンプルで読みやすい形式に整理</li>
              <li>重要なワードを分類、強調</li>
              <li>箇条書きを活用（全角「・」、インデント「　・」「　　・」）</li>
              <li>説明文を大項目などでセクション分けする際は英数字を用いる</li>
              <li>URLやリンクは適切なリンク形式で出力</li>
              <li>具体的な数値、日付、手順、条件などは必ず保持</li>
              <li>丁寧な表現にする</li>
            </ul>
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2, border: '2px dashed #ccc', borderRadius: 2 }}>
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              style={{ display: 'none' }}
              ref={csvInputRef}
            />
            <Button
              variant="outlined"
              startIcon={<FileUploadIcon />}
              onClick={() => csvInputRef.current?.click()}
              sx={{ mb: 1 }}
            >
              CSVファイルを読み込み
            </Button>
            <Typography variant="body2" color="text.secondary">
              docomo.csvのような形式のCSVファイルに対応
            </Typography>
          </Box>
          
          {questions.length > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
              <Button
                variant="contained"
                color="warning"
                startIcon={<AutoFixHighIcon />}
                onClick={handleRefineQA}
                disabled={isRefining}
                size="large"
              >
                {isRefining ? 'QAデータを精査中...' : 'QAデータの粒度を精査'}
              </Button>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadCSV}
                disabled={questions.length === 0}
              >
                精査済みCSVダウンロード
              </Button>
            </Box>
          )}
        </Box>
      </Paper>

      {isRefining && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            QAデータを精査中...これには数分かかる場合があります
          </Typography>
        </Box>
      )}

      {/* エラー表示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {/* 差分レポート表示 */}
      {diffReportPath && (
        <Alert severity="success" sx={{ mb: 4 }}>
          <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
            QA精査が完了しました！
          </Typography>
          <Typography variant="body2">
            精査前後の差分レポートが生成されました: <code>{diffReportPath}</code>
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            このMarkdownファイルには、変更されたQAペアの詳細な差分情報が含まれています。
          </Typography>
        </Alert>
      )}

      {/* 読み込まれた質問表示 */}
      {questions.length > 0 && (
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5">
              QAデータ ({questions.length}件)
            </Typography>
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', width: '60px' }}>No.</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '40%' }}>質問</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '60%' }}>回答</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {questions.map((q, index) => (
                  <TableRow key={index}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell sx={{ maxWidth: 300, wordBreak: 'break-word' }}>
                      <Typography variant="body2">{q.question}</Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 400, wordBreak: 'break-word' }}>
                      <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-wrap' }}>
                        {q.answer}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Container>
  );
}
