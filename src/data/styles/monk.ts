/* MOINE : endurant. Sa méditation lui rend de la vie (s'il trouve le temps de la faire), et son genou du
   lotus décroche les sauteurs. */
import { hit, moveSet, special, superMove } from '../move-builders';
import { NORMALS } from '../normals';
import type { StyleDef } from '../types';

const lotusKnee = (heavy: boolean) =>
  special({
    name: 'Genou du lotus',
    total: 50,
    landRec: 10,
    inv: [0, 5],
    sprite: 'sp_lotus_knee',
    anim: [
      [0, 'windU', 1],
      [2, 'lotusKnee', 1],
    ],
    imp: [3, 2, heavy ? -15 : -13],
    hits: [
      hit(3, 10, [0, -210, 80, 160], heavy ? 105 : 90, { launch: [3, -12], fx: 'heavy', sw: 'up', stop: 10 }),
    ],
  });

/** Méditation : rend de la vie à la fin ; plus longue (et plus risquée) en version forte. */
const meditation = (heavy: boolean) => {
  const total = heavy ? 70 : 50;
  return special({
    name: 'Méditation',
    total,
    low: true,
    sprite: 'sp_meditate',
    anim: [
      [0, 'meditate', 0.9],
      [total - 8, 'idle', 0.35],
    ],
    heal: { t: total - 12, amount: heavy ? 120 : 70 },
  });
};

export const monk: StyleDef = {
  id: 'monk',
  label: 'Moine',
  hint: 'Méditation qui soigne, genou anti-aérien',
  archetype: 'Endurant',
  tags: ['Soin', 'Anti-aérien', 'Invincible'],
  stats: { hp: 1050, speed: 4.2, jump: 23, power: 0.95 },
  names: { s1: 'Genou du lotus', s2: 'Méditation', super: 'ILLUMINATION' },
  moves: moveSet({
    ...NORMALS,
    s1l: lotusKnee(false),
    s1h: lotusKnee(true),
    s2l: meditation(false),
    s2h: meditation(true),
    // super : se soigne, puis libère une onde tout autour
    super: superMove({
      name: 'ILLUMINATION',
      total: 52,
      inv: [0, 20],
      anim: [
        [0, 'meditate', 1],
        [14, 'burst', 1],
        [40, 'idle', 0.3],
      ],
      heal: { t: 12, amount: 150 },
      hits: [hit(16, 6, [-80, -240, 220, 240], 120, { launch: [5, -15], fx: 'ice', stop: 16, sw: 'up' })],
    }),
  }),
  ai: { zoner: 0.1, antiAir: 's1h', ender: 's1h' },
};
