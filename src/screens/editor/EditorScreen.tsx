import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { ArrowLeft, CheckCircle2, MousePointerClick, Pencil, Play, Plus } from 'lucide-react';
import { useDialog } from '../../components/Dialogs';
import { Logo } from '../../components/Logo';
import { ThemeToggle } from '../../components/ThemeToggle';
import { createCue, createScene, loadShow, saveShow, StorageFullError } from '../../storage/showStore';
import { addAudioFile } from '../../storage/audioStore';
import { releaseAudio } from '../../storage/cleanup';
import { useAudioLibrary } from '../../hooks/useAudioLibrary';
import { engine } from '../../audio/engine';
import { playableOf } from '../../audio/cueRunner';
import { useVoices } from '../../audio/useEngine';
import {
  addCue,
  baseName,
  findCue,
  flattenCues,
  moveCue,
  moveScene,
  removeCue,
  removeScene,
  updateCue,
  updateScene,
} from '../../lib/showOps';
import { CUE_META } from '../../types/cueMeta';
import { cueHasAudio, type Cue, type CueType, type Show } from '../../types/show';
import { pad2 } from '../../utils/format';
import { SceneBlock } from './SceneBlock';
import { CueInspector } from './CueInspector';
import { CueRow } from './CueRow';

interface Props {
  showId: string;
  /** 방금 만든 공연이면 제목 칸에 바로 초점 */
  isNew?: boolean;
  onBack: () => void;
  onPerform: () => void;
}

export function EditorScreen({ showId, isNew, onBack, onPerform }: Props) {
  const initial = useMemo(() => loadShow(showId), [showId]);
  if (!initial) {
    return (
      <main className="page">
        <div className="panel tile empty">
          <p>공연을 찾을 수 없어요.</p>
          <button className="btn" onClick={onBack}>
            공연 목록으로
          </button>
        </div>
      </main>
    );
  }
  return <Editor initial={initial} isNew={!!isNew} onBack={onBack} onPerform={onPerform} />;
}

