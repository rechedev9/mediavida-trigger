import { playMusic, playSfx, stopMusic, type MusicId, type SfxId } from "../audio/audio";
import type { LegendEntry, MapDef, NpcDef, Script, SpawnDef } from "../data/map-types";
import { mapDef } from "../data/maps";
import { memberDef } from "../data/party";
import { itemDef } from "../data/items";
import type { Dir } from "../data/types";
import { drawText, drawWindow, measureText } from "../engine/gfx";
import { isHeld, wasPressed } from "../engine/input";
import type { Scene } from "../engine/scene";
import { SCREEN_H, SCREEN_W } from "../engine/screen";
import {
  drawTile,
  loadTileset,
  TILE,
  tileIsOver,
  tileIsSolid,
  type Tileset,
} from "../engine/tilemap";
import { autotile } from "./autotile";
import { BattleScene } from "./battle";
import { choose, say } from "./dialogue";
import { EndingScene } from "./ending";
import { fadeTo, game, shake } from "./game";
import { GameOverScene } from "./gameover";
import { MenuScene } from "./menu";
import type { Encounter, ScriptApi } from "./script-api";
import { ShopScene } from "./shop";
import { drawActor } from "./sprites";
import {
  activeIds,
  addItem,
  flag,
  joinParty,
  restoreAll,
  saveGame,
  setFlag,
  type GameState,
} from "./state";

type Actor = {
  id: string;
  sheet: string;
  color: string;
  x: number;
  y: number;
  dir: Dir;
  moving: boolean;
  t: number;
};

type Npc = Actor & { def: NpcDef; visible: boolean; wanderT: number };

/** `tile` is the legend tile used for logic; `draw` is the autotiled name shown on screen. */
type Cell = { tile: string; solid: boolean; draw: string };

const WALK = 72;
const RUN = 124;
const FOLLOW_GAP = 14;
const DIR_VEC: Record<Dir, [number, number]> = {
  down: [0, 1],
  up: [0, -1],
  left: [-1, 0],
  right: [1, 0],
};

function facingTag(a: Actor): { tag: string; flip: boolean } {
  const side = a.dir === "left" || a.dir === "right";
  const base = side ? "side" : a.dir;
  return { tag: `${a.moving ? "walk" : "idle"}-${base}`, flip: a.dir === "right" };
}

export class FieldScene implements Scene, ScriptApi {
  readonly transparent = false;
  private map: MapDef = mapDef("plaza");
  private set: Tileset | null = null;
  private cells: Cell[][] = [];
  private over: (string | null)[][] = [];
  private player: Actor = {
    id: "novato",
    sheet: "chars/novato",
    color: "#f88820",
    x: 0,
    y: 0,
    dir: "down",
    moving: false,
    t: 0,
  };
  private followers: Actor[] = [];
  private trail: { x: number; y: number; dir: Dir }[] = [];
  private npcs: Npc[] = [];
  private defeated = new Set<string>();
  private cooldown = 0;
  private busy = 0;
  private banner = 0;
  private cam = { x: 0, y: 0 };
  private firedTriggers = new Set<string>();
  private walking = false;

  get state(): GameState {
    return game.state;
  }

  private get w(): number {
    return this.cells[0]?.length ?? 0;
  }

  private get h(): number {
    return this.cells.length;
  }

  async enter(o: { map: string; x: number; y: number; dir: Dir }): Promise<void> {
    this.busy++;
    await this.load(o);
    this.busy--;
    void fadeTo({ alpha: 0, seconds: 0.6 });
    void this.run(this.map.onEnter);
  }

  private async load(o: { map: string; x: number; y: number; dir: Dir }): Promise<void> {
    this.map = mapDef(o.map);
    this.set = await loadTileset(this.map.tileset);
    this.parseMap();
    this.defeated.clear();
    this.firedTriggers.clear();
    this.state.map = o.map;
    this.state.x = o.x;
    this.state.y = o.y;
    this.state.dir = o.dir;
    this.player.x = o.x * TILE + TILE / 2;
    this.player.y = o.y * TILE + TILE;
    this.player.dir = o.dir;
    this.player.moving = false;
    this.trail = [];
    this.rebuildFollowers();
    this.npcs = this.map.npcs.map((def) => ({
      id: def.id,
      sheet: def.sprite ? `chars/${def.sprite}` : "",
      color: def.color ?? "#a08868",
      x: def.x * TILE + TILE / 2,
      y: def.y * TILE + TILE,
      dir: def.dir ?? "down",
      moving: false,
      t: Math.random(),
      def,
      visible: this.npcVisible(def),
      wanderT: 1 + Math.random() * 2,
    }));
    this.banner = 2.5;
    this.updateCamera();
    playMusic(this.map.music);
  }

