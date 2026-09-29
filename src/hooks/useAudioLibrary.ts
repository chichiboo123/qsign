import { useCallback, useEffect, useState } from 'react';
import { getAudioMetaMap } from '../storage/audioStore';
import type { AudioMeta } from '../types/show';

/** 저장된 음원의 이름·길이·크기 목록 */
export function useAudioLibrary() {
  const [map, setMap] = useState<Map<string, AudioMeta>>(new Map());
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const m = await getAudioMetaMap();
    setMap(m);
    setLoaded(true);
    return m;
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const add = useCallback((meta: AudioMeta) => {
    setMap((m) => new Map(m).set(meta.id, meta));
  }, []);

  return { map, loaded, reload, add };
}
