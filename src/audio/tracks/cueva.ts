import { arp, bassLine, pad, shift, type TrackDef } from "../track-kit";

// Each phrase starts with the same three-note pickup, so the tune sticks over the ostinato.
const CREEP = [
  "A4:8 D5:8 F5:4. E5:8 D5:4",
  "C5:8 D5:8 A4:2.",
  "Bb4:8 D5:8 F5:4. G5:8 F5:4",
  "E5:2. C#5:4",
  "A4:8 D5:8 F5:4. G5:8 A5:4",
  "Bb5:4. A5:8 G5:4 D5:4",
  "F5:4 D5:4 E5:4 C#5:4",
  "D5:1",
].join(" | ");
const A_CHORDS = "Dm:1 Dm:1 Bb:1 A7:1 Dm:1 Gm:1 Bb:2 A:2 Dm:1";
const A_DRUMS = {
  tomLo: "x.......x.......",
  kick: "x...............",
  shaker: "......-.......-.",
};

const OSTINATO = bassLine("1:8 5:8 8:8 5:8 10:8 5:8 8:8 5:8", "D2");
const DRIP = arp("r:2. 8:8 r:8", "D4");

export const cueva: TrackDef = {
  bpm: 96,
  loop: true,
  fadeIn: 1,
  room: 0.6,
  hall: 0.45,
  delay: { beats: 0.75, feedback: 0.35, mix: 0.18 },
  parts: {
    lead: { inst: "flute", vol: 0.75, pan: -0.1, send: 0.5 },
    ostinato: { inst: "bass", vol: 0.8, send: 0.15 },
    strings: { inst: "strings", vol: 0.5, pan: 0.2, send: 0.5 },
    cello: { inst: "strings", vol: 0.5, pan: -0.2, send: 0.45 },
    drip: { inst: "bell", vol: 0.3, pan: 0.45, send: 0.8 },
    drums: { inst: "drums", vol: 0.6, send: 0.4 },
  },
  sections: {
    A: {
      chords: A_CHORDS,
      lines: {
        lead: CREEP,
        ostinato: OSTINATO,
        strings: pad("D3-D4"),
        drip: DRIP,
      },
      drums: A_DRUMS,
    },
    A2: {
      chords: A_CHORDS,
      lines: {
        lead: CREEP,
        cello: shift(CREEP, -12),
        ostinato: OSTINATO,
        strings: pad("D3-E4"),
        drip: DRIP,
      },
      drums: { ...A_DRUMS, snare: "............-..." },
    },
    B: {
      chords: "Gm:1 Dm:1 Gm:1 A:1 Bb:1 C:1 Gm:2 A:2 A7:1",
      lines: {
        lead: [
          "D6:2 Bb5:4 G5:4",
          "A5:2. F5:4",
          "G5:4 Bb5:4 D6:4 C6:4",
          "C#6:1",
          "D6:2 F5:4 Bb5:4",
          "C6:2 E5:4 G5:4",
          "Bb5:2 A5:2",
          "E5:2. G5:4",
        ].join(" | "),
        ostinato: OSTINATO,
        strings: pad("D3-E4"),
        drip: DRIP,
      },
      drums: {
        tomLo: "x.......x.......",
        tomHi: "..............-.",
        kick: "x...............",
        snare: "............-...",
        shaker: "..-...-...-...-.",
      },
    },
  },
  order: ["A", "B", "A2"],
};
