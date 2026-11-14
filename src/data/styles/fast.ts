/* RAPIDE : pas de projectile, mais une ruée qui traverse l'écran et des coups de pied à touches multiples. */
import { hit, moveSet, special, superMove } from '../move-builders';
import { NORMALS } from '../normals';
import type { AnimKey, HitDef, StyleDef } from '../types';

const lightningDash = (heavy: boolean) =>
  special({
    name: 'Éclair',
    total: 32,
    trail: true,
    sprite: 'sp_dash_punch',
    anim: [
      [0, 'windP', 0.9],
      [4, 'dashP', 1],
      [22, 'idle', 0.35],
    ],
    vel: [[4, 14, heavy ? 24 : 18]],
    hits: [
      hit(
        5,
        10,
        [5, -160, 90, 80],
        heavy ? 105 : 85,
        heavy
          ? { launch: [7, -8], bs: 16, kb: 10, fx: 'elec', stop: 11 }
          : { hs: 24, bs: 15, kb: 10, fx: 'elec' },
      ),
    ],
  });

const cyclone = (heavy: boolean) => {
  const hitFrames = heavy ? [5, 12, 19] : [5, 12];
  return special({
    name: 'Cyclone',
    total: heavy ? 40 : 32,
    trail: true,
    sprite: 'sp_spin_kick',
    anim: [
      [0, 'windK', 0.9],
      [3, 'spinK', 1],
      [9, 'spinK2', 1],
      [12, 'spinK', 1],
      [16, 'spinK2', 1],
      [19, 'spinK', 1],
      [23, 'spinK2', 1],
      [heavy ? 27 : 20, 'idle', 0.35],
    ],
    vel: [[3, heavy ? 26 : 19, 8]],
    // la dernière touche projette, les précédentes maintiennent l'adversaire sur place
    hits: hitFrames.map((t, i) =>
      hit(
        t,
        4,
        [-20, -175, 120, 80],
        42,
        i === hitFrames.length - 1
          ? { launch: [5, -9.5], bs: 14, kb: 6, fx: 'kick', sw: 'side' }
          : { hs: 22, bs: 12, kb: 1, fx: 'kick', sw: 'side' },
      ),
    ),
  });
};

/** Super : une ruée, 9 coups en rafale puis un uppercut final. */
function thousandBolts() {
  const FLURRY = 9;
  const poses = ['lp', 'hp', 'lk', 'hk'] as const;
  const hits: HitDef[] = [];
  const anim: AnimKey[] = [
    [0, 'charge', 0.8],
    [3, 'dashP', 1],
  ];
  for (let i = 0; i < FLURRY; i++) {
    const t = 6 + i * 3;
    hits.push(hit(t, 3, [-10, -190, 130, 180], 30, { hs: 24, bs: 10, kb: 0, fx: 'elec', stop: 3 }));
    anim.push([t, poses[i % 4]!, 1]);
  }
  hits.push(
    hit(35, 5, [-10, -210, 130, 200], 90, {
      launch: [9, -17],
      bs: 18,
      kb: 12,
      fx: 'elec',
      stop: 14,
      sw: 'up',
    }),
  );
  anim.push([33, 'windU', 1], [35, 'upper', 1], [50, 'idle', 0.3]);
  return superMove({ name: 'MILLE ÉCLAIRS', total: 62, anim, vel: [[3, 9, 24]], hits });
}

export const fast: StyleDef = {
  id: 'fast',
  label: 'Rapide',
  hint: 'Ruée éclair, cyclone de coups de pied',
  stats: { hp: 900, speed: 5.7, jump: 25, power: 0.9 },
  names: { s1: 'Éclair', s2: 'Cyclone', super: 'MILLE ÉCLAIRS' },
  moves: moveSet({
    ...NORMALS,
    s1l: lightningDash(false),
    s1h: lightningDash(true),
    s2l: cyclone(false),
    s2h: cyclone(true),
    super: thousandBolts(),
  }),
  ai: { zoner: 0, antiAir: 'chp', ender: 's2h' },
};
