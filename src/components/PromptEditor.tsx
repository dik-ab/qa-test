'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import RestoreIcon from '@mui/icons-material/Restore';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';

interface PromptEditorProps {
  onPromptChange: (prompt: string) => void;
  defaultPrompt: string;
}

export default function PromptEditor({ onPromptChange, defaultPrompt }: PromptEditorProps) {
  const [open, setOpen] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(defaultPrompt);
  const [isCustom, setIsCustom] = useState(false);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSave = () => {
    onPromptChange(currentPrompt);
    setIsCustom(currentPrompt !== defaultPrompt);
    setOpen(false);
  };

  const handleRestore = () => {
    setCurrentPrompt(defaultPrompt);
    onPromptChange(defaultPrompt);
    setIsCustom(false);
  };

  const handlePromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentPrompt(event.target.value);
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Tooltip title="プロンプトを編集">
          <Button
            variant={isCustom ? "contained" : "outlined"}
            color={isCustom ? "secondary" : "primary"}
            startIcon={<EditIcon />}
            onClick={handleOpen}
            size="small"
          >
            プロンプト編集
          </Button>
        </Tooltip>
        
        {isCustom && (
          <Tooltip title="デフォルトプロンプトに戻す">
            <IconButton
              onClick={handleRestore}
              color="primary"
              size="small"
            >
              <RestoreIcon />
            </IconButton>
          </Tooltip>
        )}
        
        {isCustom && (
          <Typography variant="caption" color="secondary" sx={{ fontWeight: 'bold' }}>
            カスタムプロンプト使用中
          </Typography>
        )}
      </Box>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { height: '80vh' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">プロンプト編集</Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              プロンプトを編集して、質問生成の方法をカスタマイズできます。
              <code>{'${text}'}</code> と <code>{'${numQuestions}'}</code> は自動的に置換されます。
            </Alert>
            
            <TextField
              fullWidth
              multiline
              rows={20}
              value={currentPrompt}
              onChange={handlePromptChange}
              variant="outlined"
              placeholder="プロンプトを入力してください..."
              sx={{
                '& .MuiInputBase-input': {
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  lineHeight: 1.5
                }
              }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="caption" color="text.secondary">
              利用可能な変数:
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', px: 0.5, borderRadius: 0.5 }}>
              {'${text}'}
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', px: 0.5, borderRadius: 0.5 }}>
              {'${numQuestions}'}
            </Typography>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleRestore} startIcon={<RestoreIcon />}>
            デフォルトに戻す
          </Button>
          <Button onClick={handleClose}>
            キャンセル
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            startIcon={<SaveIcon />}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
