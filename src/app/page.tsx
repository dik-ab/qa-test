'use client';

import { useState, useRef, ChangeEvent, FormEvent, useEffect } from 'react';
import * as Tesseract from 'tesseract.js';
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
  Stack,
  Tabs,
  Tab,
  ButtonGroup
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import DownloadIcon from '@mui/icons-material/Download';
import TableViewIcon from '@mui/icons-material/TableView';
import { convertQuestionsToCSV, downloadCSV, generateTimestampedFilename } from '@/utils/csv';
import { downloadXLSX, generateTimestampedXLSXFilename } from '@/utils/xlsx';

// 質問と回答の型定義
interface Question {
  question: string;
  answer: string;
}

// ファイルタイプの型定義
type FileType = 'pdf' | 'image';

export default function Home() {
  // ファイルアップロード関連の状態
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [fileType, setFileType] = useState<FileType>('pdf');
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ファイルタイプ変更ハンドラー
  const handleFileTypeChange = (_event: React.SyntheticEvent, newValue: FileType) => {
    setFileType(newValue);
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ファイル選択ハンドラー
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const selectedFiles = Array.from(event.target.files);
      
      if (fileType === 'pdf') {
        // PDFファイルのみを許可
        const pdfFiles = selectedFiles.filter(file => file.type === 'application/pdf');
        
        if (pdfFiles.length !== selectedFiles.length) {
          setError('PDFファイルのみアップロードできます');
          return;
        }
        
        setFiles(pdfFiles);
      } else {
        // 画像ファイルのみを許可
        const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
        const imageFiles = selectedFiles.filter(file => validImageTypes.includes(file.type));
        
        if (imageFiles.length !== selectedFiles.length) {
          setError('画像ファイル（JPEG, PNG, GIF, BMP, WebP）のみアップロードできます');
          return;
        }
        
        setFiles(imageFiles);
      }
      
      setError(null);
    }
  };

  // 質問数変更ハンドラー
  const handleNumQuestionsChange = (_event: Event, value: number | number[]) => {
    setNumQuestions(value as number);
  };

  // CSVダウンロードハンドラー
  const handleDownloadCSV = () => {
    if (questions.length === 0) {
      setError('ダウンロードする質問データがありません');
      return;
    }

    try {
      const csvContent = convertQuestionsToCSV(questions);
      const filename = generateTimestampedFilename('qa_data');
      downloadCSV(csvContent, filename);
    } catch (err) {
      setError('CSVファイルの生成中にエラーが発生しました');
    }
  };

  // XLSXダウンロードハンドラー
  const handleDownloadXLSX = () => {
    if (questions.length === 0) {
      setError('ダウンロードする質問データがありません');
      return;
    }

    try {
      const filename = generateTimestampedXLSXFilename('qa_data');
      downloadXLSX(questions, filename);
    } catch (err) {
      setError('XLSXファイルの生成中にエラーが発生しました');
    }
  };

  // 画像からテキストを抽出する関数
  const extractTextFromImage = async (file: File): Promise<string> => {
    try {
      // Tesseract.jsを使用して画像からテキストを抽出
      // Fileオブジェクトを直接渡す
      const result = await Tesseract.recognize(
        file,
        'jpn+eng', // 日本語と英語を認識
        {
          logger: m => console.log(m), // 進行状況をログに出力
        }
      );
      
      return result.data.text;
    } catch (error) {
      console.error('Error extracting text from image:', error);
      throw error;
    }
  };
  
  // 複数の画像からテキストを抽出する関数
  const extractTextFromMultipleImages = async (imageFiles: File[]): Promise<string> => {
    const texts = [];
    
    // 各画像からテキストを抽出（順次処理）
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const text = await extractTextFromImage(file);
      texts.push(text);
    }
    
    // 各画像から抽出したテキストを結合
    return texts.join('\n\n--- 次の画像 ---\n\n');
  };

  // フォーム送信ハンドラー
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    
    if (files.length === 0) {
      setError(`${fileType === 'pdf' ? 'PDF' : '画像'}ファイルを選択してください`);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setExtractedText(null);
    
    try {
      if (fileType === 'pdf') {
        // PDFファイルの場合は従来通りAPIに送信
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
      } else {
        // 画像ファイルの場合はクライアントサイドでテキスト抽出
        const extractedTextContent = await extractTextFromMultipleImages(files);
        setExtractedText(extractedTextContent);
        
        // 抽出したテキストをAPIに送信して質問を生成
        const formData = new FormData();
        formData.append('extractedText', extractedTextContent);
        formData.append('numQuestions', numQuestions.toString());
        
        const response = await fetch('/api/extract-text-from-image', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'テキストの処理中にエラーが発生しました');
        }
        
        const data = await response.json();
        setQuestions(data.questions);
      }
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
        ファイルからクエスチョンデータ生成
      </Typography>
      
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <Box sx={{ width: '100%', mb: 3 }}>
                <Tabs
                  value={fileType}
                  onChange={handleFileTypeChange}
                  centered
                  sx={{ mb: 2 }}
                >
                  <Tab label="PDFファイル" value="pdf" />
                  <Tab label="画像ファイル" value="image" />
                </Tabs>
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2, border: '2px dashed #ccc', borderRadius: 2, mb: 2 }}>
                <input
                  type="file"
                  multiple
                  accept={fileType === 'pdf' ? '.pdf' : 'image/jpeg, image/png, image/gif, image/bmp, image/webp'}
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
                  {fileType === 'pdf' ? 'PDFファイル' : '画像ファイル'}を選択
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
                  {fileType === 'pdf' ? 'PDF' : '画像'}からクエスチョンデータを生成
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
            {fileType === 'pdf' ? 'PDF' : '画像'}を解析中...これには数分かかる場合があります
          </Typography>
        </Box>
      )}
      
      {extractedText && (
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            抽出されたテキスト
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ maxHeight: '300px', overflow: 'auto', whiteSpace: 'pre-wrap', p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
            {extractedText}
          </Box>
        </Paper>
      )}
      
      {questions.length > 0 && (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h5">
              生成されたクエスチョンデータ
            </Typography>
            <ButtonGroup variant="outlined" color="primary">
              <Button
                startIcon={<DownloadIcon />}
                onClick={handleDownloadCSV}
              >
                CSV
              </Button>
              <Button
                startIcon={<TableViewIcon />}
                onClick={handleDownloadXLSX}
              >
                XLSX
              </Button>
            </ButtonGroup>
          </Box>
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
