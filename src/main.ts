import { setVolume, unlockAudio } from "./audio/audio";
import { ENEMIES } from "./data/enemies";
import { MAPS } from "./data/maps";
import { PARTY } from "./data/party";
import type { FxId } from "./data/types";
import { loadData, loadPlainImage, loadSheet } from "./engine/assets";
import { drawBar, drawText, initFont, setWindowTheme } from "./engine/gfx";
import { initInput, updateInput } from "./engine/input";
import { createScreen, SCREEN_H, SCREEN_W } from "./engine/screen";
import { FieldScene } from "./game/field";
import { draw, game, setState, update } from "./game/game";
import { StartScene } from "./game/start";
import { loadGame, newGame, type GameState } from "./game/state";
import { TitleScene } from "./game/title";

const STEP = 1 / 60;
const FX: readonly FxId[] = [
  "slash",
  "flame",
  "ice",
  "bolt",
  "shadow",
  "heal",
  "buff",
  "portal",
  "sparkle",
  "explosion",
];

function npcSprites(): string[] {
  const ids = new Set<string>();
  for (const m of Object.values(MAPS)) {
    for (const n of m.npcs) if (n.sprite) ids.add(n.sprite);
  }
  return [...ids];
}

function drawLoading(ctx: CanvasRenderingContext2D, progress: number): void {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  drawText(ctx, "Cargando...", { x: SCREEN_W / 2, y: 96, align: "center" });
  drawBar(ctx, { x: 64, y: 116, w: 128, value: progress, color: "#f88820" });
}

async function preload(ctx: CanvasRenderingContext2D): Promise<void> {
  // The font loads first so the loading screen can use it.
  await Promise.all([loadPlainImage("ui/font"), loadData("ui/font.json")]);
  initFont();
  const party = PARTY.map((p) => p.id);
  const chars = [...new Set([...party, ...npcSprites()])];
  const jobs: Promise<unknown>[] = [
    loadPlainImage("ui/window"),
    loadPlainImage("ui/title"),
    loadSheet("ui/cursor"),
    loadSheet("ui/icons"),
    loadSheet("ui/logo"),
    ...chars.map((id) => loadSheet(`chars/${id}`)),
    ...chars.map((id) => loadPlainImage(`faces/${id}`)),
    ...Object.keys(ENEMIES).map((id) => loadSheet(`enemies/${id}`)),
    ...FX.map((id) => loadSheet(`fx/${id}`)),
  ];
  let done = 0;
  drawLoading(ctx, 0);
  await Promise.all(jobs.map((job) => job.then(() => drawLoading(ctx, ++done / jobs.length))));
}

function applySettings(s: GameState): void {
  setVolume(s.settings.music, s.settings.sfx);
  setWindowTheme(s.settings.windowTheme);
}

async function startGame(o: { load: boolean }): Promise<void> {
  const saved = o.load ? loadGame() : null;
  const state = saved ?? newGame();
  setState(state);
  applySettings(state);
  game.timers.clear();
  game.fade.alpha = 1;
  const field = new FieldScene();
  game.stack.reset(field);
  await field.enter({ map: state.map, x: state.x, y: state.y, dir: state.dir });
}

function showTitle(): void {
  game.timers.clear();
  game.fade.alpha = 1;
  game.stack.reset(new TitleScene((o) => void startGame(o)));
}

async function boot(): Promise<void> {
  const host = document.getElementById("app") ?? document.body;
  const { ctx } = createScreen(host);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
  initInput(unlockAudio);
  await preload(ctx);
  game.hooks.title = showTitle;
  game.hooks.continueGame = () => void startGame({ load: true });
  game.fade.alpha = 0;
  game.stack.reset(new StartScene(showTitle));

  let last = performance.now();
  let acc = 0;
  const frame = (now: number): void => {
    acc += Math.min(0.25, (now - last) / 1000);
    last = now;
    while (acc >= STEP) {
      updateInput(STEP);
      update(STEP);
      acc -= STEP;
    }
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    draw(ctx);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

void boot();
