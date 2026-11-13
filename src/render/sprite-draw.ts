/* Affichage d'un personnage à partir de ses images (une image par pose). */
import { resolveSprite, type SpriteEntry } from '../assets/sprite-store';
import { SPRITE_BY_KEY, type SpriteKey } from '../data/sprite-poses';
import type { Character } from '../data/types';

export interface SpriteOptions {
  /** Zoom (1 = taille de combat). */
  scale?: number;
  /** Silhouette blanche : flash d'impact. */
  flash?: boolean;
  alpha?: number;
  /** Étirement horizontal / vertical : donne de la vie à une image fixe. */
  sx?: number;
  sy?: number;
  /** Inclinaison en degrés. */
  rot?: number;
}

/** Hauteur à l'écran d'un personnage debout, à l'échelle 1. */
const STANDING_HEIGHT = 200;

function whiteSilhouette(entry: SpriteEntry): HTMLCanvasElement {
  if (!entry.white) {
    const canvas = document.createElement('canvas');
    canvas.width = entry.w;
    canvas.height = entry.h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(entry.img, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, entry.w, entry.h);
    entry.white = canvas;
  }
  return entry.white;
}

/**
 * Dessine le sprite d'une pose, pieds posés en (x, y).
 * @returns false si le personnage n'a aucune image utilisable
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  char: Character,
  pose: SpriteKey,
  x: number,
  y: number,
  facing: number,
  opt: SpriteOptions = {},
): boolean {
  const found = resolveSprite(char.id, pose);
  if (!found) return false;
  const { entry } = found;
  const spec = SPRITE_BY_KEY[found.key];
  const wanted = SPRITE_BY_KEY[pose];
  const zoom = opt.scale ?? 1;
  const reference = STANDING_HEIGHT * zoom;
  // l'image est ramenée à la taille prévue pour sa pose, quelle que soit sa résolution d'origine
  const fit = spec.w ? (spec.w * reference) / entry.w : ((spec.h ?? 1) * reference) / entry.h;
  const k = fit * entry.adj.s;
  const w = entry.w * k;
  const h = entry.h * k;

  let sy = opt.sy ?? 1;
  let rot = opt.rot ?? 0;
  let lying = false;
  if (found.key !== pose) {
    // image de repli : on l'adapte au mieux à la pose demandée
    if (wanted.h && spec.h && wanted.h < spec.h * 0.9) sy *= wanted.h / spec.h; // écrasée si la pose est basse
    if (pose === 'down' && found.key !== 'fall') lying = true; // couchée pour le K.O.
    if (pose === 'fall') rot -= 55; // basculée pour une chute
  }

  ctx.save();
  if (opt.alpha !== undefined) ctx.globalAlpha = opt.alpha;
  ctx.translate(x, y);
  ctx.scale(facing, 1);
  ctx.translate(entry.adj.dx * zoom, entry.adj.dy * zoom);
  if (lying) {
    ctx.translate(h / 2, -w * 0.5);
    ctx.rotate(-Math.PI / 2);
  } else if (rot) {
    ctx.translate(0, -h / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.translate(0, h / 2);
  }
  ctx.scale(opt.sx ?? 1, sy);
  ctx.imageSmoothingQuality = 'high';
  const image = opt.flash ? whiteSilhouette(entry) : entry.img;
  ctx.drawImage(image, lying ? -w / 2 : -(spec.ax ?? 0.5) * w, -h, w, h);
  ctx.restore();
  return true;
}
