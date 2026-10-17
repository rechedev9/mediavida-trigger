import type { MapDef } from "../map-types";
import { open, solid } from "./legend";

const LOCKED = "Está cerrado. Todo el mundo está en la feria.";

export const plaza: MapDef = {
  id: "plaza",
  name: "2026, La Plaza del Pueblo",
  tileset: "plaza",
  music: "plaza",
  legend: {
    ".": open("grass"),
    ",": open("grass-flower"),
    ":": open("path"),
    _: open("stone"),
    "#": solid("wall"),
    "^": solid("roof"),
    D: open("door"),
    W: solid("window"),
    T: solid("tree", "tree-top"),
    B: solid("bush"),
    F: solid("fence"),
    C: solid("counter", "awning"),
    L: solid("lamp"),
    O: solid("fountain"),
    S: solid("sign"),
    b: solid("banner"),
  },
  ground: [
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
    "T.^^^^^^..^^^^^^^^^^..^^^^^^.T",
    "T.^^^^^^..^^^^^^^^^^..^^^^^^.T",
    "T.##D#W#..#W##W##W#W..##D#W#.T",
    "T...:.....::::S:::::....:....T",
    "T,..:..L..:________:..L.:..,.T",
    "T...:::::::________:::::::...T",
    "T.B.:.....:___OO___:....:..B.T",
    "T...:.CCC.:___OO___:CCC.:....T",
    "T...:.....:________:....:....T",
    "T.,.:.....::::::::::....:..,.T",
    "T...:::::::::::::::::::::....T",
    "T.T.:..CCC....::....CCC.:..T.T",
    "T...:.........::........:....T",
    "T.,.:..S..L...::...L..b.:..,.T",
    "T...:::::::::::::::::::::....T",
    "TFFF.........::::.........FFFT",
    "T.T....,.....::::....,.....T.T",
    "T............::::............T",
    "T..B....T....::::....T....B..T",
    "T............::::............T",
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
  ],
  npcs: [
    {
      id: "stiles",
      sprite: "stiles",
      x: 15,
      y: 16,
      dir: "down",
      hideIf: "stiles",
    },
    {
      id: "tute07011988",
      sprite: "tute07011988",
      x: 7,
      y: 7,
      dir: "down",
      hideIf: "tute",
      talk: async (api) => {
        if (!api.flag("stiles")) {
          await api.say(
            "tute07011988",
            "¡Bienvenido al puesto del Club de la Hucha! Aquí se ahorra hasta el aliento.",
          );
          return;
        }
        await api.say("tute07011988", "¡Hombre, STILES! ¿Y este quién es?");
        await api.say(
          "stiles",
          "Un novato. Le llevo a ver el hilo de 2005 que han expuesto en la Sede.",
        );
        await api.say(
          "tute07011988",
          "Voy con vosotros. Ese hilo lo bumpeé yo en 2011 y todavía no sé por qué.",
        );
        api.setFlag("tute");
        await api.join("tute07011988");
      },
    },
    {
      id: "vendedor",
      sprite: "npc-vendedor",
      x: 21,
      y: 7,
      dir: "down",
      talk: async (api) => {
        await api.say(
          "vendedor",
          "Cafés, cervezas de quedada y desbaneos. Se paga en karma, como siempre.",
        );
        await api.shop(["cafe", "cerveza", "desbaneo"]);
      },
    },
    {
      id: "ekeix",
      sprite: "npc-ekeix",
      x: 21,
      y: 11,
      dir: "down",
      talk: async (api) => {
        await api.say(
          "ekeix",
          "Puesto de cine. Hoy echamos el maratón de los hilos de estrenos. Palomitas gratis si no haces spoilers.",
        );
        if (api.flag("stiles")) await api.say("stiles", "No prometo nada.");
      },
    },
    {
      id: "vitrina",
      sprite: null,
      x: 14,
      y: 4,
      talk: async (api) => {
        if (!api.flag("stiles") || !api.flag("tute")) {
          await api.say(
            null,
            "Una vitrina con un hilo impreso: «Parejas de Media-Vida», 2005. Una nota dice: no tocar.",
          );
          return;
        }
        if (api.flag("portal1")) {
          const r = await api.choose({
            who: null,
            text: "El hilo sigue abierto como un portal. ¿Saltar dentro?",
            choices: ["Saltar", "Ahora no"],
          });
          if (r === 0) {
            api.sfx("portal");
            await api.warp({
              map: api.flag("lan-boss") ? "fin" : "lan",
              x: api.flag("lan-boss") ? 9 : 14,
              y: api.flag("lan-boss") ? 6 : 17,
              dir: "up",
            });
          }
          return;
        }
        await api.say(null, "La vitrina guarda un hilo impreso de 2005: «Parejas de Media-Vida».");
        await api.say(
          "stiles",
          "Mira la fecha del último post... ¡es de hoy! Alguien lo acaba de necropostear.",
        );
        api.shake(0.6);
        api.sfx("portal");
        await api.flash("#a0c8ff");
        await api.say(null, "¡Del hilo salen spambots!");
        await api.battle({ enemies: ["spambot", "spambot"] });
        await api.say("tute07011988", "Esto no es normal. Los hilos viejos no escupen bots.");
        api.shake(1);
        api.sfx("portal");
        await api.flash("#ffffff");
        await api.say(null, "El hilo se abre como un portal y os traga a los tres.");
        api.setFlag("portal1");
        await api.warp({ map: "lan", x: 14, y: 17, dir: "up" });
      },
    },
    {
      id: "aldeano-1",
      sprite: "npc-aldeano-1",
      x: 9,
      y: 13,
      wander: true,
      talk: (api) =>
        api.say(
          "aldeano",
          "Mi novia me ha dejado por un reptiliano. Lo conté en OFF-Topic y ya van cuarenta páginas.",
        ),
    },
    {
      id: "aldeano-2",
      sprite: "npc-aldeano-2",
      x: 20,
      y: 17,
      wander: true,
      talk: (api) =>
        api.say(
          "aldeano",
          "En el subforo de WoW dicen que lo dejan cuando quieran. Lo dicen desde 2005.",
        ),
    },
    {
      id: "aldeano-3",
      sprite: "npc-aldeano-3",
      x: 2,
      y: 13,
      wander: true,
      talk: (api) =>
        api.say(
          "aldeano",
          "¿Con qué subforo soñaste ayer? Yo con el de Mafia. Noche tranquila, decían.",
        ),
    },
    {
      id: "aldeano-4",
      sprite: "npc-aldeano-1",
      x: 26,
      y: 13,
      wander: true,
      talk: (api) =>
        api.say(
          "aldeano",
          "Hard-soft tiene un lema: si funciona, no lo toques. Hoy alguien ha tocado algo, se nota.",
        ),
    },
    {
      id: "aldeano-5",
      sprite: "npc-aldeano-2",
      x: 10,
      y: 18,
      wander: true,
      talk: (api) =>
        api.say(
          "aldeano",
          "En Desarrollo de juegos todo está en fase beta. Este juego también, probablemente.",
        ),
    },
    {
      id: "aldeano-6",
      sprite: "npc-aldeano-3",
      x: 18,
      y: 9,
      wander: true,
      talk: (api) =>
        api.say(
          "aldeano",
          "Dicen que en el MVPremium la plaza del pueblo siempre tiene sitio. Hoy no cabe ni un alfiler.",
        ),
    },
  ],
  warps: [
    { x: 4, y: 3, to: "plaza", tx: 4, ty: 4, requires: "nunca", lockedText: LOCKED },
    { x: 24, y: 3, to: "plaza", tx: 24, ty: 4, requires: "nunca", lockedText: LOCKED },
  ],
  spawns: [],
  chests: [
    { id: "a", x: 1, y: 19, item: "cafe", n: 2 },
    { id: "b", x: 28, y: 5, item: "cerveza" },
  ],
  saves: [{ x: 14, y: 13 }],
  triggers: [],
  onEnter: async (api) => {
    if (api.flag("intro")) return;
    api.setFlag("intro");
    await api.say(
      null,
      "Mediavida, 2026. El foro cumple 27 años y lo celebra con una feria en la Plaza del Pueblo.",
    );
    await api.say(null, "Acabas de registrarte. Tu rango: Inocente.");
    await api.npcWalk("stiles", ["down", "down"]);
    await api.say("stiles", "¡Eh, tú! ¿Novato? Se te nota en el avatar por defecto.");
    await api.say(
      "stiles",
      "Soy STILES. Llevo aquí desde que esto se llamaba Media-Vida, con guion y todo.",
    );
    await api.say(
      "stiles",
      "Ven, te enseño la feria. En la Sede, al norte, han expuesto el hilo más antiguo del foro.",
    );
    await api.say(
      "stiles",
      "Ah, y tute07011988 tiene puesto propio. Pásate a saludar, que si no se ofende.",
    );
    api.setFlag("stiles");
    await api.join("stiles");
  },
};
