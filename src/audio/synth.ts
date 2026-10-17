import { midiToFreq } from "./notation";
import type { DrumId, InstrumentId } from "./track-kit";

interface Voice {
  inst: InstrumentId;
  midi: number;
  time: number;
  dur: number;
  vel: number;
  out: AudioNode;
}

interface DrumHit {
  drum: DrumId;
  time: number;
  vel: number;
  out: AudioNode;
}

interface Envelope {
  t: number;
  a: number;
  d: number;
  s: number;
  r: number;
  peak: number;
  end: number;
}

interface OscSpec {
  type?: OscillatorType;
  wave?: PeriodicWave;
  freq: number;
  detune?: number;
  t: number;
  stop: number;
  dest: AudioNode;
  gain?: number;
}

const waveCache = new WeakMap<BaseAudioContext, Map<string, PeriodicWave>>();
const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();

function cachedWave(ctx: BaseAudioContext, key: string, harmonics: (n: number) => number) {
  let map = waveCache.get(ctx);
  if (!map) {
    map = new Map();
    waveCache.set(ctx, map);
  }
  const hit = map.get(key);
  if (hit) return hit;
  const real = Array.from({ length: 33 }, (_, n) => (n === 0 ? 0 : harmonics(n)));
  const imag = real.map(() => 0);
  const wave = ctx.createPeriodicWave(real, imag);
  map.set(key, wave);
  return wave;
}

/** Band-limited pulse with the given duty cycle; 32 harmonics keeps it soft like an SNES sample. */
export function pulseWave(ctx: BaseAudioContext, duty: number): PeriodicWave {
  return cachedWave(ctx, `pulse${duty}`, (n) => (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty));
}

const DRAWBARS: Readonly<Record<number, number>> = {
  1: 1,
  2: 0.7,
  3: 0.45,
  4: 0.5,
  6: 0.25,
  8: 0.2,
};

function organWave(ctx: BaseAudioContext): PeriodicWave {
  return cachedWave(ctx, "organ", (n) => DRAWBARS[n] ?? 0);
}

export function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const hit = noiseCache.get(ctx);
  if (hit) return hit;
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseCache.set(ctx, buf);
  return buf;
}

/** Applies an ADSR to `param` and returns the time after which the voice is silent. */
export function envelope(param: AudioParam, e: Envelope): number {
  const a = Math.max(0.002, Math.min(e.a, (e.end - e.t) * 0.9));
  const end = Math.max(e.end, e.t + a + 0.005);
  param.setValueAtTime(0, e.t);
  param.linearRampToValueAtTime(e.peak, e.t + a);
  param.setTargetAtTime(e.peak * e.s, e.t + a, e.d / 3);
  param.setTargetAtTime(0, end, e.r / 4);
  return end + e.r * 1.6;
}

export function osc(ctx: BaseAudioContext, spec: OscSpec): OscillatorNode {
  const o = ctx.createOscillator();
  if (spec.wave) o.setPeriodicWave(spec.wave);
  else o.type = spec.type ?? "sine";
  o.frequency.value = spec.freq;
  o.detune.value = spec.detune ?? 0;
  if (spec.gain === undefined) o.connect(spec.dest);
  else {
    const g = ctx.createGain();
    g.gain.value = spec.gain;
    o.connect(g).connect(spec.dest);
  }
  o.start(spec.t);
  o.stop(spec.stop);
  return o;
}

interface VibratoSpec {
  targets: AudioParam[];
  t: number;
  stop: number;
  rate: number;
  cents: number;
  delay: number;
}

function vibrato(ctx: BaseAudioContext, v: VibratoSpec): void {
  if (v.stop - v.t < v.delay + 0.1) return;
  const depth = ctx.createGain();
  depth.gain.setValueAtTime(0, v.t);
  depth.gain.setValueAtTime(0, v.t + v.delay);
  depth.gain.linearRampToValueAtTime(v.cents, v.t + v.delay + 0.35);
  osc(ctx, { freq: v.rate, t: v.t, stop: v.stop, dest: depth });
  for (const target of v.targets) depth.connect(target);
}

function filter(ctx: BaseAudioContext, type: BiquadFilterType, freq: number, q = 0.7) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

function amp(ctx: BaseAudioContext, out: AudioNode): GainNode {
  const g = ctx.createGain();
  g.gain.value = 0;
  g.connect(out);
  return g;
}

