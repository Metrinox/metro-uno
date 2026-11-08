import { useCallback, useState } from 'react';

export type Theme = 'light' | 'dark';
export const THEMES: readonly Theme[] = ['light', 'dark'];
export const THEME_KEY = 'metro-uno.theme';

/** Browser chrome colour per theme; matches --bg in styles.css. */
const THEME_COLOR: Record<Theme, string> = { light: '#f3f1ec', dark: '#15181c' };

/** Reads the saved theme; returns null when none is saved or storage fails. */
export function loadTheme(storage: () => Storage | undefined = () => globalThis.localStorage): Theme | null {
  try {
    const raw = storage()?.getItem(THEME_KEY);
    return raw === 'light' || raw === 'dark' ? raw : null;
  } catch {
    return null;
  }
}

/** Saves the theme; storage failures are ignored. */
export function saveTheme(theme: Theme, storage: () => Storage | undefined = () => globalThis.localStorage): void {
  try {
    storage()?.setItem(THEME_KEY, theme);
  } catch {
    /* storage unavailable: the theme just isn't remembered */
  }
}

function systemTheme(): Theme {
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** The theme in effect: the one on <html data-theme>, else the system preference. */
export function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme;
  return set === 'light' || set === 'dark' ? set : systemTheme();
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', THEME_COLOR[theme]));
}

/** Current theme and a setter that applies and remembers it. */
export function useTheme(): { theme: Theme; setTheme: (theme: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>(currentTheme);
  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);
    saveTheme(next);
    setThemeState(next);
  }, []);
  return { theme, setTheme };
}
