/* Annonces du combat (MANCHE 1, COMBATTEZ !, K.O., PERFECT !…) : un bandeau noir penché traverse
   l'écran, souligné de la couleur de l'annonce, des traits de vitesse y filent et le texte s'y écrase. */
import { VIEW_W } from '../core/constants';
import { clamp, easeOut } from '../core/math';
import { slamText, slantPath, speedLines } from './motion';
import type { Gradient } from './text';

type Ctx = CanvasRenderingContext2D;

export interface Banner {
  text: string;
  age: number;
  duration: number;
  size: number;
  y: number;
  colors: Gradient;
}

export function drawAnnouncement(ctx: Ctx, b: Banner): void {
  // le bandeau s'ouvre en claquant et se referme sur les dernières images
  const open = Math.min(easeOut(b.age / 5), clamp((b.duration - b.age) / 5, 0, 1));
  const h = Math.round(b.size * 1.2 * open);
  if (h < 4) return;
  const top = b.y - h / 2;
  const accent = b.colors[2];
  // un bandeau sur deux arrive de la droite : deux annonces superposées se croisent
  const dir = Math.round(b.y / 10) % 2 ? 1 : -1;
  const reach = easeOut(b.age / 7) * (VIEW_W + 300);
  const x = dir > 0 ? -150 : VIEW_W + 150 - reach;

  ctx.save();
  slantPath(ctx, x, top, reach, h, 24);
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.clip();
  speedLines(ctx, b.age, dir, accent, { x: 0, y: top, w: VIEW_W, h }, 10);
  ctx.restore();
  for (const offset of [-7, h + 2]) {
    slantPath(ctx, x, top + offset, reach, 5, 1);
    ctx.fillStyle = accent;
    ctx.fill();
  }
  if (b.duration - b.age > 4) slamText(ctx, b.text, VIEW_W / 2, b.y, b.size, b.age - 3, { colors: b.colors });
}
