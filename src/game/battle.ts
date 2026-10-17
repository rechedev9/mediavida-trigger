import { playMusic, playSfx } from "../audio/audio";
import { enemyDef } from "../data/enemies";
import { itemDef } from "../data/items";
import { memberDef } from "../data/party";
import { comboTechs, techDef } from "../data/techs";
import type { EnemyAttack, EnemyDef, FxId, ItemDef, Stats, TechDef } from "../data/types";
import { drawBar, drawText, drawWindow, measureText } from "../engine/gfx";
import { isHeld, wasPressed, wasRepeated } from "../engine/input";
import type { Scene } from "../engine/scene";
import { SCREEN_H, SCREEN_W } from "../engine/screen";
import { easeOut } from "../engine/tween";
import {
  elementFactor,
  gainXp,
  healAmount,
  maxHp,
  maxMp,
  memberStats,
  pickWeighted,
  strike,
  tickAtb,
} from "./combat";
import { say } from "./dialogue";
import { game } from "./game";
import type { Encounter } from "./script-api";
import { drawActor, drawFx } from "./sprites";
import { activeIds, addItem, type MemberState } from "./state";
import { drawCursor, ListMenu } from "./ui";

type Fighter = {
  key: string;
  side: "party" | "enemy";
  id: string;
  name: string;
  level: number;
  stats: Stats;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atb: number;
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  sheet: string;
  anim: string;
  animT: number;
  loop: boolean;
  alpha: number;
  guard: number;
  color: string;
  size: [number, number];
  enemy: EnemyDef | null;
  member: MemberState | null;
  acting: boolean;
  hurtT: number;
};

type Action =
  | { kind: "attack"; actor: Fighter; target: Fighter }
  | { kind: "tech"; actor: Fighter; tech: TechDef; partners: Fighter[]; targets: Fighter[] }
  | { kind: "item"; actor: Fighter; item: ItemDef; target: Fighter }
  | { kind: "enemy"; actor: Fighter; attack: EnemyAttack };

type TechOption = { tech: TechDef; partners: Fighter[]; enabled: boolean };

type Pending =
  | { kind: "attack" }
  | { kind: "tech"; option: TechOption }
  | { kind: "item"; item: ItemDef };

type Ui = "idle" | "command" | "techs" | "items" | "target";

type Popup = { x: number; y: number; text: string; color: string; t: number };
type Fx = { id: FxId; x: number; y: number; t: number };

const PARTY_SLOTS: [number, number][] = [
  [196, 112],
  [222, 136],
  [190, 156],
];

function formation(n: number, boss: boolean): [number, number][] {
  if (boss) return [[78, 140]];
  const layouts: [number, number][][] = [
    [[76, 128]],
    [
      [60, 108],
      [100, 140],
    ],
    [
      [52, 100],
      [104, 116],
      [60, 152],
    ],
    [
      [44, 100],
      [100, 100],
      [52, 150],
      [108, 150],
    ],
  ];
  const fixed = layouts[n - 1];
  if (fixed) return fixed;
  return Array.from({ length: n }, (_, i): [number, number] => [
    36 + (i % 3) * 40,
    96 + Math.floor(i / 3) * 44,
  ]);
}

export class BattleScene implements Scene {
  readonly transparent = false;
  private fighters: Fighter[] = [];
  private queue: Action[] = [];
  private ready: Fighter[] = [];
  private busy = false;
  private phase: "intro" | "run" | "end" = "intro";
  private phaseT = 0;
  private ui: Ui = "idle";
  private actor: Fighter | null = null;
  private command = new ListMenu([{ label: "Atacar" }, { label: "Técnica" }, { label: "Objeto" }], {
    rows: 3,
  });
  private list = new ListMenu([], { rows: 5 });
  private techOptions: TechOption[] = [];
  private itemIds: string[] = [];
  private pending: Pending | null = null;
  private targets: Fighter[] = [];
  private targetAll = false;
  private targetIndex = 0;
  private caption = "";
  private popups: Popup[] = [];
  private effects: Fx[] = [];
  private escapeT = 0;
  private t = 0;
  private readonly encounter: Encounter;
  private readonly backdrop: (ctx: CanvasRenderingContext2D) => void;

