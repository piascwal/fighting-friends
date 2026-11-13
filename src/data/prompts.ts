/* Prompts de génération d'images : un texte prêt à coller par pose, à accompagner de l'image de référence. */
import { SPRITE_BY_KEY, type SpriteKey } from './sprite-poses';
import type { PoseName } from './poses';
import type { Character } from './types';

const STYLE =
  "Style : sprite de jeu de combat d'arcade 2D, strictement le même style graphique, les mêmes proportions et le même niveau de détail que l'image de référence, contours nets.";
const BACKGROUND =
  "Fond : aplat uni magenta pur #FF00FF sur toute l'image, sans dégradé, sans ombre portée, sans sol, sans décor, sans texte, sans cadre. Aucune teinte magenta ou rose vif sur le sujet lui-même.";
const FORMAT = 'Format carré 1024×1024.';

/** Description de la posture : commune à tous, ou propre au style de combat (coups spéciaux). */
export function poseDescription(char: Character, key: SpriteKey): string {
  return SPRITE_BY_KEY[key].desc ?? char.style.spriteDesc[key] ?? '';
}

/** Posture du pantin qui sert de guide visuel pour cette image. */
export function guidePose(char: Character, key: SpriteKey): PoseName {
  return SPRITE_BY_KEY[key].rig ?? char.style.spriteRig[key] ?? 'idle';
}

export function buildPrompt(char: Character, key: SpriteKey): string {
  const spec = SPRITE_BY_KEY[key];
  const desc = poseDescription(char, key);
  if (spec.proj) {
    return `Génère UNE SEULE image d'un effet de jeu de combat, dans l'esprit et la palette de couleurs du personnage « ${char.name} » de l'image de référence jointe, SANS aucun personnage : ${desc}. L'effet se déplace vers la DROITE, il est centré et occupe environ 70 % de l'image. ${STYLE} ${BACKGROUND} ${FORMAT}`;
  }
  if (spec.portrait) {
    return `À partir de l'image de référence jointe du personnage « ${char.name} » (garde exactement le même visage, la même coiffure, les mêmes vêtements, les mêmes couleurs), génère UNE SEULE image : ${desc}. ${STYLE} ${BACKGROUND} ${FORMAT}`;
  }
  return (
    `À partir de l'image de référence jointe du personnage « ${char.name} » (garde exactement le même visage, la même coiffure, la même corpulence, les mêmes vêtements, les mêmes accessoires et les mêmes couleurs), génère UNE SEULE image de ce personnage EN ENTIER, de la tête aux pieds, vu de côté (profil 3/4) et tourné vers la DROITE, dans la posture suivante : ${desc}. ` +
    `Un seul personnage, une seule pose, aucun effet spécial (ni flammes, ni éclairs, ni traînées de mouvement, ni onomatopées). Le personnage est centré, entièrement visible sans être coupé, et occupe environ 80 % de la hauteur de l'image. ${STYLE} ${BACKGROUND} ${FORMAT}`
  );
}

/** Les poses demandées pour ce personnage (le projectile seulement si son style en lance un). */
export function spritePosesFor(char: Character) {
  return Object.values(SPRITE_BY_KEY).filter((s) => !s.proj || char.style.spriteDesc.projectile);
}
