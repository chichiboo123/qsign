import type { CueType } from '../types/show';
import { pad2 } from '../utils/format';
import type { Setlist, SetlistCue } from './setlist';

/**
 * 셋리스트 PDF (A4 세로).
 * 앱에 들어 있는 Pretendard 글꼴로 쪽마다 그림(JPEG)을 그려서 PDF 한 파일로 묶는다.
 * - 글꼴 파일·PDF 도구를 따로 받지 않아서 인터넷 없이도, 윈도우 프로그램에서도 똑같이 된다.
 * - 인쇄해서 무대 옆에 둘 수 있도록 글자를 크게, 번호·종류·대사를 한눈에 보이게 잡았다.
 * 길이 단위는 pt(1/72인치). 그림은 3배(약 215dpi)로 그려서 인쇄해도 또렷하다.
 */

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const SCALE = 3;
const MARGIN_X = 44;
const MARGIN_TOP = 48;
const MARGIN_BOTTOM = 56;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

/** 번호 칸 너비. 본문은 이 오른쪽부터 시작한다 */
const NUM_W = 40;
const BODY_X = MARGIN_X + NUM_W;
const BODY_W = CONTENT_W - NUM_W;

const INK = '#17191f';
const MUTED = '#6b7585';
const LINE = '#d6dbe4';
const DANGER = '#bf1a33';

/** 흰 종이에 인쇄해도 잘 보이는 진한 색 */
const TYPE_COLOR: Record<CueType, string> = {
  music: '#0369a1',
  sfx: '#b45309',
  bgm: '#4d7c0f',
  fade: '#6d28d9',
  stop: '#475569',
};

const FAMILY = '"Pretendard Variable", Pretendard, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';
const font = (weight: 400 | 700, size: number) => `${weight} ${size}px ${FAMILY}`;