  constructor(o: { encounter: Encounter; backdrop: (ctx: CanvasRenderingContext2D) => void }) {
    this.encounter = o.encounter;
    this.backdrop = o.backdrop;
    const s = game.state;
    activeIds(s).forEach((id, i) => {
      const m = s.members[id];
      const slot = PARTY_SLOTS[i];
      if (!m || !slot) return;
      const def = memberDef(id);
      this.fighters.push({
        key: `p${i}`,
        side: "party",
        id,
        name: def.name,
        level: m.level,
        stats: memberStats(def, m.level),
        hp: m.hp,
        maxHp: maxHp(def, m.level),
        mp: m.mp,
        maxMp: maxMp(def, m.level),
        atb: Math.random() * 0.5,
        homeX: slot[0],
        homeY: slot[1],
        x: slot[0] + 80,
        y: slot[1],
        sheet: `chars/${id}`,
        anim: m.hp > 0 ? "idle-side" : "ko",
        animT: 0,
        loop: true,
        alpha: 1,
        guard: 0,
        color: def.color,
        size: [12, 26],
        enemy: null,
        member: m,
        acting: false,
        hurtT: 0,
      });
    });
    const spots = formation(o.encounter.enemies.length, o.encounter.boss ?? false);
    o.encounter.enemies.forEach((id, i) => {
      const def = enemyDef(id);
      const [x, y] = spots[i] ?? [60, 120];
      this.fighters.push({
        key: `e${i}`,
        side: "enemy",
        id,
        name: def.name,
        level: def.level,
        stats: def.stats,
        hp: def.hp,
        maxHp: def.hp,
        mp: 0,
        maxMp: 0,
        atb: Math.random() * 0.4,
        homeX: x,
        homeY: y,
        x: x - 80,
        y,
        sheet: `enemies/${id}`,
        anim: "idle",
        animT: Math.random(),
        loop: true,
        alpha: 0,
        guard: 0,
        color: def.color,
        size: def.size,
        enemy: def,
        member: null,
        acting: false,
        hurtT: 0,
      });
    });
  }

  onEnter(): void {
    playMusic(this.encounter.music ?? (this.encounter.boss ? "boss" : "battle"));
    for (const f of this.fighters) {
      const sx = f.x;
      void game.timers.tween(
        0.45,
        (k) => {
          f.x = sx + (f.homeX - sx) * k;
          if (f.side === "enemy") f.alpha = k;
        },
        easeOut,
      );
    }
  }

  private get party(): Fighter[] {
    return this.fighters.filter((f) => f.side === "party");
  }

  private get foes(): Fighter[] {
    return this.fighters.filter((f) => f.side === "enemy" && f.hp > 0);
  }

  private alive(f: Fighter): boolean {
    return f.hp > 0;
  }

  private setAnim(f: Fighter, anim: string, loop = true): void {
    f.anim = anim;
    f.animT = 0;
    f.loop = loop;
  }

  private restAnim(f: Fighter): string {
    if (f.side === "enemy") return "idle";
    if (f.hp <= 0) return "ko";
    return "idle-side";
  }

  // ---- update ----

  update(dt: number): void {
    this.t += dt;
    for (const f of this.fighters) {
      f.animT += dt;
      f.hurtT = Math.max(0, f.hurtT - dt);
    }
    for (const p of this.popups) p.t += dt;
    this.popups = this.popups.filter((p) => p.t < 0.9);
    for (const e of this.effects) e.t += dt;

    if (this.phase === "intro") {
      this.phaseT += dt;
      if (this.phaseT > 0.5) this.phase = "run";
      return;
    }
    if (this.phase !== "run") return;

    this.updateEscape(dt);
    if (this.phase !== "run") return;

    // Wait mode is fully turn based: gauges stop while a party member is choosing.
    const choosing = this.ui !== "idle";
    const paused = this.busy || (game.state.settings.battleMode === "wait" && choosing);
    if (!paused) this.tickGauges(dt);

    if (this.ui === "idle") this.openNextCommand();
    this.updateUi(dt);

    if (!this.busy) {
      const next = this.queue.shift();
      if (next) {
        this.busy = true;
        void this.execute(next).then(() => {
          this.busy = false;
          this.checkEnd();
        });
      }
    }
  }