  private npcVisible(def: NpcDef): boolean {
    if (def.showIf && !flag(this.state, def.showIf)) return false;
    if (def.hideIf && flag(this.state, def.hideIf)) return false;
    return true;
  }

  private parseMap(): void {
    const set = this.set;
    const fallback: LegendEntry = Object.values(this.map.legend)[0] ?? {
      tile: "floor",
      solid: false,
    };
    const width = Math.max(...this.map.ground.map((r) => Array.from(r).length));
    this.cells = this.map.ground.map((row) => {
      const chars = Array.from(row);
      return Array.from({ length: width }, (_, x) => {
        const e = this.map.legend[chars[x] ?? ""] ?? fallback;
        const known = set ? tileIsSolid(set, e.tile) : null;
        return { tile: e.tile, solid: e.solid || known === true, draw: e.tile };
      });
    });
    this.over = this.cells.map((row) => row.map(() => null));
    this.map.ground.forEach((row, y) => {
      Array.from(row).forEach((c, x) => {
        const above = this.map.legend[c]?.above;
        const line = this.over[y - 1];
        if (above && line) line[x] = above;
      });
    });
    const has = (name: string): boolean => set?.tiles.has(name) ?? false;
    const tileset = this.map.tileset;
    const grid = this.cells.map((row) => row.map((c) => c.tile));
    const drawn = autotile({ grid, tileset, has });
    this.cells.forEach((row, y) =>
      row.forEach((c, x) => {
        c.draw = drawn[y]?.[x] ?? c.tile;
      }),
    );
    this.over = autotile({ grid: this.over, tileset, has });
  }

  rebuildFollowers(): void {
    const ids = activeIds(this.state);
    const leader = ids[0] ?? "novato";
    const def = memberDef(leader);
    this.player.id = leader;
    this.player.sheet = `chars/${leader}`;
    this.player.color = def.color;
    this.followers = ids.slice(1).map((id) => ({
      id,
      sheet: `chars/${id}`,
      color: memberDef(id).color,
      x: this.player.x,
      y: this.player.y,
      dir: this.player.dir,
      moving: false,
      t: 0,
    }));
  }

  private async run(script: Script | undefined): Promise<void> {
    if (!script) return;
    this.busy++;
    try {
      await script(this);
    } finally {
      this.busy--;
    }
  }

  // ---- movement and collision ----

  private solidAt(px: number, py: number): boolean {
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return true;
    if (this.cells[ty]?.[tx]?.solid) return true;
    if (this.map.chests.some((c) => c.x === tx && c.y === ty)) return true;
    return false;
  }

  private blockedBy(o: { x: number; y: number; self: Actor | null }): boolean {
    const box = { l: o.x - 5, r: o.x + 5, t: o.y - 6, b: o.y - 1 };
    for (const [cx, cy] of [
      [box.l, box.t],
      [box.r, box.t],
      [box.l, box.b],
      [box.r, box.b],
    ] as const) {
      if (this.solidAt(cx, cy)) return true;
    }
    const actors: Actor[] = [
      ...this.npcs.filter((n) => n.visible),
      ...(o.self === this.player ? [] : [this.player]),
    ];
    return actors.some((a) => a !== o.self && Math.abs(a.x - o.x) < 11 && Math.abs(a.y - o.y) < 8);
  }

