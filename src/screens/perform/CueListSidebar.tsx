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
  /** 누르면 그 신호로 순서만 옮긴다 (소리는 나지 않음) */
  onPick: (index: number) => void;
}

/** 넓은 화면 오른쪽: 전체 신호 목록 */
export function CueListSidebar({ scenes, flat, cursor, playingCueIds, onPick }: Props) {
  const listRef = useRef<HTMLOListElement>(null);

  // 다음 신호가 보이도록 목록만 스크롤 (페이지는 움직이지 않게)
  useEffect(() => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>('.side-cue.is-next');
    if (!list || !el) return;
    const top = el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2;
    list.scrollTop = Math.max(0, top);
  }, [cursor]);

  const indexOf = new Map(flat.map((f) => [f.cue.id, f.index]));

  return (
    <aside className="side panel" aria-label="전체 신호 목록">
      <div className="side__head">
        <span className="eyebrow">Cue Sheet · 전체 신호</span>
        <span className="side__hint">눌러서 옮기기 (소리 안 나요)</span>
      </div>
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
                  <li key={cue.id}>
                    <button
                      className={`side-cue ${state} ${playingCueIds.has(cue.id) ? 'is-playing' : ''}`}
                      style={{ '--cue': meta.color } as CSSProperties}
                      aria-current={i === cursor ? 'step' : undefined}
                      onClick={(e) => {
                        onPick(i);
                        e.currentTarget.blur();
                      }}
                      title={`${pad2(i + 1)}번 신호로 옮기기 (소리는 나지 않아요)`}
                    >
                      <span className="side-cue__num mono">{pad2(i + 1)}</span>
                      <Icon size={15} aria-hidden="true" className="side-cue__icon" />
                      <span className="side-cue__label">
                        <span className="sr-only">{meta.name} </span>
                        {cue.label || meta.name}
                      </span>
                      {playingCueIds.has(cue.id) && <span className="side-cue__tag side-cue__tag--play">재생 중</span>}
                      {i === cursor && <span className="side-cue__tag">다음</span>}
                    </button>
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