function noise(ctx: BaseAudioContext, spec: { t: number; stop: number; dest: AudioNode }) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  src.connect(spec.dest);
  src.start(spec.t, Math.random() * 0.5);
  src.stop(spec.stop);
  return src;
}

type Builder = (ctx: BaseAudioContext, v: Voice) => void;

const lead: Builder = (ctx, v) => {
  const f = midiToFreq(v.midi);
  const g = amp(ctx, v.out);
  const lp = filter(ctx, "lowpass", Math.min(f * 7, 5200), 0.5);
  lp.connect(g);
  const end = v.time + v.dur;
  const stop = envelope(g.gain, {
    t: v.time,
    a: 0.012,
    d: 0.25,
    s: 0.72,
    r: 0.14,
    peak: 0.075 * v.vel,
    end,
  });
  const wave = pulseWave(ctx, 0.25);
  const a = osc(ctx, { wave, freq: f, detune: -6, t: v.time, stop, dest: lp });
  const b = osc(ctx, { wave, freq: f, detune: 6, t: v.time, stop, dest: lp, gain: 0.8 });
  const c = osc(ctx, { type: "sawtooth", freq: f, t: v.time, stop, dest: lp, gain: 0.35 });
  const sub = osc(ctx, { freq: f, t: v.time, stop, dest: lp, gain: 0.6 });
  const all = [a, b, c, sub];
  // A short scoop into the pitch gives the lead a sung, SNES-sample feel.
  for (const o of all) {
    o.frequency.setValueAtTime(f * 0.982, v.time);
    o.frequency.exponentialRampToValueAtTime(f, v.time + 0.045);
  }
  vibrato(ctx, {
    targets: all.map((o) => o.detune),
    t: v.time,
    stop,
    rate: 5.6,
    cents: 14,
    delay: 0.24,
  });
};

const chip: Builder = (ctx, v) => {
  const g = amp(ctx, v.out);
  const end = v.time + v.dur;
  const stop = envelope(g.gain, {
    t: v.time,
    a: 0.002,
    d: 0.12,
    s: 0.55,
    r: 0.04,
    peak: 0.08 * v.vel,
    end,
  });
  osc(ctx, { wave: pulseWave(ctx, 0.125), freq: midiToFreq(v.midi), t: v.time, stop, dest: g });
};

const strings: Builder = (ctx, v) => {
  const f = midiToFreq(v.midi);
  const g = amp(ctx, v.out);
  const lp = filter(ctx, "lowpass", Math.min(f * 4, 2600), 0.4);
  lp.connect(g);
  const end = v.time + v.dur;
  const stop = envelope(g.gain, {
    t: v.time,
    a: 0.32,
    d: 0.6,
    s: 0.88,
    r: 0.55,
    peak: 0.03 * v.vel,
    end,
  });
  const oscs = [-14, -6, 0, 7, 13].map((detune) =>
    osc(ctx, { type: "sawtooth", freq: f, detune, t: v.time, stop, dest: lp, gain: 0.8 }),
  );
  oscs.push(osc(ctx, { type: "triangle", freq: f / 2, t: v.time, stop, dest: lp, gain: 0.6 }));
  vibrato(ctx, {
    targets: oscs.map((o) => o.detune),
    t: v.time,
    stop,
    rate: 4.8,
    cents: 6,
    delay: 0.4,
  });
};

const organ: Builder = (ctx, v) => {
  const f = midiToFreq(v.midi);
  const g = amp(ctx, v.out);
  const end = v.time + v.dur;
  const stop = envelope(g.gain, {
    t: v.time,
    a: 0.015,
    d: 0.1,
    s: 1,
    r: 0.12,
    peak: 0.055 * v.vel,
    end,
  });
  const wave = organWave(ctx);
  const a = osc(ctx, { wave, freq: f, t: v.time, stop, dest: g });
  const b = osc(ctx, { wave, freq: f, detune: 5, t: v.time, stop, dest: g, gain: 0.7 });
  vibrato(ctx, { targets: [a.detune, b.detune], t: v.time, stop, rate: 6.3, cents: 7, delay: 0 });
};

