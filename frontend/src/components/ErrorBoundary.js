// frontend/src/components/ErrorBoundary.js

import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    const message = error?.message || '';
    const isChunkLoadError = error?.name === 'ChunkLoadError'
      || /Loading chunk [\d]+ failed/.test(message);

    if (isChunkLoadError) {
      const reloadKey = 'chunk_reload_attempt';
      const lastAttempt = Number(sessionStorage.getItem(reloadKey) || '0');
      const now = Date.now();
      // Auto-reload once after deploy when cached main.js points at removed chunks
      if (now - lastAttempt > 5000) {
        sessionStorage.setItem(reloadKey, String(now));
        window.location.reload();
        return { hasError: false, error: null };
      }
    }

    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to error tracking service
    // In production, this should send to error tracking service (e.g., Sentry)
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }
    // TODO: Integrate with error tracking service (Sentry, LogRocket, etc.)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
          }}
        >
          <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>
              Something went wrong
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </Typography>
            {/Loading chunk [\d]+ failed/.test(this.state.error?.message || '') && (
              <Typography color="text.secondary" sx={{ mb: 2, fontSize: '0.875rem' }}>
                This usually happens right after an upgrade when the browser still has an old app bundle.
                Reload once with Ctrl+F5, or ask an admin to run a fresh frontend build on the server.
              </Typography>
            )}
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={() => window.location.reload()}
            >
              Reload Page
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
