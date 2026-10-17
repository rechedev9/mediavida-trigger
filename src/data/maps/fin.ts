import type { MapDef } from "../map-types";
import { open, solid } from "./legend";

export const fin: MapDef = {
  id: "fin",
  name: "El Fin del Hilo",
  tileset: "fin",
  music: "fin",
  legend: {
    v: solid("void"),
    _: open("platform"),
    E: solid("edge"),
    I: solid("pillar"),
    o: open("pad"),
    L: solid("lamp"),
    c: solid("cliff"),
  },
  ground: [
    "vvvvvvvvvvvvvvvvvvvv",
    "vvEEEEEEEEEEEEEEEEvv",
    "vvEI_I__I_I___I_IEvv",
    "vvE_o____o_____o_Evv",
    "vvE______________Evv",
    "vvE_L__________L_Evv",
    "vvE______________Evv",
    "vvE______________Evv",
    "vvE______________Evv",
    "vvE______o_______Evv",
    "vvE______________Evv",
    "vvEEEEEEEEEEEEEEEEvv",
    "vvccccccccccccccccvv",
  ],
  npcs: [
    {
      id: "viejo-mod",
      sprite: "npc-viejo-mod",
      x: 12,
      y: 6,
      dir: "down",
      talk: async (api) => {
        api.healParty();
        api.sfx("heal");
        await api.say(
          "viejo-mod",
          "Descansad un poco. Aquí el tiempo no pasa: es el hilo que nadie respondió nunca.",
        );
        if (!api.flag("oro-boss")) {
          await api.say(
            "viejo-mod",
            "El portal de la derecha lleva a 2011, la edad de oro. Alguien ha sacado el Banhammer de su vitrina.",
          );
          await api.say(
            "viejo-mod",
            "Buscad a Don_Verde y a Cryoned. Sin ellos no entraréis en la mansión de Mafia.",
          );
        } else if (!api.flag("ia-boss")) {
          await api.say(
            "viejo-mod",
            "El portal de abajo ya responde. Lleva a 2036. Lo que necroposteó el hilo vive allí.",
          );
        } else {
          await api.say(
            "viejo-mod",
            "Ya sabéis dónde está Lagvos. Bajad por el futuro, la escalera de la cueva os espera.",
          );
        }
      },
    },
    {
      id: "kabraxis",
      sprite: "npc-kabraxis",
      x: 6,
      y: 8,
      dir: "right",
      talk: async (api) => {
        await api.say(
          "kabraxis",
          "Cada portal es una época del foro. Yo los vi abrirse todos, uno por uno.",
        );
        await api.say("kabraxis", "Cuidad la casa, ¿eh? Que la montamos con mucho cariño.");
      },
    },
    {
      id: "vendedor",
      sprite: "npc-vendedor",
      x: 14,
      y: 8,
      dir: "left",
      talk: async (api) => {
        await api.say(
          "vendedor",
          "Hasta en el fin del hilo hay que comer. Acepto karma de cualquier año.",
        );
        await api.shop(["cafe", "cafe-doble", "cerveza", "desbaneo"]);
      },
    },
  ],
  warps: [
    { x: 4, y: 3, to: "plaza", tx: 14, ty: 5, dir: "down" },
    { x: 9, y: 3, to: "lan", tx: 14, ty: 17, dir: "up" },
    { x: 15, y: 3, to: "oro", tx: 14, ty: 19, dir: "up" },
    {
      x: 9,
      y: 9,
      to: "futuro",
      tx: 14,
      ty: 17,
      dir: "up",
      requires: "oro-boss",
      lockedText: "El portal no responde. Parece que espera a que pase algo en otra época.",
    },
  ],
  spawns: [],
  chests: [{ id: "a", x: 16, y: 10, item: "cafe-doble" }],
  saves: [{ x: 9, y: 7 }],
  triggers: [],
  onEnter: async (api) => {
    if (api.flag("fin-intro")) return;
    api.setFlag("fin-intro");
    await api.wait(0.3);
    await api.say(
      "viejo-mod",
      "Bienvenidos a El Fin del Hilo. Desde aquí se llega a cualquier época del foro.",
    );
    await api.say(
      "viejo-mod",
      "El portal de la izquierda vuelve a 2026. El del centro, a la LAN. El de la derecha, a 2011.",
    );
    await api.say("stiles", "¿Y el de abajo?");
    await api.say("viejo-mod", "Ese todavía no. Hablad conmigo si necesitáis descansar.");
  },
};