const bass: Builder = (ctx, v) => {
  const f = midiToFreq(v.midi);
  const g = amp(ctx, v.out);
  const lp = filter(ctx, "lowpass", 900, 1);
  lp.frequency.setValueAtTime(Math.min(f * 10, 2400), v.time);
  lp.frequency.setTargetAtTime(Math.max(f * 3, 220), v.time, 0.08);
  lp.connect(g);
  const end = v.time + v.dur * 0.92;
  const stop = envelope(g.gain, {
    t: v.time,
    a: 0.005,
    d: 0.3,
    s: 0.65,
    r: 0.06,
    peak: 0.24 * v.vel,
    end,
  });
  osc(ctx, { type: "triangle", freq: f, t: v.time, stop, dest: lp });
  osc(ctx, { type: "sawtooth", freq: f, t: v.time, stop, dest: lp, gain: 0.35 });
};

const synthBass: Builder = (ctx, v) => {
  const f = midiToFreq(v.midi);
  const g = amp(ctx, v.out);
  const lp = filter(ctx, "lowpass", 600, 4);
  lp.frequency.setValueAtTime(Math.min(f * 24, 3200), v.time);
  lp.frequency.setTargetAtTime(Math.max(f * 4, 300), v.time, 0.06);
  lp.connect(g);
  const end = v.time + v.dur * 0.85;
  const stop = envelope(g.gain, {
    t: v.time,
    a: 0.003,
    d: 0.2,
    s: 0.6,
    r: 0.05,
    peak: 0.12 * v.vel,
    end,
  });
  osc(ctx, { type: "sawtooth", freq: f, detune: -6, t: v.time, stop, dest: lp });
  osc(ctx, { type: "square", freq: f, detune: 6, t: v.time, stop, dest: lp, gain: 0.6 });
};

const musicBox: Builder = (ctx, v) => {
  const f = midiToFreq(v.midi);
  const g = amp(ctx, v.out);
  const end = v.time + Math.max(v.dur, 2.2);
  const stop = envelope(g.gain, {
    t: v.time,
    a: 0.002,
    d: 2.4,
    s: 0,
    r: 0.6,
    peak: 0.13 * v.vel,
    end,
  });
  osc(ctx, { freq: f, t: v.time, stop, dest: g });
  const tine = amp(ctx, g);
  envelope(tine.gain, { t: v.time, a: 0.001, d: 0.35, s: 0, r: 0.1, peak: 0.35, end });
  osc(ctx, { freq: f * 4, t: v.time, stop, dest: tine });
  osc(ctx, { freq: f * 6.8, t: v.time, stop, dest: tine, gain: 0.3 });
};

interface FmSpec {
  v: Voice;
  ratio: number;
  index: number;
  env: Envelope;
}

const fmVoice = (ctx: BaseAudioContext, o: FmSpec) => {
  const v = o.v;
  const f = midiToFreq(v.midi);
  const g = amp(ctx, v.out);
  const stop = envelope(g.gain, o.env);
  const carrier = osc(ctx, { freq: f, t: v.time, stop, dest: g });
  const modGain = ctx.createGain();
  modGain.gain.setValueAtTime(f * o.index, v.time);
  modGain.gain.setTargetAtTime(f * o.index * 0.12, v.time, 0.25);
  modGain.connect(carrier.frequency);
  osc(ctx, { freq: f * o.ratio, t: v.time, stop, dest: modGain });
};

const bell: Builder = (ctx, v) => {
  const end = v.time + Math.max(v.dur, 1.8);
  const env = { t: v.time, a: 0.002, d: 3, s: 0, r: 0.8, peak: 0.08 * v.vel, end };
  fmVoice(ctx, { v, ratio: 3.5, index: 1.6, env });
};

const epiano: Builder = (ctx, v) => {
  const end = v.time + v.dur;
  const env = { t: v.time, a: 0.003, d: 1.4, s: 0.3, r: 0.25, peak: 0.12 * v.vel, end };
  fmVoice(ctx, { v, ratio: 1, index: 1.3, env });
};

const brass: Builder = (ctx, v) => {
  const f = midiToFreq(v.midi);
  const g = amp(ctx, v.out);
  const lp = filter(ctx, "lowpass", f, 1.4);
  lp.frequency.setValueAtTime(f * 1.2, v.time);
  lp.frequency.linearRampToValueAtTime(Math.min(f * 6, 5000), v.time + 0.06);
  lp.frequency.setTargetAtTime(Math.min(f * 3, 3500), v.time + 0.06, 0.2);
  lp.connect(g);
  const end = v.time + v.dur;
  const stop = envelope(g.gain, {
    t: v.time,
    a: 0.035,
    d: 0.25,
    s: 0.8,
    r: 0.12,
    peak: 0.06 * v.vel,
    end,
  });
  const a = osc(ctx, { type: "sawtooth", freq: f, detune: -8, t: v.time, stop, dest: lp });
  const b = osc(ctx, { type: "sawtooth", freq: f, detune: 8, t: v.time, stop, dest: lp });
  const c = osc(ctx, { wave: pulseWave(ctx, 0.4), freq: f, t: v.time, stop, dest: lp, gain: 0.7 });
  const targets = [a.detune, b.detune, c.detune];
  vibrato(ctx, { targets, t: v.time, stop, rate: 5.2, cents: 10, delay: 0.3 });
};

