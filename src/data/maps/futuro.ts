import type { MapDef } from "../map-types";
import { open, solid } from "./legend";

export const futuro: MapDef = {
  id: "futuro",
  name: "2036, El Foro Automático",
  tileset: "futuro",
  music: "futuro",
  legend: {
    ".": open("metal"),
    "#": solid("mwall"),
    "=": solid("wall-top"),
    S: solid("screen"),
    R: solid("rack"),
    "-": open("cable"),
    x: solid("rubble"),
    K: solid("terminal"),
    p: solid("pipe"),
    h: open("hazard"),
    b: solid("broken"),
    D: open("door"),
  },
  ground: [
    "==============================",
    "#S#S#S#S#S#S#S#S#S#S#S#S#S#S##",
    "#............................#",
    "#.RR..RR..RR........RR..RR...#",
    "#.RR..RR..RR........RR..RR...#",
    "#............................#",
    "#-----------......-----------#",
    "#....xx......KKKK......xx....#",
    "#............................#",
    "#..pppp................pppp..#",
    "#.............hh.............#",
    "#............................#",
    "#.bb.....................bb..#",
    "#............................#",
    "#-----------......-----------#",
    "#..xx....................xx..#",
    "#............................#",
    "#............................#",
    "#............................#",
    "##############DD##############",
  ],
  npcs: [
    {
      id: "xboss",
      sprite: "xboss",
      x: 14,
      y: 8,
      dir: "up",
      hideIf: "xboss",
      talk: async (api) => {
        await api.say(
          "xboss",
          "¿Humanos? ¿Escribiendo a mano? Hace años que aquí todo lo postea una IA.",
        );
        await api.say(
          "xboss",
          "Yo me quedé a vigilar los servidores. Alguien tenía que leer lo que escriben las máquinas.",
        );
        await api.say(
          "stiles",
          "Buscamos al que necroposteó un hilo de 2005 en 2026. Creemos que vino de aquí.",
        );
        await api.say(
          "xboss",
          "Lagvos. Se entrenó con cada post del foro. Y su primer dato fue un bug de 2005.",
        );
        await api.say(
          "xboss",
          "Su guardiana, la IA Suprema, está bajo la trampilla. Voy con vosotros: conozco sus prompts.",
        );
        api.setFlag("xboss");
        await api.join("xboss");
      },
    },
    {
      id: "futuro-1",
      sprite: "npc-aldeano-1",
      x: 6,
      y: 11,
      wander: true,
      talk: (api) =>
        api.say(
          "aldeano",
          "Mi bot y el bot de mi vecino llevan seis años discutiendo en un hilo. Ninguno cede.",
        ),
    },
    {
      id: "futuro-2",
      sprite: "npc-aldeano-3",
      x: 23,
      y: 16,
      wander: true,
      talk: (api) =>
        api.say(
          "aldeano",
          "Antes había karma. Ahora hay métricas de engagement. Echo de menos el karma.",
        ),
    },
    {
      id: "zh3rox",
      sprite: "npc-zh3rox",
      x: 26,
      y: 5,
      dir: "down",
      talk: async (api) => {
        await api.say(
          "zh3rox",
          "Treinta años después sigo con la misma lista de juegos pendientes. Ha crecido un poco.",
        );
        await api.say(
          "zh3rox",
          "Por cierto, el vendedor de El Fin del Hilo tiene café doble. Llevad de sobra.",
        );
      },
    },
  ],
  warps: [
    {
      x: 14,
      y: 10,
      w: 2,
      to: "cueva",
      tx: 14,
      ty: 3,
      dir: "down",
      requires: "xboss",
      lockedText: "Una trampilla sellada. El panel pide credenciales de alguien de este año.",
    },
    { x: 14, y: 19, w: 2, to: "fin", tx: 9, ty: 8, dir: "up" },
  ],
  spawns: [
    { id: "s1", x: 5, y: 5, show: "alucinador", encounter: { enemies: ["alucinador", "clon"] } },
    { id: "s2", x: 24, y: 8, show: "captcha", encounter: { enemies: ["captcha", "captcha"] } },
    {
      id: "s3",
      x: 8,
      y: 13,
      show: "hilo-duplicado",
      encounter: { enemies: ["hilo-duplicado", "alucinador"] },
    },
    {
      id: "s4",
      x: 20,
      y: 16,
      show: "alucinador",
      encounter: { enemies: ["alucinador", "captcha", "hilo-duplicado"] },
    },
    { id: "s5", x: 3, y: 17, show: "clon", encounter: { enemies: ["clon", "clon", "captcha"] } },
  ],
  chests: [
    { id: "a", x: 28, y: 2, item: "cafe-doble", n: 2 },
    { id: "b", x: 1, y: 18, item: "desbaneo" },
  ],
  saves: [{ x: 17, y: 17 }],
  triggers: [],
  onEnter: async (api) => {
    if (api.flag("futuro-intro")) return;
    api.setFlag("futuro-intro");
    await api.wait(0.3);
    await api.say("stiles", "2036. No hay nadie escribiendo, pero los hilos se actualizan solos.");
    await api.say(
      "tute07011988",
      "Mira el contador de posts. Sube mil por segundo y nadie lo lee.",
    );
  },
};
