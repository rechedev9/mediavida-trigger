import type { CharKey } from "./types";

/** Generated enemy and effect grids store the palette index itself as one hex digit. */
export const HEX_KEY: CharKey = Object.fromEntries(
  Array.from("123456789abcdef").map((ch, i) => [ch, i + 1]),
);
