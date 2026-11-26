/* Types des données de jeu. Tout ce qui décrit un personnage ou un coup est déclaratif :
   le moteur lit ces objets, il ne contient aucun cas particulier par personnage. */
import type { PoseName } from './poses';
import type { SpriteKey } from './sprite-poses';

/** Les 4 boutons : poing léger/fort (A/B), pied léger/fort (C/D). */
export type Button = 'lp' | 'hp' | 'lk' | 'hk';
export const BUTTONS: readonly Button[] = ['lp', 'hp', 'lk', 'hk'];

/** 'low' se bloque accroupi, 'high' se bloque debout, 'mid' des deux façons. */
export type HitLevel = 'mid' | 'low' | 'high';
export type HitFx = 'punch' | 'kick' | 'heavy' | 'fire' | 'elec' | 'earth' | 'slash' | 'ice';
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
  /** Prise : imparable, mais ne saisit qu'un adversaire au sol et debout. */
  grab?: boolean;
}

/** Apparence d'un projectile quand le personnage n'a pas fourni d'image pour lui. */
export type ProjectileLook =
  | 'fire'
  | 'blade'
  | 'wave'
  | 'ice'
  | 'spike'
  | 'bolt'
  | 'bottle'
  | 'palm'
  | 'disc'
  | 'mine'
  | 'grenade'
  | 'light'
  | 'beam'
  | 'puck'
  | 'companion'
  | 'ball'
  | 'football';

export interface ProjectileDef {
  /** Frame d'apparition. */
  t: number;
  vx: number;
  look: ProjectileLook;
  /** Image du projectile fournie par le personnage (sinon : dessin selon `look`). */
  sprite?: SpriteKey;
  /** Images de course jouées en boucle quand il avance au sol (animal de compagnie). */
  frames?: readonly SpriteKey[];
  /** Lancé en cloche : au lieu de se briser au sol, il atterrit et continue en courant. */
  landRun?: boolean;
  /** Durée de vie en frames (projectiles fixes : pic, éclair). */
  life?: number;
  /** Vitesse verticale de départ et gravité (projectile lancé en cloche, qui se brise au sol). */
  vy?: number;
  gravity?: number;
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
  /** Reste affiché jusqu'au bout de sa durée de vie même après avoir touché (rayon), sans retoucher. */
  persist?: boolean;
  /** Affichage seulement : agrandit l'image (1 = taille de la zone de frappe), sans changer la zone de frappe. */
  drawScale?: number;
  /** Affichage seulement : opacité de l'image (0..1), à la place de celle de son genre (voir projectile-view.ts). */
  opacity?: number;
  /**
   * Projectile qui apparaît à distance fixe (pic, éclair) : lancé en combo (enchaîné sur un coup qui
   * touche), il apparaît plutôt sous l'adversaire, sinon il raterait un adversaire collé à soi.
   */
  comboOnTarget?: boolean;
  /** Décalage de départ quand il est lancé en combo (au lieu de `x`) : un animal qui part de plus près. */
  comboX?: number;
  /** Hauteur de la touche ('low' : à bloquer accroupi). 'mid' par défaut. */
  lvl?: HitLevel;
  /** Projection appliquée par la dernière touche. */
  launchLast?: Launch;
  /** Rebondit sur le sol (0..1 : part de vitesse conservée) et sur les bords de l'écran, au lieu de se briser. */
  bounce?: number;
  /** Frame (depuis l'apparition) où il fait demi-tour et revient vers son lanceur (une-deux). */
  turnAt?: number;
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
  /** near : au contact · front / behind : retombe en l'air devant / derrière · cross : passe dans son dos, au sol. */
  tele?: { t: number; mode: 'near' | 'front' | 'behind' | 'cross' };
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
  /** Garde de contre : un coup reçu pendant cette fenêtre est absorbé et déclenche la riposte. */
  counter?: { from: number; to: number; riposte: MoveDef };
  /** Coups qui peuvent suivre celui-ci (bouton pressé pendant la fenêtre). */
  followUps?: FollowUps;
  /** Peut partir au sol comme tout au début d'un saut (coups de charge vers le haut). */
  anywhere?: boolean;
  /** Bonus temporaire, déclenché à la frame t : dégâts et vitesse multipliés pendant `duration` frames. */
  buff?: { t: number; duration: number; power: number; speed: number };
  /** Fenêtre pendant laquelle un projectile adverse est renvoyé à son lanceur. */
  reflect?: readonly [from: number, to: number];
  /** Soin à la frame t. */
  heal?: { t: number; amount: number };
}

