
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
}

interface ThemeContextType {
  colors: ThemeColors;
  updateTheme: (primaryColor: string, secondaryColor: string) => Promise<void>;
  resetTheme: () => Promise<void>;
  isCustomTheme: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@gaa_coach_hub_theme';

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

function lightenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const [r, g, b] = rgb.map(val => {
    const lightened = Math.round(val + (255 - val) * (percent / 100));
    return Math.min(255, lightened);
  });
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function isValidHex(hex: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(hex);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colors, setColors] = useState<ThemeColors>(defaultColors);
  const [isCustomTheme, setIsCustomTheme] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (storedTheme) {
        const { primaryColor, secondaryColor } = JSON.parse(storedTheme);
        console.log('[Theme] Loaded cached theme:', { primaryColor, secondaryColor });
        applyTheme(primaryColor, secondaryColor);
      }
    } catch (error) {
      console.error('[Theme] Error loading theme:', error);
    }
  };

  const applyTheme = (primaryColor: string, secondaryColor: string) => {
    if (!isValidHex(primaryColor) || !isValidHex(secondaryColor)) {
      console.warn('[Theme] Invalid hex colors, using defaults');
      return;
    }

    console.log('[Theme] Applying theme:', { primaryColor, secondaryColor });

    const newColors: ThemeColors = {
      ...defaultColors,
      primary: primaryColor,
      secondary: secondaryColor,
      accent: secondaryColor,
      success: primaryColor,
      highlight: lightenColor(secondaryColor, 80),
    };

    setColors(newColors);
    setIsCustomTheme(true);
  };

  const updateTheme = async (primaryColor: string, secondaryColor: string) => {
    console.log('[Theme] Updating theme:', { primaryColor, secondaryColor });
    
    applyTheme(primaryColor, secondaryColor);
    
    try {
      await AsyncStorage.setItem(
        THEME_STORAGE_KEY,
        JSON.stringify({ primaryColor, secondaryColor })
      );
      console.log('[Theme] Theme cached successfully');
    } catch (error) {
      console.error('[Theme] Error caching theme:', error);
    }
  };

  const resetTheme = async () => {
    console.log('[Theme] Resetting to default theme');
    setColors(defaultColors);
    setIsCustomTheme(false);
    
    try {
      await AsyncStorage.removeItem(THEME_STORAGE_KEY);
    } catch (error) {
      console.error('[Theme] Error removing cached theme:', error);
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
