import type { ItemDef } from "./types";

export const ITEMS: Record<string, ItemDef> = {
  cafe: { id: "cafe", name: "Café", desc: "Recupera 60 PV.", kind: "hp", amount: 60, price: 10 },
  "cafe-doble": {
    id: "cafe-doble",
    name: "Café Doble",
    desc: "Recupera 200 PV.",
    kind: "hp",
    amount: 200,
    price: 40,
  },
  cerveza: {
    id: "cerveza",
    name: "Cerveza Quedada",
    desc: "Recupera 20 PM.",
    kind: "mp",
    amount: 20,
    price: 30,
  },
  desbaneo: {
    id: "desbaneo",
    name: "Desbaneo",
    desc: "Revive con 50% de PV.",
    kind: "revive",
    amount: 0.5,
    price: 80,
  },
  "maquina-bump": {
    id: "maquina-bump",
    name: "Pieza de la Máquina",
    desc: "Una pieza de la Máquina del Bump.",
    kind: "key",
    amount: 0,
    price: 0,
  },
};

export function itemDef(id: string): ItemDef | null {
  return ITEMS[id] ?? null;
}
