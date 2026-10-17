import { arp, bassLine, pad, shift, type TrackDef } from "../track-kit";
import { TITLE_CHORDS, TITLE_THEME } from "./title";

export const ending: TrackDef = {
  bpm: 72,
  loop: true,
  fadeIn: 2,
  gain: 1.4,
  room: 0.35,
  hall: 0.75,
  parts: {
    flute: { inst: "flute", vol: 0.85, send: 0.5 },
    bell: { inst: "bell", vol: 0.35, pan: 0.3, send: 0.6 },
    strings: { inst: "strings", vol: 0.8, pan: -0.15, send: 0.5 },
    harp: { inst: "pluck", vol: 0.5, pan: 0.25, send: 0.5 },
    bass: { inst: "bass", vol: 0.65 },
  },
  sections: {
    A: {
      chords: TITLE_CHORDS,
      lines: {
        flute: TITLE_THEME,
        strings: pad("F#3-D5"),
        harp: arp("1:8 5:8 8:8 5:8", "D3"),
        bass: bassLine("1:2 5:2", "D2"),
      },
    },
    B: {
      chords: "G:1 D/F#:1 Em7:1 D:1 G:1 A/G:1 F#m7:2 Bm:2 Em7:2 A7:2",
      lines: {
        flute: [
          "B5:2. A5:8 G5:8",
          "F#5:2 A5:2",
          "G5:4. F#5:8 E5:4 D5:4",
          "F#5:2 D5:2",
          "D6:2. B5:4",
          "C#6:4. B5:8 A5:2",
          "A5:4 C#6:4 B5:2",
          "G5:2 E5:4 C#5:4",
        ].join(" | "),
        bell: shift("D5:1 | A4:1 | B4:1 | A4:1 | D5:1 | C#5:1 | C#5:2 D5:2 | B4:2 A4:2", 12),
        strings: pad("G3-E5"),
        harp: arp("1:8 5:8 8:8 10:8 8:8 5:8 1:4", "D3"),
        bass: bassLine("1:2 5:2", "D2"),
      },
    },
  },
  order: ["A", "B"],
};
