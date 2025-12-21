// frontend/src/pages/Login.js

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  alpha,
  useTheme,
  Container,
  Grid,
  Chip,
  Divider
} from '@mui/material';
import {
  Security as SecurityIcon,
  Monitor as MonitorIcon,
  Satellite as SatelliteIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Input as InputIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

function Login() {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, error: authError } = useAuth();
  const theme = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await login(credentials);
    } catch (error) {
      console.error('Login error:', error);
      // Error is already set in AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}
    >
      <Container maxWidth="md">
        <Grid container spacing={4} alignItems="center">
          {/* Left side - Branding and Info */}
          <Grid item xs={12} md={6}>
            <Box sx={{ textAlign: { xs: 'center', md: 'left' }, mb: { xs: 3, md: 0 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', md: 'flex-start' }, mb: 3 }}>
                <Box sx={{ 
                  p: 1.5, 
                  borderRadius: 2, 
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  mr: 2
                }}>
                  <SatelliteIcon sx={{ fontSize: 32, color: 'white' }} />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold" color="primary.main">
                    OHW
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Device Management System
                  </Typography>
                </Box>
              </Box>
              
              <Typography variant="h5" fontWeight="600" gutterBottom sx={{ mb: 2 }}>
                Secure Access Portal
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                Access the comprehensive device monitoring and management platform. 
                Monitor real-time data, track device locations, and manage system configurations.
              </Typography>

              {/* Feature chips */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: { xs: 'center', md: 'flex-start' } }}>
                <Chip 
                  icon={<MonitorIcon />} 
                  label="Real-time Monitoring" 
                  size="small" 
                  variant="outlined" 
                  color="primary"
                />
                <Chip 
                  icon={<SecurityIcon />} 
                  label="Secure Access" 
                  size="small" 
                  variant="outlined" 
                  color="primary"
                />
                <Chip 
                  icon={<SatelliteIcon />} 
                  label="Device Tracking" 
                  size="small" 
                  variant="outlined" 
                  color="primary"
                />
              </Box>
            </Box>
          </Grid>

          {/* Right side - Login Form */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={8}
              sx={{ 
                p: 3,
                borderRadius: 3,
                background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.95)} 100%)`,
                backdropFilter: 'blur(10px)',
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
              }}
            >
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Box sx={{ 
                  p: 1.5, 
                  borderRadius: 2, 
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  display: 'inline-flex',
                  mb: 2
                }}>
                  <LockIcon color="primary" sx={{ fontSize: 28 }} />
                </Box>
                <Typography variant="h6" fontWeight="600" gutterBottom>
                  Authentication Required
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Please enter your credentials to access the system
                </Typography>
              </Box>

              {authError && (
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 2, 
                    borderRadius: 2,
                    '& .MuiAlert-icon': {
                      fontSize: '1.2rem'
                    }
                  }}
                >
                  {authError}
                </Alert>
              )}

              <form onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Username"
                  margin="normal"
                  value={credentials.username}
                  onChange={(e) => setCredentials({
                    ...credentials,
                    username: e.target.value
                  })}
                  disabled={isSubmitting}
                  required
                  InputProps={{
                    startAdornment: <InputIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.palette.primary.main,
                      },
                    }
                  }}
                />
                
                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  margin="normal"
                  value={credentials.password}
                  onChange={(e) => setCredentials({
                    ...credentials,
                    password: e.target.value
                  })}
                  disabled={isSubmitting}
                  required
                  InputProps={{
                    startAdornment: <LockIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />,
                    endAdornment: (
                      <Button
                        onClick={togglePasswordVisibility}
                        sx={{ 
                          minWidth: 'auto', 
                          p: 0.5,
                          color: 'text.secondary',
                          '&:hover': {
                            backgroundColor: 'transparent',
                            color: theme.palette.primary.main
                          }
                        }}
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </Button>
                    )
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: theme.palette.primary.main,
                      },
                    }
                  }}
                />

                <Button
                  fullWidth
                  variant="contained"
                  type="submit"
                  disabled={isSubmitting}
                  sx={{ 
                    mt: 3, 
                    mb: 2,
                    py: 1.5,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                    }
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                      Authenticating...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>

              <Divider sx={{ my: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Secure Connection
                </Typography>
              </Divider>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  © 2024 OHW Device Management System. All rights reserved.
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default Login;
