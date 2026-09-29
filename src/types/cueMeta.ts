import { Music, Repeat, Square, TrendingDown, Zap, type LucideIcon } from 'lucide-react';
import type { CueType } from './show';

export interface CueMeta {
  /** 화면에 보이는 쉬운 이름 */
  name: string;
  /** 짧은 설명 (신호 추가 메뉴) */
  hint: string;
  /** CSS 변수 */
  color: string;
  icon: LucideIcon;
}

export const CUE_META: Record<CueType, CueMeta> = {
  music: { name: '노래', hint: 'MR을 재생해요', color: 'var(--cue-music)', icon: Music },
  sfx: { name: '효과음', hint: '바로 재생, 다른 소리와 겹쳐도 돼요', color: 'var(--cue-sfx)', icon: Zap },
  bgm: { name: '배경 소리', hint: '계속 반복해서 재생해요', color: 'var(--cue-bgm)', icon: Repeat },
  fade: { name: '스르륵 줄이기', hint: '소리를 천천히 줄여서 꺼요', color: 'var(--cue-fade)', icon: TrendingDown },
  stop: { name: '멈춤', hint: '소리를 바로 멈춰요', color: 'var(--cue-stop)', icon: Square },
};

export const CUE_TYPE_ORDER: CueType[] = ['music', 'sfx', 'bgm', 'fade', 'stop'];
