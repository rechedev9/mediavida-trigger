import { arp, pad, shift, type TrackDef } from "../track-kit";

const A_CHORDS = "Em C G D Em Am B7 Em";
const A_TUNE = [
  "B5:4 G5:4 E5:4",
  "G5:4 E6:2",
  "D6:4. C6:8 B5:4",
  "A5:2.",
  "G5:4 B5:4 E6:4",
  "C6:4. B5:8 A5:4",
  "F#5:4 A5:4 D#6:4",
  "E6:2.",
].join(" | ");
const WALTZ = arp("1:4 5:4 10:4", "E3");

export const fin: TrackDef = {
  bpm: 84,
  beatsPerBar: 3,
  loop: true,
  fadeIn: 2,
  gain: 1.6,
  room: 0.2,
  hall: 1,
  delay: { beats: 1.5, feedback: 0.3, mix: 0.12 },
  parts: {
    box: { inst: "musicBox", vol: 0.9, pan: 0.1, send: 0.6 },
    comb: { inst: "musicBox", vol: 0.5, pan: -0.2, send: 0.6 },
    bell: { inst: "bell", vol: 0.4, pan: 0.25, send: 0.7 },
    strings: { inst: "strings", vol: 0.35, pan: -0.1, send: 0.7 },
  },
  sections: {
    A: {
      chords: A_CHORDS,
      lines: { box: A_TUNE, comb: WALTZ },
    },
    B: {
      chords: "C G Am Em C G/B Am B7",
      lines: {
        box: [
          "E6:4. D6:8 C6:4",
          "B5:2 D6:4",
          "C6:4 A5:4 E5:4",
          "G5:2.",
          "G5:4 C6:4 E6:4",
          "D6:4. B5:8 G5:4",
          "C6:4. B5:8 A5:4",
          "F#5:4 A5:4 B5:4",
        ].join(" | "),
        comb: WALTZ,
        strings: pad("G3-E5"),
      },
    },
    A2: {
      chords: A_CHORDS,
      lines: {
        box: A_TUNE,
        comb: WALTZ,
        bell: shift(A_TUNE, -12),
        strings: pad("G3-E5"),
      },
    },
  },
  order: ["A", "B", "A2"],
};
