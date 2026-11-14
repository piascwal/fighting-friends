import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

interface BuildInfo {
  version: string;
  commit: string;
}

/**
 * Numéro de version : « majeur.mineur » de package.json, puis le numéro d'exécution de la CI, qui augmente
 * à chaque déploiement (ex. 0.2.14). En construction locale : « 0.2.local ».
 */
function buildInfo(): BuildInfo {
  const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
    version: string;
  };
  const [major, minor] = pkg.version.split('.');
  const run = process.env.GITHUB_RUN_NUMBER ?? 'local';
  return { version: `${major}.${minor}.${run}`, commit: (process.env.GITHUB_SHA ?? '').slice(0, 7) };
}

/** Publie version.json à côté du jeu : le jeu ouvert le compare à sa propre version pour se mettre à jour. */
const versionFile = (info: BuildInfo): Plugin => ({
  name: 'ff-version',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify(info) });
  },
});

/** Tous les fichiers de public/ (icônes, personnages livrés…), en chemins relatifs. */
function publicFiles(dir = 'public', base = dir): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? publicFiles(path, base) : [relative(base, path)];
  });
}

/**
 * Le service worker, généré à chaque déploiement avec sa version et la liste complète des fichiers :
 * le navigateur voit un nouveau sw.js, l'installe, et il remplace l'ancien (voir scripts/sw-template.js).
 */
const serviceWorker = (info: BuildInfo): Plugin => ({
  name: 'ff-sw',
  apply: 'build',
  generateBundle(_options, bundle) {
    // le filet de sécurité doit toujours venir du réseau : il ne sert justement que si le cache est en cause
    const files = ['./', ...Object.keys(bundle), ...publicFiles().filter((f) => f !== 'rescue.js')].filter(
      (f) => !f.endsWith('.map'),
    );
    const template = readFileSync(new URL('./scripts/sw-template.js', import.meta.url), 'utf8');
    const source = template
      .replace('__VERSION__', JSON.stringify(info.version))
      .replace('__FILES__', JSON.stringify(files));
    this.emitFile({ type: 'asset', fileName: 'sw.js', source });
  },
});

// base relative : le jeu fonctionne aussi bien à la racine que sous /fighting-friends/ (GitHub Pages)
export default defineConfig(({ command }) => {
  const info = command === 'build' ? buildInfo() : { version: 'dev', commit: '' };
  return {
    base: './',
    build: { target: 'es2022', sourcemap: true },
    define: { __VERSION__: JSON.stringify(info.version), __COMMIT__: JSON.stringify(info.commit) },
    plugins: [versionFile(info), serviceWorker(info)],
    test: { environment: 'node', include: ['tests/**/*.test.ts'] },
  };
});
