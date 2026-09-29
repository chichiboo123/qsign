import { Moon, Sun } from 'lucide-react';
import { setTheme, useTheme } from '../hooks/useTheme';

/** 밝게 / 어둡게 고르기 */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useTheme();
  return (
    <div className={`theme-toggle ${compact ? 'is-compact' : ''}`} role="group" aria-label="화면 밝기">
      <button
        type="button"
        className={theme === 'light' ? 'is-on' : ''}
        aria-pressed={theme === 'light'}
        onClick={(e) => {
          setTheme('light');
          e.currentTarget.blur();
        }}
        title="밝은 화면"
      >
        <Sun size={16} aria-hidden="true" />
        <span className="theme-toggle__text">밝게</span>
      </button>
      <button
        type="button"
        className={theme === 'dark' ? 'is-on' : ''}
        aria-pressed={theme === 'dark'}
        onClick={(e) => {
          setTheme('dark');
          e.currentTarget.blur();
        }}
        title="어두운 화면"
      >
        <Moon size={16} aria-hidden="true" />
        <span className="theme-toggle__text">어둡게</span>
      </button>
    </div>
  );
}
