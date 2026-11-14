/* ARTIFICIER : pose une mine qui reste au sol plusieurs secondes et explose au passage de l'adversaire,
   et lance des grenades en cloche. Il contrôle le terrain plus que l'adversaire. */
import { moveSet, special, superMove } from '../move-builders';
import { NORMALS } from '../normals';
import type { StyleDef } from '../types';

/** Mine : posée près (léger) ou loin (fort), active 7 secondes. Un seul piège à la fois. */
const mine = (heavy: boolean) =>
  special({
    name: 'Mine',
    total: 34,
    sprite: 'sp_plant',
    anim: [
      [0, 'crouch', 0.9],
      [6, 'plant', 1],
      [26, 'idle', 0.35],
    ],
    proj: {
      t: 14,
      look: 'mine',
      sprite: 'pj_mine',
      vx: 0,
      x: heavy ? 260 : 140,
      y: -14,
      w: 40,
      h: 28,
      dmg: 95,
      hs: 22,
      bs: 14,
      kb: 6,
      fx: 'fire',
      life: 420,
      ground: true,
      launchLast: [4, -12],
    },
  });

const grenade = (heavy: boolean) =>
  special({
    name: 'Grenade',
    total: 36,
    sprite: 'sp_lob_throw',
    anim: [
      [0, 'windP', 0.9],
      [6, 'lobThrow', 1],
      [24, 'idle', 0.35],
    ],
    proj: {
      t: 8,
      look: 'grenade',
      sprite: 'pj_grenade',
      vx: heavy ? 8 : 5.5,
      vy: -11,
      gravity: 0.6,
      x: 40,
      y: -170,
      w: 34,
      h: 34,
      dmg: 80,
      hs: 22,
      bs: 14,
      kb: 7,
      fx: 'fire',
    },
  });

export const trapper: StyleDef = {
  id: 'trapper',
  label: 'Artificier',
  hint: 'Mine posée au sol, grenade en cloche',
  archetype: 'Pièges',
  tags: ['Piège', 'Projectile', 'À distance'],
  stats: { hp: 950, speed: 4.2, jump: 23, power: 1 },
  names: { s1: 'Mine', s2: 'Grenade', super: "FEU D'ARTIFICE" },
  moves: moveSet({
    ...NORMALS,
    s1l: mine(false),
    s1h: mine(true),
    s2l: grenade(false),
    s2h: grenade(true),
    // super : une grande explosion qui avance lentement
    super: superMove({
      name: "FEU D'ARTIFICE",
      total: 56,
      sprite: 'sp_lob_throw',
      anim: [
        [0, 'charge', 0.8],
        [8, 'lobThrow', 1],
        [44, 'idle', 0.3],
      ],
      proj: {
        t: 14,
        look: 'fire',
        sprite: 'pj_grenade',
        vx: 3,
        x: 160,
        y: -110,
        w: 160,
        h: 170,
        dmg: 40,
        hits: 5,
        hs: 24,
        bs: 14,
        kb: 3,
        fx: 'fire',
        life: 60,
        launchLast: [6, -14],
      },
    }),
  }),
  ai: { zoner: 0.55, antiAir: 'chp', ender: 's2h' },
};
