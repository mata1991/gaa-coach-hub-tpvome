
import React, { createContext, useContext, ReactNode } from 'react';
import { colors as defaultColors } from '@/styles/commonStyles';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  backgroundAlt: string;
  text: string;
  textSecondary: string;
  card: string;
  highlight: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  error: string;
  errorBackground: string;
}

interface ThemeContextType {
  colors: ThemeColors;
  updateTheme: (primaryColor: string, secondaryColor: string) => Promise<void>;
  resetTheme: () => Promise<void>;
  isCustomTheme: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Monochrome theme - black and white only
const monochromeColors: ThemeColors = {
  primary: '#000000',
  secondary: '#ffffff',
  accent: '#000000',
  background: '#ffffff',
  backgroundAlt: '#f5f5f5',
  text: '#000000',
  textSecondary: '#666666',
  card: '#ffffff',
  highlight: '#f5f5f5',
  border: '#e0e0e0',
  success: '#000000',
  warning: '#000000',
  danger: '#dc3545',
  error: '#dc3545',
  errorBackground: '#FEE',
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always use monochrome theme - ignore club colors
  const colors = monochromeColors;
  const isCustomTheme = false;

  // No-op functions for compatibility
  const updateTheme = async (primaryColor: string, secondaryColor: string) => {
    console.log('[Theme] Monochrome theme active - ignoring color update:', { primaryColor, secondaryColor });
  };

  const resetTheme = async () => {
    console.log('[Theme] Monochrome theme active - already using default');
  };

  return (
    <ThemeContext.Provider value={{ colors, updateTheme, resetTheme, isCustomTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeColors() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeColors must be used within ThemeProvider');
  }
  return context;
}
