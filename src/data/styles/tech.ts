/* TECHNIQUE : une lame rapide à distance et une téléportation qui retombe sur l'adversaire. */
import { hit, moveSet, special, superMove } from '../move-builders';
import { NORMALS } from '../normals';
import type { AnimKey, HitDef, StyleDef } from '../types';

const shadowBlade = (heavy: boolean) =>
  special({
    name: "Lame d'ombre",
    total: 28,
    sprite: 'sp_blade_throw',
    anim: [
      [0, 'windP', 0.9],
      [5, 'throwS', 1],
      [18, 'idle', 0.35],
    ],
    proj: {
      t: 6,
      vx: heavy ? 19 : 14,
      look: 'blade',
      sprite: 'pj_blade',
      y: -130,
      w: 44,
      h: 34,
      dmg: 52,
      hs: 17,
      bs: 12,
      kb: 5,
      fx: 'slash',
    },
  });

/** Disparaît puis retombe en coup de pied : devant l'adversaire (léger) ou dans son dos (fort). */
const phantomDrop = (heavy: boolean) =>
  special({
    name: 'Chute fantôme',
    total: 90,
    landRec: 8,
    inv: [0, 9],
    sprite: 'sp_dive_kick',
    trail: true,
    anim: [
      [0, 'crouch', 0.9],
      [7, 'diveK', 1],
    ],
    tele: { t: 7, mode: heavy ? 'behind' : 'front' },
    vanish: [2, 7],
    hits: [hit(9, 40, [0, -70, 80, 90], 95, { hs: 24, bs: 14, kb: 7, fx: 'slash', lvl: 'high' })],
  });

/** Super : réapparaît au contact, 7 coups de lame puis un coup de pied final. */
function endlessNight() {
  const SLASHES = 7;
  const hits: HitDef[] = [];
  const anim: AnimKey[] = [[0, 'charge', 0.8]];
  for (let i = 0; i < SLASHES; i++) {
    const upward = i % 2 === 1;
    hits.push(
      hit(8 + i * 4, 3, [-20, -200, 140, 190], 36, {
        hs: 26,
        bs: 10,
        kb: 0,
        fx: 'slash',
        stop: 3,
        sw: upward ? 'up' : 'down',
      }),
    );
    anim.push([7 + i * 4, upward ? 'slash2' : 'slash', 1]);
  }
  hits.push(
    hit(38, 5, [-20, -210, 150, 200], 95, {
      launch: [8, -16],
      bs: 18,
      kb: 12,
      fx: 'slash',
      stop: 14,
      sw: 'side',
    }),
  );
  anim.push([36, 'hk', 1], [52, 'idle', 0.3]);
  return superMove({
    name: 'NUIT SANS FIN',
    total: 64,
    anim,
    tele: { t: 5, mode: 'near' },
    vanish: [2, 5],
    inv: [0, 8],
    hits,
  });
}

export const tech: StyleDef = {
  id: 'tech',
  label: 'Technique',
  hint: 'Lame à distance, téléportation plongeante',
  stats: { hp: 950, speed: 5.2, jump: 25, power: 0.95 },
  names: { s1: "Lame d'ombre", s2: 'Chute fantôme', super: 'NUIT SANS FIN' },
  moves: moveSet({
    ...NORMALS,
    s1l: shadowBlade(false),
    s1h: shadowBlade(true),
    s2l: phantomDrop(false),
    s2h: phantomDrop(true),
    super: endlessNight(),
  }),
  ai: { zoner: 0.45, antiAir: 'chp', ender: 's1h' },
};
