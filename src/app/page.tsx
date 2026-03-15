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
  FormLabel,
  TextField,
  IconButton
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import DownloadIcon from '@mui/icons-material/Download';
import TableViewIcon from '@mui/icons-material/TableView';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import CompareIcon from '@mui/icons-material/Compare';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { convertQuestionsToCSV, downloadCSV, generateTimestampedFilename } from '@/utils/csv';
import { downloadXLSX, generateTimestampedXLSXFilename } from '@/utils/xlsx';
import { downloadTextFile, generateTimestampedTextFilename, formatExtractedTextForDownload } from '@/utils/text';
import PromptEditor from '@/components/PromptEditor';
import { DocumentType, DOCUMENT_TYPE_OPTIONS, DOCUMENT_TYPE_PROMPTS } from '@/utils/document-type-prompts';
import { GenerationMode } from '@/utils/flexible-generation';
import { DEFAULT_TE_QUESTION_PROMPT, DEFAULT_TE_ANSWER_PROMPT } from '@/utils/te-prompts';
import { DEFAULT_DOCOMO_QUESTION_PROMPT, DEFAULT_DOCOMO_ANSWER_PROMPT } from '@/utils/default-prompts';

// 質問と回答の型定義
interface Question {
  question: string;
  answer: string;
  pageNumber?: string;
  location?: string;
  expansionData?: string;
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
  const [fileType, setFileType] = useState<FileType>('pdf');
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [savedExtractedText, setSavedExtractedText] = useState<string | null>(null); // 質問生成時のテキストを保存
  const [customPrompt, setCustomPrompt] = useState<string>(DOCUMENT_TYPE_PROMPTS['consumer']);
  const [customQuestionPrompt, setCustomQuestionPrompt] = useState<string>('');  // 直接生成モード用質問プロンプト
  const [customAnswerPrompt, setCustomAnswerPrompt] = useState<string>('');  // 直接生成モード用回答プロンプト
  const [similarityResult, setSimilarityResult] = useState<SimilarityResult | null>(null);
  const [isSimilarityLoading, setIsSimilarityLoading] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentType>('consumer');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('both');
  const [useTE, setUseTE] = useState<boolean>(false);
  const [teQuestionPrompt, setTeQuestionPrompt] = useState<string>(DEFAULT_TE_QUESTION_PROMPT);
  const [teAnswerPrompt, setTeAnswerPrompt] = useState<string>(DEFAULT_TE_ANSWER_PROMPT);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [existingQuestions, setExistingQuestions] = useState<Question[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedQuestion, setEditedQuestion] = useState<string>('');
  const [editedAnswer, setEditedAnswer] = useState<string>('');
  const [generateExpansion, setGenerateExpansion] = useState<boolean>(false);
  const [enableStability, setEnableStability] = useState<boolean>(false);
  const [useDirectGeneration, setUseDirectGeneration] = useState<boolean>(true); // デフォルトで直接生成を使用
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

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
    
    // B/E向けの場合は自動的にTEモードを有効にする
    if (newType === 'enterprise') {
      setUseTE(true);
    } else {
      setUseTE(false);
    }
    
    // ドキュメントタイプに応じたデフォルトプロンプトを設定
    if (!customPrompt || Object.values(DOCUMENT_TYPE_PROMPTS).includes(customPrompt)) {
      setCustomPrompt(DOCUMENT_TYPE_PROMPTS[newType]);
    }
    
