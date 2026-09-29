import { useEffect } from 'react';

/** 화면 꺼짐 방지 (Wake Lock). 탭이 다시 보이면 다시 요청한다. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        const s = await navigator.wakeLock.request('screen');
        if (cancelled) void s.release();
        else sentinel = s;
      } catch {
        /* 배터리 절약 모드 등에서는 거절될 수 있다 */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void acquire();
    };
    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void sentinel?.release();
    };
  }, [active]);
}

/** 창 닫기·새로고침 경고 */
export function useBeforeUnload(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      return '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [active]);
}

interface KeyboardLock {
  lock?: (keys?: string[]) => Promise<void>;
  unlock?: () => void;
}
const keyboardApi = () => (navigator as Navigator & { keyboard?: KeyboardLock }).keyboard;

/**
 * 전체 화면으로 바꾼다. Chrome·Edge에서는 Esc 키를 앱이 받도록 잠근다
 * (Esc = 모두 멈춤. 전체 화면을 나가려면 Esc를 길게 누른다).
 */
export async function enterFullscreen(): Promise<void> {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    await keyboardApi()?.lock?.(['Escape']);
  } catch {
    /* 전체 화면이 막힌 환경에서도 공연은 계속된다 */
  }
}

export async function exitFullscreen(): Promise<void> {
  try {
    keyboardApi()?.unlock?.();
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch {
    /* 무시 */
  }
}
