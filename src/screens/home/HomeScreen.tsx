import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Copy,
  Download,
  FileUp,
  HardDrive,
  Keyboard,
  Pencil,
  Play,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { Logo } from '../../components/Logo';
import { ThemeToggle } from '../../components/ThemeToggle';
import { useDialog } from '../../components/Dialogs';
import {
  audioIdsOf,
  createShow,
  deleteShow,
  duplicateShow,
  listShows,
  localStorageUsage,
  saveShow,
  StorageFullError,
} from '../../storage/showStore';
import { deleteUnusedAudio, findUnusedAudio, releaseAudio } from '../../storage/cleanup';
import { getEstimate, isPersisted, requestPersist, type StorageEstimateInfo } from '../../storage/quota';
import { listAudioMeta } from '../../storage/audioStore';
import { formatBytes, formatDate } from '../../utils/format';
import { exportShow } from '../../io/exportShow';
import { ImportError, importShow } from '../../io/importShow';
import type { ShowSummary } from '../../types/show';

interface Props {
  onOpen: (showId: string, isNew?: boolean) => void;
  onPerform: (showId: string) => void;
}

/** Chrome·Edge(크로미움)인지. 큐싸인은 이 브라우저들에서 가장 잘 동작한다. 휴대폰·태블릿은 안내하지 않는다. */
function isChromium(): boolean {
  if (/Android|iPhone|iPad|iPod/.test(navigator.userAgent) || navigator.maxTouchPoints > 1) return true;
  const brands = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands;
  if (brands) return brands.some((b) => /Chromium|Google Chrome|Microsoft Edge/.test(b.brand));
  return /Chrome\/|Edg\//.test(navigator.userAgent) && !/OPR\//.test(navigator.userAgent);
}

