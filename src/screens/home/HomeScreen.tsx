import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Clock,
  Copy,
  Download,
  FileUp,
  FolderOpen,
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
  onOpen: (showId: string) => void;
  onPerform: (showId: string) => void;
}

export function HomeScreen({ onOpen, onPerform }: Props) {
  const { confirm, toast } = useDialog();
  const [shows, setShows] = useState<ShowSummary[]>(() => listShows());
  const [storageKey, setStorageKey] = useState(0);

  const refresh = useCallback(() => {
    setShows(listShows());
    setStorageKey((k) => k + 1);
  }, []);

  const handleNew = () => {
    try {
      const show = saveShow(createShow(`새 공연 ${formatDate(Date.now())}`));
      onOpen(show.id);
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
          지워지고, 되돌릴 수 없어요.
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

  const importRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const handleExport = async (s: ShowSummary) => {
    setBusy(`"${s.title}" 내보내는 중…`);
    try {
      const r = await exportShow(s.id);
      toast(
        r.missing > 0
          ? `${r.fileName} 저장 완료. 찾지 못한 음원 ${r.missing}개는 빠졌어요.`
          : `${r.fileName} (${formatBytes(r.bytes)}) 파일로 저장했어요.`,
        r.missing > 0 ? 'error' : 'success',
      );
    } catch {
      toast('내보내지 못했어요.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleImport = async (file: File) => {
    setBusy(`"${file.name}" 가져오는 중…`);
    try {
      const r = await importShow(file);
      refresh();
      const note = r.asNew ? ' 같은 공연이 있어서 새 공연으로 가져왔어요.' : '';
      const miss = r.missing > 0 ? ` 음원 ${r.missing}개는 파일 안에 없었어요.` : '';
      toast(`"${r.show.title}"을 가져왔어요. 음원 ${r.audioCount}개.${note}${miss}`, r.missing ? 'error' : 'success');
    } catch (e) {
      toast(
        e instanceof ImportError || e instanceof StorageFullError ? e.message : '가져오지 못했어요. 저장 공간을 확인해 주세요.',
        'error',
      );
    } finally {
      setBusy(null);
    }
  };

  const recent = shows[0];

  return (
    <>
      <header className="app-header">
        <Logo height={34} />
        <span className="eyebrow app-header__tag">Stage Sound Console</span>
      </header>
      <main className="page">
        <div className="bento">
          <section className="panel tile tile--hero">
            <span className="eyebrow">Q-sign · Ready Room</span>
            <h1 className="hero__title">
              신호를 보고,
              <br />
              <span className="gradient-text">소리를 보내요.</span>
            </h1>
            <p className="muted">
              공연에 쓸 노래와 효과음을 순서대로 준비하고, 공연 날에는 <kbd>Space</kbd> 키 하나로 틀어요. 음원은 이
              컴퓨터 안에만 저장돼요.
            </p>
            <div className="tile__actions">
              <button className="btn btn--primary" onClick={handleNew}>
                <Plus size={18} aria-hidden="true" /> 새 공연 만들기
              </button>
              <button className="btn" onClick={() => importRef.current?.click()} disabled={!!busy}>
                <FileUp size={18} aria-hidden="true" /> 공연 파일 가져오기
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
              <Clock size={12} aria-hidden="true" /> Recent Show
            </span>
            {recent ? (
              <>
                <h2 className="recent__title">{recent.title}</h2>
                <p className="muted">
                  {recent.sceneCount}개 장 · 신호 {recent.cueCount}개 · {formatDate(recent.updatedAt)} 수정
                </p>
                <div className="tile__actions">
                  <button className="btn btn--primary" onClick={() => onPerform(recent.id)} disabled={recent.cueCount === 0}>
                    <Play size={18} aria-hidden="true" /> 공연 모드로 시작
                  </button>
                  <button className="btn" onClick={() => onOpen(recent.id)}>
                    <Pencil size={16} aria-hidden="true" /> 이어서 준비하기
                  </button>
                </div>
              </>
            ) : (
              <div className="empty">
                <Sparkles size={28} aria-hidden="true" />
                <p>아직 공연이 없어요. 왼쪽에서 새 공연을 만들어 보세요.</p>
              </div>
            )}
          </section>

          <section className="panel tile tile--list" aria-labelledby="show-list-title">
            <div className="tile__head">
              <span className="eyebrow" id="show-list-title">
                Shows · {String(shows.length).padStart(2, '0')}
              </span>
              <h2 className="tile__title">공연 목록</h2>
            </div>
            {shows.length === 0 ? (
              <div className="empty">
                <FolderOpen size={28} aria-hidden="true" />
                <p>공연이 여기에 모여요.</p>
              </div>
            ) : (
              <ul className="show-list">
                {shows.map((s) => (
                  <li key={s.id} className="show-item">
                    <button className="show-item__main" onClick={() => onOpen(s.id)}>
                      <span className="show-item__title">{s.title}</span>
                      <span className="show-item__meta">
                        {s.sceneCount}개 장 · 신호 {s.cueCount}개 · <span className="mono">{formatDate(s.updatedAt)}</span>
                      </span>
                    </button>
                    <div className="show-item__actions">
                      <button
                        className="btn btn--sm"
                        onClick={() => onPerform(s.id)}
                        disabled={s.cueCount === 0}
                        title="공연 모드로 시작"
                      >
                        <Play size={15} aria-hidden="true" /> 공연
                      </button>
                      <button className="btn btn--sm btn--icon" onClick={() => onOpen(s.id)} title="준비하기" aria-label={`${s.title} 준비하기`}>
                        <Pencil size={15} />
                      </button>
                      <button
                        className="btn btn--sm btn--icon"
                        onClick={() => handleExport(s)}
                        disabled={!!busy}
                        title="파일로 내보내기 (USB로 옮길 때)"
                        aria-label={`${s.title} 파일로 내보내기`}
                      >
                        <Download size={15} />
                      </button>
                      <button className="btn btn--sm btn--icon" onClick={() => handleDuplicate(s)} title="복제" aria-label={`${s.title} 복제`}>
                        <Copy size={15} />
                      </button>
                      <button className="btn btn--sm btn--icon" onClick={() => handleDelete(s)} title="지우기" aria-label={`${s.title} 지우기`}>
                        <Trash2 size={15} />
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
              <Keyboard size={12} aria-hidden="true" /> How to
            </span>
            <ol className="steps">
              <li>공연을 만들고 장을 나눠요.</li>
              <li>신호를 추가하고 음원을 끌어다 놓아요.</li>
              <li>
                <strong>공연 모드</strong>에서 <kbd>Space</kbd> = 다음, <kbd>Esc</kbd> = 모두 멈춤, <kbd>←</kbd> = 이전
              </li>
              <li>
                다른 컴퓨터로 옮길 때는 <Download size={13} aria-label="내보내기" /> 로 파일을 저장해 USB로 옮기고, 거기서
                <strong> 공연 파일 가져오기</strong>를 눌러요.
              </li>
            </ol>
          </section>
        </div>
      </main>
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
      message: <p>어떤 신호에서도 쓰지 않는 음원 {unused.count}개({formatBytes(unused.bytes)})를 지워요.</p>,
      confirmLabel: '정리하기',
      danger: true,
    });
    if (!ok) return;
    const r = await deleteUnusedAudio();
    toast(`음원 ${r.count}개를 정리했어요.`, 'success');
    onChanged();
  };

  return (
    <section className="panel tile tile--storage">
      <span className="eyebrow">
        <HardDrive size={12} aria-hidden="true" /> Storage
      </span>
      <div className="storage__num">
        <span className="mono">{formatBytes(usage)}</span>
        <span className="muted"> 사용 중</span>
      </div>
      <div className="meter" role="img" aria-label={`저장 공간 ${Math.round(ratio * 100)}% 사용`}>
        <div className="meter__fill" style={{ width: `${Math.max(1, ratio * 100)}%` }} />
      </div>
      <p className="muted small">
        음원 {audio.count}개 · {formatBytes(audio.bytes)}
        {est && est.quota > 0 && <> · 쓸 수 있는 공간 {formatBytes(est.quota)}</>}
      </p>
      {persisted ? (
        <p className="storage__ok small">
          <ShieldCheck size={15} aria-hidden="true" /> 브라우저가 음원을 지우지 않도록 보관 중
        </p>
      ) : (
        <button
          className="btn btn--sm"
          onClick={async () => {
            const ok = await requestPersist();
            toast(ok ? '보관을 허락받았어요.' : '브라우저가 보관 요청을 받아 주지 않았어요.', ok ? 'success' : 'info');
            void load();
          }}
        >
          <ShieldAlert size={15} aria-hidden="true" /> 음원 계속 보관 요청
        </button>
      )}
      <button className="btn btn--sm" onClick={clean} disabled={unused.count === 0}>
        <Trash2 size={15} aria-hidden="true" /> 안 쓰는 음원 정리 {unused.count > 0 && `(${unused.count}개)`}
      </button>
    </section>
  );
}
