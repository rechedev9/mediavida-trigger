import { bassLine, onceEvery, pad, type TrackDef } from "../track-kit";

const OOM = bassLine("1:4 r:8 5:8 8:4 5:4", "C2");
const PAH = pad("A3-C5", "r:4 x:8 r:8 r:4 x:8 r:8");

// Town tune: the leitmotif's rising sixth, made bouncy.
const HOOK = [
  "C5:8 A5:4 G5:8 F5:8 G5:8 A5:4",
  "G5:4. E5:8 C5:2",
  "A4:8 F5:4 E5:8 D5:8 E5:8 F5:4",
  "D5:4. C5:8 Bb4:2",
  "C5:8 A5:4 Bb5:8 C6:8 Bb5:8 A5:4",
  "D6:4. C6:8 Bb5:4 F5:4",
  "G5:8 B5:8 D6:4 B5:8 G5:8 F5:4",
  "E5:4 G5:4 C6:4 Bb5:4",
].join(" | ");

const A_CHORDS = "F:1 C/E:1 Dm:1 Bb:1 F/A:1 Bb:1 G7:1 C7:1";

export const plaza: TrackDef = {
  bpm: 126,
  loop: true,
  fadeIn: 0.3,
  room: 0.5,
  hall: 0.15,
  parts: {
    lead: { inst: "lead", vol: 0.85, pan: 0.1, send: 0.3 },
    flute: { inst: "flute", vol: 0.85, pan: -0.1, send: 0.35 },
    calliope: { inst: "organ", vol: 0.45, pan: -0.25, send: 0.2 },
    bells: { inst: "bell", vol: 0.35, pan: 0.3, send: 0.4 },
    strings: { inst: "strings", vol: 0.55, pan: 0.2, send: 0.3 },
    bass: { inst: "bass", vol: 0.85, send: 0.1 },
    drums: { inst: "drums", vol: 0.65, send: 0.15 },
  },
  sections: {
    A: {
      chords: A_CHORDS,
      lines: {
        lead: HOOK,
        calliope: PAH,
        bass: OOM,
      },
      drums: {
        kick: "X.......x.......",
        snare: "....x.......x...",
        shaker: "x-x-x-x-x-x-x-x-",
        crash: onceEvery(8),
      },
    },
    B: {
      chords: "Bb:1 F/A:1 Gm:1 Dm:1 Eb:1 Bb/D:1 Cm7:1 C7:1",
      lines: {
        flute: [
          "D5:4. Eb5:8 F5:4 Bb5:4",
          "A5:2 G5:4 F5:4",
          "G5:4. A5:8 Bb5:4 D6:4",
          "A5:2. r:4",
          "G5:4. F5:8 Eb5:4 Bb4:4",
          "F5:4. Eb5:8 D5:4 F5:4",
          "Eb5:4 D5:8 C5:8 Bb4:4 G5:4",
          "E5:2 G5:4 Bb5:4",
        ].join(" | "),
        bells: "F5:1 | C5:1 | D5:1 | F5:1 | G5:1 | F5:1 | Eb5:1 | E5:1",
        strings: pad("F3-D5"),
        calliope: PAH,
        bass: bassLine("1:4 r:4 5:4 r:4", "C2"),
      },
      drums: {
        kick: "x.......x.......",
        snare: "....x.......x...",
        shaker: "-.-.-.-.-.-.-.-.",
      },
      fill: {
        kick: "x.......x.......",
        snare: "....x...x.x.xxxx",
      },
    },
    Afull: {
      chords: A_CHORDS,
      lines: {
        lead: HOOK,
        flute:
          "A4:2 C5:2 | G4:2 C5:2 | F4:2 A4:2 | F4:2 D4:2 | F4:2 C5:2 | D5:2 F5:2 | D5:2 B4:2 | C5:2 E5:2",
        strings: pad("F3-D5"),
        calliope: PAH,
        bass: OOM,
      },
      drums: {
        kick: "X.......x.x.....",
        snare: "....x.......x.-.",
        shaker: "x-x-x-x-x-x-x-x-",
        crash: onceEvery(8),
      },
      fill: {
        kick: "x.......x.......",
        snare: "....x...xxx.x.xx",
      },
    },
  },
  order: ["A", "B", "Afull"],
};
