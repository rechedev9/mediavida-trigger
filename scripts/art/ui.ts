import { FONT_PALETTE, GLYPHS, SPACE_WIDTH } from "../../art/src/ui/font";
import {
  CURSOR,
  CURSOR_KEY,
  CURSOR_PALETTE,
  ICON_KEY,
  ICON_PALETTE,
  ICONS,
  WINDOW,
  WINDOW_KEY,
  WINDOW_PALETTE,
} from "../../art/src/ui/widgets";
import { Canvas, parseGrid } from "./canvas";
import { buildLogo, buildTitle } from "./title";
import { tagRun, type GroupOutput, type SpriteSpec } from "./sprite";

const ICON_ORDER = [
  "fire",
  "ice",
  "bolt",
  "shadow",
  "potion",
  "ether",
  "revive",
  "key",
  "sword",
  "armor",
  "helmet",
  "accessory",
] as const;

const SPANISH = "ÁÉÍÓÚáéíóúÑñÜü¿¡«»…";

function single(id: string, opts: { palette: readonly string[]; image: Canvas }): SpriteSpec {
  return {
    group: "ui",
    id,
    width: opts.image.width,
    height: opts.image.height,
    palette: opts.palette,
    layers: ["art"],
    frames: [{ cels: { art: opts.image }, ms: 100 }],
    tags: [],
    output: "png",
  };
}

function cursor(): SpriteSpec {
  const a = parseGrid(CURSOR, CURSOR_KEY);
  const b = new Canvas(16, 16);
  b.draw(a, { at: [1, 0] });
  return {
    group: "ui",
    id: "cursor",
    width: 16,
    height: 16,
    palette: CURSOR_PALETTE,
    layers: ["art"],
    frames: [
      { cels: { art: a }, ms: 250 },
      { cels: { art: b }, ms: 250 },
    ],
    tags: tagRun([["play", 2]]),
    output: "sheet",
  };
}

function icons(): SpriteSpec {
  const frames = ICON_ORDER.map((name) => {
    const grid = ICONS[name];
    if (grid === undefined) throw new Error(`missing icon ${name}`);
    return { cels: { art: parseGrid(grid, ICON_KEY) }, ms: 100 };
  });
  return {
    group: "ui",
    id: "icons",
    width: 8,
    height: 8,
    palette: ICON_PALETTE,
    layers: ["art"],
    frames,
    tags: tagRun(ICON_ORDER.map((n) => [n, 1] as const)),
    output: "sheet",
  };
}

function font(): { sprite: SpriteSpec; json: string } {
  const chars = [" ", ...GLYPHS.map((g) => g[0])];
  const expected = [
    ...Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)),
    ...Array.from(SPANISH),
  ];
  if (chars.join("") !== expected.join("")) throw new Error("font glyphs out of order or missing");
  const rowsNeeded = Math.ceil(chars.length / 16);
  const sheet = new Canvas(128, rowsNeeded * 12);
  const widths: number[] = [SPACE_WIDTH + 1];
  GLYPHS.forEach(([, top, ...rows], i) => {
    const cell = i + 1;
    const ox = (cell % 16) * 8;
    const oy = Math.floor(cell / 16) * 12;
    const w = Math.max(...rows.map((r) => r.length));
    if (w > 7 || top + rows.length > 12) throw new Error(`glyph ${chars[cell]} too big`);
    widths.push(w + 1);
    const ink = (x: number, y: number): boolean => rows[y - top]?.[x] === "#";
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < 8; x++) {
        if (ink(x, y)) sheet.set([ox + x, oy + y], 1);
      }
    }
  });
  const json = JSON.stringify({ cell: [8, 12], chars: chars.join(""), widths });
  return { sprite: single("font", { palette: FONT_PALETTE, image: sheet }), json };
}

export function buildUi(): GroupOutput {
  const f = font();
  return {
    sprites: [
      single("window", { palette: WINDOW_PALETTE, image: parseGrid(WINDOW, WINDOW_KEY) }),
      cursor(),
      icons(),
      f.sprite,
      buildLogo(),
      buildTitle(),
    ],
    files: { "public/assets/ui/font.json": `${f.json}\n` },
  };
}
