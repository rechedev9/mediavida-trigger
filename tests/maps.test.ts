import { describe, expect, test } from "bun:test";
import { ENEMIES } from "../src/data/enemies";
import { ITEMS } from "../src/data/items";
import type { MapDef } from "../src/data/map-types";
import { MAPS } from "../src/data/maps";

function cell(m: MapDef, x: number, y: number): { solid: boolean } | null {
  const c = Array.from(m.ground[y] ?? "")[x];
  return c === undefined ? null : (m.legend[c] ?? null);
}

/** Solid as the field sees it: the cell under a crown or awning is solid too. */
function blocked(m: MapDef, x: number, y: number): boolean {
  const c = cell(m, x, y);
  const below = Array.from(m.ground[y + 1] ?? "")[x];
  return !c || c.solid || Boolean(below && m.legend[below]?.above);
}

function isStallKeeper(m: MapDef, x: number, y: number): boolean {
  const below = Array.from(m.ground[y + 1] ?? "")[x];
  return below !== undefined && m.legend[below]?.tile === "counter";
}

/** Cells reachable on foot from every way into the map, around NPCs and chests. */
function reachable(m: MapDef): Set<string> {
  const starts: [number, number][] = m.warps.map((w) => [w.x, w.y]);
  for (const o of Object.values(MAPS))
    for (const w of o.warps) if (w.to === m.id) starts.push([w.tx, w.ty]);
  const occupied = new Set([...m.npcs, ...m.chests].map((e) => `${e.x},${e.y}`));
  const seen = new Set<string>();
  const queue = [...starts];
  for (let next = queue.pop(); next; next = queue.pop()) {
    const [x, y] = next;
    const key = `${x},${y}`;
    if (seen.has(key) || occupied.has(key) || blocked(m, x, y)) continue;
    seen.add(key);
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return seen;
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

    test("entities sit on open tiles; only stall keepers stand behind a counter", () => {
      const spots = [...m.npcs.filter((n) => n.sprite), ...m.spawns, ...m.saves, ...m.chests];
      for (const s of spots)
        expect(blocked(m, s.x, s.y) && !isStallKeeper(m, s.x, s.y)).toBe(false);
    });

    test("chests, saves and people to talk to can be reached", () => {
      const seen = reachable(m);
      const near = (x: number, y: number, reach: number): boolean =>
        [-reach, reach].some((d) => seen.has(`${x + d},${y}`) || seen.has(`${x},${y + d}`));
      for (const c of m.chests) expect(near(c.x, c.y, 1)).toBe(true);
      for (const s of m.saves) expect(seen.has(`${s.x},${s.y}`)).toBe(true);
      // A stall keeper is reached across the counter, two cells away.
      for (const npc of m.npcs.filter((n) => n.talk))
        expect(near(npc.x, npc.y, 1) || near(npc.x, npc.y, 2)).toBe(true);
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
