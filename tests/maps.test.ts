import { describe, expect, test } from "bun:test";
import { ENEMIES } from "../src/data/enemies";
import { ITEMS } from "../src/data/items";
import type { MapDef } from "../src/data/map-types";
import { MAPS } from "../src/data/maps";

function cell(m: MapDef, x: number, y: number): { solid: boolean } | null {
  const c = Array.from(m.ground[y] ?? "")[x];
  return c === undefined ? null : (m.legend[c] ?? null);
}

function onWarp(m: MapDef, x: number, y: number): boolean {
  return m.warps.some((w) => x >= w.x && x < w.x + (w.w ?? 1) && y >= w.y && y < w.y + (w.h ?? 1));
}

for (const m of Object.values(MAPS)) {
  describe(`map ${m.id}`, () => {
    test("rows are rectangular and use known legend keys", () => {
      const width = Array.from(m.ground[0] ?? "").length;
      for (const row of m.ground) {
        expect(Array.from(row).length).toBe(width);
        for (const c of Array.from(row)) expect(m.legend[c]).toBeDefined();
      }
    });

    test("warps land on open, non-warp tiles of an existing map", () => {
      for (const w of m.warps) {
        const dest = MAPS[w.to];
        expect(dest).toBeDefined();
        if (!dest) continue;
        expect(cell(dest, w.tx, w.ty)?.solid).toBe(false);
        expect(onWarp(dest, w.tx, w.ty)).toBe(false);
      }
    });

    test("entities sit on open tiles", () => {
      const spots = [...m.npcs.filter((n) => n.sprite), ...m.spawns, ...m.saves];
      for (const s of spots) expect(cell(m, s.x, s.y)?.solid).toBe(false);
    });

    test("chests, spawns and shops reference real data", () => {
      for (const c of m.chests) expect(ITEMS[c.item]).toBeDefined();
      for (const s of m.spawns) {
        expect(ENEMIES[s.show]).toBeDefined();
        for (const e of s.encounter.enemies) expect(ENEMIES[e]).toBeDefined();
      }
    });
  });
}
