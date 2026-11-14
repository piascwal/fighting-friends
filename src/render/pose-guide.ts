/* Image guide d'une pose : un mannequin gris neutre dans la posture exacte attendue.
   Elle se donne à l'IA d'images avec le prompt, pour qu'elle reproduise la posture (et pas l'apparence). */
import { POSES } from '../data/poses';
import { guidePose } from '../data/prompts';
import { SPRITE_BY_KEY, type SpriteKey } from '../data/sprite-poses';
import type { Look } from '../data/types';
import { STAGE_FIGHTER, STAGE_FLOOR, STAGE_FLOOR_TOP } from '../data/prompts';
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
export function renderPoseGuide(key: SpriteKey): HTMLCanvasElement | null {
  const spec = SPRITE_BY_KEY[key];
  if (spec.proj) return null;
  if (spec.stage) return renderStageGuide();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = GUIDE_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, GUIDE_SIZE, GUIDE_SIZE);

  if (spec.portrait) {
    drawRigPortrait(ctx, MANNEQUIN, GUIDE_SIZE);
    return canvas;
  }
  const pose = POSES[guidePose(key)];
  const { min, max } = horizontalExtent(pose);
  // même échelle pour toutes les poses (une pose basse paraît donc plus petite),
  // sauf si la posture est trop large pour tenir dans l'image
  const scale = Math.min((GUIDE_SIZE * STANDING_FRAME) / STANDING_HEIGHT, (GUIDE_SIZE * 0.9) / (max - min));
  const x = GUIDE_SIZE / 2 - ((min + max) / 2) * scale;
  drawRig(ctx, MANNEQUIN, pose, x, GUIDE_SIZE * FLOOR, 1, { scale });
  return canvas;
}

/** Format du guide de décor : panoramique 21:9, comme demandé dans le prompt. */
const STAGE_GUIDE_W = 2016;
const STAGE_GUIDE_H = 864;

/**
 * Guide de calibrage d'un décor : bande du sol, et deux silhouettes à la taille et à la place des
 * combattants. Joint à l'IA, il lui montre l'échelle à respecter.
 */
function renderStageGuide(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = STAGE_GUIDE_W;
  canvas.height = STAGE_GUIDE_H;
  const ctx = canvas.getContext('2d')!;
  const floorTop = (STAGE_GUIDE_H * STAGE_FLOOR_TOP) / 100;
  const feet = (STAGE_GUIDE_H * STAGE_FLOOR) / 100;
  ctx.fillStyle = '#eef0f4';
  ctx.fillRect(0, 0, STAGE_GUIDE_W, floorTop);
  ctx.fillStyle = '#9aa1ad';
  ctx.fillRect(0, floorTop, STAGE_GUIDE_W, STAGE_GUIDE_H - floorTop);
  ctx.fillStyle = '#6b7280';
  ctx.fillRect(0, floorTop, STAGE_GUIDE_W, 6);
  const scale = (STAGE_GUIDE_H * STAGE_FIGHTER) / 100 / STANDING_HEIGHT;
  for (const [x, facing] of [
    [0.42, 1],
    [0.58, -1],
  ] as const) {
    drawRig(ctx, MANNEQUIN, POSES.idle, STAGE_GUIDE_W * x, feet, facing, { scale, silhouette: '#4b5260' });
  }
  return canvas;
}
