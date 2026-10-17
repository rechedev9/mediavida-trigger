import { getData, getImage, loadData, loadPlainImage } from "./assets";
import { isRecord, num } from "./guards";

type TileInfo = { index: number; solid: boolean; frames: number[]; fps: number; over: boolean };

export type Tileset = {
  id: string;
  image: HTMLImageElement | null;
  size: number;
  columns: number;
  tiles: Map<string, TileInfo>;
};

export const TILE = 16;

const cache = new Map<string, Tileset>();

function parseTile(v: unknown): TileInfo | null {
  if (!isRecord(v)) return null;
  const index = num(v.index, -1);
  if (index < 0) return null;
  const frames = Array.isArray(v.frames)
    ? v.frames.filter((f): f is number => typeof f === "number")
    : [];
  return { index, solid: v.solid === true, frames, fps: num(v.fps, 4), over: v.over === true };
}

export async function loadTileset(id: string): Promise<Tileset> {
  const hit = cache.get(id);
  if (hit) return hit;
  await Promise.all([loadPlainImage(`tiles/${id}`), loadData(`tiles/${id}.tiles.json`)]);
  return tilesetFromCache(id);
}

function tilesetFromCache(id: string): Tileset {
  const data = getData(`tiles/${id}.tiles.json`);
  const tiles = new Map<string, TileInfo>();
  let size = TILE;
  let columns = 16;
  if (isRecord(data)) {
    size = num(data.tileSize, TILE);
    columns = num(data.columns, 16);
    if (isRecord(data.tiles)) {
      for (const [name, v] of Object.entries(data.tiles)) {
        const t = parseTile(v);
        if (t) tiles.set(name, t);
      }
    }
  }
  const set = { id, image: getImage(`tiles/${id}`), size, columns, tiles };
  cache.set(id, set);
  return set;
}

function hashColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 30% 40%)`;
}

export type TileDraw = { name: string; x: number; y: number; time: number; solid: boolean };

/** Draws a named tile, or a flat placeholder while the tileset art is missing. */
export function drawTile(ctx: CanvasRenderingContext2D, set: Tileset, t: TileDraw): void {
  const info = set.tiles.get(t.name);
  if (info && set.image) {
    const frame =
      info.frames.length > 1
        ? (info.frames[Math.floor(t.time * info.fps) % info.frames.length] ?? info.index)
        : info.index;
    const sx = (frame % set.columns) * set.size;
    const sy = Math.floor(frame / set.columns) * set.size;
    ctx.drawImage(set.image, sx, sy, set.size, set.size, t.x, t.y, TILE, TILE);
    return;
  }
  ctx.fillStyle = hashColor(t.name);
  ctx.fillRect(t.x, t.y, TILE, TILE);
  if (t.solid) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(t.x, t.y + TILE - 4, TILE, 4);
  }
}

export function tileIsOver(set: Tileset, name: string): boolean {
  return set.tiles.get(name)?.over ?? false;
}

export function tileIsSolid(set: Tileset, name: string): boolean | null {
  const info = set.tiles.get(name);
  return info ? info.solid : null;
}
