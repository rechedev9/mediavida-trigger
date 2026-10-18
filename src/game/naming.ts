import { playSfx } from "../audio/audio";
import {
  cleanHeroName,
  DEFAULT_HERO_NAME,
  HERO_ID,
  HERO_NAME_MAX,
  memberDef,
  PARTY,
} from "../data/party";
import { getImage } from "../engine/assets";
import { drawText, drawWindow, hasGlyph, LINE_H, measureText } from "../engine/gfx";
import { setTextCapture, wasPressed, wasRepeated } from "../engine/input";
import type { Scene } from "../engine/scene";
import { SCREEN_H, SCREEN_W } from "../engine/screen";
import { fadeTo } from "./game";
import { drawFace } from "./sprites";
import { drawCursor } from "./ui";

const ROWS = [
  "ABCDEFGHIJ",
  "KLMNÑOPQRS",
  "TUVWXYZ-_.",
  "abcdefghij",
  "klmnñopqrs",
  "tuvwxyz012",
  "3456789!?@",
].map((r) => Array.from(r));
const COLS = 10;
const ACTIONS = ["Borrar", "Fin"] as const;
const ACTION_ROW = ROWS.length;
const GRID = { x: 16, y: 80, w: 224, h: 114 };
const CELL_W = 20;
const GRID_X = GRID.x + (GRID.w - COLS * CELL_W) / 2;
const ACTION_X = [GRID_X + 40, GRID_X + 140];

/** The name being typed; the first edit replaces the default nick. */
export class NameDraft {
  text: string;
  private fresh = true;

  constructor(
    private o: {
      initial: string;
      accepts: (c: string) => boolean;
      fits: (text: string) => boolean;
    },
  ) {
    this.text = o.initial;
  }

  get isDefault(): boolean {
    return this.fresh;
  }

  type(c: string): boolean {
    const base = this.fresh ? "" : this.text;
    if (!this.o.accepts(c) || (base === "" && c === " ")) return false;
    const next = base + c;
    if (Array.from(next).length > HERO_NAME_MAX || !this.o.fits(next)) return false;
    this.text = next;
    this.fresh = false;
    return true;
  }

  erase(): boolean {
    if (this.fresh) {
      this.text = "";
      this.fresh = false;
      return true;
    }
    if (!this.text) return false;
    this.text = Array.from(this.text).slice(0, -1).join("");
    return true;
  }

  result(): string {
    return cleanHeroName(this.text);
  }
}

/** Shown after "Nueva partida": the player picks the hero's nick. */
export class NamingScene implements Scene {
  readonly transparent = false;
  private t = 0;
  private row = ACTION_ROW;
  private col = 1;
  private done = false;
  private draft: NameDraft;

  constructor(private onDone: (name: string) => void) {
    // No wider than the widest name the menus and battle panel already fit.
    const maxW = Math.max(...PARTY.map((p) => measureText(p.name)));
    this.draft = new NameDraft({
      initial: DEFAULT_HERO_NAME,
      accepts: (c) => c === " " || hasGlyph(c),
      fits: (text) => measureText(text) <= maxW,
    });
  }

  onEnter(): void {
    setTextCapture((key) => this.onKey(key));
    void fadeTo({ alpha: 0, seconds: 0.4 });
  }

  onExit(): void {
    setTextCapture(null);
  }

  private onKey(key: string): void {
    if (this.done) return;
    if (key === "Backspace") this.erase();
    else if (this.type(key)) {
      this.row = ACTION_ROW;
      this.col = 1;
    }
  }

  private type(c: string): boolean {
    const ok = this.draft.type(c);
    playSfx(ok ? "cursor" : "buzz");
    return ok;
  }

  private erase(): void {
    playSfx(this.draft.erase() ? "cancel" : "buzz");
  }

  private finish(): void {
    this.done = true;
    setTextCapture(null);
    playSfx("confirm");
    const name = this.draft.result();
    void fadeTo({ alpha: 1, seconds: 0.5 }).then(() => this.onDone(name));
  }

