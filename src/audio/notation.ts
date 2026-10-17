export const TICKS_PER_BEAT = 48;

export interface ParsedNote {
  tick: number;
  ticks: number;
  midi: number;
  vel: number;
}

interface ParsedLine {
  notes: ParsedNote[];
  ticks: number;
}

interface Chord {
  root: number;
  bass: number;
  intervals: readonly number[];
}

interface ChordSpan {
  tick: number;
  ticks: number;
  chord: Chord;
}

interface PatternStep {
  tick: number;
  ticks: number;
  heads: string[];
  vel: number;
}

const LETTERS: Readonly<Record<string, number>> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const QUALITIES: Readonly<Record<string, readonly number[]>> = {
  "": [0, 4, 7],
  m: [0, 3, 7],
  "5": [0, 7],
  "6": [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  "7": [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  m7b5: [0, 3, 6, 10],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  "7sus4": [0, 5, 7, 10],
  add9: [0, 4, 7, 14],
  madd9: [0, 3, 7, 14],
  "9": [0, 4, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14],
  m9: [0, 3, 7, 10, 14],
};

const VEL_DEFAULT = 0.8;
const VEL_ACCENT = 1;
const VEL_SOFT = 0.55;

const TOKEN_RE = /^([^:!?]+)(?::([0-9.t+]+))?([!?])?$/;

function parsePitchClass(name: string): number {
  const m = /^([A-G])(#|b)?$/.exec(name);
  const base = LETTERS[m?.[1] ?? ""];
  if (base === undefined) throw new Error(`Bad pitch class "${name}"`);
  const acc = m?.[2] === "#" ? 1 : m?.[2] === "b" ? -1 : 0;
  return (base + acc + 12) % 12;
}

export function noteToMidi(name: string): number {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  const base = LETTERS[m?.[1] ?? ""];
  if (!m || base === undefined) throw new Error(`Bad note "${name}"`);
  const acc = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
  return (Number(m[3]) + 1) * 12 + base + acc;
}

export function durationTicks(src: string): number {
  let total = 0;
  for (const part of src.split("+")) {
    const m = /^(1|2|4|8|16|32)(\.?)(t?)$/.exec(part);
    if (!m) throw new Error(`Bad duration "${src}"`);
    let ticks = (TICKS_PER_BEAT * 4) / Number(m[1]);
    if (m[2] === ".") ticks *= 1.5;
    if (m[3] === "t") ticks = (ticks * 2) / 3;
    if (!Number.isInteger(ticks)) throw new Error(`Duration "${src}" is too fine`);
    total += ticks;
  }
  return total;
}

export function expandTokens(src: string): string[] {
  const stack: string[][] = [[]];
  const spaced = src.replaceAll("[", " [ ").replace(/\](x\d+)?/g, " ]$1 ");
  for (const tok of spaced.split(/\s+/)) {
    if (tok === "") continue;
    if (tok === "[") {
      stack.push([]);
      continue;
    }
    const close = /^\](?:x(\d+))?$/.exec(tok);
    if (close) {
      const inner = stack.pop();
      const outer = stack.at(-1);
      if (!inner || !outer) throw new Error("Unbalanced ]");
      const times = close[1] === undefined ? 1 : Number(close[1]);
      for (let i = 0; i < times; i++) outer.push(...inner);
      continue;
    }
    stack.at(-1)?.push(tok);
  }
  const root = stack[0];
  if (stack.length !== 1 || !root) throw new Error("Unclosed [");
  return root;
}

function velocityOf(mark: string | undefined): number {
  if (mark === "!") return VEL_ACCENT;
  if (mark === "?") return VEL_SOFT;
  return VEL_DEFAULT;
}

function parsePattern(src: string, beatsPerBar = 4): { steps: PatternStep[]; ticks: number } {
  const barTicks = beatsPerBar * TICKS_PER_BEAT;
  const steps: PatternStep[] = [];
  let tick = 0;
  let dur = TICKS_PER_BEAT;
  for (const tok of expandTokens(src)) {
    if (tok === "|") {
      if (tick % barTicks !== 0) {
        throw new Error(`Bar line at beat ${tick / TICKS_PER_BEAT} is not on a bar boundary`);
      }
      continue;
    }
    const m = TOKEN_RE.exec(tok);
    if (!m) throw new Error(`Bad token "${tok}"`);
    if (m[2] !== undefined) dur = durationTicks(m[2]);
    const head = m[1] ?? "";
    if (head !== "r")
      steps.push({ tick, ticks: dur, heads: head.split(","), vel: velocityOf(m[3]) });
    tick += dur;
  }
  return { steps, ticks: tick };
}

export function parseLine(src: string, beatsPerBar = 4): ParsedLine {
  const { steps, ticks } = parsePattern(src, beatsPerBar);
  const notes = steps.flatMap((s) =>
    s.heads.map((h) => ({ tick: s.tick, ticks: s.ticks, midi: noteToMidi(h), vel: s.vel })),
  );
  return { notes, ticks };
}

export function parseChord(symbol: string): Chord {
  const m = /^([A-G](?:#|b)?)([a-z0-9]*)(?:\/([A-G](?:#|b)?))?$/.exec(symbol);
  const intervals = QUALITIES[m?.[2] ?? "?"];
  if (!m || !intervals) throw new Error(`Bad chord "${symbol}"`);
  const root = parsePitchClass(m[1] ?? "");
  const bass = m[3] === undefined ? root : parsePitchClass(m[3]);
  return { root, bass, intervals };
}

export function parseChordLine(
  src: string,
  beatsPerBar = 4,
): { spans: ChordSpan[]; ticks: number } {
  const barTicks = beatsPerBar * TICKS_PER_BEAT;
  const spans: ChordSpan[] = [];
  let tick = 0;
  for (const tok of expandTokens(src)) {
    if (tok === "|") continue;
    const [symbol = "", dur] = tok.split(":");
    const ticks = dur === undefined ? barTicks : durationTicks(dur);
    spans.push({ tick, ticks, chord: parseChord(symbol) });
    tick += ticks;
  }
  return { spans, ticks: tick };
}

function findInterval(chord: Chord, wanted: readonly number[], fallback: number): number {
  return chord.intervals.find((i) => wanted.includes(i)) ?? fallback;
}

export function degreeInterval(chord: Chord, degree: string): number {
  const third = findInterval(chord, [3, 4], findInterval(chord, [2, 5], 7));
  const fifth = findInterval(chord, [7, 6, 8], 7);
  const seventh = findInterval(chord, [10, 11, 9], 10);
  const table: Readonly<Record<string, number>> = {
    "1": 0,
    "2": 2,
    "3": third,
    "5": fifth,
    "6": 9,
    "7": seventh,
    "8": 12,
    "9": 14,
    "10": third + 12,
    "12": fifth + 12,
    "-3": third - 12,
    "-5": fifth - 12,
    "-7": seventh - 12,
  };
  const value = table[degree];
  if (value === undefined) throw new Error(`Bad degree "${degree}"`);
  return value;
}

function placeAbove(pitchClass: number, low: number): number {
  return low + ((pitchClass - low + 120) % 12);
}

interface PatternOptions {
  spans: readonly ChordSpan[];
  pattern: string;
  low: number;
  slash: boolean;
}

/** Restarts the degree pattern on every chord and cuts it at the chord's end. */
export function expandPattern(opts: PatternOptions): ParsedNote[] {
  const { steps, ticks } = parsePattern(opts.pattern);
  if (ticks === 0) throw new Error("Empty pattern");
  const out: ParsedNote[] = [];
  for (const span of opts.spans) {
    const rootMidi = placeAbove(span.chord.root, opts.low);
    const bassMidi = placeAbove(span.chord.bass, opts.low);
    for (let base = 0; base < span.ticks; base += ticks) {
      for (const step of steps) {
        const start = base + step.tick;
        if (start >= span.ticks) break;
        const len = Math.min(step.ticks, span.ticks - start);
        for (const head of step.heads) {
          const midi =
            opts.slash && head === "1" ? bassMidi : rootMidi + degreeInterval(span.chord, head);
          out.push({ tick: span.tick + start, ticks: len, midi, vel: step.vel });
        }
      }
    }
  }
  return out;
}

interface VoicingOptions {
  chord: Chord;
  low: number;
  high: number;
  prev: readonly number[] | null;
}

function padPitchClasses(chord: Chord): number[] {
  const ivs = chord.intervals.length > 4 ? chord.intervals.filter((i) => i !== 7) : chord.intervals;
  return [...new Set(ivs.map((i) => (chord.root + i) % 12))];
}

function voicingCost(cand: readonly number[], prev: readonly number[] | null, center: number) {
  const mean = cand.reduce((a, b) => a + b, 0) / cand.length;
  if (!prev || prev.length === 0) return Math.abs(mean - center);
  if (prev.length !== cand.length) {
    const prevMean = prev.reduce((a, b) => a + b, 0) / prev.length;
    return Math.abs(mean - prevMean) * cand.length;
  }
  return cand.reduce((sum, n, i) => sum + Math.abs(n - (prev[i] ?? n)), 0);
}

/** Close voicing inside [low, high] that moves the least from the previous chord. */
export function voiceChord(opts: VoicingOptions): number[] {
  const pcs = padPitchClasses(opts.chord);
  let best: number[] = [];
  let bestCost = Infinity;
  for (let r = 0; r < pcs.length; r++) {
    const order = [...pcs.slice(r), ...pcs.slice(0, r)];
    for (let start = placeAbove(order[0] ?? 0, opts.low); start <= opts.high; start += 12) {
      const cand: number[] = [];
      for (const pc of order) {
        const last = cand.at(-1);
        cand.push(last === undefined ? start : placeAbove(pc, last + 1));
      }
      if ((cand.at(-1) ?? Infinity) > opts.high) continue;
      const cost = voicingCost(cand, opts.prev, (opts.low + opts.high) / 2);
      if (cost < bestCost) {
        bestCost = cost;
        best = cand;
      }
    }
  }
  if (best.length === 0) throw new Error("Voicing range is too narrow");
  return best;
}

interface PadOptions {
  spans: readonly ChordSpan[];
  rhythm: string;
  low: number;
  high: number;
}

/** Empty rhythm holds each chord; otherwise "x" tokens strike it, restarting on every chord. */
export function expandPad(opts: PadOptions): ParsedNote[] {
  const out: ParsedNote[] = [];
  let prev: number[] | null = null;
  const rhythm = opts.rhythm === "" ? null : parsePattern(opts.rhythm);
  for (const span of opts.spans) {
    const voicing = voiceChord({ chord: span.chord, low: opts.low, high: opts.high, prev });
    prev = voicing;
    const hits = rhythm
      ? rhythm.steps.map((s) => ({ ...s, period: rhythm.ticks }))
      : [{ tick: 0, ticks: span.ticks, vel: VEL_DEFAULT, period: span.ticks }];
    for (const hit of hits) {
      for (let base = 0; base + hit.tick < span.ticks; base += hit.period) {
        const start = base + hit.tick;
        const len = Math.min(hit.ticks, span.ticks - start);
        for (const midi of voicing)
          out.push({ tick: span.tick + start, ticks: len, midi, vel: hit.vel });
      }
    }
  }
  return out.toSorted((a, b) => a.tick - b.tick);
}

const DRUM_VEL: Readonly<Record<string, number | null>> = { X: 1, x: 0.75, "-": 0.4, ".": null };

export function parseDrumLane(src: string): (number | null)[] {
  return src
    .replace(/[\s|]/g, "")
    .split("")
    .map((ch) => {
      const vel = DRUM_VEL[ch];
      if (vel === undefined) throw new Error(`Bad drum step "${ch}"`);
      return vel;
    });
}

/** Moves off-beat eighths later by `amount` beats, keeping every downbeat in place. */
export function swingBeat(beat: number, amount: number): number {
  if (amount === 0) return beat;
  const whole = Math.floor(beat);
  const frac = beat - whole;
  const mid = 0.5 + amount;
  if (frac <= 0.5) return whole + (frac / 0.5) * mid;
  return whole + mid + ((frac - 0.5) / 0.5) * (1 - mid);
}

export function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}
