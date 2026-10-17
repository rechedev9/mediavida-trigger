import type { Encounter, ScriptApi } from "../game/script-api";
import type { Dir, EraMusic, TilesetId } from "./types";

export type Script = (api: ScriptApi) => Promise<void>;

export type LegendEntry = {
  tile: string;
  solid: boolean;
  /** Tile drawn above characters on the row above (tree tops, awnings). */
  above?: string;
};

export type NpcDef = {
  id: string;
  /** Sheet id under `chars/`, or null for an invisible interactable. */
  sprite: string | null;
  x: number;
  y: number;
  dir?: Dir;
  color?: string;
  wander?: boolean;
  /** Shown only while this flag is set. */
  showIf?: string;
  /** Hidden once this flag is set. */
  hideIf?: string;
  talk?: Script;
};

type WarpDef = {
  x: number;
  y: number;
  w?: number;
  h?: number;
  to: string;
  tx: number;
  ty: number;
  dir?: Dir;
  requires?: string;
  lockedText?: string;
};

export type SpawnDef = {
  id: string;
  x: number;
  y: number;
  /** Enemy shown on the map. */
  show: string;
  encounter: Encounter;
  /** Persisted flag set on victory; without it the spawn returns on the next visit. */
  flag?: string;
  requires?: string;
  /** Boss dialogue before the fight and the story beat after a win. */
  before?: Script;
  after?: Script;
};

type ChestDef = { id: string; x: number; y: number; item: string; n?: number };

type TriggerDef = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Runs once per save when set. */
  flag?: string;
  requires?: string;
  run: Script;
};

export type MapDef = {
  id: string;
  name: string;
  tileset: TilesetId;
  music: EraMusic;
  legend: Record<string, LegendEntry>;
  ground: string[];
  npcs: NpcDef[];
  warps: WarpDef[];
  spawns: SpawnDef[];
  chests: ChestDef[];
  saves: { x: number; y: number }[];
  triggers: TriggerDef[];
  onEnter?: Script;
};
