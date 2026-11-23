/* Changements faits sur l'appareil à un personnage livré avec le jeu, à « envoyer » pour qu'ils
   rejoignent le dépôt :
   - une image importée qui remplace (ou complète) celles du jeu ;
   - un réglage de taille/position modifié sur une image du jeu (enregistré ici, avec sa date).

   L'export des changements produit `<id>-changements.zip` : le character.json complet à jour (avec la
   liste `changes`) et SEULEMENT les images modifiées. Une fois ce dossier copié dans le dépôt, la date
   `updated` du nouveau character.json est plus récente que les changements : ils sont absorbés
   (copies locales effacées) et les marqueurs « à envoyer » disparaissent. */
import { SPRITE_BY_KEY, type SpriteKey } from '../data/sprite-poses';
import type { Character } from '../data/types';
import { downloadZip, readJson, writeJson, type CharacterFile } from './character-files';
import { encodeImage, extensionOf } from './image-codec';
import {
  localEntries,
  localEntry,
  persist,
  repoEntry,
  spriteEntries,
  spriteEntry,
  type SpriteAdjust,
} from './sprite-store';
import type { ZipFile } from './zip';

const ADJUST_KEY = 'ff-adjust-overrides';

interface StoredAdjust {
  adj: SpriteAdjust;
  at: number;
}
type AdjustOverrides = Record<string, Partial<Record<SpriteKey, StoredAdjust>>>;

export interface PendingChange {
  key: SpriteKey;
  kind: 'image' | 'adjust';
}

/** Contenu du character.json livré avec le jeu, par personnage (pour reconstruire le fichier exporté). */
const repoFiles = new Map<string, CharacterFile>();

const sameAdjust = (a: SpriteAdjust, b: SpriteAdjust) => a.s === b.s && a.dx === b.dx && a.dy === b.dy;

function updateOverrides(change: (all: AdjustOverrides) => void): void {
  const all = readJson<AdjustOverrides>(ADJUST_KEY, {});
  change(all);
  writeJson(ADJUST_KEY, all);
}

/** Le personnage a-t-il une version livrée avec le jeu ? (connu dès la lecture de sa fiche) */
export const hasRepoLayer = (charId: string): boolean => repoFiles.has(charId);

/**
 * À la lecture de la fiche d'un personnage du jeu : les réglages modifiés sur l'appareil avant la date de
 * cette version sont déjà intégrés au dépôt, on les oublie. Les autres sont réappliqués image par image,
 * quand chaque image est chargée (applyStoredAdjust).
 */
export function registerRepoManifest(charId: string, file: CharacterFile): void {
  repoFiles.set(charId, file);
  const updated = file.updated ?? 0;
  updateOverrides((all) => {
    const mine = all[charId] ?? {};
    for (const [key, stored] of Object.entries(mine) as [SpriteKey, StoredAdjust][]) {
      if (stored.at <= updated) delete mine[key];
    }
    if (Object.keys(mine).length) all[charId] = mine;
    else delete all[charId];
  });
}

const storedAdjust = (charId: string): Partial<Record<SpriteKey, StoredAdjust>> =>
  readJson<AdjustOverrides>(ADJUST_KEY, {})[charId] ?? {};

/** Une image du jeu vient d'être chargée : lui rend le réglage modifié sur cet appareil, s'il y en a un. */
export function applyStoredAdjust(charId: string, key: SpriteKey): void {
  const stored = storedAdjust(charId)[key];
  const entry = repoEntry(charId, key);
  if (stored && entry) Object.assign(entry, { adj: { ...stored.adj }, adjAt: stored.at });
}

/** Enregistre le réglage de l'image affichée, qu'elle vienne de l'appareil ou du jeu. */
export async function saveAdjust(charId: string, key: SpriteKey): Promise<void> {
  if (localEntry(charId, key)) return persist(charId, key);
  const entry = repoEntry(charId, key);
  if (!entry) return;
  const changed = !entry.repoAdj || !sameAdjust(entry.adj, entry.repoAdj);
  entry.adjAt = changed ? Date.now() : undefined;
  updateOverrides((all) => {
    const mine = (all[charId] ??= {});
    if (changed) mine[key] = { adj: { ...entry.adj }, at: entry.adjAt! };
    else delete mine[key];
    if (!Object.keys(mine).length) delete all[charId];
  });
}

/** Revient au réglage livré avec le jeu pour une image du jeu. */
export function resetAdjust(charId: string, key: SpriteKey): void {
  const entry = repoEntry(charId, key);
  if (!entry?.repoAdj) return;
  entry.adj = { ...entry.repoAdj };
  void saveAdjust(charId, key);
}

/** Les changements à envoyer d'un personnage livré avec le jeu (aucun pour un personnage local). */
export function pendingChanges(charId: string): PendingChange[] {
  if (!hasRepoLayer(charId)) return [];
  const changes: PendingChange[] = localEntries(charId).map(([key]) => ({ key, kind: 'image' }));
  // les réglages sont lus dans le stockage : pas besoin que les images du jeu soient chargées
  const images = new Set(changes.map((c) => c.key));
  for (const key of Object.keys(storedAdjust(charId)) as SpriteKey[]) {
    if (!images.has(key)) changes.push({ key, kind: 'adjust' });
  }
  return changes;
}

