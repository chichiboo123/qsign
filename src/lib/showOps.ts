import type { Cue, Scene, Show } from '../types/show';

/** 공연을 바꾸지 않고 새 객체를 돌려주는 작은 도우미들 */

export interface FlatCue {
  cue: Cue;
  scene: Scene;
  /** 전체 순서 (0부터) */
  index: number;
  /** 장 안에서의 순서 */
  indexInScene: number;
}

export function flattenCues(show: Show): FlatCue[] {
  const out: FlatCue[] = [];
  for (const scene of show.scenes) {
    scene.cues.forEach((cue, i) => out.push({ cue, scene, index: out.length, indexInScene: i }));
  }
  return out;
}

export function findCue(show: Show, cueId: string): FlatCue | undefined {
  return flattenCues(show).find((f) => f.cue.id === cueId);
}

export function updateScene(show: Show, sceneId: string, patch: Partial<Scene>): Show {
  return { ...show, scenes: show.scenes.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)) };
}

export function updateCue(show: Show, cueId: string, patch: Partial<Cue>): Show {
  return {
    ...show,
    scenes: show.scenes.map((s) =>
      s.cues.some((c) => c.id === cueId)
        ? { ...s, cues: s.cues.map((c) => (c.id === cueId ? { ...c, ...patch } : c)) }
        : s,
    ),
  };
}

export function addCue(show: Show, sceneId: string, cue: Cue, afterCueId?: string): Show {
  return {
    ...show,
    scenes: show.scenes.map((s) => {
      if (s.id !== sceneId) return s;
      const cues = [...s.cues];
      const i = afterCueId ? cues.findIndex((c) => c.id === afterCueId) : -1;
      if (i >= 0) cues.splice(i + 1, 0, cue);
      else cues.push(cue);
      return { ...s, cues };
    }),
  };
}

/** 신호를 지운다. 이 신호를 대상으로 하던 줄이기·멈춤은 대상이 비워진다. */
export function removeCue(show: Show, cueId: string): Show {
  return {
    ...show,
    scenes: show.scenes.map((s) => ({
      ...s,
      cues: s.cues
        .filter((c) => c.id !== cueId)
        .map((c) => (c.targetCueId === cueId ? { ...c, targetCueId: undefined } : c)),
    })),
  };
}

export function removeScene(show: Show, sceneId: string): Show {
  const scene = show.scenes.find((s) => s.id === sceneId);
  let next: Show = { ...show, scenes: show.scenes.filter((s) => s.id !== sceneId) };
  for (const c of scene?.cues ?? []) next = removeCue(next, c.id);
  return next;
}

export function moveScene(show: Show, sceneId: string, delta: -1 | 1): Show {
  const i = show.scenes.findIndex((s) => s.id === sceneId);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= show.scenes.length) return show;
  const scenes = [...show.scenes];
  [scenes[i], scenes[j]] = [scenes[j], scenes[i]];
  return { ...show, scenes };
}

/** 신호를 다른 장(또는 같은 장)의 index 위치로 옮긴다. */
export function moveCue(show: Show, cueId: string, toSceneId: string, toIndex: number): Show {
  const from = findCue(show, cueId);
  if (!from) return show;
  const scenes = show.scenes.map((s) => ({ ...s, cues: s.cues.filter((c) => c.id !== cueId) }));
  const target = scenes.find((s) => s.id === toSceneId);
  if (!target) return show;
  const idx = Math.max(0, Math.min(toIndex, target.cues.length));
  target.cues.splice(idx, 0, from.cue);
  return { ...show, scenes };
}

/** 이 공연에서 이 음원을 쓰는 신호 수 */
export function countAudioUse(show: Show, audioId: string): number {
  let n = 0;
  for (const s of show.scenes) for (const c of s.cues) if (c.audioId === audioId) n++;
  return n;
}

/** 파일 이름에서 확장자를 뺀 이름 */
export function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '');
}
