/* Liste des images (sprites) qu'un personnage peut fournir : une image par pose.
   Ici les poses communes à tous les styles ; les coups spéciaux et projectiles sont dans special-poses.ts.
   Seule « idle » est obligatoire ; une pose absente utilise la première image disponible de sa liste `fb`. */
import type { PoseName } from './poses';
import { SPECIAL_POSES, type SpecialSpriteKey } from './special-poses';

/** Poses communes, demandées quel que soit le style de combat. */
export type CommonSpriteKey =
  | 'idle'
  | 'portrait'
  | 'walk1'
  | 'walk2'
  | 'crouch'
  | 'jump'
  | 'block'
  | 'crouch_block'
  | 'punch_light'
  | 'punch_heavy'
  | 'kick_light'
  | 'kick_heavy'
  | 'crouch_punch'
  | 'crouch_kick'
  | 'uppercut'
  | 'jump_punch'
  | 'jump_kick'
  | 'super'
  | 'hit'
  | 'fall'
  | 'down'
  | 'win'
  | 'intro'
  | 'stage';

export type SpriteKey = CommonSpriteKey | SpecialSpriteKey;

export interface SpritePoseSpec {
  key: SpriteKey;
  /** Nom affiché dans le menu. */
  label: string;
  req?: boolean;
  /** Posture du pantin servant de guide (null : dépend du style de combat). */
  rig: PoseName | null;
  /** Hauteur visée, 1 = personnage debout. */
  h?: number;
  /** Largeur visée, pour les poses allongées. */
  w?: number;
  /** Position du centre du corps dans la largeur de l'image détourée (0 = arrière, 1 = avant). */
  ax?: number;
  /** Sprites de repli, par ordre de préférence. */
  fb: readonly SpriteKey[];
  /** Description de la posture pour le prompt (null : fournie par le style de combat). */
  desc: string | null;
  portrait?: boolean;
  proj?: boolean;
  /** Décor du personnage : image entière, sans détourage. */
  stage?: boolean;
}

