/* Écran « Personnages & sprites » : créer un personnage, voir les images manquantes, copier les prompts. */
import { playSfx } from '../audio/audio';
import { exportCharacterZip, saveCharacterSettings, saveCustomCharacters } from '../assets/character-files';
import {
  exportChanges,
  hasRepoLayer,
  pendingChange,
  pendingChanges,
  settingsChanges,
} from '../assets/local-changes';
import { ensureSprites, isLoaded, spriteTotal } from '../assets/repo-characters';
import { hasSprite, removeCharacterSprites, spriteCount, spriteEntries } from '../assets/sprite-store';
import { lockLandscape, lockPortrait } from '../core/display';
import { pick } from '../core/math';
import { escapeHtml, slug } from '../core/text';
import { buildPrompt, spritePosesFor } from '../data/prompts';
import { SPRITE_BY_KEY, SPRITE_POSES, type SpritePoseSpec } from '../data/sprite-poses';
import {
  addCharacter,
  characterById,
  removeCharacter,
  restyleCharacter,
  roster,
  SIZES,
  styleUsers,
} from '../data/roster';
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
import { BULK_HTML, initBulkExport, openBulkExport } from './bulk-export';
import { CREATION_HTML, initCreation, refreshCreation } from './creation-prompt';
import { currentScreen, showScreen } from './screens';

const SIZE_OPTIONS = SIZES.map(
  (s) => `<option value="${s.value}"${s.value === 1 ? ' selected' : ''}>${s.label}</option>`,
).join('');

export const CHARACTERS_HTML = `
  <div class="screen panel" id="s-chars">
    <div class="bar"><button class="nav sm alt" id="chBack">◀ RETOUR</button><h2>PERSONNAGES &amp; SPRITES</h2></div>
    <div class="scroll">
      <div class="row" id="chTop"><select id="chSel"></select><button class="nav sm" id="chNewBtn">＋ NOUVEAU PERSONNAGE</button><button class="nav sm alt" id="chBulkBtn">EXPORT EN MASSE</button></div>
      ${BULK_HTML}
      <div class="hidden" id="chNew">
        <h3>NOUVEAU PERSONNAGE</h3>
        <div class="row">
          <label>Nom <input id="newName" maxlength="16" placeholder="Nom du personnage"></label>
          <label>Style de combat <select id="newStyle"></select></label>
          <label>Taille <select id="newSize">${SIZE_OPTIONS}</select></label>
        </div>
        <div class="row">
          <button class="nav sm" id="newOk">CRÉER</button>
          <button class="nav sm alt" id="newCancel">ANNULER</button>
        </div>
      </div>
      <div class="row" id="chEdit">
        <label>Style de combat <select id="edStyle"></select></label>
        <label>Taille <select id="edSize">${SIZE_OPTIONS}</select></label>
        <label>Couleur <input type="color" id="edCol"></label>
        <button class="nav sm alt" id="edDel">SUPPRIMER LE PERSONNAGE</button>
      </div>
      <div id="styleNote"></div>
      <div id="chInfo"></div>
      ${CREATION_HTML}
      <div class="row">
        <button class="nav sm" id="chCopyAll">COPIER TOUS LES PROMPTS MANQUANTS</button>
        <button class="nav sm hidden" id="chSend">EXPORTER LES CHANGEMENTS</button>
        <button class="nav sm alt" id="chZip">EXPORTER .ZIP</button>
        <label class="chk"><input type="checkbox" id="chMiss"> Manquants seulement</label>
      </div>
      <details class="help"><summary>Comment ça marche ?</summary>
        <ol>
          <li>Prépare <b>une image de référence</b> de ton personnage (debout, en entier).</li>
          <li>Touche une pose ci-dessous, puis <b>COPIER LE PROMPT</b>. Colle-le dans ton IA d'images <b>avec l'image de référence en pièce jointe</b>.</li>
          <li>Si l'IA ne trouve pas la bonne posture (pas assez accroupi, mauvaise jambe…), joins-lui aussi l'<b>image guide</b> : un mannequin gris dans la posture exacte (<b>COPIER L'IMAGE GUIDE</b> ou <b>PARTAGER / ENREGISTRER</b>).</li>
          <li>Récupère l'image générée (fond magenta <code>#FF00FF</code>) et fais <b>IMPORTER L'IMAGE</b> : le fond est retiré automatiquement et le sprite est utilisable tout de suite.</li>
          <li>Seule la pose <b>Garde (repos)</b> est obligatoire pour jouer : les poses manquantes réutilisent la pose la plus proche. Plus tu en ajoutes, plus le personnage est vivant.</li>
          <li><b>EXPORTER .ZIP</b> crée le dossier à déposer dans <code>public/assets/characters/</code> du projet pour que le personnage soit disponible pour tout le monde.</li>
          <li>Pour un personnage déjà livré avec le jeu, ce que tu changes ici (image remplacée ou ajoutée, taille/position modifiée) est marqué <b>✎ À ENVOYER</b>. <b>EXPORTER LES CHANGEMENTS</b> crée un petit .zip avec seulement ces images et la liste des changements, à envoyer pour qu'ils soient intégrés au jeu.</li>
          <li><b>EXPORT EN MASSE</b> liste tous les changements de tous les personnages (images, tailles, positions, style, couleur, nouveaux personnages) : coche ce que tu veux (ou <b>TOUT SÉLECTIONNER</b>) et tout part dans un seul .zip.</li>
        </ol>
        <p>Les images importées ici sont enregistrées uniquement sur cet appareil.</p>
      </details>
      <div id="chGrid"></div>
    </div>
    ${POSE_MODAL_HTML}
  </div>`;

