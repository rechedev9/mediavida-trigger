import { playSfx, setVolume } from "../audio/audio";
import { itemDef } from "../data/items";
import { memberDef } from "../data/party";
import { techDef } from "../data/techs";
import { ELEMENT_NAMES, STAT_NAMES, type Stats, type TechDef } from "../data/types";
import { drawText, drawWindow, LINE_H, setWindowTheme, WINDOW_THEMES } from "../engine/gfx";
import { wasPressed, wasRepeated } from "../engine/input";
import type { Scene } from "../engine/scene";
import { healAmount, maxHp, maxMp, memberStats, xpToNext } from "./combat";
import { game } from "./game";
import { drawFace } from "./sprites";
import { addItem, type MemberState } from "./state";
import { drawCursor, ListMenu } from "./ui";

type Mode = "main" | "items" | "who" | "techs" | "status" | "order" | "options";
type WhoFor = "item" | "techs" | "status" | "tech-use";

const MAIN = ["Objetos", "Técnicas", "Estado", "Formación", "Opciones", "Cerrar"];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
}

export class MenuScene implements Scene {
  readonly transparent = false;
  private mode: Mode = "main";
  private main = new ListMenu(
    MAIN.map((label) => ({ label })),
    { rows: 6 },
  );
  private list = new ListMenu([], { rows: 9 });
  private who = 0;
  private whoFor: WhoFor = "status";
  private itemIds: string[] = [];
  private techs: TechDef[] = [];
  private pendingItem: string | null = null;
  private pendingTech: TechDef | null = null;
  private techUser: MemberState | null = null;
  private swapFirst: number | null = null;
  private option = 0;
  private t = 0;
  private message = "";

  private get members(): MemberState[] {
    const s = game.state;
    return s.order.map((id) => s.members[id]).filter((m): m is MemberState => m !== undefined);
  }

  update(dt: number): void {
    this.t += dt;
    if (this.mode === "main") this.updateMain(dt);
    else if (this.mode === "items") this.updateItems(dt);
    else if (this.mode === "techs") this.updateTechs(dt);
    else if (this.mode === "who") this.updateWho();
    else if (this.mode === "status") this.updateStatus();
    else if (this.mode === "order") this.updateOrder();
    else this.updateOptions();
  }

  private updateMain(dt: number): void {
    const r = this.main.update(dt);
    if (r === "cancel" || wasPressed("menu")) {
      game.stack.finish(this);
      return;
    }
    if (r !== "confirm") return;
    this.message = "";
    const i = this.main.index;
    if (i === 0) this.openItems();
    if (i === 1) this.pickWho("techs");
    if (i === 2) this.pickWho("status");
    if (i === 3) {
      this.mode = "order";
      this.who = 0;
      this.swapFirst = null;
    }
    if (i === 4) {
      this.mode = "options";
      this.option = 0;
    }
    if (i === 5) game.stack.finish(this);
  }

  private openItems(): void {
    const s = game.state;
    this.itemIds = Object.keys(s.items).filter((id) => itemDef(id));
    this.list = new ListMenu(
      this.itemIds.map((id) => ({
        label: itemDef(id)?.name ?? id,
        right: `x${s.items[id] ?? 0}`,
        enabled: itemDef(id)?.kind !== "key",
      })),
      { rows: 9 },
    );
    this.mode = "items";
  }

  private pickWho(f: WhoFor): void {
    this.whoFor = f;
    this.who = 0;
    this.mode = "who";
  }

  private updateItems(dt: number): void {
    const r = this.list.update(dt);
    if (r === "cancel") this.mode = "main";
    if (r !== "confirm") return;
    const id = this.itemIds[this.list.index];
    if (!id) return;
    this.pendingItem = id;
    this.pickWho("item");
  }

  private updateWho(): void {
    const n = this.members.length;
    const prev = this.who;
    if (wasRepeated("down")) this.who = (this.who + 1) % n;
    if (wasRepeated("up")) this.who = (this.who - 1 + n) % n;
    if (prev !== this.who) playSfx("cursor");
    if (wasPressed("cancel")) {
      playSfx("cancel");
      this.mode = this.whoFor === "item" ? "items" : this.whoFor === "tech-use" ? "techs" : "main";
      return;
    }
    if (!wasPressed("confirm")) return;
    const m = this.members[this.who];
    if (!m) return;
    if (this.whoFor === "status") {
      playSfx("confirm");
      this.mode = "status";
    } else if (this.whoFor === "techs") {
      playSfx("confirm");
      this.openTechs(m);
    } else if (this.whoFor === "item") {
      this.useItem(m);
    } else {
      this.useTech(m);
    }
  }

