import { midiToFreq, noteToMidi } from "./notation";
import { envelope, noiseBuffer, osc, pulseWave } from "./synth";

interface SfxOut {
  dry: AudioNode;
  wet: AudioNode;
  t: number;
}

type Renderer = (ctx: BaseAudioContext, o: SfxOut) => void;

interface Blip {
  t: number;
  dest: AudioNode;
  freq: number;
  to?: number;
  dur: number;
  peak: number;
  wave?: "pulse12" | "pulse25" | "pulse50" | OscillatorType;
  decay?: number;
}

function waveFor(ctx: BaseAudioContext, w: Blip["wave"]) {
  if (w === "pulse12") return { wave: pulseWave(ctx, 0.125) };
  if (w === "pulse25") return { wave: pulseWave(ctx, 0.25) };
  if (w === "pulse50") return { wave: pulseWave(ctx, 0.5) };
  return { type: w ?? "sine" };
}

function blip(ctx: BaseAudioContext, b: Blip): OscillatorNode {
  const g = ctx.createGain();
  g.connect(b.dest);
  const end = b.t + b.dur;
  const stop = envelope(g.gain, {
    t: b.t,
    a: 0.003,
    d: b.decay ?? b.dur,
    s: b.decay === undefined ? 0.8 : 0,
    r: 0.03,
    peak: b.peak,
    end,
  });
  const o = osc(ctx, { ...waveFor(ctx, b.wave), freq: b.freq, t: b.t, stop, dest: g });
  if (b.to !== undefined) o.frequency.exponentialRampToValueAtTime(b.to, end);
  return o;
}

interface Hiss {
  t: number;
  dest: AudioNode;
  dur: number;
  peak: number;
  type: BiquadFilterType;
  from: number;
  to: number;
  q?: number;
  attack?: number;
}

function hiss(ctx: BaseAudioContext, h: Hiss): GainNode {
  const g = ctx.createGain();
  g.connect(h.dest);
  const end = h.t + h.dur;
  const stop = envelope(g.gain, {
    t: h.t,
    a: h.attack ?? 0.003,
    d: h.dur * 0.6,
    s: 0.3,
    r: h.dur * 0.3,
    peak: h.peak,
    end,
  });
  const f = ctx.createBiquadFilter();
  f.type = h.type;
  f.Q.value = h.q ?? 1;
  f.frequency.setValueAtTime(h.from, h.t);
  f.frequency.exponentialRampToValueAtTime(h.to, end);
  f.connect(g);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  src.connect(f);
  src.start(h.t, Math.random() * 0.5);
  src.stop(stop);
  return g;
}

function both(ctx: BaseAudioContext, o: SfxOut): AudioNode {
  const g = ctx.createGain();
  g.connect(o.dry);
  g.connect(o.wet);
  return g;
}

interface Arpeggio extends SfxOut {
  notes: string;
  step: number;
  peak: number;
  wave: NonNullable<Blip["wave"]>;
  decay: number;
}

function arpeggio(ctx: BaseAudioContext, o: Arpeggio) {
  const dest = both(ctx, o);
  o.notes.split(" ").forEach((name, i) => {
    const t = o.t + i * o.step;
    blip(ctx, {
      t,
      dest,
      freq: midiToFreq(noteToMidi(name)),
      dur: o.decay,
      decay: o.decay,
      peak: o.peak,
      wave: o.wave,
    });
  });
}

const cursor: Renderer = (ctx, o) => {
  blip(ctx, { t: o.t, dest: o.dry, freq: 1568, dur: 0.035, peak: 0.12, wave: "pulse50" });
};

const confirm: Renderer = (ctx, o) => {
  blip(ctx, { t: o.t, dest: o.dry, freq: 1047, dur: 0.05, peak: 0.12, wave: "pulse25" });
  blip(ctx, {
    t: o.t + 0.055,
    dest: o.dry,
    freq: 1568,
    dur: 0.09,
    peak: 0.12,
    wave: "pulse25",
    decay: 0.12,
  });
};

const cancel: Renderer = (ctx, o) => {
  blip(ctx, { t: o.t, dest: o.dry, freq: 784, dur: 0.05, peak: 0.12, wave: "pulse25" });
  blip(ctx, {
    t: o.t + 0.055,
    dest: o.dry,
    freq: 523,
    dur: 0.08,
    peak: 0.12,
    wave: "pulse25",
    decay: 0.1,
  });
};

const hit: Renderer = (ctx, o) => {
  hiss(ctx, {
    t: o.t,
    dest: o.dry,
    dur: 0.12,
    peak: 0.35,
    type: "bandpass",
    from: 2200,
    to: 500,
    q: 0.8,
  });
  blip(ctx, { t: o.t, dest: o.dry, freq: 260, to: 60, dur: 0.14, peak: 0.4, decay: 0.12 });
};

