import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronDown, ChevronUp, Trash2, Upload } from 'lucide-react';
import { DropZone } from '../../components/DropZone';
import { AddCueMenu } from './AddCueMenu';
import { SortableCueRow } from './CueRow';
import type { AudioMeta, CueType, Scene } from '../../types/show';

interface Props {
  scene: Scene;
  sceneIndex: number;
  sceneCount: number;
  /** 이 장 첫 신호의 전체 번호 (1부터) */
  firstNumber: number;
  audioMap: Map<string, AudioMeta>;
  cueLabel: (cueId: string) => string | undefined;
  selectedId: string | null;
  previewingIds: Set<string>;
  onSelect: (cueId: string) => void;
  onPreview: (cueId: string) => void;
  onRename: (title: string) => void;
  onMove: (delta: -1 | 1) => void;
  onDelete: () => void;
  onAddCue: (type: CueType) => void;
  onDropFiles: (files: File[]) => void;
  onRejectFiles: (names: string[]) => void;
}

export function SceneBlock({
  scene,
  sceneIndex,
  sceneCount,
  firstNumber,
  audioMap,
  cueLabel,
  selectedId,
  previewingIds,
  onSelect,
  onPreview,
  onRename,
  onMove,
  onDelete,
  onAddCue,
  onDropFiles,
  onRejectFiles,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: scene.id });

  return (
    <section className="scene panel" aria-label={scene.title || `${sceneIndex + 1}번째 장`}>
      <DropZone onFiles={onDropFiles} onReject={onRejectFiles} multiple clickable={false} className="scene__drop">
        <header className="scene__head">
          <span className="eyebrow scene__no">Scene {String(sceneIndex + 1).padStart(2, '0')}</span>
          <input
            className="scene__title"
            value={scene.title}
            placeholder="장 이름 (예: 2장 · 몰라정류장)"
            onChange={(e) => onRename(e.target.value)}
            aria-label="장 이름"
          />
          <span className="scene__count muted small">신호 {scene.cues.length}개</span>
          <div className="scene__tools">
            <button
              className="btn btn--sm btn--icon btn--ghost"
              onClick={() => onMove(-1)}
              disabled={sceneIndex === 0}
              aria-label="장을 위로"
              title="위로"
            >
              <ChevronUp size={18} />
            </button>
            <button
              className="btn btn--sm btn--icon btn--ghost"
              onClick={() => onMove(1)}
              disabled={sceneIndex === sceneCount - 1}
              aria-label="장을 아래로"
              title="아래로"
            >
              <ChevronDown size={18} />
            </button>
            <button className="btn btn--sm btn--icon btn--ghost" onClick={onDelete} aria-label="장 지우기" title="장 지우기">
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        <SortableContext items={scene.cues.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          <ul ref={setNodeRef} className={`cue-list ${isOver ? 'is-over' : ''} ${scene.cues.length === 0 ? 'is-empty' : ''}`}>
            {scene.cues.map((cue, i) => (
              <SortableCueRow
                key={cue.id}
                cue={cue}
                number={firstNumber + i}
                audio={cue.audioId ? audioMap.get(cue.audioId) : undefined}
                targetLabel={cue.targetCueId ? cueLabel(cue.targetCueId) : undefined}
                selected={cue.id === selectedId}
                previewing={previewingIds.has(cue.id)}
                onSelect={() => onSelect(cue.id)}
                onPreview={() => onPreview(cue.id)}
              />
            ))}
            {scene.cues.length === 0 && <li className="cue-list__empty muted small">신호를 추가하거나 여기로 끌어 오세요.</li>}
          </ul>
        </SortableContext>

        <footer className="scene__foot">
          <AddCueMenu onAdd={onAddCue} />
          <span className="scene__hint muted small">
            <Upload size={14} aria-hidden="true" /> 음원 파일을 이 장에 끌어다 놓으면 신호가 만들어져요
          </span>
        </footer>
      </DropZone>
    </section>
  );
}