/** 글자 단위로 줄을 나눈다. 한국어는 어디서든 끊어도 읽을 수 있고, 띄어쓰기에서 끊을 수 있으면 거기서 끊는다. */
function wrap(text: string, width: (s: string) => number, maxW: number): string[] {
  const lines: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    let line = '';
    let lastSpace = -1;
    for (const ch of para) {
      const next = line + ch;
      if (line && width(next) > maxW) {
        if (ch === ' ') {
          lines.push(line);
          line = '';
        } else if (lastSpace > 0) {
          lines.push(line.slice(0, lastSpace));
          line = line.slice(lastSpace + 1) + ch;
        } else {
          lines.push(line);
          line = ch;
        }
        lastSpace = -1;
        continue;
      }
      if (ch === ' ') lastSpace = next.length - 1;
      line = next;
    }
    lines.push(line);
  }
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 종류 색을 흰색과 섞은 연한 색 */
function tint(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(255 - (255 - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** 셋리스트를 그려서 쪽마다 JPEG로 돌려준다. */
async function renderPages(list: Setlist): Promise<Blob[]> {
  // 글꼴은 필요한 글자 조각만 불러오는 방식이라, 쓸 글자를 미리 불러 둔다
  const sample = [
    list.title,
    ...list.scenes.flatMap((s) => [s.title, ...s.cues.flatMap((c) => [c.label, c.signal, c.typeName, ...c.details])]),
    '0123456789 ·()[]:/%',
  ].join('');
  await Promise.all([document.fonts.load(font(400, 12), sample), document.fonts.load(font(700, 12), sample)]);

  const canvases: HTMLCanvasElement[] = [];
  let ctx!: CanvasRenderingContext2D;
  let y = 0;

  const newPage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(PAGE_W * SCALE);
    canvas.height = Math.round(PAGE_H * SCALE);
    const c = canvas.getContext('2d');
    if (!c) throw new Error('canvas');
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.scale(SCALE, SCALE);
    c.textBaseline = 'middle';
    canvases.push(canvas);
    ctx = c;
    y = MARGIN_TOP;
  };

  const measure = (weight: 400 | 700, size: number) => (s: string) => {
    ctx.font = font(weight, size);
    return ctx.measureText(s).width;
  };

  /** 높이가 lh인 한 줄의 가운데에 글자를 그린다 */
  const text = (s: string, x: number, top: number, weight: 400 | 700, size: number, color = INK, lh = size * 1.45) => {
    ctx.font = font(weight, size);
    ctx.fillStyle = color;
    ctx.fillText(s, x, top + lh / 2);
  };

  const hline = (yy: number, color: string, w: number) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(MARGIN_X, yy);
    ctx.lineTo(PAGE_W - MARGIN_X, yy);
    ctx.stroke();
  };

  const room = (h: number) => y + h <= PAGE_H - MARGIN_BOTTOM;

  // ─── 맨 위: 제목 ───
  newPage();
  const TITLE = 22;
  for (const l of wrap(list.title, measure(700, TITLE), CONTENT_W)) {
    text(l, MARGIN_X, y, 700, TITLE, INK, TITLE * 1.35);
    y += TITLE * 1.35;
  }
  y += 2;
  text(`셋리스트  ·  ${list.sceneCount}개 장  ·  신호 ${list.cueCount}개  ·  ${list.dateText}`, MARGIN_X, y, 400, 11, MUTED);
  y += 11 * 1.45 + 8;
  hline(y, INK, 1.2);
  y += 14;

  // ─── 장 머리줄 ───
  const SCENE_H = 28;
  const sceneHeader = (title: string, count: number, cont: boolean) => {
    roundRect(ctx, MARGIN_X, y, CONTENT_W, SCENE_H, 6);
    ctx.fillStyle = '#eaeef6';
    ctx.fill();
    ctx.strokeStyle = '#c7d0df';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    text(cont ? `${title} (계속)` : title, MARGIN_X + 12, y, 700, 14, INK, SCENE_H);
    const right = `신호 ${count}개`;
    text(right, PAGE_W - MARGIN_X - 12 - measure(400, 10.5)(right), y, 400, 10.5, MUTED, SCENE_H);
    y += SCENE_H + 6;
  };

  // ─── 신호 한 칸 ───
  const NAME = 13.5;
  const SIGNAL = 12;
  const INFO = 9.5;
  const PAD = 8;
  const NAME_LH = NAME * 1.4;
  const SIGNAL_LH = SIGNAL * 1.5;
  const INFO_LH = INFO * 1.55;

  const layout = (c: SetlistCue) => {
    const badgeW = measure(700, 9.5)(c.typeName) + 14;
    const nameX = BODY_X + badgeW + 8;
    const nameLines = wrap(c.label, measure(700, NAME), MARGIN_X + CONTENT_W - nameX);
    const signalLines = c.signal ? wrap(c.signal, measure(400, SIGNAL), BODY_W - 6) : [];
    const detailLines = c.details.flatMap((d) => wrap(d, measure(400, INFO), BODY_W - 6));
    const h =
      PAD +
      nameLines.length * NAME_LH +
      (signalLines.length ? 3 + signalLines.length * SIGNAL_LH : 0) +
      (detailLines.length ? 3 + detailLines.length * INFO_LH : 0) +
      PAD;
    return { badgeW, nameX, nameLines, signalLines, detailLines, h };
  };

  const drawCue = (c: SetlistCue, m: ReturnType<typeof layout>) => {
    const color = TYPE_COLOR[c.type];
    let top = y + PAD;

    // 번호
    text(pad2(c.number), MARGIN_X, top, 700, 19, INK, NAME_LH);

    // 종류 표
    const bh = 15;
    const by = top + (NAME_LH - bh) / 2;
    roundRect(ctx, BODY_X, by, m.badgeW, bh, 3);
    ctx.fillStyle = tint(color, 0.12);
    ctx.fill();
    ctx.strokeStyle = tint(color, 0.7);
    ctx.lineWidth = 0.8;
    ctx.stroke();
    text(c.typeName, BODY_X + 7, by, 700, 9.5, color, bh);

    // 이름
    m.nameLines.forEach((l, i) => text(l, m.nameX, top + i * NAME_LH, 700, NAME, INK, NAME_LH));
    top += m.nameLines.length * NAME_LH;

    // 대사
    if (m.signalLines.length) {
      top += 3;
      m.signalLines.forEach((l, i) => text(l, BODY_X, top + i * SIGNAL_LH, 400, SIGNAL, INK, SIGNAL_LH));
      top += m.signalLines.length * SIGNAL_LH;
    }

    // 음원·설정
    if (m.detailLines.length) {
      top += 3;
      m.detailLines.forEach((l, i) => {
        const bad = c.missingAudio && l.startsWith('음원:');
        text(l, BODY_X, top + i * INFO_LH, 400, INFO, bad ? DANGER : MUTED, INFO_LH);
      });
    }

    y += m.h;
    hline(y, LINE, 0.6);
  };

  // ─── 장마다 차례로 ───
  for (const scene of list.scenes) {
    const rows = scene.cues.map((c) => ({ c, m: layout(c) }));
    // 장 머리줄만 쪽 맨 아래에 남지 않게, 첫 신호와 함께 다음 쪽으로 옮긴다
    if (!room(SCENE_H + 6 + (rows[0]?.m.h ?? 0))) newPage();
    sceneHeader(scene.title, scene.cues.length, false);
    if (!rows.length) {
      text('(신호 없음)', BODY_X, y, 400, 11, MUTED);
      y += 11 * 1.45 + 10;
    }
    for (const { c, m } of rows) {
      if (!room(m.h)) {
        newPage();
        sceneHeader(scene.title, scene.cues.length, true);
      }
      drawCue(c, m);
    }
    y += 14;
  }

  // ─── 쪽 번호 ───
  canvases.forEach((canvas, i) => {
    ctx = canvas.getContext('2d')!;
    const n = `${i + 1} / ${canvases.length}`;
    text('Q-sign 큐싸인', MARGIN_X, PAGE_H - 34, 400, 9, MUTED, 12);
    text(n, PAGE_W - MARGIN_X - measure(400, 9)(n), PAGE_H - 34, 400, 9, MUTED, 12);
  });

  return Promise.all(
    canvases.map(
      (canvas) =>
        new Promise<Blob>((resolve, reject) =>
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('jpeg'))), 'image/jpeg', 0.95),
        ),
    ),
  );
}