export function HomeScreen({ onOpen, onPerform }: Props) {
  const { confirm, toast } = useDialog();
  const [shows, setShows] = useState<ShowSummary[]>(() => listShows());
  const [storageKey, setStorageKey] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [zipOver, setZipOver] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    setShows(listShows());
    setStorageKey((k) => k + 1);
  }, []);

  const handleNew = () => {
    try {
      const show = saveShow(createShow(`새 공연 ${formatDate(Date.now())}`));
      onOpen(show.id, true);
    } catch (e) {
      toast(e instanceof StorageFullError ? e.message : '공연을 만들지 못했어요.', 'error');
    }
  };

  const handleDuplicate = (s: ShowSummary) => {
    try {
      const copy = duplicateShow(s.id);
      if (copy) toast(`"${copy.title}"을 만들었어요.`, 'success');
      refresh();
    } catch (e) {
      toast(e instanceof StorageFullError ? e.message : '복제하지 못했어요.', 'error');
    }
  };

  const handleDelete = async (s: ShowSummary) => {
    const ok = await confirm({
      title: '공연을 지울까요?',
      message: (
        <p>
          <strong>{s.title}</strong> 공연과 신호 {s.cueCount}개가 지워져요. 다른 공연에서 쓰지 않는 음원도 함께
          지워지고, <strong>되돌릴 수 없어요.</strong> 필요하면 먼저 [파일로 저장]을 해 두세요.
        </p>
      ),
      confirmLabel: '지우기',
      danger: true,
    });
    if (!ok) return;
    const removed = deleteShow(s.id);
    if (removed) await releaseAudio(audioIdsOf(removed));
    toast('공연을 지웠어요.', 'success');
    refresh();
  };

  const handleExport = async (s: ShowSummary) => {
    setBusy(`"${s.title}"을 파일로 저장하는 중…`);
    try {
      const r = await exportShow(s.id);
      toast(
        r.missing > 0
          ? `${r.fileName} 저장 완료. 찾지 못한 음원 ${r.missing}개는 빠졌어요.`
          : `${r.fileName} (${formatBytes(r.bytes)}) 파일로 저장했어요. 다운로드 폴더를 확인하세요.`,
        r.missing > 0 ? 'error' : 'success',
      );
    } catch {
      toast('파일로 저장하지 못했어요.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleImport = useCallback(
    async (file: File) => {
      setBusy(`"${file.name}" 가져오는 중…`);
      try {
        const r = await importShow(file);
        refresh();
        const note = r.asNew ? ' 같은 공연이 있어서 새 공연으로 가져왔어요.' : '';
        const miss = r.missing > 0 ? ` 음원 ${r.missing}개는 파일 안에 없었어요.` : '';
        toast(`"${r.show.title}"을 가져왔어요. 음원 ${r.audioCount}개.${note}${miss}`, r.missing ? 'error' : 'success');
      } catch (e) {
        toast(
          e instanceof ImportError || e instanceof StorageFullError
            ? e.message
            : '가져오지 못했어요. 저장 공간을 확인해 주세요.',
          'error',
        );
      } finally {
        setBusy(null);
      }
    },
    [refresh, toast],
  );

  // 공연 파일(.zip)을 화면 어디에 끌어다 놓아도 가져온다
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setZipOver(true);
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setZipOver(false);
    };
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'copy';
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setZipOver(false);
      const file = Array.from(e.dataTransfer!.files).find((f) => /\.zip$/i.test(f.name));
      if (file) void handleImport(file);
      else toast('여기에는 큐싸인 공연 파일(.zip)만 놓을 수 있어요. 음원은 공연을 연 다음 넣어요.', 'error');
    };
    document.addEventListener('dragenter', onEnter);
    document.addEventListener('dragleave', onLeave);
    document.addEventListener('dragover', onOver);
    document.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('dragenter', onEnter);
      document.removeEventListener('dragleave', onLeave);
      document.removeEventListener('dragover', onOver);
      document.removeEventListener('drop', onDrop);
    };
  }, [handleImport, toast]);

  const recent = shows[0];
  const chromium = isChromium();

  return (
    <>
      <header className="app-header">
        <Logo height={34} />
        <span className="eyebrow app-header__tag">Stage Sound Console</span>
        <span className="app-header__spacer" />
        <ThemeToggle />
      </header>
      <main className="page">
        {!chromium && (
          <p className="banner banner--warn" role="note">
            <AlertTriangle size={18} aria-hidden="true" /> 큐싸인은 <strong>Chrome</strong>이나 <strong>Edge</strong>에서
            가장 잘 동작해요. 공연 날에는 Chrome이나 Edge로 열어 주세요.
          </p>
        )}
        <div className="bento">
          <section className="panel tile tile--hero">
            <span className="eyebrow">Q-sign · Ready Room</span>
            <h1 className="hero__title">
              신호를 보고,
              <br />
              <span className="gradient-text">소리를 보내요.</span>
            </h1>
            <p className="hero__lead">
              공연에 쓸 노래와 효과음을 순서대로 준비하고, 공연 날에는 <kbd>Space</kbd> 키 하나로 틀어요. 음원은 이
              컴퓨터 안에만 저장돼요.
            </p>
            <div className="tile__actions">
              <button className="btn btn--primary btn--lg" onClick={handleNew}>
                <Plus size={20} aria-hidden="true" /> 새 공연 만들기
              </button>
              <button className="btn btn--lg" onClick={() => importRef.current?.click()} disabled={!!busy}>
                <FileUp size={20} aria-hidden="true" /> 공연 파일 가져오기
              </button>
              <input
                ref={importRef}
                type="file"
                accept=".zip,application/zip"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) void handleImport(f);
                }}
              />
            </div>
            {busy && (
              <p className="banner" role="status">
                {busy}
              </p>
            )}
          </section>

          <section className="panel tile tile--recent">
            <span className="eyebrow">
              <Clock size={13} aria-hidden="true" /> Recent Show · 최근 공연
            </span>
            {recent ? (
              <>
                <h2 className="recent__title">{recent.title}</h2>
                <p className="muted">
                  {recent.sceneCount}개 장 · 신호 {recent.cueCount}개 · {formatDate(recent.updatedAt)} 수정
                </p>
                <div className="tile__actions">
                  <button
                    className="btn btn--primary btn--lg"
                    onClick={() => onPerform(recent.id)}
                    disabled={recent.cueCount === 0}
                  >
                    <Play size={20} aria-hidden="true" /> 공연 모드로 시작
                  </button>
                  <button className="btn btn--lg" onClick={() => onOpen(recent.id)}>
                    <Pencil size={18} aria-hidden="true" /> 이어서 준비하기
                  </button>
                </div>
                {recent.cueCount === 0 && (
                  <p className="field__hint">신호가 없어서 아직 공연을 시작할 수 없어요. [이어서 준비하기]를 눌러 신호를 만들어요.</p>
                )}
              </>
            ) : (
              <div className="empty">
                <Sparkles size={28} aria-hidden="true" />
                <p>
                  아직 공연이 없어요.
                  <br />
                  <strong>[새 공연 만들기]</strong>를 눌러 시작해 보세요.
                </p>
              </div>
            )}
          </section>

          <section className="panel tile tile--list" aria-labelledby="show-list-title">
            <div className="tile__head">
              <span className="eyebrow">Shows · {String(shows.length).padStart(2, '0')}</span>
              <h2 className="tile__title" id="show-list-title">
                공연 목록
              </h2>
            </div>
            {shows.length === 0 ? (
              <div className="first-steps">
                <h3>처음이라면 이렇게 해요</h3>
                <ol className="steps steps--big">
                  <li>
                    <strong>[새 공연 만들기]</strong>를 눌러 공연 이름을 적어요.
                  </li>
                  <li>
                    장을 만들고 <strong>[신호 추가]</strong>를 눌러요. 음원 파일은 끌어다 놓으면 돼요.
                  </li>
                  <li>
                    공연 날에는 <strong>[공연 모드로 시작]</strong>을 누르고, 학생이 <kbd>Space</kbd>로 신호를 보내요.
                  </li>
                </ol>
                <p className="muted small">
                  다른 컴퓨터에서 만든 공연 파일(.zip)이 있으면 <strong>[공연 파일 가져오기]</strong>를 누르거나, 이
                  화면에 끌어다 놓으세요.
                </p>
              </div>
            ) : (
              <ul className="show-list">
                {shows.map((s) => (
                  <li key={s.id} className="show-item">
                    <button className="show-item__main" onClick={() => onOpen(s.id)} title="눌러서 준비하기">
                      <span className="show-item__title">{s.title}</span>
                      <span className="show-item__meta">
                        {s.sceneCount}개 장 · 신호 {s.cueCount}개 · <span className="mono">{formatDate(s.updatedAt)}</span>
                      </span>
                    </button>
                    <div className="show-item__actions">
                      <button
                        className="btn btn--sm btn--primary-soft"
                        onClick={() => onPerform(s.id)}
                        disabled={s.cueCount === 0}
                        title={s.cueCount === 0 ? '신호가 있어야 공연할 수 있어요' : '공연 모드로 시작'}
                      >
                        <Play size={15} aria-hidden="true" /> 공연
                      </button>
                      <button className="btn btn--sm" onClick={() => onOpen(s.id)}>
                        <Pencil size={15} aria-hidden="true" /> 준비
                      </button>
                      <button
                        className="btn btn--sm"
                        onClick={() => handleExport(s)}
                        disabled={!!busy}
                        title="USB로 다른 컴퓨터에 옮길 때"
                      >
                        <Download size={15} aria-hidden="true" /> 파일로 저장
                      </button>
                      <button className="btn btn--sm" onClick={() => handleDuplicate(s)}>
                        <Copy size={15} aria-hidden="true" /> 복제
                      </button>
                      <button className="btn btn--sm btn--ghost btn--danger-text" onClick={() => handleDelete(s)}>
                        <Trash2 size={15} aria-hidden="true" /> 지우기
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <StorageTile refreshKey={storageKey} onChanged={refresh} />

          <section className="panel tile tile--help">
            <span className="eyebrow">
              <Keyboard size={13} aria-hidden="true" /> How to · 사용법
            </span>
            <ol className="steps steps--big">
              <li>공연을 만들고 장을 나눠요.</li>
              <li>신호를 추가하고 음원을 끌어다 놓아요.</li>
              <li>
                <strong>공연 모드</strong>: <kbd>Space</kbd> 다음, <kbd>Esc</kbd> 모두 멈춤, <kbd>←</kbd> 이전
              </li>
              <li>
                다른 컴퓨터로 옮길 때는 <strong>[파일로 저장]</strong> → USB → <strong>[공연 파일 가져오기]</strong>
              </li>
            </ol>
          </section>
        </div>
      </main>
      {zipOver && (
        <div className="zip-drop" aria-hidden="true">
          <FileUp size={40} />
          <p>여기에 놓으면 공연 파일(.zip)을 가져와요</p>
        </div>
      )}
    </>
  );
}

function StorageTile({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
  const { confirm, toast } = useDialog();
  const [est, setEst] = useState<StorageEstimateInfo | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [audio, setAudio] = useState<{ count: number; bytes: number }>({ count: 0, bytes: 0 });
  const [unused, setUnused] = useState<{ count: number; bytes: number }>({ count: 0, bytes: 0 });

  const load = useCallback(async () => {
    const [e, p, list, un] = await Promise.all([getEstimate(), isPersisted(), listAudioMeta(), findUnusedAudio()]);
    setEst(e);
    setPersisted(p);
    setAudio({ count: list.length, bytes: list.reduce((n, m) => n + m.size, 0) });
    setUnused({ count: un.length, bytes: un.reduce((n, m) => n + m.size, 0) });
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  // 브라우저 추정값이 늦게 갱신될 때가 있어 실제 음원 크기와 비교해 큰 값을 보여준다
  const usage = Math.max(est?.usage ?? 0, audio.bytes + localStorageUsage());
  const ratio = est && est.quota > 0 ? Math.min(1, usage / est.quota) : 0;

  const clean = async () => {
    const ok = await confirm({
      title: '안 쓰는 음원을 지울까요?',
      message: <p>어떤 공연에서도 쓰지 않는 음원 {unused.count}개({formatBytes(unused.bytes)})를 지워요.</p>,
      confirmLabel: '지우기',
      danger: true,
    });
    if (!ok) return;
    const r = await deleteUnusedAudio();
    toast(`음원 ${r.count}개를 지웠어요.`, 'success');
    onChanged();
  };

  return (
    <section className="panel tile tile--storage">
      <span className="eyebrow">
        <HardDrive size={13} aria-hidden="true" /> Storage · 저장 공간
      </span>
      <div className="storage__num">
        <span className="mono">{formatBytes(usage)}</span>
        <span className="muted"> 쓰는 중</span>
      </div>
      <div className="meter" role="img" aria-label={`저장 공간 ${Math.round(ratio * 100)}% 사용`}>
        <div className="meter__fill" style={{ width: `${Math.max(1, ratio * 100)}%` }} />
      </div>
      <p className="muted small">
        음원 {audio.count}개 ({formatBytes(audio.bytes)})
        {est && est.quota > 0 && (
          <>
            <br />
            남은 공간 약 {formatBytes(Math.max(0, est.quota - usage))}
          </>
        )}
      </p>
      {persisted ? (
        <p className="storage__ok small">
          <ShieldCheck size={16} aria-hidden="true" /> 음원이 저절로 지워지지 않게 지키는 중
        </p>
      ) : (
        <button
          className="btn btn--sm"
          onClick={async () => {
            const ok = await requestPersist();
            toast(
              ok ? '이제 브라우저가 음원을 저절로 지우지 않아요.' : '브라우저가 요청을 받아 주지 않았어요. 중요한 공연은 파일로 저장해 두세요.',
              ok ? 'success' : 'info',
            );
            void load();
          }}
          title="저장 공간이 모자랄 때 브라우저가 음원을 지우지 않도록 부탁해요"
        >
          <ShieldAlert size={15} aria-hidden="true" /> 음원 지워지지 않게 지키기
        </button>
      )}
      <button className="btn btn--sm" onClick={clean} disabled={unused.count === 0}>
        <Trash2 size={15} aria-hidden="true" />
        {unused.count > 0 ? `안 쓰는 음원 지우기 (${unused.count}개)` : '안 쓰는 음원 없음'}
      </button>
    </section>
  );
}
