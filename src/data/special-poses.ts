/* Images des coups spéciaux et des projectiles. Chacune porte son propre nom (et non « spécial 1 / 2 ») :
   un personnage qui change de style garde ses images, et deux styles qui partagent un geste partagent
   la même image. La liste des images demandées pour un style se déduit de ses coups (voir prompts.ts). */
import type { PoseName } from './poses';
import type { CommonSpriteKey } from './sprite-poses';

/** Même forme qu'une pose commune (SpritePoseSpec), mais les replis ne visent que des poses communes. */
interface SpecialSpec {
  label: string;
  rig: PoseName | null;
  desc: string;
  h?: number;
  w?: number;
  ax?: number;
  fb: readonly CommonSpriteKey[];
  proj?: boolean;
}

/** Posture de coup spécial : image du personnage, détourée comme les autres. */
const pose = (label: string, rig: PoseName, desc: string, extra: Partial<SpecialSpec>): SpecialSpec => ({
  label,
  rig,
  desc,
  h: 1,
  ax: 0.42,
  fb: ['punch_heavy', 'idle'],
  ...extra,
});

/** Projectile : image d'un effet seul, sans personnage. */
const projectile = (label: string, desc: string): SpecialSpec => ({
  label,
  rig: null,
  proj: true,
  fb: [],
  desc,
});

