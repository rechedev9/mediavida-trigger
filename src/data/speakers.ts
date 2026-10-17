import { PARTY } from "./party";

export type Speaker = { name: string; face: string | null; color: string };

const NPCS: Record<string, Speaker> = {
  "viejo-mod": { name: "El Viejo Mod", face: "npc-viejo-mod", color: "#a8a8b0" },
  kabraxis: { name: "Kabraxis", face: "npc-kabraxis", color: "#c89058" },
  jastro: { name: "Jastro", face: "npc-jastro", color: "#5888c8" },
  hda: { name: "hda", face: "npc-hda", color: "#6890a0" },
  kaos: { name: "Kaos", face: "npc-kaos", color: "#a04040" },
  ekeix: { name: "ekeix", face: "npc-ekeix", color: "#d0a040" },
  zh3rox: { name: "Zh3RoX", face: "npc-zh3rox", color: "#4878a8" },
  vendedor: { name: "Vendedor", face: "npc-vendedor", color: "#a07850" },
  aldeano: { name: "Forero", face: null, color: "#908070" },
  lagvos: { name: "Lagvos", face: null, color: "#d84898" },
  ia: { name: "IA Suprema", face: null, color: "#48d8e8" },
  sistema: { name: "", face: null, color: "#ffffff" },
};

export function speaker(id: string): Speaker {
  const npc = NPCS[id];
  if (npc) return npc;
  const m = PARTY.find((p) => p.id === id);
  if (m) return { name: m.name, face: m.id, color: m.color };
  return { name: id, face: null, color: "#908070" };
}