const flute: Builder = (ctx, v) => {
  const f = midiToFreq(v.midi);
  const g = amp(ctx, v.out);
  const end = v.time + v.dur;
  const stop = envelope(g.gain, {
    t: v.time,
    a: 0.05,
    d: 0.25,
    s: 0.85,
    r: 0.14,
    peak: 0.15 * v.vel,
    end,
  });
  const a = osc(ctx, { type: "triangle", freq: f, t: v.time, stop, dest: g });
  const b = osc(ctx, { freq: f * 2, t: v.time, stop, dest: g, gain: 0.12 });
  vibrato(ctx, { targets: [a.detune, b.detune], t: v.time, stop, rate: 5, cents: 14, delay: 0.22 });
  const breath = amp(ctx, g);
  envelope(breath.gain, { t: v.time, a: 0.02, d: 0.12, s: 0.15, r: 0.1, peak: 0.25, end });
  const bp = filter(ctx, "bandpass", Math.min(f * 2, 6000), 1.5);
  bp.connect(breath);
  noise(ctx, { t: v.time, stop, dest: bp });
};

const pluck: Builder = (ctx, v) => {
  const f = midiToFreq(v.midi);
  const g = amp(ctx, v.out);
  const lp = filter(ctx, "lowpass", Math.min(f * 6, 4000), 0.5);
  lp.connect(g);
  const end = v.time + Math.max(v.dur, 0.7);
  const stop = envelope(g.gain, {
    t: v.time,
    a: 0.002,
    d: 1.1,
    s: 0,
    r: 0.3,
    peak: 0.14 * v.vel,
    end,
  });
  osc(ctx, { type: "triangle", freq: f, t: v.time, stop, dest: lp });
  osc(ctx, { freq: f * 2, t: v.time, stop, dest: lp, gain: 0.3 });
};

const timpani: Builder = (ctx, v) => {
  const f = midiToFreq(v.midi);
  const g = amp(ctx, v.out);
  const end = v.time + Math.max(v.dur, 0.9);
  const stop = envelope(g.gain, {
    t: v.time,
    a: 0.003,
    d: 1.3,
    s: 0,
    r: 0.3,
    peak: 0.3 * v.vel,
    end,
  });
  const body = osc(ctx, { freq: f * 1.35, t: v.time, stop, dest: g });
  body.frequency.exponentialRampToValueAtTime(f, v.time + 0.05);
  osc(ctx, { type: "triangle", freq: f * 1.5, t: v.time, stop, dest: g, gain: 0.25 });
  const thump = amp(ctx, g);
  envelope(thump.gain, {
    t: v.time,
    a: 0.001,
    d: 0.08,
    s: 0,
    r: 0.05,
    peak: 0.6,
    end: v.time + 0.1,
  });
  const lp = filter(ctx, "lowpass", 700);
  lp.connect(thump);
  noise(ctx, { t: v.time, stop: v.time + 0.2, dest: lp });
};

const choir: Builder = (ctx, v) => {
  const f = midiToFreq(v.midi);
  const g = amp(ctx, v.out);
  const end = v.time + v.dur;
  const stop = envelope(g.gain, {
    t: v.time,
    a: 0.4,
    d: 0.5,
    s: 0.9,
    r: 0.6,
    peak: 0.35 * v.vel,
    end,
  });
  const sum = ctx.createGain();
  for (const [freq, q, gain] of [
    [700, 5, 1],
    [1150, 6, 0.6],
    [2600, 8, 0.25],
  ] as const) {
    const bp = filter(ctx, "bandpass", freq, q);
    const lvl = ctx.createGain();
    lvl.gain.value = gain;
    sum.connect(bp).connect(lvl).connect(g);
  }
  const a = osc(ctx, { type: "sawtooth", freq: f, detune: -8, t: v.time, stop, dest: sum });
  const b = osc(ctx, { type: "sawtooth", freq: f, detune: 8, t: v.time, stop, dest: sum });
  vibrato(ctx, {
    targets: [a.detune, b.detune],
    t: v.time,
    stop,
    rate: 5.4,
    cents: 12,
    delay: 0.3,
  });
};

