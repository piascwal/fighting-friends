/* Petits constructeurs pour écrire les coups de façon compacte et lisible. */
import type { Box, HitDef, MoveDef, MoveId, MoveSet } from './types';

/** Une frappe : frame de début, durée, zone, dégâts, puis ce qui diffère des valeurs par défaut. */
export function hit(t: number, d: number, box: Box, dmg: number, extra: Partial<HitDef> = {}): HitDef {
  return { t, d, box, dmg, hs: 16, bs: 11, kb: 5, lvl: 'mid', fx: 'punch', ...extra };
}

export type MoveSpec = Omit<MoveDef, 'id'>;

/** Coup spécial : annulable depuis un coup normal, annulable en super. */
export function special(spec: Omit<MoveSpec, 'rank'>): MoveSpec {
  return { rank: 10, sfx: 'special', ...spec };
}

/** Super : coûte toute la jauge et déclenche l'arrêt sur image. */
export function superMove(spec: Omit<MoveSpec, 'rank'>): MoveSpec {
  return { rank: 20, cost: 100, flash: true, trail: true, sfx: 'super', ...spec };
}

/** Ajoute à chaque coup son identifiant (la clé sous laquelle il est rangé). */
export function moveSet(specs: Record<MoveId, MoveSpec>): MoveSet {
  const out = {} as MoveSet;
  for (const id of Object.keys(specs) as MoveId[]) out[id] = { id, ...specs[id] };
  return out;
}
