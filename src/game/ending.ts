import { playMusic } from "../audio/audio";
import { PARTY } from "../data/party";
import { drawText } from "../engine/gfx";
import { wasPressed } from "../engine/input";
import type { Scene } from "../engine/scene";
import { SCREEN_H, SCREEN_W } from "../engine/screen";
import { game } from "./game";
import { drawActor } from "./sprites";

type Line = { text: string; color?: string; gap?: number };

const CREDITS: Line[] = [
  { text: "MEDIAVIDA TRIGGER", color: "#f88820", gap: 24 },
  { text: "Lagvos ha caído. El foro vuelve a cargar.", gap: 12 },
  { text: "Los hilos se bumpean solos otra vez.", gap: 28 },
  { text: "EL GRUPO", color: "#f8c060", gap: 14 },
  ...PARTY.map((m): Line => ({ text: `${m.name}, ${m.title}`, gap: 12 })),
  { text: "", gap: 20 },
  { text: "VETERANOS DEL FORO", color: "#f8c060", gap: 14 },
  { text: "ekeix, Zh3RoX, Kabraxis, Jastro, hda, Kaos", gap: 28 },
  { text: "Un homenaje a 27 años de Mediavida,", gap: 12 },
  { text: "1999 a 2026, y a sus foreros.", gap: 28 },
  { text: "Arte hecho con Aseprite.", gap: 12 },
  { text: "Música y sonido sintetizados.", gap: 12 },
  { text: "Juego de fans sin ánimo de lucro.", gap: 36 },
  { text: "Gracias por jugar.", color: "#f88820", gap: 60 },
  { text: "FIN", color: "#f8f8f8", gap: 0 },
];

const TOTAL = CREDITS.reduce((s, l) => s + (l.gap ?? 12), 0);

export class EndingScene implements Scene {
  readonly transparent = false;
  private t = 0;

  onEnter(): void {
    playMusic("ending");
  }

  update(dt: number): void {
    this.t += dt;
    const done = this.scroll() >= TOTAL + SCREEN_H / 2 - 20;
    if ((done && wasPressed("confirm")) || this.t > 120) game.hooks.title();
  }

  private scroll(): number {
    return Math.min(TOTAL + SCREEN_H / 2 - 20, this.t * 14);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#080818";
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    for (let i = 0; i < 40; i++) {
      const x = (i * 73) % SCREEN_W;
      const y = (i * 41 + this.t * (4 + (i % 3) * 3)) % SCREEN_H;
      ctx.fillStyle = i % 4 === 0 ? "#f88820" : "#484868";
      ctx.fillRect(x, y, 1, 1);
    }
    let y = SCREEN_H - this.scroll();
    for (const line of CREDITS) {
      if (y > -12 && y < SCREEN_H)
        drawText(ctx, line.text, {
          x: SCREEN_W / 2,
          y,
          align: "center",
          color: line.color ?? "#d8d0e0",
        });
      y += line.gap ?? 12;
    }
    PARTY.forEach((m, i) => {
      const x = 32 + i * 32;
      drawActor(ctx, {
        sheet: `chars/${m.id}`,
        tag: "walk-side",
        t: this.t + i * 0.1,
        x,
        y: SCREEN_H - 6,
        flip: true,
        color: m.color,
      });
    });
  }
}
