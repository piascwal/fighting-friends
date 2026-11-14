/* ÉQUILIBRÉ : un projectile pour tenir à distance, un uppercut invincible pour punir les sauts. */
import { hit, moveSet, special, superMove } from '../move-builders';
import { NORMALS } from '../normals';
import type { StyleDef } from '../types';

const fireball = (heavy: boolean) =>
  special({
    name: 'Boule de feu',
    total: 34,
    sprite: 'sp_energy_cast',
    anim: [
      [0, 'windCast', 0.9],
      [6, 'cast', 1],
      [24, 'idle', 0.35],
    ],
    proj: {
      t: 9,
      vx: heavy ? 14 : 9.5,
      look: 'fire',
      sprite: 'pj_fireball',
      y: -128,
      w: 46,
      h: 40,
      dmg: 70,
      hs: 20,
      bs: 14,
      kb: 7,
      fx: 'fire',
    },
  });

const risingUppercut = (heavy: boolean) =>
  special({
    name: 'Comète ascendante',
    total: 60,
    sprite: 'sp_rising_uppercut',
    landRec: 10,
    inv: [0, 7],
    trail: true,
    anim: [
      [0, 'windU', 0.9],
      [2, 'upper', 1],
    ],
    imp: [3, heavy ? 4 : 2.5, heavy ? -20 : -16.5],
    hits: [
      hit(3, 14, [0, -225, 76, 170], heavy ? 130 : 105, {
        launch: [4, -13],
        bs: 18,
        kb: 8,
        fx: 'fire',
        sw: 'up',
        stop: 12,
      }),
    ],
  });

export const balanced: StyleDef = {
  id: 'balanced',
  label: 'Équilibré',
  hint: 'Boule de feu, uppercut enflammé',
  stats: { hp: 1000, speed: 4.7, jump: 24, power: 1 },
  names: { s1: 'Boule de feu', s2: 'Comète ascendante', super: 'BRASIER FINAL' },
  moves: moveSet({
    ...NORMALS,
    s1l: fireball(false),
    s1h: fireball(true),
    s2l: risingUppercut(false),
    s2h: risingUppercut(true),
    super: superMove({
      name: 'BRASIER FINAL',
      total: 52,
      sprite: 'sp_energy_cast',
      anim: [
        [0, 'charge', 0.8],
        [8, 'cast', 1],
        [40, 'idle', 0.3],
      ],
      proj: {
        t: 11,
        vx: 16,
        look: 'fire',
        sprite: 'pj_fireball',
        y: -130,
        w: 120,
        h: 110,
        dmg: 62,
        hits: 5,
        hs: 24,
        bs: 16,
        kb: 9,
        fx: 'fire',
        launchLast: [8, -12],
      },
    }),
  }),
  ai: { zoner: 0.5, antiAir: 's2h', ender: 's1h' },
};
