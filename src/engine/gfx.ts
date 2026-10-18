import { getData, getImage, type Sheet } from "./assets";
import { isRecord, num, str } from "./guards";

type Font = {
  image: HTMLImageElement;
  cellW: number;
  cellH: number;
  index: Map<string, number>;
  widths: number[];
};

let font: Font | null = null;
const tinted = new Map<string, HTMLCanvasElement>();

export const LINE_H = 12;

export const WINDOW_THEMES = [
  { name: "Mediavida", top: "#583018", bottom: "#200c08", tint: "#f88820" },
  { name: "Clásico", top: "#2850a8", bottom: "#081850", tint: "#ffffff" },
  { name: "Noche", top: "#383848", bottom: "#101018", tint: "#a8a8c8" },
  { name: "Bosque", top: "#286030", bottom: "#082010", tint: "#c8f0a0" },
] as const;

let windowTheme = 0;

export function setWindowTheme(i: number): void {
  windowTheme = ((i % WINDOW_THEMES.length) + WINDOW_THEMES.length) % WINDOW_THEMES.length;
}

/** Call after loading `ui/font` image and `ui/font.json`. */
export function initFont(): void {
  const image = getImage("ui/font");
  const data = getData("ui/font.json");
  if (!image || !isRecord(data)) return;
  const cell = Array.isArray(data.cell) ? data.cell : [8, 12];
  const chars = str(data.chars);
  const widths = Array.isArray(data.widths) ? data.widths.map((w) => num(w, 6)) : [];
  const index = new Map<string, number>();
  Array.from(chars).forEach((c, i) => index.set(c, i));
  font = { image, cellW: num(cell[0], 8), cellH: num(cell[1], 12), index, widths };
}

function charWidth(c: string): number {
  if (!font) return 6;
  const i = font.index.get(c);
  if (i === undefined) return c === " " ? 4 : 6;
  return font.widths[i] ?? font.cellW;
}

export function hasGlyph(c: string): boolean {
  return font?.index.has(c) ?? false;
}

export function measureText(text: string): number {
  let w = 0;
  for (const c of text) w += charWidth(c);
  return w;
}

function tintedFont(color: string): HTMLCanvasElement | null {
  if (!font) return null;
  const hit = tinted.get(color);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = font.image.width;
  c.height = font.image.height;
  const g = c.getContext("2d");
  if (!g) return null;
  g.drawImage(font.image, 0, 0);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  tinted.set(color, c);
  return c;
}

export type TextOptions = {
  x: number;
  y: number;
  color?: string;
  shadow?: string | null;
  align?: "left" | "center" | "right";
};

export function drawText(ctx: CanvasRenderingContext2D, text: string, opts: TextOptions): void {
  const color = opts.color ?? "#f8f8f8";
  const shadow = opts.shadow === undefined ? "#181010" : opts.shadow;
  let x = Math.round(opts.x);
  const y = Math.round(opts.y);
  if (opts.align === "center") x -= Math.floor(measureText(text) / 2);
  if (opts.align === "right") x -= measureText(text);
  if (shadow) {
    // Solid drop shadow (right, down, diagonal) keeps thin glyphs readable on busy backgrounds.
    drawRun(ctx, { text, x: x + 1, y, color: shadow });
    drawRun(ctx, { text, x, y: y + 1, color: shadow });
    drawRun(ctx, { text, x: x + 1, y: y + 1, color: shadow });
  }
  drawRun(ctx, { text, x, y, color });
}

function drawRun(
  ctx: CanvasRenderingContext2D,
  o: { text: string; x: number; y: number; color: string },
): void {
  const sheet = tintedFont(o.color);
  if (!font || !sheet) {
    ctx.fillStyle = o.color;
    ctx.font = "8px monospace";
    ctx.textBaseline = "top";
    ctx.fillText(o.text, o.x, o.y + 1);
    return;
  }
  const cols = Math.max(1, Math.floor(font.image.width / font.cellW));
  let x = o.x;
  for (const c of o.text) {
    const i = font.index.get(c);
    if (i !== undefined) {
      const sx = (i % cols) * font.cellW;
      const sy = Math.floor(i / cols) * font.cellH;
      ctx.drawImage(sheet, sx, sy, font.cellW, font.cellH, x, o.y, font.cellW, font.cellH);
    }
    x += charWidth(c);
  }
}

