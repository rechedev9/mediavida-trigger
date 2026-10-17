import type { MapDef } from "../map-types";
import { open, solid } from "./legend";

export const cueva: MapDef = {
  id: "cueva",
  name: "2036, Las Alcantarillas de Datos",
  tileset: "cueva",
  music: "cueva",
  legend: {
    ".": open("stone"),
    "#": solid("swall"),
    "=": solid("wall-top"),
    l: open("ladder"),
    m: open("moss"),
    C: solid("crystal"),
    "~": solid("sewer"),
    p: solid("pipe"),
    g: open("grate"),
  },
  ground: [
    "==============================",
    "##############ll##############",
    "#............................#",
    "#..m....................m....#",
    "#...C......................C.#",
    "#~~~~~~~~..........~~~~~~~~~~#",
    "#~~~~~~~~..........~~~~~~~~~~#",
    "#......pp..gggggggg..pp......#",
    "#..........gggggggg..........#",
    "#..........gggggggg..........#",
    "#..........gggggggg..........#",
    "#..m...pp..gggggggg..pp...m..#",
    "#............................#",
    "#~~~~~~~~..........~~~~~~~~~~#",
    "#...C......................C.#",
    "#............................#",
    "#..m.....................m...#",
    "##############################",
  ],
  npcs: [
    {
      id: "viejo-mod",
      sprite: "npc-viejo-mod",
      x: 14,
      y: 12,
      dir: "up",
      showIf: "ia-boss",
      talk: async (api) => {
        await api.say(
          "viejo-mod",
          "Detrás de la IA Suprema estaba esto: un acceso directo al núcleo de Lagvos.",
        );
        const r = await api.choose({
          who: "viejo-mod",
          text: "¿Entráis ya? No habrá vuelta atrás hasta que acabe.",
          choices: ["Entrar", "Todavía no"],
        });
        if (r !== 0) return;
        api.sfx("portal");
        await api.flash("#ffffff");
        await api.warp({ map: "nucleo", x: 10, y: 12, dir: "up" });
      },
    },
  ],
  warps: [{ x: 14, y: 1, w: 2, to: "futuro", tx: 14, ty: 11, dir: "down" }],
  spawns: [
    {
      id: "s1",
      x: 5,
      y: 9,
      show: "hilo-duplicado",
      encounter: { enemies: ["hilo-duplicado", "hilo-duplicado"] },
    },
    {
      id: "s2",
      x: 24,
      y: 9,
      show: "captcha",
      encounter: { enemies: ["captcha", "alucinador", "captcha"] },
    },
    {
      id: "s3",
      x: 6,
      y: 15,
      show: "alucinador",
      encounter: { enemies: ["alucinador", "alucinador"] },
    },
    {
      id: "s4",
      x: 22,
      y: 15,
      show: "cuenta-rara",
      encounter: { enemies: ["cuenta-rara", "hilo-duplicado", "captcha"] },
    },
    {
      id: "boss",
      x: 14,
      y: 9,
      show: "ia-suprema",
      flag: "ia-boss",
      encounter: { enemies: ["ia-suprema"], boss: true },
      before: async (api) => {
        await api.say(
          "ia",
          "Detectados usuarios humanos. Tasa de erratas: inaceptable. Procedo a corregiros.",
        );
        await api.say("xboss", "Esa voz la conozco. Le enseñé a escribir yo. Mal, por lo visto.");
        await api.say(
          "ia",
          "Respuesta generada. Confianza: noventa y nueve por ciento. Exactitud: irrelevante.",
        );
      },
      after: async (api) => {
        await api.say("ia", "Error... contexto agotado... resumiendo conversación...");
        api.shake(0.8);
        api.sfx("portal");
        await api.flash("#a0ffe0");
        await api.say(
          "xboss",
          "Se ha apagado. Detrás de la rejilla hay un acceso. Ahí está Lagvos.",
        );
        api.npcShow("viejo-mod", true);
        await api.say(
          "viejo-mod",
          "Os he seguido desde El Fin del Hilo. Descansad antes de entrar.",
        );
        api.healParty();
      },
    },
  ],
  chests: [
    { id: "a", x: 1, y: 2, item: "cafe-doble", n: 2 },
    { id: "b", x: 28, y: 15, item: "desbaneo", n: 2 },
  ],
  saves: [{ x: 17, y: 3 }],
  triggers: [],
  onEnter: async (api) => {
    if (api.flag("cueva-intro")) return;
    api.setFlag("cueva-intro");
    await api.wait(0.3);
    await api.say(
      "cryoned",
      "Aquí abajo pasan todos los cables del foro. Huele a ventilador con polvo.",
    );
  },
};
