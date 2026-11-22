/* Personnages livrés avec le jeu dans public/assets/characters/ (liste dans index.json).

   Un personnage du dépôt peut déjà exister sur l'appareil (créé et importé localement, puis exporté et
   ajouté au dépôt). Dans ce cas la version du dépôt le remplace, sans rien perdre :
   - ses images locales importées AVANT l'export sont remplacées par celles du dépôt (copies locales effacées) ;
   - une image importée APRÈS l'export reste prioritaire (date `updated` du character.json) ;
   - son style et sa couleur locaux, s'ils diffèrent, deviennent des réglages du joueur ;
   - les réglages de taille/position modifiés après l'export sont réappliqués (local-changes.ts).

   Les images des personnages du jeu ne sont PAS chargées au démarrage (il y en a des centaines) : au
   démarrage on ne lit que les fiches, puis chaque écran demande ce dont il a besoin (ensureSprites). */
import { addCharacter, characterById } from '../data/roster';
import { SPRITE_BY_KEY, SPRITE_POSES, isSpriteKey, type SpriteKey } from '../data/sprite-poses';
import type { CharacterDef } from '../data/types';
import { saveCustomCharacters, setOverride, type CharacterFile } from './character-files';
import { loadImage, prepareStage, removeMagentaBackground } from './chroma-key';
import { toCanvas } from './image-codec';
import { applyStoredAdjust, registerRepoManifest } from './local-changes';
import {
  localEntry,
  putSprite,
  removeSprite,
  spriteEntries,
  spriteEntry,
  type SpriteAdjust,
} from './sprite-store';

const REPO_DIR = 'assets/characters/';

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Fiche d'un personnage du jeu : où sont ses images, sans les avoir chargées. */
interface Manifest {
  dir: string;
  file: CharacterFile;
  files: Map<SpriteKey, string>;
}
const manifests = new Map<string, Manifest>();
/** Images dont le chargement est terminé (réussi ou non : une image absente n'est pas redemandée). */
const settled = new Set<string>();
const inflight = new Map<string, Promise<void>>();

/**
 * Ce qu'un écran demande à charger :
 * - portrait : la case de la sélection et le HUD ;
 * - idle : l'aperçu de l'écran titre ;
 * - preview : l'aperçu en pied, l'intro et la victoire (sélection, rencontre, générique) ;
 * - all : toutes les images, pour combattre ou travailler sur ses sprites.
 */
export type SpriteGroup = 'portrait' | 'idle' | 'preview' | 'all';

/**
 * Les images d'un groupe, parmi celles que le personnage a. Sans portrait, la case de sélection est
 * découpée dans la pose de repos : c'est elle qu'il faut alors charger.
 * @param pet images de l'animal de compagnie du style, s'il en a un
 */
export function keysForGroup(
  group: SpriteGroup,
  available: ReadonlySet<SpriteKey>,
  pet?: { idle: SpriteKey; win: SpriteKey },
): SpriteKey[] {
  if (group === 'all') return [...available];
  const wanted: SpriteKey[] =
    group === 'portrait'
      ? [available.has('portrait') ? 'portrait' : 'idle']
      : group === 'idle'
        ? ['portrait', 'idle']
        : ['portrait', 'idle', 'win', 'intro', 'walk1', 'walk2', ...(pet ? [pet.idle, pet.win] : [])];
  return wanted.filter((key) => available.has(key));
}

function groupKeys(id: string, group: SpriteGroup): SpriteKey[] {
  const m = manifests.get(id);
  return m ? keysForGroup(group, new Set(m.files.keys()), characterById(id)?.style.companion) : [];
}

/** Les images de ce groupe sont-elles chargées (ou impossibles à charger) ? */
export const isLoaded = (id: string, group: SpriteGroup = 'all'): boolean =>
  groupKeys(id, group).every((key) => settled.has(`${id}:${key}`));

/** Le personnage a une pose de repos livrée avec le jeu, pas encore chargée. */
export const spritesPending = (id: string): boolean =>
  !!manifests.get(id)?.files.has('idle') && !settled.has(`${id}:idle`);

