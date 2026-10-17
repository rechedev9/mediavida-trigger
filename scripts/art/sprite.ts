import type { Palette } from "../../art/src/types";
import type { Canvas } from "./canvas";

export interface FrameSpec {
  /** Cels by layer name; missing layers stay empty. */
  readonly cels: Readonly<Record<string, Canvas>>;
  readonly ms: number;
}

export interface TagSpec {
  readonly name: string;
  /** 0-based, inclusive. */
  readonly from: number;
  readonly to: number;
}

export interface SpriteSpec {
  readonly group: string;
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly palette: Palette;
  /** Bottom to top. */
  readonly layers: readonly string[];
  readonly frames: readonly FrameSpec[];
  readonly tags: readonly TagSpec[];
  /** `sheet` writes png + json-array, `png` writes the first frame only. */
  readonly output: "sheet" | "png";
  /** Sheet layout; rows uses 16 columns. */
  readonly sheet?: "horizontal" | "rows";
}

export function parseHex(hex: string): readonly [number, number, number] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (m === null) throw new Error(`bad color ${hex}`);
  return [parseInt(m[1] ?? "0", 16), parseInt(m[2] ?? "0", 16), parseInt(m[3] ?? "0", 16)];
}

export function validateSprite(s: SpriteSpec): void {
  const where = `${s.group}/${s.id}`;
  if (s.palette.length > 16) throw new Error(`${where}: ${s.palette.length} colors, max 16`);
  s.palette.forEach((hex, i) => {
    if (i === 0) return;
    if (parseHex(hex).some((ch) => ch % 8 !== 0)) {
      throw new Error(`${where}: color ${i} ${hex} is not BGR555 snapped`);
    }
  });
  if (s.frames.length === 0) throw new Error(`${where}: no frames`);
  for (const [fi, f] of s.frames.entries()) {
    for (const [layer, cel] of Object.entries(f.cels)) {
      if (!s.layers.includes(layer)) throw new Error(`${where}: unknown layer ${layer}`);
      if (cel.width !== s.width || cel.height !== s.height) {
        throw new Error(`${where}: frame ${fi} layer ${layer} is ${cel.width}x${cel.height}`);
      }
      for (const v of cel.px) {
        if (v >= s.palette.length) throw new Error(`${where}: index ${v} outside the palette`);
      }
    }
  }
  for (const t of s.tags) {
    if (t.from < 0 || t.to >= s.frames.length || t.from > t.to) {
      throw new Error(`${where}: tag ${t.name} out of range`);
    }
  }
}

/** Helper for the usual case: frames listed in order, tags by name with frame counts. */
export function tagRun(runs: readonly (readonly [string, number])[]): TagSpec[] {
  const tags: TagSpec[] = [];
  let at = 0;
  for (const [name, count] of runs) {
    tags.push({ name, from: at, to: at + count - 1 });
    at += count;
  }
  return tags;
}

export interface GroupOutput {
  readonly sprites: readonly SpriteSpec[];
  /** Extra files written by TypeScript, path relative to the project root. */
  readonly files: Readonly<Record<string, string>>;
}
