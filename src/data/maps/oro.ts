import type { MapDef, Script } from "../map-types";
import { open, solid } from "./legend";

const openMafia: Script = async (api) => {
  if (!api.flag("don_verde") || !api.flag("cryoned") || api.flag("mafia-open")) return;
  api.setFlag("mafia-open");
  await api.say(
    "don_verde",
    "Ya estamos todos. La mansión de Mafia abre a quien llega con su grupo completo.",
  );
  await api.say(
    "cryoned",
    "Yo me encargo de la cerradura. Es un modelo de 2011, se abre con pasta térmica y paciencia.",
  );
};

export const oro: MapDef = {
  id: "oro",
  name: "2011, La Edad de Oro",
  tileset: "oro",
  music: "oro",
  legend: {
    ".": open("grass"),
    ",": open("grass"),
    ":": open("path"),
    _: open("cobble"),
    "#": solid("wall"),
    "^": solid("roof"),
    r: solid("roof-edge"),
    D: open("door"),
    W: solid("window"),
    T: solid("tree", "tree-top"),
    H: solid("hedge"),
    F: solid("fence"),
    w: solid("water"),
  },
  ground: [
    "TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
    "T.^^^^^...^^^^^^^^^^...^^^^^.T",
    "T.rrrrr...rrrrrrrrrr...rrrrr.T",
    "T.#WDW#...#W#WDDW#W#...#WDW#.T",
    "T...:.....____::____.....:...T",
    "T,..:.....____::____.....:..,T",
    "T...::::::____::____::::::...T",
    "THHH:HHHHH....::....HHHHH:HHHT",
    "T...:.........::.........:...T",
    "T...:.........::.........:...T",
    "T...:.........::.........:...T",
    "T...::::::::::::::::::::::...T",
    "T...:.......ww::ww.......:...T",
    "T.T.:.......ww::ww.......:.T.T",
    "T...:.........::.........:...T",
    "TFFF:FFFFF....::....FFFFF:FFFT",
    "T...:.........::.........:...T",
    "T.T.::::::::::::::::::::::.T.T",
    "T......T......::......T......T",
    "T.............::.............T",
    "T.............::.............T",
    "TTTTTTTTTTTTTT::TTTTTTTTTTTTTT",
  ],
  npcs: [
    {
      id: "don_verde",
      sprite: "don_verde",
      x: 5,
      y: 10,
      dir: "down",
      hideIf: "don_verde",
      talk: async (api) => {
        await api.say(
          "don_verde",
          "¿Viajeros del tiempo? Aquí en 2011 eso no sorprende a nadie. Hay un hilo para todo.",
        );
        await api.say(
          "don_verde",
          "Lo que sí sorprende es que alguien se haya llevado el Banhammer. Banea a quien pasa por la puerta de la mansión.",
        );
        await api.say(
          "tute07011988",
          "Necesitamos entrar. El hilo que nos persigue empezó a torcerse aquí.",
        );
        await api.say(
          "don_verde",
          "Pues invito yo al café y vamos. Pero sin Cryoned no abrimos esa cerradura.",
        );
        api.setFlag("don_verde");
        await api.join("don_verde");
        await openMafia(api);
      },
    },
    {
      id: "cryoned",
      sprite: "cryoned",
      x: 24,
      y: 10,
      dir: "down",
      hideIf: "cryoned",
      talk: async (api) => {
        await api.say(
          "cryoned",
          "No me distraigáis, que tengo un procesador a cinco gigas y huele un poco a quemado.",
        );
        await api.say(
          "stiles",
          "Vamos a la mansión de Mafia a recuperar el Banhammer. ¿Te apuntas?",
        );
        await api.say("cryoned", "¿Hay enchufes? Entonces sí. Me traigo el soldador.");
        api.setFlag("cryoned");
        await api.join("cryoned");
        await openMafia(api);
      },
    },
    {
      id: "kaos",
      sprite: "npc-kaos",
      x: 18,
      y: 5,
      dir: "down",
      talk: async (api) => {
        if (api.flag("oro-boss")) {
          await api.say("kaos", "El Banhammer vuelve a su vitrina. Y esta vez con candado.");
          return;
        }
        await api.say(
          "kaos",
          "La puerta de la mansión está sellada. Dentro alguien juega a Mafia con el Banhammer de verdad.",
        );
        await api.say(
          "kaos",
          "Solo abre a grupos completos. Buscad a Don_Verde, al oeste, y a Cryoned, al este.",
        );
      },
    },
    {
      id: "jastro",
      sprite: "npc-jastro",
      x: 11,
      y: 8,
      dir: "down",
      talk: async (api) => {
        await api.say(
          "jastro",
          "Este año el foro va como un tiro. Los servidores aguantan, los hilos vuelan.",
        );
        await api.say(
          "jastro",
          "Si algo se rompe, ya sabéis: reiniciar, esperar y no abrir hilo de quejas. Bueno, abridlo.",
        );
      },
    },
    {
      id: "hda",
      sprite: "npc-hda",
      x: 20,
      y: 14,
      dir: "left",
      talk: async (api) => {
        await api.say(
          "hda",
          "Estoy puliendo la próxima versión del foro. Más rápida, más limpia, más bonita.",
        );
        await api.say(
          "hda",
          "Lo de los bots del hilo viejo no es un bug mío. Creo. Voy a mirar los logs.",
        );
      },
    },
    {
      id: "oro-1",
      sprite: "npc-aldeano-1",
      x: 8,
      y: 16,
      wander: true,
      talk: (api) =>
        api.say(
          "aldeano",
          "En Mafia anoche me lincharon el primer día. Era inocente. Siempre soy inocente.",
        ),
    },
    {
      id: "oro-2",
      sprite: "npc-aldeano-2",
      x: 20,
      y: 19,
      wander: true,
      talk: (api) =>
        api.say(
          "aldeano",
          "He visto un multicuenta hablando consigo mismo en tres hilos a la vez. Y se daba la razón.",
        ),
    },
    {
      id: "oro-3",
      sprite: "npc-aldeano-3",
      x: 2,
      y: 12,
      wander: true,
      talk: (api) =>
        api.say(
          "aldeano",
          "Vengo del subforo de Cine. Allí la regla es clara: el que hace spoiler, paga la ronda.",
        ),
    },
  ],
  warps: [
    {
      x: 14,
      y: 3,
      w: 2,
      to: "mafia",
      tx: 9,
      ty: 13,
      dir: "up",
      requires: "mafia-open",
      lockedText: "La puerta de la mansión está sellada. En la placa pone: solo grupos completos.",
    },
    {
      x: 4,
      y: 3,
      to: "oro",
      tx: 4,
      ty: 4,
      requires: "nunca",
      lockedText: "Sede de la FEDA: hoy hay quedada y no cabe nadie más.",
    },
    {
      x: 25,
      y: 3,
      to: "oro",
      tx: 25,
      ty: 4,
      requires: "nunca",
      lockedText: "Tienda de hardware: cerrado por inventario de gráficas.",
    },
    { x: 14, y: 21, w: 2, to: "fin", tx: 15, ty: 4, dir: "down" },
  ],
  spawns: [
    {
      id: "s1",
      x: 8,
      y: 9,
      show: "multicuenta",
      encounter: { enemies: ["multicuenta", "multicuenta"] },
    },
    { id: "s2", x: 21, y: 8, show: "flamer", encounter: { enemies: ["flamer", "troll"] } },
    {
      id: "s3",
      x: 9,
      y: 13,
      show: "reporton",
      encounter: { enemies: ["reporton", "multicuenta"] },
    },
    {
      id: "s4",
      x: 7,
      y: 19,
      show: "cuenta-rara",
      encounter: { enemies: ["cuenta-rara", "flamer", "spambot"] },
    },
    {
      id: "s5",
      x: 22,
      y: 12,
      show: "flamer",
      encounter: { enemies: ["flamer", "reporton", "cuenta-rara"] },
    },
  ],
  chests: [
    { id: "a", x: 1, y: 8, item: "cerveza", n: 2 },
    { id: "b", x: 28, y: 19, item: "cafe-doble" },
    { id: "c", x: 1, y: 20, item: "desbaneo" },
  ],
  saves: [{ x: 14, y: 16 }],
  triggers: [],
  onEnter: async (api) => {
    if (api.flag("oro-intro")) return;
    api.setFlag("oro-intro");
    await api.wait(0.3);
    await api.say(
      "stiles",
      "2011. Firmas con GIF, avatares de anime y hilos de cuarenta páginas. Qué tiempos.",
    );
    await api.say("tute07011988", "Y la mansión de Mafia, al norte. Ahí dentro pasa algo raro.");
  },
};