    // 直接生成モード用のプロンプトも設定
    if (newType === 'enterprise') {
      setCustomQuestionPrompt(DEFAULT_DOCOMO_QUESTION_PROMPT);
      setCustomAnswerPrompt(DEFAULT_DOCOMO_ANSWER_PROMPT);
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
  console.log("questions", questions)
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
    
    // TE回答のみ生成モードの場合、CSVファイルが必要
    if (useTE && generationMode === 'answers_only' && existingQuestions.length === 0) {
      setError('回答のみ生成モードでは、WORDファイルをアップロードしてください');
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
      formData.append('numQue', numQuestions.toString());
      formData.append('fileType', fileType);
      formData.append('documentType', documentType);
      formData.append('generationMode', generationMode);
      formData.append('useTE', useTE.toString());
      formData.append('generateExpansion', generateExpansion.toString());
      formData.append('enableStability', enableStability.toString());
      formData.append('useDirectGeneration', useDirectGeneration.toString());
      
      // TE用プロンプトの送信
      if (useTE) {
        formData.append('teQuestionPrompt', teQuestionPrompt);
        formData.append('teAnswerPrompt', teAnswerPrompt);
      }
      
      // 回答のみ生成モードの場合、既存の質問を送信（TEモード・C向けモード共通）
      if (generationMode === 'answers_only' && existingQuestions.length > 0) {
        formData.append('existingQuestions', JSON.stringify(existingQuestions));
      }
      
      // カスタムプロンプトの送信
      if (useDirectGeneration && (generationMode === 'questions_only' || generationMode === 'both') && customQuestionPrompt) {
        formData.append('customQuestionPrompt', customQuestionPrompt);
      }
      if (useDirectGeneration && (generationMode === 'answers_only' || generationMode === 'both') && customAnswerPrompt) {
        formData.append('customAnswerPrompt', customAnswerPrompt);
      }
      // 従来のテキストモード用
      if (!useDirectGeneration && customPrompt !== DOCUMENT_TYPE_PROMPTS[documentType]) {
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
        // 質問生成モード（questions_only または both）の場合、テキストを保存
        if (generationMode === 'questions_only' || generationMode === 'both') {
          setSavedExtractedText(data.extractedText);
        }
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

  // CSVファイルの処理ハンドラー
  const handleCsvFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setError('CSVファイルのみアップロードできます');
        return;
      }
      
      setCsvFile(file);
      
      try {
        const text = await file.text();
        
        // CSVパーサー関数
        const parseCSV = (csvText: string): string[][] => {
          const rows: string[][] = [];
          let currentRow: string[] = [];
          let currentField = '';
          let insideQuotes = false;
          let i = 0;
          
          // BOMを削除
          const cleanText = csvText.replace(/^\uFEFF/, '');
          
          while (i < cleanText.length) {
            const char = cleanText[i];
            
            if (char === '"') {
              if (insideQuotes && cleanText[i + 1] === '"') {
                // エスケープされたクォート
                currentField += '"';
                i += 2;
              } else {
                // クォートの開始または終了
                insideQuotes = !insideQuotes;
                i++;
              }
            } else if (char === ',' && !insideQuotes) {
              // フィールドの区切り
              currentRow.push(currentField);
              currentField = '';
              i++;
            } else if ((char === '\n' || char === '\r') && !insideQuotes) {
              // 行の区切り
              currentRow.push(currentField);
              if (currentRow.some(field => field.trim() !== '')) {
                rows.push(currentRow);
              }
              currentRow = [];
              currentField = '';
              
              // \r\nの場合は\nもスキップ
              if (char === '\r' && cleanText[i + 1] === '\n') {
                i += 2;
              } else {
                i++;
              }
            } else {
              currentField += char;
              i++;
            }
          }
          
          // 最後のフィールドと行を追加
          if (currentField || currentRow.length > 0) {
            currentRow.push(currentField);
            if (currentRow.some(field => field.trim() !== '')) {
              rows.push(currentRow);
            }
          }
          
          return rows;
        };
        
        const rows = parseCSV(text);
        const parsedQuestions: Question[] = [];
        
        // ヘッダー行をスキップして処理
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length >= 2) {
            const question = row[0].trim();
            const answer = row[1].trim();
            // 拡張フィールドがある場合も処理
            if (question) {
              const questionObj: Question = { question, answer };
              if (row.length > 2 && row[2]) questionObj.expansionData = row[2].trim();
              if (row.length > 3 && row[3]) questionObj.pageNumber = row[3].trim();
              if (row.length > 4 && row[4]) questionObj.location = row[4].trim();
              parsedQuestions.push(questionObj);
            }
          }
        }
        
        if (parsedQuestions.length === 0) {
          setError('CSVファイルから質問を読み込めませんでした');
          setCsvFile(null);
          return;
        }
        
        setExistingQuestions(parsedQuestions);
        setError(null);
        console.log(`読み込まれた質問数: ${parsedQuestions.length}`);
      } catch (err) {
        setError('CSVファイルの読み込み中にエラーが発生しました');
        setCsvFile(null);
        setExistingQuestions([]);
      }
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
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
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                  {documentType === 'enterprise' 
                    ? 'B/E向けでは質問と回答を分離して生成する高精度モードが自動的に使用されます' 
                    : 'C向けでは標準のFAQ生成プロンプトが使用されます'}
                </Typography>
              </FormControl>
            </Box>

