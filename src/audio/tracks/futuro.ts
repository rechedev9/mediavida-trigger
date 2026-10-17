import { arp, bassLine, onceEvery, pad, shift, type TrackDef } from "../track-kit";

const BLINK = arp("8:16 r:16 r:8 r:4 5:16 r:16 r:8 r:4", "C5");

// A lament built on a rising sixth that sighs back down, like the main theme turned sad.
const LAMENT = [
  "G4:4 Eb5:2.",
  "D5:8 C5:8 D5:4 G4:2",
  "Ab4:4 F5:2.",
  "Eb5:8 D5:8 Eb5:4 C5:2",
  "C5:4 Ab5:2.",
  "G5:8 F5:8 Eb5:4 F5:4 Ab5:4",
  "G5:2 B4:2",
  "C5:1",
].join(" | ");

const A_CHORDS = "Cm:1 Cm:1 Ab:1 Ab:1 Fm:1 Fm:1 Gsus4:2 G:2 Cm:1";
const A_DRUMS = {
  kick: "x...............",
  hat: "........-.......",
  tomLo: onceEvery(2, "-"),
};

export const futuro: TrackDef = {
  bpm: 76,
  loop: true,
  fadeIn: 1.5,
  gain: 1.3,
  room: 0.3,
  hall: 0.8,
  delay: { beats: 0.75, feedback: 0.45, mix: 0.3 },
  parts: {
    lead: { inst: "lead", vol: 0.65, pan: -0.1, send: 0.6 },
    violin: { inst: "strings", vol: 0.55, pan: 0.2, send: 0.6 },
    drone: { inst: "strings", vol: 0.55, send: 0.5 },
    choir: { inst: "choir", vol: 0.55, pan: 0.15, send: 0.6 },
    sub: { inst: "bass", vol: 0.75 },
    blink: { inst: "chip", vol: 0.22, pan: 0.45, send: 0.8 },
    drums: { inst: "drums", vol: 0.5, send: 0.5 },
  },
  sections: {
    A: {
      chords: A_CHORDS,
      lines: {
        lead: LAMENT,
        drone: pad("C3-D4"),
        sub: bassLine("1:1", "C2"),
        blink: BLINK,
      },
      drums: A_DRUMS,
    },
    B: {
      chords: "Ab:1 Eb:1 Fm:1 Cm:1 Db:1 Ab:1 Fm:1 G:1",
      lines: {
        lead: [
          "C6:2. Bb5:8 Ab5:8",
          "G5:2. Eb5:4",
          "Ab5:2. G5:8 F5:8",
          "Eb5:2. C5:4",
          "F5:4 Ab5:4 Db6:4 C6:4",
          "C6:2. Eb6:4",
          "Db6:4. C6:8 Ab5:4 F5:4",
          "D6:2 B5:4 G5:4",
        ].join(" | "),
        drone: pad("C3-D4"),
        choir: pad("G3-C5"),
        sub: bassLine("1:1", "C2"),
        blink: BLINK,
      },
      drums: {
        kick: "x.......-.......",
        hat: "....-.......-...",
      },
    },
    A2: {
      chords: A_CHORDS,
      lines: {
        lead: LAMENT,
        violin: shift(LAMENT, 12),
        choir: pad("G3-C5"),
        drone: pad("C3-D4"),
        sub: bassLine("1:1", "C2"),
        blink: BLINK,
      },
      drums: { ...A_DRUMS, kick: "x.......-......." },
    },
  },
  order: ["A", "B", "A2"],
};
