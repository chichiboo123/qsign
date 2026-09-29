import type { Show } from '../types/show';

/** 공연 파일(.qsign.zip) 안의 show.json 형식 */
export const PACKAGE_FORMAT = 'qsign-show';
export const PACKAGE_VERSION = 1;

export interface PackageAudio {
  id: string;
  name: string;
  mime: string;
  size: number;
  duration: number;
  /** zip 안의 경로: audio/{id}.{확장자} */
  file: string;
}

export interface ShowPackage {
  format: typeof PACKAGE_FORMAT;
  version: number;
  exportedAt: number;
  app: string;
  show: Show;
  audio: PackageAudio[];
}
