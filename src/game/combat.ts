import type { Element, EnemyDef, MemberDef, Stats } from "../data/types";

export type Rng = () => number;

export const MAX_LEVEL = 30;

export function memberStats(def: MemberDef, level: number): Stats {
  const n = level - 1;
  const g = (k: keyof Stats): number => Math.floor(def.base[k] + def.growth[k] * n);
  return {
    fuerza: g("fuerza"),
    aguante: g("aguante"),
    velocidad: Math.min(24, g("velocidad")),
    magia: g("magia"),
    precision: g("precision"),
    evasion: g("evasion"),
    defMagica: g("defMagica"),
  };
}

export function maxHp(def: MemberDef, level: number): number {
  return Math.min(999, def.hp[0] + def.hp[1] * (level - 1));
}

export function maxMp(def: MemberDef, level: number): number {
  return Math.min(99, def.mp[0] + def.mp[1] * (level - 1));
}

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return Math.round(20 * level ** 1.3);
}

/** Applies gained XP; returns the new level and the leftover XP toward the next one. */
export function gainXp(o: { level: number; xp: number; gained: number }): {
  level: number;
  xp: number;
} {
  let level = o.level;
  let xp = o.xp + o.gained;
  while (level < MAX_LEVEL && xp >= xpToNext(level)) {
    xp -= xpToNext(level);
    level++;
  }
  if (level >= MAX_LEVEL) xp = 0;
  return { level, xp };
}

/** 2 for a weakness, 0.5 for a resistance, -1 when the target absorbs the element. */
export function elementFactor(
  target: Pick<EnemyDef, "weak" | "resist" | "absorb">,
  element: Element | null,
): number {
  if (!element) return 1;
  if (target.absorb.includes(element)) return -1;
  if (target.weak.includes(element)) return 2;
  if (target.resist.includes(element)) return 0.5;
  return 1;
}

export function hitChance(precision: number, evasion: number): number {
  return Math.max(0.4, Math.min(0.99, 0.88 + (precision - evasion) / 60));
}

function critChance(precision: number): number {
  return Math.min(0.3, 0.05 + precision / 400);
}

export type Strike = { amount: number; crit: boolean; miss: boolean };

export type StrikeInput = {
  attacker: Stats;
  level: number;
  defender: Stats;
  kind: "physical" | "magic";
  power: number;
  /** Element factor; negative heals the target. */
  factor: number;
  /** Fraction of damage blocked by buffs, 0 to 1. */
  guard: number;
  rng: Rng;
};

export function strike(i: StrikeInput): Strike {
  const physical = i.kind === "physical";
  if (physical && i.rng() > hitChance(i.attacker.precision, i.defender.evasion)) {
    return { amount: 0, crit: false, miss: true };
  }
  const crit = physical && i.rng() < critChance(i.attacker.precision);
  const raw = physical
    ? i.attacker.fuerza * 2 + i.level * 1.5
    : i.attacker.magia * 2.2 + i.level * 1.5;
  const def = physical ? i.defender.aguante : i.defender.defMagica;
  const mitigation = 60 / (60 + def * 1.5);
  const variance = 0.9 + i.rng() * 0.2;
  const base = raw * i.power * mitigation * variance * (crit ? 1.5 : 1) * (1 - i.guard);
  if (i.factor === 0) return { amount: 0, crit, miss: false };
  const amount = Math.max(1, Math.round(base * Math.abs(i.factor)));
  return { amount: Math.min(9999, i.factor < 0 ? -amount : amount), crit, miss: false };
}

export function healAmount(o: { magia: number; level: number; power: number; rng: Rng }): number {
  const variance = 0.95 + o.rng() * 0.1;
  return Math.round((o.magia * 2 + o.level * 3 + 20) * o.power * variance);
}

/** ATB gauge fill per second; a gauge runs from 0 to 1. */
function atbRate(velocidad: number): number {
  return (velocidad + 12) / 36;
}

export function tickAtb(o: { gauge: number; velocidad: number; dt: number }): number {
  return Math.min(1, o.gauge + atbRate(o.velocidad) * o.dt);
}

/** Picks an item from `options` with probability proportional to `weight`. */
export function pickWeighted<T extends { weight: number }>(
  options: readonly T[],
  rng: Rng,
): T | null {
  const total = options.reduce((s, o) => s + o.weight, 0);
  let r = rng() * total;
  for (const o of options) {
    r -= o.weight;
    if (r < 0) return o;
  }
  return options.at(-1) ?? null;
}
