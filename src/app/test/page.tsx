'use client';

import { useState, useEffect } from 'react';
import { Box, Button, Typography, Container, Paper, TextField } from '@mui/material';

export default function TestPage() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState('');

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://api.stg.qa-maching.livepass-aiagent.com/api/spaces/nev_test/site_plugin.js';
    script.onload = () => {
      if (typeof window.onload === 'function') {
        window.onload(new Event('load'));
      }
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <>
      <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        テストページ
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          カウンター
        </Typography>
        <Typography variant="h3" sx={{ mb: 2, textAlign: 'center' }}>
          {count}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button variant="contained" onClick={() => setCount(count + 1)}>
            +1
          </Button>
          <Button variant="outlined" onClick={() => setCount(count - 1)}>
            -1
          </Button>
          <Button variant="text" onClick={() => setCount(0)}>
            リセット
          </Button>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          テキスト入力
        </Typography>
        <TextField
          fullWidth
          label="何か入力してください"
          value={text}
          onChange={(e) => setText(e.target.value)}
          sx={{ mb: 2 }}
        />
        {text && (
          <Typography variant="body1">
            入力内容: {text}
          </Typography>
        )}
      </Paper>
    </Container>
    </>
  );
}
