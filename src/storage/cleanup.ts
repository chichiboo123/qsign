import { audioIdsOf, loadAllShows } from './showStore';
import { deleteAudio, listAudioMeta } from './audioStore';
import type { AudioMeta } from '../types/show';

/** 저장된 모든 공연에서 쓰는 음원 id */
function referencedAudioIds(): Set<string> {
  const used = new Set<string>();
  for (const show of loadAllShows()) for (const id of audioIdsOf(show)) used.add(id);
  return used;
}

/**
 * 더 이상 어떤 신호에서도 쓰지 않으면 음원을 지운다.
 * (공연을 먼저 저장한 뒤 호출해야 한다)
 */
export async function releaseAudio(ids: Iterable<string>): Promise<void> {
  const used = referencedAudioIds();
  for (const id of ids) {
    if (!used.has(id)) await deleteAudio(id);
  }
}

/** 어떤 신호에서도 쓰지 않는 음원 목록 */
export async function findUnusedAudio(): Promise<AudioMeta[]> {
  const used = referencedAudioIds();
  return (await listAudioMeta()).filter((m) => !used.has(m.id));
}

/** 안 쓰는 음원을 모두 지우고 지운 개수와 크기를 돌려준다. */
export async function deleteUnusedAudio(): Promise<{ count: number; bytes: number }> {
  const unused = await findUnusedAudio();
  for (const m of unused) await deleteAudio(m.id);
  return { count: unused.length, bytes: unused.reduce((n, m) => n + m.size, 0) };
}
