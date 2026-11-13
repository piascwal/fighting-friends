/* Les sprites des personnages, en mémoire : images fournies avec le jeu ou importées par le joueur.
   Les images importées sont aussi enregistrées sur l'appareil (IndexedDB). */
import { kvStore } from '../core/storage';
import { SPRITE_BY_KEY, type SpriteKey } from '../data/sprite-poses';
import type { Character } from '../data/types';
import { loadImage, removeMagentaBackground } from './chroma-key';

/** Réglage manuel d'un sprite : échelle et décalage en pixels monde. */
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
  /** 'repo' = livré avec le jeu, 'local' = importé sur cet appareil. */
  src: 'repo' | 'local';
  /** Silhouette blanche (flash d'impact), créée à la demande. */
  white?: HTMLCanvasElement;
}

interface StoredSprite {
  png: string;
  adj: SpriteAdjust;
}

const sprites = new Map<string, Map<SpriteKey, SpriteEntry>>();
const portraits = new Map<string, HTMLCanvasElement>();
const PORTRAIT_SIZE = 160;

const storageKey = (charId: string, key: SpriteKey) => `spr:${charId}:${key}`;

export const spriteEntry = (charId: string, key: SpriteKey): SpriteEntry | undefined =>
  sprites.get(charId)?.get(key);
export const hasSprite = (charId: string, key: SpriteKey = 'idle'): boolean => !!spriteEntry(charId, key);
export const spriteCount = (charId: string): number => sprites.get(charId)?.size ?? 0;
export const spriteEntries = (charId: string): [SpriteKey, SpriteEntry][] => [...(sprites.get(charId) ?? [])];

/** Un personnage s'affiche avec ses images dès que sa pose de repos existe ; sinon, avec le pantin. */
export const usesSprites = (char: Character): boolean => hasSprite(char.id, 'idle');

export function putSprite(
  charId: string,
  key: SpriteKey,
  img: HTMLCanvasElement,
  src: SpriteEntry['src'],
  adj?: Partial<SpriteAdjust>,
): void {
  let set = sprites.get(charId);
  if (!set) sprites.set(charId, (set = new Map()));
  set.set(key, { img, w: img.width, h: img.height, adj: { s: 1, dx: 0, dy: 0, ...adj }, src });
  portraits.delete(charId);
}

function persist(charId: string, key: SpriteKey): Promise<unknown> {
  const entry = spriteEntry(charId, key);
  if (!entry) return Promise.resolve();
  const stored: StoredSprite = { png: entry.img.toDataURL('image/png'), adj: entry.adj };
  return kvStore.set(storageKey(charId, key), stored);
}

/** Importe une image choisie par le joueur : détourage, mise en mémoire, enregistrement. */
export async function importSpriteFile(charId: string, key: SpriteKey, file: File): Promise<void> {
  const url = URL.createObjectURL(file);
  try {
    putSprite(charId, key, removeMagentaBackground(await loadImage(url)), 'local');
    await persist(charId, key);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const saveSpriteAdjust = (charId: string, key: SpriteKey): Promise<unknown> => persist(charId, key);

export async function removeSprite(charId: string, key: SpriteKey): Promise<void> {
  sprites.get(charId)?.delete(key);
  portraits.delete(charId);
  await kvStore.delete(storageKey(charId, key));
}

export async function removeCharacterSprites(charId: string): Promise<void> {
  const all = await kvStore.entries<StoredSprite>();
  await Promise.all(all.filter((e) => e.key.startsWith(`spr:${charId}:`)).map((e) => kvStore.delete(e.key)));
  sprites.delete(charId);
  portraits.delete(charId);
}

/** Recharge les sprites importés lors des sessions précédentes. */
export async function loadLocalSprites(): Promise<void> {
  const all = await kvStore.entries<StoredSprite>();
  await Promise.all(
    all.map(async ({ key, value }) => {
      const match = /^spr:(.+):([a-z0-9_]+)$/.exec(key);
      if (!match || !(match[2]! in SPRITE_BY_KEY)) return;
      try {
        const img = await loadImage(value.png);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        putSprite(match[1]!, match[2] as SpriteKey, canvas, 'local', value.adj);
      } catch {
        // image corrompue : on l'ignore, le personnage utilisera une pose de repli
      }
    }),
  );
}

/** Le sprite à afficher pour une pose : l'image demandée, sinon le premier repli disponible. */
export function resolveSprite(charId: string, key: SpriteKey): { entry: SpriteEntry; key: SpriteKey } | null {
  const set = sprites.get(charId);
  if (!set) return null;
  for (const candidate of [key, ...SPRITE_BY_KEY[key].fb, 'idle' as const]) {
    const entry = set.get(candidate);
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
