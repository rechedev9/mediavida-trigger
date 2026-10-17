import { arp, bassLine, onceEvery, pad, shift, type TrackDef } from "../track-kit";

const PUMP = bassLine("1:8 1:8 8:8 1:8 1:8 8:8 1:8 5:8", "C2");
const TIMP = arp("1:4! r:4 1:8 1:8 r:4", "G1");
const B_SOAR = [
  "Eb6:2 C6:4 Ab5:4",
  "D6:2 Bb5:4 F5:4",
  "G5:4. Bb5:8 Eb6:2",
  "C6:2 G5:4 Eb5:4",
  "Ab5:4. C6:8 Eb6:4 C6:4",
  "Bb5:4. D6:8 F6:4 D6:4",
  "F6:4 Db6:4 Ab5:4 F5:4",
  "D6:4 B5:4 G5:4 F5:4",
].join(" | ");
const C_RIFF = [
  "C5:8 C5:8 G4:8 C5:8 Eb5:8 C5:8 G4:8 Bb4:8",
  "C5:8 C5:8 G4:8 C5:8 Eb5:8 F5:8 G5:4",
  "C5:8 C5:8 Ab4:8 C5:8 Eb5:8 C5:8 Ab4:8 C5:8",
  "Eb5:8 Eb5:8 C5:8 Eb5:8 Ab5:4 C6:4",
  "F5:8 F5:8 C5:8 F5:8 Ab5:8 F5:8 C5:8 F5:8",
  "Ab5:8 Ab5:8 F5:8 Ab5:8 C6:4 Ab5:4",
  "G5:8 G5:8 D5:8 G5:8 B5:8 G5:8 D5:8 G5:8",
  "D6:8 B5:8 G5:8 F5:8 D5:8 B4:8 G4:8 B4:8",
].join(" | ");

export const boss: TrackDef = {
  bpm: 168,
  loop: true,
  fadeIn: 0.05,
  room: 0.35,
  hall: 0.2,
  parts: {
    lead: { inst: "lead", vol: 0.8, pan: 0.1, send: 0.3 },
    brass: { inst: "brass", vol: 0.7, pan: -0.2, send: 0.25 },
    organ: { inst: "organ", vol: 0.45, pan: 0.25, send: 0.3 },
    bass: { inst: "synthBass", vol: 0.9, send: 0.05 },
    timp: { inst: "timpani", vol: 0.6, send: 0.3 },
    drums: { inst: "drums", vol: 0.85, send: 0.12 },
  },
  sections: {
    A: {
      chords: "Cm:1 Ab:1 Bb:1 G:1 Cm:1 Ab:1 Fm:2 G7:2 G7:1",
      lines: {
        lead: [
          "G5:8 G5:8 C6:4 Bb5:8 G5:8 Eb5:4",
          "Ab5:8 Ab5:8 Eb6:4 C6:8 Ab5:8 Eb5:4",
          "Bb5:8 Bb5:8 F6:4 D6:8 Bb5:8 F5:4",
          "B5:4. C6:8 D6:2",
          "G5:8 G5:8 C6:4 Eb6:8 D6:8 C6:4",
          "Eb6:4. D6:8 C6:4 Ab5:4",
          "F5:8 Ab5:8 C6:4 D6:8 F6:8 D6:4",
          "B5:4 G5:4 D5:4 B4:4",
        ].join(" | "),
        brass: pad("C4-Bb5", "x:8 r:8 r:4 x:8 r:8 r:4"),
        organ: pad("G3-Eb5"),
        bass: PUMP,
        timp: TIMP,
      },
      drums: {
        kick: "x.x...x.x.x...x.",
        snare: "....X.......X...",
        hat: "x-x-x-x-x-x-x-x-",
        crash: onceEvery(4),
      },
    },
    B: {
      chords: "Ab:1 Bb:1 Eb:1 Cm:1 Ab:1 Bb:1 Db:1 G7:1",
      lines: {
        lead: B_SOAR,
        brass: shift(B_SOAR, -12),
        organ: pad("G3-Eb5", "x:4 x:4 x:4 x:8 x:8"),
        bass: PUMP,
        timp: TIMP,
      },
      drums: {
        kick: "x...x...x...x...",
        snare: "....X.......X..x",
        open: "..x...x...x...x.",
      },
    },
    C: {
      chords: "Cm:1 Cm:1 Ab:1 Ab:1 Fm:1 Fm:1 G:1 G7:1",
      lines: {
        lead: C_RIFF,
        brass: shift(C_RIFF, -12),
        organ: pad("G3-Eb5"),
        bass: bassLine("1:8 1:8 1:8 1:8 8:8 1:8 5:8 8:8", "C2"),
        timp: arp("1:4! r:2.", "G1"),
      },
      drums: {
        kick: "x.x.x.x.x.x.x.x.",
        snare: "....X.......X...",
        hat: "x-x-x-x-x-x-x-x-",
      },
      fill: {
        kick: "x...x...........",
        snare: "X.X.X.X.XXXXXXXX",
        tomLo: "x...x...........",
      },
    },
  },
  order: ["A", "B", "C"],
};
