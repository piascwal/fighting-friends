/* Dessine un personnage dans une posture fixe, avec ses images s'il en a, sinon avec le pantin.
   Utilisé par tous les écrans hors combat (sélection, versus, victoire, fin). */
import { portraitCanvas, usesSprites } from '../assets/sprite-store';
import { shade } from '../core/color';
import { POSES, POSE_SPRITE, clonePose, mixPose, type PoseName } from '../data/poses';
import type { Character } from '../data/types';
import { drawRig, drawRigPortrait } from './rig';
import { drawSprite } from './sprite-draw';

export interface CharacterDrawOptions {
  flash?: boolean;
  alpha?: number;
  /** Ombre portée : silhouette unie de cette couleur. */
  silhouette?: string;
}

const scratch = clonePose('idle');

/** Échelle des zones de collision : la taille du pantin, ou 1 pour un personnage en images. */
export const bodyScaleOf = (char: Character): number => (usesSprites(char) ? 1 : char.look.h);

export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  char: Character,
  poseName: PoseName,
  x: number,
  y: number,
  facing: number,
  scale: number,
  time: number,
  opt: CharacterDrawOptions = {},
): void {
  const breathing = Math.sin(time * 0.09);
  if (usesSprites(char)) {
    drawSprite(ctx, char, POSE_SPRITE[poseName], x, y, facing, {
      scale,
      sy: 1 + breathing * 0.012,
      flash: opt.flash,
      alpha: opt.alpha,
    });
    return;
  }
  const pose =
    poseName === 'idle' ? mixPose(POSES.idle, POSES.idle2, (breathing + 1) / 2, scratch) : POSES[poseName];
  drawRig(ctx, char.look, pose, x, y, facing, { scale, time, ...opt });
}

/** Portrait carré sur fond à la couleur du personnage. */
export function drawPortrait(ctx: CanvasRenderingContext2D, char: Character, size: number): void {
  ctx.fillStyle = shade(char.color, -0.55);
  ctx.fillRect(0, 0, size, size);
  const image = portraitCanvas(char.id);
  if (image) ctx.drawImage(image, 0, 0, size, size);
  else drawRigPortrait(ctx, char.look, size);
}