  private movePlayer(dt: number): void {
    let dx = 0;
    let dy = 0;
    if (isHeld("left")) dx -= 1;
    if (isHeld("right")) dx += 1;
    if (isHeld("up")) dy -= 1;
    if (isHeld("down")) dy += 1;
    const p = this.player;
    p.moving = dx !== 0 || dy !== 0;
    if (!p.moving) return;
    if (dx !== 0 && dy === 0) p.dir = dx < 0 ? "left" : "right";
    else if (dy !== 0 && dx === 0) p.dir = dy < 0 ? "up" : "down";
    else if (!(DIR_VEC[p.dir][0] === dx || DIR_VEC[p.dir][1] === dy))
      p.dir = dy < 0 ? "up" : "down";
    const speed = (isHeld("run") ? RUN : WALK) * dt * (dx !== 0 && dy !== 0 ? 0.7071 : 1);
    const ox = p.x;
    const oy = p.y;
    if (dx !== 0 && !this.blockedBy({ x: p.x + dx * speed, y: p.y, self: p })) p.x += dx * speed;
    if (dy !== 0 && !this.blockedBy({ x: p.x, y: p.y + dy * speed, self: p })) p.y += dy * speed;
    if (p.x !== ox || p.y !== oy) {
      this.trail.unshift({ x: p.x, y: p.y, dir: p.dir });
      if (this.trail.length > FOLLOW_GAP * 3 + 1) this.trail.length = FOLLOW_GAP * 3 + 1;
    } else {
      p.moving = false;
    }
  }

  private updateFollowers(): void {
    this.followers.forEach((f, i) => {
      const step = this.trail[(i + 1) * FOLLOW_GAP] ?? this.trail.at(-1);
      if (!step) {
        f.moving = false;
        return;
      }
      f.moving = this.player.moving && (f.x !== step.x || f.y !== step.y);
      f.x = step.x;
      f.y = step.y;
      f.dir = step.dir;
    });
  }

  private updateNpcs(dt: number): void {
    for (const n of this.npcs) {
      n.t += dt;
      if (!n.def.wander || !n.visible || this.busy > 0) continue;
      n.wanderT -= dt;
      if (n.wanderT > 0) continue;
      n.wanderT = 2 + Math.random() * 3;
      const dirs: Dir[] = ["down", "up", "left", "right"];
      const dir = dirs[Math.floor(Math.random() * 4)] ?? "down";
      const [vx, vy] = DIR_VEC[dir];
      const home = { x: n.def.x * TILE + TILE / 2, y: n.def.y * TILE + TILE };
      const nx = n.x + vx * TILE;
      const ny = n.y + vy * TILE;
      if (Math.abs(nx - home.x) > TILE * 2 || Math.abs(ny - home.y) > TILE * 2) continue;
      if (this.blockedBy({ x: nx, y: ny, self: n })) {
        n.dir = dir;
        continue;
      }
      void this.walkActor({ a: n, steps: [dir], speed: 32 });
    }
  }

  private walkActor(o: { a: Actor; steps: Dir[]; speed: number }): Promise<void> {
    const a = o.a;
    return o.steps.reduce<Promise<void>>(
      (p, dir) =>
        p.then(async () => {
          a.dir = dir;
          a.moving = true;
          const [vx, vy] = DIR_VEC[dir];
          const sx = a.x;
          const sy = a.y;
          await game.timers.tween(TILE / o.speed, (k) => {
            a.x = sx + vx * TILE * k;
            a.y = sy + vy * TILE * k;
          });
          a.moving = false;
        }),
      Promise.resolve(),
    );
  }

  // ---- interaction ----

  private frontPoint(): { x: number; y: number } {
    const [vx, vy] = DIR_VEC[this.player.dir];
    return { x: this.player.x + vx * 14, y: this.player.y - 4 + vy * 14 };
  }

  private interact(): void {
    const f = this.frontPoint();
    const tx = Math.floor(f.x / TILE);
    const ty = Math.floor(f.y / TILE);
    const [vx, vy] = DIR_VEC[this.player.dir];
    const near = (n: Npc, reach: number): boolean =>
      Math.abs(n.x - (f.x + vx * reach)) < 12 && Math.abs(n.y - 4 - (f.y + vy * reach)) < 12;
    // The second probe reaches across shop counters.
    const npc =
      this.npcs.find((n) => n.visible && near(n, 0)) ??
      this.npcs.find((n) => n.visible && near(n, 16));
    if (npc?.def.talk) {
      if (npc.def.sprite) npc.dir = opposite(this.player.dir);
      void this.run(npc.def.talk);
      return;
    }
    const chest = this.map.chests.find((c) => c.x === tx && c.y === ty);
    if (chest) {
      const key = `chest:${this.map.id}:${chest.id}`;
      if (flag(this.state, key)) return;
      setFlag(this.state, key);
      void this.run(async (api) => {
        await api.give(chest.item, chest.n ?? 1);
      });
      return;
    }
    const ptx = Math.floor(this.player.x / TILE);
    const pty = Math.floor((this.player.y - 4) / TILE);
    const save = this.map.saves.find(
      (s) => (s.x === tx && s.y === ty) || (s.x === ptx && s.y === pty),
    );
    if (save) void this.run(() => this.saveMenu());
  }