/** Cette image existe-t-elle pour ce personnage, même si elle n'est pas encore chargée ? */
export const knowsSprite = (id: string, key: SpriteKey): boolean =>
  !!manifests.get(id)?.files.has(key) || !!spriteEntry(id, key);

/** Nombre d'images du personnage (livrées avec le jeu ou importées), chargées ou non. */
export function spriteTotal(id: string): number {
  const keys = new Set<SpriteKey>(manifests.get(id)?.files.keys());
  for (const [key] of spriteEntries(id)) keys.add(key);
  return keys.size;
}

function loadOne(id: string, m: Manifest, key: SpriteKey): Promise<void> {
  const tag = `${id}:${key}`;
  if (settled.has(tag)) return Promise.resolve();
  let pending = inflight.get(tag);
  if (!pending) {
    pending = (async () => {
      const name = m.files.get(key)!;
      try {
        const { canvas, blob } = await loadRepoImage(m.dir + name, key);
        const adj: Partial<SpriteAdjust> | undefined = m.file.adjust?.[key];
        putSprite(id, key, canvas, 'repo', { adj, blob, file: name });
        applyStoredAdjust(id, key);
      } catch {
        // image absente du dossier : on garde l'éventuelle image locale, sinon une pose de repli
      } finally {
        settled.add(tag);
        inflight.delete(tag);
      }
    })();
    inflight.set(tag, pending);
  }
  return pending;
}

/** Charge (une seule fois) les images d'un personnage du jeu ; sans effet pour un personnage local. */
export async function ensureSprites(id: string, group: SpriteGroup = 'all'): Promise<void> {
  const m = manifests.get(id);
  if (!m) return;
  await Promise.all(groupKeys(id, group).map((key) => loadOne(id, m, key)));
}

/**
 * Au démarrage : les fiches de tous les personnages du jeu (de petits fichiers texte), jamais leurs images.
 * Celles-ci se chargent à la demande (ensureSprites), ou en arrière-plan (preloadRoster).
 */
export async function loadRepoCharacters(): Promise<void> {
  const ids = (await fetchJson<string[]>(`${REPO_DIR}index.json`)) ?? [];
  const files = await Promise.all(
    ids.map(async (id) => (await fetchJson<CharacterFile>(`${REPO_DIR}${id}/character.json`)) ?? {}),
  );
  // déclarés dans l'ordre de index.json (ordre de la sélection)
  ids.forEach((id, i) => registerCharacter(id, files[i]!));
  await Promise.all(ids.map((id, i) => declareImages(id, files[i]!)));
}

/** Charge en arrière-plan les images que les menus affichent : portraits d'abord, puis poses de repos. */
export async function preloadRoster(): Promise<void> {
  const ids = [...manifests.keys()];
  await Promise.all(ids.map((id) => ensureSprites(id, 'portrait')));
  await Promise.all(ids.map((id) => ensureSprites(id, 'idle')));
}

/** Déclare le personnage du dépôt, en remplaçant une éventuelle version créée sur l'appareil. */
function registerCharacter(id: string, file: CharacterFile): void {
  const local = characterById(id);
  const def: CharacterDef = {
    id,
    name: file.name ?? id.toUpperCase(),
    style: file.style ?? file.template ?? 'balanced',
    color: file.color ?? '#ff3d7f',
    size: file.size,
    title: file.title,
    quote: file.quote,
    custom: true,
    repo: true,
  };
  addCharacter(def);
  if (local?.custom && !local.repo) {
    if (local.styleId !== def.style || local.color !== def.color || local.size !== (def.size ?? 1)) {
      setOverride(id, { style: local.styleId, color: local.color, size: local.size });
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

/**
 * Déclare les images d'un personnage du jeu : retient où elles sont, et efface les copies locales
 * importées avant cet export (déjà dans le dépôt). Une image importée APRÈS reste prioritaire.
 */
async function declareImages(id: string, file: CharacterFile): Promise<void> {
  const files = new Map(imageFiles(file));
  manifests.set(id, { dir: `${REPO_DIR}${id}/`, file, files });
  registerRepoManifest(id, file);
  const exportedAt = file.updated ?? 0;
  for (const key of files.keys()) {
    const local = localEntry(id, key);
    if (local && !(local.at && local.at > exportedAt)) await removeSprite(id, key);
  }
}
