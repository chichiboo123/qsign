import { useRef, type CSSProperties } from 'react';
import { Square } from 'lucide-react';
import { engine, type VoiceInfo } from '../../audio/engine';
import { useAnimationFrame } from '../../audio/useEngine';
import { CueTypeBadge } from '../../components/CueTypeBadge';
import { LevelMeter } from '../../components/LevelMeter';
import { CUE_META } from '../../types/cueMeta';
import { formatTime } from '../../utils/format';

/** NOW PLAYING: 재생 중인 소리 목록 + 레벨 미터 */
export function NowPlaying({ voices }: { voices: VoiceInfo[] }) {
  const list = voices.filter((v) => !v.preview);
  return (
    <section className="now panel" aria-label="지금 나오는 소리">
      <div className="now__head">
        <span className="eyebrow">Now Playing</span>
        <LevelMeter />
      </div>
      {list.length === 0 ? (
        <p className="now__idle muted">지금은 조용해요.</p>
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
        remainRef.current.textContent = `-${formatTime(Math.max(0, voice.length - e))} 남음`;
    }
  });

  const meta = CUE_META[voice.cueType];
  return (
    <li
      className={`voice ${voice.state === 'fading' ? 'is-fading' : ''}`}
      style={{ '--cue': meta.color } as CSSProperties}
    >
      <div className="voice__top">
        <CueTypeBadge type={voice.cueType} size="sm" />
        <span className="voice__label">{voice.label || meta.name}</span>
        {voice.loop && <span className="voice__tag">반복 중</span>}
        {voice.state === 'fading' && <span className="voice__tag">줄이는 중</span>}
        <span className="voice__time mono" ref={timeRef} />
        {!voice.loop && <span className="voice__remain mono" ref={remainRef} />}
        <button
          className="btn btn--sm btn--icon voice__stop"
          onClick={(e) => {
            engine.stopVoice(voice.id);
            e.currentTarget.blur();
          }}
          aria-label={`${voice.label || meta.name} 멈춤`}
          title="이 소리만 멈춤"
        >
          <Square size={14} fill="currentColor" />
        </button>
      </div>
      <div className="voice__bar">
        <div className="voice__fill" ref={barRef} />
      </div>
    </li>
  );
}
