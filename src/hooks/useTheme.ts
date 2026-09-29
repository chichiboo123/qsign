import { useSyncExternalStore } from 'react';
import { loadSettings, saveSettings, type ThemeChoice } from '../storage/showStore';

export type Theme = 'light' | 'dark';

/**
 * 밝은 화면 / 어두운 화면.
 * 처음에는 컴퓨터 설정을 따르고, 사용자가 고르면 그 값을 기억한다.
 * (index.html의 작은 스크립트가 첫 화면이 번쩍이지 않도록 미리 적용한다)
 */

const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: light)') : null;
const listeners = new Set<() => void>();

function readChoice(): ThemeChoice {
  try {
    return loadSettings().theme;
  } catch {
    return 'system';
  }
}

let choice: ThemeChoice = readChoice();

function resolve(c: ThemeChoice): Theme {
  if (c === 'light' || c === 'dark') return c;
  return media?.matches ? 'light' : 'dark';
}

function apply() {
  const t = resolve(choice);
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#eef1f6' : '#0d1017');
  listeners.forEach((fn) => fn());
}

media?.addEventListener('change', () => {
  if (choice === 'system') apply();
});

export function initTheme() {
  apply();
}

export function setTheme(t: Theme) {
  choice = t;
  try {
    saveSettings({ theme: t });
  } catch {
    /* 저장이 안 돼도 화면은 바꾼다 */
  }
  apply();
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => resolve(choice),
  );
}
