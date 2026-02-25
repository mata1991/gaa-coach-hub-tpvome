
import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  textOnPrimary: string;
  textOnSecondary: string;
}

interface ThemeContextType {
  colors: ThemeColors;
  updateTheme: (primaryColor: string, secondaryColor: string, accentColor?: string | null) => Promise<void>;
  resetTheme: () => Promise<void>;
  isCustomTheme: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'app_theme_colors';

// Default monochrome theme
const defaultThemeColors: ThemeColors = {
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
  textOnPrimary: '#ffffff',
  textOnSecondary: '#000000',
};

/**
 * Calculate relative luminance (WCAG formula)
 * Returns value between 0 (black) and 1 (white)
 */
function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  
  const [r, g, b] = rgb.map(val => {
    const normalized = val / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : null;
}

/**
 * Get contrasting text color (black or white) for a background
 */
function textFor(hex: string): string {
  const luminance = getLuminance(hex);
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Generate theme colors from team colors
 */
function generateThemeColors(
  primaryColor: string,
  secondaryColor: string,
  accentColor?: string | null
): ThemeColors {
  console.log('[Theme] Generating theme colors:', { primaryColor, secondaryColor, accentColor });
  
  const textOnPrimary = textFor(primaryColor);
  const textOnSecondary = textFor(secondaryColor);
  
  return {
    primary: primaryColor,
    secondary: secondaryColor,
    accent: accentColor || primaryColor,
    background: '#ffffff',
    backgroundAlt: '#f5f5f5',
    text: '#000000',
    textSecondary: '#666666',
    card: '#ffffff',
    highlight: '#f5f5f5',
    border: '#e0e0e0',
    success: primaryColor,
    warning: '#ff9800',
    danger: '#dc3545',
    error: '#dc3545',
    errorBackground: '#FEE',
    textOnPrimary,
    textOnSecondary,
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colors, setColors] = useState<ThemeColors>(defaultThemeColors);
  const [isCustomTheme, setIsCustomTheme] = useState(false);

  // Load saved theme on mount
  useEffect(() => {
    loadSavedTheme();
  }, []);

  const loadSavedTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme) {
        const parsed = JSON.parse(savedTheme);
        console.log('[Theme] Loaded saved theme:', parsed);
        const themeColors = generateThemeColors(
          parsed.primaryColor,
          parsed.secondaryColor,
          parsed.accentColor
        );
        setColors(themeColors);
        setIsCustomTheme(true);
      } else {
        console.log('[Theme] No saved theme, using default');
      }
    } catch (error) {
      console.error('[Theme] Failed to load saved theme:', error);
    }
  };

  const updateTheme = async (
    primaryColor: string,
    secondaryColor: string,
    accentColor?: string | null
  ) => {
    console.log('[Theme] Updating theme:', { primaryColor, secondaryColor, accentColor });
    
    try {
      // Save to storage
      await AsyncStorage.setItem(
        THEME_STORAGE_KEY,
        JSON.stringify({ primaryColor, secondaryColor, accentColor })
      );
      
      // Update state
      const themeColors = generateThemeColors(primaryColor, secondaryColor, accentColor);
      setColors(themeColors);
      setIsCustomTheme(true);
      
      console.log('[Theme] Theme updated successfully');
    } catch (error) {
      console.error('[Theme] Failed to update theme:', error);
    }
  };

  const resetTheme = async () => {
    console.log('[Theme] Resetting to default theme');
    
    try {
      await AsyncStorage.removeItem(THEME_STORAGE_KEY);
      setColors(defaultThemeColors);
      setIsCustomTheme(false);
      console.log('[Theme] Theme reset successfully');
    } catch (error) {
      console.error('[Theme] Failed to reset theme:', error);
    }
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
