/* BERSERKER : sa rage décuple ses forces pendant quelques secondes (dégâts et vitesse augmentés),
   au prix d'un instant sans défense pour l'invoquer. Sa charge encaisse un coup sans s'arrêter. */
import { hit, moveSet, special, superMove } from '../move-builders';
import { NORMALS } from '../normals';
import type { AnimKey, HitDef, StyleDef } from '../types';

const ram = (heavy: boolean) =>
  special({
    name: 'Coup de bélier',
    total: 40,
    trail: true,
    armor: [2, 16],
    sprite: 'sp_shoulder_charge',
    anim: [
      [0, 'windP', 0.9],
      [4, 'shoulder', 1],
      [26, 'idle', 0.35],
    ],
    vel: [[5, 16, heavy ? 15 : 12]],
    hits: [
      hit(6, 10, [0, -175, 80, 140], heavy ? 110 : 95, {
        launch: [8, -8],
        fx: 'heavy',
        stop: 12,
        bs: 18,
        kb: 10,
      }),
    ],
  });

/** Rage : 5 s (léger) ou 7 s (fort) de dégâts ×1,3 et vitesse ×1,15. */
const rage = (heavy: boolean) =>
  special({
    name: 'Rage',
    total: 34,
    sprite: 'sp_rage',
    anim: [
      [0, 'rage', 1],
      [28, 'idle', 0.35],
    ],
    buff: { t: 12, duration: heavy ? 420 : 300, power: 1.3, speed: 1.15 },
  });

/** Super : furie de coups, et la rage la plus longue. */
function fury() {
  const hits: HitDef[] = [];
  const anim: AnimKey[] = [[0, 'rage', 1]];
  for (let i = 0; i < 6; i++) {
    const t = 10 + i * 5;
    hits.push(hit(t, 3, [-10, -190, 130, 160], 34, { hs: 26, bs: 10, kb: 0, fx: 'heavy', stop: 4 }));
    anim.push([t - 1, i % 2 ? 'hp' : 'shoulder', 1]);
  }
  hits.push(hit(42, 5, [-10, -210, 140, 190], 110, { launch: [9, -13], fx: 'heavy', stop: 16 }));
  anim.push([41, 'hp', 1], [58, 'idle', 0.3]);
  return superMove({
    name: 'FURIE',
    total: 64,
    anim,
    vel: [[8, 40, 6]],
    buff: { t: 4, duration: 480, power: 1.35, speed: 1.2 },
    hits,
  });
}

export const berserker: StyleDef = {
  id: 'berserker',
  label: 'Berserker',
  hint: 'Rage qui décuple les forces, charge blindée',
  archetype: 'Bonus temporaire',
  tags: ['Bonus', 'Armure', 'Ruée'],
  stats: { hp: 1100, speed: 4, jump: 22, power: 1.05 },
  names: { s1: 'Coup de bélier', s2: 'Rage', super: 'FURIE' },
  moves: moveSet({
    ...NORMALS,
    s1l: ram(false),
    s1h: ram(true),
    s2l: rage(false),
    s2h: rage(true),
    super: fury(),
  }),
  ai: { zoner: 0, antiAir: 'chp', ender: 's1h' },
};