const crit: Renderer = (ctx, o) => {
  hit(ctx, o);
  hiss(ctx, {
    t: o.t,
    dest: both(ctx, o),
    dur: 0.08,
    peak: 0.25,
    type: "highpass",
    from: 5000,
    to: 3000,
  });
  blip(ctx, {
    t: o.t + 0.02,
    dest: o.dry,
    freq: 1400,
    to: 180,
    dur: 0.22,
    peak: 0.12,
    wave: "pulse25",
    decay: 0.2,
  });
  blip(ctx, { t: o.t + 0.09, dest: o.dry, freq: 180, to: 45, dur: 0.2, peak: 0.35, decay: 0.18 });
};

const miss: Renderer = (ctx, o) => {
  hiss(ctx, {
    t: o.t,
    dest: o.dry,
    dur: 0.16,
    peak: 0.3,
    type: "bandpass",
    from: 1800,
    to: 5200,
    q: 2,
    attack: 0.04,
  });
};

const heal: Renderer = (ctx, o) => {
  arpeggio(ctx, {
    ...o,
    notes: "C6 E6 G6 C7 E7",
    step: 0.06,
    peak: 0.1,
    wave: "triangle",
    decay: 0.5,
  });
  hiss(ctx, {
    t: o.t,
    dest: o.wet,
    dur: 0.5,
    peak: 0.03,
    type: "highpass",
    from: 6000,
    to: 9000,
    attack: 0.1,
  });
};

const fire: Renderer = (ctx, o) => {
  const dest = both(ctx, o);
  hiss(ctx, {
    t: o.t,
    dest,
    dur: 0.6,
    peak: 0.28,
    type: "lowpass",
    from: 4000,
    to: 300,
    q: 1.5,
    attack: 0.02,
  });
  for (let i = 0; i < 6; i++) {
    const t = o.t + 0.05 + Math.random() * 0.4;
    hiss(ctx, {
      t,
      dest: o.dry,
      dur: 0.03,
      peak: 0.12,
      type: "bandpass",
      from: 3000,
      to: 1500,
      q: 2,
    });
  }
  blip(ctx, {
    t: o.t,
    dest: o.dry,
    freq: 110,
    to: 55,
    dur: 0.5,
    peak: 0.2,
    decay: 0.4,
    wave: "triangle",
  });
};

const ice: Renderer = (ctx, o) => {
  const dest = both(ctx, o);
  const notes = [88, 95, 91, 98, 93, 100];
  notes.forEach((m, i) => {
    blip(ctx, {
      t: o.t + i * 0.045,
      dest,
      freq: midiToFreq(m),
      dur: 0.25,
      decay: 0.25,
      peak: 0.07,
      wave: "triangle",
    });
  });
  hiss(ctx, {
    t: o.t,
    dest,
    dur: 0.45,
    peak: 0.07,
    type: "highpass",
    from: 9000,
    to: 5000,
    attack: 0.05,
  });
};

const bolt: Renderer = (ctx, o) => {
  const dest = both(ctx, o);
  const zap = blip(ctx, {
    t: o.t,
    dest,
    freq: 900,
    to: 120,
    dur: 0.35,
    peak: 0.1,
    wave: "pulse25",
  });
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 600;
  lfoGain.connect(zap.frequency);
  osc(ctx, { type: "sawtooth", freq: 37, t: o.t, stop: o.t + 0.4, dest: lfoGain });
  hiss(ctx, { t: o.t, dest, dur: 0.3, peak: 0.2, type: "highpass", from: 3000, to: 1200 });
  blip(ctx, { t: o.t + 0.05, dest: o.dry, freq: 140, to: 40, dur: 0.3, peak: 0.3, decay: 0.25 });
};

const shadow: Renderer = (ctx, o) => {
  const dest = both(ctx, o);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 700;
  lp.connect(dest);
  for (const detune of [-25, 0, 30]) {
    const v = blip(ctx, {
      t: o.t,
      dest: lp,
      freq: 220,
      to: 55,
      dur: 0.7,
      peak: 0.08,
      wave: "sawtooth",
    });
    v.detune.value = detune;
  }
  hiss(ctx, {
    t: o.t,
    dest,
    dur: 0.7,
    peak: 0.08,
    type: "bandpass",
    from: 400,
    to: 150,
    q: 3,
    attack: 0.15,
  });
};

