import { pad, type TrackDef } from "../track-kit";

export const victory: TrackDef = {
  bpm: 150,
  loop: false,
  fadeIn: 0.02,
  room: 0.45,
  hall: 0.25,
  parts: {
    lead: { inst: "lead", vol: 0.85, send: 0.3 },
    brass: { inst: "brass", vol: 0.7, pan: -0.2, send: 0.3 },
    strings: { inst: "strings", vol: 0.5, pan: 0.2, send: 0.4 },
    bass: { inst: "bass", vol: 0.8 },
    timp: { inst: "timpani", vol: 0.6, send: 0.3 },
    drums: { inst: "drums", vol: 0.7, send: 0.2 },
  },
  sections: {
    A: {
      chords: "Bb:1 Eb:2 F:2 Bb:1",
      lines: {
        lead: "F4:8 Bb4:8 D5:8 F5:8 Bb5:4. F5:8 | G5:4. Bb5:8 A5:4. C6:8 | D6:2. r:4",
        brass: "D4:8 F4:8 Bb4:8 D5:8 F5:4. D5:8 | Eb5:4. G5:8 F5:4. A5:8 | Bb5:2. r:4",
        strings: pad("F3-D5"),
        bass: "Bb2:4 F2:4 Bb2:4 D3:4 | Eb3:4 Eb3:4 F3:4 F2:4 | Bb2:2. r:4",
        timp: "Bb1:4! r:2. | r:2 [F2:16]x8 | Bb1:4! r:2.",
      },
      drums: {
        kick: "X...x...x...x... x.......x....... X...............",
        snare: "....x.......x... xxxxxxxxXXXXXXXX ................",
        crash: "X............... ................ X...............",
      },
    },
  },
  order: ["A"],
};
