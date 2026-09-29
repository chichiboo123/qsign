import './styles/fonts.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/screens.css';
import './styles/perform.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { requestPersistOnce } from './storage/quota';
import { DialogProvider } from './components/Dialogs';
import { Footer } from './components/Footer';
import { HomeScreen } from './screens/home/HomeScreen';
import { EditorScreen } from './screens/editor/EditorScreen';
import { PerformScreen, REQUEST_EXIT_EVENT } from './screens/perform/PerformScreen';

/**
 * GitHub Pages에서 새로고침해도 404가 나지 않도록 URL 라우터를 쓰지 않고
 * 앱 안의 상태로 화면을 바꾼다. 브라우저 "뒤로" 버튼은 history state로 앱 안에서 처리한다.
 */
export type View =
  | { name: 'home' }
  | { name: 'editor'; showId: string; isNew?: boolean }
  | { name: 'perform'; showId: string };

function isView(v: unknown): v is View {
  const n = (v as View | null)?.name;
  return n === 'home' || n === 'editor' || n === 'perform';
}

export default function App() {
  const [view, setView] = useState<View>({ name: 'home' });
  const viewRef = useRef(view);
  viewRef.current = view;

  const go = useCallback((next: View, replace = false) => {
    if (replace) history.replaceState({ qsign: next }, '');
    else history.pushState({ qsign: next }, '');
    setView(next);
  }, []);

  useEffect(() => {
    // 브라우저가 음원을 자동으로 지우지 않도록 보관 요청 (첫 실행 때 한 번)
    void requestPersistOnce();
    history.replaceState({ qsign: { name: 'home' } }, '');
    const onPop = (e: PopStateEvent) => {
      const target = (e.state as { qsign?: unknown } | null)?.qsign;
      if (viewRef.current.name === 'perform') {
        // 공연 중에는 바로 나가지 않고 확인을 받는다
        history.pushState({ qsign: viewRef.current }, '');
        window.dispatchEvent(new Event(REQUEST_EXIT_EVENT));
        return;
      }
      let next: View = isView(target) ? target : { name: 'home' };
      // "뒤로"로는 공연 모드에 다시 들어가지 않는다
      if (next.name === 'perform') next = { name: 'editor', showId: next.showId };
      if (next.name === 'editor') next = { ...next, isNew: false };
      const cur = viewRef.current;
      // 같은 화면 기록이 겹쳐 있으면 한 번 더 뒤로 간다
      if (next.name !== 'home' && next.name === cur.name && 'showId' in cur && cur.showId === next.showId) {
        history.back();
        return;
      }
      setView(next);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('is-perform', view.name === 'perform');
    // 첫 화면은 한 화면(머리줄~푸터)에 딱 맞춘다
    document.documentElement.classList.toggle('is-home', view.name === 'home');
    window.scrollTo(0, 0);
  }, [view]);

  return (
    <DialogProvider>
      <div className="aurora" aria-hidden="true" />
      {view.name === 'home' && (
        <HomeScreen
          onOpen={(showId, isNew) => go({ name: 'editor', showId, isNew })}
          onPerform={(showId) => go({ name: 'perform', showId })}
        />
      )}
      {view.name === 'editor' && (
        <EditorScreen
          key={view.showId}
          showId={view.showId}
          isNew={view.isNew}
          onBack={() => go({ name: 'home' })}
          onPerform={() => go({ name: 'perform', showId: view.showId })}
        />
      )}
      {view.name === 'perform' && (
        <PerformScreen
          key={view.showId}
          showId={view.showId}
          onExit={() => go({ name: 'editor', showId: view.showId }, true)}
        />
      )}
      {view.name !== 'perform' && <Footer />}
    </DialogProvider>
  );
}
