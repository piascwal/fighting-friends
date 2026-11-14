/* VOLTIGEUR : léger, rapide, toujours en mouvement. Une vrille qui décroche les sauteurs et une
   glissade qui passe sous les projectiles. */
import { hit, moveSet, special, superMove } from '../move-builders';
import { NORMALS } from '../normals';
import type { AnimKey, HitDef, StyleDef } from '../types';

/** Vrille aérienne : s'élève en tournoyant, plusieurs touches, invincible au départ. */
const risingSpin = (heavy: boolean) => {
  const frames = heavy ? [4, 10, 16, 22] : [4, 10, 16];
  return special({
    name: 'Vrille',
    total: 56,
    landRec: 10,
    inv: [0, 6],
    trail: true,
    sprite: 'sp_rising_spin',
    anim: [
      [0, 'windU', 0.9],
      [2, 'risingSpin', 1],
      [9, 'spinK2', 1],
      [15, 'risingSpin', 1],
      [21, 'spinK2', 1],
    ],
    imp: [3, heavy ? 3.5 : 2.5, heavy ? -19 : -16],
    hits: frames.map((t, i) =>
      hit(
        t,
        4,
        [-10, -200, 110, 160],
        38,
        i === frames.length - 1
          ? { launch: [4, -11], fx: 'kick', sw: 'up', stop: 10 }
          : { hs: 20, kb: 1, fx: 'kick', sw: 'up' },
      ),
    ),
  });
};

/** Glissade au ras du sol : se bloque accroupi, passe sous les projectiles hauts. */
const slide = (heavy: boolean) =>
  special({
    name: 'Glissade',
    total: 34,
    low: true,
    sprite: 'sp_slide',
    anim: [
      [0, 'crouch', 0.9],
      [3, 'slide', 1],
      [24, 'crouch', 0.35],
    ],
    vel: [[3, 18, heavy ? 16 : 12]],
    hits: [
      hit(4, 12, [0, -50, 110, 50], heavy ? 80 : 65, { lvl: 'low', launch: [3, -7], fx: 'kick', sw: 'low' }),
    ],
  });

/** Super : s'élève en tornade, huit touches, la dernière projette haut. */
function tornado() {
  const hits: HitDef[] = [];
  const anim: AnimKey[] = [
    [0, 'charge', 0.8],
    [5, 'windU', 1],
  ];
  for (let i = 0; i < 8; i++) {
    const t = 8 + i * 3;
    hits.push(hit(t, 3, [-30, -220, 150, 200], 26, { hs: 24, bs: 10, kb: 0, fx: 'kick', stop: 3, sw: 'up' }));
    anim.push([t, i % 2 ? 'spinK2' : 'risingSpin', 1]);
  }
  hits.push(hit(34, 4, [-30, -230, 150, 210], 90, { launch: [5, -16], fx: 'kick', stop: 16, sw: 'up' }));
  return superMove({
    name: 'TORNADE',
    total: 70,
    landRec: 12,
    sprite: 'sp_rising_spin',
    anim,
    imp: [6, 2, -21],
    hits,
  });
}

export const acrobat: StyleDef = {
  id: 'acrobat',
  label: 'Voltigeur',
  hint: 'Vrille anti-aérienne, glissade sous les projectiles',
  stats: { hp: 900, speed: 5.4, jump: 26, power: 0.9 },
  names: { s1: 'Vrille', s2: 'Glissade', super: 'TORNADE' },
  moves: moveSet({
    ...NORMALS,
    s1l: risingSpin(false),
    s1h: risingSpin(true),
    s2l: slide(false),
    s2h: slide(true),
    super: tornado(),
  }),
  ai: { zoner: 0, antiAir: 's1h', ender: 's2h' },
};
