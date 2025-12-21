// frontend/src/contexts/ThemeContext.js

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const AppThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const theme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: '#1976d2',
        light: '#42a5f5',
        dark: '#1565c0',
      },
      secondary: {
        main: '#dc004e',
        light: '#ff5983',
        dark: '#9a0036',
      },
      background: {
        default: isDarkMode ? '#0a0a0a' : '#f8f9fa',
        paper: isDarkMode ? '#1a1a1a' : '#ffffff',
      },
    },
    typography: {
      // Reduce all font sizes for more professional look
      h1: {
        fontSize: '1.75rem',
        fontWeight: 600,
        lineHeight: 1.2,
      },
      h2: {
        fontSize: '1.5rem',
        fontWeight: 600,
        lineHeight: 1.3,
      },
      h3: {
        fontSize: '1.25rem',
        fontWeight: 600,
        lineHeight: 1.3,
      },
      h4: {
        fontSize: '1.125rem',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h5: {
        fontSize: '1rem',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h6: {
        fontSize: '0.875rem',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      subtitle1: {
        fontSize: '0.875rem',
        fontWeight: 500,
        lineHeight: 1.4,
      },
      subtitle2: {
        fontSize: '0.8125rem',
        fontWeight: 500,
        lineHeight: 1.4,
      },
      body1: {
        fontSize: '0.8125rem',
        lineHeight: 1.5,
      },
      body2: {
        fontSize: '0.75rem',
        lineHeight: 1.5,
      },
      caption: {
        fontSize: '0.6875rem',
        lineHeight: 1.4,
      },
      overline: {
        fontSize: '0.625rem',
        lineHeight: 1.4,
      },
      button: {
        fontSize: '0.75rem',
        fontWeight: 500,
        textTransform: 'none',
      },
    },
    spacing: (factor) => `${0.5 * factor}rem`, // Reduce spacing by 50%
    shape: {
      borderRadius: 6, // Slightly smaller border radius
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: isDarkMode 
              ? '0 2px 8px rgba(0,0,0,0.3)' 
              : '0 2px 8px rgba(0,0,0,0.1)',
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: '12px 16px', // Reduce padding
            '&:last-child': {
              paddingBottom: '12px',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: isDarkMode 
              ? '0 2px 8px rgba(0,0,0,0.3)' 
              : '0 2px 8px rgba(0,0,0,0.1)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            padding: '6px 16px', // Reduce padding
            minHeight: '32px', // Reduce height
          },
          sizeSmall: {
            padding: '4px 12px',
            minHeight: '28px',
          },
          sizeLarge: {
            padding: '8px 20px',
            minHeight: '40px',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            height: '24px', // Reduce height
            fontSize: '0.6875rem',
          },
          sizeSmall: {
            height: '20px',
            fontSize: '0.625rem',
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            padding: '8px 12px', // Reduce padding
            minHeight: '40px', // Reduce height
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: {
            minWidth: '32px', // Reduce min width
          },
        },
      },
      MuiToolbar: {
        styleOverrides: {
          root: {
            minHeight: '56px', // Reduce toolbar height
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: isDarkMode 
              ? '0 1px 4px rgba(0,0,0,0.3)' 
              : '0 1px 4px rgba(0,0,0,0.1)',
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiInputBase-root': {
              fontSize: '0.8125rem',
            },
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '8px 12px', // Reduce padding
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            fontSize: '0.75rem',
            padding: '6px 12px', // Reduce padding
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 8,
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            padding: '16px 20px', // Reduce padding
            fontSize: '1rem',
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            padding: '12px 20px', // Reduce padding
          },
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: {
            padding: '12px 20px', // Reduce padding
          },
        },
      },
    },
  });

  const value = {
    isDarkMode,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}; 