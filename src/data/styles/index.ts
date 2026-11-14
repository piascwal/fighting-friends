/* Registre des styles de combat. Ajouter un style = un nouveau fichier + une ligne ici
   (+ son id dans StyleId, et son pantin par défaut dans looks.ts). */
import type { StyleDef, StyleId } from '../types';
import { acrobat } from './acrobat';
import { balanced } from './balanced';
import { boxer } from './boxer';
import { counter } from './counter';
import { drunken } from './drunken';
import { fast } from './fast';
import { grappler } from './grappler';
import { heavy } from './heavy';
import { ice } from './ice';
import { kicker } from './kicker';
import { storm } from './storm';
import { tech } from './tech';

export { DEFAULT_LOOKS } from './looks';

export const STYLES: Record<StyleId, StyleDef> = {
  balanced,
  fast,
  heavy,
  tech,
  grappler,
  counter,
  ice,
  acrobat,
  boxer,
  kicker,
  storm,
  drunken,
};
export const STYLE_LIST: readonly StyleDef[] = Object.values(STYLES);
