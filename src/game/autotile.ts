/** Picks draw names for map cells: edge blends, roof rows, 2x2 props, end caps and variants. */

type EdgeRule = { kind: "edge"; base: string; prefix: string; outer: readonly string[] };
type RowRule = { kind: "rows"; base: string; top: string; bottom: string };
type QuadRule = { kind: "quad"; base: string };
type CapRule = { kind: "caps"; base: string };
type Rule = EdgeRule | RowRule | QuadRule | CapRule;

const grassEdge = (base: string, prefix: string): EdgeRule => ({
  kind: "edge",
  base,
  prefix,
  outer: ["grass"],
});

const ROOF: RowRule = { kind: "rows", base: "roof", top: "roof-peak", bottom: "roof-edge" };

const RULES: Readonly<Record<string, readonly Rule[]>> = {
  plaza: [
    grassEdge("path", "path"),
    grassEdge("stone", "paving"),
    grassEdge("water", "shore"),
    ROOF,
    { kind: "quad", base: "fountain" },
    { kind: "caps", base: "counter" },
    { kind: "caps", base: "awning" },
  ],
  oro: [
    grassEdge("path", "path"),
    grassEdge("cobble", "cobble"),
    grassEdge("water", "shore"),
    { kind: "edge", base: "carpet", prefix: "carpet", outer: ["mfloor"] },
    ROOF,
    { kind: "quad", base: "table" },
  ],
  lan: [{ kind: "edge", base: "carpet", prefix: "carpet", outer: ["floor"] }],
  fin: [{ kind: "edge", base: "edge", prefix: "rim", outer: ["void"] }],
  cueva: [
    { kind: "edge", base: "sewer", prefix: "bank", outer: ["stone", "moss"] },
    { kind: "edge", base: "grate", prefix: "frame", outer: ["stone", "moss"] },
    { kind: "caps", base: "pipe" },
  ],
};

const VARIANT_BASES = new Set([
  "grass",
  "path",
  "stone",
  "cobble",
  "floor",
  "mfloor",
  "metal",
  "platform",
  "moss",
  "void",
]);

export type AutotileOptions = {
  grid: readonly (readonly (string | null)[])[];
  tileset: string;
  has: (name: string) => boolean;
};

function hash(x: number, y: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) % 100;
}

function edgeName(rule: EdgeRule, isOuter: (dx: number, dy: number) => boolean): string | null {
  const n = isOuter(0, -1);
  const s = isOuter(0, 1);
  const w = isOuter(-1, 0);
  const e = isOuter(1, 0);
  // A strip one tile wide has no matching art, so it keeps the plain tile.
  if ((n && s) || (w && e)) return null;
  const v = n ? "n" : s ? "s" : "";
  const h = w ? "w" : e ? "e" : "";
  if (v || h) return `${rule.prefix}-${v}${h}`;
  if (isOuter(-1, -1)) return `${rule.prefix}-inw`;
  if (isOuter(1, -1)) return `${rule.prefix}-ine`;
  if (isOuter(-1, 1)) return `${rule.prefix}-isw`;
  if (isOuter(1, 1)) return `${rule.prefix}-ise`;
  return null;
}

function ruleName(rule: Rule, at: (dx: number, dy: number) => string | null): string | null {
  const same = (dx: number, dy: number): boolean => at(dx, dy) === rule.base;
  switch (rule.kind) {
    case "edge":
      return edgeName(rule, (dx, dy) => {
        const t = at(dx, dy);
        return t !== null && rule.outer.some((o) => t.startsWith(o));
      });
    case "rows":
      if (!(at(0, -1) ?? "").startsWith(rule.base)) return rule.top;
      if (!(at(0, 1) ?? "").startsWith(rule.base)) return rule.bottom;
      return null;
    case "quad": {
      const v = same(0, 1) ? "n" : same(0, -1) ? "s" : "";
      const h = same(1, 0) ? "w" : same(-1, 0) ? "e" : "";
      return v && h ? `${rule.base}-${v}${h}` : null;
    }
    case "caps":
      if (!same(-1, 0) && same(1, 0)) return `${rule.base}-l`;
      if (!same(1, 0) && same(-1, 0)) return `${rule.base}-r`;
      return null;
  }
  return null;
}

/** Returns a grid of tile names to draw; null cells stay null. */
export function autotile(opts: AutotileOptions): (string | null)[][] {
  const rules = RULES[opts.tileset] ?? [];
  return opts.grid.map((row, y) =>
    row.map((tile, x) => {
      if (tile === null) return null;
      const at = (dx: number, dy: number): string | null => opts.grid[y + dy]?.[x + dx] ?? null;
      for (const rule of rules) {
        if (rule.base !== tile) continue;
        const name = ruleName(rule, at);
        if (name && opts.has(name)) return name;
      }
      if (!VARIANT_BASES.has(tile)) return tile;
      const roll = hash(x, y);
      if (roll < 18 && opts.has(`${tile}-2`)) return `${tile}-2`;
      if (roll < 24 && opts.has(`${tile}-3`)) return `${tile}-3`;
      return tile;
    }),
  );
}
