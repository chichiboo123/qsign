import type { CSSProperties } from 'react';
import { CUE_META } from '../types/cueMeta';
import type { CueType } from '../types/show';

/** 신호 종류 표시: 색만으로 구분하지 않도록 아이콘과 이름을 항상 함께 보여준다. */
export function CueTypeBadge({ type, size = 'md' }: { type: CueType; size?: 'sm' | 'md' | 'lg' }) {
  const meta = CUE_META[type];
  const Icon = meta.icon;
  const iconSize = size === 'lg' ? 20 : size === 'sm' ? 13 : 15;
  return (
    <span className={`cue-badge cue-badge--${size}`} style={{ '--cue': meta.color } as CSSProperties}>
      <Icon size={iconSize} aria-hidden="true" strokeWidth={2.4} />
      {meta.name}
    </span>
  );
}