const NEW_COLORS = ['#ff3d7f', '#3d9bff', '#7dff6a', '#ff9d2e', '#c56bff', '#2ee6c8'];

/** Dernier personnage travaillé : on y revient directement à la prochaine ouverture de l'écran. */
const SELECTED_KEY = 'ff-chars-selected';
let selectedId: string | null = readSelected();

function readSelected(): string | null {
  try {
    return localStorage.getItem(SELECTED_KEY);
  } catch {
    return null;
  }
}

function selectCharacter(id: string | null): void {
  selectedId = id;
  try {
    if (id) localStorage.setItem(SELECTED_KEY, id);
  } catch {
    // stockage indisponible : la sélection vaut pour cette session
  }
}
/** Où ramène le bouton Retour : les options par défaut, ou l'écran d'où l'on vient (raccourcis). */
let goBack: () => void = () => {};
let defaultBack: () => void = () => {};
let missingOnly = false;

const selected = (): Character => characterById(selectedId ?? '') ?? roster[0]!;

/**
 * Liste des styles : les styles libres d'abord, puis ceux déjà pris (avec le nom de qui les a),
 * pour que chaque personnage ait de préférence un style à lui.
 * @param owner personnage dont on choisit le style (son propre style compte comme libre pour lui)
 */
function fillStyleSelect(select: HTMLSelectElement, value?: StyleId, owner?: Character): void {
  const option = (s: (typeof STYLE_LIST)[number]) => {
    const users = styleUsers(s.id, owner).map((c) => c.name);
    const taken = users.length ? ` · pris par ${users.join(', ')}` : '';
    return `<option value="${s.id}">${escapeHtml(`${s.label} (${s.archetype}) — ${s.hint}${taken}`)}</option>`;
  };
  const free = STYLE_LIST.filter((s) => !styleUsers(s.id, owner).length);
  const taken = STYLE_LIST.filter((s) => styleUsers(s.id, owner).length);
  select.innerHTML =
    `<optgroup label="Styles libres">${free.map(option).join('')}</optgroup>` +
    (taken.length ? `<optgroup label="Déjà pris">${taken.map(option).join('')}</optgroup>` : '');
  // nouveau personnage : on propose d'emblée le premier style libre
  select.value = value ?? free[0]?.id ?? STYLE_LIST[0]!.id;
  if (value) select.value = value;
}

