import { describe, expect, test } from "bun:test";
import { compileTrack } from "../src/audio/compile";
import {
  TICKS_PER_BEAT,
  degreeInterval,
  durationTicks,
  expandPad,
  expandPattern,
  expandTokens,
  noteToMidi,
  parseChord,
  parseChordLine,
  parseDrumLane,
  parseLine,
  swingBeat,
  voiceChord,
} from "../src/audio/notation";
import type { TrackDef } from "../src/audio/track-kit";
import { battle } from "../src/audio/tracks/battle";
import { boss } from "../src/audio/tracks/boss";
import { cueva } from "../src/audio/tracks/cueva";
import { ending } from "../src/audio/tracks/ending";
import { fin } from "../src/audio/tracks/fin";
import { finalBoss } from "../src/audio/tracks/final";
import { futuro } from "../src/audio/tracks/futuro";
import { gameover } from "../src/audio/tracks/gameover";
import { lan } from "../src/audio/tracks/lan";
import { oro } from "../src/audio/tracks/oro";
import { plaza } from "../src/audio/tracks/plaza";
import { tension } from "../src/audio/tracks/tension";
import { title } from "../src/audio/tracks/title";
import { victory } from "../src/audio/tracks/victory";

const BEAT = TICKS_PER_BEAT;

describe("noteToMidi", () => {
  test("maps scientific pitch names to MIDI numbers", () => {
    expect(noteToMidi("C4")).toBe(60);
    expect(noteToMidi("A4")).toBe(69);
    expect(noteToMidi("F#5")).toBe(78);
    expect(noteToMidi("Bb3")).toBe(58);
  });

  test("accidentals that cross the octave line stay in the written octave", () => {
    expect(noteToMidi("Cb4")).toBe(59);
    expect(noteToMidi("B#3")).toBe(60);
  });

  test("rejects malformed names", () => {
    for (const bad of ["H4", "C", "c4", "C#10", "Cx4"]) expect(() => noteToMidi(bad)).toThrow();
  });
});

describe("durationTicks", () => {
  test("handles plain, dotted, triplet and tied values", () => {
    expect(durationTicks("1")).toBe(4 * BEAT);
    expect(durationTicks("4")).toBe(BEAT);
    expect(durationTicks("8.")).toBe((BEAT * 3) / 4);
    expect(durationTicks("8t")).toBe(BEAT / 3);
    expect(durationTicks("2+8")).toBe(2.5 * BEAT);
    expect(durationTicks("32t")).toBe(BEAT / 12);
  });

  test("three triplet eighths fill exactly one beat", () => {
    expect(durationTicks("8t") * 3).toBe(BEAT);
  });

  test("rejects unknown values", () => {
    for (const bad of ["3", "", "4..", "64", "4+"]) expect(() => durationTicks(bad)).toThrow();
  });
});

describe("expandTokens", () => {
  test("expands nested repeats, with or without spaces around brackets", () => {
    expect(expandTokens("a [b [c]x2]x2 d")).toEqual(["a", "b", "c", "c", "b", "c", "c", "d"]);
    expect(expandTokens("[ a ]x3")).toEqual(["a", "a", "a"]);
    expect(expandTokens("[a b]")).toEqual(["a", "b"]);
  });

  test("rejects unbalanced brackets", () => {
    expect(() => expandTokens("a ]x2")).toThrow();
    expect(() => expandTokens("[a b")).toThrow();
  });
});

