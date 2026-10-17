import type { MapDef } from "../map-types";
import { open, solid } from "./legend";

export const mafia: MapDef = {
  id: "mafia",
  name: "2011, La Mansión de Mafia",
  tileset: "oro",
  music: "tension",
  legend: {
    ".": open("mfloor"),
    ",": open("carpet"),
    M: solid("mwall"),
    b: solid("books"),
    c: solid("candle"),
    t: solid("table"),
    D: open("mdoor"),
  },
  ground: [
    "MMMMMMMMMMMMMMMMMMMM",
    "MbbMMbbMMMMMMbbMMbbM",
    "M..c............c..M",
    "M......,,,,,,......M",
    "M......,,,,,,......M",
    "M.tt...,,,,,,...tt.M",
    "M.tt...,,,,,,...tt.M",
    "M......,,,,,,......M",
    "M..c...,,,,,,...c..M",
    "M......,,,,,,......M",
    "M.tt...,,,,,,...tt.M",
    "M.tt...,,,,,,...tt.M",
    "M......,,,,,,......M",
    "M..c....,,,,....c..M",
    "M........,,........M",
    "MMMMMMMMMDDMMMMMMMMM",
  ],
  npcs: [
    {
      id: "mafia-1",
      sprite: "npc-aldeano-2",
      x: 4,
      y: 7,
      dir: "up",
      talk: (api) =>
        api.say(
          "aldeano",
          "Llevamos tres días de partida. El Banhammer decide quién muere cada noche. Y siempre decide que yo.",
        ),
    },
    {
      id: "mafia-2",
      sprite: "npc-aldeano-3",
      x: 16,
      y: 9,
      dir: "up",
      talk: (api) =>
        api.say(
          "aldeano",
          "Yo soy del pueblo. Lo juro. Puedes mirar mis mensajes: todos son de pueblo.",
        ),
    },
  ],
  warps: [{ x: 9, y: 15, w: 2, to: "oro", tx: 14, ty: 4, dir: "down" }],
  spawns: [
    { id: "s1", x: 4, y: 12, show: "reporton", encounter: { enemies: ["reporton", "reporton"] } },
    {
      id: "s2",
      x: 15,
      y: 4,
      show: "multicuenta",
      encounter: { enemies: ["multicuenta", "cuenta-rara", "multicuenta"] },
    },
    {
      id: "boss",
      x: 10,
      y: 3,
      show: "banhammer",
      flag: "oro-boss",
      encounter: { enemies: ["banhammer"], boss: true },
      before: async (api) => {
        await api.say(null, "Banhammer: Anochece en el pueblo. Voto por... todos vosotros.");
        await api.say("don_verde", "Un martillo no vota. Y menos con el café sin terminar.");
        await api.say(null, "Banhammer: Motivo del baneo: existir. Duración: permanente.");
      },
      after: async (api) => {
        await api.say(
          null,
          "El Banhammer cae al suelo y se queda quieto. Por fin es solo un martillo.",
        );
        api.sfx("portal");
        await api.flash("#ffe0a0");
        await api.say(
          "cryoned",
          "Mirad, dentro del mango hay una pieza. Lleva grabado un año: 2036.",
        );
        await api.say(
          "stiles",
          "Es una pieza de la Máquina del Bump. Alguien en el futuro la está montando.",
        );
        await api.say(null, "Volved a El Fin del Hilo: el portal de abajo ya responde.");
      },
    },
  ],
  chests: [
    { id: "a", x: 1, y: 13, item: "desbaneo" },
    { id: "b", x: 18, y: 2, item: "cafe-doble", n: 2 },
  ],
  saves: [{ x: 13, y: 13 }],
  triggers: [],
};
