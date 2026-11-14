/* GIVRE : contrôle de la distance. Un éclat lent qui fige l'adversaire, et un pic qui jaillit du sol
   à distance fixe : il faut savoir où se placer pour l'éviter. */
import { moveSet, special, superMove } from '../move-builders';
import { NORMALS } from '../normals';
import type { StyleDef } from '../types';

const iceShard = (heavy: boolean) =>
  special({
    name: 'Éclat de glace',
    total: 36,
    sprite: 'sp_energy_cast',
    anim: [
      [0, 'windCast', 0.9],
      [7, 'cast', 1],
      [26, 'idle', 0.35],
    ],
    proj: {
      t: 10,
      look: 'ice',
      sprite: 'pj_ice_shard',
      vx: heavy ? 8 : 5.5,
      y: -130,
      w: 52,
      h: 44,
      dmg: 75,
      hs: 28, // l'adversaire reste figé plus longtemps : de quoi enchaîner
      bs: 16,
      kb: 4,
      fx: 'ice',
    },
  });

/** Pic de glace : surgit du sol devant (léger) ou loin devant (fort), puis disparaît. */
const iceSpike = (heavy: boolean) =>
  special({
    name: 'Pic de glace',
    total: 44,
    sprite: 'sp_ground_slam',
    anim: [
      [0, 'windSlam', 0.8],
      [8, 'slam', 1],
      [30, 'idle', 0.35],
    ],
    proj: {
      t: 14,
      look: 'spike',
      sprite: 'pj_ice_spike',
      vx: 0,
      x: heavy ? 320 : 200,
      y: -75,
      w: 60,
      h: 150,
      dmg: 90,
      hs: 22,
      bs: 15,
      kb: 4,
      fx: 'ice',
      life: 20,
      ground: true,
      launchLast: [2, -14],
    },
  });

export const ice: StyleDef = {
  id: 'ice',
  label: 'Givre',
  hint: 'Éclat qui fige, pic de glace à distance',
  archetype: 'Zoneur',
  tags: ['Projectile', 'À distance', 'Fige'],
  stats: { hp: 950, speed: 4.3, jump: 23, power: 1 },
  names: { s1: 'Éclat de glace', s2: 'Pic de glace', super: 'BLIZZARD' },
  moves: moveSet({
    ...NORMALS,
    s1l: iceShard(false),
    s1h: iceShard(true),
    s2l: iceSpike(false),
    s2h: iceSpike(true),
    super: superMove({
      name: 'BLIZZARD',
      total: 54,
      sprite: 'sp_energy_cast',
      anim: [
        [0, 'charge', 0.8],
        [8, 'cast', 1],
        [42, 'idle', 0.3],
      ],
      proj: {
        t: 12,
        look: 'ice',
        sprite: 'pj_ice_shard',
        vx: 7,
        y: -140,
        w: 140,
        h: 150,
        dmg: 40,
        hits: 6,
        hs: 24,
        bs: 14,
        kb: 3,
        fx: 'ice',
        launchLast: [6, -13],
      },
    }),
  }),
  ai: { zoner: 0.6, antiAir: 'chp', ender: 's1h' },
};
