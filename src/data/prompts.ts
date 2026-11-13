/* Prompts de génération d'images : un texte prêt à coller par pose, à accompagner de l'image de référence. */
import { SPRITE_BY_KEY, type SpriteKey, type SpritePoseSpec } from './sprite-poses';
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

/** Hauteur d'un personnage debout dans l'image générée (en % de l'image). */
const STANDING_FRAME = 80;
/** En dessous de cette hauteur relative, la posture est « basse » et le prompt insiste là-dessus. */
const LOW_POSE = 0.8;

const GUIDE_IMAGE =
  'Si une image de mannequin gris est aussi jointe, elle montre la posture exacte à reproduire (position des bras et des jambes, hauteur du corps) : copie sa posture, mais PAS son apparence.';

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
    `Un seul personnage, une seule pose, aucun effet spécial (ni flammes, ni éclairs, ni traînées de mouvement, ni onomatopées). ${framing(spec)} ${GUIDE_IMAGE} ${STYLE} ${BACKGROUND} ${FORMAT}`
  );
}

/** Les poses demandées pour ce personnage (le projectile seulement si son style en lance un). */
export function spritePosesFor(char: Character) {
  return Object.values(SPRITE_BY_KEY).filter((s) => !s.proj || char.style.spriteDesc.projectile);
}
