import type { MapDef } from "../map-types";
import { open, solid } from "./legend";

export const lan: MapDef = {
  id: "lan",
  name: "2005, Media-Vida: Era de los Clanes",
  tileset: "lan",
  music: "lan",
  legend: {
    ".": open("floor"),
    ",": open("carpet"),
    "#": solid("wall"),
    "=": solid("wall-top"),
    P: solid("desk-pc"),
    d: solid("desk"),
    h: open("chair"),
    "-": open("cable"),
    p: solid("poster"),
    D: open("door"),
    K: solid("crt"),
    R: solid("server"),
    X: solid("crate"),
    Q: solid("bar"),
    s: open("stage"),
  },
  ground: [
    "==============================",
    "#p###p####pp######pp####p###p#",
    "#......ssssssssssssssss......#",
    "#.XX...ssssssssssssssss...RR.#",
    "#......ssssssssssssssss...RR.#",
    "#............................#",
    "#.PPPP.PPPP.........PPPP.QQQ.#",
    "#.hhhh.hhhh.........hhhh.....#",
    "#...........,,,,,,.........Q.#",
    "#.PPPP.PPPP.,,,,,,..PPPP..KQ.#",
    "#.hhhh.hhhh.,,,,,,..hhhh...Q.#",
    "#...........,,,,,,...........#",
    "#.PPPP.PPPP.,,,,,,..PPPP.....#",
    "#.hhhh.hhhh.,,,,,,..hhhh..X..#",
    "#-----------,,,,,,-----------#",
    "#...........,,,,,,...........#",
    "#.XX........,,,,,,........XX.#",
    "#...........,,,,,,...........#",
    "#...........,,,,,,...........#",
    "##############DD##############",
  ],
  npcs: [
    {
      id: "mystee",
      sprite: "mystee",
      x: 8,
      y: 10,
      dir: "up",
      hideIf: "mystee",
      talk: async (api) => {
        await api.say(
          "mystee",
          "¿Gente nueva? Llevamos tres horas sin jugar. El troll del escenario ha tumbado el servidor.",
        );
        await api.say(
          "mystee",
          "Dice que es el dueño del hilo y que nadie juega hasta que le den la razón.",
        );
        await api.say(
          "stiles",
          "Ese hilo es el que alguien ha necroposteado en 2026. Si lo cerramos aquí, a lo mejor se arregla todo.",
        );
        await api.say("mystee", "Pues os acompaño. Con el AWP no fallo ni con doscientos de ping.");
        api.setFlag("mystee");
        await api.join("mystee");
        await api.say(null, "Consejo: en el menú (C), Formación, puedes elegir quién lucha.");
      },
    },
    {
      id: "zh3rox",
      sprite: "npc-zh3rox",
      x: 21,
      y: 13,
      dir: "up",
      talk: async (api) => {
        await api.say(
          "zh3rox",
          "Estoy probando un juego nuevo que ha salido este año. Bueno, intentándolo, que el servidor no va.",
        );
        await api.say(
          "zh3rox",
          "Cuando acabe la LAN abro hilo con mi opinión. Tres páginas, mínimo.",
        );
      },
    },
    {
      id: "vendedor",
      sprite: "npc-vendedor",
      x: 26,
      y: 7,
      dir: "down",
      talk: async (api) => {
        await api.say(
          "vendedor",
          "Bienvenido a la barra. Aquí se habla por IRC aunque estemos a dos metros.",
        );
        await api.shop(["cafe", "cerveza", "desbaneo"]);
      },
    },
    {
      id: "lan-1",
      sprite: "npc-aldeano-1",
      x: 3,
      y: 7,
      dir: "up",
      talk: (api) => api.say("aldeano", "Que nadie baje nada, que va lento. ¡Que nadie baje nada!"),
    },
    {
      id: "lan-2",
      sprite: "npc-aldeano-2",
      x: 9,
      y: 13,
      dir: "up",
      talk: (api) =>
        api.say(
          "aldeano",
          "Nuestro clan tiene web propia, foro propio y canal de IRC. Somos cuatro.",
        ),
    },
    {
      id: "lan-3",
      sprite: "npc-aldeano-3",
      x: 22,
      y: 7,
      dir: "up",
      talk: (api) =>
        api.say(
          "aldeano",
          "Esto se llama Media-Vida, con guion. Dicen que algún día le quitarán el guion. Imposible.",
        ),
    },
    {
      id: "lan-4",
      sprite: "npc-aldeano-1",
      x: 5,
      y: 15,
      wander: true,
      talk: (api) =>
        api.say(
          "aldeano",
          "He traído la torre, el CRT de diecinueve pulgadas y el bocadillo. Lo básico.",
        ),
    },
    {
      id: "viejo-mod",
      sprite: "npc-viejo-mod",
      x: 15,
      y: 6,
      dir: "down",
      showIf: "lan-boss",
      talk: async (api) => {
        await api.say("viejo-mod", "La puerta de abajo lleva a El Fin del Hilo. Os espero allí.");
      },
    },
  ],
  warps: [
    {
      x: 14,
      y: 19,
      w: 2,
      to: "fin",
      tx: 9,
      ty: 6,
      dir: "up",
      requires: "lan-boss",
      lockedText: "La puerta está cerrada. Nadie sale de la LAN hasta que acabe la partida.",
    },
  ],
  spawns: [
    { id: "s1", x: 5, y: 5, show: "spambot", encounter: { enemies: ["spambot", "troll"] } },
    { id: "s2", x: 15, y: 9, show: "clon", encounter: { enemies: ["clon", "spambot"] } },
    { id: "s3", x: 22, y: 11, show: "troll", encounter: { enemies: ["troll", "clon", "spambot"] } },
    { id: "s4", x: 4, y: 17, show: "troll", encounter: { enemies: ["troll", "troll"] } },
    {
      id: "s5",
      x: 24,
      y: 17,
      show: "spambot",
      encounter: { enemies: ["spambot", "spambot", "spambot"] },
    },
    {
      id: "boss",
      x: 15,
      y: 3,
      show: "gran-troll",
      flag: "lan-boss",
      encounter: { enemies: ["gran-troll"], boss: true },
      before: async (api) => {
        await api.say(
          null,
          "Gran Troll: ¿Venís a darme la razón? Este hilo es MÍO. Lo abrí yo, lo bumpeo yo.",
        );
        await api.say("tute07011988", "Venimos a cerrarlo, que en 2026 nos está lloviendo spam.");
        await api.say(null, "Gran Troll: ¡Pues que llueva! ¡Zasca!");
      },
      after: async (api) => {
        await api.say(null, "El Gran Troll se deshace en mensajes borrados.");
        api.sfx("portal");
        await api.flash("#c0d0ff");
        api.setFlag("lan-boss");
        await api.say(
          "viejo-mod",
          "Bien hecho. Modero desde 1999 y nunca había visto un necroposteo así.",
        );
        await api.say(
          "viejo-mod",
          "Esto no ha acabado. Os espero en El Fin del Hilo, adonde van los hilos que nadie responde.",
        );
        await api.say("viejo-mod", "La puerta de abajo ya está abierta.");
      },
    },
  ],
  chests: [
    { id: "a", x: 1, y: 5, item: "cafe", n: 2 },
    { id: "b", x: 28, y: 11, item: "desbaneo" },
    { id: "c", x: 28, y: 2, item: "cerveza" },
  ],
  saves: [{ x: 16, y: 16 }],
  triggers: [],
  onEnter: async (api) => {
    if (api.flag("lan-intro")) return;
    api.setFlag("lan-intro");
    await api.wait(0.3);
    await api.say("stiles", "¿Esto es... una LAN? Huele a CRT y a bocadillo de chorizo.");
    await api.say("tute07011988", "Mira las pantallas: IRC por todas partes. ¡Estamos en 2005!");
    await api.say(
      "stiles",
      "Y en el escenario hay un troll enorme. Seguro que tiene algo que ver con el hilo.",
    );
  },
};