  private updateEscape(dt: number): void {
    const canRun = this.encounter.canRun ?? !this.encounter.boss;
    if (!canRun || !isHeld("run")) {
      this.escapeT = 0;
      return;
    }
    this.escapeT += dt;
    if (this.escapeT < 1.2 || this.busy) return;
    this.phase = "end";
    playSfx("run");
    void this.leave("run");
  }

  private tickGauges(dt: number): void {
    for (const f of this.fighters) {
      if (!this.alive(f) || f.acting || f.atb >= 1) continue;
      f.atb = tickAtb({ gauge: f.atb, velocidad: f.stats.velocidad, dt });
      if (f.atb < 1) continue;
      if (f.side === "party") {
        this.ready.push(f);
      } else {
        const attack = f.enemy ? pickWeighted(f.enemy.attacks, Math.random) : null;
        if (attack) {
          f.acting = true;
          this.queue.push({ kind: "enemy", actor: f, attack });
        }
      }
    }
  }

  private openNextCommand(): void {
    this.ready = this.ready.filter((f) => this.alive(f) && !f.acting);
    const next = this.ready[0];
    if (!next) return;
    this.actor = next;
    this.ui = "command";
    this.command.index = 0;
  }

  private updateUi(dt: number): void {
    const actor = this.actor;
    if (this.ui === "idle" || !actor) return;
    if (!this.alive(actor)) {
      this.closeUi();
      return;
    }
    if (this.ui === "command") {
      const r = this.command.update(dt);
      if (r === "cancel" && this.ready.length > 1) {
        this.ready.push(this.ready.shift() ?? actor);
        this.closeUi();
      }
      if (r !== "confirm") return;
      if (this.command.index === 0) this.beginTarget({ kind: "attack" });
      if (this.command.index === 1) this.openTechs(actor);
      if (this.command.index === 2) this.openItems();
      return;
    }
    if (this.ui === "techs" || this.ui === "items") {
      const r = this.list.update(dt);
      if (r === "cancel") this.ui = "command";
      if (r !== "confirm") return;
      if (this.ui === "techs") {
        const option = this.techOptions[this.list.index];
        if (option) this.beginTarget({ kind: "tech", option });
      } else {
        const item = itemDef(this.itemIds[this.list.index] ?? "");
        if (item) this.beginTarget({ kind: "item", item });
      }
      return;
    }
    if (this.ui === "target") this.updateTarget(actor);
  }

  private closeUi(): void {
    this.ui = "idle";
    this.actor = null;
    this.pending = null;
  }

  private openTechs(actor: Fighter): void {
    this.techOptions = this.techsFor(actor);
    if (this.techOptions.length === 0) {
      playSfx("buzz");
      return;
    }
    this.list = new ListMenu(
      this.techOptions.map((o) => ({
        label: o.tech.users.length > 1 ? `${o.tech.name}*` : o.tech.name,
        right: String(o.tech.mp),
        enabled: o.enabled,
      })),
      { rows: 5 },
    );
    this.ui = "techs";
  }

  private techsFor(actor: Fighter): TechOption[] {
    const def = memberDef(actor.id);
    const singles = def.techs
      .filter((t) => t.level <= actor.level)
      .map((t) => techDef(t.id))
      .filter((t): t is TechDef => t !== null)
      .map((tech) => ({ tech, partners: [], enabled: actor.mp >= tech.mp }));
    const combos: TechOption[] = [];
    for (const tech of comboTechs()) {
      if (!tech.users.includes(actor.id)) continue;
      const users = tech.users.map((id) => this.party.find((f) => f.id === id));
      const present = users.filter((u): u is Fighter => u !== undefined);
      if (present.length !== tech.users.length) continue;
      if (present.some((u) => u.level < tech.minLevel)) continue;
      const partners = present.filter((u) => u !== actor);
      const enabled =
        present.every((u) => this.alive(u) && u.mp >= tech.mp) &&
        partners.every((u) => u.atb >= 1 && !u.acting);
      combos.push({ tech, partners, enabled });
    }
    return [...singles, ...combos];
  }

