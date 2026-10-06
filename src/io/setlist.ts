import { CUE_META } from '../types/cueMeta';
import { cueHasAudio, type AudioMeta, type CueType, type Show } from '../types/show';
import { flattenCues } from '../lib/showOps';
import { formatDate, formatTime, pad2 } from '../utils/format';

/**
 * 셋리스트: 공연의 신호를 "사람이 읽는 순서표"로 풀어 쓴 것.
 * 텍스트 메모(.txt)와 PDF가 같은 내용을 쓰도록 먼저 이 구조로 만든다.
 */

export interface SetlistCue {
  /** 전체 번호 (1부터) */
  number: number;
  type: CueType;
  /** "노래", "효과음" … */
  typeName: string;
  label: string;
  /** 신호 대사 (없으면 빈 문자열) */
  signal: string;
  /** 음원 파일·길이, 줄이기 대상 같은 보조 정보 (한 줄씩) */
  details: string[];
  /** 음원이 없는 신호 */
  missingAudio: boolean;
}

export interface SetlistScene {
  title: string;
  cues: SetlistCue[];
}

export interface Setlist {
  title: string;
  /** "2026.10.06" */
  dateText: string;
  sceneCount: number;
  cueCount: number;
  scenes: SetlistScene[];
}

const sec = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}초`;

export function buildSetlist(show: Show, audio: Map<string, AudioMeta>): Setlist {
  const flat = flattenCues(show);
  const byId = new Map(flat.map((f) => [f.cue.id, f]));

  const scenes: SetlistScene[] = show.scenes.map((scene, i) => ({
    title: scene.title.trim() || `${i + 1}장`,
    cues: scene.cues.map((cue) => {
      const number = (byId.get(cue.id)?.index ?? 0) + 1;
      const meta = CUE_META[cue.type];
      const details: string[] = [];
      let missingAudio = false;

      if (cueHasAudio(cue.type)) {
        const a = cue.audioId ? audio.get(cue.audioId) : undefined;
        if (a) details.push(`음원: ${a.name} (${formatTime(a.duration)})`);
        else {
          details.push('음원: 없음 — 음원을 넣어 주세요');
          missingAudio = true;
        }
        const opts: string[] = [];
        if (cue.type === 'bgm') opts.push('반복 재생');
        if (cue.volume < 1) opts.push(`볼륨 ${Math.round(cue.volume * 100)}%`);
        if (cue.startAt) opts.push(`${formatTime(cue.startAt)}부터`);
        if (cue.endAt) opts.push(`${formatTime(cue.endAt)}까지`);
        if (cue.fadeIn > 0) opts.push(`처음 ${sec(cue.fadeIn)} 점점 커지기`);
        if (cue.fadeOut > 0) opts.push(`끝에서 ${sec(cue.fadeOut)} 점점 작아지기`);
        if (opts.length) details.push(`설정: ${opts.join(' · ')}`);
      } else {
        const target = cue.targetCueId ? byId.get(cue.targetCueId) : undefined;
        const targetText = target
          ? `${pad2(target.index + 1)} ${target.cue.label || CUE_META[target.cue.type].name}`
          : '나오고 있는 모든 소리';
        details.push(`대상: ${targetText}${cue.type === 'fade' ? ` · ${sec(cue.fadeOut)} 동안` : ''}`);
      }

      return {
        number,
        type: cue.type,
        typeName: meta.name,
        label: cue.label.trim() || `(${meta.name})`,
        signal: cue.signal.trim(),
        details,
        missingAudio,
      };
    }),
  }));

  return {
    title: show.title,
    dateText: formatDate(Date.now()),
    sceneCount: show.scenes.length,
    cueCount: flat.length,
    scenes,
  };
}

/** 메모장에 붙여 넣어도 칸이 맞도록 글자 기호와 들여쓰기만으로 정리한다. */
export function setlistToText(list: Setlist): string {
  const rule = '='.repeat(40);
  const out: string[] = [list.title, `${list.sceneCount}개 장 · 신호 ${list.cueCount}개 · ${list.dateText}`, ''];

  list.scenes.forEach((scene) => {
    out.push(rule, `${scene.title}  (신호 ${scene.cues.length}개)`, rule, '');
    if (scene.cues.length === 0) out.push('  (신호 없음)', '');
    for (const c of scene.cues) {
      out.push(`${pad2(c.number)}  [${c.typeName}] ${c.label}`);
      if (c.signal) out.push(`      대사: ${c.signal}`);
      for (const d of c.details) out.push(`      ${d}`);
      out.push('');
    }
  });

  return out.join('\n').replace(/\n+$/, '\n');
}
