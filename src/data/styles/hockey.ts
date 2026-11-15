/* HOCKEYEUR : un palet qui file au ras du sol (il se bloque accroupi ou se saute), une mise en échec
   qui encaisse les coups et renverse, et la bagarre de hockey en super : il jette les gants, agrippe
   le maillot et cogne. */
import { hit, moveSet, special, superMove } from '../move-builders';
import { NORMALS } from '../normals';
import type { AnimKey, HitDef, StyleDef } from '../types';

/** Lancer frappé : crosse armée haut derrière, frappe, le palet part au ras de la glace. */
const slapshot = (heavy: boolean) =>
  special({
    name: 'Lancer frappé',
    total: heavy ? 40 : 34,
    sprite: 'sp_slapshot',
    anim: [
      [0, 'windStick', 0.8],
      [heavy ? 10 : 7, 'slapshot', 1],
      [heavy ? 30 : 26, 'idle', 0.35],
    ],
    proj: {
      t: heavy ? 12 : 9,
      vx: heavy ? 17 : 12,
      look: 'puck',
      sprite: 'pj_puck',
      x: 80,
      y: -12,
      w: 40,
      h: 18,
      dmg: heavy ? 75 : 65,
      hs: 20,
      bs: 12,
      kb: 6,
      fx: 'ice',
      ground: true,
      lvl: 'low',
    },
  });

/** Mise en échec : charge épaule en avant, encaisse les coups pendant l'élan et renverse. */
const bodyCheck = (heavy: boolean) =>
  special({
    name: 'Mise en échec',
    total: heavy ? 44 : 38,
    sprite: 'sp_body_check',
    anim: [
      [0, 'windP', 0.9],
      [5, 'bodyCheck', 1],
      [heavy ? 30 : 26, 'idle', 0.35],
    ],
    armor: [3, heavy ? 18 : 14],
    vel: [[4, heavy ? 20 : 16, heavy ? 13 : 10]],
    hits: [
      hit(8, heavy ? 12 : 8, [0, -185, 85, 175], heavy ? 105 : 90, {
        launch: [heavy ? 9 : 7, -9],
        fx: 'heavy',
        kb: 10,
        bs: 14,
        sw: 'thrust',
        stop: 14,
      }),
    ],
  });

/** Super : jette les gants, agrippe le maillot (imparable), cinq coups de poing, puis le dernier qui envoie au tapis. */
function dropTheGloves() {
  const hits: HitDef[] = [
    hit(6, 5, [0, -190, 95, 170], 30, { grab: true, hs: 60, kb: 0, fx: 'punch', stop: 10 }),
  ];
  const anim: AnimKey[] = [
    [0, 'charge', 0.8],
    [4, 'grab', 1],
  ];
  for (let i = 0; i < 5; i++) {
    const t = 16 + i * 6;
    hits.push(hit(t, 3, [-20, -200, 140, 180], 26, { hs: 60, kb: 0, fx: 'punch', stop: 4 }));
    anim.push([t - 3, 'brawl', 1], [t, i % 2 ? 'lp' : 'hp', 1]);
  }
  hits.push(hit(50, 4, [-20, -210, 150, 200], 110, { launch: [8, -12], fx: 'heavy', stop: 18, sw: 'side' }));
  anim.push([46, 'brawl', 1], [50, 'hp', 1], [62, 'idle', 0.3]);
  return superMove({ name: 'JETTE LES GANTS', total: 72, sprite: 'sp_hockey_fight', anim, hits });
}

export const hockey: StyleDef = {
  id: 'hockey',
  label: 'Hockeyeur',
  hint: 'Palet au ras du sol, mise en échec, bagarre',
  archetype: 'Bagarreur',
  tags: ['Projectile', 'Coup bas', 'Armure', 'Prise'],
  stats: { hp: 1050, speed: 4.4, jump: 21, power: 1.05 },
  names: { s1: 'Lancer frappé', s2: 'Mise en échec', super: 'JETTE LES GANTS' },
  moves: moveSet({
    ...NORMALS,
    s1l: slapshot(false),
    s1h: slapshot(true),
    s2l: bodyCheck(false),
    s2h: bodyCheck(true),
    super: dropTheGloves(),
  }),
  ai: { zoner: 0.45, antiAir: 'chp', ender: 's2h' },
};
