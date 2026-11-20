/* DANSEUSE (de boîte de nuit) : tout passe par la danse. Pirouettes qui avancent en plusieurs touches,
   figure de pole dance qui fouette tout autour d'elle (y compris en l'air), et en super les projecteurs
   du club qui balaient la piste. */
import { hit, moveSet, special, superMove } from '../move-builders';
import { NORMALS } from '../normals';
import type { AnimKey, HitDef, StyleDef } from '../types';

/** Pirouettes : elle avance en tournant, plusieurs touches. */
const pirouette = (heavy: boolean) => {
  const count = heavy ? 4 : 3;
  const hits: HitDef[] = [];
  const anim: AnimKey[] = [[0, 'windK', 0.9]];
  for (let i = 0; i < count; i++) {
    const t = 5 + i * 6;
    const last = i === count - 1;
    hits.push(
      hit(
        t,
        4,
        [-10, -190, 110, 170],
        30,
        last ? { launch: [5, -8], fx: 'kick', stop: 10 } : { hs: 18, kb: 1, fx: 'kick' },
      ),
    );
    anim.push([t - 1, i % 2 ? 'spinK2' : 'pirouette', 1]);
  }
  anim.push([5 + count * 6 + 4, 'idle', 0.35]);
  return special({
    name: 'Pirouette',
    total: 5 + count * 6 + 16,
    sprite: 'sp_pirouette',
    trail: true,
    anim,
    vel: [[3, 5 + count * 6, heavy ? 6 : 5]],
    hits,
  });
};

/** Pole dance : accrochée à sa barre, elle fouette devant, derrière et en hauteur (anti-aérien). */
const poleDance = (heavy: boolean) =>
  special({
    name: 'Pole dance',
    total: heavy ? 46 : 40,
    inv: [0, 5],
    sprite: 'sp_pole_spin',
    anim: [
      [0, 'windU', 0.9],
      [4, 'poleSpin', 1],
      [heavy ? 34 : 30, 'idle', 0.35],
    ],
    hits: [8, 16, heavy ? 24 : 0]
      .filter((t) => t > 0)
      .map((t, i, all) =>
        hit(t, 5, [-110, -240, 230, 220], 32, {
          sw: 'side',
          fx: 'kick',
          ...(i === all.length - 1 ? { launch: [5, -12], stop: 12 } : { hs: 18, kb: 1 }),
        }),
      ),
  });

/** Super : les projecteurs du club s'allument et balaient la piste vers l'adversaire. */
const dancefloor = () =>
  superMove({
    name: 'DANCEFLOOR',
    total: 70,
    sprite: 'sp_pirouette',
    anim: [
      [0, 'charge', 0.8],
      [8, 'pirouette', 1],
      [20, 'spinK2', 1],
      [32, 'pirouette', 1],
      [56, 'idle', 0.3],
    ],
    proj: {
      t: 14,
      look: 'bolt',
      sprite: 'pj_spotlight',
      vx: 3,
      x: 150,
      y: -200,
      w: 90,
      h: 400,
      dmg: 32,
      hits: 5,
      hs: 24,
      bs: 10,
      kb: 2,
      fx: 'elec',
      life: 70,
      comboOnTarget: true,
      launchLast: [4, -13],
    },
  });

export const dancer: StyleDef = {
  id: 'dancer',
  label: 'Danseuse',
  hint: 'Pirouettes, pole dance, projecteurs du club',
  archetype: 'Tourbillon',
  tags: ['Multi-coups', 'Anti-aérien', 'Invincible'],
  stats: { hp: 950, speed: 4.9, jump: 24, power: 0.95 },
  names: { s1: 'Pirouette', s2: 'Pole dance', super: 'DANCEFLOOR' },
  moves: moveSet({
    ...NORMALS,
    s1l: pirouette(false),
    s1h: pirouette(true),
    s2l: poleDance(false),
    s2h: poleDance(true),
    super: dancefloor(),
  }),
  ai: { zoner: 0.1, antiAir: 's2h', ender: 's1h' },
};
