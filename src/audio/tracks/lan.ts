import { arp, bassLine, onceEvery, pad, shift, type TrackDef } from "../track-kit";

const TRACKER_ARP = arp("1:32 3:32 5:32 8:32", "A4");
const BOUNCE = bassLine("1:8 8:8", "A1");

// Syncopated hook: the same rhythm cell climbs over Am, C and Am again.
const HOOK = [
  "A5:8 C6:8 E6:4 D6:8 C6:4 B5:8",
  "C6:4. A5:8 F5:4 A5:4",
  "G5:8 C6:8 E6:4 D6:8 C6:4 D6:8",
  "B5:2. G5:8 B5:8",
  "A5:8 C6:8 E6:4 F6:8 E6:4 D6:8",
  "C6:4. A5:8 C6:4 F6:4",
  "F6:8 E6:8 D6:8 C6:8 A5:8 C6:8 D6:4",
  "B5:4. G#5:8 E5:4 G#5:4",
].join(" | ");

const SOAR = [
  "A5:2. C6:8 A5:8",
  "B5:2. D6:8 B5:8",
  "G5:4. E5:8 G5:4 B5:4",
  "A5:2. r:4",
  "F5:2. A5:8 D6:8",
  "D6:4. C6:8 B5:4 G5:4",
  "A5:4 C6:4 B5:4 D6:4",
  "E6:2. r:4",
].join(" | ");

const A_CHORDS = "Am:1 F:1 C:1 G:1 Am:1 F:1 Dm:1 E7:1";
const A_DRUMS = {
  kick: "x.....x.x.....x.",
  snare: "....x.......x...",
  hat: "x-x-x-x-x-x-x-x-",
  crash: onceEvery(8),
};

export const lan: TrackDef = {
  bpm: 150,
  loop: true,
  fadeIn: 0.2,
  room: 0.3,
  hall: 0.15,
  delay: { beats: 0.75, feedback: 0.3, mix: 0.2 },
  parts: {
    lead: { inst: "lead", vol: 0.8, pan: -0.1, send: 0.35 },
    brass: { inst: "brass", vol: 0.55, pan: 0.2, send: 0.3 },
    strings: { inst: "strings", vol: 0.45, pan: -0.25, send: 0.4 },
    arp: { inst: "chip", vol: 0.38, pan: 0.3, send: 0.1 },
    bass: { inst: "synthBass", vol: 0.8 },
    drums: { inst: "drums", vol: 0.7, send: 0.1 },
  },
  sections: {
    A: {
      chords: A_CHORDS,
      lines: { lead: HOOK, arp: TRACKER_ARP, bass: BOUNCE },
      drums: A_DRUMS,
    },
    B: {
      chords: "F:1 G:1 Em:1 Am:1 Dm:1 G:1 F:2 G:2 E7:1",
      lines: {
        lead: SOAR,
        brass: shift(SOAR, -12),
        strings: pad("E3-C5"),
        arp: TRACKER_ARP,
        bass: BOUNCE,
      },
      drums: {
        kick: "x.......x.......",
        snare: "....x.......x..x",
        hat: "x.x.x.x.x.x.x.x.",
        open: "..-...-...-...-.",
      },
      fill: {
        kick: "x.......x.......",
        snare: "....x...x.x.xxxx",
        hat: "x.x.x.x.........",
      },
    },
    A2: {
      chords: A_CHORDS,
      lines: {
        lead: HOOK,
        brass: shift(HOOK, -12),
        strings: pad("E3-C5"),
        arp: TRACKER_ARP,
        bass: BOUNCE,
      },
      drums: A_DRUMS,
    },
    C: {
      chords: "Am:1 G:1 F:1 E7:1 Am:1 G:1 F:1 E:1",
      lines: {
        lead: [
          "E5:8 A5:8 C6:8 E6:8 r:2",
          "D5:8 G5:8 B5:8 D6:8 r:2",
          "C5:8 F5:8 A5:8 C6:8 r:2",
          "B4:8 E5:8 G#5:8 B5:8 r:4 D6:4",
          "A5:4. B5:8 C6:4 E6:4",
          "D6:4. C6:8 B5:4 G5:4",
          "A5:4. G5:8 F5:4 C6:4",
          "B5:2 G#5:2",
        ].join(" | "),
        strings: pad("E3-C5"),
        arp: arp("1:16 5:16 8:16 10:16", "A4"),
        bass: bassLine("1:4 r:8 1:8 8:8 r:8 1:8 r:8", "A1"),
      },
      drums: {
        kick: "x.......x.......",
        hat: "-.-.-.-.-.-.-.-.",
      },
      fill: {
        kick: "x...x...x...x...",
        snare: "x.x.x.x.xxxxXXXX",
      },
    },
  },
  order: ["A", "B", "A2", "C"],
};
