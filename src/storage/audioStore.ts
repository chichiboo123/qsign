import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { newId } from '../utils/id';
import type { AudioMeta, AudioRecord } from '../types/show';

/**
 * 음원 저장 (IndexedDB qsign-db / store audio, key = audioId).
 * Blob은 외부로 전송하지 않고 이 기기 안에만 둔다.
 */

interface QsignDB extends DBSchema {
  audio: { key: string; value: AudioRecord };
}

const DB_NAME = 'qsign-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<QsignDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<QsignDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('audio')) {
          database.createObjectStore('audio', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

// ─── 파일 형식 ───

const EXT_MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
};

export const ACCEPT_AUDIO = '.mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a';

export function extOf(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1].toLowerCase() : '';
}

export function isSupportedAudio(file: File): boolean {
  const ext = extOf(file.name);
  if (ext in EXT_MIME) return true;
  return /^audio\/(mpeg|mp3|wav|x-wav|wave|mp4|x-m4a|aac)$/.test(file.type);
}

/** 내보내기 파일 이름에 쓸 확장자 */
export function extForRecord(rec: Pick<AudioRecord, 'name' | 'mime'>): string {
  const ext = extOf(rec.name);
  if (ext) return ext;
  if (/wav/.test(rec.mime)) return 'wav';
  if (/mp4|m4a|aac/.test(rec.mime)) return 'm4a';
  return 'mp3';
}

export function mimeForExt(ext: string): string {
  return EXT_MIME[ext.toLowerCase()] ?? 'application/octet-stream';
}

/** 파일 전체를 디코딩하지 않고 메타데이터만 읽어 길이(초)를 구한다. */
export function readDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const el = new Audio();
    el.preload = 'metadata';
    const done = (d: number) => {
      el.removeAttribute('src');
      el.load();
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(d) && d > 0 ? d : 0);
    };
    el.onloadedmetadata = () => done(el.duration);
    el.onerror = () => done(0);
    setTimeout(() => done(el.duration), 8000);
    el.src = url;
  });
}

// ─── 읽기·쓰기 ───

/** 파일을 저장하고 새 audioId를 돌려준다. */
export async function addAudioFile(file: File): Promise<AudioMeta> {
  const duration = await readDuration(file);
  const ext = extOf(file.name);
  const rec: AudioRecord = {
    id: newId('aud'),
    blob: file,
    name: file.name,
    mime: file.type || mimeForExt(ext),
    size: file.size,
    duration,
    createdAt: Date.now(),
  };
  await (await db()).put('audio', rec);
  const { blob: _blob, ...meta } = rec;
  return meta;
}

/** 가져오기에서 그대로 복원할 때 */
export async function putAudioRecord(rec: AudioRecord): Promise<void> {
  await (await db()).put('audio', rec);
}

export async function getAudio(id: string): Promise<AudioRecord | undefined> {
  return (await db()).get('audio', id);
}

export async function hasAudio(id: string): Promise<boolean> {
  return (await (await db()).getKey('audio', id)) !== undefined;
}

export async function deleteAudio(id: string): Promise<void> {
  await (await db()).delete('audio', id);
}

export async function listAudioIds(): Promise<string[]> {
  return (await db()).getAllKeys('audio');
}

/** 목록 표시용 메타데이터 (Blob 내용은 읽지 않는다) */
export async function listAudioMeta(): Promise<AudioMeta[]> {
  const database = await db();
  const out: AudioMeta[] = [];
  let cursor = await database.transaction('audio').store.openCursor();
  while (cursor) {
    const { blob: _blob, ...meta } = cursor.value;
    out.push(meta);
    cursor = await cursor.continue();
  }
  return out;
}

export async function getAudioMetaMap(): Promise<Map<string, AudioMeta>> {
  const list = await listAudioMeta();
  return new Map(list.map((m) => [m.id, m]));
}
