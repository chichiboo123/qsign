import { getAudio } from '../storage/audioStore';
import { newId } from '../utils/id';
import type { Cue, CueType } from '../types/show';

/**
 * 큐싸인 재생 엔진
 *
 *  소리(Voice) ─ 개별 GainNode ─┐
 *  소리(Voice) ─ 개별 GainNode ─┼─ 마스터 GainNode ─ AnalyserNode ─ 스피커
 *  소리(Voice) ─ 개별 GainNode ─┘
 *
 * - 효과음과 30초 이하 음원: AudioBuffer로 미리 디코딩 → 누르는 즉시 재생
 * - 30초 넘는 노래·배경 소리: HTMLAudioElement + MediaElementAudioSourceNode
 * - 페이드는 linearRampToValueAtTime
 */

export const BUFFER_MAX_SECONDS = 30;
export const STOP_ALL_FADE_SECONDS = 2;
/** 즉시 멈출 때도 "틱" 소리가 나지 않게 아주 짧게 줄인다 */
const CLICK_GUARD = 0.03;

export type VoiceKind = 'buffer' | 'media';
export type VoiceState = 'playing' | 'fading';
export type EndReason = 'ended' | 'stopped' | 'faded';

export interface VoiceInfo {
  id: string;
  cueId: string;
  cueType: CueType;
  label: string;
  kind: VoiceKind;
  loop: boolean;
  state: VoiceState;
  /** 재생 구간 길이(초). 반복이면 한 바퀴 길이 */
  length: number;
  preview: boolean;
}

interface Voice extends VoiceInfo {
  gain: GainNode;
  volume: number;
  startAt: number;
  endAt: number;
  fadeOut: number;
  /** 버퍼: 시작한 AudioContext 시각 */
  ctxStart: number;
  source?: AudioBufferSourceNode;
  el?: HTMLAudioElement;
  mediaNode?: MediaElementAudioSourceNode;
  /** 미디어: 끝 부분 페이드아웃을 이미 걸었는지 */
  tailFading: boolean;
  stopTimer?: number;
}

export interface PlayableAudio {
  audioId: string;
  /** 초 (저장할 때 읽어 둔 값) */
  duration: number;
}

type Listener = () => void;
export type VoiceEndedHandler = (info: VoiceInfo, reason: EndReason) => void;

