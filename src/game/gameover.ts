import { playMusic } from "../audio/audio";
import { drawText } from "../engine/gfx";
import type { Scene } from "../engine/scene";
import { SCREEN_W } from "../engine/screen";
import { fadeTo, game } from "./game";
import { loadGame } from "./state";
import { ListMenu } from "./ui";

export class GameOverScene implements Scene {
  readonly transparent = false;
  private t = 0;
  private menu = new ListMenu([{ label: "Continuar" }, { label: "Título" }], { rows: 2 });
  private leaving = false;

  onEnter(): void {
    playMusic("gameover");
    void fadeTo({ alpha: 0, seconds: 0.6 });
    this.menu.items[0] = { label: "Continuar", enabled: loadGame() !== null };
    if (!loadGame()) this.menu.index = 1;
  }

  update(dt: number): void {
    this.t += dt;
    if (this.t < 1.5 || this.leaving) return;
    const r = this.menu.update(dt);
    if (r !== "confirm") return;
    this.leaving = true;
    if (this.menu.index === 0) game.hooks.continueGame();
    else game.hooks.title();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, 256, 224);
    const a = Math.min(1, this.t / 1.2);
    ctx.globalAlpha = a;
    drawText(ctx, "HAS SIDO BANEADO", {
      x: SCREEN_W / 2,
      y: 76,
      align: "center",
      color: "#f86040",
    });
    drawText(ctx, "Tu cuenta no ha podido con el hilo.", {
      x: SCREEN_W / 2,
      y: 96,
      align: "center",
      color: "#a8a0b8",
    });
    ctx.globalAlpha = 1;
    if (this.t >= 1.5) this.menu.draw(ctx, { x: 84, y: 128, w: 88, h: 40 });
  }
}
