import { bassLine, onceEvery, pad, shift, type TrackDef } from "../track-kit";

const SOAR = [
  "G5:2. E5:8 G5:8",
  "A5:2. F#5:8 A5:8",
  "B5:4. A5:8 F#5:4 D5:4",
  "E5:2. B4:8 E5:8",
  "C6:2. B5:8 A5:8",
  "D6:4. C6:8 A5:4 F#5:4",
  "E5:4 G5:4 C6:4 E6:4",
  "D#6:2. r:4",
].join(" | ");
const STABS = pad("G3-D5", "x:8 r:4 x:8 r:2");
const DRIVE = bassLine("1:8 1:8 8:8 1:8 1:8 8:8 1:8 8:8", "B1");

export const battle: TrackDef = {
  bpm: 160,
  loop: true,
  fadeIn: 0.05,
  room: 0.35,
  hall: 0.12,
  parts: {
    lead: { inst: "lead", vol: 0.85, send: 0.3 },
    brass: { inst: "brass", vol: 0.6, pan: -0.25, send: 0.25 },
    strings: { inst: "strings", vol: 0.5, pan: 0.25, send: 0.35 },
    bass: { inst: "synthBass", vol: 0.85, send: 0.05 },
    drums: { inst: "drums", vol: 0.8, send: 0.12 },
  },
  sections: {
    A: {
      chords: "Em:1 C:1 D:1 B7:1 Em:1 C:1 Am:1 B7:1",
      lines: {
        lead: [
          "E5:8 E5:8 B5:4 A5:8 G5:8 F#5:8 G5:8",
          "E5:2 r:8 G5:8 E5:8 C5:8",
          "D5:8 D5:8 A5:4 G5:8 F#5:8 E5:8 F#5:8",
          "D#5:2. B4:8 D#5:8",
          "E5:8 E5:8 B5:4 C6:8 B5:8 A5:8 B5:8",
          "G5:4. E5:8 C6:4 E6:4",
          "E6:8 D6:8 C6:8 B5:8 A5:8 C6:8 E6:4",
          "D#6:4. B5:8 F#5:4 A5:4",
        ].join(" | "),
        brass: STABS,
        bass: DRIVE,
      },
      drums: {
        kick: "x.....x.x.....x.",
        snare: "....X.......X...",
        hat: "x-x-x-x-x-x-x-x-",
        crash: onceEvery(8),
      },
      fill: {
        kick: "x.....x.x.......",
        snare: "....X...x.x.XxXx",
        tomHi: "........x.x.....",
      },
    },
    B: {
      chords: "C:1 D:1 Bm:1 Em:1 Am:1 D:1 C:1 B7:1",
      lines: {
        lead: SOAR,
        strings: pad("G3-E5"),
        brass: shift(SOAR, -12),
        bass: DRIVE,
      },
      drums: {
        kick: "x...x...x...x...",
        snare: "....X.......X...",
        hat: "x.x.x.x.x.x.x.x.",
        open: "..x...x...x...x.",
      },
    },
    C: {
      chords: "Am:1 Em:1 Am:1 B7:1 C:1 D:1 C:2 D:2 B7:1",
      lines: {
        lead: [
          "A4:8 A4:8 C5:8 E5:8 A5:8 E5:8 C5:8 E5:8",
          "B4:8 B4:8 E5:8 G5:8 B5:8 G5:8 E5:8 G5:8",
          "C5:8 E5:8 A5:8 C6:8 E6:8 C6:8 A5:8 E5:8",
          "D#5:8 F#5:8 A5:8 B5:8 D#6:8 B5:8 A5:8 F#5:8",
          "E5:4. G5:8 C6:4 E6:4",
          "F#6:4. E6:8 D6:4 A5:4",
          "G5:8 E5:8 C5:8 E5:8 F#5:8 A5:8 D6:8 F#6:8",
          "D#6:2 B5:4 r:4",
        ].join(" | "),
        strings: pad("A3-F#5"),
        bass: bassLine("1:8 1:8 1:8 1:8 1:8 1:8 8:8 5:8", "B1"),
      },
      drums: {
        kick: "x.x...x.x.x...x.",
        snare: "....X.......X.-.",
        hat: "x-x-x-x-x-x-x-x-",
      },
      fill: {
        kick: "x...x...x.......",
        snare: "x.x.x.x.XxXxXXXX",
        crash: "..............X.",
      },
    },
  },
  order: ["A", "B", "A", "C"],
};
