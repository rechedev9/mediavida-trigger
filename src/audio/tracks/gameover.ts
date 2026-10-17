import { bassLine, pad, type TrackDef } from "../track-kit";

export const gameover: TrackDef = {
  bpm: 72,
  loop: false,
  fadeIn: 0.3,
  gain: 1.6,
  room: 0.3,
  hall: 0.8,
  parts: {
    flute: { inst: "flute", vol: 0.8, send: 0.6 },
    strings: { inst: "strings", vol: 0.7, send: 0.6 },
    bass: { inst: "bass", vol: 0.55 },
  },
  sections: {
    A: {
      chords: "Am:1 Dm:2 E:2 Am:1",
      lines: {
        flute: "E5:2. C5:4 | D5:2 B4:2 | A4:1",
        strings: pad("E3-C5"),
        bass: bassLine("1:1", "E2"),
      },
    },
  },
  order: ["A"],
};
