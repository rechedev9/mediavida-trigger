import type { MusicId, SfxId } from "../audio/audio";

export type Element = "fuego" | "hielo" | "rayo" | "sombra";

export const ELEMENT_NAMES: Record<Element, string> = {
  fuego: "Fuego",
  hielo: "Hielo",
  rayo: "Rayo",
  sombra: "Sombra",
};

export type Stats = {
  fuerza: number;
  aguante: number;
  velocidad: number;
  magia: number;
  precision: number;
  evasion: number;
  defMagica: number;
};

export const STAT_NAMES: Record<keyof Stats, string> = {
  fuerza: "Fuerza",
  aguante: "Aguante",
  velocidad: "Velocidad",
  magia: "Magia",
  precision: "Precisión",
  evasion: "Evasión",
  defMagica: "Def. Mágica",
};

export type FxId =
  | "slash"
  | "flame"
  | "ice"
  | "bolt"
  | "shadow"
  | "heal"
  | "buff"
  | "portal"
  | "sparkle"
  | "explosion";

export type MemberDef = {
  id: string;
  name: string;
  title: string;
  element: Element | null;
  /** Placeholder color while the sprite is missing. */
  color: string;
  hp: [number, number];
  mp: [number, number];
  base: Stats;
  growth: Stats;
  techs: { id: string; level: number }[];
};

export type TechKind = "physical" | "magic" | "heal" | "revive" | "buff";
export type TechTarget = "enemy" | "enemies" | "ally" | "allies";

export type TechDef = {
  id: string;
  name: string;
  desc: string;
  mp: number;
  kind: TechKind;
  element: Element | null;
  power: number;
  target: TechTarget;
  /** One id for a single tech, two or three for dual and triple techs. */
  users: string[];
  /** Dual and triple techs unlock when every user reaches this level. */
  minLevel: number;
  fx: FxId;
  sfx: SfxId;
};

type ItemKind = "hp" | "mp" | "revive" | "key";

export type ItemDef = {
  id: string;
  name: string;
  desc: string;
  kind: ItemKind;
  amount: number;
  price: number;
};

export type EnemyAttack = {
  name: string;
  kind: "physical" | "magic";
  element: Element | null;
  power: number;
  target: "one" | "all";
  fx: FxId;
  weight: number;
};

export type EnemyDef = {
  id: string;
  name: string;
  level: number;
  hp: number;
  stats: Stats;
  xp: number;
  karma: number;
  weak: Element[];
  resist: Element[];
  absorb: Element[];
  attacks: EnemyAttack[];
  drop: { item: string; chance: number } | null;
  boss: boolean;
  color: string;
  size: [number, number];
};

export type Dir = "down" | "up" | "left" | "right";

export type TilesetId = "plaza" | "lan" | "oro" | "fin" | "futuro" | "cueva";

export type EraMusic = Extract<
  MusicId,
  "plaza" | "lan" | "oro" | "fin" | "futuro" | "cueva" | "final" | "tension"
>;
