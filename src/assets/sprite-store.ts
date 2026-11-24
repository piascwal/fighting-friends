/* Les sprites des personnages, en mémoire : les images de la banque de sprites (copiées dans
   public/assets/characters par npm run sprites), chargées à la demande par repo-characters.ts.
   On les crée, les importe et les règle dans l'atelier de la banque, plus dans le jeu. */
import { SPRITE_BY_KEY, type SpriteKey } from '../data/sprite-poses';
import type { Character } from '../data/types';

/** Réglage d'un sprite (character.json) : échelle et décalage en pixels monde. */
export interface SpriteAdjust {
  s: number;
  dx: number;
  dy: number;
}

export interface SpriteEntry {
  img: HTMLCanvasElement;
  w: number;
  h: number;
  adj: SpriteAdjust;
  /** Silhouette blanche (flash d'impact), créée à la demande. */
  white?: HTMLCanvasElement;
}

const sprites = new Map<string, Map<SpriteKey, SpriteEntry>>();
const portraits = new Map<string, HTMLCanvasElement>();
const PORTRAIT_SIZE = 160;

export const spriteEntry = (charId: string, key: SpriteKey): SpriteEntry | undefined =>
  sprites.get(charId)?.get(key);
export const hasSprite = (charId: string, key: SpriteKey = 'idle'): boolean => !!spriteEntry(charId, key);

/** Un personnage s'affiche avec ses images dès que sa pose de repos existe ; sinon, avec le pantin. */
export const usesSprites = (char: Character): boolean => hasSprite(char.id, 'idle');

export function putSprite(
  charId: string,
  key: SpriteKey,
  img: HTMLCanvasElement,
  adj: Partial<SpriteAdjust> = {},
): void {
  let set = sprites.get(charId);
  if (!set) sprites.set(charId, (set = new Map()));
  set.set(key, { img, w: img.width, h: img.height, adj: { s: 1, dx: 0, dy: 0, ...adj } });
  portraits.delete(charId);
}

/** Le sprite à afficher pour une pose : l'image demandée, sinon le premier repli disponible. */
export function resolveSprite(charId: string, key: SpriteKey): { entry: SpriteEntry; key: SpriteKey } | null {
  for (const candidate of [key, ...SPRITE_BY_KEY[key].fb, 'idle' as const]) {
    const entry = spriteEntry(charId, candidate);
    if (entry) return { entry, key: candidate };
  }
  return null;
}

/** Portrait carré : l'image « portrait » si elle existe, sinon un recadrage du haut de la pose de repos. */
export function portraitCanvas(charId: string): HTMLCanvasElement | null {
  const cached = portraits.get(charId);
  if (cached) return cached;
  const portrait = spriteEntry(charId, 'portrait');
  const idle = spriteEntry(charId, 'idle');
  if (!portrait && !idle) return null;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = PORTRAIT_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  if (portrait) {
    const s = Math.max(PORTRAIT_SIZE / portrait.w, PORTRAIT_SIZE / portrait.h);
    ctx.drawImage(portrait.img, (PORTRAIT_SIZE - portrait.w * s) / 2, 0, portrait.w * s, portrait.h * s);
  } else if (idle) {
    const size = Math.min(idle.w, idle.h * 0.34);
    const left = Math.min(Math.max(idle.w * 0.56 - size / 2, 0), idle.w - size);
    ctx.drawImage(idle.img, left, 0, size, size, 0, 0, PORTRAIT_SIZE, PORTRAIT_SIZE);
  }
  portraits.set(charId, canvas);
  return canvas;
}
