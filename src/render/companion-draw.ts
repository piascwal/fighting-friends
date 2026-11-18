/* Animal de compagnie hors combat (sélection, victoire) : ses images s'il en a, sinon sa silhouette. */
import { spriteEntry, type SpriteEntry } from '../assets/sprite-store';
import type { SpriteKey } from '../data/sprite-poses';
import type { Character } from '../data/types';
import { drawProjectileShape } from './projectile-shapes';

/**
 * Taille de l'animal à l'échelle 1 (côté du carré de même surface que lui), la même partout : en
 * combat, à la sélection et à la victoire. Environ la taille d'un chien moyen à côté d'un personnage
 * de 200 px. Mesurer la surface plutôt que la largeur garde la même taille d'une image à l'autre,
 * même quand l'animal est étiré (course) ou ramassé (repos).
 */
export const PET_SIZE = 88;
const PET_LENGTH = 113;
const PET_HEIGHT = 64;

/** Agrandissement d'une image d'animal pour qu'il fasse `size` (voir PET_SIZE), réglage compris. */
export const petScale = (entry: SpriteEntry, size: number): number =>
  (size / Math.sqrt(entry.w * entry.h)) * entry.adj.s;
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
    const k = petScale(entry, PET_SIZE * scale * char.size);
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
