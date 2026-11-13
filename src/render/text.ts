/* Gros texte d'arcade : italique, contour épais, dégradé. */
import { ARCADE_FONT } from '../core/constants';

export type Gradient = readonly [top: string, middle: string, bottom: string];

export const GOLD: Gradient = ['#fff7c2', '#ffd23a', '#ff5a1f'];
export const RED: Gradient = ['#ffffff', '#ff5a1f', '#c8001e'];
export const BLUE: Gradient = ['#ffffff', '#8ff7ff', '#2aa8ff'];
export const WHITE: Gradient = ['#ffffff', '#ffffff', '#dddddd'];
export const GREY: Gradient = ['#ffffff', '#eeeeee', '#cccccc'];

export interface ArcadeTextOptions {
  align?: CanvasTextAlign;
  scale?: number;
  alpha?: number;
  colors?: Gradient;
  stroke?: string;
  /** Couleur du halo lumineux (coûteux : à réserver aux écrans hors combat). */
  glow?: string;
}

export function arcadeText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  opt: ArcadeTextOptions = {},
): void {
  ctx.save();
  ctx.translate(x, y);
  if (opt.scale) ctx.scale(opt.scale, opt.scale);
  ctx.transform(1, 0, -0.18, 1, 0, 0); // inclinaison
  ctx.font = `900 ${size}px ${ARCADE_FONT}`;
  ctx.textAlign = opt.align ?? 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  if (opt.alpha !== undefined) ctx.globalAlpha = opt.alpha;

  ctx.lineWidth = size * 0.22;
  ctx.strokeStyle = opt.stroke ?? '#140a1e';
  ctx.strokeText(text, 0, 0);

  if (opt.glow) {
    ctx.shadowColor = opt.glow;
    ctx.shadowBlur = size * 0.4;
  }
  const [top, middle, bottom] = opt.colors ?? GOLD;
  const fill = ctx.createLinearGradient(0, -size * 0.5, 0, size * 0.5);
  fill.addColorStop(0, top);
  fill.addColorStop(0.5, middle);
  fill.addColorStop(1, bottom);
  ctx.fillStyle = fill;
  ctx.fillText(text, 0, 0);

  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(1, size * 0.03);
  ctx.strokeStyle = 'rgba(255,255,255,.75)';
  ctx.strokeText(text, 0, 0);
  ctx.restore();
}

/** Largeur d'un texte d'arcade à cette taille. */
export function arcadeTextWidth(ctx: CanvasRenderingContext2D, text: string, size: number): number {
  ctx.save();
  ctx.font = `900 ${size}px ${ARCADE_FONT}`;
  const width = ctx.measureText(text).width;
  ctx.restore();
  return width;
}
