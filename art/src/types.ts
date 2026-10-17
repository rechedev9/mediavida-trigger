// Shared shapes for the art sources. Sources are plain data; scripts/art turns them into sprites.

export type Grid = readonly string[];

/** 16 hex colors, index 0 is transparent. Every channel is a multiple of 8 (BGR555). */
export type Palette = readonly string[];

/** Maps one grid character to a palette index. `.` is always 0. */
export type CharKey = Readonly<Record<string, number>>;

export type View = "down" | "up" | "side" | "ko";

export type Point = readonly [number, number];

export interface Overlay {
  /** `head` follows the head box, `body` follows the frame (with walk bob). */
  readonly anchor: "head" | "body";
  readonly views: Partial<Record<View, Grid>>;
  readonly at?: Partial<Record<View, Point>>;
  /** Only draw on these template bodies (held props that follow the hands). */
  readonly bodies?: readonly string[];
}

export interface CharDef {
  readonly id: string;
  readonly palette: Palette;
  /** Front hair per view, drawn over the head template. */
  readonly hair: Partial<Record<View, Grid>>;
  /** Hair drawn behind the body (long hair, hoods). */
  readonly back?: readonly Overlay[];
  /** Clothes drawn between the body and the head. */
  readonly outfit?: readonly Overlay[];
  /** Beards, glasses, canes: drawn last. */
  readonly acc?: readonly Overlay[];
  /** Weapon per attack frame, in frame pixels: grid plus top-left corner. */
  readonly weapon?: readonly [WeaponFrame, WeaponFrame, WeaponFrame];
  /** Long coat or robe: the top `rows` pants rows take the top colors; `fill` closes the gap between legs. */
  readonly coat?: { readonly rows: number; readonly fill: boolean };
  /** Stocky build (body 2px wider). */
  readonly wide?: boolean;
  /** Recolors template body chars, e.g. `{ w: "f" }` for dark shoes, `{ k: "w" }` for hand wraps. */
  readonly bodyRemap?: Readonly<Record<string, string>>;
  /** `wave`: idle-down waves a hand (2 frames). */
  readonly idle?: "wave";
  /** Rows removed from the body for short characters (kids). */
  readonly shrink?: number;
  readonly face?: FaceDef;
}

interface WeaponFrame {
  readonly grid: Grid;
  readonly at: Point;
  /** Draw behind the body instead of on top. */
  readonly behind?: boolean;
}

export interface FacePart {
  readonly grid: Grid;
  readonly at?: Point;
}

export interface FaceDef {
  /** Drawn behind the head (long hair, hoods). Grids are placed at `at` or the top left. */
  readonly back?: readonly FacePart[];
  readonly hair: Grid;
  /** Beards, glasses, collars, drawn last. */
  readonly acc?: readonly FacePart[];
}

/** Battle enemy: full frames, facing right (the party stands on the right). Grids use HEX_KEY. */
export interface EnemyDef {
  readonly id: string;
  readonly palette: Palette;
  readonly idle: readonly [Grid, Grid];
  readonly attack: readonly [Grid, Grid];
  readonly hurt: Grid;
}

/** 32x32 battle effect played once. Grids use HEX_KEY. */
export interface FxDef {
  readonly id: string;
  readonly palette: Palette;
  /** Milliseconds per frame, one entry per frame. */
  readonly ms: readonly number[];
  readonly frames: readonly Grid[];
}

export interface TileDef {
  readonly name: string;
  readonly desc: string;
  readonly solid?: boolean;
  /** Drawn above characters (tree tops, roof edges). */
  readonly over?: boolean;
  /** Tile drawn first; `.` in the grid shows it. Animated bases animate this tile too. */
  readonly base?: string;
  readonly grid?: Grid;
  /** Animated tile: one grid per frame (drawn over `base`). */
  readonly frames?: readonly Grid[];
  readonly fps?: number;
  readonly recipe?: TileRecipe;
  /** Mirror of another tile. */
  readonly flipX?: string;
}

export type TileRecipe =
  | {
      /** Seamless value noise mapped onto a ramp with ordered dither. */
      readonly kind: "noise";
      /** Grid chars from light to dark. */
      readonly ramp: string;
      /** Noise cells per tile side (2, 4 or 8). */
      readonly cells: number;
      readonly seed: number;
      /** Shifts the value before mapping, -1 to 1. */
      readonly bias?: number;
    }
  | {
      /** Stamps scattered with wrap-around; `frames` animates them (drift or cycling variants). */
      readonly kind: "scatter";
      readonly stamps: readonly Grid[];
      readonly count: number;
      readonly seed: number;
      readonly frames?: number;
      readonly drift?: Point;
      /** Each stamp steps through the stamp list over the frames (twinkles). */
      readonly cycle?: boolean;
    }
  | {
      /** Running-bond bricks or stone blocks. */
      readonly kind: "bricks";
      readonly w: number;
      readonly h: number;
      /** Mortar, then light, mid and dark faces. */
      readonly colors: string;
      readonly seed: number;
      readonly offset?: boolean;
    }
  | {
      /** Horizontal boards with staggered seams. */
      readonly kind: "planks";
      readonly h: number;
      /** Seam, then light, mid and dark. */
      readonly colors: string;
      readonly seed: number;
    };

/** Generates the 12 edge and corner tiles where `inner` meets `outer`. */
export interface EdgeDef {
  readonly kind: "edges";
  readonly prefix: string;
  readonly desc: string;
  readonly inner: string;
  readonly outer: string;
  /** Band of `outer` kept along each edge, in pixels (default 4). */
  readonly depth?: number;
  /** Grid char drawn on the inner side of the border. */
  readonly rim?: string;
  /** Grid char drawn on the outer side of the border (shadow or curb). */
  readonly outerRim?: string;
  readonly solid?: boolean;
  readonly seed: number;
}

export interface TilesetDef {
  readonly id: string;
  readonly palette: Palette;
  /** Tiles and edge sets, in sheet order. */
  readonly tiles: readonly (TileDef | EdgeDef)[];
}
