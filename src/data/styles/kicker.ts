/* TAEKWONDO : des jambes partout. Des pieds fouettés qui avancent et un coup de pied de hache qui
   retombe sur la garde basse. */
import { hit, moveSet, special, superMove } from '../move-builders';
import { NORMALS } from '../normals';
import type { AnimKey, HitDef, StyleDef } from '../types';

/** Pieds fouettés en avançant : réutilise l'image du pied léger. */
const snapKicks = (heavy: boolean) => {
  const count = heavy ? 4 : 3;
  const hits: HitDef[] = [];
  const anim: AnimKey[] = [[0, 'windK', 0.9]];
  for (let i = 0; i < count; i++) {
    const t = 5 + i * 6;
    const last = i === count - 1;
    hits.push(
      hit(
        t,
        3,
        [10, -150, 110, 60],
        30,
        last ? { hs: 22, kb: 9, fx: 'kick', sw: 'side' } : { hs: 20, kb: 1, fx: 'kick', sw: 'side' },
      ),
    );
    anim.push([t - 2, 'lk', 1], [t + 2, 'windK', 1]);
  }
  anim.push([5 + count * 6, 'idle', 0.35]);
  return special({
    name: 'Pieds fouettés',
    total: heavy ? 40 : 32,
    sprite: 'kick_light',
    anim,
    vel: [[2, 2 + count * 6, 5]],
    hits,
  });
};

/** Coup de pied de hache : la jambe monte, puis retombe ; il se bloque debout. */
const axeKick = (heavy: boolean) =>
  special({
    name: 'Coup de pied de hache',
    total: 40,
    sprite: 'sp_axe_kick',
    anim: [
      [0, 'windK', 0.9],
      [4, 'axeKick', 1],
      [14, 'hk', 1],
      [28, 'idle', 0.35],
    ],
    vel: [[4, 14, 3]],
    hits: [
      hit(14, 4, [10, -200, 100, 200], heavy ? 110 : 95, {
        lvl: 'high',
        fx: 'heavy',
        sw: 'down',
        kb: 6,
        hs: 24,
        stop: 12,
      }),
    ],
  });

/** Super : hélice de coups de pied en avançant, neuf touches. */
function propeller() {
  const hits: HitDef[] = [];
  const anim: AnimKey[] = [[0, 'charge', 0.8]];
  for (let i = 0; i < 9; i++) {
    const t = 6 + i * 4;
    hits.push(
      hit(t, 3, [-40, -190, 170, 120], 26, { hs: 24, bs: 10, kb: 0, fx: 'kick', stop: 3, sw: 'side' }),
    );
    anim.push([t - 1, i % 2 ? 'spinK2' : 'spinK', 1]);
  }
  hits.push(hit(42, 4, [-40, -200, 170, 140], 90, { launch: [8, -13], fx: 'heavy', stop: 16, sw: 'side' }));
  anim.push([41, 'hk', 1], [58, 'idle', 0.3]);
  return superMove({ name: 'HÉLICE', total: 66, anim, vel: [[4, 40, 7]], hits });
}

export const kicker: StyleDef = {
  id: 'kicker',
  label: 'Taekwondo',
  hint: 'Pieds fouettés, coup de pied de hache',
  stats: { hp: 950, speed: 4.8, jump: 25, power: 0.95 },
  names: { s1: 'Pieds fouettés', s2: 'Coup de pied de hache', super: 'HÉLICE' },
  moves: moveSet({
    ...NORMALS,
    s1l: snapKicks(false),
    s1h: snapKicks(true),
    s2l: axeKick(false),
    s2h: axeKick(true),
    super: propeller(),
  }),
  ai: { zoner: 0, antiAir: 'chp', ender: 's1h' },
};