  private move(): void {
    const width = (): number => (this.row === ACTION_ROW ? ACTIONS.length : COLS);
    const prev = `${this.row},${this.col}`;
    if (wasRepeated("left")) this.col = (this.col - 1 + width()) % width();
    if (wasRepeated("right")) this.col = (this.col + 1) % width();
    const down = wasRepeated("down");
    const up = wasRepeated("up");
    if (down || up) {
      const from = this.row;
      this.row = (this.row + (down ? 1 : ACTION_ROW)) % (ACTION_ROW + 1);
      // Actions sit under the left and right halves of the grid.
      if (this.row === ACTION_ROW) this.col = this.col < COLS / 2 ? 0 : 1;
      else if (from === ACTION_ROW) this.col = this.col === 0 ? 2 : 7;
    }
    if (prev !== `${this.row},${this.col}`) playSfx("cursor");
  }

  update(dt: number): void {
    this.t += dt;
    if (this.done) return;
    this.move();
    if (wasPressed("menu")) {
      this.row = ACTION_ROW;
      this.col = 1;
    }
    if (wasPressed("cancel")) this.erase();
    if (!wasPressed("confirm")) return;
    if (this.row === ACTION_ROW) {
      if (ACTIONS[this.col] === "Fin") this.finish();
      else this.erase();
      return;
    }
    const c = ROWS[this.row]?.[this.col];
    if (c) this.type(c);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#100820";
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    const bg = getImage("ui/title");
    if (bg) {
      ctx.globalAlpha = 0.3;
      ctx.drawImage(bg, 0, 0);
      ctx.globalAlpha = 1;
    }
    drawText(ctx, "¿Cuál es tu nick en el foro?", {
      x: SCREEN_W / 2,
      y: 10,
      align: "center",
      color: "#f8c060",
    });
    this.drawName(ctx);
    this.drawGrid(ctx);
    drawText(ctx, "Escribe con el teclado o elige letras.", {
      x: SCREEN_W / 2,
      y: 198,
      align: "center",
      color: "#a8a0b8",
    });
    drawText(ctx, "Esc borra. Enter en Fin para empezar.", {
      x: SCREEN_W / 2,
      y: 210,
      align: "center",
      color: "#a8a0b8",
    });
  }

  private drawName(ctx: CanvasRenderingContext2D): void {
    const def = memberDef(HERO_ID);
    drawWindow(ctx, { x: 40, y: 28, w: 176, h: 46 });
    drawFace(ctx, { id: HERO_ID, x: 48, y: 35, color: def.color });
    const x = 90;
    const text = this.draft.text;
    drawText(ctx, text, { x, y: 37, color: this.draft.isDefault ? "#a8a0b8" : "#f8f8f8" });
    if (!this.done && Math.floor(this.t * 3) % 2 === 0) {
      ctx.fillStyle = "#f88820";
      ctx.fillRect(x + measureText(text), 47, 5, 1);
    }
    drawText(ctx, `${def.title}  ${Array.from(text).length}/${HERO_NAME_MAX}`, {
      x,
      y: 53,
      color: "#a8a0b8",
    });
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    drawWindow(ctx, GRID);
    ROWS.forEach((chars, r) => {
      const y = GRID.y + 7 + r * LINE_H;
      chars.forEach((c, i) => {
        const cx = GRID_X + i * CELL_W + CELL_W / 2;
        if (r === this.row && i === this.col) {
          ctx.fillStyle = "#f88820";
          ctx.fillRect(cx - 7, y - 1, 14, LINE_H);
        }
        drawText(ctx, c, { x: cx, y, align: "center" });
      });
    });
    const y = GRID.y + 11 + ROWS.length * LINE_H;
    ACTIONS.forEach((label, i) => {
      const x = ACTION_X[i] ?? 0;
      drawText(ctx, label, { x, y, color: label === "Fin" ? "#f8c060" : "#f8f8f8" });
      if (this.row === ACTION_ROW && this.col === i) drawCursor(ctx, { x, y, t: this.t });
    });
  }
}
