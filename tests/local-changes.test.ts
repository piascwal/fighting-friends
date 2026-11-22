/* Changements locaux d'un personnage livré avec le jeu : marqueurs « à envoyer » et export du delta. */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// pas d'IndexedDB sous Node : un stockage en mémoire suffit
vi.mock('../src/core/storage', () => {
  const data = new Map<string, unknown>();
  return {
    kvStore: {
      get: (k: string) => Promise.resolve(data.get(k)),
      set: (k: string, v: unknown) => Promise.resolve(void data.set(k, v)),
      delete: (k: string) => Promise.resolve(void data.delete(k)),
      entries: () => Promise.resolve([...data].map(([key, value]) => ({ key, value }))),
    },
  };
});

import {
  applyStoredAdjust,
  changesManifest,
  registerRepoManifest,
  pendingChanges,
  resetAdjust,
  saveAdjust,
} from '../src/assets/local-changes';
import { putSprite, removeSprite, removeCharacterSprites, spriteEntry } from '../src/assets/sprite-store';
import { characterById } from '../src/data/roster';
import type { Character } from '../src/data/types';

const storage = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
  clear: () => storage.clear(),
  key: () => null,
  length: 0,
} as Storage;

// une image factice : seules ses dimensions comptent ici
const img = (w = 100, h = 200) => ({ width: w, height: h }) as HTMLCanvasElement;
const ID = 'repo-test';
const UPDATED = 1_000;

/** Personnage « livré avec le jeu » : deux images, dont une avec un réglage. */
function loadRepo(updated = UPDATED): void {
  putSprite(ID, 'idle', img(), 'repo', { file: 'idle.webp' });
  putSprite(ID, 'crouch', img(), 'repo', { file: 'crouch.webp', adj: { s: 0.9 } });
  registerRepoManifest(ID, { updated, files: { idle: 'idle.webp', crouch: 'crouch.webp' } });
  // chaque image du jeu reprend son réglage modifié sur l'appareil, une fois chargée
  for (const key of ['idle', 'crouch'] as const) applyStoredAdjust(ID, key);
}

describe('changements locaux', () => {
  beforeEach(async () => {
    storage.clear();
    await removeCharacterSprites(ID);
    loadRepo();
  });

  it("un personnage tel que livré n'a rien à envoyer", () => {
    expect(pendingChanges(ID)).toEqual([]);
  });

  it("un personnage créé sur l'appareil n'a pas de changements (il s'exporte en entier)", () => {
    putSprite('local-only', 'idle', img(), 'local', { at: 5 });
    expect(pendingChanges('local-only')).toEqual([]);
  });

  it('un réglage modifié sur une image du jeu est enregistré et marqué à envoyer', async () => {
    spriteEntry(ID, 'crouch')!.adj.s = 1.2;
    await saveAdjust(ID, 'crouch');
    expect(pendingChanges(ID)).toEqual([{ key: 'crouch', kind: 'adjust' }]);
    // au prochain lancement, la version du jeu est rechargée puis le réglage réappliqué
    loadRepo();
    expect(spriteEntry(ID, 'crouch')!.adj.s).toBe(1.2);
    expect(pendingChanges(ID)).toEqual([{ key: 'crouch', kind: 'adjust' }]);
  });

  it('revenir au réglage du jeu efface le changement', async () => {
    spriteEntry(ID, 'crouch')!.adj.dy = 12;
    await saveAdjust(ID, 'crouch');
    resetAdjust(ID, 'crouch');
    expect(spriteEntry(ID, 'crouch')!.adj).toEqual({ s: 0.9, dx: 0, dy: 0 });
    expect(pendingChanges(ID)).toEqual([]);
  });

  it('un réglage déjà intégré au dépôt (version plus récente) est oublié', async () => {
    spriteEntry(ID, 'crouch')!.adj.s = 1.2;
    await saveAdjust(ID, 'crouch');
    loadRepo(Date.now() + 1000);
    expect(spriteEntry(ID, 'crouch')!.adj.s).toBe(0.9);
    expect(pendingChanges(ID)).toEqual([]);
    expect(storage.get('ff-adjust-overrides')).toBe('{}');
  });

  it('une image importée passe devant celle du jeu ; la supprimer fait revenir celle du jeu', async () => {
    putSprite(ID, 'idle', img(50, 50), 'local', { at: Date.now() });
    putSprite(ID, 'win', img(), 'local', { at: Date.now() });
    expect(spriteEntry(ID, 'idle')!.w).toBe(50);
    expect(pendingChanges(ID)).toEqual([
      { key: 'idle', kind: 'image' },
      { key: 'win', kind: 'image' },
    ]);
    await removeSprite(ID, 'idle');
    expect(spriteEntry(ID, 'idle')!.src).toBe('repo');
  });

  it('le character.json exporté décrit le delta et garde les fichiers inchangés', async () => {
    putSprite(ID, 'win', img(), 'local', { at: Date.now() });
    spriteEntry(ID, 'crouch')!.adj.dx = 4;
    await saveAdjust(ID, 'crouch');
    const char = characterById('ardan') as Character;
    const manifest = changesManifest({ ...char, id: ID }, { win: 'win.webp' });
    expect(manifest.changes).toEqual({ images: ['win'], adjust: ['crouch'] });
    expect(manifest.files).toEqual({ idle: 'idle.webp', crouch: 'crouch.webp', win: 'win.webp' });
    expect(manifest.adjust!.crouch).toEqual({ s: 0.9, dx: 4, dy: 0 });
    expect(manifest.updated).toBeGreaterThan(UPDATED);
  });
});