/** Suite d'un coup : pendant la fenêtre, un bouton enchaîne sur un autre coup (enchaînements en 3 temps, postures). */
export interface FollowUps {
  from: number;
  to: number;
  /** Seulement si le coup a touché (ou a été bloqué). */
  onHit?: boolean;
  moves: Partial<Record<Button, MoveDef>>;
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

export type StyleId =
  | 'balanced'
  | 'fast'
  | 'heavy'
  | 'tech'
  | 'grappler'
  | 'counter'
  | 'ice'
  | 'acrobat'
  | 'boxer'
  | 'kicker'
  | 'storm'
  | 'drunken'
  | 'soldier'
  | 'chain'
  | 'tiger'
  | 'berserker'
  | 'trapper'
  | 'mirror'
  | 'beam'
  | 'monk'
  | 'hockey'
  | 'trainer'
  | 'padel'
  | 'yogi'
  | 'dancer'
  | 'lazy';

/** Capacités d'un style, affichées pour aider à choisir. */
export type StyleTag =
  | 'Projectile'
  | 'Anti-aérien'
  | 'Prise'
  | 'Contre'
  | 'Renvoi'
  | 'Téléportation'
  | 'Armure'
  | 'Invincible'
  | 'Casse-garde'
  | 'Coup bas'
  | 'Charge'
  | 'Enchaînement'
  | 'Posture'
  | 'Bonus'
  | 'Piège'
  | 'Soin'
  | 'Ruée'
  | 'Multi-coups'
  | 'Fige'
  | 'À distance';

/** Accessoire d'un style, pour les prompts des images communes (garde, marche, coups de base…). */
export interface StyleGear {
  /** Phrase ajoutée aux poses qui n'ont pas de description propre : comment l'accessoire est tenu. */
  hold: string;
  /** Description complète, à la place de celle de la pose commune, quand l'accessoire change la posture. */
  poses?: Partial<Record<SpriteKey, string>>;
}

/** Animal de compagnie d'un style (Dresseur). */
export interface Companion {
  /** L'animal au repos (à côté de son maître à la sélection). */
  idle: SpriteKey;
  /** Images de course, jouées en boucle. */
  run: readonly SpriteKey[];
  /** Pose de victoire du personnage, l'animal dans les bras : remplace la pose « win » commune. */
  win: SpriteKey;
}

/** Un style de combat : statistiques + jeu de coups. Plusieurs personnages peuvent partager un style. */
export interface StyleDef {
  id: StyleId;
  label: string;
  hint: string;
  stats: FighterStats;
  names: { s1: string; s2: string; super: string };
  /** Famille de jeu, en un mot (Polyvalent, Agresseur, Zoneur…). */
  archetype: string;
  tags: readonly StyleTag[];
  /** Manipulation des coups spéciaux : quart de cercle (par défaut) ou charge (arrière puis avant…). */
  input?: 'motion' | 'charge';
  moves: MoveSet;
  /** Accessoire porté en permanence (crosse…) : les prompts des poses communes en tiennent compte. */
  gear?: StyleGear;
  /** Animal de compagnie : présent à la sélection et à la victoire, et ses images (voir Companion). */
  companion?: Companion;
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
  /** Taille relative (1 = normale, voir SIZES) : change l'affichage ET les zones de coups. */
  size?: number;
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