  private useItem(m: MemberState): void {
    const s = game.state;
    const item = itemDef(this.pendingItem ?? "");
    if (!item || (s.items[item.id] ?? 0) <= 0) return;
    const def = memberDef(m.id);
    const hpMax = maxHp(def, m.level);
    const mpMax = maxMp(def, m.level);
    const ok =
      (item.kind === "hp" && m.hp > 0 && m.hp < hpMax) ||
      (item.kind === "mp" && m.hp > 0 && m.mp < mpMax) ||
      (item.kind === "revive" && m.hp <= 0);
    if (!ok) {
      playSfx("buzz");
      return;
    }
    if (item.kind === "hp") m.hp = Math.min(hpMax, m.hp + item.amount);
    if (item.kind === "mp") m.mp = Math.min(mpMax, m.mp + item.amount);
    if (item.kind === "revive") m.hp = Math.max(1, Math.round(hpMax * item.amount));
    addItem(s, item.id, -1);
    playSfx("heal");
    this.message = `${def.name}: ${item.name}.`;
    if ((s.items[item.id] ?? 0) <= 0) this.openItems();
    else
      this.list.items[this.list.index] = { label: item.name, right: `x${s.items[item.id] ?? 0}` };
  }

  private openTechs(m: MemberState): void {
    const def = memberDef(m.id);
    this.techUser = m;
    this.techs = def.techs
      .filter((t) => t.level <= m.level)
      .map((t) => techDef(t.id))
      .filter((t): t is TechDef => t !== null);
    this.list = new ListMenu(
      this.techs.map((t) => ({
        label: t.name,
        right: String(t.mp),
        enabled: (t.kind === "heal" || t.kind === "revive") && m.mp >= t.mp && m.hp > 0,
      })),
      { rows: 9 },
    );
    this.mode = "techs";
  }

  private updateTechs(dt: number): void {
    const r = this.list.update(dt);
    if (r === "cancel") this.pickWho("techs");
    if (r !== "confirm") return;
    const tech = this.techs[this.list.index];
    if (!tech) return;
    this.pendingTech = tech;
    if (tech.target === "allies") {
      this.useTech(null);
      return;
    }
    this.whoFor = "tech-use";
    this.who = 0;
    this.mode = "who";
  }

  private useTech(target: MemberState | null): void {
    const tech = this.pendingTech;
    const user = this.techUser;
    if (!tech || !user || user.mp < tech.mp) {
      playSfx("buzz");
      return;
    }
    const userDef = memberDef(user.id);
    const stats = memberStats(userDef, user.level);
    const targets = target ? [target] : this.members;
    let changed = false;
    for (const m of targets) {
      const hpMax = maxHp(memberDef(m.id), m.level);
      if (tech.kind === "heal" && m.hp > 0 && m.hp < hpMax) {
        m.hp = Math.min(
          hpMax,
          m.hp +
            healAmount({
              magia: stats.magia,
              level: user.level,
              power: tech.power,
              rng: Math.random,
            }),
        );
        changed = true;
      }
      if (tech.kind === "revive" && m.hp <= 0) {
        m.hp = Math.max(1, Math.round(hpMax * tech.power));
        changed = true;
      }
    }
    if (!changed) {
      playSfx("buzz");
      return;
    }
    user.mp -= tech.mp;
    playSfx("heal");
    this.message = `${userDef.name} usa ${tech.name}.`;
    this.mode = "techs";
  }

  private updateStatus(): void {
    const n = this.members.length;
    if (wasRepeated("down") || wasRepeated("right")) this.who = (this.who + 1) % n;
    if (wasRepeated("up") || wasRepeated("left")) this.who = (this.who - 1 + n) % n;
    if (wasPressed("cancel") || wasPressed("confirm")) {
      playSfx("cancel");
      this.mode = "main";
    }
  }

  private updateOrder(): void {
    const n = this.members.length;
    const prev = this.who;
    if (wasRepeated("down")) this.who = (this.who + 1) % n;
    if (wasRepeated("up")) this.who = (this.who - 1 + n) % n;
    if (prev !== this.who) playSfx("cursor");
    if (wasPressed("cancel")) {
      playSfx("cancel");
      if (this.swapFirst === null) this.mode = "main";
      this.swapFirst = null;
      return;
    }
    if (!wasPressed("confirm")) return;
    playSfx("confirm");
    if (this.swapFirst === null) {
      this.swapFirst = this.who;
      return;
    }
    const order = game.state.order;
    const a = order[this.swapFirst];
    const b = order[this.who];
    if (a !== undefined && b !== undefined) {
      order[this.swapFirst] = b;
      order[this.who] = a;
    }
    this.swapFirst = null;
  }

