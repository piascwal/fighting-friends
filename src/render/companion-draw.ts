/* Animal de compagnie hors combat (sélection, victoire) : ses images s'il en a, sinon sa silhouette. */
import { spriteEntry } from '../assets/sprite-store';
import type { SpriteKey } from '../data/sprite-poses';
import type { Character } from '../data/types';
import { drawProjectileShape } from './projectile-shapes';

/** Longueur de l'animal à l'échelle 1 : la même qu'en combat (voir le style Dresseur). */
const PET_LENGTH = 113;
const PET_HEIGHT = 64;
/** Durée d'une image de course, en frames. */
const RUN_FRAME = 5;

/** Image de course de l'animal à cet instant. */
export function companionRunKey(char: Character, time: number): SpriteKey | undefined {
  const run = char.style.companion?.run;
  return run?.length ? run[Math.floor(time / RUN_FRAME) % run.length] : undefined;
}

/**
 * Dessine l'animal du personnage, pattes posées en (x, ground).
 * @param key image voulue (repos, course…) ; à défaut, une autre de ses images, sinon sa silhouette
 */
export function drawCompanion(
  ctx: CanvasRenderingContext2D,
  char: Character,
  key: SpriteKey | undefined,
  x: number,
  ground: number,
  facing: number,
  scale: number,
  time: number,
): void {
  const companion = char.style.companion;
  if (!companion) return;
  const keys = [key, companion.idle, ...companion.run];
  const entry = keys.map((k) => k && spriteEntry(char.id, k)).find(Boolean) || undefined;
  ctx.save();
  ctx.translate(x, ground);
  ctx.scale(facing, 1);
  if (entry) {
    const k = ((PET_LENGTH * scale * char.size) / entry.w) * entry.adj.s;
    ctx.imageSmoothingEnabled = k < 1;
    ctx.drawImage(entry.img, (-entry.w * k) / 2, -entry.h * k, entry.w * k, entry.h * k);
  } else {
    const s = scale * char.size;
    ctx.translate(0, (-PET_HEIGHT * s) / 2);
    drawProjectileShape(ctx, 'companion', (PET_LENGTH / 1.35) * s, PET_HEIGHT * s, time);
  }
  ctx.restore();
}

/** Le personnage a-t-il l'image de victoire avec l'animal dans les bras ? */
export const holdsCompanion = (char: Character): boolean =>
  !!char.style.companion && !!spriteEntry(char.id, char.style.companion.win);