  private openItems(): void {
    this.itemIds = Object.keys(game.state.items).filter((id) => {
      const d = itemDef(id);
      return d !== null && d.kind !== "key";
    });
    if (this.itemIds.length === 0) {
      playSfx("buzz");
      return;
    }
    this.list = new ListMenu(
      this.itemIds.map((id) => ({
        label: itemDef(id)?.name ?? id,
        right: `x${game.state.items[id] ?? 0}`,
      })),
      { rows: 5 },
    );
    this.ui = "items";
  }

  private beginTarget(p: Pending): void {
    let candidates: Fighter[];
    let all = false;
    if (p.kind === "attack") {
      candidates = this.foes;
    } else if (p.kind === "tech") {
      const t = p.option.tech;
      const allies =
        t.kind === "revive"
          ? this.party.filter((f) => !this.alive(f))
          : this.party.filter((f) => this.alive(f));
      candidates = t.target === "enemy" || t.target === "enemies" ? this.foes : allies;
      all = t.target === "enemies" || t.target === "allies";
      if (t.kind === "revive" && t.target === "allies") all = true;
    } else {
      candidates =
        p.item.kind === "revive"
          ? this.party.filter((f) => !this.alive(f))
          : this.party.filter((f) => this.alive(f));
    }
    if (candidates.length === 0) {
      playSfx("buzz");
      return;
    }
    this.pending = p;
    this.targets = candidates.toSorted((a, b) => a.homeY - b.homeY || a.homeX - b.homeX);
    this.targetAll = all;
    this.targetIndex = 0;
    this.ui = "target";
  }

  private updateTarget(actor: Fighter): void {
    const n = this.targets.length;
    if (!this.targetAll) {
      const prev = this.targetIndex;
      if (wasRepeated("down") || wasRepeated("right"))
        this.targetIndex = (this.targetIndex + 1) % n;
      if (wasRepeated("up") || wasRepeated("left"))
        this.targetIndex = (this.targetIndex - 1 + n) % n;
      if (prev !== this.targetIndex) playSfx("cursor");
    }
    if (wasPressed("cancel")) {
      playSfx("cancel");
      this.ui =
        this.pending?.kind === "tech"
          ? "techs"
          : this.pending?.kind === "item"
            ? "items"
            : "command";
      return;
    }
    if (!wasPressed("confirm") || !this.pending) return;
    playSfx("confirm");
    const target = this.targets[this.targetIndex];
    const chosen = this.targetAll ? this.targets : target ? [target] : [];
    const p = this.pending;
    if (p.kind === "attack" && target) {
      this.enqueue({ kind: "attack", actor, target });
    } else if (p.kind === "tech") {
      for (const partner of p.option.partners) partner.acting = true;
      this.ready = this.ready.filter((f) => !p.option.partners.includes(f));
      this.enqueue({
        kind: "tech",
        actor,
        tech: p.option.tech,
        partners: p.option.partners,
        targets: chosen,
      });
    } else if (p.kind === "item" && target) {
      addItem(game.state, p.item.id, -1);
      this.enqueue({ kind: "item", actor, item: p.item, target });
    }
  }

  private enqueue(a: Action): void {
    a.actor.acting = true;
    this.ready = this.ready.filter((f) => f !== a.actor);
    this.queue.push(a);
    this.closeUi();
  }

  // ---- actions ----

  private async execute(a: Action): Promise<void> {
    if (!this.alive(a.actor)) {
      a.actor.acting = false;
      return;
    }
    if (a.kind === "attack") await this.doAttack(a.actor, a.target);
    if (a.kind === "tech") await this.doTech(a);
    if (a.kind === "item") await this.doItem(a.actor, a.item, a.target);
    if (a.kind === "enemy") await this.doEnemy(a.actor, a.attack);
    this.caption = "";
    for (const f of [a.actor, ...(a.kind === "tech" ? a.partners : [])]) {
      f.atb = 0;
      f.acting = false;
      if (this.alive(f) || f.side === "party") this.setAnim(f, this.restAnim(f));
    }
  }

  private retarget(target: Fighter): Fighter | null {
    if (this.alive(target)) return target;
    const pool = target.side === "enemy" ? this.foes : this.party.filter((f) => this.alive(f));
    return pool[Math.floor(Math.random() * pool.length)] ?? null;
  }

  private async moveTo(f: Fighter, o: { x: number; y: number; seconds: number }): Promise<void> {
    const sx = f.x;
    const sy = f.y;
    await game.timers.tween(o.seconds, (k) => {
      f.x = sx + (o.x - sx) * k;
      f.y = sy + (o.y - sy) * k;
    });
  }

