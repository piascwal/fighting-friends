/* Coups normaux, communs à tous les styles de combat.
   Lecture d'une ligne : durée totale, animation [frame, posture, vitesse], puis frappe(début, durée, zone, dégâts). */
import { hit, type MoveSpec } from './move-builders';
import type { Button } from './types';

type NormalId = Button | `c${Button}` | `j${Button}` | 'fhp';

export const NORMALS: Record<NormalId, MoveSpec> = {
  // ---------- debout ----------
  lp: {
    name: 'Poing léger',
    rank: 1,
    total: 12,
    sprite: 'punch_light',
    anim: [
      [0, 'lp', 1],
      [7, 'idle', 0.45],
    ],
    vel: [[0, 3, 2]],
    hits: [hit(3, 3, [15, -168, 82, 36], 26, { hs: 15, bs: 9, kb: 2.5 })],
  },
  lk: {
    name: 'Pied léger',
    rank: 2,
    total: 15,
    sprite: 'kick_light',
    anim: [
      [0, 'windK', 0.9],
      [3, 'lk', 1],
      [9, 'idle', 0.45],
    ],
    vel: [[1, 5, 4]],
    hits: [hit(4, 3, [15, -112, 102, 44], 34, { hs: 17, bs: 10, kb: 3, fx: 'kick' })],
  },
  hp: {
    name: 'Poing fort',
    rank: 3,
    total: 21,
    sprite: 'punch_heavy',
    anim: [
      [0, 'windP', 0.9],
      [4, 'hp', 1],
      [13, 'idle', 0.4],
    ],
    vel: [[2, 7, 6]],
    hits: [hit(6, 4, [15, -162, 104, 46], 68, { hs: 21, bs: 13, kb: 4.5, fx: 'heavy' })],
  },
  hk: {
    name: 'Pied fort',
    rank: 4,
    total: 25,
    sprite: 'kick_heavy',
    anim: [
      [0, 'windK', 0.9],
      [5, 'hk', 1],
      [15, 'idle', 0.4],
    ],
    vel: [[3, 8, 6]],
    hits: [hit(8, 4, [10, -190, 108, 80], 82, { hs: 23, bs: 15, kb: 6, fx: 'heavy', sw: 'side' })],
  },
  // ---------- accroupi (↓ + bouton) ----------
  clp: {
    name: 'Poing accroupi',
    rank: 1,
    total: 11,
    low: true,
    sprite: 'crouch_punch',
    anim: [
      [0, 'cLp', 1],
      [6, 'crouch', 0.45],
    ],
    vel: [[0, 3, 2]],
    hits: [hit(3, 3, [15, -108, 78, 34], 22, { hs: 14, bs: 9, kb: 2.5 })],
  },
  clk: {
    name: 'Pied bas',
    rank: 2,
    total: 14,
    low: true,
    sprite: 'crouch_kick',
    anim: [
      [0, 'cLk', 1],
      [8, 'crouch', 0.45],
    ],
    vel: [[0, 4, 3]],
    hits: [hit(4, 3, [15, -42, 98, 40], 28, { hs: 16, bs: 10, kb: 3, lvl: 'low', fx: 'kick', sw: 'low' })],
  },
  chp: {
    name: 'Uppercut (lanceur)',
    rank: 5,
    total: 27,
    jc: true,
    sprite: 'uppercut',
    anim: [
      [0, 'windU', 0.9],
      [4, 'upper', 1],
      [17, 'idle', 0.35],
    ],
    vel: [[1, 5, 4]],
    hits: [hit(5, 6, [5, -215, 76, 160], 64, { launch: [1.5, -16.5], bs: 15, kb: 5, fx: 'heavy', sw: 'up' })],
  },
  chk: {
    name: 'Balayette',
    rank: 5,
    total: 29,
    low: true,
    sprite: 'crouch_kick',
    anim: [
      [0, 'cLk', 0.9],
      [5, 'sweep', 1],
      [18, 'crouch', 0.35],
    ],
    vel: [[2, 7, 4]],
    hits: [
      hit(7, 4, [15, -44, 118, 44], 64, {
        launch: [3, -7],
        bs: 14,
        kb: 6,
        lvl: 'low',
        fx: 'kick',
        sw: 'low',
      }),
    ],
  },
  // ---------- → + poing fort : casse la garde accroupie ----------
  fhp: {
    name: 'Marteau (casse-garde basse)',
    rank: 5,
    total: 31,
    sprite: 'punch_heavy',
    anim: [
      [0, 'windO', 0.7],
      [11, 'overhead', 1],
      [22, 'idle', 0.35],
    ],
    vel: [[3, 12, 4]],
    hits: [
      hit(14, 4, [10, -200, 92, 130], 76, { hs: 22, bs: 13, kb: 5, lvl: 'high', fx: 'heavy', sw: 'down' }),
    ],
  },
  // ---------- en l'air ----------
  jlp: {
    name: 'Poing sauté',
    rank: 1,
    total: 15,
    air: true,
    sprite: 'jump_punch',
    anim: [[0, 'jP', 1]],
    hits: [hit(3, 10, [5, -120, 78, 72], 36, { hs: 17, bs: 11, kb: 3, lvl: 'high' })],
  },
  jhp: {
    name: 'Poing sauté fort',
    rank: 3,
    total: 20,
    air: true,
    sprite: 'jump_punch',
    anim: [[0, 'jP', 1]],
    hits: [
      hit(5, 10, [5, -125, 86, 86], 62, { hs: 21, bs: 13, kb: 4, lvl: 'high', fx: 'heavy', sw: 'down' }),
    ],
  },
  jlk: {
    name: 'Pied sauté',
    rank: 2,
    total: 16,
    air: true,
    sprite: 'jump_kick',
    anim: [[0, 'jK', 1]],
    hits: [hit(4, 11, [5, -80, 92, 66], 40, { hs: 18, bs: 11, kb: 3, lvl: 'high', fx: 'kick' })],
  },
  jhk: {
    name: 'Pied sauté fort',
    rank: 4,
    total: 22,
    air: true,
    sprite: 'jump_kick',
    anim: [[0, 'jK', 1]],
    hits: [hit(5, 12, [5, -85, 102, 76], 72, { hs: 22, bs: 14, kb: 6, lvl: 'high', fx: 'heavy' })],
  },
};