describe("parseLine", () => {
  test("durations are sticky and rests advance time without notes", () => {
    const line = parseLine("C5:8 E5 r G5:4");
    expect(line.notes.map((n) => [n.tick, n.ticks, n.midi])).toEqual([
      [0, BEAT / 2, 72],
      [BEAT / 2, BEAT / 2, 76],
      [BEAT * 1.5, BEAT, 79],
    ]);
    expect(line.ticks).toBe(BEAT * 2.5);
  });

  test("the first token defaults to a quarter note", () => {
    expect(parseLine("C4").ticks).toBe(BEAT);
  });

  test("comma chords share one onset", () => {
    const line = parseLine("C4,E4,G4:2");
    expect(line.notes.map((n) => n.midi)).toEqual([60, 64, 67]);
    expect(new Set(line.notes.map((n) => n.tick)).size).toBe(1);
    expect(line.ticks).toBe(2 * BEAT);
  });

  test("! accents and ? softens a note", () => {
    const [accent, plain, soft] = parseLine("C4! D4 E4?").notes;
    expect(accent?.vel).toBeGreaterThan(plain?.vel ?? 1);
    expect(soft?.vel).toBeLessThan(plain?.vel ?? 0);
  });

  test("repeats are unrolled in time order", () => {
    const line = parseLine("[C4:16 D4:16]x4");
    expect(line.notes.map((n) => n.midi)).toEqual([60, 62, 60, 62, 60, 62, 60, 62]);
    expect(line.ticks).toBe(2 * BEAT);
  });

  test("bar lines must fall on bar boundaries", () => {
    expect(() => parseLine("C4:2 D4:2 | E4:1")).not.toThrow();
    expect(() => parseLine("C4:2 D4:4 | E4:1")).toThrow(/bar boundary/);
  });

  test("bar lines follow the time signature", () => {
    expect(() => parseLine("C4:2. | D4:2.", 3)).not.toThrow();
    expect(() => parseLine("C4:1 | D4:1", 3)).toThrow();
  });

  test("rejects bad tokens", () => {
    expect(() => parseLine("C4:4 X9:4")).toThrow();
    expect(() => parseLine("C4:5")).toThrow();
  });
});

describe("chords", () => {
  test("parses root, quality and slash bass", () => {
    expect(parseChord("D/F#")).toEqual({ root: 2, bass: 6, intervals: [0, 4, 7] });
    expect(parseChord("Bm7").intervals).toEqual([0, 3, 7, 10]);
    expect(parseChord("Ebmaj7").root).toBe(3);
    expect(parseChord("Gsus4").intervals).toEqual([0, 5, 7]);
  });

  test("rejects unknown chords", () => {
    for (const bad of ["Hm", "Cxyz", "C/H", ""]) expect(() => parseChord(bad)).toThrow();
  });

  test("a chord without duration lasts one bar of the given meter", () => {
    expect(parseChordLine("C G:2 F:2").ticks).toBe(8 * BEAT);
    const waltz = parseChordLine("Em C", 3);
    expect(waltz.spans.map((s) => s.tick)).toEqual([0, 3 * BEAT]);
  });

  test("degrees follow the chord quality", () => {
    expect(degreeInterval(parseChord("Am"), "3")).toBe(3);
    expect(degreeInterval(parseChord("A"), "10")).toBe(16);
    expect(degreeInterval(parseChord("Bdim"), "5")).toBe(6);
    expect(degreeInterval(parseChord("Csus4"), "3")).toBe(5);
    expect(degreeInterval(parseChord("Cmaj7"), "7")).toBe(11);
    expect(degreeInterval(parseChord("C"), "7")).toBe(10);
    expect(degreeInterval(parseChord("Em"), "-5")).toBe(-5);
    expect(() => degreeInterval(parseChord("C"), "4")).toThrow();
  });
});

describe("expandPattern", () => {
  test("restarts on every chord and cuts the last step at the chord end", () => {
    const { spans } = parseChordLine("C:2. G:4");
    const notes = expandPattern({ spans, pattern: "1:2 5:2", low: noteToMidi("C3"), slash: false });
    expect(notes.map((n) => [n.tick / BEAT, n.ticks / BEAT, n.midi])).toEqual([
      [0, 2, 48],
      [2, 1, 55],
      [3, 1, 55],
    ]);
  });

  test("places each root inside [low, low + 11]", () => {
    const { spans } = parseChordLine("C D B");
    const notes = expandPattern({ spans, pattern: "1:1", low: noteToMidi("D2"), slash: false });
    expect(notes.map((n) => n.midi)).toEqual([48, 38, 47]);
  });

  test("slash chords move degree 1 to the bass note only when asked", () => {
    const { spans } = parseChordLine("C/E");
    const low = noteToMidi("C2");
    const bass = expandPattern({ spans, pattern: "1:2 5:2", low, slash: true });
    const arp = expandPattern({ spans, pattern: "1:2 5:2", low, slash: false });
    expect(bass.map((n) => n.midi)).toEqual([40, 43]);
    expect(arp.map((n) => n.midi)).toEqual([36, 43]);
  });
});

