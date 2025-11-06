'use client';

import { useState, useRef, ChangeEvent, FormEvent } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
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
  Slider,
  Stack,
  Tabs,
  Tab,
  ButtonGroup,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  FormControl,
  FormLabel
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import DownloadIcon from '@mui/icons-material/Download';
import TableViewIcon from '@mui/icons-material/TableView';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import CompareIcon from '@mui/icons-material/Compare';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import LinkIcon from '@mui/icons-material/Link';
import { convertQuestionsToCSV, downloadCSV, generateTimestampedFilename } from '@/utils/csv';
import { downloadXLSX, generateTimestampedXLSXFilename } from '@/utils/xlsx';
import { downloadTextFile, generateTimestampedTextFilename, formatExtractedTextForDownload } from '@/utils/text';
import PromptEditor from '@/components/PromptEditor';
import { DocumentType, DOCUMENT_TYPE_OPTIONS, DOCUMENT_TYPE_PROMPTS } from '@/utils/document-type-prompts';

// 質問と回答の型定義
interface Question {
  question: string;
  answer: string;
}

// API レスポンスの型定義
interface GenerateQuestionsResponse {
  questions: Question[];
  extractedText?: string;
  savedPdfPaths?: string[];
}

// 類似度チェック結果の型定義
interface SimilarityResult {
  similarPairs: Array<{
    index1: number;
    index2: number;
    question1: string;
    question2: string;
    similarity: string;
    reason: string;
  }>;
  summary: string;
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
  const [comprehensiveMode, setComprehensiveMode] = useState<boolean>(false);
  const [fileType, setFileType] = useState<FileType>('pdf');
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>(DOCUMENT_TYPE_PROMPTS['general']);
  const [similarityResult, setSimilarityResult] = useState<SimilarityResult | null>(null);
  const [isSimilarityLoading, setIsSimilarityLoading] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentType>('general');
  const [enableValidation, setEnableValidation] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ファイルタイプ変更ハンドラー
  const handleFileTypeChange = (_event: React.SyntheticEvent, newValue: FileType) => {
    setFileType(newValue);
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // プロンプト変更ハンドラー
  const handlePromptChange = (prompt: string) => {
    setCustomPrompt(prompt);
  };
  
  // ドキュメントタイプ変更ハンドラー
  const handleDocumentTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newType = event.target.value as DocumentType;
    setDocumentType(newType);
    
    // ドキュメントタイプに応じたデフォルトプロンプトを設定
    if (!customPrompt || Object.values(DOCUMENT_TYPE_PROMPTS).includes(customPrompt)) {
      setCustomPrompt(DOCUMENT_TYPE_PROMPTS[newType]);
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
    } catch {
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
    } catch  {
      setError('XLSXファイルの生成中にエラーが発生しました');
    }
  };

  // テキストファイルダウンロードハンドラー
  const handleDownloadText = () => {
    if (!extractedText) {
      setError('ダウンロードするテキストデータがありません');
      return;
    }

    try {
      const formattedText = formatExtractedTextForDownload(extractedText);
      const filename = generateTimestampedTextFilename('extracted_text');
      downloadTextFile(formattedText, filename);
    } catch {
      setError('テキストファイルの生成中にエラーが発生しました');
    }
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
      // PDFも画像も統一されたBedrockのAPIで処理
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      formData.append('numQuestions', numQuestions.toString());
      formData.append('comprehensiveMode', comprehensiveMode.toString());
      formData.append('fileType', fileType);
      formData.append('documentType', documentType);
      formData.append('enableValidation', enableValidation.toString());
      
      // カスタムプロンプトが現在のドキュメントタイプのデフォルトと異なる場合のみ送信
      if (customPrompt !== DOCUMENT_TYPE_PROMPTS[documentType]) {
        formData.append('customPrompt', customPrompt);
      }
      
      const response = await fetch('/api/process-files-with-bedrock', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `${fileType === 'pdf' ? 'PDF' : '画像'}の処理中にエラーが発生しました`);
      }
      
      const data = await response.json();
      setQuestions(data.questions);
      // 抽出されたテキストを設定
      if (data.extractedText) {
        setExtractedText(data.extractedText);
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

  // 類似度チェックハンドラー
  const handleCheckSimilarity = async () => {
    if (questions.length < 2) {
      setError('類似度チェックには最低2つの質問が必要です');
      return;
    }

    setIsSimilarityLoading(true);
    setError(null);
    setSimilarityResult(null);

    try {
      const response = await fetch('/api/check-similarity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ questions }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '類似度チェック中にエラーが発生しました');
      }

      const data = await response.json();
      setSimilarityResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setIsSimilarityLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 2 }}>
        ファイルからクエスチョンデータ生成
      </Typography>
      
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4, flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button
            variant="outlined"
            href="/csv"
          >
            CSVデータ精査ツール
          </Button>
          <Button
            variant="outlined"
            href="/customer-situation"
            color="primary"
          >
            顧客の状況推測ツール
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          既存のCSVファイルを精査する場合や、FAQデータから顧客の状況を推測する場合はこちら
        </Typography>
      </Box>
      
      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* ドキュメントタイプ選択セクション */}
            <Box>
              <FormControl component="fieldset">
                <FormLabel component="legend">
                  <Typography variant="h6" sx={{ color: 'text.primary' }}>
                    ドキュメント種別
                  </Typography>
                </FormLabel>
                <RadioGroup
                  row
                  value={documentType}
                  onChange={handleDocumentTypeChange}
                  sx={{ mt: 1, mb: 2 }}
                >
                  {DOCUMENT_TYPE_OPTIONS.map((option) => (
                    <FormControlLabel
                      key={option.value}
                      value={option.value}
                      control={<Radio />}
                      label={option.label}
                    />
                  ))}
                </RadioGroup>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  ドキュメントの種別を選択すると、それに適したFAQ生成プロンプトが自動的に設定されます
                </Typography>
              </FormControl>
            </Box>

