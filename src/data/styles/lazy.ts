/* FLEMMARD : très flemmard, mais très fort tactiquement au foot. Son spécial est un une-deux : il
   envoie le ballon, qui revient vers lui en repassant par l'adversaire. Sa flemme : il fait mine de ne pas vouloir se battre (bâille, hausse les épaules), encaisse un coup sans broncher et regagne de la vie. */
import { moveSet, special, superMove } from '../move-builders';
import { NORMALS } from '../normals';
import type { StyleDef } from '../types';

/** Une-deux : tir au ras du sol, le ballon fait demi-tour et revient (deux touches possibles). */
const oneTwo = (heavy: boolean) =>
  special({
    name: 'Une-deux',
    total: heavy ? 40 : 34,
    sprite: 'sp_ball_kick',
    anim: [
      [0, 'windK', 0.9],
      [6, 'ballKick', 1],
      [heavy ? 30 : 26, 'idle', 0.35],
    ],
    proj: {
      t: 9,
      look: 'football',
      sprite: 'pj_football',
      vx: heavy ? 13 : 10,
      x: 60,
      y: -22,
      w: 38,
      h: 38,
      dmg: heavy ? 55 : 48,
      hits: 2,
      hs: 18,
      bs: 12,
      kb: 4,
      fx: 'kick',
      ground: true,
      lvl: 'low',
      turnAt: heavy ? 20 : 16,
      life: heavy ? 42 : 34,
    },
  });

/** La flemme : il hausse les épaules, bâille, et fait comme si de rien n'était. Encaisse un coup, regagne de la vie. */
const flemme = (heavy: boolean) => {
  const total = heavy ? 64 : 50;
  return special({
    name: 'Flemme',
    total,
    sprite: 'sp_nonchalant',
    armor: [3, total - 14],
    heal: { t: total - 14, amount: heavy ? 100 : 65 },
    anim: [
      [0, 'nonchalant', 0.7],
      [total - 8, 'idle', 0.35],
    ],
  });
};

export const lazy: StyleDef = {
  id: 'lazy',
  label: 'Flemmard',
  hint: 'Une-deux au ballon, flemme qui soigne',
  archetype: 'Stratège',
  tags: ['Projectile', 'Armure', 'Soin', 'Coup bas'],
  stats: { hp: 980, speed: 3.8, jump: 22, power: 1 },
  names: { s1: 'Une-deux', s2: 'Flemme', super: 'TIKI-TAKA' },
  moves: moveSet({
    ...NORMALS,
    s1l: oneTwo(false),
    s1h: oneTwo(true),
    s2l: flemme(false),
    s2h: flemme(true),
    // super : une série de passes en revenant, le ballon frappe six fois
    super: superMove({
      name: 'TIKI-TAKA',
      total: 70,
      sprite: 'sp_ball_kick',
      anim: [
        [0, 'charge', 0.8],
        [8, 'ballKick', 1],
        [18, 'windK', 1],
        [24, 'ballKick', 1],
        [56, 'idle', 0.3],
      ],
      proj: {
        t: 12,
        look: 'football',
        sprite: 'pj_football',
        vx: 9,
        x: 50,
        y: -26,
        w: 60,
        h: 60,
        dmg: 30,
        hits: 6,
        hs: 22,
        bs: 10,
        kb: 2,
        fx: 'kick',
        ground: true,
        turnAt: 24,
        life: 52,
        launchLast: [6, -13],
      },
    }),
  }),
  ai: { zoner: 0.4, antiAir: 's2h', ender: 's1h' },
};
