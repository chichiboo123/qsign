import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ListMusic } from 'lucide-react';
import { SetlistMenuItems } from '../../components/SetlistMenuItems';
import type { SetlistFormat } from '../../io/exportSetlist';

/** 편집 화면 머리줄의 [셋리스트] 내려받기 단추 */
export function SetlistMenu({
  disabled,
  busy,
  onPick,
}: {
  disabled?: boolean;
  busy?: boolean;
  onPick: (format: SetlistFormat) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
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
    <div className="more-menu" ref={ref}>
      <button
        className="btn btn--sm"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="menu"
        title={disabled ? '신호를 만들면 셋리스트를 저장할 수 있어요' : '셋리스트를 PDF나 메모로 저장'}
      >
        <ListMusic size={16} aria-hidden="true" />
        <span className="hide-sm">셋리스트</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div className="more-menu__list panel" role="menu">
          <SetlistMenuItems
            disabled={busy}
            onPick={(format) => {
              setOpen(false);
              onPick(format);
            }}
          />
        </div>
      )}
    </div>
  );
}
