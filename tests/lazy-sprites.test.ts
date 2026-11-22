/* Chargement à la demande : chaque écran ne charge que les images dont il a besoin. */
import { describe, expect, it } from 'vitest';
import { keysForGroup } from '../src/assets/repo-characters';
import type { SpriteKey } from '../src/data/sprite-poses';
import { SPRITE_POSES } from '../src/data/sprite-poses';

const everything = new Set<SpriteKey>(SPRITE_POSES.map((s) => s.key));

describe("groupes d'images", () => {
  it('la sélection ne charge que le portrait', () => {
    expect(keysForGroup('portrait', everything)).toEqual(['portrait']);
  });

  it("sans portrait, la case est découpée dans la pose de repos : c'est elle qu'on charge", () => {
    const noPortrait = new Set<SpriteKey>(['idle', 'win']);
    expect(keysForGroup('portrait', noPortrait)).toEqual(['idle']);
  });

  it("l'aperçu et la rencontre chargent une poignée d'images, pas les ~30 du personnage", () => {
    const preview = keysForGroup('preview', everything);
    expect(preview).toEqual(expect.arrayContaining(['idle', 'portrait', 'win', 'intro']));
    expect(preview.length).toBeLessThanOrEqual(6);
    expect(keysForGroup('all', everything).length).toBe(everything.size);
  });

  it("l'animal de compagnie fait partie de l'aperçu, et seulement les images que le personnage a", () => {
    const withPet = new Set<SpriteKey>([...everything, 'pj_pet_idle', 'sp_win_pet']);
    const keys = keysForGroup('preview', withPet, { idle: 'pj_pet_idle', win: 'sp_win_pet' });
    expect(keys).toEqual(expect.arrayContaining(['pj_pet_idle', 'sp_win_pet']));
    expect(
      keysForGroup('preview', new Set<SpriteKey>(['idle']), { idle: 'pj_pet_idle', win: 'sp_win_pet' }),
    ).toEqual(['idle']);
  });
});