  private async lunge(actor: Fighter, target: Fighter): Promise<void> {
    const side = actor.side === "party" ? 1 : -1;
    await this.moveTo(actor, { x: target.homeX + side * 22, y: target.homeY + 1, seconds: 0.18 });
  }

  private async goHome(f: Fighter): Promise<void> {
    await this.moveTo(f, { x: f.homeX, y: f.homeY, seconds: 0.18 });
  }

  private async doAttack(actor: Fighter, chosen: Fighter): Promise<void> {
    const target = this.retarget(chosen);
    if (!target) return;
    await this.lunge(actor, target);
    this.setAnim(actor, "attack", false);
    await game.timers.wait(0.12);
    this.spawnFx({ id: "slash", target });
    this.hitWith({ actor, target, kind: "physical", power: 1, element: null });
    await game.timers.wait(0.25);
    await this.goHome(actor);
  }

  private async doTech(a: Extract<Action, { kind: "tech" }>): Promise<void> {
    const users = [a.actor, ...a.partners].filter((u) => this.alive(u));
    if (users.length !== 1 + a.partners.length) return;
    const t = a.tech;
    if (users.some((u) => u.mp < t.mp)) return;
    for (const u of users) u.mp -= t.mp;
    this.caption = t.name;
    let targets: Fighter[];
    if (t.kind === "revive") targets = a.targets.filter((f) => !this.alive(f));
    else if (t.target === "enemies") targets = this.foes;
    else if (t.target === "allies") targets = this.party.filter((f) => this.alive(f));
    else targets = a.targets.map((f) => this.retarget(f)).filter((f): f is Fighter => f !== null);
    if (targets.length === 0) return;
    const level = Math.round(users.reduce((s, u) => s + u.level, 0) / users.length);
    const stats = bestStats(users);
    const physicalSingle = t.kind === "physical" && t.target === "enemy";
    const first = targets[0];
    if (physicalSingle && first && users.length === 1) {
      await this.lunge(a.actor, first);
      this.setAnim(a.actor, "attack", false);
    } else {
      for (const u of users) this.setAnim(u, "cast", false);
      playSfx(t.sfx);
    }
    await game.timers.wait(0.35);
    for (const target of targets) {
      this.spawnFx({ id: t.fx, target });
      if (t.kind === "physical" || t.kind === "magic") {
        this.hitWith({
          actor: a.actor,
          target,
          kind: t.kind,
          power: t.power,
          element: t.element,
          stats,
          level,
        });
      } else if (t.kind === "heal") {
        this.heal(
          target,
          healAmount({ magia: stats.magia, level, power: t.power, rng: Math.random }),
        );
      } else if (t.kind === "revive") {
        target.hp = Math.max(1, Math.round(target.maxHp * t.power));
        this.setAnim(target, "idle-side");
        this.pop({ target, text: String(target.hp), color: "#80f090" });
      } else {
        target.guard = Math.min(0.6, Math.max(target.guard, t.power));
        this.pop({ target, text: "Defensa+", color: "#f8c040" });
      }
      await game.timers.wait(0.08);
    }
    await game.timers.wait(0.3);
    if (physicalSingle && users.length === 1) await this.goHome(a.actor);
  }

  private async doItem(actor: Fighter, item: ItemDef, chosen: Fighter): Promise<void> {
    this.caption = item.name;
    this.setAnim(actor, "cast", false);
    await game.timers.wait(0.25);
    const target = item.kind === "revive" ? chosen : this.retarget(chosen);
    if (!target) return;
    this.spawnFx({ id: "heal", target });
    if (item.kind === "hp" && this.alive(target)) this.heal(target, item.amount);
    if (item.kind === "mp" && this.alive(target)) {
      const before = target.mp;
      target.mp = Math.min(target.maxMp, target.mp + item.amount);
      this.pop({ target, text: `PM ${target.mp - before}`, color: "#80c8f8" });
      playSfx("heal");
    }
    if (item.kind === "revive" && !this.alive(target)) {
      target.hp = Math.max(1, Math.round(target.maxHp * item.amount));
      this.setAnim(target, "idle-side");
      this.pop({ target, text: String(target.hp), color: "#80f090" });
      playSfx("heal");
    }
    await game.timers.wait(0.35);
  }

