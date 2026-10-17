import type { MapDef } from "../map-types";
import { cueva } from "./cueva";
import { fin } from "./fin";
import { futuro } from "./futuro";
import { lan } from "./lan";
import { mafia } from "./mafia";
import { nucleo } from "./nucleo";
import { oro } from "./oro";
import { plaza } from "./plaza";

export const MAPS: Readonly<Record<string, MapDef>> = {
  plaza,
  lan,
  fin,
  oro,
  mafia,
  futuro,
  cueva,
  nucleo,
};

export function mapDef(id: string): MapDef {
  const m = MAPS[id];
  if (!m) throw new Error(`Unknown map: ${id}`);
  return m;
}
