import { playMusic } from "../audio/audio";
import { getImage, getSheet } from "../engine/assets";
import { drawFrame, drawText, setWindowTheme, tagFrame } from "../engine/gfx";
import type { Scene } from "../engine/scene";
import { SCREEN_W } from "../engine/screen";
import { fadeTo } from "./game";
import { loadGame } from "./state";
import { ListMenu } from "./ui";

export class TitleScene implements Scene {
  readonly transparent = false;
  private t = 0;
  private menu: ListMenu;
  private busy = false;
  private hasSave: boolean;

  constructor(private onStart: (o: { load: boolean }) => void) {
    this.hasSave = loadGame() !== null;
    this.menu = new ListMenu(
      [{ label: "Nueva partida" }, { label: "Continuar", enabled: this.hasSave }],
      { rows: 2 },
    );
    if (this.hasSave) this.menu.index = 1;
  }

  onEnter(): void {
    playMusic("title");
    setWindowTheme(0);
    void fadeTo({ alpha: 0, seconds: 0.8 });
  }

  update(dt: number): void {
    this.t += dt;
    if (this.busy || this.t < 0.8) return;
    if (this.menu.update(dt) !== "confirm") return;
    this.busy = true;
    const load = this.menu.index === 1;
    void fadeTo({ alpha: 1, seconds: 0.6 }).then(() => this.onStart({ load }));
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const bg = getImage("ui/title");
    if (bg) ctx.drawImage(bg, 0, 0);
    else {
      const g = ctx.createLinearGradient(0, 0, 0, 224);
      g.addColorStop(0, "#100820");
      g.addColorStop(1, "#582810");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 224);
    }
    const logo = getSheet("ui/logo");
    const bob = Math.round(Math.sin(this.t * 1.5) * 2);
    if (logo) {
      const frame = logo.tags.size > 0 ? tagFrame(logo, [...logo.tags.keys()][0] ?? "", this.t) : 0;
      drawFrame(ctx, logo, { x: SCREEN_W / 2, y: 102 + bob, frame });
    } else {
      drawText(ctx, "MEDIAVIDA TRIGGER", {
        x: SCREEN_W / 2,
        y: 60 + bob,
        align: "center",
        color: "#f88820",
      });
    }
    if (this.t > 0.8) this.menu.draw(ctx, { x: 70, y: 138, w: 116, h: 40 });
    drawText(ctx, "1999 - 2026  Juego de fans", {
      x: SCREEN_W / 2,
      y: 204,
      align: "center",
      color: "#a8a0b8",
    });
  }
}
