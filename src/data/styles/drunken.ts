/* POING IVRE : imprévisible. Une esquive titubante invincible qui se termine par un coup, et une gourde
   lancée en cloche qui passe par-dessus les gardes hautes. */
import { hit, moveSet, special, superMove } from '../move-builders';
import { NORMALS } from '../normals';
import type { AnimKey, HitDef, StyleDef } from '../types';

/** Recule en titubant (invincible), puis bondit en frappant. Pas d'image propre pour la frappe :
    chaque posture utilise son image (esquive, puis poing fort). */
const sway = (heavy: boolean) =>
  special({
    name: 'Esquive titubante',
    total: 38,
    inv: [0, 14],
    anim: [
      [0, 'sway', 1],
      [14, 'hp', 1],
      [26, 'idle', 0.35],
    ],
    vel: [
      [0, 8, -4],
      [12, 18, heavy ? 14 : 10],
    ],
    hits: [hit(15, 4, [10, -170, 100, 60], heavy ? 95 : 80, { fx: 'heavy', kb: 9, hs: 22, stop: 10 })],
  });

/** Gourde lancée en cloche : retombe et se brise au sol. */
const bottle = (heavy: boolean) =>
  special({
    name: 'Gourde',
    total: 36,
    sprite: 'sp_lob_throw',
    anim: [
      [0, 'windP', 0.9],
      [6, 'lobThrow', 1],
      [24, 'idle', 0.35],
    ],
    proj: {
      t: 8,
      look: 'bottle',
      sprite: 'pj_bottle',
      vx: heavy ? 8 : 5.5,
      vy: -10,
      gravity: 0.55,
      x: 50,
      y: -170,
      w: 36,
      h: 36,
      dmg: 70,
      hs: 22,
      bs: 14,
      kb: 6,
      fx: 'kick',
    },
  });

const WHIRL = ['spinK', 'hp', 'spinK2', 'sway'] as const;

/** Super : tourbillon titubant, invincible au départ, huit touches. */
function drunkenWhirl() {
  const hits: HitDef[] = [];
  const anim: AnimKey[] = [[0, 'sway', 1]];
  for (let i = 0; i < 8; i++) {
    const t = 10 + i * 4;
    hits.push(
      hit(t, 3, [-30, -190, 160, 160], 28, { hs: 24, bs: 10, kb: 0, fx: 'kick', stop: 3, sw: 'side' }),
    );
    anim.push([t - 1, WHIRL[i % WHIRL.length]!, 1]);
  }
  hits.push(hit(44, 4, [-30, -200, 160, 170], 95, { launch: [7, -14], fx: 'heavy', stop: 16, sw: 'up' }));
  anim.push([43, 'upper', 1], [60, 'idle', 0.3]);
  return superMove({ name: 'TOURBILLON IVRE', total: 68, inv: [0, 10], anim, vel: [[8, 40, 5]], hits });
}

export const drunken: StyleDef = {
  id: 'drunken',
  label: 'Poing ivre',
  hint: 'Esquive titubante, gourde en cloche',
  stats: { hp: 1000, speed: 4.2, jump: 23, power: 1.05 },
  names: { s1: 'Esquive titubante', s2: 'Gourde', super: 'TOURBILLON IVRE' },
  moves: moveSet({
    ...NORMALS,
    s1l: sway(false),
    s1h: sway(true),
    s2l: bottle(false),
    s2h: bottle(true),
    super: drunkenWhirl(),
  }),
  ai: { zoner: 0.3, antiAir: 's1h', ender: 's2h' },
};
