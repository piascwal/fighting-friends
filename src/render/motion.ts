/* Boîte à outils de motion design, dans la direction artistique du jeu : aplats, bandes franches,
   trames et angles vifs, le tout rendu à mi-résolution pour le grain « pixel art ».
   Rien ici ne dépend d'un personnage précis : tout se construit à partir de sa couleur, de son nom
   et de ses images. Un nouveau personnage a donc automatiquement toutes les séquences. */
import { shade } from '../core/color';
import { VIEW_H, VIEW_W } from '../core/constants';
import { clamp, easeOut } from '../core/math';
import { arcadeText, arcadeTextWidth, bands, type ArcadeTextOptions } from './text';

type Ctx = CanvasRenderingContext2D;

/** Taille d'un pixel des éléments graphiques, en pixels monde. */
export const GRAIN = 2;

/** Valeur pseudo-aléatoire stable (0..1) pour un indice : les animations sont identiques d'une image à l'autre. */
export const noise = (n: number): number => {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};

/**
 * Couche à mi-résolution : on y dessine comme sur l'écran, puis elle est agrandie sans lissage.
 * Les sprites, déjà en pixel art, se dessinent directement sur l'écran, pas ici.
 */
export class PixelLayer {
  private readonly layer: Ctx;

  constructor() {
    const canvas = document.createElement('canvas');
    canvas.width = VIEW_W / GRAIN;
    canvas.height = VIEW_H / GRAIN;
    this.layer = canvas.getContext('2d')!;
  }

  /** Dessine `content` sur la couche vidée, puis la reporte sur `target`. */
  draw(target: Ctx, content: (ctx: Ctx) => void): void {
    const ctx = this.layer;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.setTransform(1 / GRAIN, 0, 0, 1 / GRAIN, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    content(ctx);
    ctx.restore();
    target.save();
    target.imageSmoothingEnabled = false;
    target.drawImage(ctx.canvas, 0, 0, VIEW_W, VIEW_H);
    target.restore();
  }
}

/** Palette d'un personnage : quatre tons de sa couleur, du plus clair au plus sombre. */
export const tones = (color: string): string[] => [
  shade(color, 0.35),
  color,
  shade(color, -0.3),
  shade(color, -0.55),
];

/** Parallélogramme penché (le haut décalé de `slant` vers la droite). */
export function slantPath(ctx: Ctx, x: number, y: number, w: number, h: number, slant: number): void {
  ctx.beginPath();
  ctx.moveTo(x + slant, y);
  ctx.lineTo(x + w + slant, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
}

/** Traits de vitesse horizontaux qui filent dans le sens `dir`, dans la zone donnée. */
export function speedLines(
  ctx: Ctx,
  t: number,
  dir: number,
  color: string,
  zone: { x: number; y: number; w: number; h: number },
  count = 22,
): void {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const length = 60 + noise(i) * 260;
    const speed = 22 + noise(i + 0.3) * 34;
    const span = zone.w + length * 2;
    const offset = (noise(i + 0.6) * span + t * speed) % span;
    const x = dir > 0 ? zone.x - length + offset : zone.x + zone.w + length - offset - length;
    const y = zone.y + Math.floor((noise(i + 0.9) * zone.h) / GRAIN) * GRAIN;
    ctx.fillRect(x, y, length, GRAIN * (1 + Math.floor(noise(i + 0.1) * 3)));
  }
}

/** Trame de carrés qui grossissent de gauche à droite (ou l'inverse) : le dégradé des comics. */
export function halftone(
  ctx: Ctx,
  zone: { x: number; y: number; w: number; h: number },
  color: string,
  dir = 1,
  cell = 16,
): void {
  ctx.fillStyle = color;
  for (let gx = 0; gx * cell < zone.w; gx++) {
    const k = (gx * cell) / zone.w;
    const size = Math.round((cell * (dir > 0 ? k : 1 - k) * 0.9) / GRAIN) * GRAIN;
    if (size <= 0) continue;
    for (let gy = 0; gy * cell < zone.h; gy++) {
      const shift = gx % 2 ? cell / 2 : 0;
      ctx.fillRect(
        zone.x + gx * cell + (cell - size) / 2,
        zone.y + gy * cell + shift + (cell - size) / 2,
        size,
        size,
      );
    }
  }
}

/** Rayons d'impact autour d'un point : pointes de longueurs inégales, qui tournent par à-coups. */
export function burstLines(ctx: Ctx, cx: number, cy: number, t: number, color: string, inner = 90): void {
  const count = 28;
  const step = Math.floor(t / 4);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const angle = ((i + noise(i + step) * 0.6) / count) * Math.PI * 2;
    const from = inner * (0.8 + noise(i * 3 + step) * 0.7);
    const width = 0.02 + noise(i * 7) * 0.05;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * from, Math.sin(angle) * from);
    ctx.lineTo(Math.cos(angle - width) * 1200, Math.sin(angle - width) * 1200);
    ctx.lineTo(Math.cos(angle + width) * 1200, Math.sin(angle + width) * 1200);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Volets penchés : `k` de 0 (écran visible) à 1 (écran couvert). Sert aux transitions d'entrée et de sortie.
 */
export function blinds(ctx: Ctx, k: number, color = '#000'): void {
  if (k <= 0) return;
  const count = 8;
  const width = (VIEW_W + 200) / count;
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    // les volets se ferment en cascade, de gauche à droite
    const local = clamp(k * 1.6 - (i / count) * 0.6, 0, 1);
    if (local <= 0) continue;
    slantPath(ctx, -160 + i * width, -10, width * easeOut(local) + 1, VIEW_H + 20, 120);
    ctx.fill();
  }
}

