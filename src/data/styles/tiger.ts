/* TIGRE (postures) : une posture basse dont on sort par l'un des quatre boutons, chacun sur un coup
   différent : griffe rapide (A), bond qui casse la garde basse (B), fauchage bas (C), ruade qui lance (D).
   L'adversaire doit deviner lequel arrive. */
import { hit, moveSet, special, superMove } from '../move-builders';
import { NORMALS } from '../normals';
import type { AnimKey, HitDef, MoveDef, StyleDef } from '../types';

type Id = 's2l' | 's2h';

const claw = (id: Id): MoveDef => ({
  id,
  rank: 10,
  name: 'Griffe',
  total: 18,
  sprite: 'punch_light',
  anim: [
    [0, 'lp', 1],
    [12, 'idle', 0.4],
  ],
  vel: [[0, 4, 6]],
  hits: [hit(3, 3, [10, -160, 100, 50], 55, { hs: 20, fx: 'slash' })],
});

const pounce = (id: Id): MoveDef => ({
  id,
  rank: 10,
  name: 'Bond du tigre',
  total: 34,
  landRec: 8,
  sprite: 'punch_heavy',
  anim: [[0, 'overhead', 1]],
  imp: [2, 6, -10],
  hits: [hit(8, 16, [0, -170, 100, 120], 85, { lvl: 'high', fx: 'slash', sw: 'down', hs: 24, stop: 10 })],
});

const rake = (id: Id): MoveDef => ({
  id,
  rank: 10,
  name: 'Fauchage',
  total: 26,
  low: true,
  sprite: 'crouch_kick',
  anim: [
    [0, 'sweep', 1],
    [18, 'crouch', 0.4],
  ],
  hits: [hit(3, 4, [10, -44, 120, 44], 60, { lvl: 'low', launch: [3, -7], fx: 'kick', sw: 'low' })],
});

const buck = (id: Id): MoveDef => ({
  id,
  rank: 10,
  name: 'Ruade',
  total: 30,
  sprite: 'kick_heavy',
  anim: [
    [0, 'hk', 1],
    [20, 'idle', 0.4],
  ],
  hits: [hit(4, 4, [10, -200, 110, 120], 70, { launch: [2, -15], fx: 'heavy', sw: 'up' })],
});

const stance = (heavy: boolean) => {
  const id: Id = heavy ? 's2h' : 's2l';
  return special({
    name: 'Posture du tigre',
    total: 46,
    sprite: 'sp_tiger_stance',
    low: true,
    anim: [
      [0, 'tigerStance', 0.9],
      [40, 'idle', 0.35],
    ],
    followUps: { from: 4, to: 40, moves: { lp: claw(id), hp: pounce(id), lk: rake(id), hk: buck(id) } },
  });
};

/** Charge du tigre : bondit en avant, griffes en avant. */
const tigerRush = (heavy: boolean) =>
  special({
    name: 'Charge du tigre',
    total: 34,
    trail: true,
    sprite: 'sp_tiger_stance',
    anim: [
      [0, 'tigerStance', 1],
      [6, 'dashP', 1],
      [24, 'idle', 0.35],
    ],
    vel: [[4, 14, heavy ? 18 : 14]],
    hits: [hit(6, 8, [5, -160, 100, 80], heavy ? 95 : 80, { fx: 'slash', kb: 9, hs: 22, stop: 10 })],
  });

/** Super : sept coups de griffe, le dernier projette. */
function tigerJaws() {
  const hits: HitDef[] = [];
  const anim: AnimKey[] = [[0, 'tigerStance', 1]];
  for (let i = 0; i < 7; i++) {
    const t = 8 + i * 4;
    hits.push(
      hit(t, 3, [-20, -200, 150, 190], 32, {
        hs: 26,
        bs: 10,
        kb: 0,
        fx: 'slash',
        stop: 4,
        sw: i % 2 ? 'up' : 'down',
      }),
    );
    anim.push([t - 1, i % 2 ? 'slash2' : 'slash', 1]);
  }
  hits.push(hit(38, 5, [-20, -210, 150, 200], 95, { launch: [6, -15], fx: 'slash', stop: 16, sw: 'up' }));
  anim.push([36, 'upper', 1], [54, 'idle', 0.3]);
  return superMove({ name: 'MÂCHOIRES DU TIGRE', total: 62, anim, vel: [[2, 10, 14]], hits });
}

export const tiger: StyleDef = {
  id: 'tiger',
  label: 'Tigre',
  hint: 'Posture à quatre sorties, charge griffue',
  archetype: 'Postures',
  tags: ['Posture', 'Casse-garde', 'Coup bas'],
  stats: { hp: 960, speed: 4.7, jump: 23, power: 1 },
  names: { s1: 'Charge du tigre', s2: 'Posture du tigre', super: 'MÂCHOIRES DU TIGRE' },
  moves: moveSet({
    ...NORMALS,
    s1l: tigerRush(false),
    s1h: tigerRush(true),
    s2l: stance(false),
    s2h: stance(true),
    super: tigerJaws(),
  }),
  ai: { zoner: 0, antiAir: 'chp', ender: 's1h' },
};
