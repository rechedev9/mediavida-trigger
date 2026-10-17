import { BIG_LETTERS, LOGO_LINES, LOGO_PALETTE, SMALL_LETTERS } from "../../art/src/ui/logo";
import { TITLE, TITLE_PALETTE } from "../../art/src/ui/title";
import type { Grid, Point } from "../../art/src/types";
import { Canvas, parseGrid, rng } from "./canvas";
import { bayer, disc, line, outline } from "./draw";
import type { SpriteSpec } from "./sprite";

const MASK_KEY = { "#": 1 } as const;
const W = 256;
const H = 224;

function sprite(id: string, opts: { palette: readonly string[]; image: Canvas }): SpriteSpec {
  return {
    group: "ui",
    id,
    width: opts.image.width,
    height: opts.image.height,
    palette: opts.palette,
    layers: ["art"],
    frames: [{ cels: { art: opts.image }, ms: 100 }],
    tags: [],
    output: id === "logo" ? "sheet" : "png",
  };
}

function deg(a: number): number {
  return (a * Math.PI) / 180;
}

/** Point at `angle` degrees clockwise from 12 o'clock. */
function polar(center: Point, opts: { angle: number; r: number }): Point {
  const a = deg(opts.angle);
  return [
    Math.round(center[0] + Math.sin(a) * opts.r),
    Math.round(center[1] - Math.cos(a) * opts.r),
  ];
}

function sky(c: Canvas): void {
  const bands = TITLE.sky;
  let y0 = 0;
  bands.forEach(([color, h], i) => {
    const next = bands[i + 1]?.[0] ?? color;
    for (let y = y0; y < y0 + h && y < H; y++) {
      const t = (y - y0) / h;
      for (let x = 0; x < W; x++) {
        const mix = t > 0.6 ? (t - 0.6) / 0.4 : 0;
        c.set([x, y], bayer([x, y]) < mix * 0.9 ? next : color);
      }
    }
    y0 += h;
  });
}

function stars(c: Canvas): void {
  const r = rng(TITLE.stars.seed);
  const { cx, cy, ring, ringWidth } = TITLE.clock;
  for (let i = 0; i < TITLE.stars.count; i++) {
    const x = Math.floor(r() * W);
    const y = Math.floor(r() * 170);
    if (Math.hypot(x - cx, y - cy) < ring + ringWidth + 8) continue;
    const bright = i < TITLE.stars.bright;
    if (bright) {
      c.set([x, y], 8);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        c.set([x + dx, y + dy], 9);
      }
      if (i % 3 === 0) {
        c.set([x + 2, y], 4);
        c.set([x - 2, y], 4);
        c.set([x, y + 2], 4);
        c.set([x, y - 2], 4);
      }
    } else {
      c.set([x, y], r() < 0.3 ? 8 : r() < 0.6 ? 9 : 5);
    }
  }
}