            <Divider />

            {/* 生成モード選択（TE用と通常モード両方で使用） */}
            <>
                <Box>
                  <FormControl component="fieldset">
                    <FormLabel component="legend">
                      <Typography variant="h6" sx={{ color: 'text.primary' }}>
                        生成モード
                      </Typography>
                    </FormLabel>
                    <RadioGroup
                      row
                      value={generationMode}
                      onChange={(e) => setGenerationMode(e.target.value as GenerationMode)}
                      sx={{ mt: 1, mb: 2 }}
                    >
                      <FormControlLabel
                        value="questions_only"
                        control={<Radio />}
                        label="質問のみ生成"
                      />
                      <FormControlLabel
                        value="answers_only"
                        control={<Radio />}
                        label="回答のみ生成"
                      />
                      <FormControlLabel
                        value="both"
                        control={<Radio />}
                        label="両方生成"
                      />
                    </RadioGroup>
                    <Typography variant="caption" color="text.secondary">
                      {generationMode === 'questions_only' && '質問のみを生成し、回答は空欄になります'}
                      {generationMode === 'answers_only' && '既存のFAQデータの質問に対して回答を生成します（CSVアップロードが必要）'}
                      {generationMode === 'both' && '質問を生成してから、それに対する回答を生成します'}
                    </Typography>
                  </FormControl>
                </Box>
            </>