/** Poses communes, dans l'ordre d'affichage. */
export const SPRITE_POSES: readonly (SpritePoseSpec & { key: CommonSpriteKey })[] = [
  {
    key: 'idle',
    label: 'Garde (repos)',
    req: true,
    rig: 'idle',
    h: 1,
    ax: 0.5,
    fb: [],
    desc: 'posture de garde de combat : debout, jambes légèrement fléchies et écartées, les deux poings levés devant le torse, regard déterminé',
  },
  {
    key: 'portrait',
    label: 'Portrait (case de sélection)',
    rig: 'idle',
    portrait: true,
    fb: [],
    desc: 'PORTRAIT en gros plan : uniquement la tête et le haut des épaules, visage de 3/4 tourné vers la droite, expression combative. Cadrage carré serré sur le visage',
  },
  {
    key: 'walk1',
    label: 'Marche 1',
    rig: 'walkA',
    h: 1,
    ax: 0.5,
    fb: ['idle'],
    desc: "en garde et en train d'avancer : grand pas en avant, jambe avant loin devant, jambe arrière tendue derrière, poings levés",
  },
  {
    key: 'walk2',
    label: 'Marche 2',
    rig: 'walkB',
    h: 1,
    ax: 0.5,
    fb: ['walk1', 'idle'],
    desc: "en garde et en train d'avancer : jambes croisées en plein milieu d'un pas (la jambe arrière passe devant), poings levés",
  },
  {
    key: 'crouch',
    label: 'Accroupi',
    rig: 'crouch',
    h: 0.62,
    ax: 0.5,
    fb: ['idle'],
    desc: "accroupi TRÈS bas en garde de combat, comme un combattant qui esquive en se baissant : genoux complètement fléchis, fesses presque posées sur les talons, genou de la jambe arrière quasiment au sol, buste penché vers l'avant, tête rentrée dans les épaules, poings en garde devant le visage",
  },
  {
    key: 'jump',
    label: 'Saut',
    rig: 'jump',
    h: 0.9,
    ax: 0.5,
    fb: ['idle'],
    desc: 'en plein saut dans les airs : genoux repliés sous le corps, un bras levé, corps ramassé (aucun sol visible)',
  },
  {
    key: 'block',
    label: 'Blocage debout',
    rig: 'block',
    h: 1,
    ax: 0.5,
    fb: ['idle'],
    desc: 'en train de bloquer un coup : debout, les deux avant-bras relevés à la verticale devant le visage, buste légèrement en retrait',
  },
  {
    key: 'crouch_block',
    label: 'Blocage accroupi',
    rig: 'crouchBlock',
    h: 0.64,
    ax: 0.5,
    fb: ['crouch', 'block', 'idle'],
    desc: 'accroupi TRÈS bas en train de bloquer (fesses presque posées sur les talons, genou arrière quasiment au sol) : les deux avant-bras relevés à la verticale devant le visage, tête rentrée',
  },
  {
    key: 'punch_light',
    label: 'Poing léger',
    rig: 'lp',
    h: 1,
    ax: 0.36,
    fb: ['idle'],
    desc: "coup de poing rapide (jab) : bras avant complètement tendu à l'horizontale à hauteur d'épaule, l'autre poing reste en garde près du menton",
  },
  {
    key: 'punch_heavy',
    label: 'Poing fort',
    rig: 'hp',
    h: 0.97,
    ax: 0.34,
    fb: ['punch_light', 'idle'],
    desc: "coup de poing puissant (direct du bras arrière) : buste fortement engagé et penché vers l'avant, bras tendu loin devant, jambes en fente, expression de rage",
  },
  {
    key: 'kick_light',
    label: 'Pied léger',
    rig: 'lk',
    h: 1,
    ax: 0.34,
    fb: ['punch_light', 'idle'],
    desc: "coup de pied frontal rapide : jambe avant tendue à l'horizontale à hauteur du ventre, debout sur l'autre jambe, poings en garde",
  },
  {
    key: 'kick_heavy',
    label: 'Pied fort',
    rig: 'hk',
    h: 1.02,
    ax: 0.36,
    fb: ['kick_light', 'punch_light', 'idle'],
    desc: "coup de pied circulaire haut très puissant : jambe tendue levée à hauteur de tête, buste penché en arrière pour l'équilibre, debout sur l'autre jambe",
  },
  {
    key: 'crouch_punch',
    label: 'Poing accroupi',
    rig: 'cLp',
    h: 0.61,
    ax: 0.38,
    fb: ['crouch', 'punch_light', 'idle'],
    desc: "accroupi TRÈS bas (fesses presque posées sur les talons, genou arrière quasiment au sol) en donnant un coup de poing : bras avant complètement tendu à l'horizontale devant lui, à hauteur de ses épaules, l'autre poing en garde",
  },
  {
    key: 'crouch_kick',
    label: 'Balayette',
    rig: 'sweep',
    h: 0.52,
    ax: 0.3,
    fb: ['crouch', 'kick_light', 'idle'],
    desc: "balayette au ras du sol : presque assis par terre, une main posée au sol derrière lui, une jambe complètement tendue vers l'avant au niveau du sol, l'autre jambe repliée sous lui ; tout le corps reste près du sol",
  },
  {
    key: 'uppercut',
    label: 'Uppercut',
    rig: 'upper',
    h: 1.12,
    ax: 0.45,
    fb: ['punch_heavy', 'punch_light', 'idle'],
    desc: 'uppercut : corps étiré vers le haut, poing levé à la verticale au-dessus de la tête, tête basculée en arrière, sur la pointe des pieds',
  },
  {
    key: 'jump_punch',
    label: 'Poing sauté',
    rig: 'jP',
    h: 0.86,
    ax: 0.42,
    fb: ['jump_kick', 'jump', 'idle'],
    desc: "en l'air (aucun sol visible), coup de poing plongeant : bras tendu en diagonale vers le bas et l'avant, genoux repliés",
  },
  {
    key: 'jump_kick',
    label: 'Pied sauté',
    rig: 'jK',
    h: 0.86,
    ax: 0.4,
    fb: ['jump_punch', 'jump', 'idle'],
    desc: "en l'air (aucun sol visible), coup de pied sauté : une jambe tendue en diagonale vers le bas et l'avant, l'autre jambe repliée sous le corps",
  },
  {
    key: 'super',
    label: 'Super (concentration)',
    rig: 'charge',
    h: 1,
    ax: 0.5,
    fb: ['win', 'idle'],
    desc: 'concentration de toute sa puissance avant une super attaque : jambes très écartées, bras fléchis de chaque côté du corps, poings serrés, tête levée, il hurle',
  },
  {
    key: 'hit',
    label: 'Touché',
    rig: 'hit',
    h: 0.98,
    ax: 0.5,
    fb: ['idle'],
    desc: "en train d'encaisser un coup violent au visage : tête et buste rejetés en arrière, bras ballants, grimace de douleur, déséquilibré",
  },
  {
    key: 'fall',
    label: "Projeté en l'air",
    rig: 'fall',
    w: 1.0,
    ax: 0.5,
    fb: ['hit', 'idle'],
    desc: "projeté dans les airs après un coup (aucun sol visible) : corps presque à l'horizontale, dos vers le sol, tête à GAUCHE et pieds à DROITE plus hauts que la tête, bras et jambes relâchés",
  },
  {
    key: 'down',
    label: 'Au sol (K.O.)',
    rig: 'down',
    w: 1.05,
    ax: 0.5,
    fb: ['fall', 'hit', 'idle'],
    desc: "K.O., allongé à plat sur le dos : corps horizontal, tête à GAUCHE de l'image et pieds à DROITE, bras le long du corps, yeux fermés",
  },
  {
    key: 'win',
    label: 'Victoire',
    rig: 'win',
    h: 1.12,
    ax: 0.5,
    fb: ['idle'],
    desc: "pose de victoire : debout bien droit, un poing levé vers le ciel, l'autre main sur la hanche, grand sourire triomphant",
  },
  {
    key: 'intro',
    label: 'Entrée en scène',
    rig: 'intro',
    h: 1,
    ax: 0.5,
    fb: ['idle'],
    desc: "pose d'entrée en scène avant le combat : debout bien droit, bras croisés sur la poitrine, regard de défi",
  },
  { key: 'stage', label: 'Décor (scène du personnage)', rig: null, stage: true, fb: [], desc: null },
];

const SPECIAL_LIST = Object.entries(SPECIAL_POSES).map(([key, spec]) => ({ key, ...spec }) as SpritePoseSpec);

export const SPRITE_BY_KEY = Object.fromEntries(
  [...SPRITE_POSES, ...SPECIAL_LIST].map((s) => [s.key, s]),
) as Record<SpriteKey, SpritePoseSpec>;

export const isSpriteKey = (key: string): key is SpriteKey => key in SPRITE_BY_KEY;
export const isSpecialKey = (key: SpriteKey): key is SpecialSpriteKey => key in SPECIAL_POSES;
