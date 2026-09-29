import { useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';

/**
 * 설치형 웹앱(PWA) 상태: 설치할 수 있는지, 새 버전이 있는지, 오프라인 준비가 됐는지.
 * 새 버전은 공연 중 저절로 바뀌지 않도록 사용자가 [업데이트]를 눌렀을 때만 적용한다.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PwaState {
  /** 브라우저가 설치 창을 띄울 수 있다 (Chrome·Edge·안드로이드) */
  canInstall: boolean;
  /** 이미 앱으로 설치해서 앱 창으로 열려 있다 */
  standalone: boolean;
  needRefresh: boolean;
  offlineReady: boolean;
}

const standaloneQuery = typeof window !== 'undefined' ? window.matchMedia('(display-mode: standalone)') : null;
const isStandalone = () =>
  !!standaloneQuery?.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

let state: PwaState = { canInstall: false, standalone: isStandalone(), needRefresh: false, offlineReady: false };
let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function set(patch: Partial<PwaState>) {
  state = { ...state, ...patch };
  listeners.forEach((fn) => fn());
}

let updateSW: ((reload?: boolean) => Promise<void>) | null = null;

/** 앱 시작 때 한 번 부른다 */
export function initPwa() {
  window.addEventListener('beforeinstallprompt', (e) => {
    // 브라우저 기본 안내 대신 우리 [앱 설치] 버튼으로 띄운다
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    set({ canInstall: true });
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    set({ canInstall: false });
  });
  standaloneQuery?.addEventListener('change', () => set({ standalone: isStandalone() }));

  if (import.meta.env.PROD) {
    updateSW = registerSW({
      onNeedRefresh: () => set({ needRefresh: true }),
      onOfflineReady: () => set({ offlineReady: true }),
    });
  }
}

/** 새 버전으로 바꾸고 다시 연다 */
export function applyUpdate() {
  void updateSW?.(true);
}

export function dismissOfflineReady() {
  set({ offlineReady: false });
}

/** 설치 창 띄우기. 브라우저가 지원하지 않으면 'unavailable' */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable';
  const ev = deferred;
  deferred = null;
  set({ canInstall: false });
  await ev.prompt();
  const { outcome } = await ev.userChoice;
  return outcome;
}

export type Platform = 'ios' | 'android' | 'desktop';

export function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  // 아이패드는 데스크톱처럼 보고하므로 터치 여부로 구분한다
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

export function usePwa(): PwaState {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => state,
  );
}
