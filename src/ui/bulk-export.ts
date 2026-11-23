/* Export en masse (écran « Personnages & sprites ») : la liste de tous les changements faits sur cet
   appareil, personnage par personnage, avec une case à cocher chacun (et « tout sélectionner ») ; la
   sélection part dans un seul .zip, un dossier par personnage, à déposer dans public/assets/characters/. */
import { characterZipFiles, downloadZip } from '../assets/character-files';
import {
  changesZipFiles,
  hasRepoLayer,
  pendingChanges,
  settingsChanges,
  type SettingsField,
} from '../assets/local-changes';
import { ensureSprites } from '../assets/repo-characters';
import { spriteCount } from '../assets/sprite-store';
import type { ZipFile } from '../assets/zip';
import { escapeHtml } from '../core/text';
import { characterById, roster } from '../data/roster';
import { SPRITE_BY_KEY, type SpriteKey } from '../data/sprite-poses';
import type { Character } from '../data/types';
import { $, $$, on, toast } from './dom';

export const BULK_HTML = `
  <div class="hidden" id="chBulk">
    <h3>EXPORT EN MASSE</h3>
    <p class="note">Coche ce que tu veux exporter : un seul .zip, avec un dossier par personnage, à déposer dans
      <code>public/assets/characters/</code>. Ce que tu ne coches pas reste sur cet appareil, marqué ✎ À ENVOYER.</p>
    <label class="chk bulkAll"><input type="checkbox" id="bulkAll"> <b>TOUT SÉLECTIONNER</b></label>
    <div id="bulkList"></div>
    <div class="row">
      <button class="nav sm" id="bulkGo">EXPORTER LA SÉLECTION</button>
      <button class="nav sm alt" id="bulkClose">FERMER</button>
    </div>
  </div>`;

const FIELD_LABEL: Record<SettingsField, string> = {
  style: 'style de combat',
  color: 'couleur',
  size: 'taille',
};

/** Personnage créé sur cet appareil (pas encore dans le jeu) : on exporte son dossier complet. */
const isNew = (c: Character): boolean => c.custom && !hasRepoLayer(c.id) && spriteCount(c.id) > 0;

/** Les personnages qui ont quelque chose à exporter. */
function candidates(): Character[] {
  return roster.filter((c) => isNew(c) || pendingChanges(c.id).length > 0 || settingsChanges(c).length > 0);
}

const item = (charId: string, attrs: string, label: string) =>
  `<label class="chk"><input type="checkbox" data-char="${charId}" ${attrs}> ${label}</label>`;

function groupHtml(char: Character): string {
  const id = escapeHtml(char.id);
  const name = `<b style="color:${char.color}">${escapeHtml(char.name)}</b>`;
  if (isNew(char)) {
    const n = spriteCount(char.id);
    return `<div class="bulkGroup">${item(id, 'data-full', `${name} — nouveau personnage (dossier complet, ${n} image${n > 1 ? 's' : ''})`)}</div>`;
  }
  const rows = pendingChanges(char.id).map((c) =>
    item(
      id,
      `data-key="${c.key}"`,
      `${escapeHtml(SPRITE_BY_KEY[c.key].label)} — ${c.kind === 'image' ? 'image remplacée ou ajoutée' : 'taille / position'}`,
    ),
  );
  const fields = settingsChanges(char);
  if (fields.length)
    rows.push(item(id, 'data-settings', `Réglages : ${fields.map((f) => FIELD_LABEL[f]).join(', ')}`));
  const head = `<label class="chk bulkHead"><input type="checkbox" data-head="${id}"> ${name} — ${rows.length} changement${rows.length > 1 ? 's' : ''}</label>`;
  return `<div class="bulkGroup">${head}<div class="bulkItems">${rows.join('')}</div></div>`;
}

/** Cases d'en-tête : cochées, décochées ou « à moitié » selon leurs lignes. */
function syncHeads(): void {
  const boxes = $$<HTMLInputElement>('#bulkList input[data-char]');
  for (const head of $$<HTMLInputElement>('#bulkList input[data-head]')) {
    const mine = boxes.filter((b) => b.dataset.char === head.dataset.head);
    head.checked = mine.every((b) => b.checked);
    head.indeterminate = !head.checked && mine.some((b) => b.checked);
  }
  const all = $<HTMLInputElement>('#bulkAll');
  all.checked = boxes.length > 0 && boxes.every((b) => b.checked);
  all.indeterminate = !all.checked && boxes.some((b) => b.checked);
}

function render(): void {
  const list = candidates();
  $('#bulkList').innerHTML = list.length
    ? list.map(groupHtml).join('')
    : '<p class="note">Aucun changement sur cet appareil : rien à exporter.</p>';
  for (const box of $$<HTMLInputElement>('#bulkList input')) box.checked = true;
  syncHeads();
}

function onToggle(event: Event): void {
  const box = event.target as HTMLInputElement;
  if (box.id === 'bulkAll') {
    for (const b of $$<HTMLInputElement>('#bulkList input')) b.checked = box.checked;
  } else if (box.dataset.head) {
    for (const b of $$<HTMLInputElement>(`#bulkList input[data-char="${box.dataset.head}"]`))
      b.checked = box.checked;
  }
  syncHeads();
}

/** Fichiers à exporter pour un personnage, selon ses cases cochées (aucun si rien n'est coché). */
async function filesFor(char: Character, boxes: HTMLInputElement[]): Promise<ZipFile[]> {
  const checked = boxes.filter((b) => b.checked);
  if (!checked.length) return [];
  await ensureSprites(char.id, 'all');
  if (checked.some((b) => b.dataset.full !== undefined)) return characterZipFiles(char);
  const keys = new Set(checked.flatMap((b) => (b.dataset.key ? [b.dataset.key as SpriteKey] : [])));
  return changesZipFiles(char, { keys, settings: checked.some((b) => b.dataset.settings !== undefined) });
}

async function exportSelection(): Promise<void> {
  const boxes = $$<HTMLInputElement>('#bulkList input[data-char]');
  const ids = [...new Set(boxes.map((b) => b.dataset.char!))];
  toast('Préparation du fichier…');
  const files: ZipFile[] = [];
  const added: string[] = [];
  for (const id of ids) {
    const char = characterById(id);
    if (!char) continue;
    const mine = await filesFor(
      char,
      boxes.filter((b) => b.dataset.char === id),
    );
    if (mine.length && isNew(char)) added.push(id);
    files.push(...mine);
  }
  if (!files.length) return toast('Rien de coché');
  if (added.length) {
    // rappel : un nouveau personnage doit aussi être ajouté à la liste du jeu
    const note = `Ajouter ces identifiants dans public/assets/characters/index.json :\n${added.map((id) => `"${id}"`).join(', ')}\n`;
    files.push({ name: 'A-AJOUTER-DANS-index.json.txt', data: new TextEncoder().encode(note) });
  }
  downloadZip(files, `fighting-friends-export-${new Date().toISOString().slice(0, 10)}.zip`);
}

export function openBulkExport(open: boolean): void {
  $('#s-chars').classList.toggle('bulk', open);
  $('#chBulk').classList.toggle('hidden', !open);
  if (open) render();
}

export function initBulkExport(closed: () => void): void {
  on('#bulkAll', onToggle, 'change');
  on('#bulkList', onToggle, 'change');
  on('#bulkGo', () => void exportSelection());
  on('#bulkClose', () => {
    openBulkExport(false);
    closed();
  });
}
