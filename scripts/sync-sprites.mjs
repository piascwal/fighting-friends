/* Récupère les sprites des personnages dans la banque (dépôt sprite-bank) et les copie dans
   public/assets/characters/. Lancé avant chaque construction (npm run sprites, et dans la CI).

   sprites.json fixe la version : « v1 » = la plus récente des v1.x (les ajouts arrivent tout seuls),
   « v1.4 » = cette version exacte (pour figer le jeu). Le dossier copié n'est pas versionné ici. */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const TARGET = join(ROOT, 'public/assets/characters');
const config = JSON.parse(readFileSync(join(ROOT, 'sprites.json'), 'utf8'));

const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });

/** Le tag demandé : exact (v1.4) ou le plus récent d'une version majeure (v1). */
function resolveTag(wanted) {
  const tags = git('ls-remote', '--tags', '--refs', config.repo)
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
  git('clone', '--quiet', '--depth', '1', '--branch', tag, config.repo, work);
  const source = join(work, 'collections', config.collection);
  if (!existsSync(join(source, 'index.json')))
    throw new Error(`Collection « ${config.collection} » absente de ${tag}`);
  rmSync(TARGET, { recursive: true, force: true });
  cpSync(source, TARGET, { recursive: true });
  writeFileSync(join(TARGET, 'VERSION'), `${tag}\n`);
  const count = JSON.parse(readFileSync(join(TARGET, 'index.json'), 'utf8')).length;
  console.log(`Sprites : ${config.collection} ${tag} (${count} personnages) → public/assets/characters/`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
