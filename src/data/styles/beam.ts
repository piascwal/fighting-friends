/* ÉNERGISTE : un rayon qui traverse une grande partie de l'écran après une longue préparation, et une
   déflagration autour de lui pour repousser ceux qui sautent. Puissant de loin, lent à démarrer. */
import { hit, moveSet, special, superMove } from '../move-builders';
import { NORMALS } from '../normals';
import type { StyleDef } from '../types';

const ray = (heavy: boolean) =>
  special({
    name: 'Rayon',
    total: 44,
    sprite: 'sp_energy_cast',
    anim: [
      [0, 'windCast', 0.8],
      [12, 'cast', 1],
      [34, 'idle', 0.35],
    ],
    proj: {
      t: 16,
      look: 'beam',
      sprite: 'pj_beam',
      vx: 0,
      x: heavy ? 290 : 220,
      y: -140,
      w: heavy ? 520 : 380,
      h: 50,
      dmg: 85,
      hs: 22,
      bs: 14,
      kb: 6,
      fx: 'elec',
      life: 18,
    },
  });

/** Déflagration : onde d'énergie tout autour de lui, invincible au départ. */
const blast = (heavy: boolean) =>
  special({
    name: 'Déflagration',
    total: 40,
    inv: [0, 8],
    sprite: 'sp_burst',
    anim: [
      [0, 'charge', 1],
      [6, 'burst', 1],
      [30, 'idle', 0.35],
    ],
    hits: [
      hit(8, 5, [-60, -240, 180, 240], heavy ? 100 : 85, {
        launch: [6, -12],
        fx: 'elec',
        sw: 'up',
        stop: 12,
      }),
    ],
  });

export const beam: StyleDef = {
  id: 'beam',
  label: 'Énergiste',
  hint: 'Rayon à longue portée, déflagration anti-aérienne',
  archetype: 'Zoneur',
  tags: ['Projectile', 'À distance', 'Anti-aérien'],
  stats: { hp: 940, speed: 4, jump: 22, power: 1.05 },
  names: { s1: 'Rayon', s2: 'Déflagration', super: 'MÉGA-RAYON' },
  moves: moveSet({
    ...NORMALS,
    s1l: ray(false),
    s1h: ray(true),
    s2l: blast(false),
    s2h: blast(true),
    super: superMove({
      name: 'MÉGA-RAYON',
      total: 66,
      sprite: 'sp_energy_cast',
      anim: [
        [0, 'charge', 0.8],
        [12, 'cast', 1],
        [54, 'idle', 0.3],
      ],
      proj: {
        t: 16,
        look: 'beam',
        sprite: 'pj_beam',
        vx: 0,
        x: 380,
        y: -140,
        w: 700,
        h: 120,
        dmg: 32,
        hits: 8,
        hs: 24,
        bs: 12,
        kb: 2,
        fx: 'elec',
        life: 50,
        launchLast: [8, -13],
      },
    }),
  }),
  ai: { zoner: 0.6, antiAir: 's2h', ender: 's1h' },
};
