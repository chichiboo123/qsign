import { useEffect, useRef, type CSSProperties } from 'react';
import { CUE_META } from '../../types/cueMeta';
import type { FlatCue } from '../../lib/showOps';
import type { Scene } from '../../types/show';
import { pad2 } from '../../utils/format';

interface Props {
  scenes: Scene[];
  flat: FlatCue[];
  cursor: number;
  playingCueIds: Set<string>;
}

/** 넓은 화면 오른쪽: 전체 신호 목록 (읽기 전용) */
export function CueListSidebar({ scenes, flat, cursor, playingCueIds }: Props) {
  const listRef = useRef<HTMLOListElement>(null);

  // 다음 신호가 보이도록 스크롤
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('.side-cue.is-next');
    el?.scrollIntoView({ block: 'center', behavior: 'auto' });
  }, [cursor]);

  const indexOf = new Map(flat.map((f) => [f.cue.id, f.index]));

  return (
    <aside className="side panel" aria-label="전체 신호 목록">
      <span className="eyebrow side__title">Cue Sheet</span>
      <ol className="side__list" ref={listRef}>
        {scenes.map((scene) => (
          <li key={scene.id} className="side__scene">
            <span className="side__scene-title">{scene.title || '이름 없는 장'}</span>
            <ol>
              {scene.cues.map((cue) => {
                const i = indexOf.get(cue.id) ?? 0;
                const meta = CUE_META[cue.type];
                const Icon = meta.icon;
                const state = i === cursor ? 'is-next' : i < cursor ? 'is-done' : '';
                return (
                  <li
                    key={cue.id}
                    className={`side-cue ${state} ${playingCueIds.has(cue.id) ? 'is-playing' : ''}`}
                    style={{ '--cue': meta.color } as CSSProperties}
                    aria-current={i === cursor ? 'step' : undefined}
                  >
                    <span className="side-cue__num mono">{pad2(i + 1)}</span>
                    <Icon size={14} aria-hidden="true" className="side-cue__icon" />
                    <span className="side-cue__label">
                      <span className="sr-only">{meta.name} </span>
                      {cue.label || meta.name}
                    </span>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
    </aside>
  );
}
