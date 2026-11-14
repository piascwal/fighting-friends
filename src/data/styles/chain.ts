/* ENCHAÎNEUR : un coup spécial en trois temps. Quand la première frappe touche (ou est bloquée),
   un nouvel appui sur un poing déclenche la deuxième, puis la troisième qui projette. */
import { hit, moveSet, special, superMove } from '../move-builders';
import { NORMALS } from '../normals';
import type { AnimKey, HitDef, MoveDef, StyleDef } from '../types';

type Id = 's1l' | 's1h';

const thirdStrike = (id: Id): MoveDef => ({
  id,
  rank: 10,
  name: 'Triple frappe (3)',
  total: 34,
  sprite: 'sp_rising_uppercut',
  anim: [
    [0, 'windU', 1],
    [2, 'upper', 1],
    [24, 'idle', 0.35],
  ],
  vel: [[0, 4, 5]],
  hits: [hit(4, 6, [0, -215, 90, 160], 70, { launch: [3, -15], fx: 'fire', sw: 'up', stop: 12 })],
});

const secondStrike = (id: Id): MoveDef => ({
  id,
  rank: 10,
  name: 'Triple frappe (2)',
  total: 26,
  sprite: 'sp_palm_strike',
  anim: [
    [0, 'palm', 1],
    [18, 'idle', 0.4],
  ],
  vel: [[0, 6, 7]],
  hits: [hit(3, 4, [10, -175, 100, 60], 50, { hs: 24, bs: 14, kb: 4, fx: 'heavy' })],
  followUps: { from: 4, to: 22, onHit: true, moves: { lp: thirdStrike(id), hp: thirdStrike(id) } },
});

const tripleStrike = (heavy: boolean) => {
  const id: Id = heavy ? 's1h' : 's1l';
  return special({
    name: 'Triple frappe',
    total: 28,
    sprite: 'sp_dash_punch',
    anim: [
      [0, 'windP', 0.9],
      [3, 'dashP', 1],
      [20, 'idle', 0.4],
    ],
    vel: [[2, 10, heavy ? 14 : 10]],
    hits: [hit(5, 4, [10, -170, 100, 60], 45, { hs: 24, bs: 14, kb: 3, fx: 'punch' })],
    followUps: { from: 6, to: 24, onHit: true, moves: { lp: secondStrike(id), hp: secondStrike(id) } },
  });
};

/** Salto avant, talon qui retombe : se bloque debout. */
const flipKick = (heavy: boolean) =>
  special({
    name: 'Coup de talon retourné',
    total: 44,
    landRec: 10,
    sprite: 'sp_flip_kick',
    anim: [
      [0, 'windU', 0.9],
      [4, 'flipKick', 1],
    ],
    imp: [4, heavy ? 7 : 5, -13],
    hits: [
      hit(10, 20, [0, -150, 100, 130], heavy ? 100 : 85, {
        lvl: 'high',
        fx: 'heavy',
        sw: 'down',
        kb: 6,
        hs: 24,
        stop: 10,
      }),
    ],
  });

/** Super : huit frappes en avançant, puis un uppercut enflammé. */
function strikeStorm() {
  const hits: HitDef[] = [];
  const anim: AnimKey[] = [[0, 'charge', 0.8]];
  for (let i = 0; i < 8; i++) {
    const t = 6 + i * 4;
    hits.push(hit(t, 3, [-10, -190, 130, 160], 26, { hs: 24, bs: 10, kb: 0, fx: 'punch', stop: 3 }));
    anim.push([t - 1, i % 2 ? 'palm' : 'dashP', 1]);
  }
  hits.push(hit(40, 5, [0, -230, 100, 200], 100, { launch: [3, -17], fx: 'fire', stop: 16, sw: 'up' }));
  anim.push([38, 'windU', 1], [40, 'upper', 1], [56, 'idle', 0.3]);
  return superMove({ name: 'TEMPÊTE DE COUPS', total: 66, anim, vel: [[3, 36, 6]], hits });
}

export const chain: StyleDef = {
  id: 'chain',
  label: 'Enchaîneur',
  hint: 'Triple frappe en trois temps, talon retourné',
  archetype: 'Enchaînements',
  tags: ['Enchaînement', 'Casse-garde', 'Multi-coups'],
  stats: { hp: 980, speed: 4.6, jump: 23, power: 1 },
  names: { s1: 'Triple frappe', s2: 'Coup de talon retourné', super: 'TEMPÊTE DE COUPS' },
  moves: moveSet({
    ...NORMALS,
    s1l: tripleStrike(false),
    s1h: tripleStrike(true),
    s2l: flipKick(false),
    s2h: flipKick(true),
    super: strikeStorm(),
  }),
  ai: { zoner: 0, antiAir: 'chp', ender: 's1h' },
};