function refresh(): void {
  const char = selected();
  selectCharacter(char.id);
  const count = (c: Character) =>
    `${spriteTotal(c.id)} sprite${spriteTotal(c.id) > 1 ? 's' : ''}${pendingChanges(c.id).length || settingsChanges(c).length ? ' · ✎ à envoyer' : ''}`;
  const select = $<HTMLSelectElement>('#chSel');
  select.innerHTML = roster
    .map((c) => `<option value="${c.id}">${escapeHtml(c.name)} (${count(c)})</option>`)
    .join('');
  select.value = char.id;

  // style et couleur se changent pour tous ; seul un personnage créé sur cet appareil se supprime
  fillStyleSelect($<HTMLSelectElement>('#edStyle'), char.styleId, char);
  $('#styleNote').innerHTML = styleNote(char);
  $<HTMLInputElement>('#edCol').value = char.color;
  $<HTMLSelectElement>('#edSize').value = String(sizeChoice(char.size));
  $('#edDel').classList.toggle('hidden', !(char.custom && !char.repo));

  // les images du personnage affiché ne sont chargées qu'à ce moment-là (pas celles des autres)
  if (!isLoaded(char.id, 'all')) {
    $('#chInfo').textContent = 'Chargement des images…';
    $('#chGrid').innerHTML = '';
    void ensureSprites(char.id, 'all').then(() => {
      if (selected() === char && currentScreen() === 'chars') refresh();
    });
    return;
  }

  const poses = spritePosesFor(char);
  const provided = poses.filter((p) => hasSprite(char.id, p.key)).length;
  const display = hasSprite(char.id, 'idle')
    ? 'Ce personnage est affiché avec <b>tes images</b>.'
    : 'Sans image « Garde (repos) », ce personnage est affiché avec le <b>pantin provisoire</b>.';
  $('#chInfo').innerHTML =
    `<b style="color:${char.color}">${escapeHtml(char.name)}</b> — style ${char.style.label.toLowerCase()} — ` +
    `<b>${provided} / ${poses.length}</b> sprites. ${display}${changesHtml(char)}`;
  $('#chSend').classList.toggle('hidden', !hasRepoLayer(char.id));
  refreshCreation(char);

  const grid = $('#chGrid');
  grid.innerHTML = '';
  // la liste donne d'abord les poses communes, puis celles du style
  const shared = poses.slice(0, SPRITE_POSES.length);
  const own = poses.slice(SPRITE_POSES.length);
  addSection(grid, char, 'Poses communes à tous les styles', shared);
  addSection(grid, char, `Coups spéciaux du style ${char.style.label}`, own);
  // images d'autres styles : gardées si le personnage change de style, pour pouvoir y revenir
  const wanted = new Set(poses.map((p) => p.key));
  const kept = spriteEntries(char.id).filter(([key]) => !wanted.has(key));
  addSection(
    grid,
    char,
    'Images conservées des autres styles',
    kept.map(([key]) => SPRITE_BY_KEY[key]),
    'AUTRE STYLE',
  );
  if (!grid.querySelector('.card'))
    grid.innerHTML = '<p class="done">Toutes les images sont là. Beau travail !</p>';
}

/** Une section de la grille : un titre, puis une vignette par image. Rien si la section est vide. */
function addSection(
  grid: HTMLElement,
  char: Character,
  title: string,
  specs: SpritePoseSpec[],
  badge?: string,
): void {
  const shown = specs.filter((spec) => !(missingOnly && hasSprite(char.id, spec.key) && !badge));
  if (!shown.length) return;
  grid.insertAdjacentHTML('beforeend', `<h4 class="gridTitle">${escapeHtml(title)}</h4>`);
  for (const spec of shown) grid.appendChild(poseCard(char, spec, badge));
}

function poseCard(char: Character, spec: SpritePoseSpec, extraBadge?: string): HTMLButtonElement {
  const has = hasSprite(char.id, spec.key);
  const card = document.createElement('button');
  card.className = `nav card ${extraBadge ? 'other' : has ? 'ok' : spec.req ? 'req' : 'miss'}`;
  const [canvas, ctx] = newCanvas(120);
  drawPoseThumbnail(ctx, 120, char, spec);
  card.appendChild(canvas);
  const change = pendingChange(char.id, spec.key);
  if (change) card.classList.add('changed');
  const badge = change
    ? '✎ À ENVOYER'
    : (extraBadge ?? (has ? '✓ OK' : spec.req ? 'OBLIGATOIRE' : 'MANQUANT'));
  card.insertAdjacentHTML(
    'beforeend',
    `<span class="cl">${escapeHtml(spec.label)}</span><span class="badge">${badge}</span>`,
  );
  card.addEventListener('click', () => openPoseModal(char, spec.key, refresh));
  return card;
}

/** Liste des changements faits sur cet appareil à un personnage livré avec le jeu. */
function changesHtml(char: Character): string {
  if (!hasRepoLayer(char.id)) return '';
  const changes = pendingChanges(char.id);
  if (!changes.length) return '<div class="changes">Aucun changement par rapport à la version du jeu.</div>';
  const items = changes
    .map(
      (c) =>
        `<li>${escapeHtml(SPRITE_BY_KEY[c.key].label)} — ${c.kind === 'image' ? 'image remplacée' : 'taille / position'}</li>`,
    )
    .join('');
  return `<div class="changes"><b>✎ ${changes.length} changement${changes.length > 1 ? 's' : ''} à envoyer</b> (fais EXPORTER LES CHANGEMENTS) :<ul>${items}</ul></div>`;
}

