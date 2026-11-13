/* Types des données de jeu. Tout ce qui décrit un personnage ou un coup est déclaratif :
   le moteur lit ces objets, il ne contient aucun cas particulier par personnage. */
import type { PoseName } from './poses';
import type { SpriteKey } from './sprite-poses';

/** Les 4 boutons : poing léger/fort (A/B), pied léger/fort (C/D). */
export type Button = 'lp' | 'hp' | 'lk' | 'hk';
export const BUTTONS: readonly Button[] = ['lp', 'hp', 'lk', 'hk'];

/** 'low' se bloque accroupi, 'high' se bloque debout, 'mid' des deux façons. */
export type HitLevel = 'mid' | 'low' | 'high';
export type HitFx = 'punch' | 'kick' | 'heavy' | 'fire' | 'elec' | 'earth' | 'slash';
export type SwooshKind = 'thrust' | 'low' | 'up' | 'down' | 'side';

/** [x, y, largeur, hauteur] relatif aux pieds du combattant, x vers l'avant, y négatif vers le haut. */
export type Box = readonly [x: number, y: number, w: number, h: number];
/** [vitesse horizontale, vitesse verticale] en pixels par frame (vy négatif = vers le haut). */
export type Launch = readonly [vx: number, vy: number];

/** Une fenêtre de frappe dans un coup. Toutes les durées sont en frames (1/60 s). */
export interface HitDef {
  /** Frame de début de la frappe. */
  t: number;
  /** Durée pendant laquelle la frappe est active. */
  d: number;
  box: Box;
  dmg: number;
  /** Frames d'étourdissement si le coup touche. */
  hs: number;
  /** Frames d'étourdissement si le coup est bloqué. */
  bs: number;
  /** Recul infligé. */
  kb: number;
  lvl: HitLevel;
  fx: HitFx;
  /** Projette l'adversaire en l'air. */
  launch?: Launch;
  /** Arrêt sur image à l'impact (sinon valeur par défaut selon les dégâts). */
  stop?: number;
  sw?: SwooshKind;
}

export interface ProjectileDef {
  /** Frame d'apparition. */
  t: number;
  vx: number;
  /** Décalage de départ par rapport au lanceur. */
  x?: number;
  y: number;
  w: number;
  h: number;
  dmg: number;
  /** Nombre de touches possibles (1 par défaut). */
  hits?: number;
  hs: number;
  bs: number;
  kb: number;
  fx: HitFx;
  /** Court au ras du sol. */
  ground?: boolean;
  /** Projection appliquée par la dernière touche. */
  launchLast?: Launch;
}

/** [frame, posture visée, vitesse de transition 0..1] */
export type AnimKey = readonly [frame: number, pose: PoseName, rate: number];

export type MoveId = Button | `c${Button}` | `j${Button}` | 'fhp' | 's1l' | 's1h' | 's2l' | 's2h' | 'super';

export interface MoveDef {
  id: MoveId;
  name: string;
  /** Hiérarchie d'annulation : 1-5 coups normaux, 10 spéciaux, 20 super. */
  rank: number;
  /** Durée totale du coup. */
  total: number;
  anim: readonly AnimKey[];
  /** Sprite affiché pendant le coup (sinon celui de la posture). */
  sprite?: SpriteKey;
  hits?: readonly HitDef[];
  /** Déplacements imposés : [frame début, frame fin, vitesse vers l'avant]. */
  vel?: readonly (readonly [from: number, to: number, vx: number])[];
  /** Impulsion qui fait décoller : [frame, vx, vy]. */
  imp?: readonly [t: number, vx: number, vy: number];
  proj?: ProjectileDef;
  /** Fenêtre d'invincibilité [début, fin]. */
  inv?: readonly [from: number, to: number];
  /** Fenêtre pendant laquelle un coup est encaissé sans broncher. */
  armor?: readonly [from: number, to: number];
  tele?: { t: number; mode: 'near' | 'front' | 'behind' };
  /** Fenêtre pendant laquelle le combattant est invisible. */
  vanish?: readonly [from: number, to: number];
  /** Frame d'une secousse d'écran (frappe au sol). */
  shakeAt?: number;
  /** Coût en jauge de super. */
  cost?: number;
  /** Déclenche l'arrêt sur image du super. */
  flash?: boolean;
  trail?: boolean;
  /** Coup aérien. */
  air?: boolean;
  /** Coup accroupi : zone vulnérable basse. */
  low?: boolean;
  /** Annulable par un saut quand il touche (lanceur). */
  jc?: boolean;
  /** Frames de récupération à l'atterrissage. */
  landRec?: number;
  sfx?: 'special' | 'super';
}

export type MoveSet = Record<MoveId, MoveDef>;

export interface FighterStats {
  hp: number;
  /** Vitesse de marche en pixels par frame. */
  speed: number;
  /** Vitesse verticale initiale du saut. */
  jump: number;
  /** Multiplicateur de dégâts. */
  power: number;
}

export type StyleId = 'balanced' | 'fast' | 'heavy' | 'tech';

/** Un style de combat : statistiques + jeu de coups. Plusieurs personnages peuvent partager un style. */
export interface StyleDef {
  id: StyleId;
  label: string;
  hint: string;
  stats: FighterStats;
  names: { s1: string; s2: string; super: string };
  /** Descriptions des poses propres au style, pour les prompts de génération d'images. */
  spriteDesc: Partial<Record<SpriteKey, string>>;
  /** Posture du pantin servant de guide pour ces poses. */
  spriteRig: Partial<Record<SpriteKey, PoseName>>;
  moves: MoveSet;
  /** Préférences de la console quand elle joue ce style. */
  ai: { zoner: number; antiAir: MoveId; ender: MoveId };
}

export type HairStyle = 'spiky' | 'ponytail' | 'long' | 'mohawk' | 'hood' | 'short' | 'bald';

/** Apparence du pantin provisoire (utilisé tant qu'aucun sprite n'est fourni). */
export interface Look {
  /** Taille relative (1 = standard). */
  h: number;
  /** Corpulence relative. */
  bulk: number;
  head?: number;
  skin: string;
  hair: HairStyle;
  hairCol: string;
  beard?: string;
  top: string;
  sleeve: 'none' | 'short' | 'long';
  outfit: 'gi' | 'stripe' | 'emblem' | 'none';
  pants: string;
  shorts?: boolean;
  belt: string;
  band?: string;
  scarf?: string;
  glove?: string;
  shoe?: string;
  accent: string;
}

/** Ce qu'on écrit pour déclarer un personnage. */
export interface CharacterDef {
  id: string;
  name: string;
  style: StyleId;
  color: string;
  look?: Look;
  title?: string;
  quote?: string;
  /** Numéro du décor « à domicile ». */
  stage?: number;
  ending?: readonly string[];
  /** Créé par le joueur (modifiable dans Options ▸ Personnages). */
  custom?: boolean;
  /** Livré dans public/assets/characters. */
  repo?: boolean;
}

/** Personnage prêt à jouer : sa définition complétée par son style et son apparence. */
export interface Character extends Required<Omit<CharacterDef, 'style' | 'custom' | 'repo'>> {
  styleId: StyleId;
  style: StyleDef;
  custom: boolean;
  repo: boolean;
}
