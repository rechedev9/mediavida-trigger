import { CHARACTERS } from "../../art/src/chars/index";
import { CHAR_KEY } from "../../art/src/chars/key";
import {
  BODIES,
  FRONTS,
  HEADS,
  POSES,
  WAVE_IDLE,
  type PoseFrame,
} from "../../art/src/chars/template";
import type { CharDef, Grid, Overlay, Point } from "../../art/src/types";
import { Canvas, parseGrid } from "./canvas";
import { buildFaceSprites } from "./faces";
import type { FrameSpec, GroupOutput, SpriteSpec, TagSpec } from "./sprite";

const FW = 16;
const FH = 32;
const LAYERS = ["back", "body", "outfit", "head", "hair", "acc", "arms"] as const;
const PANTS = new Set([11, 12]);

function grid(g: Grid): Canvas {
  return parseGrid(g, CHAR_KEY);
}

/** Removes rows from a body grid so short characters keep the same feet line. */
function shrinkBody(body: Canvas, rows: number): Canvas {
  if (rows <= 0) return body;
  const cut = new Set<number>();
  // Drop rows from the legs first, then the waist: they repeat the most.
  const preferred = [body.height - 5, body.height - 8, body.height - 11, body.height - 6];
  for (const r of preferred.slice(0, rows)) cut.add(r);
  const out = new Canvas(body.width, body.height);
  let y = body.height - 1;
  for (let src = body.height - 1; src >= 0; src--) {
    if (cut.has(src)) continue;
    for (let x = 0; x < body.width; x++) out.set([x, y], body.get([x, src]));
    y--;
  }
  return out;
}

/** Turns the top `rows` pants rows into a coat or robe that follows the leg pose. */
function applyCoat(c: Canvas, coat: NonNullable<CharDef["coat"]>): void {
  let pantsRow = 0;
  for (let y = 0; y < c.height; y++) {
    const xs: number[] = [];
    for (let x = 0; x < c.width; x++) if (PANTS.has(c.get([x, y]))) xs.push(x);
    if (xs.length === 0) continue;
    pantsRow++;
    if (pantsRow > coat.rows) continue;
    const lo = Math.min(...xs);
    const hi = Math.max(...xs);
    const hem = pantsRow === coat.rows;
    for (let x = lo; x <= hi; x++) {
      const v = c.get([x, y]);
      if (coat.fill || PANTS.has(v)) {
        const lit = x - lo < 2;
        c.set([x, y], hem ? 10 : v === 12 || x === hi ? 10 : lit ? 8 : 9);
      }
    }
  }
}

function overlayLayer(opts: {
  overlays: readonly Overlay[] | undefined;
  pose: PoseFrame;
  head: Point;
  body: Point;
}): Canvas {
  const c = new Canvas(FW, FH);
  for (const o of opts.overlays ?? []) {
    const view = opts.pose.view;
    if (o.bodies !== undefined && !o.bodies.includes(opts.pose.body)) continue;
    const g = o.views[view] ?? (view === "ko" ? o.views.side : undefined);
    if (g === undefined) continue;
    const base = o.anchor === "head" ? opts.head : opts.body;
    const at = o.at?.[view] ?? (view === "ko" ? o.at?.side : undefined) ?? [0, 0];
    c.draw(grid(g), { at: [base[0] + at[0], base[1] + at[1]] });
  }
  return c;
}

/** Stocky build: pushes each half of the body out by one column. */
function widen(c: Canvas): Canvas {
  const out = new Canvas(c.width, c.height);
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const src = x <= 6 ? x + 1 : x >= 9 ? x - 1 : x;
      out.set([x, y], c.get([src, y]));
    }
  }
  return out;
}

function remapGrid(g: Grid, map: Readonly<Record<string, string>> | undefined): Grid {
  if (map === undefined) return g;
  return g.map((row) =>
    Array.from(row)
      .map((ch) => map[ch] ?? ch)
      .join(""),
  );
}

function composeFrame(def: CharDef, pose: PoseFrame): FrameSpec {
  const shrink = def.shrink ?? 0;
  const head: Point = [pose.headAt?.[0] ?? 0, 2 + pose.dy + shrink + (pose.headAt?.[1] ?? 0)];
  const bodyAt: Point = [0, pose.dy + shrink];
  const bodyGrid = BODIES[pose.body];
  const headGrid = HEADS[pose.head];
  if (bodyGrid === undefined) throw new Error(`template body ${pose.body} missing`);
  if (headGrid === undefined) throw new Error(`template head ${pose.head} missing`);
  const bodySrc = shrinkBody(grid(remapGrid(bodyGrid, def.bodyRemap)), shrink);
  const body = new Canvas(FW, FH);
  body.draw(bodySrc, { at: [0, FH - bodySrc.height] });
  if (def.coat !== undefined) applyCoat(body, def.coat);
  const armsRaw = new Canvas(FW, FH);
  const front = FRONTS[pose.front ?? pose.body];
  if (front !== undefined)
    armsRaw.draw(grid(remapGrid(front, def.bodyRemap)), { at: [0, pose.dy + shrink] });
  const finish = (c: Canvas): Canvas => (def.wide === true ? widen(c) : c);
  const headC = new Canvas(FW, FH);
  headC.draw(grid(headGrid), { at: head });
  const hair = new Canvas(FW, FH);
  const hairGrid = def.hair[pose.view] ?? (pose.view === "ko" ? def.hair.side : undefined);
  if (hairGrid !== undefined) hair.draw(grid(hairGrid), { at: head });
  const acc = overlayLayer({ overlays: def.acc, pose, head, body: bodyAt });
  const back = overlayLayer({ overlays: def.back, pose, head, body: bodyAt });
  const w = pose.weapon === undefined ? undefined : def.weapon?.[pose.weapon];
  if (w !== undefined) (w.behind === true ? back : acc).draw(grid(w.grid), { at: w.at });
  return {
    ms: pose.ms,
    cels: {
      back,
      body: finish(body),
      outfit: finish(overlayLayer({ overlays: def.outfit, pose, head, body: bodyAt })),
      head: headC,
      hair,
      acc,
      arms: finish(armsRaw),
    },
  };
}

function charSprite(def: CharDef): SpriteSpec {
  const frames: FrameSpec[] = [];
  const tags: TagSpec[] = [];
  for (const [name, list] of POSES) {
    const poses = name === "idle-down" && def.idle === "wave" ? WAVE_IDLE : list;
    tags.push({ name, from: frames.length, to: frames.length + poses.length - 1 });
    for (const p of poses) frames.push(composeFrame(def, p));
  }
  return {
    group: "chars",
    id: def.id,
    width: FW,
    height: FH,
    palette: def.palette,
    layers: LAYERS,
    frames,
    tags,
    output: "sheet",
  };
}

export function buildChars(): GroupOutput {
  return {
    sprites: CHARACTERS.map(charSprite),
    files: {},
  };
}

export function buildFaces(): GroupOutput {
  return { sprites: buildFaceSprites(), files: {} };
}
