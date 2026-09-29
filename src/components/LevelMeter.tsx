import { useRef } from 'react';
import { engine } from '../audio/engine';
import { useAnimationFrame } from '../audio/useEngine';

const SEGMENTS = 16;

/** 마스터 출력 레벨 미터 (AnalyserNode). React 렌더 없이 DOM만 바꾼다. */
export function LevelMeter() {
  const segRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const shown = useRef(0);
  const lastLit = useRef(-1);

  useAnimationFrame(() => {
    const peak = engine.getLevel();
    // 올라갈 때는 바로, 내려갈 때는 천천히
    shown.current = peak > shown.current ? peak : shown.current * 0.9;
    const db = shown.current > 0.0001 ? 20 * Math.log10(shown.current) : -60;
    // -48dB ~ 0dB 를 칸으로
    const lit = Math.round(Math.max(0, Math.min(1, (db + 48) / 48)) * SEGMENTS);
    if (lit !== lastLit.current) {
      lastLit.current = lit;
      segRefs.current.forEach((el, i) => el?.classList.toggle('is-lit', i < lit));
    }
  });

  return (
    <div className="level" role="img" aria-label="지금 나가는 소리 크기">
      <span className="level__label">소리 크기</span>
      <span className="level__bars" aria-hidden="true">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            ref={(el) => {
              segRefs.current[i] = el;
            }}
            className={`level__seg ${i >= SEGMENTS - 2 ? 'is-hot' : i >= SEGMENTS - 5 ? 'is-warm' : ''}`}
          />
        ))}
      </span>
    </div>
  );
}
