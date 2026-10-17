import { arp, bassLine, onceEvery, pad, shift, type TrackDef } from "../track-kit";

const DRIVE = bassLine("1:8 1:8 8:8 1:8 5:8 1:8 8:8 1:8", "D2");
const TIMP = arp("1:4! r:4 r:4 1:8 1:8", "G1");
const CLIMAX = [
  "D6:2 Bb5:4 G5:4",
  "Eb6:2 Bb5:4 G5:4",
  "F6:2 D6:4 Bb5:4",
  "C6:2. A5:4",
  "G5:4 C6:4 Eb6:4 G6:4",
  "D6:2. Bb5:4",
  "Bb5:4 G5:4 A5:4 C6:4",
  "D6:4 C6:4 A5:4 F#5:4",
].join(" | ");

export const finalBoss: TrackDef = {
  bpm: 140,
  loop: true,
  loopFrom: 1,
  fadeIn: 0.05,
  room: 0.3,
  hall: 0.6,
  parts: {
    lead: { inst: "organ", vol: 1, pan: 0.05, send: 0.4 },
    organ: { inst: "organ", vol: 0.5, pan: -0.2, send: 0.4 },
    choir: { inst: "choir", vol: 0.55, pan: 0.2, send: 0.6 },
    brass: { inst: "brass", vol: 0.55, pan: -0.25, send: 0.3 },
    bass: { inst: "synthBass", vol: 0.85, send: 0.05 },
    timp: { inst: "timpani", vol: 0.7, send: 0.4 },
    drums: { inst: "drums", vol: 0.8, send: 0.15 },
  },
  sections: {
    intro: {
      chords: "Gm:1 Eb:1 Cm:1 D:1",
      lines: {
        lead: "D5:2 G5:2 | Bb5:2 G5:2 | Eb6:2 C6:2 | A5:2 F#5:2",
        organ: pad("G3-D5"),
        choir: pad("G3-D5"),
        timp: "G1:4! r:2. | Eb2:4 r:2. | C2:4 r:2. | [D2:16]x12 D2:4!",
      },
    },
    A: {
      chords: "Gm:1 F:1 Eb:1 D:1 Gm:1 Bb:1 Cm:2 D:2 Gm:1",
      lines: {
        // The main leitmotif, bent into G minor: Lagvos has corrupted the forum's own theme.
        lead: [
          "G5:8 D6:4. C6:8 Bb5:8 A5:8 Bb5:8",
          "A5:2. C5:8 F5:8",
          "G5:8 Eb6:4. D6:8 C6:8 Bb5:8 C6:8",
          "A5:2. r:8 D5:8",
          "Bb5:8 G6:4. F6:8 Eb6:8 D6:8 Eb6:8",
          "D6:4. Eb6:8 F6:4 Bb5:4",
          "Eb6:4. D6:8 C6:4 F#5:4",
          "G5:2. r:4",
        ].join(" | "),
        organ: pad("G3-D5"),
        choir: pad("G3-D5"),
        bass: DRIVE,
        timp: TIMP,
      },
      drums: {
        kick: "x.......x.x.....",
        snare: "....X.......X...",
        hat: "x.x.x.x.x.x.x.x.",
        crash: onceEvery(8),
      },
    },
    B: {
      chords: "Eb:1 F:1 Dm:1 Gm:1 Cm:1 F:1 Bb:2 Eb:2 D7:1",
      lines: {
        lead: [
          "G5:8 Bb5:8 Eb6:8 F6:8 G6:4 Eb6:4",
          "F6:4. Eb6:8 C6:4 A5:4",
          "D6:8 C6:8 A5:8 F5:8 D5:4 F5:4",
          "G5:4 Bb5:4 D6:2",
          "Eb6:4. D6:8 C6:4 G5:4",
          "A5:4. Bb5:8 C6:4 F6:4",
          "D6:4 F6:4 Eb6:4 G5:4",
          "F#5:4 A5:4 D6:4 C6:4",
        ].join(" | "),
        organ: pad("G3-D5", "x:4. x:8 x:4 x:4"),
        choir: pad("A3-A4"),
        bass: DRIVE,
        timp: TIMP,
      },
      drums: {
        kick: "x...x...x...x...",
        snare: "....X.......X...",
        open: "..-...-...-...-.",
      },
    },
    C: {
      chords: "Gm:1 Eb:1 Bb:1 F:1 Cm:1 Gm/D:1 Eb:2 F:2 D7:1",
      lines: {
        lead: CLIMAX,
        brass: shift(CLIMAX, -12),
        organ: pad("G3-D5"),
        choir: pad("A3-A4"),
        bass: DRIVE,
        timp: TIMP,
      },
      drums: {
        kick: "x.x.x.x.x.x.x.x.",
        snare: "....X.......X...",
        hat: "x-x-x-x-x-x-x-x-",
        crash: onceEvery(4),
      },
      fill: {
        kick: "x.......x.......",
        snare: "X...X...X.X.XXXX",
        tomLo: "..x...x.........",
      },
    },
  },
  order: ["intro", "A", "B", "C"],
};
