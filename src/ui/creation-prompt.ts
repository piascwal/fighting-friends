/* Panneau « Créer son apparence à partir d'une photo » de l'écran des sprites : un prompt à copier pour
   générer l'image de garde d'un nouveau personnage, avec une photo de la personne et l'image de garde
   d'un personnage existant comme modèle de direction artistique (sur fond magenta, comme les autres). */
import { spriteEntry } from '../assets/sprite-store';
import { escapeHtml } from '../core/text';
import { buildCreationPrompt } from '../data/prompts';
import { roster } from '../data/roster';
import type { Character } from '../data/types';
import { $, copyImage, copyText, on, shareOrDownloadImage, toast } from './dom';

export const CREATION_HTML = `
  <details class="help" id="crBox"><summary>Créer son apparence à partir d'une photo</summary>
    <p>Joins à ton IA d'images <b>1)</b> une photo de la personne (au moins son visage) et <b>2)</b> l'image de référence
    ci-dessous, puis colle le prompt. Importe le résultat dans la pose <b>Garde (repos)</b>.</p>
    <label>Tenue, corpulence, signes distinctifs (facultatif)
      <textarea id="crDesc" rows="2" placeholder="ex. sweat à capuche gris, jean, baskets noires, casque audio autour du cou, carrure de rugbyman"></textarea>
    </label>
    <div class="row">
      <label>Modèle de style <select id="crRef"></select></label>
      <button class="nav sm" id="crCopy">COPIER LE PROMPT</button>
    </div>
    <div class="row">
      <button class="nav sm" id="crImg">COPIER L'IMAGE DE RÉFÉRENCE</button>
      <button class="nav sm alt" id="crShare">PARTAGER / ENREGISTRER</button>
    </div>
  </details>`;

const DESC_KEY = (id: string) => `ff-char-desc:${id}`;
/** Côté de l'image de référence : le format carré des images générées. */
const REF_SIZE = 1024;

let current: Character | null = null;

function readDesc(id: string): string {
  try {
    return localStorage.getItem(DESC_KEY(id)) ?? '';
  } catch {
    return '';
  }
}

function saveDesc(id: string, text: string): void {
  try {
    localStorage.setItem(DESC_KEY(id), text);
  } catch {
    // stockage indisponible : la description vaut pour cette session
  }
}

/** Personnages dont l'image de garde peut servir de modèle (les autres que celui qu'on crée). */
const references = (char: Character) => roster.filter((c) => c !== char && spriteEntry(c.id, 'idle'));

/** Image de garde d'un personnage, posée sur fond magenta au format des images générées. */
function referenceImage(char: Character): HTMLCanvasElement | null {
  const entry = spriteEntry(char.id, 'idle');
  if (!entry) return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = REF_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ff00ff';
  ctx.fillRect(0, 0, REF_SIZE, REF_SIZE);
  const k = (REF_SIZE * 0.8) / entry.h;
  ctx.imageSmoothingEnabled = k < 1;
  ctx.drawImage(entry.img, (REF_SIZE - entry.w * k) / 2, REF_SIZE * 0.1, entry.w * k, entry.h * k);
  return canvas;
}

const selectedReference = (): Character | undefined =>
  roster.find((c) => c.id === $<HTMLSelectElement>('#crRef').value);

/** Met le panneau à jour pour le personnage affiché ; ouvert d'office s'il n'a pas encore d'image de garde. */
export function refreshCreation(char: Character): void {
  const changed = current !== char;
  current = char;
  const refs = references(char);
  const select = $<HTMLSelectElement>('#crRef');
  const previous = select.value;
  select.innerHTML = refs.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
  if (refs.some((c) => c.id === previous)) select.value = previous;
  if (changed) {
    $<HTMLTextAreaElement>('#crDesc').value = readDesc(char.id);
    $<HTMLDetailsElement>('#crBox').open = !spriteEntry(char.id, 'idle');
  }
}

export function initCreation(): void {
  on('#crDesc', (e) => current && saveDesc(current.id, (e.target as HTMLTextAreaElement).value), 'input');
  on('#crCopy', () => {
    const ref = selectedReference();
    if (!current) return;
    if (!ref) return toast("Aucun personnage n'a encore d'image de garde à prendre comme modèle");
    const prompt = buildCreationPrompt(current, $<HTMLTextAreaElement>('#crDesc').value, ref.name);
    void copyText(prompt, 'Prompt de création copié');
  });
  on('#crImg', async () => {
    const ref = selectedReference();
    const image = ref && referenceImage(ref);
    if (!image) return toast('Choisis un modèle de style');
    if (await copyImage(image)) toast(`Image de ${ref.name} copiée`);
    else toast("Copie d'image impossible ici : utilise PARTAGER / ENREGISTRER");
  });
  on('#crShare', () => {
    const ref = selectedReference();
    const image = ref && referenceImage(ref);
    if (image) void shareOrDownloadImage(image, `reference-${ref.id}.png`);
  });
}
