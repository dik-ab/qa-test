'use client';

import { useState, useRef, ChangeEvent, FormEvent } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  TextField,
  List,
  ListItem,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Alert,
  Snackbar,
  Container,
  Grid,
  Slider,
  Stack
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';

// 質問と回答の型定義
interface Question {
  question: string;
  answer: string;
}

export default function Home() {
  // ファイルアップロード関連の状態
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ファイル選択ハンドラー
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const selectedFiles = Array.from(event.target.files);
      
      // PDFファイルのみを許可
      const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
      
      if (pdfFiles.length !== selectedFiles.length) {
        setError('PDFファイルのみアップロードできます');
        return;
      }
      
      setFiles(pdfFiles);
      setError(null);
    }
  };

  // 質問数変更ハンドラー
  const handleNumQuestionsChange = (_event: Event, value: number | number[]) => {
    setNumQuestions(value as number);
  };

  // フォーム送信ハンドラー
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    
    if (files.length === 0) {
      setError('PDFファイルを選択してください');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      formData.append('numQuestions', numQuestions.toString());
      
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'PDFの処理中にエラーが発生しました');
      }
      
      const data = await response.json();
      setQuestions(data.questions);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // ファイル選択をクリアする
  const handleClearFiles = () => {
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 4 }}>
        PDFからクエスチョンデータ生成
      </Typography>
      
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2, border: '2px dashed #ccc', borderRadius: 2, mb: 2 }}>
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                />
                <Button
                  variant="contained"
                  startIcon={<UploadFileIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ mb: 2 }}
                >
                  PDFファイルを選択
                </Button>
                
                {files.length > 0 && (
                  <Box sx={{ width: '100%' }}>
                    <Typography variant="subtitle1" gutterBottom>
                      選択されたファイル ({files.length}):
                    </Typography>
                    <List dense>
                      {files.map((file, index) => (
                        <ListItem key={index}>
                          <ListItemText 
                            primary={file.name} 
                            secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`} 
                          />
                        </ListItem>
                      ))}
                    </List>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      onClick={handleClearFiles}
                      sx={{ mt: 1 }}
                    >
                      クリア
                    </Button>
                  </Box>
                )}
              </Box>
            </Box>
            
            <Box>
              <Typography gutterBottom>
                生成する質問数: {numQuestions}
              </Typography>
              <Slider
                value={numQuestions}
                onChange={handleNumQuestionsChange}
                min={1}
                max={10}
                step={1}
                marks
                valueLabelDisplay="auto"
              />
            </Box>
            
            <Box>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary" 
                  disabled={isLoading || files.length === 0}
                  startIcon={<QuestionAnswerIcon />}
                  size="large"
                >
                  クエスチョンデータを生成
                </Button>
              </Stack>
            </Box>
          </Box>
        </form>
      </Paper>
      
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            PDFを解析中...これには数分かかる場合があります
          </Typography>
        </Box>
      )}
      
      {questions.length > 0 && (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            生成されたクエスチョンデータ
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          {questions.map((item, index) => (
            <Accordion key={index}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>
                  <strong>Q{index + 1}:</strong> {item.question}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography>
                  <strong>回答:</strong> {item.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Paper>
      )}
      
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
}
