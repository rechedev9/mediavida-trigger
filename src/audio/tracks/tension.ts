import { arp, bassLine, onceEvery, pad, type TrackDef } from "../track-kit";

const TREMOLO = pad("F#2-G3", "x:8");
const PING = arp("8:4 r:2.", "B4");
const HEART = {
  kick: "X..x............",
  tomLo: onceEvery(4, "-"),
};

export const tension: TrackDef = {
  bpm: 90,
  loop: true,
  fadeIn: 1,
  gain: 1.3,
  room: 0.3,
  hall: 0.6,
  delay: { beats: 1, feedback: 0.4, mix: 0.25 },
  parts: {
    tremolo: { inst: "strings", vol: 0.4, pan: -0.2, send: 0.4 },
    high: { inst: "strings", vol: 0.5, pan: 0.2, send: 0.6 },
    bell: { inst: "bell", vol: 0.3, pan: 0.35, send: 0.8 },
    bass: { inst: "bass", vol: 0.6 },
    drums: { inst: "drums", vol: 0.7, send: 0.3 },
  },
  sections: {
    A: {
      chords: "Bm:1 Bm:1 G:1 F#:1 Bm:1 C:1 G:1 F#:1",
      lines: {
        high: "r:1 | F#5:1 | G5:1 | F#5:2 A#5:2 | B5:1 | C6:1 | B5:1 | A#5:2 C#6:2",
        tremolo: TREMOLO,
        bell: PING,
        bass: bassLine("1:1", "B1"),
      },
      drums: HEART,
    },
    B: {
      chords: "Em:1 Em:1 Bm:1 Bm:1 C:1 G:1 F#:1 F#:1",
      lines: {
        high: "G5:1 | B5:1 | D6:1 | F#5:1 | E5:1 | D5:1 | C#5:1 | A#4:1",
        tremolo: TREMOLO,
        bell: PING,
        bass: bassLine("1:1", "B1"),
      },
      drums: HEART,
    },
  },
  order: ["A", "B"],
};
