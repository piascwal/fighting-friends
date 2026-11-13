/* Personnages ajoutés au jeu : créés par le joueur (enregistrés sur l'appareil), livrés dans le dépôt
   (public/assets/characters), et export d'un personnage en .zip prêt à déposer dans le dépôt. */
import { addCharacter, characterById, roster } from '../data/roster';
import { SPRITE_BY_KEY, SPRITE_POSES, type SpriteKey } from '../data/sprite-poses';
import type { Character, CharacterDef, StyleId } from '../data/types';
import { loadImage, removeMagentaBackground } from './chroma-key';
import { hasSprite, putSprite, spriteEntries, type SpriteAdjust } from './sprite-store';
import { buildZip, type ZipFile } from './zip';

const CUSTOM_KEY = 'ff-custom-chars';
const REPO_DIR = 'assets/characters/';

/** Contenu d'un fichier character.json (dans le dépôt ou dans un export). */
interface CharacterFile {
  id?: string;
  name?: string;
  style?: StyleId;
  /** Ancien nom du champ `style`. */
  template?: StyleId;
  color?: string;
  title?: string;
  quote?: string;
  sprites?: SpriteKey[];
  adjust?: Partial<Record<SpriteKey, SpriteAdjust>>;
}

/** Lit la liste enregistrée ; une liste absente ou illisible vaut « aucun personnage ». */
function readCustomList(): CharacterFile[] {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function loadCustomCharacters(): void {
  for (const file of readCustomList()) {
    if (!file.id || !file.name || characterById(file.id)) continue;
    addCharacter({
      id: file.id,
      name: file.name,
      style: file.style ?? file.template ?? 'balanced',
      color: file.color ?? '#ff3d7f',
      custom: true,
    });
  }
}

export function saveCustomCharacters(): void {
  const list = roster
    .filter((c) => c.custom && !c.repo)
    .map((c) => ({ id: c.id, name: c.name, style: c.styleId, color: c.color }));
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
  } catch {
    // stockage indisponible : le personnage reste jouable pour cette session
  }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Charge les personnages listés dans public/assets/characters/index.json. */
export async function loadRepoCharacters(): Promise<void> {
  const ids = (await fetchJson<string[]>(`${REPO_DIR}index.json`)) ?? [];
  await Promise.all(ids.map(loadRepoCharacter));
}

async function loadRepoCharacter(id: string): Promise<void> {
  const dir = `${REPO_DIR}${id}/`;
  const file = (await fetchJson<CharacterFile>(`${dir}character.json`)) ?? {};
  if (!characterById(id)) {
    const def: CharacterDef = {
      id,
      name: file.name ?? id.toUpperCase(),
      style: file.style ?? file.template ?? 'balanced',
      color: file.color ?? '#ff3d7f',
      title: file.title,
      quote: file.quote,
      custom: true,
      repo: true,
    };
    addCharacter(def);
  }
  const keys = file.sprites ?? SPRITE_POSES.map((s) => s.key);
  await Promise.all(
    keys.map(async (key) => {
      // une image importée sur l'appareil reste prioritaire sur celle du dépôt
      if (!(key in SPRITE_BY_KEY) || hasSprite(id, key)) return;
      try {
        const img = await loadImage(`${dir}${key}.png`);
        putSprite(id, key, removeMagentaBackground(img), 'repo', file.adjust?.[key]);
      } catch {
        // pose absente du dossier : le jeu utilisera une pose de repli
      }
    }),
  );
}

function pngBytes(canvas: HTMLCanvasElement): Uint8Array {
  const binary = atob(canvas.toDataURL('image/png').split(',')[1]!);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Télécharge `<id>.zip` : le dossier à déposer dans public/assets/characters/. */
export function exportCharacterZip(char: Character): void {
  const files: ZipFile[] = [];
  const adjust: CharacterFile['adjust'] = {};
  const sprites: SpriteKey[] = [];
  for (const [key, entry] of spriteEntries(char.id)) {
    files.push({ name: `${char.id}/${key}.png`, data: pngBytes(entry.img) });
    adjust[key] = entry.adj;
    sprites.push(key);
  }
  const manifest: CharacterFile = {
    id: char.id,
    name: char.name,
    style: char.styleId,
    color: char.color,
    title: char.title,
    quote: char.quote,
    sprites,
    adjust,
  };
  const json = new TextEncoder().encode(JSON.stringify(manifest, null, 2));
  files.unshift({ name: `${char.id}/character.json`, data: json });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(buildZip(files));
  link.download = `${char.id}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 5000);
}