// ─── 아주 작은 PDF 묶음기: 쪽마다 JPEG 한 장 ───

const enc = new TextEncoder();

/** PDF 문자열(제목 등)을 UTF-16 16진수로 */
function pdfText(s: string): string {
  let hex = 'FEFF';
  for (let i = 0; i < s.length; i++) hex += s.charCodeAt(i).toString(16).padStart(4, '0');
  return `<${hex}>`;
}

async function packPdf(jpegs: Blob[], title: string): Promise<Blob> {
  const parts: BlobPart[] = [];
  const offsets: number[] = [];
  let pos = 0;
  const push = (p: string | Uint8Array) => {
    const bytes = typeof p === 'string' ? enc.encode(p) : p;
    parts.push(bytes as BlobPart);
    pos += bytes.length;
  };
  const begin = (n: number) => {
    offsets[n] = pos;
    push(`${n} 0 obj\n`);
  };

  const n = jpegs.length;
  // 번호: 1 목록, 2 쪽 모음, 3 정보, 그다음 쪽마다 (쪽, 내용, 그림)
  const pageObj = (i: number) => 4 + i * 3;

  push('%PDF-1.4\n');
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])); // 바이너리 파일 표시
  begin(1);
  push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  begin(2);
  push(`<< /Type /Pages /Count ${n} /Kids [${jpegs.map((_, i) => `${pageObj(i)} 0 R`).join(' ')}] >>\nendobj\n`);
  begin(3);
  push(`<< /Title ${pdfText(title)} /Producer (Q-sign) /Creator (Q-sign) >>\nendobj\n`);

  for (let i = 0; i < n; i++) {
    const bytes = new Uint8Array(await jpegs[i].arrayBuffer());
    const bitmap = await createImageBitmap(jpegs[i]);
    const { width, height } = bitmap;
    bitmap.close();
    const content = `q ${PAGE_W} 0 0 ${PAGE_H} 0 0 cm /Im0 Do Q`;

    begin(pageObj(i));
    push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Resources << /XObject << /Im0 ${pageObj(i) + 2} 0 R >> /ProcSet [/PDF /ImageC] >> ` +
        `/Contents ${pageObj(i) + 1} 0 R >>\nendobj\n`,
    );
    begin(pageObj(i) + 1);
    push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
    begin(pageObj(i) + 2);
    push(
      `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB ` +
        `/BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`,
    );
    push(bytes);
    push('\nendstream\nendobj\n');
  }

  const total = 4 + n * 3;
  const xref = pos;
  push(`xref\n0 ${total}\n0000000000 65535 f \n`);
  for (let k = 1; k < total; k++) push(`${String(offsets[k]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${total} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  return new Blob(parts, { type: 'application/pdf' });
}

export async function buildSetlistPdf(list: Setlist): Promise<Blob> {
  return packPdf(await renderPages(list), `${list.title} 셋리스트`);
}
