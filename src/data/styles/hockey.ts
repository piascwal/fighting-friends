/* HOCKEYEUR : un palet qui file au ras du sol (il se bloque accroupi ou se saute), une mise en échec
   qui encaisse les coups et renverse, et la bagarre de hockey en super : il jette les gants, agrippe
   le maillot et cogne. */
import { hit, moveSet, special, superMove } from '../move-builders';
import { NORMALS } from '../normals';
import type { AnimKey, HitDef, StyleDef, StyleGear } from '../types';

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

/** La crosse, présente sur toutes les images sauf la bagarre (gants jetés) et le portrait. */
const STICK: StyleGear = {
  hold: 'Il garde sa crosse de hockey en main : serrée dans le poing ARRIÈRE (celui qui ne frappe pas), lame vers le bas, entière et bien visible, sans cacher le visage',
  poses: {
    idle: "posture de garde de hockeyeur : debout, genoux fléchis, buste légèrement penché vers l'avant, sa crosse de hockey tenue à deux mains devant lui (main arrière en haut du manche, main avant plus bas), lame posée au sol devant ses pieds, regard déterminé",
    walk1:
      "en train d'avancer, sa crosse de hockey tenue à deux mains devant lui, lame au ras du sol : grand pas en avant, jambe avant loin devant, jambe arrière tendue derrière",
    walk2:
      "en train d'avancer, sa crosse de hockey tenue à deux mains devant lui, lame au ras du sol : jambes croisées en plein milieu d'un pas (la jambe arrière passe devant)",
    crouch:
      "accroupi TRÈS bas, comme un combattant qui esquive en se baissant : genoux complètement fléchis, fesses presque posées sur les talons, genou de la jambe arrière quasiment au sol, buste penché vers l'avant, sa crosse de hockey tenue à deux mains devant lui, lame posée au sol",
    block:
      "en train de bloquer un coup : debout, sa crosse de hockey tenue à deux mains à l'horizontale devant le visage, comme une barrière, buste légèrement en retrait",
    crouch_block:
      "accroupi TRÈS bas en train de bloquer (fesses presque posées sur les talons, genou arrière quasiment au sol) : sa crosse de hockey tenue à deux mains à l'horizontale devant le visage, comme une barrière, tête rentrée",
    super:
      'il se prépare à la bagarre : il vient de jeter sa crosse et ses gants, qui tombent à ses pieds ; jambes écartées, poings nus serrés et levés, il hurle',
    win: "pose de victoire : debout bien droit, il brandit sa crosse de hockey à bout de bras au-dessus de la tête, l'autre poing serré, grand sourire triomphant",
    intro:
      "pose d'entrée en scène avant le combat : debout bien droit, sa crosse de hockey posée sur l'épaule, l'autre main sur la hanche, regard de défi",
  },
};

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
  gear: STICK,
  ai: { zoner: 0.45, antiAir: 'chp', ender: 's2h' },
};
