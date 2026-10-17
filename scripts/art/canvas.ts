import type { CharKey, Grid, Point } from "../../art/src/types";

/** An indexed image: one palette index per pixel, 0 is transparent. */
export class Canvas {
  readonly width: number;
  readonly height: number;
  readonly px: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.px = new Uint8Array(width * height);
  }

  inside([x, y]: Point): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  get(p: Point): number {
    return this.inside(p) ? (this.px[p[1] * this.width + p[0]] ?? 0) : 0;
  }

  set(p: Point, v: number): void {
    if (this.inside(p)) this.px[p[1] * this.width + p[0]] = v;
  }

  clone(): Canvas {
    const c = new Canvas(this.width, this.height);
    c.px.set(this.px);
    return c;
  }

  isEmpty(): boolean {
    return this.px.every((v) => v === 0);
  }

  /** Draws `src` at `at`; index 0 in `src` is transparent. */
  draw(src: Canvas, opts: DrawOptions = {}): void {
    const [ox, oy] = opts.at ?? [0, 0];
    for (let y = 0; y < src.height; y++) {
      for (let x = 0; x < src.width; x++) {
        const sx = opts.flipX === true ? src.width - 1 - x : x;
        const v = src.get([sx, y]);
        if (v === 0) continue;
        const mapped = opts.remap?.[v] ?? v;
        if (opts.wrap === true) {
          const wx = (((ox + x) % this.width) + this.width) % this.width;
          const wy = (((oy + y) % this.height) + this.height) % this.height;
          this.set([wx, wy], mapped);
        } else {
          this.set([ox + x, oy + y], mapped);
        }
      }
    }
  }

  fill(rect: Rect, v: number): void {
    for (let y = rect.y; y < rect.y + rect.h; y++) {
      for (let x = rect.x; x < rect.x + rect.w; x++) this.set([x, y], v);
    }
  }

  /** Copies a region into a new canvas. */
  crop(rect: Rect): Canvas {
    const c = new Canvas(rect.w, rect.h);
    for (let y = 0; y < rect.h; y++) {
      for (let x = 0; x < rect.w; x++) c.set([x, y], this.get([rect.x + x, rect.y + y]));
    }
    return c;
  }

  flipped(): Canvas {
    const c = new Canvas(this.width, this.height);
    c.draw(this, { flipX: true });
    return c;
  }

  remapped(map: Readonly<Record<number, number>>): Canvas {
    const c = this.clone();
    c.px.forEach((v, i) => {
      c.px[i] = map[v] ?? v;
    });
    return c;
  }

  /** One hex digit per pixel, rows top to bottom. */
  toHex(): string {
    let s = "";
    for (const v of this.px) s += v.toString(16);
    return s;
  }
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface DrawOptions {
  readonly at?: Point;
  readonly flipX?: boolean;
  readonly remap?: Readonly<Record<number, number>>;
  readonly wrap?: boolean;
}

/** Parses an ASCII grid. Unknown characters throw so typos never slip into the art. */
export function parseGrid(grid: Grid, key: CharKey): Canvas {
  const w = Math.max(0, ...grid.map((r) => r.length));
  const c = new Canvas(w, grid.length);
  grid.forEach((row, y) => {
    if (row.length !== w) throw new Error(`grid row ${y} has width ${row.length}, expected ${w}`);
    Array.from(row).forEach((ch, x) => {
      if (ch === "." || ch === " ") return;
      const v = key[ch];
      if (v === undefined) throw new Error(`unknown grid character "${ch}" at ${x},${y}`);
      c.set([x, y], v);
    });
  });
  return c;
}

/** Deterministic PRNG (mulberry32) so builds are reproducible. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
