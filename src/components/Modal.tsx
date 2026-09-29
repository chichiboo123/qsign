import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { X } from 'lucide-react';

interface Props {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** 아래쪽 버튼 줄 */
  actions?: ReactNode;
  wide?: boolean;
  /** 열릴 때 처음 초점을 둘 곳 (없으면 닫기 버튼) */
  initialFocus?: RefObject<HTMLElement | null>;
  role?: 'dialog' | 'alertdialog';
}

let seq = 0;

/**
 * 공통 창 틀: 뒤를 어둡게 덮고, Esc로 닫고, Tab 초점이 창 밖으로 나가지 않게 한다.
 * 닫히면 원래 초점 자리로 돌려준다.
 */
export function Modal({ title, onClose, children, actions, wide, initialFocus, role = 'dialog' }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useRef(`modal-title-${++seq}`).current;

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    (initialFocus?.current ?? closeBtnRef.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      // 창이 여러 개 겹치면 맨 위 창만 반응한다
      const all = document.querySelectorAll('.modal');
      if (all[all.length - 1] !== boxRef.current) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeRef.current();
      } else if (e.key === 'Tab') {
        const items = boxRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input, select, textarea, summary',
        );
        if (!items || items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      before?.focus?.();
    };
  }, []); // 열릴 때 한 번만

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={boxRef}
        className={`modal panel ${wide ? 'modal--wide' : ''}`}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button ref={closeBtnRef} className="btn btn--ghost btn--icon btn--sm modal__x" onClick={onClose} aria-label="닫기">
          <X size={18} />
        </button>
        <h2 id={titleId} className="modal__title">
          {title}
        </h2>
        <div className="modal__body">{children}</div>
        {actions && <div className="modal__actions">{actions}</div>}
      </div>
    </div>
  );
}
