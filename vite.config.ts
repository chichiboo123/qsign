import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// 배포 경로는 VITE_BASE 환경변수 하나로 바꾼다.
// 기본값 './'(상대 경로): 커스텀 도메인(https://qsign.chichiboo.link/)과
// GitHub Pages 프로젝트 주소(https://chichiboo123.github.io/qsign/) 어느 쪽에서 열어도 동작한다.
// (URL 라우터를 쓰지 않고 index.html 한 장이라 상대 경로로 충분하다)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE || './';
  return {
    base,
    plugins: [react()],
    build: {
      target: 'es2020',
      chunkSizeWarningLimit: 800,
    },
  };
});