  private async doEnemy(actor: Fighter, attack: EnemyAttack): Promise<void> {
    const alive = this.party.filter((f) => this.alive(f));
    if (alive.length === 0) return;
    const targets =
      attack.target === "all"
        ? alive
        : [alive[Math.floor(Math.random() * alive.length)] ?? alive[0]].filter(
            (f): f is Fighter => f !== undefined,
          );
    this.caption = attack.name;
    this.setAnim(actor, "attack", false);
    const sx = actor.x;
    await game.timers.tween(0.12, (k) => {
      actor.x = sx + 12 * k;
    });
    if (attack.element)
      playSfx(
        attack.element === "fuego"
          ? "fire"
          : attack.element === "hielo"
            ? "ice"
            : attack.element === "rayo"
              ? "bolt"
              : "shadow",
      );
    for (const target of targets) {
      this.spawnFx({ id: attack.fx, target });
      this.hitWith({
        actor,
        target,
        kind: attack.kind,
        power: attack.power,
        element: attack.element,
      });
    }
    await game.timers.wait(0.3);
    await game.timers.tween(0.12, (k) => {
      actor.x = sx + 12 * (1 - k);
    });
  }

  private hitWith(o: {
    actor: Fighter;
    target: Fighter;
    kind: "physical" | "magic";
    power: number;
    element: TechDef["element"];
    stats?: Stats;
    level?: number;
  }): void {
    const t = o.target;
    const factor = t.enemy ? elementFactor(t.enemy, o.element) : 1;
    const r = strike({
      attacker: o.stats ?? o.actor.stats,
      level: o.level ?? o.actor.level,
      defender: t.stats,
      kind: o.kind,
      power: o.power,
      factor,
      guard: t.guard,
      rng: Math.random,
    });
    if (r.miss) {
      playSfx("miss");
      this.pop({ target: t, text: "Fallo", color: "#c8c8c8" });
      return;
    }
    if (r.amount < 0) {
      this.heal(t, -r.amount);
      return;
    }
    playSfx(r.crit ? "crit" : "hit");
    t.hp = Math.max(0, t.hp - r.amount);
    t.hurtT = 0.3;
    const color = r.crit ? "#f8e040" : factor > 1 ? "#f89060" : factor < 1 ? "#a0a0a0" : "#ffffff";
    this.pop({ target: t, text: String(r.amount), color });
    if (t.hp > 0) {
      this.setAnim(t, "hurt", false);
      void game.timers.wait(0.3).then(() => {
        if (t.anim === "hurt") this.setAnim(t, this.restAnim(t));
      });
      return;
    }
    this.knockOut(t);
  }

  private knockOut(t: Fighter): void {
    t.atb = 0;
    t.acting = false;
    this.ready = this.ready.filter((f) => f !== t);
    this.queue = this.queue.filter(
      (a) => a.actor !== t && !(a.kind === "tech" && a.partners.includes(t)),
    );
    if (t.side === "party") {
      this.setAnim(t, "ko");
      return;
    }
    void game.timers.tween(0.4, (k) => {
      t.alpha = 1 - k;
    });
  }

  private heal(t: Fighter, amount: number): void {
    const before = t.hp;
    t.hp = Math.min(t.maxHp, t.hp + amount);
    this.pop({ target: t, text: String(t.hp - before), color: "#80f090" });
    playSfx("heal");
  }

  private pop(o: { target: Fighter; text: string; color: string }): void {
    this.popups.push({
      x: o.target.homeX,
      y: o.target.homeY - o.target.size[1] - 4,
      text: o.text,
      color: o.color,
      t: 0,
    });
  }

  private spawnFx(o: { id: FxId; target: Fighter }): void {
    this.effects.push({
      id: o.id,
      x: o.target.homeX,
      y: o.target.homeY - o.target.size[1] / 2,
      t: 0,
    });
  }

  // ---- ending ----

  private checkEnd(): void {
    if (this.phase !== "run") return;
    if (this.foes.length === 0) {
      this.phase = "end";
      void this.victory();
    } else if (this.party.every((f) => !this.alive(f))) {
      this.phase = "end";
      void this.defeat();
    }
  }

