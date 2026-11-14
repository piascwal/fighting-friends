/* La version du jeu ouvert, et la vérification qu'une plus récente n'a pas été publiée depuis. */

// constantes injectées à la construction ; hors construction (tests), valeurs par défaut
export const VERSION: string = typeof __VERSION__ === 'string' ? __VERSION__ : 'test';
export const COMMIT: string = typeof __COMMIT__ === 'string' ? __COMMIT__ : '';

/** Texte affiché : « v0.2.14 · a1b2c3d », ou « version de développement ». */
export function versionLabel(version = VERSION, commit = COMMIT): string {
  if (version === 'dev') return 'version de développement';
  return `v${version}${commit ? ` · ${commit}` : ''}`;
}

export type VersionState = 'up-to-date' | 'newer' | 'unknown';

/** Garde-fou : un numéro de version ne contient que ces caractères. */
const SAFE_VERSION = /^[0-9A-Za-z.-]{1,32}$/;

/**
 * Compare la version ouverte à celle qui est publiée (version.json, jamais pris en cache).
 * `unknown` si on ne peut pas savoir : développement, hors ligne, fichier absent ou illisible.
 */
export async function checkVersion(
  base: string,
  current = VERSION,
  fetcher: typeof fetch = fetch,
): Promise<{ state: VersionState; latest?: string }> {
  if (current === 'dev' || current === 'test') return { state: 'unknown' };
  try {
    const response = await fetcher(`${base}version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return { state: 'unknown' };
    const data = (await response.json()) as { version?: unknown };
    if (typeof data.version !== 'string' || !SAFE_VERSION.test(data.version)) return { state: 'unknown' };
    return data.version === current ? { state: 'up-to-date' } : { state: 'newer', latest: data.version };
  } catch {
    return { state: 'unknown' };
  }
}

/** Recharge le jeu en contournant le cache de la page : l'adresse change à chaque version. */
export function reloadToVersion(latest: string): void {
  location.replace(`${location.pathname}?v=${encodeURIComponent(latest)}${location.hash}`);
}
