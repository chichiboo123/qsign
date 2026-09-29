import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

/** 확인창과 알림(토스트)을 앱 어디서나 쓸 수 있게 한다. */

export interface ConfirmOptions {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** 확인 버튼 하나만 (안내창) */
  hideCancel?: boolean;
  /** 넓은 창 */
  wide?: boolean;
}

type ToastKind = 'info' | 'success' | 'error';
interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

interface DialogApi {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  /** 안내만 보여 주는 창 */
  alert: (opts: Omit<ConfirmOptions, 'hideCancel' | 'danger'>) => Promise<void>;
  toast: (text: string, kind?: ToastKind) => void;
}

const DialogContext = createContext<DialogApi | null>(null);

export function useDialog(): DialogApi {
  const api = useContext(DialogContext);
  if (!api) throw new Error('DialogProvider가 필요해요');
  return api;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const confirm = useCallback(
    (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...opts, resolve })),
    [],
  );

  const alert = useCallback(
    (opts: Omit<ConfirmOptions, 'hideCancel' | 'danger'>) =>
      new Promise<void>((resolve) => setPending({ confirmLabel: '알겠어요', ...opts, hideCancel: true, resolve: () => resolve() })),
    [],
  );

  const toast = useCallback((text: string, kind: ToastKind = 'info') => {
    const id = ++seq.current;
    setToasts((t) => [...t, { id, kind, text }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 6000 : 3500);
  }, []);

  const close = (v: boolean) => {
    pending?.resolve(v);
    setPending(null);
  };

  return (
    <DialogContext.Provider value={{ confirm, alert, toast }}>
      {children}
      {pending && <ConfirmDialog {...pending} onClose={close} />}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.kind}`}>
            {t.kind === 'error' ? (
              <AlertTriangle size={18} aria-hidden="true" />
            ) : t.kind === 'success' ? (
              <CheckCircle2 size={18} aria-hidden="true" />
            ) : (
              <Info size={18} aria-hidden="true" />
            )}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </DialogContext.Provider>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  danger,
  hideCancel,
  wide,
  onClose,
}: ConfirmOptions & { onClose: (v: boolean) => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // 창이 열릴 때 한 번만 초점을 옮기고, 닫히면 원래 자리로 돌려준다
  useEffect(() => {
    // 위험한 동작은 "취소"에 먼저 초점을 둔다
    const before = document.activeElement as HTMLElement | null;
    (danger && !hideCancel ? cancelRef : confirmRef).current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeRef.current(false);
      } else if (e.key === 'Tab') {
        // 초점이 창 밖으로 나가지 않게 한다
        const items = boxRef.current?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea');
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
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose(false)}>
      <div
        ref={boxRef}
        className={`modal panel ${wide ? 'modal--wide' : ''}`}
        role={hideCancel ? 'dialog' : 'alertdialog'}
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <button className="btn btn--ghost btn--icon btn--sm modal__x" onClick={() => onClose(false)} aria-label="닫기">
          <X size={18} />
        </button>
        <h2 id="confirm-title" className="modal__title">
          {title}
        </h2>
        {message && <div className="modal__body">{message}</div>}
        <div className="modal__actions">
          {!hideCancel && (
            <button ref={cancelRef} className="btn" onClick={() => onClose(false)}>
              {cancelLabel}
            </button>
          )}
          <button
            ref={confirmRef}
            className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
            onClick={() => onClose(true)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
