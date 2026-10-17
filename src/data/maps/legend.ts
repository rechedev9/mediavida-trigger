import type { LegendEntry } from "../map-types";

export function solid(tile: string, above?: string): LegendEntry {
  return above ? { tile, solid: true, above } : { tile, solid: true };
}

export function open(tile: string): LegendEntry {
  return { tile, solid: false };
}