  private writeBack(): void {
    for (const f of this.party) {
      if (!f.member) continue;
      f.member.hp = Math.max(0, Math.min(f.hp, f.maxHp));
      f.member.mp = Math.max(0, Math.min(f.mp, f.maxMp));
    }
  }

  private async victory(): Promise<void> {
    this.closeUi();
    playMusic("victory");
    for (const f of this.party) if (this.alive(f)) this.setAnim(f, "victory");
    this.writeBack();
    const enemies = this.fighters
      .filter((f) => f.side === "enemy")
      .map((f) => f.enemy)
      .filter((e): e is EnemyDef => e !== null);
    const xp = enemies.reduce((s, e) => s + e.xp, 0);
    const karma = enemies.reduce((s, e) => s + e.karma, 0);
    const s = game.state;
    s.karma += karma;
    await game.timers.wait(0.8);
    const lines: string[] = [];
    for (const id of s.order) {
      const m = s.members[id];
      if (!m) continue;
      const def = memberDef(id);
      const before = m.level;
      const next = gainXp({ level: m.level, xp: m.xp, gained: xp });
      m.xp = next.xp;
      if (next.level === before) continue;
      const hpGain = maxHp(def, next.level) - maxHp(def, before);
      const mpGain = maxMp(def, next.level) - maxMp(def, before);
      m.level = next.level;
      if (m.hp > 0) m.hp += hpGain;
      m.mp += mpGain;
      lines.push(`${def.name} sube al nivel ${m.level}.`);
      for (const t of def.techs) {
        const tech = techDef(t.id);
        if (tech && t.level > before && t.level <= m.level)
          lines.push(`${def.name} aprende ${tech.name}.`);
      }
    }
    for (const e of enemies) {
      if (e.drop && Math.random() < e.drop.chance) {
        const item = itemDef(e.drop.item);
        if (item) {
          addItem(s, item.id, 1);
          lines.push(`Obtienes: ${item.name}.`);
        }
      }
    }
    const header = karma > 0 ? `¡Victoria! ${xp} XP y ${karma} de karma.` : "¡Victoria!";
    await say(null, header);
    if (lines.length > 0) {
      playSfx("levelup");
      await say(null, lines.join("\n"));
    }
    game.stack.finish(this, "win");
  }

  private async defeat(): Promise<void> {
    this.closeUi();
    await game.timers.wait(1.2);
    game.stack.finish(this, "lose");
  }

  private async leave(result: string): Promise<void> {
    this.closeUi();
    this.writeBack();
    for (const f of this.party) {
      if (!this.alive(f)) continue;
      this.setAnim(f, "walk-side");
      const sx = f.x;
      void game.timers.tween(0.5, (k) => {
        f.x = sx + 100 * k;
      });
    }
    await game.timers.wait(0.5);
    game.stack.finish(this, result);
  }

  // ---- drawing ----

