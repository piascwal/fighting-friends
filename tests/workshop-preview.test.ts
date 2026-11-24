/* Aperçu de l'atelier : le jeu montre les images et réglages de l'atelier pas encore envoyés, et ignore
   ceux qui sont déjà dans la banque (plus anciens que la version de la banque du personnage). */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const BANK_UPDATED = 1_000;
const records = new Map<string, unknown>();

// pas d'IndexedDB ni de décodage d'image sous Node : un stockage en mémoire et des images factices
vi.mock('../src/core/storage', () => ({
  kvStore: {
    entries: () => Promise.resolve([...records].map(([key, value]) => ({ key, value }))),
  },
}));
vi.mock('../src/assets/image-load', () => ({
  loadImage: (src: string) => Promise.resolve({ width: src.length, height: 50 }),
  toCanvas: (image: { width: number; height: number }) => ({ width: image.width, height: image.height }),
}));
vi.mock('../src/assets/repo-characters', () => ({ repoUpdated: () => BANK_UPDATED }));

const storage = new Map<string, string>();
globalThis.localStorage = {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => void storage.set(k, v),
  removeItem: (k: string) => void storage.delete(k),
  clear: () => storage.clear(),
  key: () => null,
  length: 0,
} as Storage;

const { loadWorkshopPreview } = await import('../src/assets/workshop-preview');
const { putSprite, spriteEntry } = await import('../src/assets/sprite-store');
const { characterById } = await import('../src/data/roster');

const bankImage = { width: 100, height: 200 } as HTMLCanvasElement;
const adj = { s: 1.2, dx: 3, dy: 0 };

describe("aperçu de l'atelier", () => {
  beforeEach(() => {
    records.clear();
    storage.clear();
  });

  it('une image importée après la version de la banque passe devant celle de la banque', async () => {
    putSprite('ardan', 'win', bankImage);
    records.set('spr:ardan:win', { png: 'data:image/png;base64,AAAA', adj, at: BANK_UPDATED + 1 });
    expect(await loadWorkshopPreview()).toBe(1);
    expect(spriteEntry('ardan', 'win')!.w).not.toBe(bankImage.width);
    expect(spriteEntry('ardan', 'win')!.adj).toEqual(adj);
  });

  it('une image déjà intégrée à la banque (plus ancienne) est ignorée', async () => {
    putSprite('bruno', 'win', bankImage);
    records.set('spr:bruno:win', { png: 'data:x', adj, at: BANK_UPDATED - 1 });
    expect(await loadWorkshopPreview()).toBe(0);
    expect(spriteEntry('bruno', 'win')!.w).toBe(bankImage.width);
  });

  it("un réglage de l'atelier s'applique à l'image de la banque, même chargée après", async () => {
    const stored = { adj: { s: 0.9, dx: -4, dy: 2 }, at: BANK_UPDATED + 5 };
    storage.set('ff-adjust-overrides', JSON.stringify({ ardan: { crouch: stored } }));
    await loadWorkshopPreview();
    putSprite('ardan', 'crouch', bankImage, { s: 1 });
    expect(spriteEntry('ardan', 'crouch')!.adj).toEqual(stored.adj);
  });

  it("un personnage créé dans l'atelier apparaît dans le jeu", async () => {
    storage.set(
      'ff-custom-chars',
      JSON.stringify([{ id: 'matheo', name: 'MATHEO', style: 'boxer', color: '#00ff00', size: 0.8 }]),
    );
    expect(await loadWorkshopPreview()).toBe(1);
    expect(characterById('matheo')).toMatchObject({ name: 'MATHEO', styleId: 'boxer', size: 0.8 });
  });
});
