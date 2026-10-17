import { playSfx } from "../audio/audio";
import { getSheet } from "../engine/assets";
import { drawFrame, drawText, drawWindow, LINE_H, tagFrame } from "../engine/gfx";
import { wasPressed, wasRepeated } from "../engine/input";

export type MenuItem = { label: string; right?: string; enabled?: boolean; icon?: string };

export type MenuResult = "confirm" | "cancel" | null;

const DISABLED = "#787078";

export function drawCursor(
  ctx: CanvasRenderingContext2D,
  o: { x: number; y: number; t: number },
): void {
  const sheet = getSheet("ui/cursor");
  if (sheet) {
    drawFrame(ctx, sheet, {
      x: o.x - 17,
      y: o.y - 3,
      frame: tagFrame(sheet, "play", o.t),
      topLeft: true,
    });
    return;
  }
  const bob = Math.floor(o.t * 4) % 2;
  ctx.fillStyle = "#f8f8f8";
  ctx.fillRect(o.x - 10 + bob, o.y + 3, 6, 4);
  ctx.fillRect(o.x - 6 + bob, o.y + 1, 2, 8);
}

/** A vertical list with a cursor; `columns` > 1 lays items out in a grid. */
export class ListMenu {
  index = 0;
  top = 0;
  t = 0;

  constructor(
    public items: MenuItem[],
    public opts: { rows: number; columns?: number; colWidth?: number } = { rows: 8 },
  ) {}

  get current(): MenuItem | undefined {
    return this.items[this.index];
  }

  update(dt: number): MenuResult {
    this.t += dt;
    const n = this.items.length;
    if (n === 0) return wasPressed("cancel") ? "cancel" : null;
    const cols = this.opts.columns ?? 1;
    const prev = this.index;
    if (wasRepeated("down")) this.index = (this.index + cols) % n;
    if (wasRepeated("up")) this.index = (this.index - cols + n) % n;
    if (cols > 1 && wasRepeated("right")) this.index = (this.index + 1) % n;
    if (cols > 1 && wasRepeated("left")) this.index = (this.index - 1 + n) % n;
    if (prev !== this.index) playSfx("cursor");
    const row = Math.floor(this.index / cols);
    if (row < this.top) this.top = row;
    if (row >= this.top + this.opts.rows) this.top = row - this.opts.rows + 1;
    if (wasPressed("confirm")) {
      if (this.current?.enabled === false) {
        playSfx("buzz");
        return null;
      }
      playSfx("confirm");
      return "confirm";
    }
    if (wasPressed("cancel")) {
      playSfx("cancel");
      return "cancel";
    }
    return null;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    r: { x: number; y: number; w: number; h: number },
    focused = true,
  ): void {
    drawWindow(ctx, r);
    const cols = this.opts.columns ?? 1;
    const colW = this.opts.colWidth ?? Math.floor((r.w - 24) / cols);
    const start = this.top * cols;
    const end = Math.min(this.items.length, start + this.opts.rows * cols);
    for (let i = start; i < end; i++) {
      const it = this.items[i];
      if (!it) continue;
      const k = i - start;
      const x = r.x + 20 + (k % cols) * colW;
      const y = r.y + 6 + Math.floor(k / cols) * LINE_H;
      const color = it.enabled === false ? DISABLED : "#f8f8f8";
      drawText(ctx, it.label, { x, y, color });
      if (it.right) drawText(ctx, it.right, { x: x + colW - 8, y, color, align: "right" });
      if (i === this.index && focused) drawCursor(ctx, { x, y, t: this.t });
    }
    if (this.top > 0) drawText(ctx, "^", { x: r.x + r.w - 12, y: r.y + 2 });
    if (end < this.items.length) drawText(ctx, "v", { x: r.x + r.w - 12, y: r.y + r.h - 12 });
  }
}
