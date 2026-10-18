import { getImage, getSheet } from "../engine/assets";
import { drawFrame, tagFrame } from "../engine/gfx";

export type ActorDraw = {
  sheet: string;
  tag: string;
  t: number;
  x: number;
  y: number;
  flip?: boolean;
  alpha?: number;
  loop?: boolean;
  /** Placeholder color and size while the sprite is missing. */
  color: string;
  size?: [number, number];
};

const FALLBACK_TAG: Record<string, string> = {
  "walk-down": "idle-down",
  "walk-up": "idle-up",
  "walk-side": "idle-side",
  "idle-up": "idle-down",
  "idle-side": "idle-down",
  attack: "idle-side",
  cast: "idle-side",
  hurt: "idle-side",
  victory: "idle-down",
  ko: "idle-down",
};

export function drawActor(ctx: CanvasRenderingContext2D, a: ActorDraw): void {
  const sheet = getSheet(a.sheet);
  if (!sheet) {
    drawPlaceholder(ctx, a);
    return;
  }
  let tag = a.tag;
  while (!sheet.tags.has(tag) && FALLBACK_TAG[tag]) tag = FALLBACK_TAG[tag] ?? "idle-down";
  const frame = sheet.tags.has(tag) ? tagFrame(sheet, tag, a.t, a.loop ?? true) : 0;
  drawFrame(ctx, sheet, {
    x: a.x,
    y: a.y,
    frame,
    ...(a.flip ? { flip: true } : {}),
    ...(a.alpha !== undefined ? { alpha: a.alpha } : {}),
  });
}

function drawPlaceholder(ctx: CanvasRenderingContext2D, a: ActorDraw): void {
  const [w, h] = a.size ?? [12, 26];
  const x = Math.round(a.x - w / 2);
  const ko = a.tag === "ko";
  const y = Math.round(a.y - (ko ? w : h));
  ctx.globalAlpha = a.alpha ?? 1;
  ctx.fillStyle = "#181010";
  if (ko) ctx.fillRect(x - 6, y, h, w);
  else ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = a.color;
  if (ko) ctx.fillRect(x - 5, y + 1, h - 2, w - 2);
  else ctx.fillRect(x, y, w, h);
  if (!ko) {
    ctx.fillStyle = "#f8d8b0";
    ctx.fillRect(x + 2, y + 2, w - 4, Math.min(8, h / 3));
  }
  ctx.globalAlpha = 1;
}

export function drawFace(
  ctx: CanvasRenderingContext2D,
  o: { id: string; x: number; y: number; color: string; h?: number },
): void {
  const img = getImage(`faces/${o.id}`);
  const h = o.h ?? 32;
  if (img) {
    // A shorter face keeps the middle rows, so eyes and mouth stay in view.
    ctx.drawImage(img, 0, Math.floor((32 - h) / 2), 32, h, o.x, o.y, 32, h);
    return;
  }
  ctx.fillStyle = "#181010";
  ctx.fillRect(o.x, o.y, 32, h);
  ctx.fillStyle = o.color;
  ctx.fillRect(o.x + 1, o.y + 1, 30, h - 2);
  ctx.fillStyle = "#f8d8b0";
  ctx.fillRect(o.x + 8, o.y + 6, 16, 16);
}

export type FxDraw = { id: string; t: number; x: number; y: number };

const FX_COLORS: Record<string, string> = {
  slash: "#f8f8f8",
  flame: "#f86020",
  ice: "#88d8f8",
  bolt: "#f8f060",
  shadow: "#9050d0",
  heal: "#80f090",
  buff: "#f8c040",
  portal: "#60a0f8",
  sparkle: "#f8f8c0",
  explosion: "#f89030",
};

/** Draws an effect centered at (x, y); returns false once it has finished. */
export function drawFx(ctx: CanvasRenderingContext2D, f: FxDraw): boolean {
  const sheet = getSheet(`fx/${f.id}`);
  if (sheet) {
    const tag = sheet.tags.get("play");
    const from = tag?.from ?? 0;
    const to = tag?.to ?? sheet.frames.length - 1;
    let total = 0;
    for (let i = from; i <= to; i++) total += sheet.durations[i] ?? 0.1;
    if (f.t >= total) return false;
    const frame = tagFrame(sheet, "play", f.t, false);
    drawFrame(ctx, sheet, { x: f.x, y: f.y + 16, frame });
    return true;
  }
  if (f.t >= 0.5) return false;
  const k = f.t / 0.5;
  ctx.globalAlpha = 1 - k;
  ctx.fillStyle = FX_COLORS[f.id] ?? "#ffffff";
  const r = 4 + k * 12;
  ctx.fillRect(Math.round(f.x - r), Math.round(f.y - r), Math.round(r * 2), Math.round(r * 2));
  ctx.globalAlpha = 1;
  return true;
}
