/* FLEMMARD : très flemmard, mais très fort tactiquement au foot. Son spécial est un une-deux : il
   envoie le ballon, qui revient vers lui en repassant par l'adversaire. Sa flemme : une sieste en plein
   combat (il encaisse un coup sans broncher et récupère de la vie), puis un réveil en mauvaise humeur. */
import { hit, moveSet, special, superMove } from '../move-builders';
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

/** La flemme : sieste qui encaisse un coup et soigne, puis coup de pied de réveil. */
const flemme = (heavy: boolean) => {
  const total = heavy ? 74 : 62;
  const wake = heavy ? 48 : 38;
  return special({
    name: 'Flemme',
    total,
    low: true,
    armor: [4, heavy ? 40 : 30],
    heal: { t: heavy ? 36 : 28, amount: heavy ? 90 : 60 },
    anim: [
      [0, 'crouch', 0.9],
      [5, 'nap', 1],
      [wake - 4, 'windK', 0.9],
      [wake, 'hk', 1],
      [total - 10, 'idle', 0.35],
    ],
    hits: [
      hit(wake, 5, [10, -130, 110, 100], heavy ? 95 : 80, {
        launch: [5, -9],
        fx: 'heavy',
        kb: 7,
        stop: 12,
        sw: 'up',
      }),
    ],
  });
};

export const lazy: StyleDef = {
  id: 'lazy',
  label: 'Flemmard',
  hint: 'Une-deux au ballon, sieste qui soigne',
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
