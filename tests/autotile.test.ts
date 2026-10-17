import { describe, expect, test } from "bun:test";
import { autotile } from "../src/game/autotile";

const grid = (rows: string[], legend: Record<string, string>): (string | null)[][] =>
  rows.map((r) => Array.from(r).map((c) => legend[c] ?? null));

const all = (): boolean => true;
const noVariants = (n: string): boolean => !/-\d$/.test(n);

describe("autotile", () => {
  test("a path patch on grass gets borders, corners and inner notches", () => {
    const g = grid(["gggg", "gppg", "gppp", "gppp"], { g: "grass-flower", p: "path" });
    const out = autotile({ grid: g, tileset: "plaza", has: (n) => n !== "grass-flower-2" });
    expect(out[1]?.[1]).toBe("path-nw");
    expect(out[1]?.[2]).toBe("path-ne");
    expect(out[2]?.[1]).toBe("path-w");
    expect(out[2]?.[2]).toBe("path-ine");
  });

  test("a one-tile-wide strip keeps the plain tile", () => {
    const g = grid(["ggg", "gpg", "ggg"], { g: "grass-flower", p: "path" });
    expect(autotile({ grid: g, tileset: "plaza", has: noVariants })[1]?.[1]).toBe("path");
  });

  test("2x2 props, roof rows and end caps", () => {
    const g = grid(["^^", "^^", "OO", "OO"], { "^": "roof", O: "fountain" });
    const out = autotile({ grid: g, tileset: "plaza", has: all });
    expect(out[0]).toEqual(["roof-peak", "roof-peak"]);
    expect(out[1]).toEqual(["roof-edge", "roof-edge"]);
    expect(out[2]).toEqual(["fountain-nw", "fountain-ne"]);
    expect(out[3]).toEqual(["fountain-sw", "fountain-se"]);
    const caps = autotile({ grid: [["pipe", "pipe"]], tileset: "cueva", has: all });
    expect(caps[0]).toEqual(["pipe-l", "pipe-r"]);
  });

  test("missing art falls back to the legend tile and nulls stay null", () => {
    const g = grid(["gp", "gp"], { g: "grass-flower", p: "path" });
    g[0]?.push(null);
    const out = autotile({ grid: g, tileset: "plaza", has: () => false });
    expect(out[0]).toEqual(["grass-flower", "path", null]);
  });
});