  private checkWarps(): void {
    const tx = Math.floor(this.player.x / TILE);
    const ty = Math.floor((this.player.y - 4) / TILE);
    for (const w of this.map.warps) {
      const inside = tx >= w.x && tx < w.x + (w.w ?? 1) && ty >= w.y && ty < w.y + (w.h ?? 1);
      if (!inside) continue;
      if (w.requires && !flag(this.state, w.requires)) {
        const [vx, vy] = DIR_VEC[this.player.dir];
        this.player.x -= vx * 6;
        this.player.y -= vy * 6;
        if (w.lockedText) {
          const text = w.lockedText;
          void this.run((api) => api.say(null, text));
        }
        return;
      }
      void this.run(async () => {
        playSfx("door");
        await this.warp({ map: w.to, x: w.tx, y: w.ty, dir: w.dir ?? this.player.dir });
      });
      return;
    }
  }

  private checkTriggers(): void {
    const tx = Math.floor(this.player.x / TILE);
    const ty = Math.floor((this.player.y - 4) / TILE);
    for (const t of this.map.triggers) {
      if (tx < t.x || tx >= t.x + t.w || ty < t.y || ty >= t.y + t.h) continue;
      if (t.requires && !flag(this.state, t.requires)) continue;
      if (t.flag && flag(this.state, t.flag)) continue;
      if (this.firedTriggers.has(t.id)) continue;
      this.firedTriggers.add(t.id);
      const fl = t.flag;
      void this.run(async (api) => {
        if (fl) setFlag(this.state, fl);
        await t.run(api);
      });
      return;
    }
  }

  private spawnVisible(s: SpawnDef): boolean {
    if (this.defeated.has(s.id)) return false;
    if (s.flag && flag(this.state, s.flag)) return false;
    if (s.requires && !flag(this.state, s.requires)) return false;
    return true;
  }

  private checkSpawns(): void {
    if (this.cooldown > 0) return;
    for (const s of this.map.spawns) {
      if (!this.spawnVisible(s)) continue;
      const sx = s.x * TILE + TILE / 2;
      const sy = s.y * TILE + TILE;
      if (Math.hypot(sx - this.player.x, sy - this.player.y) > 22) continue;
      void this.run(async (api) => {
        if (s.before) await s.before(api);
        const won = await this.battle(s.encounter);
        if (!won) return;
        this.defeated.add(s.id);
        if (s.flag) this.setFlag(s.flag);
        if (s.after) await s.after(api);
      });
      return;
    }
  }

  // ---- scene ----

