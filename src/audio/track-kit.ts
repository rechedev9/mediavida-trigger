export type InstrumentId =
  | "lead"
  | "chip"
  | "strings"
  | "organ"
  | "bass"
  | "synthBass"
  | "musicBox"
  | "bell"
  | "epiano"
  | "brass"
  | "flute"
  | "pluck"
  | "timpani"
  | "choir";

export type DrumId =
  | "kick"
  | "snare"
  | "hat"
  | "open"
  | "tomHi"
  | "tomLo"
  | "crash"
  | "shaker"
  | "clap";

interface PartDef {
  inst: InstrumentId | "drums";
  vol: number;
  pan?: number;
  send?: number;
}

export type DrumLanes = Partial<Record<DrumId, string>>;

interface ArpGen {
  kind: "arp";
  pattern: string;
  low: string;
  slash: boolean;
}

interface PadGen {
  kind: "pad";
  rhythm: string;
  low: string;
  high: string;
}

interface ShiftedLine {
  kind: "shift";
  src: string;
  semitones: number;
}

export type Line = string | ArpGen | PadGen | ShiftedLine;

export interface SectionDef {
  chords: string;
  lines: Record<string, Line>;
  drums?: DrumLanes;
  /** Replaces every drum lane in the last bar of the section. */
  fill?: DrumLanes;
}

export interface TrackDef {
  bpm: number;
  beatsPerBar?: number;
  swing?: number;
  loop: boolean;
  /** Index in `order` where the loop restarts; earlier sections play once. */
  loopFrom?: number;
  fadeIn: number;
  /** Track level trim, 1 by default. */
  gain?: number;
  room: number;
  hall: number;
  delay?: { beats: number; feedback: number; mix: number };
  parts: Record<string, PartDef>;
  sections: Record<string, SectionDef>;
  order: string[];
}

/** Chord-tone pattern ("1:8 5:8 8:8") placed with each chord root in [low, low + 11]. */
export function arp(pattern: string, low: string): ArpGen {
  return { kind: "arp", pattern, low, slash: false };
}

/** Like `arp`, but degree 1 plays the slash bass of chords such as "C/E". */
export function bassLine(pattern: string, low: string): ArpGen {
  return { kind: "arp", pattern, low, slash: true };
}

/** Chords voiced inside a range like "G3-E5", held or struck with "x:8 r:8" style rhythm. */
export function pad(range: string, rhythm = ""): PadGen {
  const [low = "", high = ""] = range.split("-");
  return { kind: "pad", rhythm, low, high };
}

export function shift(src: string, semitones: number): ShiftedLine {
  return { kind: "shift", src, semitones };
}

/** A drum lane with one hit at the start and silence for the rest of `bars` bars of 4/4. */
export function onceEvery(bars: number, hit = "X"): string {
  return hit + ".".repeat(bars * 16 - 1);
}
