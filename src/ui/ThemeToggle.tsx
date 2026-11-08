import { useLang } from './LangContext';
import { useTheme } from './theme';

/** Single button that flips between light and dark. */
export function ThemeToggle() {
  const { t } = useLang();
  const { theme, setTheme } = useTheme();
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={next === 'dark' ? t.switchToDark : t.switchToLight}
      title={next === 'dark' ? t.switchToDark : t.switchToLight}
      onClick={() => setTheme(next)}
      data-testid="theme-toggle"
      data-theme-current={theme}
    >
      <span aria-hidden>{theme === 'dark' ? '☾' : '☀'}</span>
    </button>
  );
}
