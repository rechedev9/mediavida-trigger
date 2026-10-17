import { parseHex, type SpriteSpec } from "./sprite";

const PRELUDE = `
local root = app.params.root
local hexv = {}
for i = 0, 15 do hexv[string.format("%x", i)] = string.char(i) end
local function img(w, h, s)
  local im = Image(w, h, ColorMode.INDEXED)
  im.bytes = s:gsub(".", hexv)
  return im
end
local function build(d)
  local spr = Sprite(d.w, d.h, ColorMode.INDEXED)
  local pal = Palette(#d.pal)
  for i, c in ipairs(d.pal) do
    pal:setColor(i - 1, Color{ r = c[1], g = c[2], b = c[3], a = (i == 1) and 0 or 255 })
  end
  spr:setPalette(pal)
  spr.transparentColor = 0
  local layers = {}
  for i, name in ipairs(d.layers) do
    local l = (i == 1) and spr.layers[1] or spr:newLayer()
    l.name = name
    layers[i] = l
  end
  for fi, f in ipairs(d.frames) do
    if fi > 1 then spr:newEmptyFrame() end
    spr.frames[fi].duration = f.ms / 1000
    for li, data in pairs(f.cels) do
      spr:newCel(layers[li], fi, img(d.w, d.h, data), Point(0, 0))
    end
  end
  for _, t in ipairs(d.tags) do
    local tag = spr:newTag(t[2], t[3])
    tag.name = t[1]
  end
  spr:saveAs(root .. "/" .. d.ase)
  if d.json then
    app.command.ExportSpriteSheet{
      ui = false, askOverwrite = false,
      type = d.rows and SpriteSheetType.ROWS or SpriteSheetType.HORIZONTAL,
      columns = d.rows and 16 or 0,
      textureFilename = root .. "/" .. d.png,
      dataFilename = root .. "/" .. d.json,
      dataFormat = SpriteSheetDataFormat.JSON_ARRAY,
      listTags = true, listLayers = false, splitLayers = false,
    }
  else
    spr:saveCopyAs(root .. "/" .. d.png)
  end
  spr:close()
end
`;

function luaStr(s: string): string {
  return JSON.stringify(s);
}

function spriteCall(s: SpriteSpec): string {
  const pal = s.palette.map((hex, i) => {
    const [r, g, b] = i === 0 ? [0, 0, 0] : parseHex(hex);
    return `{${r},${g},${b}}`;
  });
  const frames = s.frames.map((f) => {
    const cels = s.layers.flatMap((layer, li) => {
      const cel = f.cels[layer];
      return cel === undefined || cel.isEmpty() ? [] : [`[${li + 1}]=${luaStr(cel.toHex())}`];
    });
    return `{ms=${f.ms},cels={${cels.join(",")}}}`;
  });
  const tags = s.tags.map((t) => `{${luaStr(t.name)},${t.from + 1},${t.to + 1}}`);
  const base = `public/assets/${s.group}/${s.id}`;
  return [
    "build{",
    `w=${s.width},h=${s.height},`,
    `pal={${pal.join(",")}},`,
    `layers={${s.layers.map(luaStr).join(",")}},`,
    `frames={${frames.join(",\n")}},`,
    `tags={${tags.join(",")}},`,
    `ase=${luaStr(`art/aseprite/${s.group}/${s.id}.aseprite`)},`,
    `png=${luaStr(`${base}.png`)},`,
    s.output === "sheet" ? `json=${luaStr(`${base}.json`)},` : "",
    s.sheet === "rows" ? "rows=true," : "",
    "}",
  ].join("\n");
}

/** One Lua script that builds every sprite of a group in a single Aseprite process. */
export function groupScript(sprites: readonly SpriteSpec[]): string {
  return [PRELUDE, ...sprites.map(spriteCall)].join("\n");
}
