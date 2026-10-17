import { TILESETS } from "../../art/src/tiles/index";
import { TILE_KEY } from "../../art/src/tiles/key";
import type { EdgeDef, TileDef, TileRecipe, TilesetDef } from "../../art/src/types";
import { Canvas, parseGrid, rng } from "./canvas";
import { bayer } from "./draw";
import type { FrameSpec, GroupOutput, SpriteSpec } from "./sprite";

const T = 16;
const COLUMNS = 16;
const DEFAULT_FPS = 4;

/** Tile names the engine relies on, per set. */
const REQUIRED: Readonly<Record<string, readonly string[]>> = {
  plaza:
    "grass grass-flower path stone wall roof roof-edge door window tree tree-top bush fence counter awning lamp water fountain sign banner".split(
      " ",
    ),
  lan: "floor carpet wall wall-top desk-pc desk chair cable poster door crt server crate bar stage".split(
    " ",
  ),
  oro: "grass path cobble wall roof roof-edge door window tree tree-top hedge fence water mfloor mwall carpet candle table books".split(
    " ",
  ),
  fin: "void platform edge pillar pad stairs lamp".split(" "),
  futuro: "metal mwall wall-top screen rack cable rubble terminal pipe hazard broken door".split(
    " ",
  ),
  cueva: "stone swall wall-top ladder moss crystal sewer pipe grate".split(" "),
};
const EVERY_SET = ["chest", "chest-open", "save"];

const EDGE_SUFFIXES = [
  "n",
  "s",
  "w",
  "e",
  "nw",
  "ne",
  "sw",
  "se",
  "inw",
  "ine",
  "isw",
  "ise",
] as const;
type EdgeSuffix = (typeof EDGE_SUFFIXES)[number];

const EDGE_TEXT: Readonly<Record<EdgeSuffix, string>> = {
  n: "north border",
  s: "south border",
  w: "west border",
  e: "east border",
  nw: "outer corner NW",
  ne: "outer corner NE",
  sw: "outer corner SW",
  se: "outer corner SE",
  inw: "inner corner, notch NW",
  ine: "inner corner, notch NE",
  isw: "inner corner, notch SW",
  ise: "inner corner, notch SE",
};

interface Built {
  readonly name: string;
  readonly desc: string;
  readonly solid: boolean;
  readonly over: boolean;
  readonly fps: number | undefined;
  readonly frames: readonly Canvas[];
}

function key(ch: string): number {
  const v = TILE_KEY[ch];
  if (v === undefined) throw new Error(`unknown tile color char ${ch}`);
  return v;
}

function tileGrid(g: readonly string[], where: string): Canvas {
  const c = parseGrid(g, TILE_KEY);
  if (c.width !== T || c.height !== T)
    throw new Error(`${where}: grid is ${c.width}x${c.height}, expected 16x16`);
  return c;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Seamless value noise in [0, 1]: two octaves on a wrapping lattice. */
function valueNoise(cells: number, seed: number): (x: number, y: number) => number {
  const octave = (n: number, s: number): ((x: number, y: number) => number) => {
    const rand = rng(s);
    const lattice = Array.from({ length: n * n }, () => rand());
    const at = (i: number, j: number): number => lattice[((j + n) % n) * n + ((i + n) % n)] ?? 0;
    return (x, y) => {
      const fx = (x / T) * n;
      const fy = (y / T) * n;
      const i = Math.floor(fx);
      const j = Math.floor(fy);
      const u = smooth(fx - i);
      const v = smooth(fy - j);
      const top = at(i, j) * (1 - u) + at(i + 1, j) * u;
      const bottom = at(i, j + 1) * (1 - u) + at(i + 1, j + 1) * u;
      return top * (1 - v) + bottom * v;
    };
  };
  const a = octave(cells, seed);
  const b = octave(Math.min(cells * 2, T), seed + 101);
  return (x, y) => a(x, y) * 0.7 + b(x, y) * 0.3;
}

function noiseTile(r: Extract<TileRecipe, { kind: "noise" }>): Canvas {
  const c = new Canvas(T, T);
  const n = valueNoise(r.cells, r.seed);
  const ramp = Array.from(r.ramp).map(key);
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const t = Math.min(0.999, Math.max(0, (n(x, y) - 0.5) * 1.8 + 0.5 + (r.bias ?? 0)));
      const f = t * (ramp.length - 1);
      const lo = Math.floor(f);
      const pick = f - lo > bayer([x, y]) ? lo + 1 : lo;
      c.set([x, y], ramp[Math.min(pick, ramp.length - 1)] ?? 0);
    }
  }
  return c;
}

