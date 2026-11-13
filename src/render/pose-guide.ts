/* Image guide d'une pose : un mannequin gris neutre dans la posture exacte attendue.
   Elle se donne à l'IA d'images avec le prompt, pour qu'elle reproduise la posture (et pas l'apparence). */
import { POSES } from '../data/poses';
import { guidePose } from '../data/prompts';
import { SPRITE_BY_KEY, type SpriteKey } from '../data/sprite-poses';
import type { Character, Look } from '../data/types';
import { drawRig, drawRigPortrait } from './rig';
import { solveSkeleton, type Point } from './rig-skeleton';

/** Mannequin sans vêtements ni coiffure : l'IA ne doit en retenir que la posture. */
const MANNEQUIN: Look = {
  h: 1,
  bulk: 1,
  skin: '#c7ccd4',
  hair: 'bald',
  hairCol: '#c7ccd4',
  top: '#c7ccd4',
  sleeve: 'none',
  outfit: 'none',
  pants: '#c7ccd4',
  belt: '#8d94a0',
  glove: '#aeb4be',
  shoe: '#aeb4be',
  accent: '#c7ccd4',
};

const GUIDE_SIZE = 1024;
const BACKGROUND = '#ffffff';
/** Comme dans le prompt : un personnage debout occupe 80 % de la hauteur de l'image. */
const STANDING_FRAME = 0.8;
/** Le point le plus bas du corps est posé à cette hauteur de l'image. */
const FLOOR = 0.9;
/** Hauteur du pantin debout, à l'échelle 1 (en pixels monde). */
const STANDING_HEIGHT = solveSkeletonHeight();

function solveSkeletonHeight(): number {
  const sk = solveSkeleton(POSES.idle, MANNEQUIN, 1, 1);
  return -(sk.head.y - sk.headRadius);
}

/** Étendue horizontale de la posture à l'échelle 1, pour la centrer et la faire tenir dans l'image. */
function horizontalExtent(pose: (typeof POSES)[keyof typeof POSES]): { min: number; max: number } {
  const sk = solveSkeleton(pose, MANNEQUIN, 1, 1);
  const points = Object.values(sk).filter((v): v is Point => typeof v === 'object');
  const margin = 14; // épaisseur des membres
  const xs = points.map((p) => p.x * (pose.flip ? -1 : 1));
  return { min: Math.min(...xs) - margin, max: Math.max(...xs) + margin };
}

/** Dessine l'image guide d'une pose (null pour le projectile, qui n'a pas de posture). */
export function renderPoseGuide(char: Character, key: SpriteKey): HTMLCanvasElement | null {
  const spec = SPRITE_BY_KEY[key];
  if (spec.proj) return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = GUIDE_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, GUIDE_SIZE, GUIDE_SIZE);

  if (spec.portrait) {
    drawRigPortrait(ctx, MANNEQUIN, GUIDE_SIZE);
    return canvas;
  }
  const pose = POSES[guidePose(char, key)];
  const { min, max } = horizontalExtent(pose);
  // même échelle pour toutes les poses (une pose basse paraît donc plus petite),
  // sauf si la posture est trop large pour tenir dans l'image
  const scale = Math.min((GUIDE_SIZE * STANDING_FRAME) / STANDING_HEIGHT, (GUIDE_SIZE * 0.9) / (max - min));
  const x = GUIDE_SIZE / 2 - ((min + max) / 2) * scale;
  drawRig(ctx, MANNEQUIN, pose, x, GUIDE_SIZE * FLOOR, 1, { scale });
  return canvas;
}
