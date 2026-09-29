import { useEffect, useRef, useSyncExternalStore } from 'react';
import { engine, type VoiceInfo } from './engine';

/** 지금 재생 중인 소리 목록 */
export function useVoices(): VoiceInfo[] {
  return useSyncExternalStore(engine.subscribe, engine.getSnapshot);
}

/** 화면 주사율에 맞춰 fn을 부른다 (active일 때만). */
export function useAnimationFrame(fn: (t: number) => void, active = true) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!active) return;
    let id = 0;
    const loop = (t: number) => {
      ref.current(t);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [active]);
}
