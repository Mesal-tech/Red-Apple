import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const THEME_STORAGE_KEY = 'app_dark_mode';

export const lightTheme = {
  isDark: false,
  background: '#F8F9FA',
  card: '#FFFFFF',
  cardBorder: '#F1F5F9',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  divider: '#F3F4F6',
  subtleSurface: '#F8FAFC',
  modalBg: '#FFFFFF',
  inputBg: '#F8FAFC',
  inputBorder: '#E2E8F0',
  skeleton: '#E2E8F0',
  statusBar: 'dark-content',
};

export const darkTheme = {
  isDark: true,
  background: '#141817',
  card: '#202624',
  cardBorder: '#35403D',
  divider: '#303936',
  textPrimary: '#FFFFFF',
  textSecondary: '#B8C1BE',
  textMuted: '#89938F',
  subtleSurface: '#1B211F',
  modalBg: '#202624',
  inputBg: '#202624',
  inputBorder: '#3B4743',
  skeleton: '#303936',
  destructive: '#CE3C38',
  statusBar: 'light-content',
};

const ThemeContext = createContext({
  isDarkMode: false,
  theme: lightTheme,
  setDarkMode: () => {},
  toggleDarkMode: () => {},
});

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadStoredTheme() {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored !== null) {
          setIsDarkMode(stored === 'true');
        }
      } catch (e) {
        console.warn('[ThemeContext] Failed to load stored dark mode setting:', e);
      } finally {
        setIsLoaded(true);
      }
    }
    loadStoredTheme();
  }, []);

  const setDarkMode = useCallback(async (value) => {
    setIsDarkMode(Boolean(value));
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, value ? 'true' : 'false');
    } catch (e) {
      console.warn('[ThemeContext] Failed to persist dark mode setting:', e);
    }
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(!isDarkMode);
  }, [isDarkMode, setDarkMode]);

  const theme = isDarkMode ? darkTheme : lightTheme;

  const contextValue = {
    isDarkMode,
    theme,
    setDarkMode,
    toggleDarkMode,
    isLoaded,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      isDarkMode: false,
      theme: lightTheme,
      setDarkMode: () => {},
      toggleDarkMode: () => {},
      isLoaded: true,
    };
  }
  return context;
}

export default ThemeContext;
