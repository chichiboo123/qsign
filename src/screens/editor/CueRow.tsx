import type { CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, GripVertical, Headphones, Square } from 'lucide-react';
import { CueTypeBadge } from '../../components/CueTypeBadge';
import { CUE_META } from '../../types/cueMeta';
import { cueHasAudio, type AudioMeta, type Cue } from '../../types/show';
import { formatTime, pad2 } from '../../utils/format';

interface RowProps {
  cue: Cue;
  number: number;
  audio?: AudioMeta;
  /** 음원 목록을 다 읽었는지 (읽기 전에는 "음원 없음"을 띄우지 않는다) */
  audioLoaded?: boolean;
  targetLabel?: string;
  selected?: boolean;
  previewing?: boolean;
  onSelect?: () => void;
  onPreview?: () => void;
  overlay?: boolean;
}

export function SortableCueRow(props: RowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: props.cue.id,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : undefined,
  };
  return (
    <li ref={setNodeRef} style={style}>
      <CueRow {...props} handleProps={{ ref: setActivatorNodeRef, ...attributes, ...listeners }} />
    </li>
  );
}

export function CueRow({
  cue,
  number,
  audio,
  audioLoaded = true,
  targetLabel,
  selected,
  previewing,
  onSelect,
  onPreview,
  overlay,
  handleProps,
}: RowProps & { handleProps?: Record<string, unknown> }) {
  const meta = CUE_META[cue.type];
  const needsAudio = cueHasAudio(cue.type);
  const missing = needsAudio && audioLoaded && (!cue.audioId || !audio);
  return (
    <div
      className={`cue-row ${selected ? 'is-selected' : ''} ${overlay ? 'is-overlay' : ''}`}
      style={{ '--cue': meta.color } as CSSProperties}
    >
      <button className="cue-row__handle" aria-label={`${pad2(number)}번 신호 옮기기`} {...handleProps}>
        <GripVertical size={16} aria-hidden="true" />
      </button>
      <button className="cue-row__main" onClick={onSelect} aria-pressed={selected}>
        <span className="cue-row__num mono">{pad2(number)}</span>
        <span className="cue-row__body">
          <span className="cue-row__top">
            <CueTypeBadge type={cue.type} size="sm" />
            <span className="cue-row__label">{cue.label || <span className="muted">(이름 없음)</span>}</span>
          </span>
          {cue.signal && <span className="cue-row__signal">{cue.signal}</span>}
          <span className="cue-row__info">
            {needsAudio &&
              (!audioLoaded ? null : missing ? (
                <span className="warn">
                  <AlertTriangle size={14} aria-hidden="true" /> 음원을 넣어 주세요
                </span>
              ) : (
                <span className="muted">
                  {audio!.name} · <span className="mono">{formatTime(audio!.duration)}</span>
                </span>
              ))}
            {!needsAudio && (
              <span className="muted">
                대상: {targetLabel ?? '나오고 있는 모든 소리'}
                {cue.type === 'fade' && <> · {cue.fadeOut}초 동안</>}
              </span>
            )}
          </span>
        </span>
      </button>
      {needsAudio && (
        <button
          className={`btn btn--sm btn--icon cue-row__preview ${previewing ? 'is-on' : ''}`}
          onClick={onPreview}
          disabled={missing || !audio}
          aria-label={`${pad2(number)}번 ${previewing ? '미리 듣기 멈춤' : '미리 듣기'}`}
          title={previewing ? '미리 듣기 멈춤' : '미리 듣기'}
        >
          {previewing ? <Square size={14} /> : <Headphones size={15} />}
        </button>
      )}
    </div>
  );
}
