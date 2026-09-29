import { useRef } from 'react';
import { engine } from '../audio/engine';
import { useAnimationFrame } from '../audio/useEngine';
import { formatTime } from '../utils/format';

interface Props {
  voiceId: string;
  /** 재생 구간 길이(초) */
  length: number;
  label: string;
  /** 끄는 동안의 위치(초). 손을 떼면 null */
  onScrub?: (t: number | null) => void;
}

/**
 * 누르거나 끌어서 재생 위치를 옮기는 진행바.
 * 끄는 동안에는 보이는 위치만 바꾸고, 손을 뗄 때 한 번만 실제로 옮긴다(짧은 소리가 지글거리지 않게).
 */
export function Seekbar({ voiceId, length, label, onScrub }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const drag = useRef<number | null>(null);

  const paint = (ratio: number) => {
    const r = Math.max(0, Math.min(1, ratio));
    if (fillRef.current) fillRef.current.style.transform = `scaleX(${r})`;
    if (thumbRef.current) thumbRef.current.style.left = `${r * 100}%`;
    const el = rootRef.current;
    if (el) {
      const t = r * length;
      el.setAttribute('aria-valuenow', String(Math.round(t)));
      el.setAttribute('aria-valuetext', `${formatTime(t)} / ${formatTime(length)}`);
    }
  };

  useAnimationFrame(() => {
    if (drag.current !== null) return;
    paint(length > 0 ? engine.getElapsed(voiceId) / length : 0);
  });

  const ratioAt = (clientX: number) => {
    const box = rootRef.current!.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - box.left) / box.width));
  };

  const seekTo = (t: number) => engine.seek(voiceId, Math.max(0, Math.min(length, t)));

  return (
    <div
      ref={rootRef}
      className="seek"
      role="slider"
      tabIndex={0}
      aria-label={`${label} 재생 위치`}
      aria-valuemin={0}
      aria-valuemax={Math.round(length)}
      title="눌러서 원하는 곳으로 넘겨요"
      onPointerDown={(e) => {
        if (length <= 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = ratioAt(e.clientX);
        paint(drag.current);
        onScrub?.(drag.current * length);
        rootRef.current?.classList.add('is-dragging');
      }}
      onPointerMove={(e) => {
        if (drag.current === null) return;
        drag.current = ratioAt(e.clientX);
        paint(drag.current);
        onScrub?.(drag.current * length);
      }}
      onPointerUp={(e) => {
        if (drag.current === null) return;
        seekTo(drag.current * length);
        drag.current = null;
        onScrub?.(null);
        rootRef.current?.classList.remove('is-dragging');
        // 초점을 풀어야 Space가 [다음]으로 간다
        e.currentTarget.blur();
      }}
      onPointerCancel={() => {
        drag.current = null;
        onScrub?.(null);
        rootRef.current?.classList.remove('is-dragging');
      }}
      onKeyDown={(e) => {
        const now = engine.getElapsed(voiceId);
        let next: number | null = null;
        if (e.key === 'ArrowRight') next = now + 5;
        else if (e.key === 'ArrowLeft') next = now - 5;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = length - 1;
        if (next === null) return;
        // 공연 모드의 ← (이전) 단축키가 같이 동작하지 않게 한다
        e.preventDefault();
        e.stopPropagation();
        seekTo(next);
      }}
    >
      <div className="seek__track">
        <div className="seek__fill" ref={fillRef} />
      </div>
      <div className="seek__thumb" ref={thumbRef} aria-hidden="true" />
    </div>
  );
}
