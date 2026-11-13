/* Écran « Personnages & sprites » : créer un personnage, voir les images manquantes, copier les prompts. */
import { playSfx } from '../audio/audio';
import { exportCharacterZip, saveCustomCharacters } from '../assets/character-files';
import { hasSprite, removeCharacterSprites, spriteCount } from '../assets/sprite-store';
import { pick } from '../core/math';
import { escapeHtml, slug } from '../core/text';
import { buildPrompt, spritePosesFor } from '../data/prompts';
import { addCharacter, characterById, removeCharacter, restyleCharacter, roster } from '../data/roster';
import { STYLE_LIST } from '../data/styles';
import type { Character, StyleId } from '../data/types';
import { STAGE_COUNT } from '../render/stages';
import { $, copyText, newCanvas, on, toast } from './dom';
import {
  POSE_MODAL_HTML,
  closePoseModal,
  drawPoseThumbnail,
  initPoseModal,
  openPoseModal,
} from './pose-modal';
import { showScreen } from './screens';

export const CHARACTERS_HTML = `
  <div class="screen panel" id="s-chars">
    <div class="bar"><button class="nav sm alt" id="chBack">◀ RETOUR</button><h2>PERSONNAGES &amp; SPRITES</h2></div>
    <div class="scroll">
      <div class="row"><select id="chSel"></select><button class="nav sm" id="chNewBtn">＋ NOUVEAU PERSONNAGE</button></div>
      <div class="row hidden" id="chNew">
        <input id="newName" maxlength="16" placeholder="Nom du personnage">
        <select id="newStyle"></select>
        <button class="nav sm" id="newOk">CRÉER</button>
      </div>
      <div class="row hidden" id="chEdit">
        <label>Style de combat <select id="edStyle"></select></label>
        <label>Couleur <input type="color" id="edCol"></label>
        <button class="nav sm alt" id="edDel">SUPPRIMER LE PERSONNAGE</button>
      </div>
      <div id="chInfo"></div>
      <div class="row">
        <button class="nav sm" id="chCopyAll">COPIER TOUS LES PROMPTS MANQUANTS</button>
        <button class="nav sm alt" id="chZip">EXPORTER .ZIP</button>
        <label class="chk"><input type="checkbox" id="chMiss"> Manquants seulement</label>
      </div>
      <details class="help"><summary>Comment ça marche ?</summary>
        <ol>
          <li>Prépare <b>une image de référence</b> de ton personnage (debout, en entier).</li>
          <li>Touche une pose ci-dessous, puis <b>COPIER LE PROMPT</b>. Colle-le dans ton IA d'images <b>avec l'image de référence en pièce jointe</b>.</li>
          <li>Récupère l'image générée (fond magenta <code>#FF00FF</code>) et fais <b>IMPORTER L'IMAGE</b> : le fond est retiré automatiquement et le sprite est utilisable tout de suite.</li>
          <li>Seule la pose <b>Garde (repos)</b> est obligatoire pour jouer : les poses manquantes réutilisent la pose la plus proche. Plus tu en ajoutes, plus le personnage est vivant.</li>
          <li><b>EXPORTER .ZIP</b> crée le dossier à déposer dans <code>public/assets/characters/</code> du projet pour que le personnage soit disponible pour tout le monde.</li>
        </ol>
        <p>Les images importées ici sont enregistrées uniquement sur cet appareil.</p>
      </details>
      <div id="chGrid"></div>
    </div>
    ${POSE_MODAL_HTML}
  </div>`;

const NEW_COLORS = ['#ff3d7f', '#3d9bff', '#7dff6a', '#ff9d2e', '#c56bff', '#2ee6c8'];

let selectedId: string | null = null;
let missingOnly = false;

const selected = (): Character => characterById(selectedId ?? '') ?? roster[0]!;

function fillStyleSelect(select: HTMLSelectElement, value?: StyleId): void {
  select.innerHTML = STYLE_LIST.map((s) => `<option value="${s.id}">${s.label} — ${s.hint}</option>`).join(
    '',
  );
  if (value) select.value = value;
}