function portal(c: Canvas): void {
  const { cx, cy, ring, ringWidth } = TITLE.clock;
  const center: Point = [cx, cy];
  // Soft glow around the ring.
  disc(c, {
    center,
    r: ring + ringWidth + 10,
    color: (p, d) => {
      const t = (d - ring - ringWidth) / 10;
      if (t < 0) return 0;
      return bayer(p) > t ? (t < 0.4 ? 6 : 15) : 0;
    },
  });
  const swirl = [2, 3, 15, 6, 7, 6, 15] as const;
  disc(c, {
    center,
    r: ring,
    color: (p, d) => {
      const n = d / ring;
      const a = Math.atan2(p[1] - cy, p[0] - cx);
      if (n < 0.1) return 14;
      if (n < 0.18) return bayer(p) < 0.5 ? 14 : 13;
      if (n < 0.26) return bayer(p) < (0.26 - n) / 0.08 ? 13 : 12;
      const s = Math.sin(a * 3 + n * 9) * 0.5 + 0.5;
      const v = s * 0.8 + (1 - n) * 0.5 + (bayer(p) - 0.5) * 0.35;
      if (n < 0.34 && v > 0.7) return 12;
      if (n < 0.42 && v > 0.85) return 11;
      const idx = Math.min(swirl.length - 1, Math.max(0, Math.floor(v * swirl.length * 0.85)));
      return swirl[idx] ?? 2;
    },
  });
  // Bronze ring lit from the top left.
  disc(c, {
    center,
    r: ring + ringWidth,
    color: (p, d) => {
      if (d < ring) return 0;
      if (d >= ring + ringWidth - 1 || d < ring + 1) return 1;
      const nx = (p[0] - cx) / d;
      const ny = (p[1] - cy) / d;
      const across = (d - ring) / ringWidth;
      const lit = -(nx + ny) * 0.7 * (across < 0.5 ? 1 : -0.4) + 0.2 + (bayer(p) - 0.5) * 0.3;
      if (across > 0.35 && across < 0.55) return lit > 0.3 ? 14 : 13;
      if (lit > 0.55) return 13;
      if (lit > 0.05) return 12;
      if (lit > -0.4) return 11;
      return 10;
    },
  });
  for (let h = 0; h < 12; h++) {
    const major = h % 3 === 0;
    const a = h * 30;
    const p0 = polar(center, { angle: a, r: ring - 3 });
    const p1 = polar(center, { angle: a, r: ring - (major ? 10 : 7) });
    line(c, { from: p0, to: p1, color: 1, width: major ? 3 : 2 });
    line(c, { from: p0, to: p1, color: major ? 14 : 13, width: 1 });
  }
  for (let m = 0; m < 60; m++) {
    if (m % 5 === 0) continue;
    c.set(polar(center, { angle: m * 6, r: ring + ringWidth / 2 }), 10);
  }
  // Hands: dark silhouettes with an orange rim on the lit side.
  const hands = [
    { angle: TITLE.clock.hourAngle, len: ring * 0.55, w: 4 },
    { angle: TITLE.clock.minuteAngle, len: ring * 0.86, w: 3 },
  ];
  for (const hand of hands) {
    const tip = polar(center, { angle: hand.angle, r: hand.len });
    const tail = polar(center, { angle: hand.angle + 180, r: 10 });
    line(c, { from: tail, to: tip, color: 1, width: hand.w });
    const side = polar([0, 0], { angle: hand.angle - 90, r: 1 });
    line(c, {
      from: [tail[0] + side[0], tail[1] + side[1]],
      to: [tip[0] + side[0], tip[1] + side[1]],
      color: 12,
    });
    disc(c, { center: tip, r: 2, color: () => 1 });
  }
  disc(c, { center, r: 5, color: (_, d) => (d > 4 ? 1 : d < 2 ? 14 : 13) });
}

function skyline(c: Canvas): void {
  const r = rng(TITLE.skyline.seed);
  const base = TITLE.skyline.base;
  // Far hills.
  for (let x = 0; x < W; x++) {
    const h = 10 + Math.sin(x / 23) * 5 + Math.sin(x / 9 + 1) * 2;
    for (let y = Math.round(base - h); y < H; y++) c.set([x, y], 3);
  }
  let x = -4;
  while (x < W) {
    const w = 10 + Math.floor(r() * 16);
    const h = 10 + Math.floor(r() * 26);
    const top = base - h;
    const roof = Math.floor(r() * 3);
    for (let yy = top; yy < H; yy++) {
      for (let xx = x; xx < x + w; xx++) c.set([xx, yy], 1);
    }
    if (roof === 1) {
      for (let k = 0; k < w / 2; k++) {
        for (let xx = x + k; xx < x + w - k; xx++) c.set([xx, top - k], 1);
      }
    } else if (roof === 2) {
      disc(c, { center: [x + Math.floor(w / 2), top], r: w / 3, color: () => 1 });
    }
    for (let wy = top + 3; wy < base + 4; wy += 4) {
      for (let wx = x + 2; wx < x + w - 2; wx += 3) {
        if (r() < 0.22) {
          c.set([wx, wy], r() < 0.5 ? 12 : 13);
          c.set([wx, wy + 1], 11);
        }
      }
    }
    x += w + Math.floor(r() * 3);
  }
  // Radio mast with a blinking light, a nod to old forums.
  const mx = 214;
  line(c, { from: [mx, base - 60], to: [mx, base - 20], color: 1 });
  line(c, { from: [mx - 6, base - 20], to: [mx, base - 60], color: 1 });
  line(c, { from: [mx + 6, base - 20], to: [mx, base - 60], color: 1 });
  for (let k = base - 54; k < base - 20; k += 6)
    line(c, { from: [mx - 3, k], to: [mx + 3, k], color: 1 });
  c.set([mx, base - 61], 12);
  c.set([mx, base - 62], 13);
  for (let xx = 0; xx < W; xx++) for (let yy = base + 6; yy < H; yy++) c.set([xx, yy], 1);
}

export function buildTitle(): SpriteSpec {
  const c = new Canvas(W, H);
  sky(c);
  stars(c);
  portal(c);
  skyline(c);
  return sprite("title", { palette: TITLE_PALETTE, image: c });
}

interface TextLine {
  readonly text: string;
  readonly letters: Readonly<Record<string, Grid>>;
  readonly gap: number;
  readonly y: number;
}

