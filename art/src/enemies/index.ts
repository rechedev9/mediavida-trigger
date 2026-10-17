import type { EnemyDef } from "../types";
import { SPAMBOT } from "./spambot";
import { TROLL } from "./troll";
import { CLON } from "./clon";
import { MULTICUENTA } from "./multicuenta";
import { FLAMER } from "./flamer";
import { CUENTA_RARA } from "./cuenta-rara";
import { ALUCINADOR } from "./alucinador";
import { REPORTON } from "./reporton";
import { CAPTCHA } from "./captcha";
import { HILO_DUPLICADO } from "./hilo-duplicado";
import { GRAN_TROLL } from "./gran-troll";
import { BANHAMMER } from "./banhammer";
import { IA_SUPREMA } from "./ia-suprema";
import { LAGVOS } from "./lagvos";

export const ENEMIES: readonly EnemyDef[] = [
  SPAMBOT,
  TROLL,
  CLON,
  MULTICUENTA,
  FLAMER,
  CUENTA_RARA,
  ALUCINADOR,
  REPORTON,
  CAPTCHA,
  HILO_DUPLICADO,
  GRAN_TROLL,
  BANHAMMER,
  IA_SUPREMA,
  LAGVOS,
];
