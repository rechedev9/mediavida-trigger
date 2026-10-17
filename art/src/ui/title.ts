import type { Palette } from "../types";

// Title backdrop: night sky, a clock that is also a portal, a town skyline.
export const TITLE_PALETTE: Palette = [
  "#000000",
  "#080818",
  "#101030",
  "#181848",
  "#283068",
  "#384888",
  "#5848a0",
  "#9868c0",
  "#f8f8f8",
  "#a8b0d8",
  "#582810",
  "#a84810",
  "#f88820",
  "#f8c048",
  "#f8f0c0",
  "#382868",
];

export const TITLE = {
  /** Sky bands from the top, as [palette index, height]; dithered in between. */
  sky: [
    [1, 40],
    [2, 50],
    [3, 40],
    [15, 30],
    [4, 64],
  ],
  clock: { cx: 128, cy: 98, ring: 66, ringWidth: 9, hourAngle: -32, minuteAngle: -6 },
  stars: { seed: 11, count: 140, bright: 18 },
  skyline: { seed: 5, base: 196 },
} as const;
