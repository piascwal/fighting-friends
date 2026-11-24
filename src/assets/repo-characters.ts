/* Personnages du jeu : ceux de la banque de sprites, copiés dans public/assets/characters/ par
   npm run sprites (liste dans index.json).

   Les images ne sont PAS chargées au démarrage (il y en a des centaines) : on ne lit que les fiches, puis
   chaque écran demande ce dont il a besoin (ensureSprites). */
import { addCharacter, characterById } from '../data/roster';
import { SPRITE_BY_KEY, SPRITE_POSES, isSpriteKey, type SpriteKey } from '../data/sprite-poses';
import type { StyleId } from '../data/types';
import { loadImage, prepareStage, toCanvas } from './image-load';
import { putSprite, type SpriteAdjust } from './sprite-store';

/** Contenu d'un fichier character.json de la banque (champs lus par le jeu). */
interface CharacterFile {
  name?: string;
  style?: StyleId;
  /** Ancien nom du champ `style`. */
  template?: StyleId;
  color?: string;
  size?: number;
  title?: string;
  quote?: string;
  /** Fichier de chaque image (`{ "idle": "idle.webp" }`). Ancien format : liste de poses en .png. */
  files?: Partial<Record<SpriteKey, string>>;
  sprites?: SpriteKey[];
  adjust?: Partial<Record<SpriteKey, SpriteAdjust>>;
  /** Date de l'export intégré à la banque (ms) : les changements de l'atelier plus anciens y sont déjà. */
  updated?: number;
}

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
/** Date de la version de la banque d'un personnage (0 s'il n'y est pas). */
export const repoUpdated = (id: string): number => manifests.get(id)?.file.updated ?? 0;

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

function loadOne(id: string, m: Manifest, key: SpriteKey): Promise<void> {
  const tag = `${id}:${key}`;
  if (settled.has(tag)) return Promise.resolve();
  let pending = inflight.get(tag);
  if (!pending) {
    pending = (async () => {
      const name = m.files.get(key)!;
      try {
        putSprite(id, key, await loadRepoImage(m.dir + name, key), m.file.adjust?.[key]);
      } catch {
        // image absente du dossier : le personnage utilisera une pose de repli
      } finally {
        settled.add(tag);
        inflight.delete(tag);
      }
    })();
    inflight.set(tag, pending);
  }
  return pending;
}

/** Charge (une seule fois) les images d'un personnage. */
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
  ids.forEach((id, i) => {
    const file = files[i]!;
    registerCharacter(id, file);
    manifests.set(id, { dir: `${REPO_DIR}${id}/`, file, files: new Map(imageFiles(file)) });
  });
}

/** Charge en arrière-plan les images que les menus affichent : portraits d'abord, puis poses de repos. */
export async function preloadRoster(): Promise<void> {
  const ids = [...manifests.keys()];
  await Promise.all(ids.map((id) => ensureSprites(id, 'portrait')));
  await Promise.all(ids.map((id) => ensureSprites(id, 'idle')));
}

/** Déclare le personnage, dans l'ordre de index.json (ordre de la sélection). */
function registerCharacter(id: string, file: CharacterFile): void {
  addCharacter({
    id,
    name: file.name ?? id.toUpperCase(),
    style: file.style ?? file.template ?? 'balanced',
    color: file.color ?? '#ff3d7f',
    size: file.size,
    title: file.title,
    quote: file.quote,
    repo: true,
  });
}

/** Fichiers d'images du personnage : `files`, ou l'ancien format (liste de poses en .png). */
function imageFiles(file: CharacterFile): [SpriteKey, string][] {
  if (file.files)
    return Object.entries(file.files).filter((e): e is [SpriteKey, string] => isSpriteKey(e[0]));
  const keys = file.sprites ?? SPRITE_POSES.map((s) => s.key);
  return keys.filter(isSpriteKey).map((key) => [key, `${key}.png`]);
}

async function loadRepoImage(url: string, key: SpriteKey): Promise<HTMLCanvasElement> {
  if (SPRITE_BY_KEY[key].stage) return prepareStage(await loadImage(url));
  const response = await fetch(url);
  if (!response.ok) throw new Error(`image absente : ${url}`);
  // Les images de la banque viennent de l'export de l'atelier : déjà détourées, recadrées au pixel près
  // et plafonnées à 640 px. On se contente de les décoder.
  return toCanvas(await createImageBitmap(await response.blob()));
}
