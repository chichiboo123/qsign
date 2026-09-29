import { useId, useRef, useState, type CSSProperties } from 'react';
import { Square, Volume2 } from 'lucide-react';
import { engine, type VoiceInfo } from '../../audio/engine';
import { useAnimationFrame } from '../../audio/useEngine';
import { CueTypeBadge } from '../../components/CueTypeBadge';
import { LevelMeter } from '../../components/LevelMeter';
import { CUE_META } from '../../types/cueMeta';
import { loadSettings, saveSettings } from '../../storage/showStore';
import { formatTime } from '../../utils/format';

/** NOW PLAYING: 재생 중인 소리 목록 + 전체 볼륨 + 레벨 미터 */
export function NowPlaying({ voices }: { voices: VoiceInfo[] }) {
  const list = voices.filter((v) => !v.preview);
  return (
    <section className="now panel" aria-label="지금 나오는 소리">
      <div className="now__head">
        <span className="eyebrow">
          Now Playing · 지금 나오는 소리{list.length > 0 && <span className="now__count"> {list.length}개</span>}
        </span>
        <span className="now__tools">
          <MasterVolume />
          <LevelMeter />
        </span>
      </div>
      {list.length === 0 ? (
        <p className="now__idle">지금은 조용해요.</p>
      ) : (
        <ul className="now__list">
          {list.map((v) => (
            <VoiceRow key={v.id} voice={v} />
          ))}
        </ul>
      )}
    </section>
  );
}

function MasterVolume() {
  const id = useId();
  const [vol, setVol] = useState(() => Math.round(loadSettings().masterVolume * 100));
  return (
    <span className="master">
      <label htmlFor={id} className="master__label">
        <Volume2 size={16} aria-hidden="true" /> 전체 볼륨
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={vol}
        onChange={(e) => {
          const v = Number(e.target.value);
          setVol(v);
          engine.setMasterVolume(v / 100);
          try {
            saveSettings({ masterVolume: v / 100 });
          } catch {
            /* 저장이 안 돼도 소리는 바뀐다 */
          }
        }}
        // 슬라이더에 초점이 남으면 ← 키가 볼륨을 바꾸므로 손을 떼면 초점을 푼다
        onPointerUp={(e) => e.currentTarget.blur()}
      />
      <span className="master__value mono">{vol}%</span>
    </span>
  );
}

function VoiceRow({ voice }: { voice: VoiceInfo }) {
  const barRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const remainRef = useRef<HTMLSpanElement>(null);
  const last = useRef('');

  useAnimationFrame(() => {
    const e = engine.getElapsed(voice.id);
    const ratio = voice.length > 0 ? Math.min(1, e / voice.length) : 0;
    if (barRef.current) barRef.current.style.transform = `scaleX(${ratio})`;
    const t = `${formatTime(e)} / ${formatTime(voice.length)}`;
    if (t !== last.current) {
      last.current = t;
      if (timeRef.current) timeRef.current.textContent = t;
      if (remainRef.current && !voice.loop)
        remainRef.current.textContent = `${formatTime(Math.max(0, voice.length - e))} 남음`;
    }
  });

  const meta = CUE_META[voice.cueType];
  const name = voice.label || meta.name;
  const tag = voice.state === 'fading' ? '작아지는 중' : voice.loop ? '반복 중' : null;
  return (
    <li
      className={`voice ${voice.state === 'fading' ? 'is-fading' : ''}`}
      style={{ '--cue': meta.color } as CSSProperties}
    >
      <CueTypeBadge type={voice.cueType} size="sm" />
      <span className="voice__label">{name}</span>
      {tag && <span className="voice__tag">{tag}</span>}
      <div className="voice__bar" aria-hidden="true">
        <div className="voice__fill" ref={barRef} />
      </div>
      <span className="voice__time mono" ref={timeRef} />
      {!voice.loop && <span className="voice__remain mono" ref={remainRef} />}
      <button
        className="btn btn--sm voice__stop"
        onClick={(e) => {
          engine.stopVoice(voice.id);
          e.currentTarget.blur();
        }}
        aria-label={`${name} 멈춤`}
      >
        <Square size={13} fill="currentColor" aria-hidden="true" /> 멈춤
      </button>
    </li>
  );
}