export function usesBuffer(type: CueType, duration: number): boolean {
  return type === 'sfx' || (duration > 0 && duration <= BUFFER_MAX_SECONDS);
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private levelData: Float32Array<ArrayBuffer> | null = null;

  private voices = new Map<string, Voice>();
  private snapshot: VoiceInfo[] = [];
  private listeners = new Set<Listener>();
  private endedHandlers = new Set<VoiceEndedHandler>();

  /** 디코딩 끝난 버퍼 (동기 재생용) */
  private buffers = new Map<string, AudioBuffer>();
  private bufferJobs = new Map<string, Promise<AudioBuffer | null>>();
  /** 음원 Blob의 object URL */
  private urls = new Map<string, string>();
  private urlJobs = new Map<string, Promise<string | null>>();
  /** 미리 불러 둔 미디어 요소 (아직 재생 안 한 것) */
  private mediaPool = new Map<string, HTMLAudioElement>();

  private tickTimer: number | null = null;
  private stopAllUntil = 0;
  private masterVolume = 1;

  // ─── 기본 ───

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const Ctx: typeof AudioContext =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx({ latencyHint: 'interactive' });
      const master = ctx.createGain();
      master.gain.value = this.masterVolume;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.6;
      master.connect(analyser);
      analyser.connect(ctx.destination);
      this.ctx = ctx;
      this.master = master;
      this.analyser = analyser;
      this.levelData = new Float32Array(analyser.fftSize);
    }
    return this.ctx;
  }

  /** "공연 시작"·"미리 듣기" 같은 사용자 동작 안에서 호출해야 한다(자동재생 정책). */
  async resume(): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx.state !== 'running') {
      try {
        await ctx.resume();
      } catch {
        /* 사용자 동작이 아니면 실패할 수 있다 */
      }
    }
  }

  get isRunning(): boolean {
    return this.ctx?.state === 'running';
  }

  setMasterVolume(v: number) {
    this.masterVolume = Math.min(1, Math.max(0, v));
    if (this.ctx && this.master) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(this.masterVolume, t, 0.02);
    }
  }

  // ─── 구독 ───

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = (): VoiceInfo[] => this.snapshot;

  /** 소리가 끝났을 때 (2단계 자동 연결에서 사용) */
  onVoiceEnded(fn: VoiceEndedHandler): () => void {
    this.endedHandlers.add(fn);
    return () => this.endedHandlers.delete(fn);
  }

  private emit() {
    this.snapshot = [...this.voices.values()].map((v) => ({
      id: v.id,
      cueId: v.cueId,
      cueType: v.cueType,
      label: v.label,
      kind: v.kind,
      loop: v.loop,
      state: v.state,
      length: v.length,
      preview: v.preview,
    }));
    for (const fn of this.listeners) fn();
  }

  // ─── 음원 준비 ───

  private async urlFor(audioId: string): Promise<string | null> {
    const have = this.urls.get(audioId);
    if (have) return have;
    let job = this.urlJobs.get(audioId);
    if (!job) {
      job = getAudio(audioId).then((rec) => {
        if (!rec) return null;
        const url = URL.createObjectURL(rec.blob);
        this.urls.set(audioId, url);
        return url;
      });
      this.urlJobs.set(audioId, job);
      job.finally(() => this.urlJobs.delete(audioId));
    }
    return job;
  }

  /** AudioBuffer로 디코딩해 메모리에 둔다. */
  loadBuffer(audioId: string): Promise<AudioBuffer | null> {
    const have = this.buffers.get(audioId);
    if (have) return Promise.resolve(have);
    let job = this.bufferJobs.get(audioId);
    if (!job) {
      const ctx = this.ensureContext();
      job = getAudio(audioId)
        .then(async (rec) => {
          if (!rec) return null;
          const data = await rec.blob.arrayBuffer();
          const buf = await ctx.decodeAudioData(data);
          this.buffers.set(audioId, buf);
          return buf;
        })
        .catch(() => null)
        .finally(() => this.bufferJobs.delete(audioId));
      this.bufferJobs.set(audioId, job);
    }
    return job;
  }

  /** 긴 음원을 미디어 요소로 미리 불러 둔다. */
  async loadMedia(audioId: string): Promise<void> {
    if (this.mediaPool.has(audioId)) return;
    const url = await this.urlFor(audioId);
    if (!url || this.mediaPool.has(audioId)) return;
    const el = new Audio();
    el.preload = 'auto';
    el.src = url;
    el.load();
    this.mediaPool.set(audioId, el);
  }

  /** 이 신호를 재생할 준비를 한다. */
  prepare(cue: Pick<Cue, 'type'>, audio: PlayableAudio): Promise<unknown> {
    return usesBuffer(cue.type, audio.duration) ? this.loadBuffer(audio.audioId) : this.loadMedia(audio.audioId);
  }

  isReady(cue: Pick<Cue, 'type'>, audio: PlayableAudio): boolean {
    return usesBuffer(cue.type, audio.duration)
      ? this.buffers.has(audio.audioId)
      : this.mediaPool.has(audio.audioId);
  }

  /** 미리 불러 둔 긴 음원 중 keep에 없는 것은 비운다(메모리 절약). */
  trimMedia(keep: Set<string>) {
    for (const [id, el] of this.mediaPool) {
      if (!keep.has(id)) {
        el.removeAttribute('src');
        el.load();
        this.mediaPool.delete(id);
      }
    }
  }

  /** 음원이 지워졌을 때 캐시에서도 뺀다. */
  forget(audioId: string) {
    this.buffers.delete(audioId);
    const el = this.mediaPool.get(audioId);
    if (el) {
      el.removeAttribute('src');
      this.mediaPool.delete(audioId);
    }
    const url = this.urls.get(audioId);
    const inUse = [...this.voices.values()].some((v) => v.el?.src === url);
    if (url && !inUse) {
      URL.revokeObjectURL(url);
      this.urls.delete(audioId);
    }
  }

  // ─── 재생 ───

  /**
   * 신호의 소리를 재생한다. 버퍼가 준비돼 있으면 기다리지 않고 바로 소리가 난다.
   * 반환값: 새 소리 id (실패하면 null)
   */
  async play(cue: Cue, audio: PlayableAudio, opts: { preview?: boolean } = {}): Promise<string | null> {
    const ctx = this.ensureContext();
    if (ctx.state !== 'running') void this.resume();

    const loop = cue.type === 'bgm';
    const volume = Math.min(1, Math.max(0, cue.volume));
    const gain = ctx.createGain();
    gain.connect(this.master!);

    if (usesBuffer(cue.type, audio.duration)) {
      const buffer = this.buffers.get(audio.audioId) ?? (await this.loadBuffer(audio.audioId));
      if (!buffer) {
        gain.disconnect();
        return null;
      }
      const full = buffer.duration;
      const startAt = clampTime(cue.startAt ?? 0, 0, full);
      const endAt = clampTime(cue.endAt ?? full, startAt, full) || full;
      const length = Math.max(0.01, endAt - startAt);

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(gain);
      const t0 = ctx.currentTime;
      if (loop) {
        src.loop = true;
        src.loopStart = startAt;
        src.loopEnd = endAt;
        src.start(t0, startAt);
      } else {
        src.start(t0, startAt, length);
      }

      const voice: Voice = {
        id: newId('v'),
        cueId: cue.id,
        cueType: cue.type,
        label: cue.label,
        kind: 'buffer',
        loop,
        state: 'playing',
        length,
        preview: !!opts.preview,
        gain,
        volume,
        startAt,
        endAt,
        fadeOut: cue.fadeOut,
        ctxStart: t0,
        source: src,
        tailFading: false,
      };
      this.applyEnvelope(voice, cue.fadeIn, loop ? 0 : cue.fadeOut, t0, loop ? Infinity : length);
      src.onended = () => this.finish(voice.id, voice.state === 'fading' ? 'faded' : 'ended');
      this.voices.set(voice.id, voice);
      this.emit();
      return voice.id;
    }

    // 긴 음원: 미디어 요소
    let el = this.mediaPool.get(audio.audioId);
    if (el) {
      this.mediaPool.delete(audio.audioId);
    } else {
      const url = await this.urlFor(audio.audioId);
      if (!url) {
        gain.disconnect();
        return null;
      }
      el = new Audio();
      el.preload = 'auto';
      el.src = url;
    }
    const full = audio.duration || el.duration || 0;
    const startAt = clampTime(cue.startAt ?? 0, 0, full || Infinity);
    const endAt = cue.endAt && cue.endAt > startAt ? Math.min(cue.endAt, full || cue.endAt) : full;
    const length = Math.max(0.01, (endAt || 0) - startAt);

    const node = ctx.createMediaElementSource(el);
    node.connect(gain);
    el.loop = loop && !cue.endAt && !cue.startAt;
    if (startAt > 0) {
      if (el.readyState < HTMLMediaElement.HAVE_METADATA) await once(el, 'loadedmetadata');
      el.currentTime = startAt;
    }

    const voice: Voice = {
      id: newId('v'),
      cueId: cue.id,
      cueType: cue.type,
      label: cue.label,
      kind: 'media',
      loop,
      state: 'playing',
      length,
      preview: !!opts.preview,
      gain,
      volume,
      startAt,
      endAt: endAt || Infinity,
      fadeOut: loop ? 0 : cue.fadeOut,
      ctxStart: ctx.currentTime,
      el,
      mediaNode: node,
      tailFading: false,
    };
    this.applyEnvelope(voice, cue.fadeIn, 0, ctx.currentTime, Infinity);
    el.onended = () => this.finish(voice.id, voice.state === 'fading' ? 'faded' : 'ended');
    this.voices.set(voice.id, voice);
    this.emit();
    this.ensureTick();
    try {
      await el.play();
    } catch {
      this.finish(voice.id, 'stopped');
      return null;
    }
    return voice.id;
  }

  /** 페이드 인/아웃 모양을 예약한다. */
  private applyEnvelope(v: Voice, fadeIn: number, fadeOut: number, t0: number, length: number) {
    const g = v.gain.gain;
    const fi = Math.max(0, fadeIn);
    let fo = Math.max(0, fadeOut);
    if (Number.isFinite(length) && fi + fo > length) fo = Math.max(0, length - fi);
    if (fi > 0) {
      g.setValueAtTime(0, t0);
      g.linearRampToValueAtTime(v.volume, t0 + fi);
    } else {
      g.setValueAtTime(v.volume, t0);
    }
    if (fo > 0 && Number.isFinite(length)) {
      g.setValueAtTime(v.volume, t0 + length - fo);
      g.linearRampToValueAtTime(0, t0 + length);
    }
  }

  /** 긴 음원의 끝 지점·반복·끝 페이드 처리 (50ms마다) */
  private ensureTick() {
    if (this.tickTimer !== null) return;
    this.tickTimer = window.setInterval(() => {
      let mediaCount = 0;
      for (const v of this.voices.values()) {
        if (v.kind !== 'media' || !v.el) continue;
        mediaCount++;
        const t = v.el.currentTime;
        if (Number.isFinite(v.endAt) && t >= v.endAt - 0.02) {
          if (v.loop) {
            v.el.currentTime = v.startAt;
          } else if (v.state !== 'fading') {
            this.hardStop(v, 'ended');
          }
          continue;
        }
        if (!v.loop && !v.tailFading && v.fadeOut > 0 && v.state === 'playing' && Number.isFinite(v.endAt)) {
          const remain = v.endAt - t;
          if (remain <= v.fadeOut) {
            v.tailFading = true;
            this.rampTo(v, 0, Math.max(0.05, remain));
          }
        }
      }
      if (mediaCount === 0 && this.tickTimer !== null) {
        clearInterval(this.tickTimer);
        this.tickTimer = null;
      }
    }, 50);
  }

  private rampTo(v: Voice, value: number, seconds: number) {
    const ctx = this.ctx!;
    const g = v.gain.gain;
    const t = ctx.currentTime;
    const current = g.value;
    g.cancelScheduledValues(t);
    g.setValueAtTime(current, t);
    g.linearRampToValueAtTime(value, t + Math.max(0.01, seconds));
  }

  /** 줄이면서 끝낸다. */
  private fadeVoice(v: Voice, seconds: number) {
    if (!this.ctx) return;
    if (v.stopTimer) clearTimeout(v.stopTimer);
    v.state = 'fading';
    this.rampTo(v, 0, seconds);
    v.stopTimer = window.setTimeout(() => this.hardStop(v, 'faded'), seconds * 1000 + 40);
  }

  /** 목록에서 바로 빼고, 아주 짧게 줄인 뒤 실제로 멈춘다. */
  private hardStop(v: Voice, reason: EndReason) {
    if (!this.voices.has(v.id)) return;
    this.voices.delete(v.id);
    this.emitEnded(v, reason);
    this.emit();
    if (this.ctx) this.rampTo(v, 0, CLICK_GUARD);
    window.setTimeout(() => {
      try {
        v.source?.stop();
      } catch {
        /* 이미 멈춤 */
      }
      this.cleanup(v);
    }, CLICK_GUARD * 1000 + 10);
  }

  /** 소리가 스스로 끝났을 때 */
  private finish(id: string, reason: EndReason) {
    const v = this.voices.get(id);
    if (!v) return;
    this.voices.delete(id);
    this.emitEnded(v, reason);
    this.emit();
    this.cleanup(v);
  }

  private cleanup(v: Voice) {
    if (v.stopTimer) clearTimeout(v.stopTimer);
    try {
      v.source?.disconnect();
    } catch {
      /* 무시 */
    }
    if (v.el) {
      v.el.onended = null;
      v.el.pause();
      v.el.removeAttribute('src');
      v.el.load();
    }
    try {
      v.mediaNode?.disconnect();
      v.gain.disconnect();
    } catch {
      /* 무시 */
    }
  }

  private emitEnded(v: Voice, reason: EndReason) {
    const info: VoiceInfo = {
      id: v.id,
      cueId: v.cueId,
      cueType: v.cueType,
      label: v.label,
      kind: v.kind,
      loop: v.loop,
      state: v.state,
      length: v.length,
      preview: v.preview,
    };
    for (const fn of this.endedHandlers) fn(info, reason);
  }

  // ─── 줄이기·멈추기 ───

  private match(targetCueId?: string): Voice[] {
    const all = [...this.voices.values()].filter((v) => !v.preview);
    return targetCueId ? all.filter((v) => v.cueId === targetCueId) : all;
  }

  /** 스르륵 줄이기: 대상(없으면 전체)을 seconds 동안 줄여서 끈다. */
  fade(targetCueId: string | undefined, seconds: number) {
    const s = Math.max(0.05, seconds);
    for (const v of this.match(targetCueId)) this.fadeVoice(v, s);
    this.emit();
  }

  /** 멈춤: 대상(없으면 전체)을 바로 멈춘다. */
  stop(targetCueId?: string) {
    for (const v of this.match(targetCueId)) this.hardStop(v, 'stopped');
  }

  /** 소리 하나 멈춤 (재생 목록의 개별 멈춤 버튼) */
  stopVoice(voiceId: string) {
    const v = this.voices.get(voiceId);
    if (v) this.hardStop(v, 'stopped');
  }

  /**
   * 모두 멈춤: 2초 동안 부드럽게 줄여서 끈다.
   * 줄이는 도중에 한 번 더 누르면 바로 멈춘다.
   * 반환값: 'fade' | 'hard'
   */
  stopAll(): 'fade' | 'hard' {
    const now = performance.now();
    const voices = [...this.voices.values()];
    if (now < this.stopAllUntil) {
      this.stopAllUntil = 0;
      for (const v of voices) this.hardStop(v, 'stopped');
      return 'hard';
    }
    this.stopAllUntil = now + STOP_ALL_FADE_SECONDS * 1000;
    for (const v of voices) this.fadeVoice(v, STOP_ALL_FADE_SECONDS);
    this.emit();
    return 'fade';
  }

  /** "모두 멈춤"으로 줄이는 중인지 */
  get isStoppingAll(): boolean {
    return performance.now() < this.stopAllUntil && this.voices.size > 0;
  }

  /** 미리 듣기 소리만 멈춤 */
  stopPreview() {
    for (const v of this.voices.values()) if (v.preview) this.hardStop(v, 'stopped');
  }

  /** 모든 소리를 즉시 끄고 미리 불러 둔 것도 비운다(공연 모드 나갈 때). */
  reset() {
    for (const v of [...this.voices.values()]) this.hardStop(v, 'stopped');
    this.trimMedia(new Set());
    this.stopAllUntil = 0;
  }

  // ─── 진행 상황·레벨 ───

  /** 재생 위치: 구간 시작부터 지난 시간(초) */
  getElapsed(voiceId: string): number {
    const v = this.voices.get(voiceId);
    if (!v) return 0;
    if (v.kind === 'media' && v.el) return Math.max(0, v.el.currentTime - v.startAt);
    if (!this.ctx) return 0;
    const e = this.ctx.currentTime - v.ctxStart;
    return v.loop ? e % v.length : Math.min(e, v.length);
  }

  /** 원래 음원 파일 기준 재생 위치(초). 시작 지점을 정할 때 쓴다 */
  getPosition(voiceId: string): number {
    const v = this.voices.get(voiceId);
    if (!v) return 0;
    return v.startAt + this.getElapsed(voiceId);
  }

  /** 마스터 출력 레벨 (0~1, 피크) */
  getLevel(): number {
    if (!this.analyser || !this.levelData) return 0;
    this.analyser.getFloatTimeDomainData(this.levelData);
    let peak = 0;
    for (let i = 0; i < this.levelData.length; i++) {
      const a = Math.abs(this.levelData[i]);
      if (a > peak) peak = a;
    }
    return Math.min(1, peak);
  }

  get hasVoices(): boolean {
    return this.voices.size > 0;
  }
}

function once(el: HTMLMediaElement, type: string): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      el.removeEventListener(type, done);
      el.removeEventListener('error', done);
      resolve();
    };
    el.addEventListener(type, done);
    el.addEventListener('error', done);
  });
}

function clampTime(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, v));
}

export const engine = new AudioEngine();

if (import.meta.env.DEV) {
  (window as unknown as { qsignEngine: AudioEngine }).qsignEngine = engine;
}
