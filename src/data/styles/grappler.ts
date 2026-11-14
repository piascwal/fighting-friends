/* LUTTEUR : lent mais très résistant. Ses prises sont imparables (on ne peut pas les bloquer, seulement
   les éviter en sautant ou en restant hors de portée) et font très mal. */
import { hit, moveSet, special, superMove } from '../move-builders';
import { NORMALS } from '../normals';
import type { StyleDef } from '../types';

const bearHug = (heavy: boolean) =>
  special({
    name: "Prise d'ours",
    total: heavy ? 38 : 34,
    sprite: 'sp_grab',
    anim: [
      [0, 'windP', 0.9],
      [3, 'grab', 1],
      [24, 'idle', 0.35],
    ],
    vel: [[2, 6, heavy ? 7 : 5]],
    hits: [
      hit(5, 4, [0, -180, heavy ? 88 : 72, 150], heavy ? 170 : 150, {
        grab: true,
        launch: [6, -12],
        kb: 8,
        fx: 'heavy',
        stop: 18,
        sw: 'side',
      }),
    ],
  });

/** Bondit et s'écrase de tout son poids : passe au-dessus des projectiles, se bloque debout. */
const bodySplash = (heavy: boolean) =>
  special({
    name: 'Plongeon',
    total: 60,
    landRec: 14,
    sprite: 'sp_body_splash',
    anim: [
      [0, 'windU', 0.9],
      [5, 'splash', 1],
    ],
    imp: [5, heavy ? 7 : 5, -17],
    hits: [
      hit(8, 30, [-20, -120, 120, 110], heavy ? 120 : 100, {
        lvl: 'high',
        launch: [4, -7],
        fx: 'heavy',
        bs: 18,
        kb: 6,
        sw: 'down',
        stop: 12,
      }),
    ],
  });

/** Super : saisie, deux projections au sol, puis un dernier envoi en l'air. */
const titanSuplex = () =>
  superMove({
    name: 'SUPLEX TITAN',
    total: 64,
    sprite: 'sp_grab',
    anim: [
      [0, 'charge', 0.8],
      [4, 'grab', 1],
      [14, 'slam', 1],
      [24, 'grab', 1],
      [34, 'slam', 1],
      [50, 'idle', 0.3],
    ],
    shakeAt: 16,
    hits: [
      hit(6, 4, [0, -190, 95, 160], 40, { grab: true, hs: 60, kb: 0, fx: 'heavy', stop: 10 }),
      hit(16, 3, [-40, -200, 160, 200], 60, { hs: 60, kb: 0, fx: 'earth', stop: 10, sw: 'down' }),
      hit(26, 3, [-40, -200, 160, 200], 60, { hs: 60, kb: 0, fx: 'earth', stop: 10, sw: 'down' }),
      hit(36, 4, [-40, -210, 160, 210], 120, { launch: [3, -18], fx: 'earth', stop: 16, sw: 'up' }),
    ],
  });

export const grappler: StyleDef = {
  id: 'grappler',
  label: 'Lutteur',
  hint: 'Prises imparables, plongeon écrasant',
  stats: { hp: 1200, speed: 3.7, jump: 22, power: 1.15 },
  names: { s1: "Prise d'ours", s2: 'Plongeon', super: 'SUPLEX TITAN' },
  moves: moveSet({
    ...NORMALS,
    s1l: bearHug(false),
    s1h: bearHug(true),
    s2l: bodySplash(false),
    s2h: bodySplash(true),
    super: titanSuplex(),
  }),
  ai: { zoner: 0, antiAir: 'chp', ender: 's1h' },
};
