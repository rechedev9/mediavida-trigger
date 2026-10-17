import { arp, bassLine, onceEvery, pad, shift, type TrackDef } from "../track-kit";

/** The main leitmotif in D major; `ending` reprises it over the same chords. */
export const TITLE_CHORDS = "D:1 Bm:1 G:1 A:1 D/F#:1 G:1 Em7:2 A7:2 D:1";

// The hook is the rising sixth answered by a stepwise fall, stated three times higher each time.
const THEME_HEAD = [
  "D5:8 A5:4. G5:8 F#5:8 E5:8 F#5:8",
  "D5:2. B4:8 C#5:8",
  "D5:8 B5:4. A5:8 G5:8 F#5:8 G5:8",
  "E5:2. r:8 A4:8",
  "F#5:8 D6:4. C#6:8 B5:8 A5:8 B5:8",
  "G5:4. A5:8 B5:4 D6:4",
].join(" | ");

export const TITLE_THEME = `${THEME_HEAD} | B5:4. A5:8 G5:4 C#5:4 | D5:2. r:4`;

const THEME_BIG = `${THEME_HEAD} | B5:4. A5:8 G5:4 E6:4 | D6:2. r:4`;

const COUNTER = [
  "F#4:2 A4:2",
  "F#4:2 D4:4 E4:4",
  "D4:2 G4:2",
  "C#4:2 E4:2",
  "D4:2 F#4:2",
  "G4:2 B4:2",
  "G4:2 A4:2",
  "F#4:2 E4:2",
].join(" | ");

const HARP = arp("1:8 5:8 8:8 10:8 12:8 10:8 8:8 5:8", "D3");

export const title: TrackDef = {
  bpm: 92,
  loop: true,
  loopFrom: 1,
  fadeIn: 1.5,
  room: 0.45,
  hall: 0.6,
  parts: {
    lead: { inst: "lead", vol: 0.95, pan: 0.05, send: 0.4 },
    violins: { inst: "strings", vol: 0.7, pan: -0.25, send: 0.45 },
    horn: { inst: "brass", vol: 0.6, pan: 0.25, send: 0.35 },
    flute: { inst: "flute", vol: 0.75, pan: -0.1, send: 0.5 },
    strings: { inst: "strings", vol: 0.75, pan: 0.15, send: 0.45 },
    choir: { inst: "choir", vol: 0.45, send: 0.6 },
    harp: { inst: "pluck", vol: 0.5, pan: 0.3, send: 0.4 },
    bass: { inst: "bass", vol: 0.8 },
    timp: { inst: "timpani", vol: 0.75, send: 0.4 },
    drums: { inst: "drums", vol: 0.55, send: 0.25 },
  },
  sections: {
    intro: {
      chords: "Bm:1 G:1 Em7:1 A:1",
      lines: {
        flute: "B4:8 F#5:4. E5:4 D5:4 | B4:8 G5:4. F#5:4 D5:4 | E5:2. D5:4 | C#5:1",
        strings: pad("F#3-D5"),
        harp: HARP,
        bass: bassLine("1:1", "E2"),
        timp: "r:1 | r:1 | r:1 | [A2:16?]x8 [A2:16]x4 [A2:16!]x4",
      },
    },
    A: {
      chords: TITLE_CHORDS,
      lines: {
        lead: TITLE_THEME,
        strings: pad("A3-F#5"),
        harp: HARP,
        bass: bassLine("1:4. 1:8 5:4 8:4", "D2"),
      },
      drums: {
        kick: "x.......x.......",
        snare: "....x.......x..-",
        hat: "-.-.-.-.-.-.-.-.",
        crash: onceEvery(8),
      },
    },
    B: {
      chords: "Bm:1 G:1 D:1 A/C#:1 Bm:1 Em:1 G:1 A7sus4:2 A7:2",
      lines: {
        lead: [
          "F#5:4. E5:8 D5:8 C#5:8 D5:8 F#5:8",
          "G5:2 D5:4 B4:4",
          "A5:4. G5:8 F#5:8 E5:8 F#5:8 A5:8",
          "E5:2. C#5:8 E5:8",
          "F#5:4. G5:8 A5:8 B5:8 A5:8 F#5:8",
          "G5:4. A5:8 B5:8 C#6:8 D6:8 E6:8",
          "D6:2 B5:4 G5:4",
          "A5:4 D5:4 C#5:4 E5:4",
        ].join(" | "),
        flute: "D5:1 | B4:1 | A4:1 | C#5:1 | D5:1 | E5:1 | D5:1 | D5:2 C#5:2",
        strings: pad("F#3-D5"),
        harp: arp("1:8 5:8 8:8 5:8", "D3"),
        bass: bassLine("1:2 5:2", "D2"),
        timp: "r:1 | r:1 | r:1 | r:1 | r:1 | r:1 | r:1 | A2:4 r:4 [A2:16]x8",
      },
      drums: {
        kick: "x.......x.......",
        snare: "............x...",
        hat: "-.-.-.-.-.-.-.-.",
      },
      fill: {
        kick: "x.......x.......",
        snare: "....x...x.x.xxxx",
      },
    },
    Abig: {
      chords: "D:1 Bm:1 G:1 A:1 D/F#:1 G:1 Em7:2 A7:2 D:2 A7:2",
      lines: {
        lead: THEME_BIG,
        violins: shift(THEME_BIG, -12),
        horn: COUNTER,
        strings: pad("A3-F#5"),
        choir: pad("D4-D5"),
        harp: HARP,
        bass: bassLine("1:4. 1:8 5:4 8:4", "D2"),
        timp: "D2:4 r:2. | r:1 | r:1 | A2:4 r:2. | D2:4 r:2. | r:1 | r:1 | [A2:16]x8 A2:4! r:4",
      },
      drums: {
        kick: "x.......x.......",
        snare: "....X.......X.--",
        hat: "x.x.x.x.x.x.x.x.",
        crash: onceEvery(4),
      },
    },
  },
  order: ["intro", "A", "B", "Abig"],
};
