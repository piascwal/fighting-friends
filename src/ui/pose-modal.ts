/* Fenêtre d'une pose : aperçu, prompt à copier, import de l'image générée, réglages de taille/position. */
import {
  importSpriteFile,
  removeSprite,
  resolveSprite,
  saveSpriteAdjust,
  spriteEntry,
} from '../assets/sprite-store';
import { POSES } from '../data/poses';
import { buildPrompt, buildStagePrompt, guidePose } from '../data/prompts';
import { SPRITE_BY_KEY, type SpriteKey, type SpritePoseSpec } from '../data/sprite-poses';
import type { Character } from '../data/types';
import { drawRig, drawRigPortrait } from '../render/rig';
import { drawSprite } from '../render/sprite-draw';
import { arcadeText } from '../render/text';
import { renderPoseGuide } from '../render/pose-guide';
import { $, copyImage, copyText, on, shareOrDownloadImage, toast } from './dom';

export const POSE_MODAL_HTML = `
  <div class="modal hidden" id="chModal"><div class="box">
    <div class="mhead"><h3 id="mTitle"></h3><button class="nav sm alt" id="mClose">✕</button></div>
    <div class="mbody">
      <div class="mleft">
        <canvas id="mPrev" width="320" height="300"></canvas>
        <div id="mStatus"></div>
        <div id="mAdj">
          <label>Taille <input type="range" id="adS" min="0.5" max="1.7" step="0.01"></label>
          <label>Décalage ↔ <input type="range" id="adX" min="-80" max="80" step="1"></label>
          <label>Décalage ↕ <input type="range" id="adY" min="-80" max="80" step="1"></label>
        </div>
      </div>
      <div class="mright">
        <div class="hidden" id="mStageBox">
          <div class="lbl">Décris ta scène : ce texte complète la fin du prompt (enregistré pour ce personnage).</div>
          <textarea id="mStageDesc" rows="3" placeholder="ex. un toit de Tokyo la nuit sous la pluie, néons roses et bleus, château d'eau au loin"></textarea>
        </div>
        <div class="lbl" id="mPromptLbl">1. Prompt à coller dans ton IA d'images, avec l'image de référence du personnage :</div>
        <textarea id="mPrompt" readonly></textarea>
        <div class="row"><button class="nav sm" id="mCopy">COPIER LE PROMPT</button></div>
        <div class="lbl" id="mGuideLbl">2. Si l'IA ne trouve pas la posture, joins-lui aussi l'image guide (mannequin gris) :</div>
        <div class="row" id="mGuideRow">
          <button class="nav sm" id="mGuideCopy">COPIER L'IMAGE GUIDE</button>
          <button class="nav sm alt" id="mGuideSave">PARTAGER / ENREGISTRER</button>
        </div>
        <div class="lbl">3. Récupère l'image générée :</div>
        <div class="row">
          <label class="nav sm filebtn">IMPORTER L'IMAGE<input type="file" id="mFile" accept="image/*"></label>
          <button class="nav sm alt" id="mDel">SUPPRIMER L'IMAGE</button>
        </div>
      </div>
    </div>
  </div></div>`;

type Ctx = CanvasRenderingContext2D;

/** Pose affichée, et son image guide (préparée à l'ouverture : elle sert à l'aperçu et à la copie). */
let open: { char: Character; key: SpriteKey; guide: HTMLCanvasElement | null } | null = null;
let onClose: () => void = () => {};

export const isPoseModalOpen = (): boolean => open !== null;

/* Description du décor, propre à chaque personnage, gardée sur l'appareil. */
const stageDescKey = (charId: string) => `ff-stage-desc:${charId}`;
function readStageDesc(charId: string): string {
  try {
    return localStorage.getItem(stageDescKey(charId)) ?? '';
  } catch {
    return '';
  }
}
function saveStageDesc(charId: string, text: string): void {
  try {
    localStorage.setItem(stageDescKey(charId), text);
  } catch {
    // stockage indisponible : le texte reste dans le prompt pour cette session
  }
}

/** Dessine une image entière dans un cadre, en gardant ses proportions. */
function drawFitted(
  ctx: Ctx,
  image: CanvasImageSource & { width: number; height: number },
  w: number,
  h: number,
  margin: number,
): void {
  const k = Math.min((w - margin * 2) / image.width, (h - margin * 2) / image.height);
  ctx.drawImage(
    image,
    (w - image.width * k) / 2,
    (h - image.height * k) / 2,
    image.width * k,
    image.height * k,
  );
}

