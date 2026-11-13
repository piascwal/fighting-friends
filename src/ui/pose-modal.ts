/* Fenêtre d'une pose : aperçu, prompt à copier, import de l'image générée, réglages de taille/position. */
import {
  importSpriteFile,
  removeSprite,
  resolveSprite,
  saveSpriteAdjust,
  spriteEntry,
} from '../assets/sprite-store';
import { POSES } from '../data/poses';
import { buildPrompt, guidePose } from '../data/prompts';
import { SPRITE_BY_KEY, type SpriteKey, type SpritePoseSpec } from '../data/sprite-poses';
import type { Character } from '../data/types';
import { drawRig, drawRigPortrait } from '../render/rig';
import { drawSprite } from '../render/sprite-draw';
import { arcadeText } from '../render/text';
import { $, copyText, on, toast } from './dom';

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
        <div class="lbl">Prompt à coller dans ton IA d'images (avec l'image de référence) :</div>
        <textarea id="mPrompt" readonly></textarea>
        <div class="row">
          <button class="nav sm" id="mCopy">COPIER LE PROMPT</button>
          <label class="nav sm filebtn">IMPORTER L'IMAGE<input type="file" id="mFile" accept="image/*"></label>
          <button class="nav sm alt" id="mDel">SUPPRIMER L'IMAGE</button>
        </div>
      </div>
    </div>
  </div></div>`;

type Ctx = CanvasRenderingContext2D;

let open: { char: Character; key: SpriteKey } | null = null;
let onClose: () => void = () => {};

export const isPoseModalOpen = (): boolean => open !== null;

/**
 * Vignette d'une pose : l'image fournie si elle existe, sinon la silhouette du pantin en guise de guide.
 * Sert à la grille des poses et à l'aperçu de la fenêtre.
 */
export function drawPoseThumbnail(ctx: Ctx, size: number, char: Character, spec: SpritePoseSpec): void {
  ctx.clearRect(0, 0, size, size);
  const entry = spriteEntry(char.id, spec.key);
  if (entry) {
    const k = Math.min((size - 10) / entry.w, (size - 10) / entry.h);
    ctx.drawImage(entry.img, (size - entry.w * k) / 2, (size - entry.h * k) / 2, entry.w * k, entry.h * k);
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
    const pose = POSES[guidePose(char, spec.key)];
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
  $<HTMLTextAreaElement>('#mPrompt').value = buildPrompt(char, key);
  $('#mStatus').innerHTML = statusHtml(char, spec);
  // les réglages n'ont de sens que pour une pose de combat déjà fournie
  $('#mAdj').classList.toggle('hidden', !entry || !!spec.portrait);
  $('#mDel').classList.toggle('hidden', !entry || entry.src === 'repo');
  if (entry) {
    $<HTMLInputElement>('#adS').value = String(entry.adj.s);
    $<HTMLInputElement>('#adX').value = String(entry.adj.dx);
    $<HTMLInputElement>('#adY').value = String(entry.adj.dy);
  }
}

export function openPoseModal(char: Character, key: SpriteKey, closed: () => void): void {
  open = { char, key };
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
  const has = !!spriteEntry(char.id, key);
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(0, ground);
  ctx.lineTo(width, ground);
  ctx.stroke();
  ctx.setLineDash([]);
  drawRig(ctx, char.look, POSES[guidePose(char, key)], x, ground, 1, {
    scale: 1 / char.look.h,
    silhouette: has ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.3)',
  });
  if (has) {
    drawSprite(ctx, char, key, x, ground, 1);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.font = '600 13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Guide de pose (silhouette)', width / 2, 18);
  }
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