  update(dt: number): void {
    this.banner = Math.max(0, this.banner - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.player.t += dt;
    for (const f of this.followers) f.t += dt;
    this.updateNpcs(dt);
    if (this.busy === 0) {
      this.movePlayer(dt);
      this.updateFollowers();
      if (wasPressed("confirm")) this.interact();
      else if (wasPressed("menu"))
        void this.run(async () => {
          await game.stack.run(new MenuScene());
          this.rebuildFollowers();
        });
      if (this.busy === 0) this.checkWarps();
      if (this.busy === 0) this.checkTriggers();
      if (this.busy === 0) this.checkSpawns();
    } else {
      if (!this.walking) this.player.moving = false;
      this.updateFollowers();
    }
    this.state.x = Math.floor(this.player.x / TILE);
    this.state.y = Math.floor((this.player.y - 1) / TILE);
    this.state.dir = this.player.dir;
    this.updateCamera();
  }

  private updateCamera(): void {
    const mw = this.w * TILE;
    const mh = this.h * TILE;
    const cx = this.player.x - SCREEN_W / 2;
    const cy = this.player.y - 16 - SCREEN_H / 2;
    this.cam.x = mw <= SCREEN_W ? (mw - SCREEN_W) / 2 : Math.max(0, Math.min(mw - SCREEN_W, cx));
    this.cam.y = mh <= SCREEN_H ? (mh - SCREEN_H) / 2 : Math.max(0, Math.min(mh - SCREEN_H, cy));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.drawWorld(ctx);
    if (this.banner > 0) {
      const w = measureText(this.map.name) + 24;
      ctx.globalAlpha = Math.min(1, this.banner * 2);
      drawWindow(ctx, { x: (SCREEN_W - w) / 2, y: 8, w, h: 24 });
      drawText(ctx, this.map.name, { x: SCREEN_W / 2, y: 14, align: "center", color: "#f8c060" });
      ctx.globalAlpha = 1;
    }
  }

  /** Draws the map and actors without the HUD; battles use the terrain alone as their backdrop. */
  drawWorld(ctx: CanvasRenderingContext2D, opts: { actors: boolean } = { actors: true }): void {
    const set = this.set;
    ctx.fillStyle = "#080810";
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (!set) return;
    const camX = Math.round(this.cam.x);
    const camY = Math.round(this.cam.y);
    const x0 = Math.max(0, Math.floor(camX / TILE));
    const y0 = Math.max(0, Math.floor(camY / TILE));
    const x1 = Math.min(this.w, Math.ceil((camX + SCREEN_W) / TILE) + 1);
    const y1 = Math.min(this.h, Math.ceil((camY + SCREEN_H) / TILE) + 1);
    const time = game.time;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const c = this.cells[y]?.[x];
        if (c)
          drawTile(ctx, set, {
            name: c.draw,
            x: x * TILE - camX,
            y: y * TILE - camY,
            time,
            solid: c.solid,
          });
      }
    }
    for (const s of this.map.saves) {
      drawTile(ctx, set, {
        name: "save",
        x: s.x * TILE - camX,
        y: s.y * TILE - camY,
        time,
        solid: false,
      });
    }
    for (const c of this.map.chests) {
      const open = flag(this.state, `chest:${this.map.id}:${c.id}`) > 0;
      drawTile(ctx, set, {
        name: open ? "chest-open" : "chest",
        x: c.x * TILE - camX,
        y: c.y * TILE - camY,
        time,
        solid: true,
      });
    }
    type Drawable = { y: number; draw: () => void };
    const list: Drawable[] = [];
    for (const s of this.map.spawns) {
      if (!opts.actors || !this.spawnVisible(s)) continue;
      const x = s.x * TILE + TILE / 2 - camX;
      const y = s.y * TILE + TILE - camY + Math.round(Math.sin(time * 3 + s.x) * 1.5);
      list.push({
        y,
        draw: () =>
          drawActor(ctx, {
            sheet: `enemies/${s.show}`,
            tag: "idle",
            t: time,
            x,
            y,
            color: "#c04848",
            size: [16, 18],
          }),
      });
    }
    const actors: Actor[] = opts.actors
      ? [...this.npcs.filter((n) => n.visible && n.sheet), ...this.followers, this.player]
      : [];
    for (const a of actors) {
      const { tag, flip } = facingTag(a);
      list.push({
        y: a.y,
        draw: () =>
          drawActor(ctx, {
            sheet: a.sheet,
            tag,
            t: a.t,
            x: a.x - camX,
            y: a.y - camY,
            flip,
            color: a.color,
          }),
      });
    }
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.draw();
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const name = this.over[y]?.[x];
        if (name)
          drawTile(ctx, set, { name, x: x * TILE - camX, y: y * TILE - camY, time, solid: false });
      }
    }
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const c = this.cells[y]?.[x];
        if (c && tileIsOver(set, c.draw))
          drawTile(ctx, set, {
            name: c.draw,
            x: x * TILE - camX,
            y: y * TILE - camY,
            time,
            solid: false,
          });
      }
    }
  }

  // ---- ScriptApi ----

  say(who: string | null, text: string): Promise<void> {
    return say(who, text);
  }

  choose(o: { who: string | null; text: string; choices: string[] }): Promise<number> {
    return choose(o);
  }

  wait(seconds: number): Promise<void> {
    return game.timers.wait(seconds);
  }

  fadeOut(seconds = 0.4): Promise<void> {
    return fadeTo({ alpha: 1, seconds, color: "#000000" });
  }

  fadeIn(seconds = 0.4): Promise<void> {
    return fadeTo({ alpha: 0, seconds });
  }

  async flash(color: string): Promise<void> {
    await fadeTo({ alpha: 0.9, seconds: 0.08, color });
    await fadeTo({ alpha: 0, seconds: 0.35 });
  }

  shake(seconds: number): void {
    shake(seconds);
  }

  music(id: MusicId | null): void {
    if (id) playMusic(id);
    else stopMusic();
  }

  sfx(id: SfxId): void {
    playSfx(id);
  }

  flag(name: string): number {
    return flag(this.state, name);
  }

  setFlag(name: string, value = 1): void {
    setFlag(this.state, name, value);
    for (const n of this.npcs) n.visible = this.npcVisible(n.def);
  }

  async join(id: string): Promise<void> {
    joinParty(this.state, id);
    this.rebuildFollowers();
    playSfx("levelup");
    await say(null, `¡${memberDef(id).name} se une al grupo!`);
  }

  async give(item: string, n = 1): Promise<void> {
    const def = itemDef(item);
    if (!def) return;
    addItem(this.state, item, n);
    playSfx("chest");
    await say(null, `Has obtenido: ${def.name}${n > 1 ? ` x${n}` : ""}.`);
  }

  async battle(e: Encounter): Promise<boolean> {
    playSfx("buzz");
    await this.flash("#ffffff");
    const scene = new BattleScene({ encounter: e, backdrop: (ctx) => this.drawWorld(ctx, { actors: false }),
    });
    const result = await game.stack.run(scene);
    playMusic(this.map.music);
    if (result === "win") return true;
    if (result === "run") {
      this.cooldown = 2.5;
      const [vx, vy] = DIR_VEC[this.player.dir];
      for (let i = 0; i < 4; i++) {
        const nx = this.player.x - vx * 6;
        const ny = this.player.y - vy * 6;
        if (!this.blockedBy({ x: nx, y: ny, self: this.player })) {
          this.player.x = nx;
          this.player.y = ny;
        }
      }
      return false;
    }
    game.stack.reset(new GameOverScene());
    return new Promise<boolean>(() => {});
  }

  async warp(o: { map: string; x: number; y: number; dir?: Dir }): Promise<void> {
    await this.fadeOut(0.3);
    await this.load({ map: o.map, x: o.x, y: o.y, dir: o.dir ?? this.player.dir });
    await this.fadeIn(0.3);
    const enter = this.map.onEnter;
    if (enter) void this.run(enter);
  }

  private npc(id: string): Npc | undefined {
    return this.npcs.find((n) => n.id === id);
  }

  async npcWalk(id: string, steps: Dir[]): Promise<void> {
    const n = this.npc(id);
    if (n) await this.walkActor({ a: n, steps, speed: 56 });
  }

  npcFace(id: string, dir: Dir): void {
    const n = this.npc(id);
    if (n) n.dir = dir;
  }

  npcShow(id: string, visible: boolean): void {
    const n = this.npc(id);
    if (n) n.visible = visible;
  }

  npcPlace(o: { id: string; x: number; y: number }): void {
    const n = this.npc(o.id);
    if (!n) return;
    n.x = o.x * TILE + TILE / 2;
    n.y = o.y * TILE + TILE;
  }

  async playerWalk(steps: Dir[]): Promise<void> {
    this.walking = true;
    const p = this.player;
    for (const dir of steps) {
      await this.walkActor({ a: p, steps: [dir], speed: 64 });
      p.moving = true;
      this.trail.unshift({ x: p.x, y: p.y, dir: p.dir });
      for (let i = 0; i < FOLLOW_GAP - 1; i++) this.trail.unshift({ x: p.x, y: p.y, dir: p.dir });
    }
    p.moving = false;
    this.walking = false;
  }

  playerFace(dir: Dir): void {
    this.player.dir = dir;
  }

  healParty(): void {
    restoreAll(this.state);
    playSfx("heal");
  }

  async shop(items: string[]): Promise<void> {
    await game.stack.run(new ShopScene(items));
  }

  async saveMenu(): Promise<void> {
    playSfx("save");
    restoreAll(this.state);
    const r = await choose({
      who: null,
      text: "Un hilo con chincheta. El grupo descansa. ¿Guardar la partida?",
      choices: ["Guardar", "No"],
    });
    if (r !== 0) return;
    const ok = saveGame(this.state);
    await say(null, ok ? "Partida guardada." : "No se pudo guardar la partida.");
  }

  async ending(): Promise<void> {
    await this.fadeOut(1);
    game.stack.reset(new EndingScene());
    await this.fadeIn(1);
  }
}

function opposite(d: Dir): Dir {
  if (d === "up") return "down";
  if (d === "down") return "up";
  if (d === "left") return "right";
  return "left";
}
