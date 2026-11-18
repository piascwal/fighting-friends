/* YOGI : un mystique. Ses postures de yoga canalisent une énergie spirituelle : un mandala lent qui
   touche deux fois, une lévitation intouchable qui retombe sur l'adversaire, et l'esprit d'un animal
   totem en super. Patient, il joue sur la distance. */
import { hit, moveSet, special, superMove } from '../move-builders';
import { NORMALS } from '../normals';
import type { StyleDef } from '../types';

/** Mandala : une roue d'énergie lente, qui touche deux fois. */
const mandala = (heavy: boolean) =>
  special({
    name: 'Mandala',
    total: 40,
    sprite: 'sp_mudra',
    anim: [
      [0, 'windCast', 0.9],
      [6, 'mudra', 1],
      [30, 'idle', 0.35],
    ],
    proj: {
      t: 12,
      look: 'light',
      sprite: 'pj_mandala',
      vx: heavy ? 6.5 : 4.5,
      y: -130,
      w: 64,
      h: 64,
      dmg: 40,
      hits: 2,
      hs: 18,
      bs: 12,
      kb: 5,
      fx: 'elec',
      life: 170,
    },
  });

/** Lévitation : s'élève en lotus (intouchable au départ), puis retombe sur l'adversaire. Se bloque debout. */
const levitation = (heavy: boolean) =>
  special({
    name: 'Lévitation',
    total: 58,
    landRec: 12,
    inv: [0, 12],
    sprite: 'sp_levitate',
    anim: [
      [0, 'windU', 0.9],
      [4, 'levitate', 1],
    ],
    imp: [4, heavy ? 6 : 3.5, -15],
    hits: [
      hit(14, 24, [-20, -130, 120, 140], heavy ? 90 : 80, {
        lvl: 'high',
        launch: [4, -8],
        fx: 'elec',
        sw: 'down',
        kb: 6,
        stop: 12,
      }),
    ],
  });

/** Super : l'esprit d'un animal totem traverse l'écran et emporte l'adversaire. */
const trance = () =>
  superMove({
    name: 'TRANSE',
    total: 66,
    sprite: 'sp_mudra',
    anim: [
      [0, 'charge', 0.8],
      [8, 'mudra', 1],
      [54, 'idle', 0.3],
    ],
    proj: {
      t: 14,
      look: 'light',
      sprite: 'pj_spirit',
      vx: 7,
      y: -120,
      w: 150,
      h: 170,
      dmg: 34,
      hits: 5,
      hs: 24,
      bs: 10,
      kb: 2,
      fx: 'elec',
      life: 150,
      launchLast: [6, -14],
    },
  });

export const yogi: StyleDef = {
  id: 'yogi',
  label: 'Yogi',
  hint: 'Mandala lent, lévitation, esprit totem',
  archetype: 'Mystique',
  tags: ['Projectile', 'Invincible', 'À distance'],
  stats: { hp: 950, speed: 3.9, jump: 22, power: 1 },
  names: { s1: 'Mandala', s2: 'Lévitation', super: 'TRANSE' },
  moves: moveSet({
    ...NORMALS,
    s1l: mandala(false),
    s1h: mandala(true),
    s2l: levitation(false),
    s2h: levitation(true),
    super: trance(),
  }),
  ai: { zoner: 0.65, antiAir: 's2h', ender: 's1h' },
};