function bricksTile(r: Extract<TileRecipe, { kind: "bricks" }>): Canvas {
  const [mortar, light, mid, dark] = Array.from(r.colors).map(key);
  const c = new Canvas(T, T);
  const rand = rng(r.seed);
  const shade = Array.from({ length: 64 }, () => rand());
  for (let y = 0; y < T; y++) {
    const row = Math.floor(y / r.h);
    const off = r.offset === false ? 0 : (row % 2) * (r.w / 2);
    for (let x = 0; x < T; x++) {
      const lx = (x + off) % r.w;
      const ly = y % r.h;
      const brick = row * 8 + Math.floor(((x + off) % T) / r.w);
      const worn = (shade[brick % 64] ?? 0) > 0.7;
      let v = mid;
      if (ly === r.h - 1 || lx === r.w - 1) v = mortar;
      else if (ly === 0 || lx === 0) v = light;
      else if (ly === r.h - 2 || lx === r.w - 2) v = dark;
      else if (worn && bayer([x, y]) > 0.6) v = dark;
      c.set([x, y], v ?? 0);
    }
  }
  return c;
}

function planksTile(r: Extract<TileRecipe, { kind: "planks" }>): Canvas {
  const [seam, light, mid, dark] = Array.from(r.colors).map(key);
  const c = new Canvas(T, T);
  const rand = rng(r.seed);
  for (let top = 0; top < T; top += r.h) {
    const cut = Math.floor(rand() * T);
    const grain = Math.floor(rand() * T);
    for (let ly = 0; ly < r.h; ly++) {
      for (let x = 0; x < T; x++) {
        let v = mid;
        if (ly === r.h - 1 || x === cut) v = seam;
        else if (ly === 0 || x === (cut + 1) % T) v = light;
        else if (ly === r.h - 2) v = dark;
        else if (ly === 1 + (r.h > 3 ? 1 : 0) && Math.abs(x - grain) < 3) v = dark;
        c.set([x, top + ly], v ?? 0);
      }
    }
  }
  return c;
}

function scatterFrames(
  r: Extract<TileRecipe, { kind: "scatter" }>,
  base: readonly Canvas[],
  where: string,
): Canvas[] {
  const rand = rng(r.seed);
  const stamps = r.stamps.map((g) => parseGrid(g, TILE_KEY));
  const spots = Array.from({ length: r.count }, () => ({
    x: Math.floor(rand() * T),
    y: Math.floor(rand() * T),
    pick: Math.floor(rand() * stamps.length),
  }));
  const count = Math.max(r.frames ?? 1, base.length);
  if (base.length === 0) throw new Error(`${where}: scatter needs a base tile`);
  return Array.from({ length: count }, (_, k) => {
    const c = (base[k % base.length] ?? new Canvas(T, T)).clone();
    spots.forEach((s, i) => {
      const stamp = stamps[r.cycle === true ? (s.pick + k + i) % stamps.length : s.pick];
      if (stamp === undefined) return;
      const [dx, dy] = r.drift ?? [0, 0];
      c.draw(stamp, { at: [s.x + dx * k, s.y + dy * k], wrap: true });
    });
    return c;
  });
}

/** Wobble table that is 0 at both tile ends, so borders meet the corners. */
function wobble(seed: number): (i: number) => number {
  const rand = rng(seed);
  const t = Array.from({ length: T }, (_, i) => (i < 2 || i > 13 ? 0 : Math.floor(rand() * 3) - 1));
  return (i) => t[((i % T) + T) % T] ?? 0;
}

