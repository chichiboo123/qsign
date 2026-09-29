import { useId } from 'react';

/** Q 심볼: 고리 + 신호 파형(∿) 꼬리. 파비콘(public/favicon.svg)과 같은 모양이다. */
export function QMark({ size = 32, title }: { size?: number; title?: string }) {
  const gid = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <linearGradient id={gid} x1="8" y1="8" x2="58" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#22D3EE" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <g fill="none" stroke={`url(#${gid})`} strokeLinecap="round" strokeLinejoin="round">
        <path strokeWidth="6" d="M38.5 40.5A17 17 0 1 1 42.5 34" />
        <path strokeWidth="5" d="M31 40c3-4 6-4 9 0s6 4 9 0s6-4 9 0" />
      </g>
    </svg>
  );
}

/** "Q-sign" 워드마크 */
export function Logo({ height = 32 }: { height?: number }) {
  const gid = useId();
  return (
    <svg
      height={height}
      viewBox="0 0 198 64"
      role="img"
      aria-label="큐싸인 Q-sign"
      style={{ display: 'block', width: 'auto', flex: 'none' }}
    >
      <defs>
        <linearGradient id={gid} x1="8" y1="0" x2="190" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#22D3EE" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <g fill="none" stroke={`url(#${gid})`} strokeLinecap="round" strokeLinejoin="round">
        <path strokeWidth="6" d="M38.5 40.5A17 17 0 1 1 42.5 34" />
        <path strokeWidth="5" d="M31 40c3-4 6-4 9 0s6 4 9 0s6-4 9 0" />
      </g>
      <text
        x="66"
        y="43"
        fill={`url(#${gid})`}
        fontFamily="'Space Grotesk Variable', 'Space Grotesk', sans-serif"
        fontWeight="700"
        fontSize="36"
        letterSpacing="-0.5"
      >
        -sign
      </text>
    </svg>
  );
}
