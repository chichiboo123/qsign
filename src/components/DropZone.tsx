import { useRef, useState, type ReactNode } from 'react';
import { ACCEPT_AUDIO, isSupportedAudio } from '../storage/audioStore';

interface Props {
  onFiles: (files: File[]) => void;
  onReject?: (names: string[]) => void;
  multiple?: boolean;
  className?: string;
  children: ReactNode;
  /** 버튼처럼 눌러서 파일 고르기 */
  clickable?: boolean;
  label?: string;
}

/** 음원 파일(mp3, wav, m4a) 끌어다 놓기 영역 */
export function DropZone({ onFiles, onReject, multiple, className = '', children, clickable = true, label }: Props) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const depth = useRef(0);

  const take = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    const ok = files.filter(isSupportedAudio);
    const bad = files.filter((f) => !isSupportedAudio(f)).map((f) => f.name);
    if (bad.length) onReject?.(bad);
    if (ok.length) onFiles(multiple ? ok : ok.slice(0, 1));
  };

  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes('Files');

  return (
    <div
      className={`dropzone ${over ? 'is-over' : ''} ${className}`}
      onDragEnter={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        depth.current++;
        setOver(true);
      }}
      onDragOver={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={(e) => {
        if (!hasFiles(e)) return;
        depth.current = Math.max(0, depth.current - 1);
        if (depth.current === 0) setOver(false);
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        e.stopPropagation();
        depth.current = 0;
        setOver(false);
        take(e.dataTransfer.files);
      }}
      onClick={clickable ? () => inputRef.current?.click() : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                inputRef.current?.click();
              }
            }
          : undefined
      }
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={label}
    >
      {children}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_AUDIO}
        multiple={multiple}
        hidden
        onChange={(e) => {
          take(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
