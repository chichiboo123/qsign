import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CircleHelp, FileUp, FolderOpen, HardDrive, Plus } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { ThemeToggle } from '../../components/ThemeToggle';
import { HelpModal } from '../../components/HelpModal';
import { useDialog } from '../../components/Dialogs';
import {
  audioIdsOf,
  createShow,
  deleteShow,
  duplicateShow,
  listShows,
  saveShow,
  StorageFullError,
} from '../../storage/showStore';
import { releaseAudio } from '../../storage/cleanup';
import { formatBytes, formatDate } from '../../utils/format';
import { exportShow } from '../../io/exportShow';
import { ImportError, importShow } from '../../io/importShow';
import type { ShowSummary } from '../../types/show';
import { ShowRow } from './ShowRow';
import { StorageModal } from './StorageModal';

interface Props {
  onOpen: (showId: string, isNew?: boolean) => void;
  onPerform: (showId: string) => void;
}

/** 컴퓨터에서 Chrome·Edge(크로미움)가 아닌지. 휴대폰·태블릿은 안내하지 않는다. */
function needsBrowserNotice(): boolean {
  if (/Android|iPhone|iPad|iPod/.test(navigator.userAgent) || navigator.maxTouchPoints > 1) return false;
  const brands = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands;
  if (brands) return !brands.some((b) => /Chromium|Google Chrome|Microsoft Edge/.test(b.brand));
  return !(/Chrome\/|Edg\//.test(navigator.userAgent) && !/OPR\//.test(navigator.userAgent));
}

export function HomeScreen({ onOpen, onPerform }: Props) {
  const { confirm, toast } = useDialog();
  const [shows, setShows] = useState<ShowSummary[]>(() => listShows());
  const [busy, setBusy] = useState<string | null>(null);
  const [zipOver, setZipOver] = useState(false);
  const [modal, setModal] = useState<'help' | 'storage' | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => setShows(listShows()), []);

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

  return (
    <>
      <header className="app-header">
        <Logo height={34} />
        <span className="app-header__spacer" />
        <button className="btn btn--sm btn--ghost header-btn" onClick={() => setModal('help')} aria-label="사용법">
          <CircleHelp size={18} aria-hidden="true" />
          <span className="header-btn__text">사용법</span>
        </button>
        <button className="btn btn--sm btn--ghost header-btn" onClick={() => setModal('storage')} aria-label="저장 공간">
          <HardDrive size={18} aria-hidden="true" />
          <span className="header-btn__text">저장 공간</span>
        </button>
        <ThemeToggle />
      </header>

      <main className="page home">
        {needsBrowserNotice() && (
          <p className="banner banner--warn" role="note">
            <AlertTriangle size={18} aria-hidden="true" /> 큐싸인은 <strong>Chrome</strong>이나 <strong>Edge</strong>에서
            가장 잘 동작해요.
          </p>
        )}

        <section className="home__hero">
          <h1 className="hero__title">
            신호를 보고, <span className="gradient-text">소리를 보내요.</span>
          </h1>
          <div className="home__actions">
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

        <section className="home__list panel" aria-labelledby="show-list-title">
          <h2 className="home__list-title" id="show-list-title">
            내 공연 <span className="muted mono">{shows.length}</span>
          </h2>
          {shows.length === 0 ? (
            <div className="empty">
              <FolderOpen size={32} aria-hidden="true" />
              <p>
                아직 공연이 없어요.
                <br />
                <strong>[새 공연 만들기]</strong>로 시작해 보세요.
              </p>
              <button className="btn btn--sm btn--ghost" onClick={() => setModal('help')}>
                <CircleHelp size={16} aria-hidden="true" /> 처음이라면 사용법 보기
              </button>
            </div>
          ) : (
            <ul className="show-list">
              {shows.map((s, i) => (
                <ShowRow
                  key={s.id}
                  show={s}
                  recent={i === 0 && shows.length > 1}
                  busy={!!busy}
                  onOpen={() => onOpen(s.id)}
                  onPerform={() => onPerform(s.id)}
                  onExport={() => void handleExport(s)}
                  onDuplicate={() => handleDuplicate(s)}
                  onDelete={() => void handleDelete(s)}
                />
              ))}
            </ul>
          )}
        </section>
      </main>

      {modal === 'help' && <HelpModal onClose={() => setModal(null)} />}
      {modal === 'storage' && <StorageModal onClose={() => setModal(null)} onChanged={refresh} />}

      {zipOver && (
        <div className="zip-drop" aria-hidden="true">
          <FileUp size={40} />
          <p>여기에 놓으면 공연 파일(.zip)을 가져와요</p>
        </div>
      )}
    </>
  );
}
