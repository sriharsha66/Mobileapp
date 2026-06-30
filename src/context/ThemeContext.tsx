import React, { createContext, useContext, useState, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const themeKey = (userId: string) => `@medvault_theme_${userId}`;

export interface AppTheme {
  mode: 'light' | 'dark';
  bg: string;
  surface: string;
  inputBg: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  primaryLight: string;
  primary: string;
  statusBar: 'light-content' | 'dark-content';
  tabBg: string;
  tabBorder: string;
  divider: string;
}

export const LIGHT: AppTheme = {
  mode: 'light',
  bg: '#F5F7FA',
  surface: '#FFFFFF',
  inputBg: '#FAFAFA',
  text: '#212121',
  textSecondary: '#616161',
  textMuted: '#9E9E9E',
  border: '#E0E0E0',
  primaryLight: '#E3F2FD',
  primary: '#1565C0',
  statusBar: 'dark-content',
  tabBg: '#FFFFFF',
  tabBorder: '#E0E0E0',
  divider: '#F0F0F0',
};

export const DARK: AppTheme = {
  mode: 'dark',
  bg: '#0F0F0F',
  surface: '#1C1C1C',
  inputBg: '#252525',
  text: '#F0F0F0',
  textSecondary: '#AAAAAA',
  textMuted: '#666666',
  border: '#2E2E2E',
  primaryLight: '#142A4A',
  primary: '#1565C0',
  statusBar: 'light-content',
  tabBg: '#1C1C1C',
  tabBorder: '#2E2E2E',
  divider: '#252525',
};

interface ThemeCtx {
  theme: AppTheme;
  isDark: boolean;
  toggleTheme: () => void;
  loadThemeForUser: (userId: string | null) => Promise<void>;
}

const Ctx = createContext<ThemeCtx>({
  theme: LIGHT,
  isDark: false,
  toggleTheme: () => {},
  loadThemeForUser: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  async function loadThemeForUser(userId: string | null) {
    if (!userId) {
      setIsDark(false);
      setCurrentUserId(null);
      return;
    }
    setCurrentUserId(userId);
    try {
      const v = await AsyncStorage.getItem(themeKey(userId));
      setIsDark(v === 'dark');
    } catch {
      setIsDark(false);
    }
  }

  const value = useMemo(() => ({
    theme: isDark ? DARK : LIGHT,
    isDark,
    toggleTheme: () => {
      setIsDark(prev => {
        const next = !prev;
        if (currentUserId) {
          AsyncStorage.setItem(themeKey(currentUserId), next ? 'dark' : 'light');
        }
        return next;
      });
    },
    loadThemeForUser,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [isDark, currentUserId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() { return useContext(Ctx); }
