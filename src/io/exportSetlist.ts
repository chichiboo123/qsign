import { loadShow } from '../storage/showStore';
import { getAudioMetaMap } from '../storage/audioStore';
import { download, safeName, stamp } from './download';
import { buildSetlist, setlistToText } from './setlist';

export type SetlistFormat = 'txt' | 'pdf';

/** 공연의 셋리스트를 텍스트(메모) 또는 PDF 파일로 내려받는다. */
export async function exportSetlist(showId: string, format: SetlistFormat): Promise<{ fileName: string }> {
  const show = loadShow(showId);
  if (!show) throw new Error('공연을 찾을 수 없어요.');
  const list = buildSetlist(show, await getAudioMetaMap());
  const fileName = `${safeName(show.title)}_셋리스트_${stamp()}.${format}`;

  if (format === 'txt') {
    // 맨 앞의 BOM: 윈도우 메모장이 한글을 UTF-8로 바르게 읽게 한다
    const blob = new Blob(['﻿', setlistToText(list)], { type: 'text/plain;charset=utf-8' });
    download(blob, fileName);
  } else {
    // PDF 그리기는 처음 쓸 때만 불러온다
    const { buildSetlistPdf } = await import('./setlistPdf');
    download(await buildSetlistPdf(list), fileName);
  }
  return { fileName };
}