/** Ce que permet le style choisi, et un avertissement s'il est déjà celui d'un autre personnage. */
function styleNote(char: Character): string {
  const { style } = char;
  const tags = style.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('');
  const others = styleUsers(char.styleId, char).map((c) => c.name);
  const warning = others.length
    ? `<div class="warn">⚠ Ce style est aussi celui de ${escapeHtml(others.join(', '))}. Un style libre rendra les combats plus variés.</div>`
    : '';
  const names = `${style.names.s1} · ${style.names.s2} · super ${style.names.super}`;
  return `<div class="styleInfo"><b>${escapeHtml(style.archetype)}</b> ${tags}<div class="moves">${escapeHtml(names)}</div>${warning}</div>`;
}

/** La taille proposée la plus proche (pour afficher une taille venue d'un fichier). */
const sizeChoice = (size: number): number =>
  SIZES.reduce((best, s) => (Math.abs(s.value - size) < Math.abs(best - size) ? s.value : best), 1 as number);

/**
 * Mode création : seul le formulaire du nouveau personnage reste affiché. Les réglages, la liste des
 * images et les boutons du personnage sélectionné sont masqués, pour ne pas les modifier par erreur.
 */
function setCreating(creating: boolean): void {
  $('#s-chars').classList.toggle('creating', creating);
  $('#chNew').classList.toggle('hidden', !creating);
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
    size: Number($<HTMLSelectElement>('#newSize').value),
    custom: true,
  });
  saveCustomCharacters();
  selectCharacter(char.id);
  field.value = '';
  setCreating(false);
  refresh();
  toast(`${char.name} créé ! Importe d'abord la pose « Garde (repos) ».`);
}

async function deleteCharacter(): Promise<void> {
  const char = selected();
  if (!confirm(`Supprimer ${char.name} et toutes ses images de cet appareil ?`)) return;
  await removeCharacterSprites(char.id);
  removeCharacter(char);
  saveCustomCharacters();
  selectCharacter(null);
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

/**
 * Ouvre l'écran des sprites. Le jeu passe alors à la verticale (si le téléphone le permet), pour passer
 * facilement du jeu au générateur d'images et inversement ; il repasse à l'horizontale en quittant l'écran.
 * @param back action du bouton Retour (par défaut : revenir aux options)
 */
export function openCharacters(back?: () => void): void {
  goBack = back ?? defaultBack;
  void lockPortrait(); // le jeu passe à la verticale ; en quittant, retour à l'horizontale
  closePoseModal();
  setCreating(false);
  openBulkExport(false);
  refresh();
  showScreen('chars');
}

export function initCharacters(onBack: () => void): void {
  defaultBack = onBack;
  initPoseModal();
  const valueOf = (event: Event) => (event.target as HTMLInputElement | HTMLSelectElement).value;
  on('#chBack', () => {
    playSfx('back');
    void lockLandscape();
    goBack();
  });
  on('#chSel', (e) => (selectCharacter(valueOf(e)), refresh()), 'change');
  on('#chNewBtn', () => {
    fillStyleSelect($<HTMLSelectElement>('#newStyle'));
    $<HTMLSelectElement>('#newSize').value = '1';
    setCreating(true);
    $('#newName').focus();
  });
  on('#newOk', createCharacter);
  on('#newCancel', () => {
    playSfx('back');
    setCreating(false);
  });
  initCreation();
  on(
    '#edStyle',
    (e) => {
      const char = selected();
      // les images déjà fournies sont conservées : celles du nouveau style apparaissent comme manquantes
      restyleCharacter(char, valueOf(e) as StyleId);
      saveCharacterSettings(char);
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
      saveCharacterSettings(char);
      refresh();
    },
    'change',
  );
  on(
    '#edSize',
    (e) => {
      const char = selected();
      char.size = Number(valueOf(e));
      saveCharacterSettings(char);
      refresh();
    },
    'change',
  );
  on('#edDel', () => void deleteCharacter());
  on('#chMiss', (e) => ((missingOnly = (e.target as HTMLInputElement).checked), refresh()), 'change');
  on('#chZip', async () => {
    const char = selected();
    if (!spriteCount(char.id)) return toast('Aucune image à exporter pour ce personnage');
    toast('Préparation du fichier…');
    await ensureSprites(char.id, 'all');
    await exportCharacterZip(char);
  });
  on('#chSend', async () => {
    const char = selected();
    if (!pendingChanges(char.id).length && !settingsChanges(char).length)
      return toast('Aucun changement à envoyer pour ce personnage');
    toast('Préparation du fichier…');
    await ensureSprites(char.id, 'all');
    await exportChanges(char);
  });
  on('#chCopyAll', copyMissingPrompts);
  on('#chBulkBtn', () => openBulkExport(true));
  initBulkExport(refresh);
}
