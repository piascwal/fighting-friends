/* Personnages livrés avec le jeu dans public/assets/characters/ (liste dans index.json).

   Un personnage du dépôt peut déjà exister sur l'appareil (créé et importé localement, puis exporté et
   ajouté au dépôt). Dans ce cas la version du dépôt le remplace, sans rien perdre :
   - ses images locales importées AVANT l'export sont remplacées par celles du dépôt (copies locales effacées) ;
   - une image importée APRÈS l'export reste prioritaire (date `updated` du character.json) ;
   - son style et sa couleur locaux, s'ils diffèrent, deviennent des réglages du joueur. */
import { addCharacter, characterById } from '../data/roster';
import { SPRITE_BY_KEY, SPRITE_POSES, isSpriteKey, type SpriteKey } from '../data/sprite-poses';
import type { CharacterDef } from '../data/types';
import { saveCustomCharacters, setOverride, type CharacterFile } from './character-files';
import { loadImage, prepareStage, removeMagentaBackground } from './chroma-key';
import { toCanvas } from './image-codec';
import { forgetStoredSprite, putSprite, spriteEntry, type SpriteAdjust } from './sprite-store';

const REPO_DIR = 'assets/characters/';

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

/** Déclare le personnage du dépôt, en remplaçant une éventuelle version créée sur l'appareil. */
function registerCharacter(id: string, file: CharacterFile): void {
  const local = characterById(id);
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
  if (local?.custom && !local.repo) {
    if (local.styleId !== def.style || local.color !== def.color) {
      setOverride(id, { style: local.styleId, color: local.color });
    }
    saveCustomCharacters(); // il n'est plus dans la liste des personnages créés sur l'appareil
  }
}

/** Fichiers d'images du personnage : `files`, ou l'ancien format (liste de poses en .png). */
function imageFiles(file: CharacterFile): [SpriteKey, string][] {
  if (file.files)
    return Object.entries(file.files).filter((e): e is [SpriteKey, string] => isSpriteKey(e[0]));
  const keys = file.sprites ?? SPRITE_POSES.map((s) => s.key);
  return keys.filter(isSpriteKey).map((key) => [key, `${key}.png`]);
}

async function loadRepoImage(
  url: string,
  key: SpriteKey,
): Promise<{ canvas: HTMLCanvasElement; blob?: Blob }> {
  if (SPRITE_BY_KEY[key].stage) return { canvas: prepareStage(await loadImage(url)) };
  const response = await fetch(url);
  if (!response.ok) throw new Error(`image absente : ${url}`);
  const blob = await response.blob();
  // images déjà détourées : seul le recadrage s'applique, les couleurs ne changent pas
  return { canvas: removeMagentaBackground(toCanvas(await createImageBitmap(blob))), blob };
}

async function loadRepoCharacter(id: string): Promise<void> {
  const dir = `${REPO_DIR}${id}/`;
  const file = (await fetchJson<CharacterFile>(`${dir}character.json`)) ?? {};
  registerCharacter(id, file);
  const exportedAt = file.updated ?? 0;
  await Promise.all(
    imageFiles(file).map(async ([key, name]) => {
      const local = spriteEntry(id, key);
      if (local?.src === 'local' && local.at && local.at > exportedAt) return; // importée après l'export
      try {
        const { canvas, blob } = await loadRepoImage(dir + name, key);
        const adj: Partial<SpriteAdjust> | undefined = file.adjust?.[key];
        putSprite(id, key, canvas, 'repo', { adj, blob });
        if (local?.src === 'local') await forgetStoredSprite(id, key);
      } catch {
        // image absente du dossier : on garde l'éventuelle image locale, sinon une pose de repli
      }
    }),
  );
}
