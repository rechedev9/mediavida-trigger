import { playSfx } from "../audio/audio";
import { speaker } from "../data/speakers";
import { drawText, drawWindow, LINE_H, wrapText } from "../engine/gfx";
import { isHeld, wasPressed } from "../engine/input";
import type { Scene } from "../engine/scene";
import { game } from "./game";
import { drawFace } from "./sprites";
import { ListMenu } from "./ui";

const BOX = { x: 4, y: 156, w: 248, h: 64 };
const LINES = 4;
const CPS = 45;

/** Typewriter dialogue box; with `choices` it resolves with the chosen index. */
class DialogueScene implements Scene {
  readonly transparent = true;
  private pages: string[][];
  private page = 0;
  private shown = 0;
  private menu: ListMenu | null;
  private blink = 0;
  private name: string;
  private face: string | null;
  private color: string;
  private textX: number;

  constructor(o: { who: string | null; text: string; choices?: string[] }) {
    const sp = o.who ? speaker(o.who) : null;
    this.name = sp?.name ?? "";
    this.face = sp?.face ?? null;
    this.color = sp?.color ?? "#ffffff";
    this.textX = BOX.x + (this.face ? 44 : 10);
    const width = BOX.x + BOX.w - 10 - this.textX;
    const lines = wrapText(o.text, width);
    const body = this.name ? LINES - 1 : LINES;
    this.pages = [];
    for (let i = 0; i < lines.length; i += body) this.pages.push(lines.slice(i, i + body));
    if (this.pages.length === 0) this.pages.push([]);
    this.menu = o.choices
      ? new ListMenu(
          o.choices.map((label) => ({ label })),
          { rows: o.choices.length },
        )
      : null;
  }

  private get lines(): string[] {
    return this.pages[this.page] ?? [];
  }

  private get pageLength(): number {
    return this.lines.reduce((n, l) => n + Array.from(l).length, 0);
  }

  private get lastPage(): boolean {
    return this.page >= this.pages.length - 1;
  }

  update(dt: number): void {
    this.blink += dt;
    const total = this.pageLength;
    if (this.shown < total) {
      const before = Math.floor(this.shown);
      this.shown = Math.min(total, this.shown + dt * CPS * (isHeld("run") ? 3 : 1));
      if (Math.floor(this.shown / 3) !== Math.floor(before / 3)) playSfx("text");
      if (wasPressed("confirm")) this.shown = total;
      return;
    }
    if (this.lastPage && this.menu) {
      const r = this.menu.update(dt);
      if (r === "confirm") game.stack.finish(this, this.menu.index);
      if (r === "cancel") game.stack.finish(this, this.menu.items.length - 1);
      return;
    }
    if (wasPressed("confirm") || wasPressed("cancel")) {
      if (this.lastPage) {
        game.stack.finish(this, 0);
      } else {
        this.page++;
        this.shown = 0;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawWindow(ctx, BOX);
    if (this.face) drawFace(ctx, { id: this.face, x: BOX.x + 8, y: BOX.y + 8, color: this.color });
    let y = BOX.y + 6;
    if (this.name) {
      drawText(ctx, this.name, { x: this.textX, y, color: "#f8c060" });
      y += LINE_H;
    }
    let left = Math.floor(this.shown);
    for (const line of this.lines) {
      const chars = Array.from(line);
      drawText(ctx, chars.slice(0, Math.max(0, left)).join(""), { x: this.textX, y });
      left -= chars.length;
      y += LINE_H;
    }
    const done = this.shown >= this.pageLength;
    if (done && this.lastPage && this.menu) {
      const n = this.menu.items.length;
      const h = n * LINE_H + 12;
      this.menu.draw(ctx, { x: BOX.x + BOX.w - 100, y: BOX.y - h - 2, w: 100, h });
    } else if (done && Math.floor(this.blink * 3) % 2 === 0) {
      drawText(ctx, "v", { x: BOX.x + BOX.w - 14, y: BOX.y + BOX.h - 13, color: "#f8c060" });
    }
  }
}

export async function say(who: string | null, text: string): Promise<void> {
  await game.stack.run(new DialogueScene({ who, text }));
}

export async function choose(o: {
  who: string | null;
  text: string;
  choices: string[];
}): Promise<number> {
  const r = await game.stack.run(new DialogueScene(o));
  return typeof r === "number" ? r : 0;
}
