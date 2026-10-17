import type { CompiledEvent, CompiledTrack } from "./compile";
import { makeDelay } from "./effects";
import { playDrum, playVoice } from "./synth";
import type { TrackDef } from "./track-kit";

interface MixBuses {
  music: AudioNode;
  room: AudioNode;
  hall: AudioNode;
}

interface PlayerOptions {
  ctx: BaseAudioContext;
  def: TrackDef;
  track: CompiledTrack;
  buses: MixBuses;
  start: number;
}

const LOOKAHEAD = 0.2;
const LATE_LIMIT = 0.05;
const TAIL = 4;

interface PartOut {
  inst: TrackDef["parts"][string]["inst"];
  node: AudioNode;
}

/** Look-ahead scheduler: a timer wakes it, but every note is placed on the AudioContext clock. */
export class TrackPlayer {
  private readonly ctx: BaseAudioContext;
  private readonly track: CompiledTrack;
  private readonly loop: boolean;
  private readonly start: number;
  private readonly spb: number;
  private readonly dry: GainNode;
  private readonly wet: GainNode;
  private readonly parts = new Map<string, PartOut>();
  private readonly owned: AudioNode[] = [];
  private readonly loopIndex: number;
  private index = 0;
  private beatBase = 0;
  private ended = false;
  private stopAt = Infinity;

  constructor(opts: PlayerOptions) {
    const { ctx, def, track, buses } = opts;
    this.ctx = ctx;
    this.track = track;
    this.loop = def.loop;
    this.start = opts.start;
    this.spb = 60 / def.bpm;
    this.loopIndex = track.events.findIndex((e) => e.time >= track.loopStartBeat - 1e-9);
    this.dry = this.own(ctx.createGain());
    this.wet = this.own(ctx.createGain());
    for (const g of [this.dry, this.wet]) {
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.setValueAtTime(0, opts.start);
      g.gain.linearRampToValueAtTime(def.gain ?? 1, opts.start + Math.max(def.fadeIn, 0.02));
    }
    this.dry.connect(buses.music);
    this.connectSends({ def, buses });
    for (const [name, part] of Object.entries(def.parts)) {
      const input = this.own(ctx.createGain());
      input.gain.value = part.vol;
      const pan = this.own(ctx.createStereoPanner());
      pan.pan.value = part.pan ?? 0;
      const send = this.own(ctx.createGain());
      send.gain.value = part.send ?? 0.3;
      input.connect(pan).connect(this.dry);
      pan.connect(send).connect(this.wet);
      this.parts.set(name, { inst: part.inst, node: input });
    }
  }

  private own<T extends AudioNode>(node: T): T {
    this.owned.push(node);
    return node;
  }

  private connectSends(o: { def: TrackDef; buses: MixBuses }): void {
    const room = this.own(this.ctx.createGain());
    room.gain.value = o.def.room;
    const hall = this.own(this.ctx.createGain());
    hall.gain.value = o.def.hall;
    this.wet.connect(room).connect(o.buses.room);
    this.wet.connect(hall).connect(o.buses.hall);
    const d = o.def.delay;
    if (d) {
      const nodes = makeDelay(this.ctx, {
        seconds: d.beats * this.spb,
        feedback: d.feedback,
        mix: d.mix,
        input: this.wet,
        out: o.buses.music,
      });
      this.owned.push(...nodes);
    }
  }

  get endTime(): number {
    if (this.loop) return this.stopAt;
    return Math.min(this.stopAt, this.start + this.track.lengthBeats * this.spb);
  }

  /** True once nothing more will sound, so the caller can drop it. */
  isFinished(now: number): boolean {
    return now > this.endTime + TAIL;
  }

  isPlaying(now: number): boolean {
    return now < this.endTime && this.stopAt === Infinity;
  }

  update(now: number): void {
    const horizon = Math.min(now + LOOKAHEAD, this.stopAt);
    while (!this.ended) {
      const ev = this.track.events[this.index];
      if (!ev) {
        if (!this.loop || this.loopIndex < 0) {
          this.ended = true;
          break;
        }
        this.beatBase += this.track.lengthBeats - this.track.loopStartBeat;
        this.index = this.loopIndex;
        continue;
      }
      const t = this.start + (this.beatBase + ev.time) * this.spb;
      if (t > horizon) break;
      if (t >= now - LATE_LIMIT) this.schedule(ev, Math.max(t, now));
      this.index++;
    }
  }

  private schedule(ev: CompiledEvent, time: number): void {
    const part = this.parts.get(ev.part);
    if (!part) return;
    if (ev.kind === "drum") {
      playDrum(this.ctx, { drum: ev.drum, time, vel: ev.vel, out: part.node });
      return;
    }
    if (part.inst === "drums") return;
    playVoice(this.ctx, {
      inst: part.inst,
      midi: ev.midi,
      time,
      dur: ev.dur * this.spb,
      vel: ev.vel,
      out: part.node,
    });
  }

  fadeOut(seconds: number): void {
    const now = this.ctx.currentTime;
    if (this.stopAt <= now + seconds) return;
    this.stopAt = now + seconds;
    for (const g of [this.dry, this.wet]) {
      const current = g.gain.value;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(current, now);
      g.gain.linearRampToValueAtTime(0, now + seconds);
    }
  }

  dispose(): void {
    for (const node of this.owned) node.disconnect();
    this.owned.length = 0;
  }
}
