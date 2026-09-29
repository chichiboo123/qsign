import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// 배포 경로는 VITE_BASE 환경변수 하나로 바꾼다.
// 기본값 './'(상대 경로): 커스텀 도메인(https://qsign.chichiboo.link/)과
// GitHub Pages 프로젝트 주소(https://chichiboo123.github.io/qsign/) 어느 쪽에서 열어도 동작한다.
// (URL 라우터를 쓰지 않고 index.html 한 장이라 상대 경로로 충분하다)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE || './';
  return {
    base,
    plugins: [
      react(),
      // 설치형 웹앱(PWA): PC·휴대폰에 앱으로 설치하고, 인터넷 없이도 실행된다.
      VitePWA({
        // 공연 중에 저절로 새로고침되지 않도록, 새 버전은 사용자가 [업데이트]를 눌렀을 때만 적용한다
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
        manifest: {
          id: './',
          name: '큐싸인 Q-sign',
          short_name: '큐싸인',
          description: '신호를 보고 소리를 보내는 초등 공연 음향 재생기',
          lang: 'ko',
          start_url: './',
          scope: './',
          display: 'standalone',
          display_override: ['window-controls-overlay', 'standalone'],
          orientation: 'any',
          background_color: '#0d1017',
          theme_color: '#0d1017',
          categories: ['education', 'music', 'utilities'],
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // 앱 화면·글꼴·아이콘을 모두 저장해 두어 인터넷 없이도 열린다 (음원은 IndexedDB에 따로 있음)
          globPatterns: ['**/*.{js,css,html,svg,png,woff2,webmanifest}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          navigateFallback: null,
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    build: {
      target: 'es2020',
      chunkSizeWarningLimit: 800,
    },
  };
});