  draw(ctx: CanvasRenderingContext2D): void {
    this.backdrop(ctx);
    ctx.fillStyle = "rgba(8,8,24,0.55)";
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    const order = this.fighters.toSorted((a, b) => a.y - b.y);
    for (const f of order) {
      if (f.side === "enemy" && f.alpha <= 0) continue;
      const w = f.side === "enemy" ? f.size[0] : 14;
      ctx.globalAlpha = 0.45 * f.alpha;
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.ellipse(f.x, f.y - 1, w / 2 + 2, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      const blink = f.hurtT > 0 && Math.floor(f.hurtT * 20) % 2 === 0;
      drawActor(ctx, {
        sheet: f.sheet,
        tag: f.anim,
        t: f.animT,
        x: f.x,
        y: f.y,
        alpha: blink ? 0.4 : f.alpha,
        loop: f.loop,
        color: f.color,
        size: f.side === "enemy" ? f.size : [12, 26],
      });
    }
    this.effects = this.effects.filter((e) => drawFx(ctx, e));
    for (const p of this.popups) {
      const y = p.y - Math.min(1, p.t * 3) * 10;
      drawText(ctx, p.text, { x: p.x, y, color: p.color, align: "center" });
    }
    if (this.actor && this.ui !== "idle") {
      const a = this.actor;
      const bob = Math.floor(this.t * 4) % 2;
      drawText(ctx, "v", { x: a.x, y: a.y - 40 - bob, align: "center", color: "#f8c060" });
    }
    this.drawStatus(ctx);
    this.drawMenus(ctx);
    if (this.caption) {
      const w = measureText(this.caption) + 24;
      drawWindow(ctx, { x: (SCREEN_W - w) / 2, y: 6, w, h: 22 });
      drawText(ctx, this.caption, { x: SCREEN_W / 2, y: 11, align: "center" });
    }
    if (this.escapeT > 0.1)
      drawText(ctx, "Huyendo...", { x: SCREEN_W - 8, y: 6, align: "right", color: "#f8c060" });
  }

  private drawStatus(ctx: CanvasRenderingContext2D): void {
    const box = { x: 4, y: 164, w: 248, h: 56 };
    drawWindow(ctx, box);
    this.party.forEach((f, i) => {
      const y = box.y + 8 + i * 14;
      const ko = !this.alive(f);
      const nameColor = ko ? "#f86060" : this.actor === f ? "#f8c060" : "#f8f8f8";
      drawText(ctx, f.name, { x: box.x + 8, y, color: nameColor });
      const hpColor = ko ? "#f86060" : f.hp < f.maxHp / 4 ? "#f8c060" : "#f8f8f8";
      drawText(ctx, String(f.hp), { x: box.x + 124, y, align: "right", color: hpColor });
      drawText(ctx, String(f.mp), { x: box.x + 166, y, align: "right", color: "#88c0f8" });
      drawBar(ctx, {
        x: box.x + 184,
        y: y + 4,
        w: 54,
        value: f.atb,
        color: f.atb >= 1 ? "#f8c040" : "#58a0f8",
      });
    });
  }

  private drawMenus(ctx: CanvasRenderingContext2D): void {
    if (this.ui === "idle") return;
    const focused = this.ui === "command";
    // Sits over the ATB bars so it never hides the enemies.
    this.command.draw(ctx, { x: 176, y: 164, w: 76, h: 56 }, focused);
    if (
      this.ui === "techs" ||
      this.ui === "items" ||
      (this.ui === "target" && this.pending?.kind !== "attack")
    ) {
      const listFocus = this.ui === "techs" || this.ui === "items";
      this.list.draw(ctx, { x: 82, y: 84, w: 170, h: 76 }, listFocus);
      const desc = this.currentDesc();
      if (desc && listFocus) {
        drawWindow(ctx, { x: 4, y: 6, w: 248, h: 22 });
        drawText(ctx, desc, { x: 12, y: 11 });
      }
    }
    if (this.ui === "target") {
      const list = this.targetAll ? this.targets : [this.targets[this.targetIndex]];
      for (const f of list) {
        if (!f) continue;
        drawCursor(ctx, { x: f.x - f.size[0] / 2 - 2, y: f.y - f.size[1] / 2 - 6, t: this.t });
      }
      const f = this.targets[this.targetIndex];
      if (f && !this.targetAll) {
        drawWindow(ctx, { x: 4, y: 6, w: 248, h: 22 });
        drawText(ctx, f.side === "enemy" ? f.name : `${f.name}  ${f.hp}/${f.maxHp}`, {
          x: 12,
          y: 11,
        });
      }
    }
  }

  private currentDesc(): string {
    if (this.ui === "techs") {
      const o = this.techOptions[this.list.index];
      if (!o) return "";
      return o.tech.users.length > 1 && !o.enabled
        ? `${o.tech.desc} Necesita a todos listos.`
        : o.tech.desc;
    }
    return itemDef(this.itemIds[this.list.index] ?? "")?.desc ?? "";
  }
}

function bestStats(users: Fighter[]): Stats {
  const first = users[0];
  if (!first) throw new Error("Técnica sin usuarios");
  const pick = (k: keyof Stats): number => Math.max(...users.map((u) => u.stats[k]));
  const bonus = 1 + (users.length - 1) * 0.15;
  return {
    fuerza: Math.round(pick("fuerza") * bonus),
    aguante: first.stats.aguante,
    velocidad: first.stats.velocidad,
    magia: Math.round(pick("magia") * bonus),
    precision: pick("precision"),
    evasion: first.stats.evasion,
    defMagica: first.stats.defMagica,
  };
}
