/* Prompts de génération d'images : un texte prêt à coller par image, à accompagner de l'image de référence.
   La direction artistique (ART_DIRECTION) est commune à tous les prompts : la changer ici suffit. */
import { GROUND_Y, VIEW_H } from '../core/constants';
import { NEUTRAL_POSES, POSE_SPRITE, type PoseName } from './poses';
import {
  SPRITE_BY_KEY,
  SPRITE_POSES,
  isSpecialKey,
  type SpriteKey,
  type SpritePoseSpec,
} from './sprite-poses';
import type { Character, MoveDef, StyleDef } from './types';

export const ART_DIRECTION =
  "pixel art 32 bits détaillé, façon jeux de combat d'arcade des années 90 : pixels nets et bien visibles, contours sombres, ombrages en aplats et en tramages, sans flou ni dégradé lisse";
const STYLE = `Style : sprite de jeu de combat 2D en ${ART_DIRECTION}. Strictement le même style graphique, les mêmes proportions et le même niveau de détail que l'image de référence.`;
const BACKGROUND =
  "Fond : aplat uni magenta pur #FF00FF sur toute l'image, sans dégradé, sans ombre portée, sans sol, sans décor, sans texte, sans cadre. Aucune teinte magenta ou rose vif sur le sujet lui-même.";
const FORMAT = 'Format carré 1024×1024.';

/** Hauteur d'un personnage debout dans l'image générée (en % de l'image). */
const STANDING_FRAME = 80;
/** En dessous de cette hauteur relative, la posture est « basse » et le prompt insiste là-dessus. */
const LOW_POSE = 0.8;

const GUIDE_IMAGE =
  'Si une image de mannequin gris est aussi jointe, elle montre la posture exacte à reproduire (position des bras et des jambes, hauteur du corps) : copie sa posture, mais PAS son apparence.';

/* Décor : les proportions viennent directement du jeu, pour qu'un décor généré s'y emboîte sans retouche. */
/** Hauteur, en % de l'image, à laquelle les combattants posent les pieds. */
export const STAGE_FLOOR = Math.round((GROUND_Y / VIEW_H) * 100);
/** Hauteur, en % de l'image, où commence le sol (il dépasse un peu derrière les pieds, pour la perspective). */
export const STAGE_FLOOR_TOP = Math.round(((GROUND_Y - 34) / VIEW_H) * 100);
/** Taille d'un combattant debout, en % de la hauteur de l'image. */
export const STAGE_FIGHTER = Math.round((200 / VIEW_H) * 100);
export const STAGE_PLACEHOLDER = '[décris ici ta scène : lieu, moment de la journée, ambiance, couleurs…]';

/** Description de la posture demandée. */
export function poseDescription(key: SpriteKey): string {
  return SPRITE_BY_KEY[key].desc ?? '';
}

/** Posture du pantin qui sert de guide visuel pour cette image. */
export function guidePose(key: SpriteKey): PoseName {
  return SPRITE_BY_KEY[key].rig ?? 'idle';
}

/**
 * Cadrage demandé à l'IA. Une posture basse occupe moins de hauteur qu'une posture debout :
 * sans cette précision, l'IA agrandit le personnage pour remplir l'image et le redresse.
 */
function framing(spec: SpritePoseSpec): string {
  if (spec.w) {
    return `Le personnage est à l'horizontale, centré, entièrement visible, et occupe environ ${STANDING_FRAME} % de la largeur de l'image.`;
  }
  const h = spec.h ?? 1;
  const percent = Math.round(STANDING_FRAME * Math.min(h, 1.15));
  const centered = `Le personnage est centré, entièrement visible sans être coupé, et occupe environ ${percent} % de la hauteur de l'image.`;
  if (h >= LOW_POSE) return centered;
  return (
    `POSTURE BASSE : le personnage est beaucoup plus petit que debout, le sommet de sa tête arrive à environ ${Math.round(h * 100)} % de sa hauteur debout. ` +
    `Ce n'est PAS une simple flexion des genoux : il est vraiment ramassé près du sol. ${centered}`
  );
}

