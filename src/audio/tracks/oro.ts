import { bassLine, pad, shift, type TrackDef } from "../track-kit";

// Golden-age hook: one lazy rhythm cell, stated on Eb, then a fifth and an octave higher.
const HOOK = [
  "Bb4:8 Eb5:8 G5:4. F5:8 Eb5:4",
  "G5:8 Bb5:8 Eb6:4. D6:8 C6:4",
  "Ab5:8 C6:8 F6:4. Eb6:8 C6:4",
  "D6:2 Bb5:4 Ab5:4",
  "Bb4:8 D5:8 G5:4. F5:8 D5:4",
  "E5:8 G5:8 Bb5:4. A5:8 G5:4",
  "Ab5:4 C6:4 D6:4 F6:4",
  "Eb6:2. r:4",
].join(" | ");
const A_CHORDS = "Ebmaj7:1 Cm7:1 Fm7:1 Bb7:1 Gm7:1 C7:1 Fm7:2 Bb7:2 Ebmaj7:1";
const COMP = pad("Bb3-C5", "x:4. x:8 r:2");
const WALK = bassLine("1:4 3:4 5:4 3:4", "Eb2");
const BRUSHES = {
  kick: "x.........-.....",
  snare: "....-.......-...",
  hat: "x...x.-.x...x.-.",
};

export const oro: TrackDef = {
  bpm: 104,
  swing: 0.12,
  loop: true,
  fadeIn: 0.6,
  room: 0.55,
  hall: 0.15,
  parts: {
    lead: { inst: "flute", vol: 0.8, pan: -0.15, send: 0.35 },
    solo: { inst: "epiano", vol: 0.8, pan: 0.1, send: 0.3 },
    horn: { inst: "brass", vol: 0.45, pan: 0.2, send: 0.35 },
    keys: { inst: "epiano", vol: 0.55, pan: 0.25, send: 0.25 },
    strings: { inst: "strings", vol: 0.45, pan: -0.25, send: 0.4 },
    bass: { inst: "bass", vol: 0.8, send: 0.1 },
    drums: { inst: "drums", vol: 0.55, send: 0.2 },
  },
  sections: {
    A: {
      chords: A_CHORDS,
      lines: {
        lead: HOOK,
        keys: COMP,
        bass: WALK,
      },
      drums: BRUSHES,
    },
    A2: {
      chords: A_CHORDS,
      lines: {
        lead: HOOK,
        horn: shift(HOOK, -12),
        keys: COMP,
        strings: pad("G3-Eb5"),
        bass: WALK,
      },
      drums: { ...BRUSHES, kick: "x.......x.-....." },
    },
    B: {
      chords: "Abmaj7:1 Gm7:1 Fm7:1 Ebmaj7:1 Abmaj7:1 Gm7:2 C7:2 Fm7:1 Bb7:1",
      lines: {
        lead: [
          "C6:4. Bb5:8 Ab5:8 G5:8 Eb5:4",
          "D6:4. C6:8 Bb5:8 G5:8 D5:4",
          "Ab5:4 C6:4 Eb6:4. D6:8",
          "D6:2 Bb5:2",
          "Eb6:4. C6:8 Ab5:8 G5:8 Eb5:4",
          "F5:4 D5:4 E5:4 G5:4",
          "Ab5:4. G5:8 F5:8 Eb5:8 C5:4",
          "D5:4 F5:4 Ab5:4 Bb5:4",
        ].join(" | "),
        keys: COMP,
        strings: pad("G3-Eb5"),
        bass: WALK,
      },
      drums: BRUSHES,
    },
    C: {
      chords: A_CHORDS,
      lines: {
        solo: [
          "Bb5:8 G5:8 F5:8 G5:8 D6:8 Bb5:8 G5:4",
          "Eb6:8 D6:8 C6:8 Bb5:8 G5:4 Eb5:4",
          "F5:8 Ab5:8 C6:8 Eb6:8 F6:4 Eb6:4",
          "D6:8 C6:8 Bb5:8 Ab5:8 F5:8 D5:8 Bb4:4",
          "G5:8 Bb5:8 D6:8 F6:8 D6:4 Bb5:4",
          "C6:8 Bb5:8 G5:8 E5:8 C5:4 E5:4",
          "F5:8 Ab5:8 C6:8 Ab5:8 Bb5:8 D6:8 F6:8 D6:8",
          "Eb6:2. r:4",
        ].join(" | "),
        strings: pad("G3-Eb5"),
        bass: WALK,
      },
      drums: { ...BRUSHES, kick: "x.......x.-....." },
    },
  },
  order: ["A", "B", "A2", "C"],
};
