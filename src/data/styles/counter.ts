/* MAÎTRE DU CONTRE : attend l'attaque. Sa garde de fer absorbe un coup (même un projectile) et
   déclenche aussitôt une riposte ; ratée, elle le laisse sans défense un instant. */
import { hit, moveSet, special, superMove, type MoveSpec } from '../move-builders';
import { NORMALS } from '../normals';
import type { AnimKey, HitDef, MoveDef, StyleDef } from '../types';

/** Contre-attaque jouée automatiquement quand la garde de fer absorbe un coup. */
const riposte = (id: 's1l' | 's1h'): MoveDef => ({
  id,
  rank: 10,
  name: 'Riposte',
  total: 30,
  sprite: 'sp_palm_strike',
  inv: [0, 8],
  anim: [
    [0, 'palm', 1],
    [18, 'idle', 0.35],
  ],
  vel: [[0, 6, 8]],
  hits: [hit(2, 5, [0, -185, 115, 120], 110, { launch: [8, -10], fx: 'heavy', stop: 16, bs: 18, kb: 12 })],
});

const ironGuard = (heavy: boolean): MoveSpec =>
  special({
    name: 'Garde de fer',
    total: heavy ? 36 : 30,
    sprite: 'sp_counter_stance',
    anim: [
      [0, 'counterStance', 1],
      [heavy ? 30 : 24, 'idle', 0.35],
    ],
    // fenêtre plus longue en version forte, mais une récupération plus longue si rien n'arrive
    counter: { from: 2, to: heavy ? 26 : 20, riposte: riposte(heavy ? 's1h' : 's1l') },
  });

/** Paume qui repousse, prolongée par une courte onde de souffle. */
const palmBlast = (heavy: boolean) =>
  special({
    name: 'Paume de souffle',
    total: 32,
    sprite: 'sp_palm_strike',
    anim: [
      [0, 'windP', 0.9],
      [5, 'palm', 1],
      [22, 'idle', 0.35],
    ],
    hits: [hit(6, 4, [10, -170, 100, 60], heavy ? 85 : 70, { kb: 14, hs: 22, fx: 'heavy' })],
    proj: {
      t: 7,
      look: 'palm',
      sprite: 'pj_palm_wave',
      vx: heavy ? 9 : 7,
      x: 90,
      y: -140,
      w: 60,
      h: 70,
      dmg: 40,
      hs: 18,
      bs: 12,
      kb: 8,
      fx: 'punch',
      life: 16,
    },
  });

/** Super : dix paumes en rafale, la dernière projette. */
function hundredPalms() {
  const hits: HitDef[] = [];
  const anim: AnimKey[] = [[0, 'charge', 0.8]];
  for (let i = 0; i < 10; i++) {
    const t = 6 + i * 3;
    hits.push(hit(t, 3, [-10, -190, 130, 160], 24, { hs: 24, bs: 10, kb: 0, fx: 'punch', stop: 3 }));
    anim.push([t, i % 2 ? 'lp' : 'palm', 1]);
  }
  hits.push(hit(38, 5, [-10, -200, 140, 180], 100, { launch: [10, -12], fx: 'heavy', stop: 16, kb: 14 }));
  anim.push([37, 'palm', 1], [54, 'idle', 0.3]);
  return superMove({
    name: 'CENT PAUMES',
    total: 62,
    sprite: 'sp_palm_strike',
    anim,
    vel: [[3, 7, 18]],
    hits,
  });
}

export const counter: StyleDef = {
  id: 'counter',
  label: 'Maître du contre',
  hint: 'Garde qui renvoie les coups, paume de souffle',
  archetype: 'Contre',
  tags: ['Contre', 'Projectile', 'Multi-coups'],
  stats: { hp: 1000, speed: 4.5, jump: 23, power: 1 },
  names: { s1: 'Garde de fer', s2: 'Paume de souffle', super: 'CENT PAUMES' },
  moves: moveSet({
    ...NORMALS,
    s1l: ironGuard(false),
    s1h: ironGuard(true),
    s2l: palmBlast(false),
    s2h: palmBlast(true),
    super: hundredPalms(),
  }),
  ai: { zoner: 0.15, antiAir: 's1h', ender: 's2h' },
};