function edgeMask(
  suffix: EdgeSuffix,
  d: number,
  wob: (i: number) => number,
): (x: number, y: number) => boolean {
  const top = (x: number, y: number): boolean => y < d + wob(x);
  const bottom = (x: number, y: number): boolean => y > T - 1 - d - wob(x);
  const left = (x: number, y: number): boolean => x < d + wob(y);
  const right = (x: number, y: number): boolean => x > T - 1 - d - wob(y);
  const R = 3;
  const round = (cx: number, cy: number) => (x: number, y: number) =>
    (x - cx) * (x - cx) + (y - cy) * (y - cy) > R * R + 1;
  const near = d + R;
  const far = T - 1 - d - R;
  switch (suffix) {
    case "n":
      return top;
    case "s":
      return bottom;
    case "w":
      return left;
    case "e":
      return right;
    case "nw":
      return (x, y) => top(x, y) || left(x, y) || (x < near && y < near && round(near, near)(x, y));
    case "ne":
      return (x, y) => top(x, y) || right(x, y) || (x > far && y < near && round(far, near)(x, y));
    case "sw":
      return (x, y) =>
        bottom(x, y) || left(x, y) || (x < near && y > far && round(near, far)(x, y));
    case "se":
      return (x, y) => bottom(x, y) || right(x, y) || (x > far && y > far && round(far, far)(x, y));
    case "inw":
      return (x, y) => top(x, y) && left(x, y) && x + y < 2 * d - 1;
    case "ine":
      return (x, y) => top(x, y) && right(x, y) && T - 1 - x + y < 2 * d - 1;
    case "isw":
      return (x, y) => bottom(x, y) && left(x, y) && x + T - 1 - y < 2 * d - 1;
    default:
      return (x, y) => bottom(x, y) && right(x, y) && 2 * (T - 1) - x - y < 2 * d - 1;
  }
}

function edgeTile(opts: {
  mask: (x: number, y: number) => boolean;
  inner: Canvas;
  outer: Canvas;
  rim: number | undefined;
  outerRim: number | undefined;
}): Canvas {
  const c = new Canvas(T, T);
  const { mask } = opts;
  const touches = (x: number, y: number, want: boolean): boolean =>
    mask(x - 1, y) === want ||
    mask(x + 1, y) === want ||
    mask(x, y - 1) === want ||
    mask(x, y + 1) === want;
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const out = mask(x, y);
      let v = (out ? opts.outer : opts.inner).get([x, y]);
      if (!out && opts.rim !== undefined && touches(x, y, true)) v = opts.rim;
      if (out && opts.outerRim !== undefined && touches(x, y, false)) v = opts.outerRim;
      c.set([x, y], v);
    }
  }
  return c;
}

class SetBuilder {
  private readonly defs = new Map<string, TileDef>();
  private readonly done = new Map<string, Built>();
  private readonly busy = new Set<string>();
  private readonly order: string[] = [];

  constructor(private readonly set: TilesetDef) {
    for (const t of set.tiles) {
      if ("kind" in t) {
        for (const s of EDGE_SUFFIXES) this.order.push(`${t.prefix}-${s}`);
      } else {
        if (this.defs.has(t.name)) throw new Error(`${set.id}: duplicate tile ${t.name}`);
        this.defs.set(t.name, t);
        this.order.push(t.name);
      }
    }
  }

  build(): Built[] {
    for (const t of this.set.tiles) {
      if ("kind" in t) this.edges(t);
    }
    return this.order.map((n) => this.get(n));
  }

  private where(name: string): string {
    return `${this.set.id}/${name}`;
  }

  get(name: string): Built {
    const ready = this.done.get(name);
    if (ready !== undefined) return ready;
    const def = this.defs.get(name);
    if (def === undefined) throw new Error(`${this.where(name)}: unknown tile`);
    if (this.busy.has(name)) throw new Error(`${this.where(name)}: base cycle`);
    this.busy.add(name);
    const built: Built = {
      name,
      desc: def.desc,
      solid: def.solid === true,
      over: def.over === true,
      fps: def.fps,
      frames: this.frames(def),
    };
    this.busy.delete(name);
    this.done.set(name, built);
    return built;
  }

  private frames(def: TileDef): Canvas[] {
    const where = this.where(def.name);
    if (def.flipX !== undefined) return this.get(def.flipX).frames.map((f) => f.flipped());
    const base = def.base === undefined ? [] : this.get(def.base).frames;
    const r = def.recipe;
    if (r !== undefined) {
      if (r.kind === "scatter") return scatterFrames(r, base, where);
      const one =
        r.kind === "noise" ? noiseTile(r) : r.kind === "bricks" ? bricksTile(r) : planksTile(r);
      return [one];
    }
    const layers = def.frames ?? (def.grid === undefined ? [] : [def.grid]);
    if (layers.length === 0 && base.length === 0)
      throw new Error(`${where}: no grid, frames, recipe or base`);
    const count = Math.max(layers.length, base.length, 1);
    return Array.from({ length: count }, (_, i) => {
      const b = base[i % Math.max(base.length, 1)];
      const c = b === undefined ? new Canvas(T, T) : b.clone();
      const g = layers[i % Math.max(layers.length, 1)];
      if (g !== undefined) c.draw(tileGrid(g, where));
      return c;
    });
  }