/** Metal ramp by height: bright top, dark horizon band in the middle, warm bottom. */
function metal(t: number): number {
  if (t < 0.12) return 1;
  if (t < 0.32) return 2;
  if (t < 0.48) return 3;
  if (t < 0.56) return 5;
  if (t < 0.64) return 4;
  if (t < 0.82) return 3;
  return 2;
}

function textMask(opts: TextLine & { width: number; height: number }): Canvas {
  const masks = Array.from(opts.text).map((ch) => {
    const g = opts.letters[ch];
    if (g === undefined) throw new Error(`logo letter ${ch} missing`);
    return parseGrid(g, MASK_KEY);
  });
  const total = masks.reduce((s, m) => s + m.width, 0) + opts.gap * (masks.length - 1);
  const c = new Canvas(opts.width, opts.height);
  let x = Math.floor((opts.width - total) / 2);
  for (const m of masks) {
    c.draw(m, { at: [x, opts.y] });
    x += m.width + opts.gap;
  }
  return c;
}

function shadeLetters(opts: { mask: Canvas; top: number; h: number; out: Canvas }): void {
  const { mask, out } = opts;
  const ink = (x: number, y: number): boolean => mask.get([x, y]) !== 0;
  for (let y = 0; y < mask.height; y++) {
    for (let x = 0; x < mask.width; x++) {
      if (!ink(x, y)) continue;
      let v = metal((y - opts.top) / opts.h);
      if (!ink(x, y - 1) || !ink(x - 1, y)) v = Math.max(1, v - 2);
      if (!ink(x, y + 1)) v = 5;
      else if (!ink(x + 1, y)) v = Math.min(5, v + 1);
      if (!ink(x, y - 1) && !ink(x - 1, y)) v = 8;
      out.set([x, y], v);
    }
  }
}

export function buildLogo(): SpriteSpec {
  const width = 232;
  const height = 112;
  const top: TextLine = { text: LOGO_LINES.top, letters: SMALL_LETTERS, gap: 3, y: 22 };
  const bottom: TextLine = { text: LOGO_LINES.bottom, letters: BIG_LETTERS, gap: 3, y: 46 };
  const c = new Canvas(width, height);
  // A clock behind the words with a pendulum hanging under it.
  const center: Point = [width / 2, 48];
  const bob = polar(center, { angle: 172, r: 54 });
  line(c, { from: center, to: bob, color: 13, width: 4 });
  line(c, { from: center, to: bob, color: 10, width: 2 });
  disc(c, {
    center: bob,
    r: 8,
    color: (p, d) => {
      if (d > 7) return 13;
      if (d > 6) return 6;
      const lx = p[0] - bob[0];
      const ly = p[1] - bob[1];
      if (lx + ly < -6) return 1;
      if (lx + ly < -2) return 2;
      return lx + ly > 5 ? 5 : lx + ly > 2 ? 4 : 3;
    },
  });
  disc(c, {
    center,
    r: 46,
    color: (p, d) => {
      if (d > 45) return 13;
      if (d > 41) {
        const lit = (center[0] - p[0] + center[1] - p[1]) / d;
        return lit > 0.6 ? 9 : lit > -0.2 ? 10 : 11;
      }
      if (d > 40) return 13;
      return bayer(p) < 0.25 ? 12 : 13;
    },
  });
  for (let h = 0; h < 12; h++) {
    const major = h % 3 === 0;
    line(c, {
      from: polar(center, { angle: h * 30, r: 38 }),
      to: polar(center, { angle: h * 30, r: major ? 31 : 35 }),
      color: major ? 9 : 10,
      width: major ? 2 : 1,
    });
  }
  const letters = new Canvas(width, height);
  const glints: Point[] = [];
  for (const l of [top, bottom]) {
    const mask = textMask({ ...l, width, height });
    const lineH = Object.values(l.letters)[0]?.length ?? 16;
    shadeLetters({ mask, top: l.y, h: lineH, out: letters });
    const first = mask.px.findIndex((v) => v !== 0);
    glints.push([(first % width) + 3, Math.floor(first / width) + 1]);
  }
  const outlined = letters.clone();
  outline(outlined, { color: 6, diagonal: true });
  const outer = outlined.clone();
  outline(outer, { color: 7, diagonal: true });
  const shadow = new Canvas(width, height);
  shadow.draw(outer, {
    at: [2, 2],
    remap: Object.fromEntries([...Array(16).keys()].map((i) => [i, 7])),
  });
  c.draw(shadow);
  c.draw(outer);
  c.draw(outlined);
  c.draw(letters);
  for (const [gx, gy] of glints) {
    c.set([gx, gy], 8);
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      c.set([gx + dx, gy + dy], 14);
    }
  }
  return sprite("logo", { palette: LOGO_PALETTE, image: c });
}