/** Greedy word wrap honoring explicit newlines. */
export function wrapText(text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      const next = line ? `${line} ${word}` : word;
      if (measureText(next) > maxWidth && line) {
        out.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    out.push(line);
  }
  return out;
}

export function drawWindow(
  ctx: CanvasRenderingContext2D,
  r: { x: number; y: number; w: number; h: number },
): void {
  const theme = WINDOW_THEMES[windowTheme] ?? WINDOW_THEMES[0];
  const x = Math.round(r.x);
  const y = Math.round(r.y);
  const grad = ctx.createLinearGradient(0, y, 0, y + r.h);
  grad.addColorStop(0, theme.top);
  grad.addColorStop(1, theme.bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(x + 2, y + 2, r.w - 4, r.h - 4);
  const frame = getImage("ui/window");
  if (frame && frame.width >= 24) {
    nineSliceBorder(ctx, { img: frame, x, y, w: r.w, h: r.h });
    return;
  }
  ctx.strokeStyle = "#f8f0e0";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 1.5, y + 1.5, r.w - 3, r.h - 3);
  ctx.strokeStyle = "#100808";
  ctx.strokeRect(x + 0.5, y + 0.5, r.w - 1, r.h - 1);
}

function nineSliceBorder(
  ctx: CanvasRenderingContext2D,
  o: { img: HTMLImageElement; x: number; y: number; w: number; h: number },
): void {
  const s = 8;
  const { img, x, y, w, h } = o;
  const piece = (sx: number, sy: number, dx: number, dy: number, dw: number, dh: number): void => {
    if (dw > 0 && dh > 0) ctx.drawImage(img, sx * s, sy * s, s, s, dx, dy, dw, dh);
  };
  piece(0, 0, x, y, s, s);
  piece(2, 0, x + w - s, y, s, s);
  piece(0, 2, x, y + h - s, s, s);
  piece(2, 2, x + w - s, y + h - s, s, s);
  piece(1, 0, x + s, y, w - 2 * s, s);
  piece(1, 2, x + s, y + h - s, w - 2 * s, s);
  piece(0, 1, x, y + s, s, h - 2 * s);
  piece(2, 1, x + w - s, y + s, s, h - 2 * s);
}

export type FrameOptions = {
  x: number;
  y: number;
  frame: number;
  flip?: boolean;
  alpha?: number;
  /** Anchor is bottom center unless `topLeft` is set. */
  topLeft?: boolean;
};

export function drawFrame(ctx: CanvasRenderingContext2D, sheet: Sheet, o: FrameOptions): void {
  const f = sheet.frames[o.frame % sheet.frames.length];
  if (!f) return;
  const dx = Math.round(o.topLeft ? o.x : o.x - f.w / 2);
  const dy = Math.round(o.topLeft ? o.y : o.y - f.h);
  const prevAlpha = ctx.globalAlpha;
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  if (o.flip) {
    ctx.save();
    ctx.translate(dx + f.w, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(sheet.image, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
    ctx.restore();
  } else {
    ctx.drawImage(sheet.image, f.x, f.y, f.w, f.h, dx, dy, f.w, f.h);
  }
  ctx.globalAlpha = prevAlpha;
}

/** Frame index for a tag at time `t` seconds, looping. */
export function tagFrame(sheet: Sheet, tag: string, t: number, loop = true): number {
  const tg = sheet.tags.get(tag);
  if (!tg) return 0;
  let total = 0;
  for (let i = tg.from; i <= tg.to; i++) total += sheet.durations[i] ?? 0.1;
  let time = loop ? t % Math.max(total, 0.001) : Math.min(t, total - 0.0001);
  for (let i = tg.from; i <= tg.to; i++) {
    time -= sheet.durations[i] ?? 0.1;
    if (time < 0) return i;
  }
  return tg.to;
}

export function drawBar(
  ctx: CanvasRenderingContext2D,
  o: { x: number; y: number; w: number; value: number; color: string; back?: string },
): void {
  ctx.fillStyle = "#100808";
  ctx.fillRect(o.x - 1, o.y - 1, o.w + 2, 5);
  ctx.fillStyle = o.back ?? "#383040";
  ctx.fillRect(o.x, o.y, o.w, 3);
  ctx.fillStyle = o.color;
  ctx.fillRect(o.x, o.y, Math.round(o.w * Math.max(0, Math.min(1, o.value))), 3);
}
