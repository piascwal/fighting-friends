/* Récupère les sprites des personnages dans la banque (dépôt sprite-bank) et les copie dans
   public/assets/characters/. Lancé avant chaque construction (npm run sprites, et dans la CI).

   sprites.json fixe la version : « v2 » = la plus récente des v2.x (les ajouts arrivent tout seuls),
   « v2.4 » = cette version exacte (pour figer le jeu). La copie elle-même est faite par le script de la
   banque (scripts/copy-for-game.mjs) : il ne copie que les images que ce jeu demande (games/<jeu>.json).
   Le dossier copié n'est pas versionné ici. */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const TARGET = join(ROOT, 'public/assets/characters');
const config = JSON.parse(readFileSync(join(ROOT, 'sprites.json'), 'utf8'));

const run = (command, ...args) =>
  execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });

/** Le tag demandé : exact (v2.4) ou le plus récent d'une version majeure (v2). */
function resolveTag(wanted) {
  const tags = run('git', 'ls-remote', '--tags', '--refs', config.repo)
    .split('\n')
    .map((line) => line.split('refs/tags/')[1])
    .filter(Boolean);
  if (tags.includes(wanted) && wanted.includes('.')) return wanted;
  const minors = tags
    .map((tag) => tag.match(new RegExp(`^${wanted.replace('.', '\\.')}\\.(\\d+)$`)))
    .filter(Boolean)
    .map((m) => Number(m[1]));
  if (!minors.length) throw new Error(`Aucune version ${wanted} dans ${config.repo}`);
  return `${wanted}.${Math.max(...minors)}`;
}

const tag = resolveTag(config.version);
const work = mkdtempSync(join(tmpdir(), 'sprite-bank-'));
try {
  run('git', 'clone', '--quiet', '--depth', '1', '--branch', tag, config.repo, work);
  const report = run('node', join(work, 'scripts/copy-for-game.mjs'), config.game, TARGET);
  writeFileSync(join(TARGET, 'VERSION'), `${tag}\n`);
  console.log(`Sprites ${tag} → public/assets/characters/ : ${report.trim()}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
