/* MIROIR : sa garde renvoie les projectiles à leur lanceur (plus vite qu'à l'aller), et il riposte de loin
   avec un éclat de lumière très rapide. Cauchemar des styles qui jouent à distance. */
import { hit, moveSet, special, superMove } from '../move-builders';
import { NORMALS } from '../normals';
import type { StyleDef } from '../types';

const mirrorGuard = (heavy: boolean) =>
  special({
    name: 'Garde miroir',
    total: heavy ? 34 : 28,
    sprite: 'sp_mirror_guard',
    anim: [
      [0, 'mirrorGuard', 1],
      [heavy ? 28 : 22, 'idle', 0.35],
    ],
    reflect: [2, heavy ? 24 : 18],
    // repousse aussi l'adversaire collé à lui
    hits: [hit(4, 4, [10, -180, 70, 120], 30, { kb: 8, fx: 'slash' })],
  });

const lightShard = (heavy: boolean) =>
  special({
    name: 'Éclat de lumière',
    total: 26,
    sprite: 'sp_palm_strike',
    anim: [
      [0, 'windP', 0.9],
      [4, 'palm', 1],
      [18, 'idle', 0.35],
    ],
    proj: {
      t: 6,
      look: 'light',
      sprite: 'pj_light',
      vx: heavy ? 18 : 14,
      y: -150,
      w: 36,
      h: 26,
      dmg: 45,
      hs: 16,
      bs: 10,
      kb: 4,
      fx: 'slash',
    },
  });

export const mirror: StyleDef = {
  id: 'mirror',
  label: 'Miroir',
  hint: 'Garde qui renvoie les projectiles, éclat de lumière',
  archetype: 'Renvoi',
  tags: ['Renvoi', 'Projectile', 'À distance'],
  stats: { hp: 960, speed: 4.4, jump: 23, power: 0.95 },
  names: { s1: 'Garde miroir', s2: 'Éclat de lumière', super: 'PRISME' },
  moves: moveSet({
    ...NORMALS,
    s1l: mirrorGuard(false),
    s1h: mirrorGuard(true),
    s2l: lightShard(false),
    s2h: lightShard(true),
    super: superMove({
      name: 'PRISME',
      total: 58,
      sprite: 'sp_mirror_guard',
      reflect: [0, 14],
      anim: [
        [0, 'mirrorGuard', 1],
        [12, 'cast', 1],
        [46, 'idle', 0.3],
      ],
      proj: {
        t: 14,
        look: 'beam',
        sprite: 'pj_beam',
        vx: 0,
        x: 300,
        y: -140,
        w: 520,
        h: 60,
        dmg: 30,
        hits: 6,
        hs: 24,
        bs: 12,
        kb: 2,
        fx: 'elec',
        life: 36,
        launchLast: [8, -12],
      },
    }),
  }),
  ai: { zoner: 0.45, antiAir: 'chp', ender: 's2h' },
};
