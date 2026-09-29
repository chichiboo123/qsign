import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// 배포 경로는 VITE_BASE 환경변수 하나로 바꾼다.
// 기본값: GitHub Pages 프로젝트 주소(https://chichiboo123.github.io/qsign/)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE || '/qsign/';
  return {
    base,
    plugins: [react()],
    build: {
      target: 'es2020',
      chunkSizeWarningLimit: 800,
    },
  };
});