export const SPECIAL_POSES = {
  // ---------- gestes de coups spéciaux ----------
  sp_energy_cast: pose(
    "Lancer d'énergie",
    'cast',
    "lancer d'une boule d'énergie : jambes en fente, buste engagé, les deux bras tendus vers l'avant, paumes ouvertes jointes devant lui (ne dessine PAS l'énergie)",
    { h: 0.95, ax: 0.38 },
  ),
  sp_rising_uppercut: pose(
    'Uppercut sauté',
    'upper',
    "uppercut sauté : en l'air (aucun sol visible), corps étiré en diagonale vers le haut, un poing levé très haut au-dessus de la tête, un genou relevé",
    { h: 1.1, ax: 0.45, fb: ['uppercut', 'punch_heavy', 'idle'] },
  ),
  sp_dash_punch: pose(
    'Poing en pleine ruée',
    'dashP',
    "coup de poing en pleine ruée : corps très penché vers l'avant presque à l'horizontale, bras avant tendu droit devant, jambe arrière tendue loin derrière, comme un sprint",
    { h: 0.85 },
  ),
  sp_spin_kick: pose(
    'Coup de pied tournoyant',
    'spinK',
    "coup de pied tournoyant : debout sur une jambe, l'autre jambe tendue à l'horizontale à hauteur de poitrine, bras écartés pour l'équilibre, corps en pleine rotation",
    { fb: ['kick_heavy', 'idle'] },
  ),
  sp_ground_slam: pose(
    'Frappe du sol',
    'slam',
    "frappe du sol : buste complètement plié vers l'avant, les deux poings écrasés ensemble contre le sol devant ses pieds, genoux fléchis",
    { h: 0.75, ax: 0.38, fb: ['crouch_punch', 'crouch', 'idle'] },
  ),
  sp_shoulder_charge: pose(
    "Charge à l'épaule",
    'shoulder',
    "charge à l'épaule : corps penché vers l'avant, épaule avant en bélier, bras repliés contre le torse, tête rentrée, en pleine course",
    { h: 0.9 },
  ),
  sp_blade_throw: pose(
    'Lancer de lame',
    'throwS',
    "lancer d'un projectile : buste engagé, bras avant tendu vers l'avant main ouverte comme s'il venait de lancer une lame, l'autre bras tiré en arrière (ne dessine PAS le projectile)",
    { h: 0.95, ax: 0.38 },
  ),
  sp_dive_kick: pose(
    'Pied plongeant',
    'diveK',
    "coup de pied plongeant : en l'air (aucun sol visible), corps en diagonale, une jambe tendue pointée vers le bas et l'avant, l'autre repliée, bras en arrière",
    { fb: ['jump_kick', 'kick_heavy', 'idle'] },
  ),
  sp_grab: pose(
    'Saisie',
    'grab',
    "saisie à bras-le-corps : buste penché vers l'avant, les deux bras tendus devant lui, mains ouvertes prêtes à attraper l'adversaire, jambes fléchies et bien ancrées",
    { h: 0.95 },
  ),
  sp_body_splash: pose(
    'Plongeon du corps',
    'splash',
    "plongeon du corps en l'air (aucun sol visible) : tout le corps presque à l'horizontale, ventre vers le bas, bras et jambes écartés, comme un catcheur qui s'écrase sur son adversaire",
    { h: undefined, w: 0.95, ax: 0.5, fb: ['fall', 'jump', 'idle'] },
  ),
  sp_counter_stance: pose(
    'Garde de contre',
    'counterStance',
    "garde de contre : debout, bien campé, main avant ouverte tendue devant lui paume vers l'adversaire, autre main près de la hanche, regard calme et concentré",
    { ax: 0.4, fb: ['block', 'idle'] },
  ),
  sp_palm_strike: pose(
    'Frappe de paume',
    'palm',
    "frappe de paume : jambes en fente, buste engagé, un seul bras tendu droit devant, paume ouverte tournée vers l'avant, l'autre bras tiré en arrière",
    { h: 0.95, ax: 0.38 },
  ),
  sp_rising_spin: pose(
    'Vrille aérienne',
    'risingSpin',
    "vrille aérienne (aucun sol visible) : en train de s'élever en tournoyant, une jambe tendue vers le haut et l'avant, l'autre repliée, un bras levé, corps légèrement penché en arrière",
    { h: 1.1, fb: ['jump_kick', 'kick_heavy', 'idle'] },
  ),
  sp_slide: pose(
    'Glissade',
    'slide',
    'glissade au sol : presque allongé sur le dos, glissant les pieds en avant, jambe avant tendue au ras du sol, une main traînant au sol derrière lui',
    { h: 0.5, ax: 0.3, fb: ['crouch_kick', 'crouch', 'idle'] },
  ),
  sp_hook_lunge: pose(
    'Crochet plongeant',
    'hookLunge',
    "crochet plongeant : grand pas en avant, corps très penché, bras avant qui frappe en arc de haut en bas, l'autre poing en garde",
    { h: 0.85 },
  ),
  sp_axe_kick: pose(
    'Coup de pied de hache',
    'axeKick',
    "coup de pied de hache : debout sur une jambe, l'autre jambe tendue à la verticale au-dessus de la tête, prête à retomber comme une hache, bras écartés",
    { h: 1.2, ax: 0.45, fb: ['kick_heavy', 'idle'] },
  ),
  sp_sky_call: pose(
    'Appel de la foudre',
    'skyCall',
    "appel de la foudre : debout, un bras tendu à la verticale vers le ciel, doigts pointés vers le haut, l'autre bras le long du corps, tête levée (ne dessine PAS d'éclair)",
    { h: 1.12, ax: 0.5, fb: ['win', 'idle'] },
  ),
  sp_sway: pose(
    'Esquive titubante',
    'sway',
    "esquive titubante façon boxe de l'homme ivre : corps penché très en arrière, presque déséquilibré, un bras levé au-dessus de la tête, un genou fléchi, expression hilare",
    { ax: 0.55, fb: ['hit', 'idle'] },
  ),
  sp_lob_throw: pose(
    'Lancer en cloche',
    'lobThrow',
    "lancer en cloche : buste engagé, bras avant levé vers le haut et l'avant comme s'il venait de lancer un objet par en dessous, l'autre bras en arrière (ne dessine PAS l'objet)",
    { h: 0.95 },
  ),

  // ---------- projectiles ----------
  pj_fireball: projectile(
    'Boule de feu',
    "une boule de feu / d'énergie incandescente avec une courte traînée de flammes vers la gauche",
  ),
  pj_blade: projectile(
    'Lame',
    "une lame d'énergie tranchante en forme de croissant, avec une courte traînée vers la gauche",
  ),
  pj_shockwave: projectile(
    'Onde de choc',
    'une onde de choc qui court au ras du sol : éclats de roche et poussière soulevés en forme de vague',
  ),
  pj_ice_shard: projectile(
    'Éclat de glace',
    'un gros éclat de glace pointu et bleuté, avec une traînée de givre vers la gauche',
  ),
  pj_ice_spike: projectile(
    'Pic de glace',
    'un grand pic de glace qui jaillit verticalement du sol, pointe vers le haut, éclats de givre à sa base',
  ),
  pj_lightning: projectile(
    'Éclair',
    "un éclair vertical qui tombe du ciel jusqu'au sol, zigzag lumineux bleu et blanc, très haut et étroit",
  ),
  pj_bottle: projectile(
    'Gourde',
    "une gourde / bouteille de saké en terre cuite qui tournoie dans l'air, avec quelques gouttes qui s'en échappent",
  ),
  pj_palm_wave: projectile(
    'Onde de paume',
    "une onde d'énergie en forme d'empreinte de main ouverte, translucide, avec des cercles de souffle autour",
  ),
} satisfies Record<string, SpecialSpec>;

export type SpecialSpriteKey = keyof typeof SPECIAL_POSES;
