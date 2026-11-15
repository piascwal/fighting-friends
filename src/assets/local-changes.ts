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
  hasRepoLayer,
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

/**
 * Après le chargement d'un personnage du jeu : réapplique les réglages modifiés sur l'appareil,
 * sauf ceux antérieurs à la version livrée (déjà intégrés au dépôt), qui sont oubliés.
 */
export function applyAdjustOverrides(charId: string, file: CharacterFile): void {
  repoFiles.set(charId, file);
  const updated = file.updated ?? 0;
  updateOverrides((all) => {
    const mine = all[charId] ?? {};
    for (const [key, stored] of Object.entries(mine) as [SpriteKey, StoredAdjust][]) {
      const entry = repoEntry(charId, key);
      if (!entry || stored.at <= updated) delete mine[key];
      else Object.assign(entry, { adj: { ...stored.adj }, adjAt: stored.at });
    }
    if (Object.keys(mine).length) all[charId] = mine;
    else delete all[charId];
  });
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
  const changes: PendingChange[] = [];
  for (const [key, entry] of spriteEntries(charId)) {
    if (entry.src === 'local') changes.push({ key, kind: 'image' });
    else if (entry.adjAt) changes.push({ key, kind: 'adjust' });
  }
  return changes;
}

export const pendingChange = (charId: string, key: SpriteKey): PendingChange | undefined =>
  pendingChanges(charId).find((c) => c.key === key);

/** Le character.json à jour : réglages et fichiers actuels, `updated` = maintenant, liste des changements. */
export function changesManifest(char: Character, names: Partial<Record<SpriteKey, string>>): CharacterFile {
  const repo = repoFiles.get(char.id) ?? {};
  const changes = pendingChanges(char.id);
  const files: CharacterFile['files'] = {};
  const adjust: CharacterFile['adjust'] = {};
  for (const [key, entry] of spriteEntries(char.id)) {
    const name = names[key] ?? entry.file;
    if (name) files[key] = name;
    adjust[key] = { ...entry.adj };
  }
  return {
    ...repo,
    id: char.id,
    name: char.name,
    style: char.styleId,
    color: char.color,
    files,
    adjust,
    updated: Date.now(),
    changes: {
      images: changes.filter((c) => c.kind === 'image').map((c) => c.key),
      adjust: changes.filter((c) => c.kind === 'adjust').map((c) => c.key),
    },
  };
}

/** Télécharge `<id>-changements.zip` : character.json à jour + les seules images modifiées. */
export async function exportChanges(char: Character): Promise<void> {
  const zipFiles: ZipFile[] = [];
  const names: Partial<Record<SpriteKey, string>> = {};
  for (const { key, kind } of pendingChanges(char.id)) {
    if (kind !== 'image') continue;
    const entry = spriteEntry(char.id, key)!;
    const blob = entry.blob ?? (await encodeImage(entry.img, SPRITE_BY_KEY[key].stage ? 'stage' : 'sprite'));
    names[key] = `${key}.${extensionOf(blob)}`;
    zipFiles.push({ name: `${char.id}/${names[key]}`, data: new Uint8Array(await blob.arrayBuffer()) });
  }
  const manifest = changesManifest(char, names);
  zipFiles.unshift({
    name: `${char.id}/character.json`,
    data: new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
  });
  downloadZip(zipFiles, `${char.id}-changements.zip`);
}
