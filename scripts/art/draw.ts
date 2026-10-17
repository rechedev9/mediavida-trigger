import type { Point } from "../../art/src/types";
import type { Canvas } from "./canvas";

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5] as const;

/** Ordered dither threshold in [0, 1) for a pixel. */
export function bayer([x, y]: Point): number {
  return ((BAYER4[(y % 4) * 4 + (x % 4)] ?? 0) + 0.5) / 16;
}

export interface LineOptions {
  readonly from: Point;
  readonly to: Point;
  readonly color: number;
  readonly width?: number;
}

export function line(c: Canvas, o: LineOptions): void {
  let [x0, y0] = o.from;
  const [x1, y1] = o.to;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  const w = o.width ?? 1;
  for (;;) {
    for (let oy = 0; oy < w; oy++) {
      for (let ox = 0; ox < w; ox++) c.set([x0 + ox - (w >> 1), y0 + oy - (w >> 1)], o.color);
    }
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

export interface DiscOptions {
  readonly center: Point;
  readonly r: number;
  /** Color per pixel; return 0 to skip. */
  readonly color: (p: Point, dist: number) => number;
}

export function disc(c: Canvas, o: DiscOptions): void {
  const [cx, cy] = o.center;
  const r = Math.ceil(o.r);
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > o.r) continue;
      const v = o.color([x, y], d);
      if (v !== 0) c.set([x, y], v);
    }
  }
}

/** Adds an outline of `color` around every non-zero pixel (4 or 8 neighbours). */
export function outline(c: Canvas, opts: { color: number; diagonal?: boolean }): void {
  const src = c.clone();
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (src.get([x, y]) !== 0) continue;
      const n4 = [
        src.get([x - 1, y]),
        src.get([x + 1, y]),
        src.get([x, y - 1]),
        src.get([x, y + 1]),
      ];
      const n8 =
        opts.diagonal === true
          ? [
              src.get([x - 1, y - 1]),
              src.get([x + 1, y - 1]),
              src.get([x - 1, y + 1]),
              src.get([x + 1, y + 1]),
            ]
          : [];
      if ([...n4, ...n8].some((v) => v !== 0)) c.set([x, y], opts.color);
    }
  }
}
