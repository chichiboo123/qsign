import JSZip from 'jszip';
import { newId } from '../utils/id';
import { migrateShow, saveShow, showExists } from '../storage/showStore';
import { extOf, getAudio, mimeForExt, putAudioRecord, readDuration } from '../storage/audioStore';
import { PACKAGE_FORMAT, type ShowPackage } from './format';
import type { Show } from '../types/show';

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ImportError';
  }
}

export interface ImportResult {
  show: Show;
  audioCount: number;
  /** zip 안에 없어서 가져오지 못한 음원 수 */
  missing: number;
  /** 같은 공연이 이미 있어서 새 공연으로 가져왔는지 */
  asNew: boolean;
}

/**
 * .qsign.zip 을 열어 음원은 IndexedDB에, 공연은 localStorage에 복원한다.
 * 같은 id의 공연이 이미 있으면 새 공연으로 가져온다.
 */
export async function importShow(file: File): Promise<ImportResult> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new ImportError('zip 파일을 열 수 없어요. 큐싸인에서 내보낸 파일인지 확인해 주세요.');
  }
  const entry = zip.file('show.json');
  if (!entry) throw new ImportError('큐싸인 공연 파일이 아니에요. (show.json이 없어요)');

  let pkg: ShowPackage;
  try {
    pkg = JSON.parse(await entry.async('string'));
  } catch {
    throw new ImportError('공연 정보(show.json)를 읽을 수 없어요.');
  }
  if (pkg?.format !== PACKAGE_FORMAT || !pkg.show) throw new ImportError('큐싸인 공연 파일이 아니에요.');

  const show = migrateShow(pkg.show);
  const asNew = showExists(show.id);
  if (asNew) {
    show.id = newId('show');
    show.title = `${show.title} (가져옴)`;
    show.createdAt = Date.now();
  }

  // 음원 복원. 같은 id가 이미 있고 크기까지 같으면 그대로 쓰고, 다르면 새 id로 저장한다.
  const remap = new Map<string, string>();
  let audioCount = 0;
  let missing = 0;
  for (const a of pkg.audio ?? []) {
    const f = a.file ? zip.file(a.file) : null;
    if (!f) {
      missing++;
      continue;
    }
    const existing = await getAudio(a.id);
    if (existing && existing.size === a.size) {
      audioCount++;
      continue;
    }
    const data = await f.async('arraybuffer');
    const mime = a.mime || mimeForExt(extOf(a.file));
    const blob = new Blob([data], { type: mime });
    const id = existing ? newId('aud') : a.id;
    if (id !== a.id) remap.set(a.id, id);
    await putAudioRecord({
      id,
      blob,
      name: a.name || a.file.split('/').pop() || 'audio',
      mime,
      size: blob.size,
      duration: a.duration > 0 ? a.duration : await readDuration(blob),
      createdAt: Date.now(),
    });
    audioCount++;
  }

  if (remap.size) {
    for (const s of show.scenes)
      for (const c of s.cues) if (c.audioId && remap.has(c.audioId)) c.audioId = remap.get(c.audioId);
  }

  const saved = saveShow(show);
  return { show: saved, audioCount, missing, asNew };
}
