/** 윈도우 프로그램(Electron)에서 실행 중일 때만 있는 기능. 웹 브라우저에서는 undefined */
export interface QsignDesktop {
  isDesktop: true;
  setFullScreen: (on: boolean) => Promise<boolean>;
  isFullScreen: () => Promise<boolean>;
  preventSleep: (on: boolean) => Promise<void>;
  onFullScreenChange: (cb: (on: boolean) => void) => () => void;
}

export const desktop: QsignDesktop | undefined =
  typeof window !== 'undefined' ? (window as Window & { qsignDesktop?: QsignDesktop }).qsignDesktop : undefined;

export const isDesktopApp = !!desktop;
