/* SOLDAT (charge) : les coups spéciaux se préparent en tenant une direction une demi-seconde.
   Arrière tenu puis avant + poing : disque ; bas tenu puis haut + pied : saut périlleux.
   (Les séquences B B et D D marchent aussi, comme pour tous les styles.) */
import { hit, moveSet, special, superMove } from '../move-builders';
import { NORMALS } from '../normals';
import type { StyleDef } from '../types';

const disc = (heavy: boolean) =>
  special({
    name: 'Disque tranchant',
    total: 30,
    sprite: 'sp_blade_throw',
    anim: [
      [0, 'windP', 0.9],
      [4, 'throwS', 1],
      [20, 'idle', 0.35],
    ],
    proj: {
      t: 6,
      look: 'disc',
      sprite: 'pj_disc',
      vx: heavy ? 13 : 9,
      y: -140,
      w: 48,
      h: 22,
      dmg: 60,
      hs: 18,
      bs: 12,
      kb: 5,
      fx: 'slash',
    },
  });

/** Saut périlleux : part vers le haut, invincible au départ ; il peut partir au tout début d'un saut. */
const somersault = (heavy: boolean) =>
  special({
    name: 'Saut périlleux',
    total: 50,
    landRec: 12,
    anywhere: true,
    inv: [0, 6],
    trail: true,
    sprite: 'sp_somersault',
    anim: [
      [0, 'windU', 1],
      [2, 'somersault', 1],
    ],
    imp: [2, heavy ? -1 : -0.5, heavy ? -19 : -16],
    hits: [
      hit(3, 12, [-10, -230, 110, 200], heavy ? 125 : 105, {
        launch: [3, -13],
        fx: 'heavy',
        sw: 'up',
        stop: 12,
        bs: 18,
      }),
    ],
  });

export const soldier: StyleDef = {
  id: 'soldier',
  label: 'Soldat',
  hint: 'Charge : disque tranchant, saut périlleux',
  archetype: 'Charge',
  tags: ['Charge', 'Projectile', 'Anti-aérien'],
  input: 'charge',
  stats: { hp: 1050, speed: 4.2, jump: 23, power: 1 },
  names: { s1: 'Disque tranchant', s2: 'Saut périlleux', super: 'BARRAGE' },
  moves: moveSet({
    ...NORMALS,
    s1l: disc(false),
    s1h: disc(true),
    s2l: somersault(false),
    s2h: somersault(true),
    // super : ruée, trois coups de pied, puis le saut périlleux
    super: superMove({
      name: 'BARRAGE',
      total: 64,
      landRec: 12,
      anim: [
        [0, 'charge', 0.8],
        [6, 'dashP', 1],
        [12, 'hk', 1],
        [18, 'lk', 1],
        [24, 'hk', 1],
        [30, 'somersault', 1],
      ],
      vel: [[6, 26, 12]],
      imp: [30, -0.5, -18],
      hits: [
        hit(13, 3, [-10, -190, 130, 160], 30, { hs: 24, kb: 0, fx: 'kick', stop: 4 }),
        hit(19, 3, [-10, -190, 130, 160], 30, { hs: 24, kb: 0, fx: 'kick', stop: 4 }),
        hit(25, 3, [-10, -190, 130, 160], 30, { hs: 24, kb: 0, fx: 'kick', stop: 4 }),
        hit(31, 10, [-10, -230, 120, 210], 110, { launch: [3, -16], fx: 'heavy', sw: 'up', stop: 16 }),
      ],
    }),
  }),
  ai: { zoner: 0.5, antiAir: 's2h', ender: 's1h' },
};
