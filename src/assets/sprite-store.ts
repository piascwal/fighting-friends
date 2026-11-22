/* Les sprites des personnages, en mémoire, en deux couches :
   - « repo » : les images livrées avec le jeu (public/assets/characters) ;
   - « local » : celles importées sur cet appareil, enregistrées dans IndexedDB (compressées, voir image-codec.ts).
   Une image locale passe devant celle du jeu ; la supprimer fait réapparaître celle du jeu.
   Les réglages faits sur une image du jeu sont gérés dans local-changes.ts. */
import { kvStore } from '../core/storage';
import { SPRITE_BY_KEY, isSpriteKey, type SpriteKey } from '../data/sprite-poses';
import type { Character } from '../data/types';
import { loadImage, prepareStage, removeMagentaBackground } from './chroma-key';
import { encodeImage, toCanvas } from './image-codec';

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
  /** Fichier compressé d'origine : réutilisé tel quel (enregistrement, export), jamais recompressé. */
  blob?: Blob;
  /** Date d'import sur l'appareil (ms). Absente pour les images importées avant cette information. */
  at?: number;
  /** Image du jeu : nom de son fichier dans le dossier du personnage, et réglage livré avec elle. */
  file?: string;
  repoAdj?: SpriteAdjust;
  /** Image du jeu dont le réglage a été modifié sur l'appareil : date de la modification (ms). */
  adjAt?: number;
  /** Silhouette blanche (flash d'impact), créée à la demande. */
  white?: HTMLCanvasElement;
}

/** Forme enregistrée dans IndexedDB. `png` : ancien format (data URL), converti au chargement. */
interface StoredSprite {
  blob?: Blob;
  png?: string;
  adj: SpriteAdjust;
  at?: number;
}

type Layer = Map<string, Map<SpriteKey, SpriteEntry>>;
const layers: Record<SpriteEntry['src'], Layer> = { local: new Map(), repo: new Map() };
const portraits = new Map<string, HTMLCanvasElement>();
const PORTRAIT_SIZE = 160;

const storageKey = (charId: string, key: SpriteKey) => `spr:${charId}:${key}`;

export const localEntry = (charId: string, key: SpriteKey): SpriteEntry | undefined =>
  layers.local.get(charId)?.get(key);
export const repoEntry = (charId: string, key: SpriteKey): SpriteEntry | undefined =>
  layers.repo.get(charId)?.get(key);
/** L'image affichée : celle de l'appareil si elle existe, sinon celle du jeu. */
export const spriteEntry = (charId: string, key: SpriteKey): SpriteEntry | undefined =>
  localEntry(charId, key) ?? repoEntry(charId, key);
export const hasSprite = (charId: string, key: SpriteKey = 'idle'): boolean => !!spriteEntry(charId, key);
/** Les images affichées d'un personnage (une par pose, celle de l'appareil en priorité). */
export function spriteEntries(charId: string): [SpriteKey, SpriteEntry][] {
  const merged = new Map(layers.repo.get(charId));
  for (const [key, entry] of layers.local.get(charId) ?? []) merged.set(key, entry);
  return [...merged];
}
export const spriteCount = (charId: string): number => spriteEntries(charId).length;
/** Les images importées sur cet appareil pour ce personnage. */
export const localEntries = (charId: string): [SpriteKey, SpriteEntry][] => [
  ...(layers.local.get(charId) ?? []),
];

/** Un personnage s'affiche avec ses images dès que sa pose de repos existe ; sinon, avec le pantin. */
export const usesSprites = (char: Character): boolean => hasSprite(char.id, 'idle');

export function putSprite(
  charId: string,
  key: SpriteKey,
  img: HTMLCanvasElement,
  src: SpriteEntry['src'],
  extra: { adj?: Partial<SpriteAdjust>; blob?: Blob; at?: number; file?: string } = {},
): void {
  const layer = layers[src];
  let set = layer.get(charId);
  if (!set) layer.set(charId, (set = new Map()));
  const adj = { s: 1, dx: 0, dy: 0, ...extra.adj };
  const entry: SpriteEntry = { img, w: img.width, h: img.height, adj, src, blob: extra.blob, at: extra.at };
  if (src === 'repo') Object.assign(entry, { file: extra.file, repoAdj: { ...adj } });
  set.set(key, entry);
  portraits.delete(charId);
}

const kindOf = (key: SpriteKey) => (SPRITE_BY_KEY[key].stage ? 'stage' : 'sprite');

/** Enregistre sur l'appareil l'image locale d'une pose (avec son réglage). */
export async function persist(charId: string, key: SpriteKey): Promise<void> {
  const entry = localEntry(charId, key);
  if (!entry) return;
  entry.blob ??= await encodeImage(entry.img, kindOf(key));
  const stored: StoredSprite = { blob: entry.blob, adj: entry.adj, at: entry.at };
  await kvStore.set(storageKey(charId, key), stored);
}

/** Importe une image choisie par le joueur : détourage (sauf décor), compression, enregistrement. */
export async function importSpriteFile(charId: string, key: SpriteKey, file: File): Promise<void> {
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    const canvas = SPRITE_BY_KEY[key].stage ? prepareStage(image) : removeMagentaBackground(image);
    putSprite(charId, key, canvas, 'local', { at: Date.now() });
    await persist(charId, key);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Supprime l'image importée sur l'appareil : celle du jeu, s'il y en a une, reprend sa place. */
export async function removeSprite(charId: string, key: SpriteKey): Promise<void> {
  layers.local.get(charId)?.delete(key);
  portraits.delete(charId);
  await kvStore.delete(storageKey(charId, key));
}

export async function removeCharacterSprites(charId: string): Promise<void> {
  const all = await kvStore.entries<StoredSprite>();
  await Promise.all(all.filter((e) => e.key.startsWith(`spr:${charId}:`)).map((e) => kvStore.delete(e.key)));
  layers.local.delete(charId);
  layers.repo.delete(charId);
  portraits.delete(charId);
}

async function decode(value: StoredSprite): Promise<HTMLCanvasElement> {
  if (value.blob) return toCanvas(await createImageBitmap(value.blob));
  return toCanvas(await loadImage(value.png!));
}

/**
 * Recharge les images importées lors des sessions précédentes.
 * Les images de l'ancien format (PNG non compressé) sont converties une fois pour toutes ;
 * `rename` permet de reclasser une image enregistrée sous un ancien nom de pose.
 */
export async function loadLocalSprites(
  rename: (charId: string, key: string) => SpriteKey | null,
): Promise<void> {
  const all = await kvStore.entries<StoredSprite>();
  await Promise.all(
    all.map(async ({ key: recordKey, value }) => {
      const match = /^spr:(.+):([a-z0-9_]+)$/.exec(recordKey);
      if (!match) return;
      const charId = match[1]!;
      const key = isSpriteKey(match[2]!) ? match[2] : rename(charId, match[2]!);
      if (!key) return;
      try {
        putSprite(charId, key, await decode(value), 'local', {
          adj: value.adj,
          blob: value.blob,
          at: value.at,
        });
        if (value.blob && key === match[2]) return;
        // conversion à l'ancien format ou nouveau nom : on réenregistre, puis on retire l'ancienne copie
        await persist(charId, key);
        if (key !== match[2]) await kvStore.delete(recordKey);
      } catch {
        // image illisible : on l'ignore, le personnage utilisera une pose de repli
      }
    }),
  );
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
