/* LOURD : lent mais résistant. Une onde de choc au sol et une charge qui encaisse un coup sans s'arrêter. */
import { hit, moveSet, special, superMove } from '../move-builders';
import { NORMALS } from '../normals';
import type { StyleDef } from '../types';

const shockwave = (heavy: boolean) =>
  special({
    name: 'Onde de choc',
    total: 40,
    sprite: 'special1',
    anim: [
      [0, 'windSlam', 0.8],
      [9, 'slam', 1],
      [28, 'idle', 0.35],
    ],
    shakeAt: 11,
    proj: {
      t: 12,
      vx: heavy ? 12 : 8.5,
      x: 60,
      y: -34,
      w: 70,
      h: 68,
      dmg: 85,
      hs: 22,
      bs: 15,
      kb: 8,
      fx: 'earth',
      ground: true,
    },
  });

const ram = (heavy: boolean) =>
  special({
    name: 'Bélier',
    total: 40,
    trail: true,
    armor: [2, 20],
    sprite: 'special2',
    anim: [
      [0, 'windP', 0.9],
      [4, 'shoulder', 1],
      [26, 'idle', 0.35],
    ],
    vel: [[5, heavy ? 20 : 17, heavy ? 16 : 13]],
    hits: [
      hit(6, 14, [0, -175, 78, 140], heavy ? 145 : 120, {
        launch: [9, -9],
        bs: 20,
        kb: 12,
        fx: 'earth',
        stop: 13,
      }),
    ],
  });

export const heavy: StyleDef = {
  id: 'heavy',
  label: 'Lourd',
  hint: 'Onde de choc au sol, charge blindée',
  stats: { hp: 1150, speed: 3.9, jump: 19, power: 1.15 },
  names: { s1: 'Onde de choc', s2: 'Bélier', super: 'SÉISME' },
  spriteDesc: {
    special1:
      "frappe du sol : buste complètement plié vers l'avant, les deux poings écrasés ensemble contre le sol devant ses pieds, genoux fléchis",
    special2:
      "charge à l'épaule : corps penché vers l'avant, épaule avant en bélier, bras repliés contre le torse, tête rentrée, en pleine course",
    projectile:
      'une onde de choc qui court au ras du sol : éclats de roche et poussière soulevés en forme de vague',
  },
  spriteRig: { special1: 'slam', special2: 'shoulder' },
  moves: moveSet({
    ...NORMALS,
    s1l: shockwave(false),
    s1h: shockwave(true),
    s2l: ram(false),
    s2h: ram(true),
    super: superMove({
      name: 'SÉISME',
      total: 62,
      sprite: 'special1',
      anim: [
        [0, 'charge', 0.8],
        [5, 'windSlam', 0.9],
        [12, 'slam', 1],
        [46, 'idle', 0.3],
      ],
      shakeAt: 14,
      hits: [
        hit(14, 5, [-40, -210, 210, 210], 150, {
          launch: [3, -18],
          bs: 20,
          kb: 12,
          fx: 'earth',
          stop: 16,
          sw: 'down',
        }),
      ],
      proj: {
        t: 15,
        vx: 15,
        x: 110,
        y: -60,
        w: 110,
        h: 120,
        dmg: 70,
        hits: 3,
        hs: 24,
        bs: 16,
        kb: 9,
        fx: 'earth',
        ground: true,
        launchLast: [5, -13],
      },
    }),
  }),
  ai: { zoner: 0.3, antiAir: 'chp', ender: 's2h' },
};
