import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Plus } from 'lucide-react';
import { CUE_META, CUE_TYPE_ORDER } from '../../types/cueMeta';
import type { CueType } from '../../types/show';

/** 신호 종류를 골라 추가하는 메뉴 */
export function AddCueMenu({ onAdd }: { onAdd: (type: CueType) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = ref.current?.closest('.scene');
    scene?.classList.toggle('is-menu-open', open);
    if (!open) return;
    // 메뉴가 화면 아래로 잘리면 보이도록 스크롤
    requestAnimationFrame(() =>
      ref.current?.querySelector('.add-cue__menu')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }),
    );
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="add-cue" ref={ref}>
      <button className="btn btn--sm" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">
        <Plus size={16} aria-hidden="true" /> 신호 추가
      </button>
      {open && (
        <div className="add-cue__menu panel" role="menu">
          {CUE_TYPE_ORDER.map((type) => {
            const m = CUE_META[type];
            const Icon = m.icon;
            return (
              <button
                key={type}
                role="menuitem"
                className="add-cue__item"
                style={{ '--cue': m.color } as CSSProperties}
                onClick={() => {
                  setOpen(false);
                  onAdd(type);
                }}
              >
                <span className="add-cue__icon">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <span>
                  <strong>{m.name}</strong>
                  <span className="add-cue__hint">{m.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