/** Panneau penché rempli des tons d'une couleur, en bandes franches. */
export function colorPanel(
  ctx: Ctx,
  color: string,
  x: number,
  y: number,
  w: number,
  h: number,
  slant: number,
): void {
  slantPath(ctx, x, y, w, h, slant);
  ctx.fillStyle = bands(ctx, y, y + h, tones(color));
  ctx.fill();
}

/**
 * Texte dont les lettres arrivent une à une en claquant (chacune part grande et se pose).
 * @param t frames écoulées depuis le début de l'effet
 */
export function slamLetters(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  size: number,
  t: number,
  opt: ArcadeTextOptions & { gap?: number } = {},
): void {
  const align = opt.align ?? 'center';
  const total = arcadeTextWidth(ctx, text, size);
  let cursor = align === 'left' ? x : align === 'right' ? x - total : x - total / 2;
  [...text].forEach((letter, i) => {
    const width = arcadeTextWidth(ctx, letter, size);
    const local = (t - i * (opt.gap ?? 2)) / 7;
    if (local > 0 && letter !== ' ') {
      const k = easeOut(local);
      arcadeText(ctx, letter, cursor + width / 2, y, size, {
        ...opt,
        align: 'center',
        scale: 2.6 - 1.6 * k,
        alpha: Math.min(1, local * 2),
      });
    }
    cursor += width;
  });
}

/** Texte qui claque d'un bloc, avec un double décalé rouge et bleu pendant l'impact. */
export function slamText(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  size: number,
  t: number,
  opt: ArcadeTextOptions = {},
): void {
  if (t < 0) return;
  const k = easeOut(t / 8);
  const scale = 3 - 2 * k;
  const split = Math.round((1 - k) * 14) + (t < 14 ? 3 : 0);
  if (split > 0) {
    arcadeText(ctx, text, x - split, y, size, { ...opt, scale, colors: ['#ff2a2a', '#ff2a2a', '#ff2a2a'] });
    arcadeText(ctx, text, x + split, y, size, { ...opt, scale, colors: ['#2ad4ff', '#2ad4ff', '#2ad4ff'] });
  }
  arcadeText(ctx, text, x, y, size, { ...opt, scale });
}
