import { drawText, LINE_H } from "../engine/gfx";
import { wasAnyPressed } from "../engine/input";
import type { Scene } from "../engine/scene";
import { SCREEN_W } from "../engine/screen";

const CONTROLS = [
  "Flechas o WASD: moverse",
  "Z o Enter: confirmar",
  "X o Esc: cancelar",
  "C o Tab: menú",
  "Shift: correr",
];

/** First screen: the click or key that starts audio and gives the embed focus. */
export class StartScene implements Scene {
  readonly transparent = false;
  private t = 0;
  private done = false;

  constructor(private onStart: () => void) {}

  update(dt: number): void {
    this.t += dt;
    if (this.done || !wasAnyPressed()) return;
    this.done = true;
    this.onStart();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const cx = SCREEN_W / 2;
    drawText(ctx, "MEDIAVIDA TRIGGER", { x: cx, y: 40, align: "center", color: "#f88820" });
    if (Math.floor(this.t * 2) % 2 === 0) {
      drawText(ctx, "Pulsa una tecla o haz clic", { x: cx, y: 76, align: "center" });
    }
    CONTROLS.forEach((line, i) => {
      drawText(ctx, line, { x: cx, y: 120 + i * LINE_H, align: "center", color: "#a8a0b8" });
    });
  }
}
