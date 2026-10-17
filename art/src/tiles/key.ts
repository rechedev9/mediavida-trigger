import type { CharKey } from "../types";

// Palette slots shared by every tileset, so common props (chests, doors, the save pin) fit any set:
// 1 outline, 2-4 ground ramp, 5-7 wood ramp, 8-10 stone ramp, 11-12 orange accent,
// 13-14 special ramp (water, glow, foliage), 15 highlight.
export const TILE_KEY: CharKey = {
  o: 1,
  "1": 2,
  "2": 3,
  "3": 4,
  a: 5,
  b: 6,
  c: 7,
  p: 8,
  q: 9,
  r: 10,
  x: 11,
  y: 12,
  g: 13,
  h: 14,
  w: 15,
};
