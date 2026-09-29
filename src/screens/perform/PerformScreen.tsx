import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight, ChevronLeft, LogOut, Maximize, Play, Square } from 'lucide-react';
import { engine } from '../../audio/engine';
import { preloadAhead, preloadBuffers, runCue } from '../../audio/cueRunner';
import { useVoices } from '../../audio/useEngine';
import { useDialog } from '../../components/Dialogs';
import { Logo } from '../../components/Logo';
import { CueTypeBadge } from '../../components/CueTypeBadge';
import { useAudioLibrary } from '../../hooks/useAudioLibrary';
import { enterFullscreen, exitFullscreen, useBeforeUnload, useWakeLock } from '../../hooks/usePerformGuards';
import { flattenCues } from '../../lib/showOps';
import { loadShow } from '../../storage/showStore';
import { CUE_META } from '../../types/cueMeta';
import type { Show } from '../../types/show';
import { pad2 } from '../../utils/format';
import { NowPlaying } from './NowPlaying';
import { CueListSidebar } from './CueListSidebar';

/** 다음 실행 후 입력을 무시하는 시간 (연타 방지) */
const GO_LOCK_MS = 500;

interface Props {
  showId: string;
  onExit: () => void;
}

export function PerformScreen({ showId, onExit }: Props) {
  const show = useMemo(() => loadShow(showId), [showId]);
  if (!show) {
    return (
      <main className="page">
        <div className="panel tile empty">
          <p>공연을 찾을 수 없어요.</p>
          <button className="btn" onClick={onExit}>
            돌아가기
          </button>
        </div>
      </main>
    );
  }
  return <Perform show={show} onExit={onExit} />;
}

