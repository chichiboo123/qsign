import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/screens.css';
import { useEffect, useState } from 'react';
import { requestPersistOnce } from './storage/quota';
import { DialogProvider } from './components/Dialogs';
import { Footer } from './components/Footer';
import { HomeScreen } from './screens/home/HomeScreen';
import { EditorScreen } from './screens/editor/EditorScreen';
import { PerformScreen } from './screens/perform/PerformScreen';

/**
 * GitHub Pages에서 새로고침해도 404가 나지 않도록 URL 라우터를 쓰지 않고
 * 앱 안의 상태로 화면을 바꾼다.
 */
export type View = { name: 'home' } | { name: 'editor'; showId: string } | { name: 'perform'; showId: string };

export default function App() {
  const [view, setView] = useState<View>({ name: 'home' });

  useEffect(() => {
    // 브라우저가 음원을 자동으로 지우지 않도록 보관 요청 (첫 실행 때 한 번)
    void requestPersistOnce();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('is-perform', view.name === 'perform');
    window.scrollTo(0, 0);
  }, [view]);

  return (
    <DialogProvider>
      <div className="aurora" aria-hidden="true" />
      {view.name === 'home' && (
        <HomeScreen
          onOpen={(showId) => setView({ name: 'editor', showId })}
          onPerform={(showId) => setView({ name: 'perform', showId })}
        />
      )}
      {view.name === 'editor' && (
        <EditorScreen
          key={view.showId}
          showId={view.showId}
          onBack={() => setView({ name: 'home' })}
          onPerform={() => setView({ name: 'perform', showId: view.showId })}
        />
      )}
      {view.name === 'perform' && (
        <PerformScreen
          key={view.showId}
          showId={view.showId}
          onExit={() => setView({ name: 'editor', showId: view.showId })}
        />
      )}
      {view.name !== 'perform' && <Footer />}
    </DialogProvider>
  );
}
