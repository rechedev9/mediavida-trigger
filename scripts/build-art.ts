import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { buildChars, buildFaces } from "./art/chars";
import { buildEnemies } from "./art/enemies";
import { buildFx } from "./art/fx";
import { groupScript } from "./art/lua";
import { validateSprite, type GroupOutput } from "./art/sprite";
import { buildTiles } from "./art/tiles";
import { buildUi } from "./art/ui";

const ROOT = resolve(import.meta.dir, "..");
const ASEPRITE =
  process.env["ASEPRITE_PATH"] ??
  "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Aseprite\\Aseprite.exe";

const GROUPS: Readonly<Record<string, () => GroupOutput>> = {
  ui: buildUi,
  tiles: buildTiles,
  chars: buildChars,
  faces: buildFaces,
  enemies: buildEnemies,
  fx: buildFx,
};

async function runGroup(name: string, out: GroupOutput): Promise<void> {
  for (const s of out.sprites) validateSprite(s);
  await rm(join(ROOT, "public/assets", name), { recursive: true, force: true });
  await mkdir(join(ROOT, "public/assets", name), { recursive: true });
  await mkdir(join(ROOT, "art/aseprite", name), { recursive: true });
  const script = join(ROOT, ".art-build", `${name}.lua`);
  await writeFile(script, groupScript(out.sprites));
  const proc = Bun.spawn(
    [ASEPRITE, "-b", "--script-param", `root=${ROOT.replaceAll("\\", "/")}`, "--script", script],
    {
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const [code, stdout, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const log = `${stdout}${stderr}`.trim();
  if (code !== 0 || /error/i.test(log)) {
    throw new Error(`Aseprite failed on group ${name} (exit ${code}):\n${log}`);
  }
  for (const [rel, content] of Object.entries(out.files)) {
    await mkdir(dirname(join(ROOT, rel)), { recursive: true });
    await writeFile(join(ROOT, rel), content);
  }
  console.log(`  ${name}: ${out.sprites.length} sprites`);
}

async function main(): Promise<void> {
  const started = performance.now();
  const wanted = process.argv.slice(2);
  const names = wanted.length > 0 ? wanted : Object.keys(GROUPS);
  await mkdir(join(ROOT, ".art-build"), { recursive: true });
  const jobs = names.map((name) => {
    const make = GROUPS[name];
    if (make === undefined) throw new Error(`unknown group ${name}`);
    return runGroup(name, make());
  });
  await Promise.all(jobs);
  console.log(`art built in ${((performance.now() - started) / 1000).toFixed(1)}s`);
}

await main();
