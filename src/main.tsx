import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initTheme } from './hooks/useTheme';
import { engine } from './audio/engine';
import { loadSettings } from './storage/showStore';

initTheme();
try {
  engine.setMasterVolume(loadSettings().masterVolume);
} catch {
  /* 설정을 못 읽어도 기본값으로 */
}

// 음원 파일을 끌어다 놓는 곳을 벗어나서 놓아도 브라우저가 그 파일을 열어 앱을 떠나지 않게 한다.
const hasFiles = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');
window.addEventListener('dragover', (e) => {
  if (hasFiles(e) && !e.defaultPrevented) {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'none';
  }
});
window.addEventListener('drop', (e) => {
  if (hasFiles(e) && !e.defaultPrevented) e.preventDefault();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