function Editor({
  initial,
  isNew,
  onBack,
  onPerform,
}: {
  initial: Show;
  isNew: boolean;
  onBack: () => void;
  onPerform: () => void;
}) {
  const { confirm, toast } = useDialog();
  const lib = useAudioLibrary();
  const voices = useVoices();

  const [show, setShowState] = useState<Show>(initial);
  const showRef = useRef(show);
  const [selectedId, setSelectedId] = useState<string | null>(initial.scenes[0]?.cues[0]?.id ?? null);
  const [uploadingCueId, setUploadingCueId] = useState<string | null>(null);
  const [bulkUploading, setBulkUploading] = useState(0);
  /** 새로 만든 신호: 이름 칸에 초점을 주고 목록에서 보이게 스크롤 */
  const [freshCueId, setFreshCueId] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const sideRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isNew) {
      titleRef.current?.focus();
      titleRef.current?.select();
    }
  }, [isNew]);

  /** 화면만 바꾸기 (드래그 중) */
  const setLocal = useCallback((next: Show) => {
    showRef.current = next;
    setShowState(next);
  }, []);

  /** 바꾸고 바로 저장하기 */
  const mutate = useCallback(
    (fn: (s: Show) => Show): Show | null => {
      const next = fn(showRef.current);
      try {
        const saved = saveShow(next);
        setLocal(saved);
        setSavedAt(Date.now());
        return saved;
      } catch (e) {
        toast(e instanceof StorageFullError ? e.message : '저장하지 못했어요.', 'error');
        return null;
      }
    },
    [setLocal, toast],
  );

  // 화면을 떠나면 미리 듣기 멈춤
  useEffect(() => () => engine.stopPreview(), []);

  const flat = useMemo(() => flattenCues(show), [show]);
  const selected = selectedId ? flat.find((f) => f.cue.id === selectedId) : undefined;
  const targets = useMemo(() => flat.filter((f) => cueHasAudio(f.cue.type)), [flat]);
  const previewVoiceOf = useMemo(
    () => new Map(voices.filter((v) => v.preview).map((v) => [v.cueId, v.id])),
    [voices],
  );
  const previewingIds = useMemo(() => new Set(previewVoiceOf.keys()), [previewVoiceOf]);

  // 새 신호가 목록에서 보이게
  useEffect(() => {
    if (!freshCueId) return;
    const row = document.querySelector('.cue-row.is-selected');
    row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [freshCueId]);

  /** 신호 고르기. 좁은 화면에서는 설정 패널이 목록 아래에 있으므로 그쪽으로 옮겨 준다 */
  const selectCue = (cueId: string) => {
    setSelectedId(cueId);
    setFreshCueId(null);
    if (window.matchMedia('(max-width: 980px)').matches) {
      requestAnimationFrame(() => sideRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
    }
  };

  const cueLabel = useCallback(
    (cueId: string) => {
      const f = flat.find((x) => x.cue.id === cueId);
      return f ? `${pad2(f.index + 1)} ${f.cue.label || CUE_META[f.cue.type].name}` : undefined;
    },
    [flat],
  );

  // ─── 음원 ───

  const rejectFiles = (names: string[]) => {
    toast(`mp3, wav, m4a 파일만 넣을 수 있어요: ${names.join(', ')}`, 'error');
  };

  const release = async (ids: (string | undefined)[]) => {
    const list = ids.filter((x): x is string => !!x);
    if (!list.length) return;
    await releaseAudio(list);
    list.forEach((id) => engine.forget(id));
  };

  const setCueAudio = async (cueId: string, file: File) => {
    setUploadingCueId(cueId);
    try {
      const meta = await addAudioFile(file);
      lib.add(meta);
      const old = findCue(showRef.current, cueId)?.cue;
      const saved = mutate((s) =>
        updateCue(s, cueId, { audioId: meta.id, label: old?.label || baseName(file.name) }),
      );
      if (!saved) await release([meta.id]);
      else if (old?.audioId && old.audioId !== meta.id) await release([old.audioId]);
    } catch {
      toast('음원을 저장하지 못했어요. 저장 공간을 확인해 주세요.', 'error');
    } finally {
      setUploadingCueId(null);
    }
  };

  const removeCueAudio = async (cueId: string) => {
    const old = findCue(showRef.current, cueId)?.cue.audioId;
    engine.stopPreview();
    if (mutate((s) => updateCue(s, cueId, { audioId: undefined }))) await release([old]);
  };

  /** 장에 파일 여러 개를 끌어다 놓으면 파일마다 신호를 만든다. */
  const dropFilesOnScene = async (sceneId: string, files: File[]) => {
    setBulkUploading(files.length);
    let made = 0;
    let lastId: string | null = null;
    for (const file of files) {
      try {
        const meta = await addAudioFile(file);
        lib.add(meta);
        const type: CueType = meta.duration > 0 && meta.duration <= 30 ? 'sfx' : 'music';
        const cue = createCue(type, { label: baseName(file.name), audioId: meta.id });
        if (mutate((s) => addCue(s, sceneId, cue))) {
          made++;
          lastId = cue.id;
        } else {
          await release([meta.id]);
          break;
        }
      } catch {
        toast(`"${file.name}"을 저장하지 못했어요.`, 'error');
      }
      setBulkUploading((n) => n - 1);
    }
    setBulkUploading(0);
    if (made) {
      toast(`신호 ${made}개를 만들었어요.`, 'success');
      setSelectedId(lastId);
    }
  };

  // ─── 신호 ───

  const addNewCue = (sceneId: string, type: CueType) => {
    // 줄이기·멈춤은 이름을 미리 붙여 둔다
    const cue = createCue(type, { label: cueHasAudio(type) ? '' : CUE_META[type].name });
    // 선택한 신호가 이 장에 있으면 그 아래에 넣는다
    const after = selected && selected.scene.id === sceneId ? selected.cue.id : undefined;
    if (mutate((s) => addCue(s, sceneId, cue, after))) {
      setSelectedId(cue.id);
      setFreshCueId(cue.id);
    }
  };

  const duplicateCue = (cue: Cue) => {
    const f = findCue(showRef.current, cue.id);
    if (!f) return;
    const copy: Cue = { ...cue, id: createCue(cue.type).id };
    if (mutate((s) => addCue(s, f.scene.id, copy, cue.id))) {
      setSelectedId(copy.id);
      setFreshCueId(copy.id);
      toast('같은 신호를 바로 아래에 하나 더 만들었어요.', 'success');
    }
  };

  const changeCue = (cueId: string, patch: Partial<Cue>) => {
    mutate((s) => updateCue(s, cueId, patch));
  };

  const changeType = async (cue: Cue, type: CueType) => {
    if (type === cue.type) return;
    if (cue.audioId && !cueHasAudio(type)) {
      const ok = await confirm({
        title: `"${CUE_META[type].name}"으로 바꿀까요?`,
        message: <p>이 종류는 음원을 쓰지 않아서, 넣어 둔 음원이 빠져요.</p>,
        confirmLabel: '바꾸기',
      });
      if (!ok) return;
      engine.stopPreview();
      const old = cue.audioId;
      if (mutate((s) => updateCue(s, cue.id, { type, audioId: undefined, fadeOut: type === 'fade' ? 3 : cue.fadeOut })))
        await release([old]);
      return;
    }
    const patch: Partial<Cue> = { type };
    if (type === 'fade' && cue.fadeOut <= 0) patch.fadeOut = 3;
    if (!(type === 'fade' || type === 'stop')) patch.targetCueId = undefined;
    changeCue(cue.id, patch);
  };

  const deleteCue = async (cue: Cue) => {
    const usedAsTarget = flat.filter((f) => f.cue.targetCueId === cue.id).length;
    const ok = await confirm({
      title: '신호를 지울까요?',
      message: (
        <p>
          <strong>{cue.label || CUE_META[cue.type].name}</strong> 신호를 지워요.
          {usedAsTarget > 0 && <> 이 소리를 줄이거나 멈추던 신호 {usedAsTarget}개는 "전체 소리"를 대상으로 바뀌어요.</>}
        </p>
      ),
      confirmLabel: '지우기',
      danger: true,
    });
    if (!ok) return;
    engine.stopPreview();
    const i = flat.findIndex((f) => f.cue.id === cue.id);
    if (mutate((s) => removeCue(s, cue.id))) {
      await release([cue.audioId]);
      const rest = flat.filter((f) => f.cue.id !== cue.id);
      setSelectedId(rest[Math.min(i, rest.length - 1)]?.cue.id ?? null);
    }
  };

  const preview = async (cueId: string) => {
    const f = findCue(showRef.current, cueId);
    if (!f) return;
    const wasPlaying = previewingIds.has(cueId);
    engine.stopPreview();
    if (wasPlaying) return;
    await engine.resume();
    const audio = playableOf(f.cue, (id) => lib.map.get(id));
    if (!audio) {
      toast('먼저 음원을 넣어 주세요.', 'info');
      return;
    }
    const id = await engine.play(f.cue, audio, { preview: true });
    if (!id) toast('이 음원을 재생할 수 없어요.', 'error');
  };

  // ─── 장 ───

  const addScene = () => {
    const scene = createScene(`${show.scenes.length + 1}장`);
    mutate((s) => ({ ...s, scenes: [...s.scenes, scene] }));
  };

  const deleteScene = async (sceneId: string) => {
    const scene = show.scenes.find((s) => s.id === sceneId);
    if (!scene) return;
    if (scene.cues.length > 0) {
      const ok = await confirm({
        title: '장을 지울까요?',
        message: (
          <p>
            <strong>{scene.title || '이름 없는 장'}</strong>과 안에 있는 신호 {scene.cues.length}개가 모두 지워져요.
          </p>
        ),
        confirmLabel: '지우기',
        danger: true,
      });
      if (!ok) return;
    }
    engine.stopPreview();
    if (mutate((s) => removeScene(s, sceneId))) {
      await release(scene.cues.map((c) => c.audioId));
      if (selected?.scene.id === sceneId) setSelectedId(null);
    }
  };

  // ─── 끌어서 옮기기 ───

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const dragOrigin = useRef<Show | null>(null);

  const containerOf = (id: string, s: Show): string | undefined => {
    if (s.scenes.some((sc) => sc.id === id)) return id;
    return s.scenes.find((sc) => sc.cues.some((c) => c.id === id))?.id;
  };

  const onDragStart = (e: DragStartEvent) => {
    dragOrigin.current = showRef.current;
    setDragId(String(e.active.id));
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const s = showRef.current;
    const activeId = String(active.id);
    const overId = String(over.id);
    const from = containerOf(activeId, s);
    const to = containerOf(overId, s);
    if (!from || !to || from === to) return;
    const toScene = s.scenes.find((sc) => sc.id === to)!;
    const overIndex = toScene.cues.findIndex((c) => c.id === overId);
    let index = overIndex >= 0 ? overIndex : toScene.cues.length;
    // 대상 아래쪽 절반에 있으면 그 뒤에 넣는다
    const rect = active.rect.current.translated;
    if (overIndex >= 0 && rect && rect.top > over.rect.top + over.rect.height / 2) index++;
    setLocal(moveCue(s, activeId, to, index));
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragId(null);
    const origin = dragOrigin.current;
    dragOrigin.current = null;
    if (!over) {
      if (origin) setLocal(origin);
      return;
    }
    const s = showRef.current;
    const activeId = String(active.id);
    const overId = String(over.id);
    const to = containerOf(overId, s);
    const from = containerOf(activeId, s);
    let next = s;
    if (to && from === to && activeId !== overId) {
      const scene = s.scenes.find((sc) => sc.id === to)!;
      const newIndex = scene.cues.findIndex((c) => c.id === overId);
      if (newIndex >= 0) next = moveCue(s, activeId, to, newIndex);
    }
    mutate(() => next);
  };

  const onDragCancel = () => {
    setDragId(null);
    if (dragOrigin.current) setLocal(dragOrigin.current);
    dragOrigin.current = null;
  };

  const dragFlat = dragId ? flat.find((f) => f.cue.id === dragId) : undefined;

  // 장마다 첫 신호 번호
  let running = 1;
  const firstNumbers = show.scenes.map((sc) => {
    const n = running;
    running += sc.cues.length;
    return n;
  });

  const missingAudio = flat.filter((f) => cueHasAudio(f.cue.type) && (!f.cue.audioId || !lib.map.has(f.cue.audioId)));

  const startPerform = async () => {
    if (lib.loaded && missingAudio.length > 0) {
      const ok = await confirm({
        title: '음원이 없는 신호가 있어요',
        message: (
          <p>
            {missingAudio.map((f) => pad2(f.index + 1)).join(', ')}번 신호에 음원이 없어요. 이 신호에서는 소리가 나지
            않아요. 그래도 공연 모드로 갈까요?
          </p>
        ),
        confirmLabel: '공연 모드로',
      });
      if (!ok) return;
    }
    engine.stopPreview();
    onPerform();
  };

  return (
    <>
      <header className="editor-header">
        <div className="editor-header__inner">
          <button className="btn btn--ghost btn--sm" onClick={onBack}>
            <ArrowLeft size={16} aria-hidden="true" /> 공연 목록
          </button>
          <Logo height={24} />
          <label className="title-wrap" title="눌러서 공연 제목 바꾸기">
            <input
              ref={titleRef}
              className="title-input"
              value={show.title}
              onChange={(e) => mutate((s) => ({ ...s, title: e.target.value }))}
              onBlur={() => !show.title.trim() && mutate((s) => ({ ...s, title: '이름 없는 공연' }))}
              aria-label="공연 제목"
              placeholder="공연 제목"
            />
            <Pencil size={15} aria-hidden="true" className="title-wrap__pencil" />
          </label>
          <span className="app-header__spacer" />
          <span className="saved small" aria-live="polite">
            {savedAt ? (
              <>
                <CheckCircle2 size={15} aria-hidden="true" /> 자동 저장됨
              </>
            ) : (
              <>
                {show.scenes.length}개 장 · 신호 {flat.length}개
              </>
            )}
          </span>
          <ThemeToggle compact />
          <button
            className="btn btn--primary"
            onClick={startPerform}
            disabled={flat.length === 0}
            title={flat.length === 0 ? '신호를 하나 이상 만들어야 시작할 수 있어요' : undefined}
          >
            <Play size={18} aria-hidden="true" /> 공연 모드로 시작
          </button>
        </div>
      </header>

      <main className="page editor">
        <div className="editor__list">
          {bulkUploading > 0 && (
            <div className="banner" role="status">
              음원을 저장하는 중… 남은 파일 {bulkUploading}개
            </div>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDragCancel={onDragCancel}
          >
            {show.scenes.map((scene, i) => (
              <SceneBlock
                key={scene.id}
                scene={scene}
                sceneIndex={i}
                sceneCount={show.scenes.length}
                firstNumber={firstNumbers[i]}
                audioMap={lib.map}
                audioLoaded={lib.loaded}
                cueLabel={cueLabel}
                selectedId={selectedId}
                previewingIds={previewingIds}
                onSelect={selectCue}
                onPreview={preview}
                onRename={(title) => mutate((s) => updateScene(s, scene.id, { title }))}
                onMove={(d) => mutate((s) => moveScene(s, scene.id, d))}
                onDelete={() => deleteScene(scene.id)}
                onAddCue={(type) => addNewCue(scene.id, type)}
                onDropFiles={(files) => dropFilesOnScene(scene.id, files)}
                onRejectFiles={rejectFiles}
              />
            ))}
            <DragOverlay>
              {dragFlat && (
                <CueRow
                  cue={dragFlat.cue}
                  number={dragFlat.index + 1}
                  audio={dragFlat.cue.audioId ? lib.map.get(dragFlat.cue.audioId) : undefined}
                  overlay
                />
              )}
            </DragOverlay>
          </DndContext>
          <button className="btn add-scene" onClick={addScene}>
            <Plus size={18} aria-hidden="true" /> 장 추가
          </button>
        </div>

        <aside className="editor__side" ref={sideRef}>
          {selected ? (
            <CueInspector
              key={selected.cue.id}
              cue={selected.cue}
              number={selected.index + 1}
              audio={selected.cue.audioId ? lib.map.get(selected.cue.audioId) : undefined}
              audioLoaded={lib.loaded}
              targets={targets.filter((t) => t.cue.id !== selected.cue.id)}
              previewVoiceId={previewVoiceOf.get(selected.cue.id)}
              uploading={uploadingCueId === selected.cue.id}
              focusLabel={freshCueId === selected.cue.id}
              onChange={(patch) => changeCue(selected.cue.id, patch)}
              onChangeType={(t) => changeType(selected.cue, t)}
              onFile={(file) => setCueAudio(selected.cue.id, file)}
              onRejectFiles={rejectFiles}
              onRemoveAudio={() => removeCueAudio(selected.cue.id)}
              onPreview={() => preview(selected.cue.id)}
              onDuplicate={() => duplicateCue(selected.cue)}
              onDelete={() => deleteCue(selected.cue)}
            />
          ) : (
            <div className="inspector panel empty">
              <MousePointerClick size={28} aria-hidden="true" />
              {flat.length === 0 ? (
                <ol className="steps steps--big">
                  <li>
                    장 아래의 <strong>[신호 추가]</strong>를 눌러 종류를 골라요.
                  </li>
                  <li>
                    음원 칸을 눌러 파일을 골라요.
                    <span className="drag-only"> 컴퓨터에서는 음원 파일을 장에 끌어다 놓아도 돼요(여러 개도 한꺼번에).</span>
                  </li>
                  <li>
                    다 되면 위의 <strong>[공연 모드로 시작]</strong>을 눌러요.
                  </li>
                </ol>
              ) : (
                <p>목록에서 신호를 누르면 여기서 자세히 고칠 수 있어요.</p>
              )}
            </div>
          )}
        </aside>
      </main>
    </>
  );
}
