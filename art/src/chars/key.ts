import type { CharKey } from "../types";

// Palette slots shared by every templated character (16 colors):
// 0 transparent, 1 outline, 2-4 skin (light to dark), 5-7 hair, 8-10 top,
// 11-12 bottom, 13-14 accent (shoes, trims, props), 15 white.
export const CHAR_KEY: CharKey = {
  o: 1,
  e: 1,
  "1": 2,
  "2": 3,
  "3": 4,
  k: 2,
  l: 3,
  m: 4,
  H: 5,
  I: 6,
  J: 7,
  a: 8,
  b: 9,
  c: 10,
  d: 11,
  f: 12,
  g: 13,
  h: 14,
  w: 15,
};
