import JSZip from 'jszip';
import { audioIdsOf, loadShow } from '../storage/showStore';
import { extForRecord, getAudio } from '../storage/audioStore';
import { PACKAGE_FORMAT, PACKAGE_VERSION, type PackageAudio, type ShowPackage } from './format';

export interface ExportResult {
  fileName: string;
  audioCount: number;
  /** 저장소에서 찾지 못한 음원 수 */
  missing: number;
  bytes: number;
}

/** 파일 이름에 쓸 수 없는 글자를 뺀다. */
function safeName(title: string): string {
  const s = title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').replace(/\s+/g, '_').trim();
  return s.slice(0, 60) || '공연';
}

function stamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

/** show.json + audio/{audioId}.{확장자} 를 zip으로 묶어 내려받는다. */
export async function exportShow(showId: string): Promise<ExportResult> {
  const show = loadShow(showId);
  if (!show) throw new Error('공연을 찾을 수 없어요.');

  const zip = new JSZip();
  const audio: PackageAudio[] = [];
  let missing = 0;
  for (const id of audioIdsOf(show)) {
    const rec = await getAudio(id);
    if (!rec) {
      missing++;
      continue;
    }
    const file = `audio/${id}.${extForRecord(rec)}`;
    zip.file(file, rec.blob);
    audio.push({ id, name: rec.name, mime: rec.mime, size: rec.size, duration: rec.duration, file });
  }

  const pkg: ShowPackage = {
    format: PACKAGE_FORMAT,
    version: PACKAGE_VERSION,
    exportedAt: Date.now(),
    app: 'Q-sign',
    show,
    audio,
  };
  zip.file('show.json', JSON.stringify(pkg, null, 2));

  // 음원은 이미 압축된 형식이 많아서 다시 압축하지 않는다(빠름).
  const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE', mimeType: 'application/zip' });
  const fileName = `${safeName(show.title)}_${stamp()}.qsign.zip`;
  download(blob, fileName);
  return { fileName, audioCount: audio.length, missing, bytes: blob.size };
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
