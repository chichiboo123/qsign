import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { Modal } from './Modal';

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
  return (
    <Modal
      title={title}
      wide={wide}
      role={hideCancel ? 'dialog' : 'alertdialog'}
      onClose={() => onClose(false)}
      // 위험한 동작은 "취소"에 먼저 초점을 둔다
      initialFocus={danger && !hideCancel ? cancelRef : confirmRef}
      actions={
        <>
          {!hideCancel && (
            <button ref={cancelRef} className="btn" onClick={() => onClose(false)}>
              {cancelLabel}
            </button>
          )}
          <button ref={confirmRef} className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={() => onClose(true)}>
            {confirmLabel}
          </button>
        </>
      }
    >
      {message}
    </Modal>
  );
}