  private edges(e: EdgeDef): void {
    const inner = this.get(e.inner).frames;
    const outer = this.get(e.outer).frames;
    const count = Math.max(inner.length, outer.length);
    const wob = wobble(e.seed);
    for (const s of EDGE_SUFFIXES) {
      const mask = edgeMask(s, e.depth ?? 4, wob);
      const frames = Array.from({ length: count }, (_, i) =>
        edgeTile({
          mask,
          inner: inner[i % inner.length] ?? new Canvas(T, T),
          outer: outer[i % outer.length] ?? new Canvas(T, T),
          rim: e.rim === undefined ? undefined : key(e.rim),
          outerRim: e.outerRim === undefined ? undefined : key(e.outerRim),
        }),
      );
      const name = `${e.prefix}-${s}`;
      this.done.set(name, {
        name,
        desc: `${e.desc}: ${EDGE_TEXT[s]}`,
        solid: e.solid === true,
        over: false,
        fps: undefined,
        frames,
      });
    }
  }
}

interface TileEntry {
  index: number;
  solid: boolean;
  frames?: number[];
  fps?: number;
  over?: boolean;
}

function checkNames(set: TilesetDef, tiles: readonly Built[]): void {
  const names = new Set(tiles.map((t) => t.name));
  for (const n of [...(REQUIRED[set.id] ?? []), ...EVERY_SET]) {
    if (!names.has(n)) throw new Error(`${set.id}: required tile ${n} is missing`);
  }
}

function buildSet(set: TilesetDef): { sprite: SpriteSpec; json: string; md: string } {
  const tiles = new SetBuilder(set).build();
  checkNames(set, tiles);
  const frames: FrameSpec[] = [];
  const entries: Record<string, TileEntry> = {};
  const rows: string[] = [];
  for (const t of tiles) {
    const index = frames.length;
    for (const f of t.frames) frames.push({ ms: 100, cels: { tiles: f } });
    const entry: TileEntry = { index, solid: t.solid };
    if (t.frames.length > 1) {
      entry.frames = t.frames.map((_, i) => index + i);
      entry.fps = t.fps ?? DEFAULT_FPS;
    }
    if (t.over) entry.over = true;
    entries[t.name] = entry;
    const flags = [
      t.solid ? "solid" : "",
      t.over ? "over" : "",
      t.frames.length > 1 ? `anim ${t.frames.length}` : "",
    ];
    rows.push(
      `| ${index} | \`${t.name}\` | ${flags.filter((f) => f !== "").join(", ")} | ${t.desc} |`,
    );
  }
  const sprite: SpriteSpec = {
    group: "tiles",
    id: set.id,
    width: T,
    height: T,
    palette: set.palette,
    layers: ["tiles"],
    frames,
    tags: [],
    output: "sheet",
    sheet: "rows",
  };
  const json = `${JSON.stringify({ tileSize: T, columns: COLUMNS, tiles: entries }, null, 2)}\n`;
  const md = [
    `## ${set.id} (${tiles.length} tiles, ${frames.length} frames)`,
    "",
    "| index | name | flags | description |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
  ].join("\n");
  return { sprite, json, md };
}

export function buildTiles(): GroupOutput {
  const files: Record<string, string> = {};
  const sprites: SpriteSpec[] = [];
  const docs: string[] = [
    "# Tilesets",
    "",
    "Generated by `bun run art` from `art/src/tiles/`. Do not edit by hand.",
    "",
    "Sheets are `public/assets/tiles/<set>.png`, 16x16 tiles, 16 per row. `index` is the first frame;",
    "animated tiles use the following frames. Edge sets (`<prefix>-n` ... `-ise`) blend two grounds:",
    "the plain suffix is the side where the outer ground shows, `i*` tiles are inner corners.",
    "",
  ];
  for (const set of TILESETS) {
    const out = buildSet(set);
    sprites.push(out.sprite);
    files[`public/assets/tiles/${set.id}.tiles.json`] = out.json;
    docs.push(out.md);
  }
  files["art/TILES.md"] = docs.join("\n");
  return { sprites, files };
}
