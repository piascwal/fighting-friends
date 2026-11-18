/* DRESSEUR : il se bat avec son animal de compagnie. L'animal arrive de derrière lui en courant, ou
   bondit par-dessus lui, frappe l'adversaire comme pour jouer, puis repart en courant hors de l'écran.
   Rien ici n'est propre à un chien : l'animal est celui de la photo fournie pour ses images. */
import { moveSet, special, superMove } from '../move-builders';
import { NORMALS } from '../normals';
import type { ProjectileDef, StyleDef } from '../types';

/** L'animal en course : il part de derrière le dresseur et traverse tout l'écran. */
const RUN: Pick<ProjectileDef, 'look' | 'sprite' | 'frames' | 'y' | 'w' | 'h' | 'fx' | 'persist'> = {
  look: 'companion',
  sprite: 'pj_pet_run1',
  frames: ['pj_pet_run1', 'pj_pet_run2'],
  y: -32,
  w: 84,
  h: 64,
  fx: 'kick',
  // une fois l'adversaire bousculé, il continue sa course et sort de l'écran
  persist: true,
};

/** « Va chercher ! » : il pointe l'adversaire, l'animal surgit de derrière lui et le bouscule. */
const fetch = (heavy: boolean) =>
  special({
    name: 'Va chercher !',
    total: heavy ? 38 : 34,
    sprite: 'sp_call_pet',
    anim: [
      [0, 'windP', 0.9],
      [5, 'command', 1],
      [28, 'idle', 0.35],
    ],
    proj: {
      ...RUN,
      t: 8,
      vx: heavy ? 13 : 10,
      x: -230,
      dmg: heavy ? 80 : 70,
      hs: 20,
      bs: 12,
      kb: 7,
      life: 150,
      launchLast: heavy ? [4, -7] : undefined,
    },
  });

/** « Saute ! » : l'animal bondit par-dessus le dresseur et retombe sur l'adversaire (se bloque debout). */
const leap = (heavy: boolean) =>
  special({
    name: 'Saute !',
    total: 40,
    sprite: 'sp_signal_jump',
    anim: [
      [0, 'windU', 0.9],
      [5, 'signal', 1],
      [30, 'idle', 0.35],
    ],
    proj: {
      ...RUN,
      t: 10,
      sprite: 'pj_pet_leap',
      vx: heavy ? 9 : 7,
      vy: -16,
      gravity: 0.75,
      landRun: true,
      x: -150,
      y: -40,
      h: 70,
      dmg: heavy ? 90 : 80,
      hs: 22,
      bs: 14,
      kb: 6,
      lvl: 'high',
      life: 190,
    },
  });

/** Super : l'animal déboule et s'acharne sur l'adversaire à coups de pattes joueurs, puis le renverse. */
const bestFriends = () =>
  superMove({
    name: 'MEILLEURS AMIS',
    total: 62,
    sprite: 'sp_call_pet',
    anim: [
      [0, 'charge', 0.8],
      [8, 'command', 1],
      [50, 'idle', 0.3],
    ],
    proj: {
      ...RUN,
      t: 12,
      vx: 6,
      x: -260,
      w: 110,
      dmg: 34,
      hits: 5,
      hs: 26,
      bs: 10,
      kb: 2,
      life: 200,
      launchLast: [7, -13],
    },
    // le dresseur ne frappe pas lui-même : c'est son compagnon qui fait tout
  });

export const trainer: StyleDef = {
  id: 'trainer',
  label: 'Dresseur',
  hint: 'Son animal de compagnie fonce, bondit et bouscule',
  archetype: 'Invocateur',
  tags: ['À distance', 'Casse-garde', 'Multi-coups'],
  stats: { hp: 1000, speed: 4.5, jump: 23, power: 1 },
  names: { s1: 'Va chercher !', s2: 'Saute !', super: 'MEILLEURS AMIS' },
  moves: moveSet({
    ...NORMALS,
    s1l: fetch(false),
    s1h: fetch(true),
    s2l: leap(false),
    s2h: leap(true),
    super: bestFriends(),
  }),
  ai: { zoner: 0.55, antiAir: 'chp', ender: 's1h' },
};