const levelup: Renderer = (ctx, o) => {
  arpeggio(ctx, {
    ...o,
    notes: "C5 E5 G5 C6 E6 G6",
    step: 0.07,
    peak: 0.1,
    wave: "pulse25",
    decay: 0.18,
  });
  const dest = both(ctx, o);
  const held = blip(ctx, {
    t: o.t + 0.42,
    dest,
    freq: 2093,
    dur: 0.6,
    peak: 0.09,
    wave: "pulse25",
    decay: 0.7,
  });
  const vib = ctx.createGain();
  vib.gain.value = 20;
  vib.connect(held.detune);
  osc(ctx, { freq: 6, t: o.t + 0.42, stop: o.t + 1.5, dest: vib });
};

const chest: Renderer = (ctx, o) => {
  blip(ctx, { t: o.t, dest: o.dry, freq: 300, to: 1200, dur: 0.15, peak: 0.06, wave: "pulse25" });
  arpeggio(ctx, {
    ...o,
    t: o.t + 0.15,
    notes: "G5 C6 E6 G6",
    step: 0.07,
    peak: 0.07,
    wave: "triangle",
    decay: 0.6,
  });
};

const door: Renderer = (ctx, o) => {
  const creak = blip(ctx, {
    t: o.t,
    dest: o.dry,
    freq: 85,
    to: 120,
    dur: 0.22,
    peak: 0.05,
    wave: "sawtooth",
  });
  const wob = ctx.createGain();
  wob.gain.value = 15;
  wob.connect(creak.frequency);
  osc(ctx, { freq: 23, t: o.t, stop: o.t + 0.3, dest: wob });
  hiss(ctx, {
    t: o.t + 0.2,
    dest: both(ctx, o),
    dur: 0.12,
    peak: 0.3,
    type: "lowpass",
    from: 500,
    to: 120,
  });
  blip(ctx, { t: o.t + 0.2, dest: o.dry, freq: 110, to: 50, dur: 0.15, peak: 0.3, decay: 0.12 });
};

const portal: Renderer = (ctx, o) => {
  const dest = both(ctx, o);
  for (const [freq, detune] of [
    [220, 0],
    [330, 9],
  ] as const) {
    const v = blip(ctx, {
      t: o.t,
      dest,
      freq,
      to: freq * 5,
      dur: 1.1,
      peak: 0.05,
      wave: "triangle",
    });
    v.detune.value = detune;
    const wobble = ctx.createGain();
    wobble.gain.value = 40;
    wobble.connect(v.detune);
    osc(ctx, { freq: 9, t: o.t, stop: o.t + 1.3, dest: wobble });
  }
  hiss(ctx, {
    t: o.t,
    dest,
    dur: 1.1,
    peak: 0.08,
    type: "bandpass",
    from: 300,
    to: 4000,
    q: 2,
    attack: 0.3,
  });
};

const save: Renderer = (ctx, o) => {
  arpeggio(ctx, {
    ...o,
    notes: "G5 B5 D6 G6 B6",
    step: 0.11,
    peak: 0.06,
    wave: "sine",
    decay: 0.9,
  });
};

const text: Renderer = (ctx, o) => {
  blip(ctx, { t: o.t, dest: o.dry, freq: 1175, dur: 0.018, peak: 0.035, wave: "pulse50" });
};

const run: Renderer = (ctx, o) => {
  const pan = ctx.createStereoPanner();
  pan.pan.setValueAtTime(-0.7, o.t);
  pan.pan.linearRampToValueAtTime(0.7, o.t + 0.5);
  pan.connect(o.dry);
  hiss(ctx, {
    t: o.t,
    dest: pan,
    dur: 0.5,
    peak: 0.3,
    type: "bandpass",
    from: 400,
    to: 2600,
    q: 1.5,
    attack: 0.12,
  });
  for (let i = 0; i < 4; i++) {
    blip(ctx, {
      t: o.t + i * 0.08,
      dest: o.dry,
      freq: 700 - i * 90,
      dur: 0.04,
      peak: 0.04,
      wave: "pulse25",
    });
  }
};

const buzz: Renderer = (ctx, o) => {
  for (const start of [0, 0.1]) {
    for (const freq of [110, 116]) {
      blip(ctx, { t: o.t + start, dest: o.dry, freq, dur: 0.08, peak: 0.07, wave: "pulse50" });
    }
  }
};

export const SFX_RENDERERS = {
  cursor,
  confirm,
  cancel,
  hit,
  crit,
  miss,
  heal,
  fire,
  ice,
  bolt,
  shadow,
  levelup,
  chest,
  door,
  portal,
  save,
  text,
  run,
  buzz,
} satisfies Record<string, Renderer>;
