import { CHARACTERS } from "../../art/src/chars/index";
import { FACE_TEMPLATE } from "../../art/src/chars/face-template";
import { CHAR_KEY } from "../../art/src/chars/key";
import type { CharDef, FaceDef, FacePart } from "../../art/src/types";
import { Canvas, parseGrid } from "./canvas";
import type { SpriteSpec } from "./sprite";

function drawParts(c: Canvas, parts: readonly FacePart[] | undefined): void {
  for (const p of parts ?? []) c.draw(parseGrid(p.grid, CHAR_KEY), { at: p.at ?? [0, 0] });
}

function layer(): Canvas {
  return new Canvas(32, 32);
}

function faceSprite(def: CharDef, face: FaceDef): SpriteSpec {
  const back = layer();
  drawParts(back, face.back);
  const base = layer();
  base.draw(parseGrid(FACE_TEMPLATE, CHAR_KEY));
  const hair = layer();
  drawParts(hair, [{ grid: face.hair }]);
  const acc = layer();
  drawParts(acc, face.acc);
  return {
    group: "faces",
    id: def.id,
    width: 32,
    height: 32,
    palette: def.palette,
    layers: ["back", "face", "hair", "acc"],
    frames: [{ ms: 100, cels: { back, face: base, hair, acc } }],
    tags: [],
    output: "png",
  };
}

export function buildFaceSprites(): SpriteSpec[] {
  return CHARACTERS.flatMap((def) => (def.face === undefined ? [] : [faceSprite(def, def.face)]));
}
