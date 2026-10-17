# Asset contract

The engine (`src/`) reads only what this file lists. The art pipeline (`art/`, `scripts/build-art.ts`) and the audio module (`src/audio/`) must produce exactly this.

## Look

- Internal resolution 256x224, integer scaled, no smoothing.
- Every sprite and tileset is an indexed Aseprite file with at most 16 colors. Index 0 is transparent.
- Colors are snapped to BGR555 (each channel a multiple of 8).
- Outlines use a dark tinted color of the ramp (brightness 6% to 16%), never pure black.
- Ramps have 3 to 5 shades, moderate saturation, a few vivid accents. Light comes from the top left.
- Mediavida orange is the accent of the whole game: around `#f88820`, with a dark ramp to `#582810`.

## Pipeline

- Art sources live in `art/src/*.ts` as palettes plus ASCII pixel grids. They are TypeScript data only.
- `bun run art` turns each source into a Lua script in `.art-build/` (gitignored), runs Aseprite in batch mode, saves the editable file to `art/aseprite/<group>/<id>.aseprite` and exports the sheet to `public/assets/<group>/<id>.png` plus `<id>.json` (Aseprite `json-array` with `--list-tags`).
- Aseprite: `C:\Program Files (x86)\Steam\steamapps\common\Aseprite\Aseprite.exe` (1.3.18). Override with `ASEPRITE_PATH`.

## Characters: `public/assets/chars/<id>.png|json`

- Frame 16x32. Feet touch the bottom row; the sprite origin is bottom center.
- Tags (Aseprite frame tags, exact names):
  - `idle-down`, `walk-down`, `idle-up`, `walk-up`, `idle-side`, `walk-side` (side faces LEFT; the engine flips it for right). Walk tags have 4 frames, idle tags 1 or 2.
  - `attack` (3 frames, side view facing left), `hurt` (1), `cast` (2), `ko` (1, lying down, may use the bottom 16 rows only), `victory` (2).
- Ids: `novato` (the silent hero), the party members listed in `src/data/party.ts`, and NPCs `npc-<name>`.

## Faces: `public/assets/faces/<id>.png`

- One 32x32 portrait per party member and per named NPC, same palette as the sprite.

## Enemies: `public/assets/enemies/<id>.png|json`

- Frame size free per enemy (16x16 up to 64x64; bosses up to 96x96), origin bottom center.
- Tags: `idle` (2 frames), `attack` (2), `hurt` (1).

## Tilesets: `public/assets/tiles/<set>.png|json`

- 16x16 tiles in a grid 16 tiles wide.
- `<set>.tiles.json` (written by the pipeline, not Aseprite): `{ "tileSize": 16, "columns": 16, "tiles": { "<name>": { "index": n, "solid": bool, "frames"?: [n, n, ...], "fps"?: number, "over"?: bool } } }`.
  - `over: true` tiles draw above characters (tree tops, roof edges).
  - Animated tiles list every frame index; `index` is the first.
- Sets: `plaza` (2026 fair town), `lan` (2005 LAN party hall and IRC tavern), `oro` (2011 OFF-Topic town and the Mafia mansion), `fin` (the End of the Thread hub, a void with a floating platform and light pillars), `futuro` (2036 ruined server halls), `cueva` (generic dungeon: the server sewers).

## Effects: `public/assets/fx/<id>.png|json`

- Frame 32x32, tag `play`. Ids: `slash`, `flame`, `ice`, `bolt`, `shadow`, `heal`, `buff`, `portal`, `sparkle`, `explosion`.

## UI: `public/assets/ui/`

- `window.png`: 24x24, a 3x3 grid of 8x8 pieces for a 9-slice window. The fill is a vertical gradient that tiles vertically.
- `cursor.png|json`: 16x16 pointing hand, tag `play` 2 frames.
- `icons.png|json`: 8x8 icons, one frame each, named by frame tags: `fire`, `ice`, `bolt`, `shadow`, `potion`, `ether`, `revive`, `key`, `sword`, `armor`, `helmet`, `accessory`.
- `font.png` + `font.json`: cells 8x12, 16 per row, glyph baseline at row 9. `font.json` is `{ "cell": [8, 12], "chars": "<every glyph in sheet order>", "widths": [n, ...] }`. Glyphs: printable ASCII plus `ÁÉÍÓÚáéíóúÑñÜü¿¡«»…`.
- `title.png`: 256x224 title backdrop, `logo.png|json`: the "MEDIAVIDA TRIGGER" logo.

## Audio: `src/audio/`

- `audio.ts` exports `playMusic(id: MusicId)`, `stopMusic()`, `playSfx(id: SfxId)`, `setVolume(music: number, sfx: number)`, `unlockAudio()` (call on first input).
- Everything is synthesized with WebAudio from TypeScript note data. All melodies are original.
- `MusicId`: `title`, `plaza`, `lan`, `oro`, `fin`, `futuro`, `cueva`, `battle`, `boss`, `final`, `victory`, `gameover`, `ending`, `tension`.
- `SfxId`: `cursor`, `confirm`, `cancel`, `hit`, `crit`, `miss`, `heal`, `fire`, `ice`, `bolt`, `shadow`, `levelup`, `chest`, `door`, `portal`, `save`, `text`, `run`, `buzz`.