/**
 * Vignette d'une pose : l'image fournie si elle existe, sinon la silhouette du pantin en guise de guide.
 * Sert à la grille des poses et à l'aperçu de la fenêtre.
 */
export function drawPoseThumbnail(ctx: Ctx, size: number, char: Character, spec: SpritePoseSpec): void {
  ctx.clearRect(0, 0, size, size);
  const entry = spriteEntry(char.id, spec.key);
  if (entry) {
    drawFitted(ctx, entry.img, size, size, 5);
  } else if (spec.stage) {
    arcadeText(ctx, 'DÉCOR', size / 2, size / 2, size * 0.2, {
      colors: ['#666', '#555', '#444'],
      stroke: '#222',
    });
  } else if (spec.proj) {
    arcadeText(ctx, '✦', size / 2, size / 2, size * 0.58, {
      colors: ['#666', '#555', '#444'],
      stroke: '#222',
    });
  } else if (spec.portrait) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.translate(size * 0.15, size * 0.15);
    drawRigPortrait(ctx, char.look, size * 0.7);
    ctx.restore();
  } else {
    const pose = POSES[guidePose(spec.key)];
    drawRig(ctx, char.look, pose, size / 2 - 4, size - 8, 1, {
      scale: size / 240 / char.look.h,
      silhouette: 'rgba(255,255,255,.22)',
    });
  }
}

function statusHtml(char: Character, spec: SpritePoseSpec): string {
  const entry = spriteEntry(char.id, spec.key);
  if (entry) {
    const origin = entry.src === 'repo' ? 'fournie avec le jeu' : 'importée sur cet appareil';
    return `<span class="okc">✓ Image ${origin}</span>`;
  }
  if (spec.stage)
    return '<span class="warn">Pas encore de décor : le jeu utilise un de ses décors dessinés</span>';
  const fallback = !spec.proj && !spec.portrait ? resolveSprite(char.id, spec.key) : null;
  if (fallback) {
    return `<span class="warn">Image manquante — le jeu utilise « ${SPRITE_BY_KEY[fallback.key].label} » à la place</span>`;
  }
  return `<span class="warn">Image manquante${spec.req ? ' (obligatoire)' : ''}</span>`;
}

function refresh(): void {
  if (!open) return;
  const { char, key } = open;
  const spec = SPRITE_BY_KEY[key];
  const entry = spriteEntry(char.id, key);
  $('#mTitle').textContent = spec.label;
  const stage = !!spec.stage;
  $('#mStageBox').classList.toggle('hidden', !stage);
  if (stage) $<HTMLTextAreaElement>('#mStageDesc').value = readStageDesc(char.id);
  $('#mPromptLbl').textContent = stage
    ? "1. Prompt à coller dans ton IA d'images (l'image de référence du personnage est facultative) :"
    : "1. Prompt à coller dans ton IA d'images, avec l'image de référence du personnage :";
  updatePrompt();
  $('#mGuideLbl').textContent = stage
    ? "2. Joins aussi l'image guide : elle montre le sol et la taille des combattants à respecter."
    : "2. Si l'IA ne trouve pas la posture, joins-lui aussi l'image guide (mannequin gris) :";
  $('#mStatus').innerHTML = statusHtml(char, spec);
  // les réglages n'ont de sens que pour une pose de combat déjà fournie
  $('#mAdj').classList.toggle('hidden', !entry || !!spec.portrait || stage);
  $('#mDel').classList.toggle('hidden', !entry || entry.src === 'repo');
  $('#mGuideLbl').classList.toggle('hidden', !open.guide);
  $('#mGuideRow').classList.toggle('hidden', !open.guide);
  if (entry) {
    $<HTMLInputElement>('#adS').value = String(entry.adj.s);
    $<HTMLInputElement>('#adX').value = String(entry.adj.dx);
    $<HTMLInputElement>('#adY').value = String(entry.adj.dy);
  }
}

function updatePrompt(): void {
  if (!open) return;
  const { char, key } = open;
  $<HTMLTextAreaElement>('#mPrompt').value = SPRITE_BY_KEY[key].stage
    ? buildStagePrompt(char, readStageDesc(char.id))
    : buildPrompt(char, key);
}

export function openPoseModal(char: Character, key: SpriteKey, closed: () => void): void {
  open = { char, key, guide: renderPoseGuide(key) };
  onClose = closed;
  refresh();
  $('#chModal').classList.remove('hidden');
}

