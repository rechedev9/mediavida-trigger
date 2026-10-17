import { ENEMIES } from "../../art/src/enemies/index";
import { HEX_KEY } from "../../art/src/hex-key";
import type { EnemyDef, Grid } from "../../art/src/types";
import { ENEMIES as ENEMY_DATA } from "../../src/data/enemies";
import { parseGrid } from "./canvas";
import { tagRun, type GroupOutput, type SpriteSpec } from "./sprite";

// idle, idle, wind-up, strike, hurt
const FRAME_MS = [460, 460, 180, 300, 320];

function sprite(def: EnemyDef): SpriteSpec {
  const grids: readonly Grid[] = [...def.idle, ...def.attack, def.hurt];
  const cels = grids.map((g) => parseGrid(g, HEX_KEY));
  const first = cels[0];
  if (first === undefined) throw new Error(`enemies/${def.id}: no frames`);
  const size = ENEMY_DATA[def.id]?.size;
  if (size === undefined) throw new Error(`enemies/${def.id}: not in src/data/enemies.ts`);
  if (first.width !== size[0] || first.height !== size[1]) {
    throw new Error(
      `enemies/${def.id}: frame ${first.width}x${first.height}, data says ${size.join("x")}`,
    );
  }
  return {
    group: "enemies",
    id: def.id,
    width: first.width,
    height: first.height,
    palette: def.palette,
    layers: ["body"],
    frames: cels.map((body, i) => ({ cels: { body }, ms: FRAME_MS[i] ?? 300 })),
    tags: tagRun([
      ["idle", 2],
      ["attack", 2],
      ["hurt", 1],
    ]),
    output: "sheet",
  };
}

export function buildEnemies(): GroupOutput {
  const missing = Object.keys(ENEMY_DATA).filter((id) => !ENEMIES.some((e) => e.id === id));
  if (missing.length > 0) throw new Error(`enemies without art: ${missing.join(", ")}`);
  return { sprites: ENEMIES.map(sprite), files: {} };
}
