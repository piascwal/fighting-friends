/* PADEL : coups normaux à mains nues, mais ses coups spéciaux se jouent à la raquette : balle tendue qui
   traverse l'écran, smash sauté qui s'abat sur la garde, et une rafale de balles en super. */
import { hit, moveSet, special, superMove } from '../move-builders';
import { NORMALS } from '../normals';
import type { StyleDef } from '../types';

/** Volée : la balle part très vite, tendue, à hauteur de poitrine. */
const volley = (heavy: boolean) =>
  special({
    name: 'Volée',
    total: heavy ? 34 : 30,
    sprite: 'sp_racket_drive',
    anim: [
      [0, 'windP', 0.9],
      [6, 'racketDrive', 1],
      [24, 'idle', 0.35],
    ],
    proj: {
      t: 8,
      look: 'ball',
      sprite: 'pj_padel_ball',
      vx: heavy ? 19 : 15,
      y: -125,
      w: 30,
      h: 30,
      dmg: heavy ? 65 : 55,
      hs: 18,
      bs: 12,
      kb: 6,
      fx: 'punch',
    },
  });

/** Smash : bondit et frappe vers le bas à la raquette. Se bloque debout. */
const smash = (heavy: boolean) =>
  special({
    name: 'Smash',
    total: 52,
    landRec: 12,
    sprite: 'sp_racket_smash',
    anim: [
      [0, 'windU', 0.9],
      [5, 'racketSmash', 1],
    ],
    imp: [5, heavy ? 7 : 5, -15],
    hits: [
      hit(12, 16, [0, -210, 120, 190], heavy ? 105 : 90, {
        lvl: 'high',
        launch: [6, 4],
        fx: 'heavy',
        sw: 'down',
        kb: 8,
        stop: 14,
      }),
    ],
  });

/** Super : une rafale de balles enchaînées, la dernière envoie au tapis. */
const porTres = () =>
  superMove({
    name: 'POR TRES',
    total: 64,
    sprite: 'sp_racket_drive',
    anim: [
      [0, 'charge', 0.8],
      [8, 'racketDrive', 1],
      [16, 'windP', 1],
      [22, 'racketDrive', 1],
      [50, 'idle', 0.3],
    ],
    proj: {
      t: 12,
      look: 'ball',
      sprite: 'pj_padel_ball',
      vx: 9,
      y: -125,
      w: 70,
      h: 60,
      dmg: 45,
      hits: 5,
      hs: 22,
      bs: 10,
      kb: 2,
      fx: 'heavy',
      launchLast: [7, -12],
    },
  });

export const padel: StyleDef = {
  id: 'padel',
  label: 'Padel',
  hint: 'Balle tendue, smash sauté, rafale de balles',
  archetype: 'Zoneur',
  tags: ['Projectile', 'Casse-garde', 'Multi-coups'],
  stats: { hp: 1000, speed: 4.6, jump: 24, power: 1 },
  names: { s1: 'Volée', s2: 'Smash', super: 'POR TRES' },
  moves: moveSet({
    ...NORMALS,
    s1l: volley(false),
    s1h: volley(true),
    s2l: smash(false),
    s2h: smash(true),
    super: porTres(),
  }),
  ai: { zoner: 0.5, antiAir: 'chp', ender: 's2h' },
};
