import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'matrix' | 'cyberpunk' | 'darkmatter' | 'solarflare';

interface ThemeColors {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

const themes: Record<Theme, ThemeColors> = {
  matrix: {
    primary: '142 71% 45%', // Green
    primaryForeground: '0 0% 98%',
    secondary: '142 31% 20%',
    secondaryForeground: '142 71% 45%',
    background: '0 0% 3%',
    foreground: '142 71% 85%',
    muted: '142 31% 15%',
    mutedForeground: '142 41% 60%',
    accent: '142 71% 45%',
    accentForeground: '0 0% 98%',
    destructive: '0 84% 60%',
    destructiveForeground: '0 0% 98%',
    border: '142 31% 20%',
    input: '142 31% 20%',
    ring: '142 71% 45%'
  },
  cyberpunk: {
    primary: '322 100% 60%', // Neon pink
    primaryForeground: '0 0% 0%',
    secondary: '199 100% 50%', // Cyan
    secondaryForeground: '0 0% 0%',
    background: '240 10% 3%',
    foreground: '322 100% 85%',
    muted: '240 10% 15%',
    mutedForeground: '322 50% 70%',
    accent: '199 100% 50%',
    accentForeground: '0 0% 0%',
    destructive: '0 84% 60%',
    destructiveForeground: '0 0% 98%',
    border: '322 50% 30%',
    input: '240 10% 20%',
    ring: '322 100% 60%'
  },
  darkmatter: {
    primary: '270 100% 65%', // Deep purple
    primaryForeground: '0 0% 98%',
    secondary: '270 50% 30%',
    secondaryForeground: '270 100% 80%',
    background: '270 20% 5%',
    foreground: '270 50% 90%',
    muted: '270 20% 15%',
    mutedForeground: '270 30% 65%',
    accent: '270 100% 65%',
    accentForeground: '0 0% 98%',
    destructive: '0 84% 60%',
    destructiveForeground: '0 0% 98%',
    border: '270 30% 25%',
    input: '270 20% 20%',
    ring: '270 100% 65%'
  },
  solarflare: {
    primary: '35 100% 50%', // Orange
    primaryForeground: '0 0% 0%',
    secondary: '45 100% 50%', // Yellow
    secondaryForeground: '0 0% 0%',
    background: '20 10% 4%',
    foreground: '35 100% 80%',
    muted: '20 10% 15%',
    mutedForeground: '35 50% 65%',
    accent: '45 100% 50%',
    accentForeground: '0 0% 0%',
    destructive: '0 84% 60%',
    destructiveForeground: '0 0% 98%',
    border: '35 50% 25%',
    input: '20 10% 20%',
    ring: '35 100% 50%'
  }
};

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('lexos-theme') as Theme;
    return savedTheme || 'matrix';
  });

  const applyTheme = (themeName: Theme) => {
    const root = document.documentElement;
    const colors = themes[themeName];
    
    // Apply CSS variables
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
    
    // Add theme class to body
    document.body.className = `theme-${themeName}`;
    
    // Save to localStorage
    localStorage.setItem('lexos-theme', themeName);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    const themeNames = Object.keys(themes) as Theme[];
    const currentIndex = themeNames.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeNames.length;
    setTheme(themeNames[nextIndex]);
  };

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for theme toggle events
  useEffect(() => {
    const handleToggleTheme = () => toggleTheme();
    window.addEventListener('toggle-theme', handleToggleTheme);
    return () => window.removeEventListener('toggle-theme', handleToggleTheme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Theme metadata for UI
export const themeMetadata: Record<Theme, { name: string; description: string; color: string }> = {
  matrix: {
    name: 'Matrix',
    description: 'Classic green terminal aesthetic',
    color: '#10b981'
  },
  cyberpunk: {
    name: 'Cyberpunk',
    description: 'Neon pink and cyan vibes',
    color: '#ff0080'
  },
  darkmatter: {
    name: 'Dark Matter',
    description: 'Deep purple cosmic theme',
    color: '#a855f7'
  },
  solarflare: {
    name: 'Solar Flare',
    description: 'Warm orange and yellow tones',
    color: '#f97316'
  }
};