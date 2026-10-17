import type { MusicId, SfxId } from "../audio/audio";
import type { Dir } from "../data/types";
import type { GameState } from "./state";

export type Encounter = {
  /** Enemy ids; the battle lays them out in a formation. */
  enemies: string[];
  boss?: boolean;
  music?: MusicId;
  /** Boss fights cannot be fled. */
  canRun?: boolean;
};

/** What a map script can do. Every method that animates returns a promise to await. */
export interface ScriptApi {
  readonly state: GameState;
  say(who: string | null, text: string): Promise<void>;
  choose(o: { who: string | null; text: string; choices: string[] }): Promise<number>;
  wait(seconds: number): Promise<void>;
  fadeOut(seconds?: number): Promise<void>;
  fadeIn(seconds?: number): Promise<void>;
  flash(color: string): Promise<void>;
  shake(seconds: number): void;
  music(id: MusicId | null): void;
  sfx(id: SfxId): void;
  flag(name: string): number;
  setFlag(name: string, value?: number): void;
  join(id: string): Promise<void>;
  give(item: string, n?: number): Promise<void>;
  battle(e: Encounter): Promise<boolean>;
  warp(o: { map: string; x: number; y: number; dir?: Dir }): Promise<void>;
  npcWalk(id: string, steps: Dir[]): Promise<void>;
  npcFace(id: string, dir: Dir): void;
  npcShow(id: string, visible: boolean): void;
  npcPlace(o: { id: string; x: number; y: number }): void;
  playerWalk(steps: Dir[]): Promise<void>;
  playerFace(dir: Dir): void;
  healParty(): void;
  shop(items: string[]): Promise<void>;
  saveMenu(): Promise<void>;
  ending(): Promise<void>;
}
