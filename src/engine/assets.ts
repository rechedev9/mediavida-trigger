import { isRecord, num, str } from "./guards";

type Rect = { x: number; y: number; w: number; h: number };

type Tag = { from: number; to: number };

export type Sheet = {
  image: HTMLImageElement;
  frames: Rect[];
  durations: number[];
  tags: Map<string, Tag>;
  w: number;
  h: number;
};

const images = new Map<string, HTMLImageElement>();
const sheets = new Map<string, Sheet>();
const jsons = new Map<string, unknown>();

const BASE = `${import.meta.env.BASE_URL}assets/`;

function parseRect(v: unknown): Rect {
  if (!isRecord(v)) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: num(v.x), y: num(v.y), w: num(v.w), h: num(v.h) };
}

function loadImage(path: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", () => resolve(null));
    img.src = BASE + path;
  });
}

async function loadJson(path: string): Promise<unknown> {
  try {
    const res = await fetch(BASE + path);
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return data;
  } catch {
    return null;
  }
}

/** Parses Aseprite's json-array export. */
function parseSheet(image: HTMLImageElement, data: unknown): Sheet {
  const frames: Rect[] = [];
  const durations: number[] = [];
  const tags = new Map<string, Tag>();
  if (isRecord(data) && Array.isArray(data.frames)) {
    for (const f of data.frames) {
      if (!isRecord(f)) continue;
      frames.push(parseRect(f.frame));
      durations.push(num(f.duration, 100) / 1000);
    }
    const meta = data.meta;
    if (isRecord(meta) && Array.isArray(meta.frameTags)) {
      for (const t of meta.frameTags) {
        if (isRecord(t)) tags.set(str(t.name), { from: num(t.from), to: num(t.to) });
      }
    }
  }
  if (frames.length === 0) {
    frames.push({ x: 0, y: 0, w: image.width, h: image.height });
    durations.push(0.1);
  }
  const first = frames[0] ?? { x: 0, y: 0, w: image.width, h: image.height };
  return { image, frames, durations, tags, w: first.w, h: first.h };
}

export async function loadSheet(id: string): Promise<Sheet | null> {
  const cached = sheets.get(id);
  if (cached) return cached;
  const [img, data] = await Promise.all([loadImage(`${id}.png`), loadJson(`${id}.json`)]);
  if (!img) return null;
  images.set(id, img);
  const sheet = parseSheet(img, data);
  sheets.set(id, sheet);
  return sheet;
}

export async function loadPlainImage(id: string): Promise<HTMLImageElement | null> {
  const cached = images.get(id);
  if (cached) return cached;
  const img = await loadImage(`${id}.png`);
  if (img) images.set(id, img);
  return img;
}

export async function loadData(path: string): Promise<unknown> {
  if (jsons.has(path)) return jsons.get(path);
  const data = await loadJson(path);
  jsons.set(path, data);
  return data;
}

export function getSheet(id: string): Sheet | null {
  return sheets.get(id) ?? null;
}

export function getImage(id: string): HTMLImageElement | null {
  return images.get(id) ?? null;
}

export function getData(path: string): unknown {
  return jsons.get(path) ?? null;
}