function Perform({ show, onExit }: { show: Show; onExit: () => void }) {
  const { confirm, toast } = useDialog();
  const lib = useAudioLibrary();
  const voices = useVoices();
  const flat = useMemo(() => flattenCues(show), [show]);
  const cues = useMemo(() => flat.map((f) => f.cue), [flat]);
  const lookup = useCallback((id: string) => lib.map.get(id), [lib.map]);

  const [started, setStarted] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [cursor, setCursor] = useState(0);
  const [locked, setLocked] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [stoppingAll, setStoppingAll] = useState(false);
  const lockUntil = useRef(0);
  const cursorRef = useRef(0);
  cursorRef.current = cursor;

  useWakeLock(started);
  useBeforeUnload(true);

  // 효과음과 짧은 음원은 공연 시작 전에 미리 디코딩
  useEffect(() => {
    if (!lib.loaded) return;
    let alive = true;
    void preloadBuffers(cues, lookup, (done, total) => alive && setProgress({ done, total }));
    return () => {
      alive = false;
    };
  }, [lib.loaded, cues, lookup]);

  // 다음 3개 신호의 긴 음원 미리 불러오기
  useEffect(() => {
    if (lib.loaded) preloadAhead(cues, cursor, lookup);
  }, [lib.loaded, cues, cursor, lookup]);

  // 나갈 때 모든 소리 끄기
  useEffect(
    () => () => {
      engine.reset();
      void exitFullscreen();
    },
    [],
  );

  const start = async () => {
    await engine.resume();
    void enterFullscreen();
    setStarted(true);
  };

  const go = useCallback(() => {
    const now = performance.now();
    if (now < lockUntil.current) return;
    const i = cursorRef.current;
    if (i >= cues.length) return;
    lockUntil.current = now + GO_LOCK_MS;
    setLocked(true);
    window.setTimeout(() => setLocked(false), GO_LOCK_MS);
    setPulse((p) => p + 1);
    const cue = cues[i];
    cursorRef.current = i + 1;
    setCursor(i + 1);
    if (!engine.isRunning) void engine.resume();
    const r = runCue(cue, lookup);
    const report = (ok: boolean) => {
      if (!ok) toast(`${pad2(i + 1)}번 신호: 음원이 없어서 소리가 나지 않았어요.`, 'error');
    };
    if (typeof r === 'boolean') report(r);
    else void r.then(report);
  }, [cues, lookup, toast]);

  const prev = useCallback(() => {
    setCursor((c) => Math.max(0, c - 1));
  }, []);

  const stopAll = useCallback(() => {
    const mode = engine.stopAll();
    if (mode === 'fade') {
      setStoppingAll(true);
      window.setTimeout(() => setStoppingAll(false), 2000);
    } else {
      setStoppingAll(false);
    }
  }, []);

  // 키보드: Space = 다음, Esc = 모두 멈춤, ← = 이전
  useEffect(() => {
    const dialogOpen = () => !!document.querySelector('.modal-backdrop');
    const onDown = (e: KeyboardEvent) => {
      if (dialogOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
      if (!started) {
        if (e.code === 'Space' || e.key === 'Enter') {
          e.preventDefault();
          void start();
        }
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) go();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (!e.repeat) stopAll();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      }
    };
    // 버튼에 초점이 있을 때 Space를 떼면 버튼이 한 번 더 눌리는 것을 막는다
    const onUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !dialogOpen()) e.preventDefault();
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
    // start는 렌더마다 새로 만들어지지만 하는 일은 같아서 의존성에서 뺀다
  }, [started, go, stopAll, prev]);

  const exit = async () => {
    const ok = await confirm({
      title: '준비 모드로 돌아갈까요?',
      message: <p>공연 모드를 끝내요. 지금 나오는 소리는 모두 멈춰요.</p>,
      confirmLabel: '준비 모드로',
      danger: true,
    });
    if (ok) onExit();
  };

  const next = flat[cursor];
  const after = flat[cursor + 1];
  const sceneTitle = (next ?? flat[flat.length - 1])?.scene.title ?? '';
  const playingCueIds = useMemo(() => new Set(voices.filter((v) => !v.preview).map((v) => v.cueId)), [voices]);
  const ended = cursor >= flat.length;
  const nextMissing =
    next && ['music', 'sfx', 'bgm'].includes(next.cue.type) && lib.loaded && (!next.cue.audioId || !lib.map.has(next.cue.audioId));

  const loading = progress && progress.done < progress.total;

  return (
    <div className="perform">
      <header className="perform__header">
        <Logo height={26} />
        <span className="perform__scene">{sceneTitle}</span>
        <span className="perform__counter mono">
          <span className="eyebrow">Signal</span> {pad2(Math.min(cursor + 1, flat.length))}
          <span className="muted">/{pad2(flat.length)}</span>
        </span>
        <span className="app-header__spacer" />
        <button className="btn btn--sm btn--ghost" onClick={() => void enterFullscreen()} title="전체 화면">
          <Maximize size={16} aria-hidden="true" />
          <span className="hide-sm">전체 화면</span>
        </button>
        <button className="btn btn--sm" onClick={exit}>
          <LogOut size={16} aria-hidden="true" /> 준비 모드로
        </button>
      </header>

      <div className="perform__body">
        <main className="perform__main">
          <NowPlaying voices={voices} />

          <section
            className={`next panel ${!locked && !ended ? 'is-waiting' : ''}`}
            style={{ '--cue': next ? CUE_META[next.cue.type].color : 'var(--border)' } as CSSProperties}
            aria-live="polite"
          >
            {ended ? (
              <div className="next__end">
                <span className="eyebrow">End of Show</span>
                <p className="next__signal">마지막 신호까지 끝났어요. 수고했어요!</p>
                <p className="muted">
                  <kbd>←</kbd> 키로 앞 신호로 돌아갈 수 있어요.
                </p>
              </div>
            ) : (
              <>
                <div className="next__top">
                  <span className="eyebrow">Next Signal · {pad2(cursor + 1)}</span>
                  {next.scene.title && <span className="next__scene muted">{next.scene.title}</span>}
                </div>
                <p className={`next__signal ${next.cue.signal ? '' : 'is-empty'}`}>
                  {next.cue.signal || '신호 대사가 없어요. 선생님 신호를 보고 누르세요.'}
                </p>
                <div className="next__what">
                  <ArrowRight size={22} aria-hidden="true" className="next__arrow" />
                  <CueTypeBadge type={next.cue.type} size="lg" />
                  <span className="next__label">{next.cue.label || CUE_META[next.cue.type].name}</span>
                  {nextMissing && <span className="warn">음원 없음</span>}
                </div>
                {after && (
                  <p className="next__after muted">
                    그다음 {pad2(cursor + 2)} · {CUE_META[after.cue.type].name} · {after.cue.label || '(이름 없음)'}
                  </p>
                )}
              </>
            )}
          </section>

          <button
            key={pulse}
            className={`go ${locked ? 'is-locked' : ''} ${pulse > 0 ? 'is-pulse' : ''}`}
            onClick={(e) => {
              go();
              e.currentTarget.blur();
            }}
            disabled={ended}
            aria-label="다음 신호 실행 (스페이스바)"
          >
            <Play size={40} fill="currentColor" aria-hidden="true" />
            <span className="go__text">다음</span>
            <kbd className="go__key">SPACE</kbd>
            <span className="go__lock" aria-hidden="true" />
          </button>

          <div className="perform__bottom">
            <button
              className="btn perform__prev"
              onClick={(e) => {
                prev();
                e.currentTarget.blur();
              }}
              disabled={cursor === 0}
            >
              <ChevronLeft size={20} aria-hidden="true" /> 이전 <kbd>←</kbd>
            </button>
            <span className="perform__hint muted small">
              {stoppingAll ? '2초 동안 줄이는 중이에요. 한 번 더 누르면 바로 멈춰요.' : '이전은 소리를 내지 않고 순서만 옮겨요.'}
            </span>
            <button
              className={`btn stop-all ${stoppingAll ? 'is-stopping' : ''}`}
              onClick={(e) => {
                stopAll();
                e.currentTarget.blur();
              }}
            >
              <Square size={18} fill="currentColor" aria-hidden="true" />
              {stoppingAll ? '바로 멈춤' : '모두 멈춤'} <kbd>ESC</kbd>
            </button>
          </div>
        </main>

        <CueListSidebar scenes={show.scenes} flat={flat} cursor={cursor} playingCueIds={playingCueIds} />
      </div>

      {!started && (
        <div className="gate">
          <div className="gate__card panel">
            <span className="eyebrow">Stand By</span>
            <h1 className="gate__title">{show.title}</h1>
            <p className="muted">
              {show.scenes.length}개 장 · 신호 {flat.length}개
            </p>
            <ul className="gate__keys">
              <li>
                <kbd>Space</kbd> 다음 신호
              </li>
              <li>
                <kbd>Esc</kbd> 모두 멈춤
              </li>
              <li>
                <kbd>←</kbd> 이전 (소리 없이)
              </li>
            </ul>
            <button className="btn btn--primary gate__start" onClick={() => void start()} autoFocus>
              <Play size={22} fill="currentColor" aria-hidden="true" /> 공연 시작
            </button>
            <p className="muted small gate__note">
              {loading
                ? `효과음 준비 중… ${progress!.done}/${progress!.total}`
                : '누르면 전체 화면이 돼요. 전체 화면을 나가려면 Esc를 길게 누르세요.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
