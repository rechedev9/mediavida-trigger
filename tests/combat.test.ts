import { describe, expect, test } from "bun:test";
import { memberDef } from "../src/data/party";
import type { Stats } from "../src/data/types";
import {
  elementFactor,
  gainXp,
  healAmount,
  hitChance,
  MAX_LEVEL,
  maxHp,
  maxMp,
  memberStats,
  pickWeighted,
  strike,
  tickAtb,
  xpToNext,
} from "../src/game/combat";

const STATS: Stats = {
  fuerza: 10,
  aguante: 10,
  velocidad: 10,
  magia: 10,
  precision: 10,
  evasion: 10,
  defMagica: 10,
};
const mid = (): number => 0.5;

describe("level curve", () => {
  test("xpToNext grows with level", () => {
    expect(xpToNext(1)).toBe(20);
    expect(xpToNext(10)).toBeGreaterThan(xpToNext(9));
  });

  test("gainXp carries leftover and levels several times", () => {
    expect(gainXp({ level: 1, xp: 0, gained: 25 })).toEqual({ level: 2, xp: 5 });
    const big = gainXp({ level: 1, xp: 0, gained: xpToNext(1) + xpToNext(2) });
    expect(big).toEqual({ level: 3, xp: 0 });
  });

  test("gainXp stops at the level cap", () => {
    expect(gainXp({ level: MAX_LEVEL - 1, xp: 0, gained: 1e9 })).toEqual({
      level: MAX_LEVEL,
      xp: 0,
    });
  });

  test("stats and pools respect their caps", () => {
    for (const id of ["novato", "mystee", "xboss"]) {
      const def = memberDef(id);
      expect(memberStats(def, MAX_LEVEL).velocidad).toBeLessThanOrEqual(24);
      expect(maxHp(def, MAX_LEVEL)).toBeLessThanOrEqual(999);
      expect(maxMp(def, MAX_LEVEL)).toBeLessThanOrEqual(99);
      expect(maxHp(def, 2)).toBeGreaterThan(maxHp(def, 1));
    }
  });
});

describe("damage", () => {
  const target = {
    weak: ["fuego" as const],
    resist: ["hielo" as const],
    absorb: ["sombra" as const],
  };

  test("elementFactor", () => {
    expect(elementFactor(target, null)).toBe(1);
    expect(elementFactor(target, "fuego")).toBe(2);
    expect(elementFactor(target, "hielo")).toBe(0.5);
    expect(elementFactor(target, "sombra")).toBe(-1);
    expect(elementFactor(target, "rayo")).toBe(1);
  });

  test("hitChance is clamped", () => {
    expect(hitChance(0, 200)).toBe(0.4);
    expect(hitChance(200, 0)).toBe(0.99);
  });

  test("physical strike misses on a high roll", () => {
    const r = strike({
      attacker: STATS,
      level: 1,
      defender: STATS,
      kind: "physical",
      power: 1,
      factor: 1,
      guard: 0,
      rng: () => 0.999,
    });
    expect(r).toEqual({ amount: 0, crit: false, miss: true });
  });

  test("weakness doubles and absorb heals", () => {
    const base = {
      attacker: STATS,
      level: 5,
      defender: STATS,
      kind: "magic" as const,
      power: 1,
      guard: 0,
      rng: mid,
    };
    const normal = strike({ ...base, factor: 1 }).amount;
    expect(Math.abs(strike({ ...base, factor: 2 }).amount - normal * 2)).toBeLessThanOrEqual(1);
    expect(strike({ ...base, factor: -1 }).amount).toBe(-normal);
  });

  test("guard reduces damage", () => {
    const base = {
      attacker: STATS,
      level: 5,
      defender: STATS,
      kind: "magic" as const,
      power: 1,
      factor: 1,
      rng: mid,
    };
    expect(strike({ ...base, guard: 0.5 }).amount).toBeLessThan(
      strike({ ...base, guard: 0 }).amount,
    );
  });

  test("healAmount scales with magic", () => {
    expect(healAmount({ magia: 20, level: 5, power: 1, rng: mid })).toBeGreaterThan(
      healAmount({ magia: 5, level: 5, power: 1, rng: mid }),
    );
  });
});

describe("ATB", () => {
  test("gauge fills faster with speed and caps at 1", () => {
    const slow = tickAtb({ gauge: 0, velocidad: 4, dt: 0.5 });
    const fast = tickAtb({ gauge: 0, velocidad: 20, dt: 0.5 });
    expect(fast).toBeGreaterThan(slow);
    expect(tickAtb({ gauge: 0.9, velocidad: 24, dt: 10 })).toBe(1);
  });

  test("pickWeighted follows weights", () => {
    const opts = [
      { id: "a", weight: 1 },
      { id: "b", weight: 3 },
    ];
    expect(pickWeighted(opts, () => 0.1)?.id).toBe("a");
    expect(pickWeighted(opts, () => 0.9)?.id).toBe("b");
    expect(pickWeighted([], () => 0.5)).toBeNull();
  });
});
