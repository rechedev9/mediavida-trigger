import { MAPS } from "../data/maps";
import { memberDef } from "../data/party";
import type { Dir } from "../data/types";
import { isRecord, num, str } from "../engine/guards";
import { maxHp, maxMp } from "./combat";

export type MemberState = { id: string; level: number; xp: number; hp: number; mp: number };

type Settings = {
  battleMode: "wait" | "active";
  windowTheme: number;
  music: number;
  sfx: number;
};

export type GameState = {
  members: Record<string, MemberState>;
  /** Joined members in formation order; the first three fight. */
  order: string[];
  items: Record<string, number>;
  karma: number;
  flags: Record<string, number>;
  map: string;
  x: number;
  y: number;
  dir: Dir;
  playtime: number;
  settings: Settings;
};

const SAVE_KEY = "mediavida-trigger.save.v1";
const DIRS: readonly Dir[] = ["down", "up", "left", "right"];

function newMember(id: string, level = 1): MemberState {
  const def = memberDef(id);
  return { id, level, xp: 0, hp: maxHp(def, level), mp: maxMp(def, level) };
}

export function newGame(): GameState {
  return {
    members: { novato: newMember("novato") },
    order: ["novato"],
    items: { cafe: 3, cerveza: 1 },
    karma: 50,
    flags: {},
    map: "plaza",
    x: 15,
    y: 19,
    dir: "up",
    playtime: 0,
    settings: { battleMode: "wait", windowTheme: 0, music: 0.6, sfx: 0.8 },
  };
}

export function activeIds(s: GameState): string[] {
  return s.order.slice(0, 3);
}

/** New members join at the average level of the party so they are not dead weight. */
export function joinParty(s: GameState, id: string): void {
  if (s.members[id]) return;
  const levels = s.order.map((m) => s.members[m]?.level ?? 1);
  const avg = Math.max(
    1,
    Math.round(levels.reduce((a, b) => a + b, 0) / Math.max(1, levels.length)),
  );
  s.members[id] = newMember(id, avg);
  s.order.push(id);
}

export function flag(s: GameState, name: string): number {
  return s.flags[name] ?? 0;
}

export function setFlag(s: GameState, name: string, value = 1): void {
  s.flags[name] = value;
}

export function addItem(s: GameState, id: string, n = 1): void {
  const next = (s.items[id] ?? 0) + n;
  if (next <= 0) delete s.items[id];
  else s.items[id] = Math.min(99, next);
}

export function restoreAll(s: GameState): void {
  for (const m of Object.values(s.members)) {
    const def = memberDef(m.id);
    m.hp = maxHp(def, m.level);
    m.mp = maxMp(def, m.level);
  }
}

export function serialize(s: GameState): string {
  return JSON.stringify({ version: 1, state: s });
}

function numberRecord(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!isRecord(v)) return out;
  for (const [k, n] of Object.entries(v))
    if (typeof n === "number" && Number.isFinite(n)) out[k] = n;
  return out;
}

function parseMember(id: string, v: unknown): MemberState | null {
  if (!isRecord(v)) return null;
  try {
    memberDef(id);
  } catch {
    return null;
  }
  const level = Math.max(1, Math.min(30, Math.floor(num(v.level, 1))));
  return {
    id,
    level,
    xp: Math.max(0, num(v.xp)),
    hp: Math.max(0, num(v.hp)),
    mp: Math.max(0, num(v.mp)),
  };
}

/** Returns null for anything that is not a valid save, so a corrupt slot never crashes the title screen. */
export function parseSave(text: string): GameState | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(data) || data.version !== 1 || !isRecord(data.state)) return null;
  const s = data.state;
  const base = newGame();
  const members: Record<string, MemberState> = {};
  if (isRecord(s.members)) {
    for (const [id, v] of Object.entries(s.members)) {
      const m = parseMember(id, v);
      if (m) members[id] = m;
    }
  }
  const order = Array.isArray(s.order)
    ? s.order.filter((id): id is string => typeof id === "string" && id in members)
    : [];
  if (order.length === 0) return null;
  const dir = DIRS.find((d) => d === s.dir) ?? "down";
  const st: Record<string, unknown> = isRecord(s.settings) ? s.settings : {};
  return {
    members,
    order,
    items: numberRecord(s.items),
    karma: Math.max(0, num(s.karma)),
    flags: numberRecord(s.flags),
    map: str(s.map) in MAPS ? str(s.map) : base.map,
    x: num(s.x, base.x),
    y: num(s.y, base.y),
    dir,
    playtime: num(s.playtime),
    settings: {
      battleMode: st.battleMode === "active" ? "active" : "wait",
      windowTheme: num(st.windowTheme),
      music: num(st.music, base.settings.music),
      sfx: num(st.sfx, base.settings.sfx),
    },
  };
}

export function saveGame(s: GameState): boolean {
  try {
    localStorage.setItem(SAVE_KEY, serialize(s));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(): GameState | null {
  try {
    const text = localStorage.getItem(SAVE_KEY);
    return text ? parseSave(text) : null;
  } catch {
    return null;
  }
}
