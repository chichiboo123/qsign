import { useEffect, useState } from 'react';

/** "90", "1:30", "1:30.5" → 초. 비어 있으면 undefined, 잘못되면 null */
export function parseTime(text: string): number | undefined | null {
  const t = text.trim();
  if (!t) return undefined;
  const parts = t.split(':');
  if (parts.length > 3) return null;
  let sec = 0;
  for (const p of parts) {
    if (!/^\d+(\.\d+)?$/.test(p)) return null;
    sec = sec * 60 + parseFloat(p);
  }
  return sec;
}

/** 초 → "1:30" / "1:30.5" / "12" */
export function showTime(sec: number | undefined): string {
  if (sec === undefined) return '';
  const m = Math.floor(sec / 60);
  const s = Math.round((sec - m * 60) * 10) / 10;
  const ss = s < 10 ? `0${s}` : `${s}`;
  return m > 0 ? `${m}:${ss}` : `${s}`;
}

interface Props {
  id?: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  placeholder?: string;
  invalid?: boolean;
}

/** 시간(초) 입력: 90 또는 1:30 형식 모두 받는다. */
export function TimeInput({ id, value, onChange, placeholder, invalid }: Props) {
  const [text, setText] = useState(showTime(value));
  const [bad, setBad] = useState(false);

  useEffect(() => {
    setText(showTime(value));
    setBad(false);
  }, [value]);

  const commit = () => {
    const v = parseTime(text);
    if (v === null) {
      setBad(true);
      return;
    }
    setBad(false);
    if (v !== value) onChange(v);
    else setText(showTime(value));
  };

  return (
    <input
      id={id}
      className={`input mono ${bad || invalid ? 'is-invalid' : ''}`}
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      aria-invalid={bad || invalid || undefined}
    />
  );
}
