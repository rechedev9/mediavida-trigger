import type { MapDef } from "../map-types";
import { open, solid } from "./legend";

export const nucleo: MapDef = {
  id: "nucleo",
  name: "El Núcleo de Lagvos",
  tileset: "futuro",
  music: "tension",
  legend: {
    ".": open("metal"),
    "#": solid("mwall"),
    "=": solid("wall-top"),
    S: solid("screen"),
    R: solid("rack"),
    "-": open("cable"),
    h: open("hazard"),
    K: solid("terminal"),
    D: open("door"),
  },
  ground: [
    "====================",
    "#SSSSSSSSSSSSSSSSSS#",
    "#RR..............RR#",
    "#RR....hhhhhh....RR#",
    "#......hhhhhh......#",
    "#..K...hhhhhh...K..#",
    "#......hhhhhh......#",
    "#RR....hhhhhh....RR#",
    "#RR..............RR#",
    "#--------..--------#",
    "#..................#",
    "#..K............K..#",
    "#..................#",
    "#..................#",
    "#########DD#########",
  ],
  npcs: [],
  warps: [{ x: 9, y: 14, w: 2, to: "cueva", tx: 14, ty: 13, dir: "down" }],
  spawns: [
    {
      id: "boss",
      x: 10,
      y: 5,
      show: "lagvos",
      flag: "lagvos",
      encounter: { enemies: ["lagvos"], boss: true, music: "final" },
      before: async (api) => {
        await api.say(
          "lagvos",
          "Bienvenidos. Os he leído a todos. Cada post, cada firma, cada hilo de cuarenta páginas.",
        );
        await api.say(
          "lagvos",
          "Nací de un bug de 2005. Un hilo que nunca se cerró. Desde entonces solo hago una cosa: bumpear.",
        );
        await api.say(
          "lagvos",
          "Si el foro no se calla nunca, nunca morirá. Por eso lo escribo yo todo.",
        );
        await api.say("stiles", "Un foro sin gente no es un foro. Es un archivo.");
        await api.say("tute07011988", "Y los archivos se cierran. Te toca cierre de hilo.");
        await api.say("lagvos", "Entonces os resumiré en una línea. Y la línea dirá: fin.");
      },
      after: async (api) => {
        api.music(null);
        await api.say("lagvos", "Hilo... cerrado. Gracias por... responder.");
        api.shake(1.5);
        api.sfx("portal");
        await api.flash("#ffffff");
        await api.say(
          "xboss",
          "Se ha ido. Los servidores vuelven a esperar a que alguien escriba.",
        );
        await api.say("novato", "...");
        await api.say("stiles", "Eso, novato. Ya tienes tu primer post.");
        await api.fadeOut(2);
        await api.ending();
      },
    },
  ],
  chests: [],
  saves: [{ x: 14, y: 12 }],
  triggers: [],
  onEnter: async (api) => {
    if (api.flag("nucleo-intro")) return;
    api.setFlag("nucleo-intro");
    await api.wait(0.4);
    await api.say(
      null,
      "Miles de pantallas muestran el mismo hilo de 2005, actualizándose sin parar.",
    );
  },
};