  private updateOptions(): void {
    const st = game.state.settings;
    const prev = this.option;
    if (wasRepeated("down")) this.option = (this.option + 1) % 4;
    if (wasRepeated("up")) this.option = (this.option + 3) % 4;
    if (prev !== this.option) playSfx("cursor");
    const d =
      (wasRepeated("right") ? 1 : 0) -
      (wasRepeated("left") ? 1 : 0) +
      (wasPressed("confirm") ? 1 : 0);
    if (d !== 0) {
      playSfx("cursor");
      if (this.option === 0) st.battleMode = st.battleMode === "wait" ? "active" : "wait";
      if (this.option === 1) {
        st.windowTheme = (st.windowTheme + d + WINDOW_THEMES.length) % WINDOW_THEMES.length;
        setWindowTheme(st.windowTheme);
      }
      if (this.option === 2) st.music = clamp01(st.music + d * 0.1);
      if (this.option === 3) st.sfx = clamp01(st.sfx + d * 0.1);
      setVolume(st.music, st.sfx);
    }
    if (wasPressed("cancel")) {
      playSfx("cancel");
      this.mode = "main";
    }
  }

  // ---- drawing ----

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#100810";
    ctx.fillRect(0, 0, 256, 224);
    this.main.draw(ctx, { x: 4, y: 4, w: 84, h: 84 }, this.mode === "main");
    drawWindow(ctx, { x: 4, y: 160, w: 84, h: 60 });
    drawText(ctx, "Karma", { x: 12, y: 166, color: "#a8a0b8" });
    drawText(ctx, String(game.state.karma), { x: 80, y: 178, align: "right" });
    drawText(ctx, "Tiempo", { x: 12, y: 192, color: "#a8a0b8" });
    drawText(ctx, formatTime(game.state.playtime), { x: 80, y: 204, align: "right" });
    if (this.mode === "items" || (this.mode === "who" && this.whoFor === "item"))
      this.drawItems(ctx);
    else if (this.mode === "techs" || (this.mode === "who" && this.whoFor === "tech-use"))
      this.drawTechs(ctx);
    else if (this.mode === "status") this.drawStatus(ctx);
    else if (this.mode === "options") this.drawOptions(ctx);
    else this.drawParty(ctx);
    if (this.mode === "who" && (this.whoFor === "item" || this.whoFor === "tech-use"))
      this.drawPartyPicker(ctx);
    if (this.message) {
      drawWindow(ctx, { x: 4, y: 92, w: 84, h: 64 });
      drawText(ctx, this.message.slice(0, 13), { x: 10, y: 98 });
      drawText(ctx, this.message.slice(13, 26), { x: 10, y: 110 });
      drawText(ctx, this.message.slice(26, 39), { x: 10, y: 122 });
    }
  }

  private drawParty(ctx: CanvasRenderingContext2D): void {
    drawWindow(ctx, { x: 92, y: 4, w: 160, h: 216 });
    this.members.forEach((m, i) => {
      const def = memberDef(m.id);
      const y = 10 + i * 30;
      if (y > 190) return;
      drawFace(ctx, { id: m.id, x: 100, y, color: def.color });
      const color = i < 3 ? "#f8f8f8" : "#a8a0b8";
      drawText(ctx, def.name, { x: 136, y, color });
      drawText(ctx, `Nv ${m.level}`, { x: 246, y, align: "right", color: "#f8c060" });
      drawText(ctx, `PV ${m.hp}/${maxHp(def, m.level)}`, {
        x: 136,
        y: y + 10,
        color: m.hp <= 0 ? "#f86060" : color,
      });
      drawText(ctx, `PM ${m.mp}/${maxMp(def, m.level)}`, { x: 136, y: y + 19, color });
      const picking = this.mode === "who" || this.mode === "order";
      if (picking && i === this.who) drawCursor(ctx, { x: 104, y: y + 10, t: this.t });
      if (this.mode === "order" && this.swapFirst === i)
        drawText(ctx, "*", { x: 94, y: y + 10, color: "#f8c060" });
    });
    if (this.mode === "order")
      drawText(ctx, "Los 3 primeros luchan", { x: 172, y: 206, align: "center", color: "#a8a0b8" });
  }

  private drawPartyPicker(ctx: CanvasRenderingContext2D): void {
    drawWindow(ctx, { x: 120, y: 120, w: 132, h: 100 });
    this.members.forEach((m, i) => {
      const def = memberDef(m.id);
      const y = 126 + i * LINE_H;
      if (y > 206) return;
      drawText(ctx, def.name, { x: 138, y, color: m.hp <= 0 ? "#f86060" : "#f8f8f8" });
      drawText(ctx, String(m.hp), { x: 244, y, align: "right" });
      if (i === this.who) drawCursor(ctx, { x: 138, y, t: this.t });
    });
  }

  private drawItems(ctx: CanvasRenderingContext2D): void {
    this.list.draw(ctx, { x: 92, y: 4, w: 160, h: 122 }, this.mode === "items");
    const item = itemDef(this.itemIds[this.list.index] ?? "");
    if (item) {
      drawWindow(ctx, { x: 92, y: 128, w: 160, h: this.mode === "who" ? 0 : 40 });
      if (this.mode !== "who") drawText(ctx, item.desc, { x: 100, y: 134 });
    }
  }

  private drawTechs(ctx: CanvasRenderingContext2D): void {
    this.list.draw(ctx, { x: 92, y: 4, w: 160, h: 122 }, this.mode === "techs");
    const tech = this.techs[this.list.index];
    if (tech && this.mode === "techs") {
      drawWindow(ctx, { x: 92, y: 128, w: 160, h: 48 });
      drawText(ctx, tech.desc, { x: 100, y: 134 });
      const el = tech.element ? ELEMENT_NAMES[tech.element] : "Físico";
      drawText(ctx, `${el}  PM ${tech.mp}`, { x: 100, y: 148, color: "#a8a0b8" });
    }
  }

  private drawStatus(ctx: CanvasRenderingContext2D): void {
    const m = this.members[this.who];
    if (!m) return;
    const def = memberDef(m.id);
    const st = memberStats(def, m.level);
    drawWindow(ctx, { x: 92, y: 4, w: 160, h: 216 });
    drawFace(ctx, { id: m.id, x: 100, y: 12, color: def.color });
    drawText(ctx, def.name, { x: 138, y: 12 });
    drawText(ctx, def.title, { x: 138, y: 24, color: "#f8c060" });
    drawText(ctx, def.element ? ELEMENT_NAMES[def.element] : "Sin elemento", {
      x: 138,
      y: 36,
      color: "#a8a0b8",
    });
    const rows: [string, string][] = [
      ["Nivel", String(m.level)],
      ["PV", `${m.hp}/${maxHp(def, m.level)}`],
      ["PM", `${m.mp}/${maxMp(def, m.level)}`],
      ["XP sig.", String(xpToNext(m.level) - m.xp)],
    ];
    const keys: (keyof Stats)[] = [
      "fuerza",
      "aguante",
      "velocidad",
      "magia",
      "precision",
      "evasion",
      "defMagica",
    ];
    for (const k of keys) rows.push([STAT_NAMES[k], String(st[k])]);
    rows.forEach(([label, value], i) => {
      const y = 52 + i * 14;
      drawText(ctx, label, { x: 102, y, color: "#a8a0b8" });
      drawText(ctx, value, { x: 242, y, align: "right" });
    });
  }

  private drawOptions(ctx: CanvasRenderingContext2D): void {
    const st = game.state.settings;
    drawWindow(ctx, { x: 92, y: 4, w: 160, h: 80 });
    const theme = WINDOW_THEMES[st.windowTheme]?.name ?? "";
    const rows: [string, string][] = [
      ["Combate", st.battleMode === "wait" ? "Espera" : "Activo"],
      ["Ventana", theme],
      ["Música", `${Math.round(st.music * 10)}`],
      ["Efectos", `${Math.round(st.sfx * 10)}`],
    ];
    rows.forEach(([label, value], i) => {
      const y = 12 + i * 16;
      drawText(ctx, label, { x: 112, y });
      drawText(ctx, value, { x: 244, y, align: "right", color: "#f8c060" });
      if (i === this.option) drawCursor(ctx, { x: 112, y, t: this.t });
    });
    drawWindow(ctx, { x: 92, y: 88, w: 160, h: 60 });
    const help =
      st.battleMode === "wait"
        ? "El tiempo se para en los submenús."
        : "El tiempo no se para nunca.";
    drawText(ctx, help.slice(0, 24), { x: 100, y: 96 });
    drawText(ctx, help.slice(24), { x: 100, y: 108 });
  }
}

function clamp01(v: number): number {
  return Math.round(Math.max(0, Math.min(1, v)) * 10) / 10;
}