            <Divider />

            {/* プロンプト編集セクション */}
            <Box>
              <Typography variant="h6" gutterBottom>
                プロンプト設定
              </Typography>
              <PromptEditor
                onPromptChange={handlePromptChange}
                defaultPrompt={DOCUMENT_TYPE_PROMPTS[documentType]}
              />
            </Box>

            <Divider />

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
              <Typography variant="h6" gutterBottom>
                質問生成設定
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={comprehensiveMode}
                      onChange={(e) => setComprehensiveMode(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" component="span">
                        網羅的生成モード
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        AIが文書を分析してユーザーが疑問に思うであろう箇所を自動判断し、細かい部分まで網羅的に質問を生成します。
                        このモードでは指定した質問数よりも多くの質問が生成される場合があります。
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: 'flex-start' }}
                />
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={enableValidation}
                      onChange={(e) => setEnableValidation(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" component="span">
                        回答検証モード（推奨）
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        生成された回答がドキュメントに基づいているか検証し、推測や憶測が含まれている場合は
                        「この質問に回答するための情報がドキュメント内に不足しています。」に置き換えます。
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: 'flex-start' }}
                />
              </Box>
              
              <Box sx={{ opacity: comprehensiveMode ? 0.5 : 1 }}>
                <Typography gutterBottom>
                  生成する質問数: {numQuestions}
                  {comprehensiveMode && (
                    <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      （網羅的モードでは参考値として使用）
                    </Typography>
                  )}
                </Typography>
                <Slider
                  value={numQuestions}
                  onChange={handleNumQuestionsChange}
                  min={1}
                  max={50}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
                  disabled={comprehensiveMode}
                />
              </Box>
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
      
      {/* PDFファイル保存機能は削除されたため、この表示部分も削除 */}

      {extractedText && (
        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h5">
              抽出されたテキスト
            </Typography>
            <Button
              variant="outlined"
              startIcon={<TextSnippetIcon />}
              onClick={handleDownloadText}
              color="primary"
            >
              テキストファイルをダウンロード
            </Button>
          </Box>
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
            <Stack direction="row" spacing={1} flexWrap="wrap">
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
              <Button
                variant="contained"
                color="secondary"
                startIcon={<CompareIcon />}
                onClick={handleCheckSimilarity}
                disabled={isSimilarityLoading || questions.length < 2}
              >
                類似度チェック
              </Button>
            </Stack>
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

      {isSimilarityLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            質問の類似度を分析中...
          </Typography>
        </Box>
      )}

      {similarityResult && (
        <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            類似度チェック結果
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          {/* 全体的な分析結果 */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              分析サマリー
            </Typography>
            <Typography variant="body1" sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              {similarityResult.summary}
            </Typography>
          </Box>

          {/* 類似している質問ペア */}
          {similarityResult.similarPairs.length > 0 ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                類似している質問ペア ({similarityResult.similarPairs.length}組)
              </Typography>
              {similarityResult.similarPairs.map((pair, index) => (
                <Accordion key={index} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>
                      <strong>ペア {index + 1}:</strong> Q{pair.index1} と Q{pair.index2} - {pair.similarity}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          質問 {pair.index1}:
                        </Typography>
                        <Typography variant="body2" sx={{ p: 1, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                          {pair.question1}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="primary" gutterBottom>
                          質問 {pair.index2}:
                        </Typography>
                        <Typography variant="body2" sx={{ p: 1, bgcolor: '#e8f5e8', borderRadius: 1 }}>
                          {pair.question2}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                          類似度の理由:
                        </Typography>
                        <Typography variant="body2" sx={{ p: 1, bgcolor: '#fff3e0', borderRadius: 1 }}>
                          {pair.reason}
                        </Typography>
                      </Box>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          ) : (
            <Box>
              <Typography variant="h6" gutterBottom>
                類似している質問ペア
              </Typography>
              <Alert severity="info">
                類似している質問ペアは見つかりませんでした。生成された質問は十分に多様性があります。
              </Alert>
            </Box>
          )}
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