export function closePoseModal(): void {
  if (!open) return;
  open = null;
  $('#chModal').classList.add('hidden');
  onClose();
}

/** Redessine l'aperçu (appelé à chaque image tant que la fenêtre est ouverte, pour suivre les curseurs). */
export function tickPoseModal(): void {
  if (!open) return;
  const { char, key } = open;
  const spec = SPRITE_BY_KEY[key];
  const canvas = $<HTMLCanvasElement>('#mPrev');
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas;
  // damier, pour bien voir les zones transparentes
  for (let x = 0; x < width; x += 20) {
    for (let y = 0; y < height; y += 20) {
      ctx.fillStyle = ((x + y) / 20) % 2 ? '#2a2440' : '#221c36';
      ctx.fillRect(x, y, 20, 20);
    }
  }
  const has = !!spriteEntry(char.id, key);
  if (!has && open.guide) {
    // pas encore d'image : on montre l'image guide, exactement celle qui sera copiée
    drawFitted(ctx, open.guide, width, height, 0);
    return;
  }
  if (spec.stage) {
    drawFitted(ctx, spriteEntry(char.id, key)!.img, width, height, 0);
    return;
  }
  if (spec.portrait || spec.proj) {
    ctx.save();
    ctx.translate((width - 240) / 2, (height - 240) / 2);
    drawPoseThumbnail(ctx, 240, char, spec);
    ctx.restore();
    return;
  }
  // ligne du sol, silhouette guide, puis le sprite par-dessus : pour comparer taille et position
  const ground = height - 34;
  const x = width / 2 - 20;
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(0, ground);
  ctx.lineTo(width, ground);
  ctx.stroke();
  ctx.setLineDash([]);
  // image importée : la silhouette guide derrière permet de régler taille et position
  drawRig(ctx, char.look, POSES[guidePose(key)], x, ground, 1, {
    scale: 1 / char.look.h,
    silhouette: 'rgba(255,255,255,.12)',
  });
  drawSprite(ctx, char, key, x, ground, 1);
}

async function importFile(event: Event): Promise<void> {
  const field = event.target as HTMLInputElement;
  const file = field.files?.[0];
  field.value = '';
  if (!file || !open) return;
  try {
    await importSpriteFile(open.char.id, open.key, file);
    toast('Image importée, fond magenta retiré');
    refresh();
  } catch {
    toast('Impossible de lire cette image');
  }
}

export function initPoseModal(): void {
  on('#mClose', closePoseModal);
  on('#chModal', (event) => {
    // un appui en dehors de la fenêtre la ferme
    if ((event.target as HTMLElement).id === 'chModal') closePoseModal();
  });
  on('#mCopy', () => void copyText($<HTMLTextAreaElement>('#mPrompt').value, 'Prompt copié !'));
  on(
    '#mStageDesc',
    (event) => {
      if (!open) return;
      saveStageDesc(open.char.id, (event.target as HTMLTextAreaElement).value);
      updatePrompt();
    },
    'input',
  );
  on('#mGuideCopy', async () => {
    if (!open?.guide) return;
    if (await copyImage(open.guide)) toast('Image guide copiée : colle-la dans ton IA avec le prompt');
    else toast("Copie d'image impossible ici : utilise PARTAGER / ENREGISTRER");
  });
  on('#mGuideSave', () => {
    if (!open?.guide) return;
    void shareOrDownloadImage(open.guide, `${open.char.id}-${open.key}-guide.png`);
  });
  on('#mFile', (event) => void importFile(event), 'change');
  on('#mDel', async () => {
    if (!open) return;
    await removeSprite(open.char.id, open.key);
    refresh();
  });
  for (const id of ['adS', 'adX', 'adY']) {
    // pendant le glissement : effet immédiat ; au relâchement : enregistrement
    on(
      `#${id}`,
      () => {
        const entry = open && spriteEntry(open.char.id, open.key);
        if (!entry) return;
        entry.adj.s = Number($<HTMLInputElement>('#adS').value);
        entry.adj.dx = Number($<HTMLInputElement>('#adX').value);
        entry.adj.dy = Number($<HTMLInputElement>('#adY').value);
      },
      'input',
    );
    on(
      `#${id}`,
      () => {
        const entry = open && spriteEntry(open.char.id, open.key);
        if (open && entry && entry.src !== 'repo') void saveSpriteAdjust(open.char.id, open.key);
      },
      'change',
    );
  }
}
