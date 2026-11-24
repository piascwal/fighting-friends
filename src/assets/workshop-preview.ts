/* Aperçu de l'atelier : l'atelier de la banque de sprites est publié sur le même site que le jeu
   (piascwal.github.io), donc ils partagent le stockage de l'appareil. Le jeu y lit — sans jamais rien
   modifier — ce que l'atelier a enregistré et qui n'est pas encore dans la banque :
   - les images importées (IndexedDB, clés « spr:<personnage>:<pose> ») ;
   - les réglages de taille/position modifiés sur des images de la banque ;
   - les personnages créés dans l'atelier, et les style, couleur et taille changés.
   On peut ainsi essayer ses images en combat avant de les exporter. Un changement plus ancien que la
   version de la banque d'un personnage (champ `updated`) y est déjà : il est ignoré. */
import { kvStore } from '../core/storage';
import { addCharacter, characterById, clampSize, restyleCharacter } from '../data/roster';
import { STYLES } from '../data/styles';
import { isSpriteKey, type SpriteKey } from '../data/sprite-poses';
import type { StyleId } from '../data/types';
import { loadImage, toCanvas } from './image-load';
import { repoUpdated } from './repo-characters';
import { putPreviewSprite, setAdjustOverride, type SpriteAdjust } from './sprite-store';

/** Noms des données enregistrées par l'atelier (voir sprite-bank : character-files.ts, local-changes.ts). */
const CUSTOM_KEY = 'ff-custom-chars';
const OVERRIDES_KEY = 'ff-char-overrides';
const ADJUST_KEY = 'ff-adjust-overrides';

interface StoredSprite {
  blob?: Blob;
  /** Ancien format : image en data URL. */
  png?: string;
  adj: SpriteAdjust;
  at?: number;
}
interface CustomCharacter {
  id: string;
  name: string;
  style: StyleId;
  color: string;
  size?: number;
}
interface Settings {
  style?: StyleId;
  color?: string;
  size?: number;
}
type AdjustOverrides = Record<string, Partial<Record<SpriteKey, { adj: SpriteAdjust; at: number }>>>;

function readJson<T>(key: string, fallback: T): T {
  try {
    const text = localStorage.getItem(key);
    return text ? (JSON.parse(text) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Le changement est-il plus récent que la version de la banque du personnage ? */
const pending = (charId: string, at: number | undefined): boolean => (at ?? Infinity) > repoUpdated(charId);

/** Personnages créés dans l'atelier, et style, couleur et taille changés. */
function applyCharacters(): number {
  let count = 0;
  for (const c of readJson<CustomCharacter[]>(CUSTOM_KEY, [])) {
    if (!c.id || !c.name || characterById(c.id)) continue;
    addCharacter({ id: c.id, name: c.name, style: c.style, color: c.color, size: c.size, custom: true });
    count++;
  }
  for (const [id, settings] of Object.entries(readJson<Record<string, Settings>>(OVERRIDES_KEY, {}))) {
    const char = characterById(id);
    if (!char) continue;
    if (settings.color) char.color = settings.color;
    if (settings.size) char.size = clampSize(settings.size);
    if (settings.style && STYLES[settings.style] && settings.style !== char.styleId)
      restyleCharacter(char, settings.style);
  }
  return count;
}

/** Réglages de taille/position faits dans l'atelier sur des images de la banque. */
function applyAdjustments(): number {
  let count = 0;
  for (const [id, keys] of Object.entries(readJson<AdjustOverrides>(ADJUST_KEY, {}))) {
    for (const [key, stored] of Object.entries(keys ?? {})) {
      if (!stored || !isSpriteKey(key) || !pending(id, stored.at)) continue;
      setAdjustOverride(id, key, stored.adj);
      count++;
    }
  }
  return count;
}

async function decode(value: StoredSprite): Promise<HTMLCanvasElement> {
  if (value.blob) return toCanvas(await createImageBitmap(value.blob));
  return toCanvas(await loadImage(value.png!));
}

/** Images importées dans l'atelier. */
async function loadImages(): Promise<number> {
  const all = await kvStore.entries<StoredSprite>();
  const loaded = await Promise.all(
    all.map(async ({ key: recordKey, value }) => {
      const match = /^spr:(.+):([a-z0-9_]+)$/.exec(recordKey);
      if (!match || !isSpriteKey(match[2]!) || !pending(match[1]!, value.at)) return 0;
      try {
        putPreviewSprite(match[1]!, match[2], await decode(value), value.adj);
        return 1;
      } catch {
        return 0; // image illisible : celle de la banque reste affichée
      }
    }),
  );
  return loaded.reduce<number>((a, b) => a + b, 0);
}

/**
 * Charge l'aperçu de l'atelier (après les fiches de la banque, dont il a besoin pour les dates).
 * @returns le nombre de changements pas encore envoyés qui sont appliqués
 */
export async function loadWorkshopPreview(): Promise<number> {
  const characters = applyCharacters();
  const adjustments = applyAdjustments();
  const images = await loadImages().catch(() => 0);
  return characters + adjustments + images;
}

/**
 * Empreinte de ce que l'atelier a enregistré : si elle change pendant que le jeu est ouvert (on revient
 * de l'atelier), le jeu peut se recharger pour montrer les nouvelles images.
 */
export async function workshopSignature(): Promise<string> {
  const keys = (await kvStore.entries<StoredSprite>().catch(() => []))
    .map(({ key, value }) => `${key}@${value.at ?? 0}`)
    .sort();
  const texts = [CUSTOM_KEY, OVERRIDES_KEY, ADJUST_KEY].map((k) => {
    try {
      return localStorage.getItem(k) ?? '';
    } catch {
      return '';
    }
  });
  return [...keys, ...texts].join('|');
}