            {/* 回答のみ生成モードの場合、CSVアップロード */}
            {generationMode === 'answers_only' && (
                  <Box sx={{ p: 2, border: '2px dashed #ccc', borderRadius: 2, backgroundColor: '#f5f5f5' }}>
                    <Typography variant="h6" gutterBottom>
                      既存の質問CSVファイルをアップロード
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      質問と回答のCSVファイルをアップロードしてください。回答部分は生成されるため、空欄でも構いません。
                    </Typography>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvFileChange}
                      style={{ display: 'none' }}
                      ref={csvInputRef}
                    />
                    <Button
                      variant="contained"
                      color="secondary"
                      startIcon={<UploadFileIcon />}
                      onClick={() => csvInputRef.current?.click()}
                      sx={{ mb: csvFile ? 2 : 0 }}
                    >
                      CSVファイルを選択
                    </Button>
                    
                    {csvFile && (
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          選択されたファイル: {csvFile.name}
                        </Typography>
                        {existingQuestions.length > 0 && (
                          <Typography variant="body2" color="success.main">
                            {existingQuestions.length}個の質問を読み込みました
                          </Typography>
                        )}
                      </Box>
                    )}
                  </Box>
            )}

            {/* TE用プロンプト編集 */}
            {useTE && useDirectGeneration && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                {(generationMode === 'questions_only' || generationMode === 'both') && (
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        質問生成プロンプト
                      </Typography>
                      <PromptEditor
                        onPromptChange={setTeQuestionPrompt}
                        defaultPrompt={DEFAULT_TE_QUESTION_PROMPT}
                      />
                    </Box>
                )}
                {(generationMode === 'answers_only' || generationMode === 'both') && (
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        回答生成プロンプト
                      </Typography>
                      <PromptEditor
                        onPromptChange={setTeAnswerPrompt}
                        defaultPrompt={DEFAULT_TE_ANSWER_PROMPT}
                      />
                    </Box>
                )}
              </Box>
            )}
            
            {/* B/E向け(docomo)プロンプト編集 */}
            {documentType === 'enterprise' && !useTE && useDirectGeneration && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                {(generationMode === 'questions_only' || generationMode === 'both') && (
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        質問生成プロンプト
                      </Typography>
                      <PromptEditor
                        onPromptChange={setCustomQuestionPrompt}
                        defaultPrompt={DEFAULT_DOCOMO_QUESTION_PROMPT}
                      />
                    </Box>
                )}
                {(generationMode === 'answers_only' || generationMode === 'both') && (
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        回答生成プロンプト
                      </Typography>
                      <PromptEditor
                        onPromptChange={setCustomAnswerPrompt}
                        defaultPrompt={DEFAULT_DOCOMO_ANSWER_PROMPT}
                      />
                    </Box>
                )}
              </Box>
            )}

            {/* 通常のプロンプト編集セクション(テキスト抽出モードやC向け直接生成) */}
            {!useTE && (!useDirectGeneration || (useDirectGeneration && documentType === 'consumer')) && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  プロンプト設定
                </Typography>
                <PromptEditor
                  onPromptChange={handlePromptChange}
                  defaultPrompt={DOCUMENT_TYPE_PROMPTS[documentType]}
                />
              </Box>
            )}

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
                      checked={useDirectGeneration}
                      onChange={(e) => setUseDirectGeneration(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" component="span">
                        ダイレクト生成モード（推奨）
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        ドキュメントから直接QAを生成します。レイアウトや表構造を考慮したより正確な生成が可能です。
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: 'flex-start' }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={generateExpansion}
                      onChange={(e) => setGenerateExpansion(e.target.checked)}
                      color="primary"
                      disabled={generationMode === 'questions_only'}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" component="span">
                        質問拡張データ・ページ数・場所を生成
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        回答生成時に、FAQ検索用の質問拡張データと、該当情報のページ数・場所を抽出します。
                        処理時間が長くなる場合があります。
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: 'flex-start' }}
                />
                
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={enableStability}
                      onChange={(e) => setEnableStability(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1" component="span">
                        同一性担保モード（実験的機能）
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        質問を3回生成し、一致するものだけを出力します。
                        より安定した質問セットが生成されますが、処理時間が約3倍になります。
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: 'flex-start' }}
                />
              </Box>
              
              <Box>
                <Typography gutterBottom>
                  生成する質問数: {numQuestions}
                </Typography>
                <Slider
                  value={numQuestions}
                  onChange={handleNumQuestionsChange}
                  min={1}
                  max={50}
                  step={1}
                  marks
                  valueLabelDisplay="auto"
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
                  onClick={() => console.log('Button clicked. isLoading:', isLoading, 'files:', files)}
                >
                  {fileType === 'pdf' ? 'PDF' : '画像'}から{generationMode === 'questions_only' ? '質問' : generationMode === 'answers_only' ? '回答' : 'クエスチョンデータ'}を生成
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
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 2 }}>
                  <Typography sx={{ flexGrow: 1 }}>
                    <strong>Q{index + 1}:</strong> {item.question}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingIndex(index);
                      setEditedQuestion(item.question);
                      setEditedAnswer(item.answer);
                    }}
                    sx={{ ml: 1 }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {editingIndex === index ? (
                  <Box sx={{ width: '100%' }}>
                    <TextField
                      fullWidth
                      label="質問"
                      value={editedQuestion}
                      onChange={(e) => setEditedQuestion(e.target.value)}
                      multiline
                      rows={2}
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="回答"
                      value={editedAnswer}
                      onChange={(e) => setEditedAnswer(e.target.value)}
                      multiline
                      rows={4}
                      sx={{ mb: 2 }}
                    />
                    <Stack direction="row" spacing={1}>
                      <Button
                        startIcon={<SaveIcon />}
                        variant="contained"
                        size="small"
                        onClick={() => {
                          const newQuestions = [...questions];
                          newQuestions[index] = {
                            question: editedQuestion,
                            answer: editedAnswer
                          };
                          setQuestions(newQuestions);
                          setEditingIndex(null);
                        }}
                      >
                        保存
                      </Button>
                      <Button
                        startIcon={<CancelIcon />}
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setEditingIndex(null);
                          setEditedQuestion('');
                          setEditedAnswer('');
                        }}
                      >
                        キャンセル
                      </Button>
                    </Stack>
                  </Box>
                ) : (
                  <Typography>
                    <strong>回答:</strong> {item.answer}
                  </Typography>
                )}
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
