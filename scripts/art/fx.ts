import { HEX_KEY } from "../../art/src/hex-key";
import { EFFECTS } from "../../art/src/fx/index";
import type { FxDef } from "../../art/src/types";
import { parseGrid } from "./canvas";
import type { GroupOutput, SpriteSpec } from "./sprite";

const SIZE = 32;

function sprite(def: FxDef): SpriteSpec {
  if (def.ms.length !== def.frames.length) throw new Error(`fx/${def.id}: ms and frames differ`);
  const cels = def.frames.map((g) => parseGrid(g, HEX_KEY));
  for (const c of cels) {
    if (c.width !== SIZE || c.height !== SIZE)
      throw new Error(`fx/${def.id}: frames must be 32x32`);
  }
  return {
    group: "fx",
    id: def.id,
    width: SIZE,
    height: SIZE,
    palette: def.palette,
    layers: ["fx"],
    frames: cels.map((fx, i) => ({ cels: { fx }, ms: def.ms[i] ?? 80 })),
    tags: [{ name: "play", from: 0, to: cels.length - 1 }],
    output: "sheet",
  };
}

export function buildFx(): GroupOutput {
  return { sprites: EFFECTS.map(sprite), files: {} };
}
