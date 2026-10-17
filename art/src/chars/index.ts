import type { CharDef } from "../types";
import { CRYONED } from "./cryoned";
import { DON_VERDE } from "./don-verde";
import { MYSTEE } from "./mystee";
import { NOVATO } from "./novato";
import { NPC_ALDEANO_1, NPC_ALDEANO_2, NPC_ALDEANO_3 } from "./npc-aldeanos";
import { NPC_EKEIX } from "./npc-ekeix";
import { NPC_HDA } from "./npc-hda";
import { NPC_JASTRO } from "./npc-jastro";
import { NPC_KABRAXIS } from "./npc-kabraxis";
import { NPC_KAOS } from "./npc-kaos";
import { NPC_VENDEDOR } from "./npc-vendedor";
import { NPC_VIEJO_MOD } from "./npc-viejo-mod";
import { NPC_ZH3ROX } from "./npc-zh3rox";
import { STILES } from "./stiles";
import { TUTE } from "./tute";
import { XBOSS } from "./xboss";

export const CHARACTERS: readonly CharDef[] = [
  NOVATO,
  STILES,
  TUTE,
  DON_VERDE,
  CRYONED,
  MYSTEE,
  XBOSS,
  NPC_VIEJO_MOD,
  NPC_KABRAXIS,
  NPC_JASTRO,
  NPC_HDA,
  NPC_KAOS,
  NPC_EKEIX,
  NPC_ZH3ROX,
  NPC_VENDEDOR,
  NPC_ALDEANO_1,
  NPC_ALDEANO_2,
  NPC_ALDEANO_3,
];
