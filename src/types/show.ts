export type CueType = 'music' | 'sfx' | 'bgm' | 'fade' | 'stop';

export interface Cue {
  id: string;
  type: CueType;
  /** 신호 이름. 예: "M3 궁금한 게 많아" */
  label: string;
  /** 신호 대사. 예: "궁금쓰가 '저기 봐!'라고 외치면" */
  signal: string;
  /** music, sfx, bgm만 사용 */
  audioId?: string;
  /** 0 ~ 1 */
  volume: number;
  /** 초. fade 신호에서는 fadeOut이 "줄이는 시간"이다 */
  fadeIn: number;
  fadeOut: number;
  /** 초. 1단계는 숫자 입력만 */
  startAt?: number;
  endAt?: number;
  /** 끝나면 다음 신호 자동 실행 (1단계는 저장만) */
  autoNext: boolean;
  /** fade/stop 신호가 줄이거나 멈출 대상. 없으면 전체 */
  targetCueId?: string;
}

export interface Scene {
  id: string;
  /** 예: "2장 · 몰라정류장" */
  title: string;
  cues: Cue[];
}

export interface Show {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  scenes: Scene[];
  /** 저장 형식 버전. 구조가 바뀌면 올리고 migrate에서 옮긴다 */
  schemaVersion: number;
}

/** 공연 목록(qsign:shows)에 들어가는 요약 정보 */
export interface ShowSummary {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  sceneCount: number;
  cueCount: number;
}

/** IndexedDB에 저장하는 음원 */
export interface AudioRecord {
  id: string;
  blob: Blob;
  /** 원래 파일 이름 */
  name: string;
  mime: string;
  size: number;
  /** 초 */
  duration: number;
  createdAt: number;
}

/** 목록 표시용 (Blob 제외) */
export type AudioMeta = Omit<AudioRecord, 'blob'>;

export const SCHEMA_VERSION = 1;

export const AUDIO_CUE_TYPES: readonly CueType[] = ['music', 'sfx', 'bgm'];

export function cueHasAudio(type: CueType): boolean {
  return type === 'music' || type === 'sfx' || type === 'bgm';
}
