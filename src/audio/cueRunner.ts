import { engine, usesBuffer, type PlayableAudio } from './engine';
import { cueHasAudio, type AudioMeta, type Cue } from '../types/show';

export type AudioLookup = (audioId: string) => AudioMeta | undefined;

export function playableOf(cue: Cue, lookup: AudioLookup): PlayableAudio | null {
  if (!cueHasAudio(cue.type) || !cue.audioId) return null;
  const meta = lookup(cue.audioId);
  if (!meta) return null;
  return { audioId: meta.id, duration: meta.duration };
}

/**
 * 신호 하나를 실행한다.
 * 노래·효과음·배경 소리는 재생, 스르륵 줄이기는 대상 페이드, 멈춤은 대상 정지.
 * 반환값: 실행했으면 true (음원이 없으면 false)
 */
export function runCue(cue: Cue, lookup: AudioLookup): Promise<boolean> | boolean {
  switch (cue.type) {
    case 'fade':
      engine.fade(cue.targetCueId, cue.fadeOut > 0 ? cue.fadeOut : 3);
      return true;
    case 'stop':
      engine.stop(cue.targetCueId);
      return true;
    default: {
      const audio = playableOf(cue, lookup);
      if (!audio) return false;
      return engine.play(cue, audio).then((id) => id !== null);
    }
  }
}

/** 효과음과 30초 이하 음원을 모두 AudioBuffer로 미리 디코딩한다. */
export async function preloadBuffers(
  cues: Cue[],
  lookup: AudioLookup,
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const jobs: PlayableAudio[] = [];
  const seen = new Set<string>();
  for (const cue of cues) {
    const a = playableOf(cue, lookup);
    if (!a || seen.has(a.audioId)) continue;
    if (usesBuffer(cue.type, a.duration)) {
      seen.add(a.audioId);
      jobs.push(a);
    }
  }
  let done = 0;
  onProgress?.(0, jobs.length);
  // 한꺼번에 너무 많이 디코딩하지 않도록 2개씩
  const queue = [...jobs];
  const worker = async () => {
    for (let a = queue.shift(); a; a = queue.shift()) {
      await engine.loadBuffer(a.audioId);
      onProgress?.(++done, jobs.length);
    }
  };
  await Promise.all([worker(), worker()]);
}

/** 현재 위치부터 다음 3개 신호의 긴 음원을 미리 불러 둔다. */
export function preloadAhead(cues: Cue[], cursor: number, lookup: AudioLookup, count = 3) {
  const keep = new Set<string>();
  for (let i = cursor, n = 0; i < cues.length && n < count; i++) {
    const cue = cues[i];
    const a = playableOf(cue, lookup);
    if (!a) continue;
    n++;
    if (!usesBuffer(cue.type, a.duration)) {
      keep.add(a.audioId);
      void engine.loadMedia(a.audioId);
    }
  }
  engine.trimMedia(keep);
}
