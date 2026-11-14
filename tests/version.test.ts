import { describe, expect, it } from 'vitest';
import { checkVersion, versionLabel } from '../src/core/version';

/** Faux réseau : renvoie le contenu donné pour version.json (ou une erreur). */
const fakeFetch = (body: unknown, ok = true) =>
  (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

describe('mise à jour du jeu', () => {
  it('détecte une version plus récente publiée', async () => {
    expect(await checkVersion('./', '0.2.10', fakeFetch({ version: '0.2.11' }))).toEqual({
      state: 'newer',
      latest: '0.2.11',
    });
  });

  it('ne propose rien quand la version publiée est celle ouverte', async () => {
    expect((await checkVersion('./', '0.2.10', fakeFetch({ version: '0.2.10' }))).state).toBe('up-to-date');
  });

  it('reste prudente quand elle ne peut pas savoir', async () => {
    const offline = (async () => {
      throw new Error('hors ligne');
    }) as unknown as typeof fetch;
    expect((await checkVersion('./', '0.2.10', offline)).state).toBe('unknown');
    expect((await checkVersion('./', '0.2.10', fakeFetch({}, false))).state).toBe('unknown');
    // contenu suspect : jamais injecté dans l'adresse de rechargement
    expect((await checkVersion('./', '0.2.10', fakeFetch({ version: '../../evil?' }))).state).toBe('unknown');
    // en développement, rien à vérifier
    expect((await checkVersion('./', 'dev', fakeFetch({ version: '0.2.11' }))).state).toBe('unknown');
  });

  it('affiche la version et le commit', () => {
    expect(versionLabel('0.2.14', 'a1b2c3d')).toBe('v0.2.14 · a1b2c3d');
    expect(versionLabel('dev', '')).toBe('version de développement');
  });
});
