import {
  TICKS_PER_BEAT,
  expandPad,
  expandPattern,
  noteToMidi,
  parseChordLine,
  parseDrumLane,
  parseLine,
  swingBeat,
  type ParsedNote,
} from "./notation";
import type { DrumId, DrumLanes, Line, SectionDef, TrackDef } from "./track-kit";

interface EventBase {
  time: number;
  dur: number;
  vel: number;
  part: string;
}

export type CompiledEvent =
  | (EventBase & { kind: "note"; midi: number })
  | (EventBase & { kind: "drum"; drum: DrumId });

export interface CompiledTrack {
  events: CompiledEvent[];
  lengthBeats: number;
  loopStartBeat: number;
}

const DRUM_STEP_TICKS = TICKS_PER_BEAT / 4;

interface SectionContext {
  name: string;
  section: SectionDef;
  beatsPerBar: number;
}

function lineNotes(ctx: SectionContext, part: string, line: Line): ParsedNote[] {
  const { spans, ticks } = parseChordLine(ctx.section.chords, ctx.beatsPerBar);
  const where = `${ctx.name}.${part}`;
  if (typeof line === "string" || line.kind === "shift") {
    const src = typeof line === "string" ? line : line.src;
    const semis = typeof line === "string" ? 0 : line.semitones;
    const parsed = parseLine(src, ctx.beatsPerBar);
    if (parsed.ticks !== ticks) {
      const got = parsed.ticks / TICKS_PER_BEAT;
      throw new Error(`${where} lasts ${got} beats, section has ${ticks / TICKS_PER_BEAT}`);
    }
    return parsed.notes.map((n) => ({ ...n, midi: n.midi + semis }));
  }
  if (line.kind === "arp") {
    return expandPattern({
      spans,
      pattern: line.pattern,
      low: noteToMidi(line.low),
      slash: line.slash,
    });
  }
  return expandPad({
    spans,
    rhythm: line.rhythm,
    low: noteToMidi(line.low),
    high: noteToMidi(line.high),
  });
}

function drumHits(lanes: DrumLanes): { drum: DrumId; steps: (number | null)[] }[] {
  const out: { drum: DrumId; steps: (number | null)[] }[] = [];
  for (const [drum, src] of Object.entries(lanes)) {
    if (src === undefined || !isDrumId(drum)) continue;
    out.push({ drum, steps: parseDrumLane(src) });
  }
  return out;
}

const DRUM_IDS: readonly string[] = [
  "kick",
  "snare",
  "hat",
  "open",
  "tomHi",
  "tomLo",
  "crash",
  "shaker",
  "clap",
] satisfies DrumId[];

function isDrumId(value: string): value is DrumId {
  return DRUM_IDS.includes(value);
}

function sectionDrums(ctx: SectionContext, totalTicks: number) {
  const out: { tick: number; drum: DrumId; vel: number }[] = [];
  const totalSteps = totalTicks / DRUM_STEP_TICKS;
  const lastBarStart = totalSteps - ctx.beatsPerBar * 4;
  const main = drumHits(ctx.section.drums ?? {});
  const fill = ctx.section.fill ? drumHits(ctx.section.fill) : null;
  for (let step = 0; step < totalSteps; step++) {
    const inFill = fill !== null && step >= lastBarStart;
    const lanes = inFill ? fill : main;
    const laneStep = inFill ? step - lastBarStart : step;
    for (const lane of lanes) {
      if (lane.steps.length === 0) continue;
      const vel = lane.steps[laneStep % lane.steps.length];
      if (vel !== null && vel !== undefined) {
        out.push({ tick: step * DRUM_STEP_TICKS, drum: lane.drum, vel });
      }
    }
  }
  return out;
}

export function compileTrack(def: TrackDef): CompiledTrack {
  const beatsPerBar = def.beatsPerBar ?? 4;
  const swing = def.swing ?? 0;
  const events: CompiledEvent[] = [];
  const toBeats = (tick: number) => swingBeat(tick / TICKS_PER_BEAT, swing);
  let offset = 0;
  let loopStartTick = 0;
  def.order.forEach((name, index) => {
    const section = def.sections[name];
    if (!section) throw new Error(`Unknown section "${name}"`);
    if (index === (def.loopFrom ?? 0)) loopStartTick = offset;
    const ctx: SectionContext = { name, section, beatsPerBar };
    const { ticks } = parseChordLine(section.chords, beatsPerBar);
    if (ticks % (beatsPerBar * TICKS_PER_BEAT) !== 0) {
      throw new Error(`${name}: chords do not fill whole bars`);
    }
    for (const [part, line] of Object.entries(section.lines)) {
      const partDef = def.parts[part];
      if (!partDef || partDef.inst === "drums") throw new Error(`${name}: bad part "${part}"`);
      for (const n of lineNotes(ctx, part, line)) {
        const start = toBeats(offset + n.tick);
        const end = toBeats(offset + n.tick + n.ticks);
        events.push({
          kind: "note",
          time: start,
          dur: end - start,
          vel: n.vel,
          part,
          midi: n.midi,
        });
      }
    }
    if (section.drums || section.fill) {
      if (def.parts["drums"]?.inst !== "drums") throw new Error(`${name}: no drums part`);
      for (const hit of sectionDrums(ctx, ticks)) {
        const time = toBeats(offset + hit.tick);
        events.push({ kind: "drum", time, dur: 0.25, vel: hit.vel, part: "drums", drum: hit.drum });
      }
    }
    offset += ticks;
  });
  events.sort((a, b) => a.time - b.time);
  return {
    events,
    lengthBeats: offset / TICKS_PER_BEAT,
    loopStartBeat: loopStartTick / TICKS_PER_BEAT,
  };
}