const BUILDERS: Readonly<Record<InstrumentId, Builder>> = {
  lead,
  chip,
  strings,
  organ,
  bass,
  synthBass,
  musicBox,
  bell,
  epiano,
  brass,
  flute,
  pluck,
  timpani,
  choir,
};

export function playVoice(ctx: BaseAudioContext, v: Voice): void {
  BUILDERS[v.inst](ctx, v);
}

interface NoiseHit {
  t: number;
  dest: AudioNode;
  type: BiquadFilterType;
  freq: number;
  q: number;
  peak: number;
  decay: number;
}

function noiseHit(ctx: BaseAudioContext, n: NoiseHit): void {
  const g = amp(ctx, n.dest);
  const stop = envelope(g.gain, {
    t: n.t,
    a: 0.001,
    d: n.decay,
    s: 0,
    r: 0.02,
    peak: n.peak,
    end: n.t + n.decay * 2,
  });
  const f = filter(ctx, n.type, n.freq, n.q);
  f.connect(g);
  noise(ctx, { t: n.t, stop, dest: f });
}

interface ToneHit {
  t: number;
  dest: AudioNode;
  from: number;
  to: number;
  sweep: number;
  peak: number;
  decay: number;
  type?: OscillatorType;
}

function toneHit(ctx: BaseAudioContext, h: ToneHit): void {
  const g = amp(ctx, h.dest);
  const stop = envelope(g.gain, {
    t: h.t,
    a: 0.001,
    d: h.decay,
    s: 0,
    r: 0.02,
    peak: h.peak,
    end: h.t + h.decay * 2,
  });
  const o = osc(ctx, { type: h.type ?? "sine", freq: h.from, t: h.t, stop, dest: g });
  o.frequency.exponentialRampToValueAtTime(h.to, h.t + h.sweep);
}

export function playDrum(ctx: BaseAudioContext, h: DrumHit): void {
  const t = h.time;
  const v = h.vel;
  const dest = h.out;
  switch (h.drum) {
    case "kick":
      toneHit(ctx, { t, dest, from: 150, to: 45, sweep: 0.11, peak: 0.55 * v, decay: 0.22 });
      noiseHit(ctx, { t, dest, type: "lowpass", freq: 1800, q: 0.5, peak: 0.12 * v, decay: 0.012 });
      break;
    case "snare":
      noiseHit(ctx, { t, dest, type: "bandpass", freq: 1900, q: 0.8, peak: 0.32 * v, decay: 0.14 });
      toneHit(ctx, {
        t,
        dest,
        from: 210,
        to: 160,
        sweep: 0.05,
        peak: 0.18 * v,
        decay: 0.07,
        type: "triangle",
      });
      break;
    case "hat":
      noiseHit(ctx, { t, dest, type: "highpass", freq: 7500, q: 0.7, peak: 0.1 * v, decay: 0.035 });
      break;
    case "open":
      noiseHit(ctx, { t, dest, type: "highpass", freq: 6500, q: 0.7, peak: 0.08 * v, decay: 0.22 });
      break;
    case "tomHi":
      toneHit(ctx, { t, dest, from: 240, to: 150, sweep: 0.12, peak: 0.35 * v, decay: 0.2 });
      break;
    case "tomLo":
      toneHit(ctx, { t, dest, from: 150, to: 85, sweep: 0.15, peak: 0.38 * v, decay: 0.28 });
      break;
    case "crash":
      noiseHit(ctx, { t, dest, type: "highpass", freq: 4200, q: 0.5, peak: 0.1 * v, decay: 0.9 });
      noiseHit(ctx, { t, dest, type: "bandpass", freq: 3000, q: 0.6, peak: 0.05 * v, decay: 0.4 });
      break;
    case "shaker":
      noiseHit(ctx, { t, dest, type: "bandpass", freq: 6200, q: 1.4, peak: 0.07 * v, decay: 0.03 });
      break;
    case "clap":
      for (const dt of [0, 0.011, 0.022]) {
        const decay = dt === 0.022 ? 0.1 : 0.012;
        noiseHit(ctx, {
          t: t + dt,
          dest,
          type: "bandpass",
          freq: 1300,
          q: 1.2,
          peak: 0.22 * v,
          decay,
        });
      }
      break;
  }
}
