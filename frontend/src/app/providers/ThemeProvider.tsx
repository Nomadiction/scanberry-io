import { createContext, useContext, useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme;
    return stored || 'system';
  });

  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    let resolvedTheme: 'light' | 'dark';

    if (theme === 'system') {
      const telegramTheme = WebApp.colorScheme;
      resolvedTheme = telegramTheme === 'dark' ? 'dark' : 'light';
    } else {
      resolvedTheme = theme;
    }

    root.classList.add(resolvedTheme);
    setActualTheme(resolvedTheme);
    localStorage.setItem('theme', theme);

    // Sync Telegram native header & background colors with the app theme
    try {
      const headerColor = resolvedTheme === 'dark' ? '#030712' : '#FFFFFF';
      const bgColor = resolvedTheme === 'dark' ? '#030712' : '#FFFFFF';
      WebApp.setHeaderColor(headerColor as `#${string}`);
      WebApp.setBackgroundColor(bgColor as `#${string}`);
    } catch {
      // Not supported in older WebApp versions
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, actualTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