export const pendingChange = (charId: string, key: SpriteKey): PendingChange | undefined =>
  pendingChanges(charId).find((c) => c.key === key);

/** Réglages du personnage (style, couleur, taille) changés sur l'appareil par rapport à la version du jeu. */
export type SettingsField = 'style' | 'color' | 'size';

export function settingsChanges(char: Character): SettingsField[] {
  const repo = repoFiles.get(char.id);
  if (!repo) return [];
  const out: SettingsField[] = [];
  if ((repo.style ?? repo.template ?? char.styleId) !== char.styleId) out.push('style');
  if ((repo.color ?? char.color).toLowerCase() !== char.color.toLowerCase()) out.push('color');
  if ((repo.size ?? 1) !== char.size) out.push('size');
  return out;
}

/** Ce qu'on choisit d'exporter : des poses (image ou réglage) et, ou non, les réglages du personnage. */
export interface ChangeSelection {
  keys: ReadonlySet<SpriteKey>;
  settings: boolean;
}

/** Tout exporter. */
export const fullSelection = (char: Character): ChangeSelection => ({
  keys: new Set(pendingChanges(char.id).map((c) => c.key)),
  settings: true,
});

/** Date d'un changement fait sur l'appareil (inconnue pour les images importées avant cette information). */
const changeTime = (charId: string, c: PendingChange): number | undefined =>
  c.kind === 'image' ? localEntry(charId, c.key)?.at : storedAdjust(charId)[c.key]?.at;

/**
 * Date `updated` de l'export. Une fois dans le dépôt, les changements de l'appareil plus anciens que cette
 * date sont absorbés (effacés) : si on n'exporte pas tout, elle se place juste avant le plus ancien
 * changement laissé de côté, pour qu'il reste sur l'appareil.
 */
function exportDate(charId: string, left: PendingChange[]): number {
  const times = left.map((c) => changeTime(charId, c) ?? Date.now());
  return times.length ? Math.min(Date.now(), ...times) - 1 : Date.now();
}

/**
 * Le character.json à jour : réglages et fichiers actuels pour les changements choisis, ceux du jeu pour
 * les autres ; `updated` (voir exportDate) ; liste des changements exportés.
 */
export function changesManifest(
  char: Character,
  names: Partial<Record<SpriteKey, string>>,
  selection: ChangeSelection = fullSelection(char),
): CharacterFile {
  const repo = repoFiles.get(char.id) ?? {};
  const changes = pendingChanges(char.id);
  const picked = changes.filter((c) => selection.keys.has(c.key));
  const left = changes.filter((c) => !selection.keys.has(c.key));
  const files: CharacterFile['files'] = {};
  const adjust: CharacterFile['adjust'] = {};
  for (const [key, entry] of spriteEntries(char.id)) {
    const skipped = left.some((c) => c.key === key);
    // changement laissé de côté : on garde l'image du jeu (s'il y en a une) et son réglage d'origine
    const shown = skipped ? repoEntry(char.id, key) : entry;
    if (!shown) continue;
    const name = skipped ? shown.file : (names[key] ?? shown.file);
    if (name) files[key] = name;
    adjust[key] = { ...(skipped ? (shown.repoAdj ?? shown.adj) : shown.adj) };
  }
  const settings = selection.settings;
  return {
    ...repo,
    id: char.id,
    name: char.name,
    style: settings ? char.styleId : (repo.style ?? repo.template ?? char.styleId),
    color: settings ? char.color : (repo.color ?? char.color),
    size: settings ? char.size : (repo.size ?? 1),
    files,
    adjust,
    updated: exportDate(char.id, left),
    changes: {
      images: picked.filter((c) => c.kind === 'image').map((c) => c.key),
      adjust: picked.filter((c) => c.kind === 'adjust').map((c) => c.key),
    },
  };
}

/** Fichiers de l'export des changements choisis : `<id>/character.json` + les images modifiées choisies. */
export async function changesZipFiles(
  char: Character,
  selection: ChangeSelection = fullSelection(char),
): Promise<ZipFile[]> {
  const zipFiles: ZipFile[] = [];
  const names: Partial<Record<SpriteKey, string>> = {};
  for (const { key, kind } of pendingChanges(char.id)) {
    if (kind !== 'image' || !selection.keys.has(key)) continue;
    const entry = spriteEntry(char.id, key)!;
    const blob = entry.blob ?? (await encodeImage(entry.img, SPRITE_BY_KEY[key].stage ? 'stage' : 'sprite'));
    names[key] = `${key}.${extensionOf(blob)}`;
    zipFiles.push({ name: `${char.id}/${names[key]}`, data: new Uint8Array(await blob.arrayBuffer()) });
  }
  const manifest = changesManifest(char, names, selection);
  zipFiles.unshift({
    name: `${char.id}/character.json`,
    data: new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
  });
  return zipFiles;
}

/** Télécharge `<id>-changements.zip` : character.json à jour + les seules images modifiées. */
export async function exportChanges(char: Character): Promise<void> {
  downloadZip(await changesZipFiles(char), `${char.id}-changements.zip`);
}
