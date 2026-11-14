/* BOXEUR : que des poings. Une rafale de directs qui avance et un crochet plongeant qui passe la garde
   basse. Ses coups spéciaux réutilisent les images de coups de poing : peu d'images à fournir. */
import { hit, moveSet, special, superMove } from '../move-builders';
import { NORMALS } from '../normals';
import type { AnimKey, HitDef, StyleDef } from '../types';

/** Rafale de directs en avançant. */
const flurry = (heavy: boolean) => {
  const count = heavy ? 5 : 4;
  const hits: HitDef[] = [];
  const anim: AnimKey[] = [];
  for (let i = 0; i < count; i++) {
    const t = 4 + i * 4;
    const last = i === count - 1;
    hits.push(
      hit(t, 3, [10, -170, 95, 50], 22, last ? { hs: 22, kb: 8, fx: 'heavy' } : { hs: 18, kb: 1, stop: 3 }),
    );
    anim.push([t - 1, i % 2 ? 'hp' : 'lp', 1]);
  }
  anim.push([4 + count * 4 + 4, 'idle', 0.35]);
  return special({
    name: 'Rafale',
    total: heavy ? 40 : 32,
    sprite: 'punch_light',
    anim,
    vel: [[2, 4 + count * 4, 3]],
    hits,
  });
};

/** Crochet plongeant : frappe de haut en bas, il se bloque debout. */
const hookLunge = (heavy: boolean) =>
  special({
    name: 'Crochet plongeant',
    total: 38,
    sprite: 'sp_hook_lunge',
    anim: [
      [0, 'windP', 0.9],
      [6, 'hookLunge', 1],
      [26, 'idle', 0.35],
    ],
    vel: [[4, 14, heavy ? 14 : 11]],
    hits: [
      hit(10, 4, [10, -200, 100, 120], heavy ? 100 : 85, {
        lvl: 'high',
        fx: 'heavy',
        sw: 'down',
        kb: 8,
        hs: 24,
        stop: 10,
      }),
    ],
  });

/** Super : ruée, six directs, puis un uppercut qui envoie en l'air. */
function titanUppercut() {
  const hits: HitDef[] = [];
  const anim: AnimKey[] = [
    [0, 'charge', 0.8],
    [3, 'dashP', 1],
  ];
  for (let i = 0; i < 6; i++) {
    const t = 6 + i * 4;
    hits.push(hit(t, 3, [-10, -190, 130, 160], 28, { hs: 24, bs: 10, kb: 0, fx: 'punch', stop: 3 }));
    anim.push([t, i % 2 ? 'hp' : 'lp', 1]);
  }
  hits.push(hit(35, 5, [0, -230, 90, 200], 110, { launch: [3, -18], fx: 'heavy', stop: 16, sw: 'up' }));
  anim.push([32, 'windU', 1], [34, 'upper', 1], [52, 'idle', 0.3]);
  // pas d'image propre : chaque posture utilise l'image du coup de poing correspondant
  return superMove({ name: 'UPPERCUT TITAN', total: 66, anim, vel: [[3, 8, 22]], hits });
}

export const boxer: StyleDef = {
  id: 'boxer',
  label: 'Boxeur',
  hint: 'Rafale de directs, crochet plongeant',
  stats: { hp: 1050, speed: 4.6, jump: 22, power: 1.05 },
  names: { s1: 'Rafale', s2: 'Crochet plongeant', super: 'UPPERCUT TITAN' },
  moves: moveSet({
    ...NORMALS,
    s1l: flurry(false),
    s1h: flurry(true),
    s2l: hookLunge(false),
    s2h: hookLunge(true),
    super: titanUppercut(),
  }),
  ai: { zoner: 0, antiAir: 'chp', ender: 's1h' },
};
