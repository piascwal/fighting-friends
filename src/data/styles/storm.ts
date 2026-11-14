/* TEMPÊTE : la foudre tombe à distance fixe, et un pas éclair le fait passer de l'autre côté de
   l'adversaire. Faible au contact, dangereux de loin. */
import { moveSet, special, superMove } from '../move-builders';
import { NORMALS } from '../normals';
import type { StyleDef } from '../types';

/** Éclair qui tombe du ciel, devant (léger) ou loin devant (fort). */
const lightning = (heavy: boolean) =>
  special({
    name: 'Foudre',
    total: 40,
    sprite: 'sp_sky_call',
    anim: [
      [0, 'windCast', 0.9],
      [6, 'skyCall', 1],
      [30, 'idle', 0.35],
    ],
    proj: {
      t: 14,
      look: 'bolt',
      sprite: 'pj_lightning',
      vx: 0,
      x: heavy ? 340 : 220,
      y: -200,
      w: 60,
      h: 400,
      dmg: 80,
      hs: 22,
      bs: 14,
      kb: 4,
      fx: 'elec',
      life: 16,
      launchLast: [2, -9],
    },
  });

/** Pas de l'éclair : disparaît et réapparaît collé à l'adversaire (léger) ou dans son dos (fort). */
const lightningStep = (heavy: boolean) =>
  special({
    name: "Pas de l'éclair",
    total: heavy ? 30 : 26,
    inv: [0, 12],
    vanish: [3, 10],
    anim: [
      [0, 'crouch', 0.9],
      [10, 'idle', 0.5],
    ],
    tele: { t: 10, mode: heavy ? 'cross' : 'near' },
  });

export const storm: StyleDef = {
  id: 'storm',
  label: 'Tempête',
  hint: 'Foudre à distance, pas éclair',
  archetype: 'Zoneur',
  tags: ['À distance', 'Téléportation', 'Invincible'],
  stats: { hp: 920, speed: 4.4, jump: 24, power: 1 },
  names: { s1: 'Foudre', s2: "Pas de l'éclair", super: 'ORAGE' },
  moves: moveSet({
    ...NORMALS,
    s1l: lightning(false),
    s1h: lightning(true),
    s2l: lightningStep(false),
    s2h: lightningStep(true),
    super: superMove({
      name: 'ORAGE',
      total: 70,
      sprite: 'sp_sky_call',
      anim: [
        [0, 'charge', 0.8],
        [8, 'skyCall', 1],
        [56, 'idle', 0.3],
      ],
      // un orage qui avance lentement vers l'adversaire
      proj: {
        t: 14,
        look: 'bolt',
        sprite: 'pj_lightning',
        vx: 2.5,
        x: 140,
        y: -200,
        w: 160,
        h: 400,
        dmg: 38,
        hits: 6,
        hs: 24,
        bs: 14,
        kb: 2,
        fx: 'elec',
        life: 60,
        launchLast: [3, -14],
      },
    }),
  }),
  ai: { zoner: 0.6, antiAir: 'chp', ender: 's1h' },
};
