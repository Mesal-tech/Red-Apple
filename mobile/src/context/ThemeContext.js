import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, useColorScheme } from 'react-native';

export const THEME_STORAGE_KEY = '@red_apple_theme_preference';

export const lightTheme = {
  isDark: false,
  background: '#F8F9FA',
  backgroundSecondary: '#FFFFFF',
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
  background: '#101010',
  backgroundSecondary: '#1B1B1B',
  card: '#1B1B1B',
  cardBorder: '#333333',
  divider: '#2A2A2A',
  textPrimary: '#FFFFFF',
  textSecondary: '#B3B3B3',
  textMuted: '#858585',
  subtleSurface: '#202020',
  modalBg: '#1B1B1B',
  inputBg: '#202020',
  inputBorder: '#3A3A3A',
  skeleton: '#303030',
  destructive: '#CE3C38',
  statusBar: 'light-content',
};

const initialSystemDark = Appearance.getColorScheme() === 'dark';

const ThemeContext = createContext({
  isDarkMode: initialSystemDark,
  isDark: initialSystemDark,
  theme: initialSystemDark ? darkTheme : lightTheme,
  themeMode: 'system',
  useSystemTheme: true,
  systemColorScheme: initialSystemDark ? 'dark' : 'light',
  setThemeMode: () => { },
  setDarkMode: () => { },
  setUseSystemTheme: () => { },
  toggleDarkMode: () => { },
  isLoaded: true,
});

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState('system');
  const [isLoaded, setIsLoaded] = useState(false);
  const effectiveSystemScheme = systemColorScheme ?? Appearance.getColorScheme() ?? 'light';
  const effectiveSystemDark = effectiveSystemScheme === 'dark';
  const isDarkMode = themeMode === 'system' ? effectiveSystemDark : themeMode === 'dark';
  const theme = isDarkMode ? darkTheme : lightTheme;

  useEffect(() => {
    async function loadStoredTheme() {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') {
          setThemeMode(stored);
        } else {
          setThemeMode('system');
        }
      } catch (e) {
        console.warn('[ThemeContext] Failed to load stored dark mode setting:', e);
      } finally {
        setIsLoaded(true);
      }
    }
    loadStoredTheme();
  }, []);

  const setThemeModeAsync = useCallback(async (mode) => {
    if (mode !== 'system' && mode !== 'light' && mode !== 'dark') return;
    setThemeMode(mode);
    try {
      if (mode === 'system') {
        await AsyncStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      }
    } catch (e) {
      console.warn('[ThemeContext] Failed to persist theme setting:', e);
    }
  }, []);

  const setDarkMode = useCallback(async (value) => {
    const nextMode = value ? 'dark' : 'light';
    await setThemeModeAsync(nextMode);
  }, [setThemeModeAsync]);

  const setUseSystemTheme = useCallback(async (useSystem) => {
    const nextMode = useSystem ? 'system' : ((systemColorScheme ?? Appearance.getColorScheme()) === 'dark' ? 'dark' : 'light');
    await setThemeModeAsync(nextMode);
  }, [systemColorScheme, setThemeModeAsync]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(!isDarkMode);
  }, [isDarkMode, setDarkMode]);

  const contextValue = {
    isDarkMode,
    isDark: isDarkMode,
    theme,
    themeMode,
    useSystemTheme: themeMode === 'system',
    systemColorScheme: effectiveSystemScheme,
    setThemeMode: setThemeModeAsync,
    setDarkMode,
    setUseSystemTheme,
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
    const isDark = Appearance.getColorScheme() === 'dark';
    return {
      isDarkMode: isDark,
      isDark,
      theme: isDark ? darkTheme : lightTheme,
      themeMode: 'system',
      useSystemTheme: true,
      systemColorScheme: isDark ? 'dark' : 'light',
      setThemeMode: () => { },
      setDarkMode: () => { },
      setUseSystemTheme: () => { },
      toggleDarkMode: () => { },
      isLoaded: true,
    };
  }
  return context;
}

export default ThemeContext;
