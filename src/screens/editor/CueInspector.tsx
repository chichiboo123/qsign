import { useId, type CSSProperties } from 'react';
import { FileAudio, Headphones, Square, Trash2, Upload, X } from 'lucide-react';
import { DropZone } from '../../components/DropZone';
import { TimeInput } from '../../components/TimeInput';
import { CUE_META, CUE_TYPE_ORDER } from '../../types/cueMeta';
import { cueHasAudio, type AudioMeta, type Cue, type CueType } from '../../types/show';
import type { FlatCue } from '../../lib/showOps';
import { formatBytes, formatTime, pad2 } from '../../utils/format';

interface Props {
  cue: Cue;
  number: number;
  audio?: AudioMeta;
  /** 대상으로 고를 수 있는 소리 신호 */
  targets: FlatCue[];
  previewing: boolean;
  uploading: boolean;
  onChange: (patch: Partial<Cue>) => void;
  onChangeType: (type: CueType) => void;
  onFile: (file: File) => void;
  onRejectFiles: (names: string[]) => void;
  onRemoveAudio: () => void;
  onPreview: () => void;
  onDelete: () => void;
}

export function CueInspector({
  cue,
  number,
  audio,
  targets,
  previewing,
  uploading,
  onChange,
  onChangeType,
  onFile,
  onRejectFiles,
  onRemoveAudio,
  onPreview,
  onDelete,
}: Props) {
  const uid = useId();
  const meta = CUE_META[cue.type];
  const hasAudio = cueHasAudio(cue.type);
  const duration = audio?.duration ?? 0;
  const rangeBad = cue.startAt !== undefined && cue.endAt !== undefined && cue.endAt <= cue.startAt;
  const startBad = duration > 0 && cue.startAt !== undefined && cue.startAt >= duration;

  return (
    <div className="inspector panel" style={{ '--cue': meta.color } as CSSProperties}>
      <div className="inspector__head">
        <span className="eyebrow">Signal {pad2(number)}</span>
        <button className="btn btn--sm btn--ghost" onClick={onDelete}>
          <Trash2 size={15} aria-hidden="true" /> 신호 지우기
        </button>
      </div>

      <fieldset className="type-picker">
        <legend className="field__label">종류</legend>
        {CUE_TYPE_ORDER.map((t) => {
          const m = CUE_META[t];
          const Icon = m.icon;
          return (
            <label key={t} className="type-picker__opt" style={{ '--cue': m.color } as CSSProperties}>
              <input type="radio" name={`${uid}-type`} checked={cue.type === t} onChange={() => onChangeType(t)} />
              <span>
                <Icon size={15} aria-hidden="true" />
                {m.name}
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className="field">
        <label className="field__label" htmlFor={`${uid}-label`}>
          신호 이름
        </label>
        <input
          id={`${uid}-label`}
          className="input"
          value={cue.label}
          placeholder="예: M3 궁금한 게 많아"
          onChange={(e) => onChange({ label: e.target.value })}
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor={`${uid}-signal`}>
          신호 대사 <span className="muted small">— 이 말을 들으면 누르세요</span>
        </label>
        <textarea
          id={`${uid}-signal`}
          className="input"
          rows={2}
          value={cue.signal}
          placeholder="예: 궁금쓰가 “저기 봐!”라고 외치면"
          onChange={(e) => onChange({ signal: e.target.value })}
        />
      </div>

      {hasAudio && (
        <div className="field">
          <span className="field__label">음원</span>
          <DropZone
            onFiles={(f) => onFile(f[0])}
            onReject={onRejectFiles}
            className="audio-drop"
            label="음원 파일 고르기"
          >
            {uploading ? (
              <span className="audio-drop__empty">
                <Upload size={20} aria-hidden="true" /> 저장하는 중…
              </span>
            ) : audio ? (
              <span className="audio-drop__file">
                <FileAudio size={22} aria-hidden="true" />
                <span className="audio-drop__name">
                  <strong>{audio.name}</strong>
                  <span className="muted small mono">
                    {formatTime(audio.duration)} · {formatBytes(audio.size)}
                  </span>
                </span>
                <span className="muted small">바꾸려면 누르거나 끌어다 놓기</span>
              </span>
            ) : (
              <span className="audio-drop__empty">
                <Upload size={20} aria-hidden="true" />
                <span>
                  음원 파일을 끌어다 놓거나 <u>눌러서 고르세요</u>
                  <br />
                  <span className="muted small">mp3, wav, m4a</span>
                </span>
              </span>
            )}
          </DropZone>
          {audio && (
            <div className="row-actions">
              <button className={`btn btn--sm ${previewing ? 'is-on' : ''}`} onClick={onPreview}>
                {previewing ? <Square size={14} aria-hidden="true" /> : <Headphones size={15} aria-hidden="true" />}
                {previewing ? '미리 듣기 멈춤' : '미리 듣기'}
              </button>
              <button className="btn btn--sm btn--ghost" onClick={onRemoveAudio}>
                <X size={15} aria-hidden="true" /> 음원 빼기
              </button>
            </div>
          )}
        </div>
      )}

      {hasAudio && (
        <div className="field">
          <label className="field__label" htmlFor={`${uid}-vol`}>
            볼륨 <span className="mono">{Math.round(cue.volume * 100)}%</span>
          </label>
          <input
            id={`${uid}-vol`}
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(cue.volume * 100)}
            onChange={(e) => onChange({ volume: Number(e.target.value) / 100 })}
          />
        </div>
      )}

      {hasAudio && (
        <div className="field-grid">
          <SecondsField id={`${uid}-fi`} label="점점 커지기(초)" value={cue.fadeIn} onChange={(v) => onChange({ fadeIn: v })} />
          {cue.type !== 'bgm' && (
            <SecondsField
              id={`${uid}-fo`}
              label="끝에서 점점 작게(초)"
              value={cue.fadeOut}
              onChange={(v) => onChange({ fadeOut: v })}
            />
          )}
          <div className="field">
            <label className="field__label" htmlFor={`${uid}-start`}>
              시작 지점
            </label>
            <TimeInput
              id={`${uid}-start`}
              value={cue.startAt}
              onChange={(v) => onChange({ startAt: v })}
              placeholder="처음부터"
              invalid={startBad}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${uid}-end`}>
              끝 지점
            </label>
            <TimeInput
              id={`${uid}-end`}
              value={cue.endAt}
              onChange={(v) => onChange({ endAt: v })}
              placeholder={duration ? `끝까지 (${formatTime(duration)})` : '끝까지'}
              invalid={rangeBad}
            />
          </div>
          <p className="muted small field-grid__full">
            시간은 <span className="mono">90</span> 또는 <span className="mono">1:30</span>처럼 적어요.
            {rangeBad && <span className="warn"> 끝 지점은 시작 지점보다 뒤여야 해요.</span>}
            {startBad && <span className="warn"> 시작 지점이 음원 길이보다 길어요.</span>}
          </p>
        </div>
      )}

      {cue.type === 'fade' && (
        <SecondsField
          id={`${uid}-fade`}
          label="몇 초 동안 줄일까요?"
          value={cue.fadeOut}
          min={0.1}
          onChange={(v) => onChange({ fadeOut: v })}
        />
      )}

      {(cue.type === 'fade' || cue.type === 'stop') && (
        <div className="field">
          <label className="field__label" htmlFor={`${uid}-target`}>
            {cue.type === 'fade' ? '어떤 소리를 줄일까요?' : '어떤 소리를 멈출까요?'}
          </label>
          <select
            id={`${uid}-target`}
            className="input"
            value={cue.targetCueId ?? ''}
            onChange={(e) => onChange({ targetCueId: e.target.value || undefined })}
          >
            <option value="">전체 소리</option>
            {targets.map((t) => (
              <option key={t.cue.id} value={t.cue.id}>
                {pad2(t.index + 1)} · {CUE_META[t.cue.type].name} · {t.cue.label || '(이름 없음)'}
              </option>
            ))}
          </select>
        </div>
      )}

      {(cue.type === 'music' || cue.type === 'sfx') && (
        <label className="check">
          <input type="checkbox" checked={cue.autoNext} onChange={(e) => onChange({ autoNext: e.target.checked })} />
          <span>
            끝나면 다음 신호 자동 실행 <span className="muted small">(다음 버전에서 동작해요. 지금은 저장만 돼요)</span>
          </span>
        </label>
      )}
    </div>
  );
}

function SecondsField({
  id,
  label,
  value,
  onChange,
  min = 0,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="input mono"
        type="number"
        min={min}
        max={600}
        step={0.5}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(Math.max(min, v));
        }}
      />
    </div>
  );
}