describe("voicing", () => {
  const low = noteToMidi("G3");
  const high = noteToMidi("E5");

  test("the first chord sits near the middle of the range", () => {
    expect(voiceChord({ chord: parseChord("C"), low, high, prev: null })).toEqual([60, 64, 67]);
  });

  test("the next chord moves by the smallest total distance", () => {
    const f = voiceChord({ chord: parseChord("F"), low, high, prev: [60, 64, 67] });
    expect(f).toEqual([60, 65, 69]);
  });

  test("every voiced note stays in range and the chord's pitch classes are all present", () => {
    for (const symbol of ["Ebmaj7", "F#m7", "Bdim", "Ab", "Dm9"]) {
      const chord = parseChord(symbol);
      const v = voiceChord({ chord, low, high, prev: null });
      expect(Math.min(...v)).toBeGreaterThanOrEqual(low);
      expect(Math.max(...v)).toBeLessThanOrEqual(high);
      const wanted = new Set(chord.intervals.map((i) => (chord.root + i) % 12));
      if (chord.intervals.length > 4) wanted.delete((chord.root + 7) % 12);
      expect(new Set(v.map((n) => n % 12))).toEqual(wanted);
    }
  });

  test("a range narrower than the chord throws", () => {
    expect(() => voiceChord({ chord: parseChord("C"), low: 60, high: 63, prev: null })).toThrow();
  });

  test("pad rhythms strike the voiced chord on each x", () => {
    const { spans } = parseChordLine("C");
    const notes = expandPad({ spans, rhythm: "r:4 x:4", low, high });
    expect([...new Set(notes.map((n) => n.tick / BEAT))]).toEqual([1, 3]);
    expect(notes).toHaveLength(6);
  });

  test("an empty pad rhythm holds each chord for its full length", () => {
    const { spans } = parseChordLine("C:2 G:2");
    const notes = expandPad({ spans, rhythm: "", low, high });
    expect(notes.every((n) => n.ticks === 2 * BEAT)).toBe(true);
  });
});

describe("drums and swing", () => {
  test("drum lanes map steps to velocities and ignore spacing", () => {
    expect(parseDrumLane("X.x- |.")).toEqual([1, null, 0.75, 0.4, null]);
    expect(() => parseDrumLane("x.y.")).toThrow();
  });

  test("swing keeps downbeats and pushes off-beats later", () => {
    expect(swingBeat(2, 0.12)).toBe(2);
    expect(swingBeat(2.5, 0.12)).toBeCloseTo(2.62);
    expect(swingBeat(1.5, 0)).toBe(1.5);
  });

  test("swing never reorders events within a beat", () => {
    let prev = -1;
    for (let i = 0; i <= 48; i++) {
      const b = swingBeat(i / 48, 0.15);
      expect(b).toBeGreaterThan(prev);
      prev = b;
    }
  });
});

const TRACKS: Record<string, TrackDef> = {
  title,
  plaza,
  lan,
  oro,
  fin,
  futuro,
  cueva,
  battle,
  boss,
  final: finalBoss,
  victory,
  gameover,
  ending,
  tension,
};

describe("game tracks", () => {
  for (const [name, def] of Object.entries(TRACKS)) {
    test(`${name} compiles with every line filling its section`, () => {
      const track = compileTrack(def);
      expect(track.events.length).toBeGreaterThan(0);
      const seconds = (track.lengthBeats - track.loopStartBeat) * (60 / def.bpm);
      if (def.loop) {
        expect(seconds).toBeGreaterThanOrEqual(30);
        const looped = def.order.slice(def.loopFrom ?? 0);
        expect(new Set(looped).size).toBeGreaterThanOrEqual(2);
      } else {
        expect(seconds).toBeLessThan(12);
      }
    });
  }

  test("victory is a short fanfare", () => {
    const track = compileTrack(victory);
    expect(track.lengthBeats * (60 / victory.bpm)).toBeLessThanOrEqual(5);
  });

  test("a line shorter than its section is rejected", () => {
    const broken: TrackDef = {
      ...gameover,
      sections: { A: { chords: "C:1 G:1", lines: { flute: "C5:1" } } },
    };
    expect(() => compileTrack(broken)).toThrow(/lasts 4 beats, section has 8/);
  });

  test("a line for an undeclared part is rejected", () => {
    const broken: TrackDef = {
      ...gameover,
      sections: { A: { chords: "C:1", lines: { tuba: "C3:1" } } },
    };
    expect(() => compileTrack(broken)).toThrow(/bad part/);
  });
});
