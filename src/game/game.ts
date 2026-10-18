import { setHeroName } from "../data/party";
import { SceneStack } from "../engine/scene";
import { Timers } from "../engine/tween";
import { newGame, type GameState } from "./state";

type Overlay = { color: string; alpha: number };

/** Global game context shared by all scenes. */
export const game = {
  stack: new SceneStack(),
  timers: new Timers(),
  state: newGame(),
  fade: { color: "#000000", alpha: 0 } satisfies Overlay,
  shake: 0,
  time: 0,
  /** Set by main.ts; breaks the import cycle between title, field and ending. */
  hooks: {
    title: (): void => {},
    continueGame: (): void => {},
  },
};

export function setState(s: GameState): void {
  game.state = s;
  setHeroName(s.heroName);
}

export function fadeTo(o: { alpha: number; seconds?: number; color?: string }): Promise<void> {
  if (o.color) game.fade.color = o.color;
  const from = game.fade.alpha;
  return game.timers.tween(o.seconds ?? 0.3, (k) => {
    game.fade.alpha = from + (o.alpha - from) * k;
  });
}

export function shake(seconds: number): void {
  game.shake = Math.max(game.shake, seconds);
}

export function update(dt: number): void {
  game.time += dt;
  game.state.playtime += dt;
  game.shake = Math.max(0, game.shake - dt);
  game.timers.update(dt);
  game.stack.update(dt);
}

export function draw(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  if (game.shake > 0) {
    ctx.translate(Math.round(Math.random() * 4 - 2), Math.round(Math.random() * 4 - 2));
  }
  game.stack.draw(ctx);
  ctx.restore();
  if (game.fade.alpha > 0) {
    ctx.globalAlpha = Math.min(1, game.fade.alpha);
    ctx.fillStyle = game.fade.color;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.globalAlpha = 1;
  }
}
