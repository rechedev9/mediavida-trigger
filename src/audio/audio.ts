import { compileTrack, type CompiledTrack } from "./compile";
import { makeReverb } from "./effects";
import { TrackPlayer } from "./sequencer";
import { SFX_RENDERERS } from "./sfx";
import type { TrackDef } from "./track-kit";
import { battle } from "./tracks/battle";
import { boss } from "./tracks/boss";
import { cueva } from "./tracks/cueva";
import { ending } from "./tracks/ending";
import { fin } from "./tracks/fin";
import { finalBoss } from "./tracks/final";
import { futuro } from "./tracks/futuro";
import { gameover } from "./tracks/gameover";
import { lan } from "./tracks/lan";
import { oro } from "./tracks/oro";
import { plaza } from "./tracks/plaza";
import { tension } from "./tracks/tension";
import { title } from "./tracks/title";
import { victory } from "./tracks/victory";

export type MusicId =
  | "title"
  | "plaza"
  | "lan"
  | "oro"
  | "fin"
  | "futuro"
  | "cueva"
  | "battle"
  | "boss"
  | "final"
  | "victory"
  | "gameover"
  | "ending"
  | "tension";

export type SfxId =
  | "cursor"
  | "confirm"
  | "cancel"
  | "hit"
  | "crit"
  | "miss"
  | "heal"
  | "fire"
  | "ice"
  | "bolt"
  | "shadow"
  | "levelup"
  | "chest"
  | "door"
  | "portal"
  | "save"
  | "text"
  | "run"
  | "buzz";

const TRACKS: Readonly<Record<MusicId, TrackDef>> = {
  title,
  plaza,
  lan,
  oro,
  fin,
  futuro,
  cueva,
  battle,
  boss,
  final: finalBoss,
  victory,
  gameover,
  ending,
  tension,
};

const SFX: Readonly<Record<SfxId, (typeof SFX_RENDERERS)[SfxId]>> = SFX_RENDERERS;

const MASTER_GAIN = 0.25;
// Voices peak low so chords never clip; these trims bring each bus up to a healthy level.
const MUSIC_TRIM = 4.5;
const SFX_TRIM = 6;
const FADE_OUT = 0.5;
const TICK_MS = 25;
const SFX_MIN_GAP = 0.02;

interface Engine {
  ctx: AudioContext;
  music: GainNode;
  sfx: GainNode;
  room: AudioNode;
  hall: AudioNode;
}

let engine: Engine | null = null;
let current: { id: MusicId; player: TrackPlayer } | null = null;
let pending: MusicId | null = null;
let fading: TrackPlayer[] = [];
let musicVolume = 1;
let sfxVolume = 1;
const compiled = new Map<MusicId, CompiledTrack>();
const lastSfx = new Map<SfxId, number>();

function compiledTrack(id: MusicId): CompiledTrack {
  const hit = compiled.get(id);
  if (hit) return hit;
  const track = compileTrack(TRACKS[id]);
  compiled.set(id, track);
  return track;
}

function createEngine(): Engine | null {
  if (typeof AudioContext === "undefined") return null;
  const ctx = new AudioContext({ latencyHint: "interactive" });
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -8;
  limiter.knee.value = 6;
  limiter.ratio.value = 8;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.2;
  const master = ctx.createGain();
  master.gain.value = MASTER_GAIN;
  master.connect(limiter).connect(ctx.destination);
  // A low cut on music only gives the muffled warmth of SNES sample playback.
  const warmth = ctx.createBiquadFilter();
  warmth.type = "lowpass";
  warmth.frequency.value = 7500;
  warmth.Q.value = 0.5;
  warmth.connect(master);
  const music = ctx.createGain();
  music.gain.value = musicVolume * MUSIC_TRIM;
  music.connect(warmth);
  const sfx = ctx.createGain();
  sfx.gain.value = sfxVolume * SFX_TRIM;
  sfx.connect(master);
  const room = makeReverb(ctx, { seconds: 1.6, out: music });
  const hall = makeReverb(ctx, { seconds: 4.5, out: music });
  return { ctx, music, sfx, room, hall };
}

function tick(): void {
  if (!engine) return;
  const now = engine.ctx.currentTime;
  current?.player.update(now);
  if (current && current.player.isFinished(now)) {
    current.player.dispose();
    current = null;
  }
  for (const p of fading) p.update(now);
  fading = fading.filter((p) => {
    if (!p.isFinished(now)) return true;
    p.dispose();
    return false;
  });
}

function startTrack(e: Engine, id: MusicId): void {
  if (current) {
    current.player.fadeOut(FADE_OUT);
    fading.push(current.player);
  }
  const def = TRACKS[id];
  const player = new TrackPlayer({
    ctx: e.ctx,
    def,
    track: compiledTrack(id),
    buses: { music: e.music, room: e.room, hall: e.hall },
    start: e.ctx.currentTime + 0.08,
  });
  current = { id, player };
  player.update(e.ctx.currentTime);
}

export function playMusic(id: MusicId): void {
  pending = id;
  if (!engine) return;
  if (current && current.id === id && current.player.isPlaying(engine.ctx.currentTime)) return;
  startTrack(engine, id);
}

export function stopMusic(): void {
  pending = null;
  if (!current) return;
  current.player.fadeOut(FADE_OUT);
  fading.push(current.player);
  current = null;
}

export function playSfx(id: SfxId): void {
  if (!engine || engine.ctx.state !== "running") return;
  const now = engine.ctx.currentTime;
  if (now - (lastSfx.get(id) ?? -1) < SFX_MIN_GAP) return;
  lastSfx.set(id, now);
  SFX[id](engine.ctx, { dry: engine.sfx, wet: engine.room, t: now + 0.005 });
}

function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
}

export function setVolume(music: number, sfx: number): void {
  musicVolume = clamp01(music);
  sfxVolume = clamp01(sfx);
  if (!engine) return;
  const now = engine.ctx.currentTime;
  engine.music.gain.setTargetAtTime(musicVolume * MUSIC_TRIM, now, 0.03);
  engine.sfx.gain.setTargetAtTime(sfxVolume * SFX_TRIM, now, 0.03);
}

function onVisibility(): void {
  if (!engine) return;
  if (document.hidden) void engine.ctx.suspend();
  else void engine.ctx.resume();
}

/** Call from the first user gesture; later calls only resume a suspended context. */
export function unlockAudio(): void {
  if (engine) {
    if (engine.ctx.state === "suspended" && !document.hidden) void engine.ctx.resume();
    return;
  }
  engine = createEngine();
  if (!engine) return;
  const { ctx } = engine;
  void ctx.resume();
  const silent = ctx.createBufferSource();
  silent.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  silent.connect(ctx.destination);
  silent.start();
  setInterval(tick, TICK_MS);
  document.addEventListener("visibilitychange", onVisibility);
  if (pending) startTrack(engine, pending);
}