function refresh(): void {
  const char = selected();
  selectedId = char.id;
  const count = (c: Character) => `${spriteCount(c.id)} sprite${spriteCount(c.id) > 1 ? 's' : ''}`;
  const select = $<HTMLSelectElement>('#chSel');
  select.innerHTML = roster
    .map((c) => `<option value="${c.id}">${escapeHtml(c.name)} (${count(c)})</option>`)
    .join('');
  select.value = char.id;

  // seuls les personnages créés sur cet appareil sont modifiables
  const editable = char.custom && !char.repo;
  $('#chEdit').classList.toggle('hidden', !editable);
  if (editable) {
    fillStyleSelect($<HTMLSelectElement>('#edStyle'), char.styleId);
    $<HTMLInputElement>('#edCol').value = char.color;
  }

  const poses = spritePosesFor(char);
  const provided = poses.filter((p) => hasSprite(char.id, p.key)).length;
  const display = hasSprite(char.id, 'idle')
    ? 'Ce personnage est affiché avec <b>tes images</b>.'
    : 'Sans image « Garde (repos) », ce personnage est affiché avec le <b>pantin provisoire</b>.';
  $('#chInfo').innerHTML =
    `<b style="color:${char.color}">${escapeHtml(char.name)}</b> — style ${char.style.label.toLowerCase()} — ` +
    `<b>${provided} / ${poses.length}</b> sprites. ${display}`;

  const grid = $('#chGrid');
  grid.innerHTML = '';
  for (const spec of poses) {
    const has = hasSprite(char.id, spec.key);
    if (missingOnly && has) continue;
    const card = document.createElement('button');
    card.className = `nav card ${has ? 'ok' : spec.req ? 'req' : 'miss'}`;
    const [canvas, ctx] = newCanvas(120);
    drawPoseThumbnail(ctx, 120, char, spec);
    card.appendChild(canvas);
    const badge = has ? '✓ OK' : spec.req ? 'OBLIGATOIRE' : 'MANQUANT';
    card.insertAdjacentHTML(
      'beforeend',
      `<span class="cl">${escapeHtml(spec.label)}</span><span class="badge">${badge}</span>`,
    );
    card.addEventListener('click', () => openPoseModal(char, spec.key, refresh));
    grid.appendChild(card);
  }
  if (!grid.children.length) grid.innerHTML = '<p class="done">Toutes les images sont là. Beau travail !</p>';
}

function createCharacter(): void {
  const field = $<HTMLInputElement>('#newName');
  const name = field.value.trim();
  if (!name) return toast('Donne un nom au personnage');
  // identifiant unique dérivé du nom
  const base = slug(name);
  let id = base;
  for (let n = 2; characterById(id); n++) id = `${base}-${n}`;
  const char = addCharacter({
    id,
    name: name.toUpperCase(),
    style: $<HTMLSelectElement>('#newStyle').value as StyleId,
    color: pick(NEW_COLORS),
    stage: Math.floor(Math.random() * STAGE_COUNT),
    custom: true,
  });
  saveCustomCharacters();
  selectedId = char.id;
  field.value = '';
  $('#chNew').classList.add('hidden');
  refresh();
  toast(`${char.name} créé ! Importe d'abord la pose « Garde (repos) ».`);
}

async function deleteCharacter(): Promise<void> {
  const char = selected();
  if (!confirm(`Supprimer ${char.name} et toutes ses images de cet appareil ?`)) return;
  await removeCharacterSprites(char.id);
  removeCharacter(char);
  saveCustomCharacters();
  selectedId = null;
  refresh();
}

function copyMissingPrompts(): void {
  const char = selected();
  const missing = spritePosesFor(char).filter((p) => !hasSprite(char.id, p.key));
  if (!missing.length) return toast('Aucune image manquante');
  const text = missing
    .map((p, i) => `### ${i + 1}. ${p.label}  →  fichier : ${p.key}.png\n${buildPrompt(char, p.key)}`)
    .join('\n\n');
  void copyText(text, `${missing.length} prompts copiés`);
}

export function openCharacters(): void {
  closePoseModal();
  refresh();
  showScreen('chars');
}

export function initCharacters(onBack: () => void): void {
  initPoseModal();
  const valueOf = (event: Event) => (event.target as HTMLInputElement | HTMLSelectElement).value;
  on('#chBack', () => {
    playSfx('back');
    onBack();
  });
  on('#chSel', (e) => ((selectedId = valueOf(e)), refresh()), 'change');
  on('#chNewBtn', () => {
    fillStyleSelect($<HTMLSelectElement>('#newStyle'));
    $('#chNew').classList.toggle('hidden');
    $('#newName').focus();
  });
  on('#newOk', createCharacter);
  on(
    '#edStyle',
    (e) => {
      restyleCharacter(selected(), valueOf(e) as StyleId);
      saveCustomCharacters();
      refresh();
    },
    'change',
  );
  on(
    '#edCol',
    (e) => {
      const char = selected();
      char.color = valueOf(e);
      restyleCharacter(char, char.styleId);
      saveCustomCharacters();
      refresh();
    },
    'change',
  );
  on('#edDel', () => void deleteCharacter());
  on('#chMiss', (e) => ((missingOnly = (e.target as HTMLInputElement).checked), refresh()), 'change');
  on('#chZip', () => {
    const char = selected();
    if (!spriteCount(char.id)) return toast('Aucune image à exporter pour ce personnage');
    exportCharacterZip(char);
  });
  on('#chCopyAll', copyMissingPrompts);
}