/** Prompt du décor d'un personnage ; `description` est le texte libre du joueur, ajouté à la fin. */
export function buildStagePrompt(char: Character, description: string): string {
  return (
    `Génère UNE SEULE image de décor pour un jeu de combat 2D en vue de côté : la scène où combat « ${char.name} ». ` +
    `Style : ${ART_DIRECTION}. ` +
    `Format panoramique 21:9 (par exemple 2016×864) ; si ce format n'est pas proposé, 16:9. ` +
    `Cadrage : vue strictement latérale, caméra à hauteur d'homme. Le sol, plat et horizontal, occupe le bas de l'image à partir de ${STAGE_FLOOR_TOP} % de sa hauteur, vu légèrement en perspective ; ` +
    `les combattants y posent les pieds à ${STAGE_FLOOR} % de la hauteur. Un combattant debout mesurerait environ ${STAGE_FIGHTER} % de la hauteur de l'image : ` +
    `l'échelle des objets du décor doit correspondre. Le centre de l'image reste dégagé (rien au premier plan qui masquerait les combattants) ; le décor peut être plus chargé sur les côtés et au loin. ` +
    `AUCUN personnage, aucune silhouette, aucun texte, aucun logo, aucune interface, aucun cadre. ` +
    `Si une image guide grise est jointe : la bande foncée du bas indique le sol et les deux silhouettes la taille des combattants ; ne les dessine pas. ` +
    `Décor à créer : ${description.trim() || STAGE_PLACEHOLDER}`
  );
}

export function buildPrompt(char: Character, key: SpriteKey): string {
  const spec = SPRITE_BY_KEY[key];
  const desc = poseDescription(key);
  if (spec.stage) return buildStagePrompt(char, '');
  if (spec.proj) {
    return `Génère UNE SEULE image d'un effet de jeu de combat, dans l'esprit et la palette de couleurs du personnage « ${char.name} » de l'image de référence jointe, SANS aucun personnage : ${desc}. L'effet se déplace vers la DROITE, il est centré et occupe environ 70 % de l'image. ${STYLE} ${BACKGROUND} ${FORMAT}`;
  }
  if (spec.portrait) {
    return `À partir de l'image de référence jointe du personnage « ${char.name} » (garde exactement le même visage, la même coiffure, les mêmes vêtements, les mêmes couleurs), génère UNE SEULE image : ${desc}. ${STYLE} ${BACKGROUND} ${FORMAT}`;
  }
  return (
    `À partir de l'image de référence jointe du personnage « ${char.name} » (garde exactement le même visage, la même coiffure, la même corpulence, les mêmes vêtements, les mêmes accessoires et les mêmes couleurs), génère UNE SEULE image de ce personnage EN ENTIER, de la tête aux pieds, vu de côté (profil 3/4) et tourné vers la DROITE, dans la posture suivante : ${desc}. ` +
    `Un seul personnage, une seule pose, aucun effet spécial (ni flammes, ni éclairs, ni traînées de mouvement, ni onomatopées). ${framing(spec)} ${GUIDE_IMAGE} ${STYLE} ${BACKGROUND} ${FORMAT}`
  );
}

/** Image affichée pour une posture d'un coup (même règle que le moteur, voir fighter-attack.ts). */
function animSprite(move: MoveDef, pose: PoseName): SpriteKey {
  return move.sprite && !NEUTRAL_POSES.has(pose) ? move.sprite : POSE_SPRITE[pose];
}

/** Images de coups spéciaux et de projectiles utilisées par un coup, dans l'ordre de son animation. */
export function moveSprites(move: MoveDef): SpriteKey[] {
  const keys = new Set<SpriteKey>();
  for (const m of [move, move.counter?.riposte]) {
    if (!m) continue;
    for (const [, pose] of m.anim) {
      const key = animSprite(m, pose);
      if (isSpecialKey(key)) keys.add(key);
    }
    if (m.proj?.sprite) keys.add(m.proj.sprite);
  }
  return [...keys];
}

/** Images propres à un style : celles de ses coups spéciaux et de ses projectiles, dans l'ordre des coups. */
export function styleSprites(style: StyleDef): SpriteKey[] {
  const ids = ['s1l', 's1h', 's2l', 's2h', 'super'] as const;
  return [...new Set(ids.flatMap((id) => moveSprites(style.moves[id])))];
}

/** Les images demandées pour ce personnage : poses communes (décor compris), puis celles de son style. */
export function spritePosesFor(char: Character): SpritePoseSpec[] {
  return [...SPRITE_POSES, ...styleSprites(char.style).map((key) => SPRITE_BY_KEY[key])];
}
