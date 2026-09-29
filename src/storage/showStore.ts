import { newId } from '../utils/id';
import {
  SCHEMA_VERSION,
  cueHasAudio,
  type Cue,
  type CueType,
  type Scene,
  type Show,
  type ShowSummary,
} from '../types/show';

/**
 * 공연·신호·설정 저장 (localStorage).
 * 음원(Blob)은 절대 여기에 넣지 않는다 → audioStore(IndexedDB).
 */

const KEY_INDEX = 'qsign:shows';
const KEY_SHOW = (id: string) => `qsign:show:${id}`;
const KEY_SETTINGS = 'qsign:settings';

export class StorageFullError extends Error {
  constructor() {
    super('저장 공간이 가득 찼어요. 쓰지 않는 공연이나 음원을 지워 주세요.');
    this.name = 'StorageFullError';
  }
}

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
      throw new StorageFullError();
    }
    throw e;
  }
}

// ─── 기본값 만들기 ───

export function createCue(type: CueType, partial: Partial<Cue> = {}): Cue {
  return {
    id: newId('cue'),
    type,
    label: '',
    signal: '',
    volume: 1,
    fadeIn: 0,
    fadeOut: type === 'fade' ? 3 : 0,
    autoNext: false,
    ...partial,
  };
}

export function createScene(title: string): Scene {
  return { id: newId('scene'), title, cues: [] };
}

export function createShow(title: string): Show {
  const now = Date.now();
  return {
    id: newId('show'),
    title,
    createdAt: now,
    updatedAt: now,
    scenes: [createScene('1장')],
    schemaVersion: SCHEMA_VERSION,
  };
}

// ─── 형식 맞추기(옛 데이터·가져온 데이터 보정) ───

const CUE_TYPES: CueType[] = ['music', 'sfx', 'bgm', 'fade', 'stop'];

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}
function optNum(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}
function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function normalizeCue(raw: Partial<Cue>): Cue {
  const type: CueType = CUE_TYPES.includes(raw.type as CueType) ? (raw.type as CueType) : 'music';
  return {
    id: str(raw.id) || newId('cue'),
    type,
    label: str(raw.label),
    signal: str(raw.signal),
    audioId: cueHasAudio(type) && raw.audioId ? str(raw.audioId) : undefined,
    volume: Math.min(1, Math.max(0, num(raw.volume, 1))),
    fadeIn: Math.max(0, num(raw.fadeIn, 0)),
    fadeOut: Math.max(0, num(raw.fadeOut, type === 'fade' ? 3 : 0)),
    startAt: optNum(raw.startAt),
    endAt: optNum(raw.endAt),
    autoNext: Boolean(raw.autoNext),
    targetCueId: raw.targetCueId ? str(raw.targetCueId) : undefined,
  };
}

/** 저장된 형식이 바뀌었을 때 여기서 옮긴다. */
export function migrateShow(raw: unknown): Show {
  const r = (raw ?? {}) as Partial<Show>;
  const now = Date.now();
  const scenes = Array.isArray(r.scenes) ? r.scenes : [];
  return {
    id: str(r.id) || newId('show'),
    title: str(r.title, '이름 없는 공연') || '이름 없는 공연',
    createdAt: num(r.createdAt, now),
    updatedAt: num(r.updatedAt, now),
    schemaVersion: SCHEMA_VERSION,
    scenes: scenes.map((s) => ({
      id: str(s?.id) || newId('scene'),
      title: str(s?.title),
      cues: Array.isArray(s?.cues) ? s.cues.map(normalizeCue) : [],
    })),
  };
}

// ─── 목록 ───

function summarize(show: Show): ShowSummary {
  return {
    id: show.id,
    title: show.title,
    createdAt: show.createdAt,
    updatedAt: show.updatedAt,
    sceneCount: show.scenes.length,
    cueCount: show.scenes.reduce((n, s) => n + s.cues.length, 0),
  };
}

/** 최근 수정 순 */
export function listShows(): ShowSummary[] {
  const list = readJSON<ShowSummary[]>(KEY_INDEX) ?? [];
  return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
}

function writeIndex(list: ShowSummary[]) {
  writeJSON(KEY_INDEX, list);
}

export function showExists(id: string): boolean {
  return localStorage.getItem(KEY_SHOW(id)) !== null;
}

export function loadShow(id: string): Show | null {
  const raw = readJSON<unknown>(KEY_SHOW(id));
  return raw ? migrateShow(raw) : null;
}

/** 모든 공연 (음원 참조 확인용) */
export function loadAllShows(): Show[] {
  return listShows()
    .map((s) => loadShow(s.id))
    .filter((s): s is Show => s !== null);
}

/** 저장하고 updatedAt이 바뀐 공연을 돌려준다. */
export function saveShow(show: Show, { touch = true } = {}): Show {
  const next: Show = touch ? { ...show, updatedAt: Date.now() } : show;
  writeJSON(KEY_SHOW(next.id), next);
  const list = readJSON<ShowSummary[]>(KEY_INDEX) ?? [];
  const i = list.findIndex((s) => s.id === next.id);
  const sum = summarize(next);
  if (i >= 0) list[i] = sum;
  else list.push(sum);
  writeIndex(list);
  return next;
}

export function deleteShow(id: string): Show | null {
  const show = loadShow(id);
  localStorage.removeItem(KEY_SHOW(id));
  writeIndex((readJSON<ShowSummary[]>(KEY_INDEX) ?? []).filter((s) => s.id !== id));
  return show;
}

/** 공연 복제. 음원은 같은 것을 함께 쓴다(참조만 복사). */
export function duplicateShow(id: string): Show | null {
  const src = loadShow(id);
  if (!src) return null;
  const now = Date.now();
  const idMap = new Map<string, string>();
  const scenes = src.scenes.map((s) => ({
    ...s,
    id: newId('scene'),
    cues: s.cues.map((c) => {
      const nid = newId('cue');
      idMap.set(c.id, nid);
      return { ...c, id: nid };
    }),
  }));
  // fade/stop 대상도 새 id로 바꾼다
  for (const s of scenes)
    for (const c of s.cues) if (c.targetCueId) c.targetCueId = idMap.get(c.targetCueId);
  return saveShow(
    { ...src, id: newId('show'), title: `${src.title} (복사본)`, createdAt: now, updatedAt: now, scenes },
    { touch: false },
  );
}

/** 이 공연이 쓰는 음원 id 모음 */
export function audioIdsOf(show: Show): Set<string> {
  const ids = new Set<string>();
  for (const s of show.scenes) for (const c of s.cues) if (c.audioId) ids.add(c.audioId);
  return ids;
}

// ─── 설정 ───

export type ThemeChoice = 'light' | 'dark' | 'system';

export interface Settings {
  /** 마스터 볼륨 0~1 */
  masterVolume: number;
  /** navigator.storage.persist()를 이미 요청했는지 */
  persistRequested: boolean;
  /** 화면 밝기. system이면 컴퓨터 설정을 따른다 */
  theme: ThemeChoice;
}

const DEFAULT_SETTINGS: Settings = { masterVolume: 1, persistRequested: false, theme: 'system' };

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...(readJSON<Partial<Settings>>(KEY_SETTINGS) ?? {}) };
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const next = { ...loadSettings(), ...patch };
  writeJSON(KEY_SETTINGS, next);
  return next;
}

/** localStorage에서 큐싸인이 쓰는 대략의 바이트 (UTF-16 기준) */
export function localStorageUsage(): number {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('qsign:')) total += (k.length + (localStorage.getItem(k)?.length ?? 0)) * 2;
  }
  return total;
}
