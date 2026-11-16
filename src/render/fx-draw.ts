/* Dessin de chaque type de particule. */
import { GROUND_Y } from '../core/constants';
import { easeOut } from '../core/math';
import type { Particle } from './fx';

type Of<T extends Particle['type']> = Extract<Particle, { type: T }>;

/** Taille d'un pixel de la couche des effets, en pixels monde (voir fight-view.ts). */
const PX = 3;

/* Tramage : un pixel sur deux en damier. Remplit une zone « à moitié » sans transparence lisse,
   comme les halos des jeux en pixel art. Un motif par couleur, créé à la demande. */
const ditherCache = new Map<string, CanvasPattern>();
function dither(ctx: CanvasRenderingContext2D, color: string): CanvasPattern | string {
  let pattern = ditherCache.get(color);
  if (!pattern) {
    const tile = document.createElement('canvas');
    tile.width = tile.height = PX * 2;
    const t = tile.getContext('2d')!;
    t.fillStyle = color;
    t.fillRect(0, 0, PX, PX);
    t.fillRect(PX, PX, PX, PX);
    const made = ctx.createPattern(tile, 'repeat');
    if (!made) return color;
    pattern = made;
    ditherCache.set(color, pattern);
  }
  return pattern;
}

/**
 * Éclat d'impact : un halo tramé (on voit le personnage au travers), des rayons fins de longueurs
 * variées, et un petit cœur blanc qui ne dure que les toutes premières images.
 */
function drawBurst(ctx: CanvasRenderingContext2D, p: Of<'burst'>, k: number): void {
  const radius = p.size * (0.45 + 0.55 * easeOut(k * 1.6));
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.globalAlpha = Math.ceil((1 - k) * 3) / 3;
  if (k < 0.5) {
    ctx.fillStyle = dither(ctx, p.pal[1]);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.55, 0, 7);
    ctx.fill();
  }
  ctx.lineCap = 'square';
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const long = i % 3 === 0;
    const from = radius * (long ? 0.25 : 0.45);
    const to = radius * (long ? 1.1 : 0.75);
    ctx.strokeStyle = i % 2 ? p.pal[2] : p.pal[1];
    ctx.lineWidth = PX * (long ? 2 : 1);
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * from, Math.sin(angle) * from);
    ctx.lineTo(Math.cos(angle) * to, Math.sin(angle) * to);
    ctx.stroke();
  }
  if (k < 0.25) {
    ctx.fillStyle = p.pal[0];
    const core = radius * 0.16;
    ctx.fillRect(-core, -core, core * 2, core * 2);
  }
}

function drawBolt(ctx: CanvasRenderingContext2D, p: Of<'bolt'>): void {
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.strokeStyle = p.col;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-p.size / 2, 0);
  for (let i = 1; i <= 6; i++)
    ctx.lineTo(-p.size / 2 + (p.size * i) / 6, Math.sin(p.seed + i * 7.3 + p.t) * 12);
  ctx.stroke();
}

/** Entaille : un trait blanc fin bordé de sa couleur, sans remplissage. */
function drawCut(ctx: CanvasRenderingContext2D, p: Of<'cut'>, k: number): void {
  const length = p.size * easeOut(k * 2);
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.lineCap = 'square';
  ctx.strokeStyle = p.col;
  ctx.lineWidth = PX * 3;
  ctx.beginPath();
  ctx.moveTo(-length, 0);
  ctx.lineTo(length, 0);
  ctx.stroke();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = PX;
  ctx.stroke();
}

/** Traînée d'un coup, dessinée dans le repère du combattant, à l'emplacement de sa zone de frappe. */
function drawSwoosh(ctx: CanvasRenderingContext2D, p: Of<'swoosh'>, k: number): void {
  const f = p.fighter;
  const s = f.bodyScale;
  const [bx, by, bw, bh] = p.box;
  const x0 = bx * s;
  const y0 = by * s;
  const w = bw * s;
  const h = bh * s;
  const tip = x0 + w;
  const mid = y0 + h / 2;

  ctx.translate(f.x, GROUND_Y + f.y);
  ctx.scale(f.facing, 1);
  // traînée tramée, jamais pleine : le geste du sprite reste visible au travers
  ctx.globalAlpha = k < 0.5 ? 1 : 0.5;
  ctx.fillStyle = dither(ctx, k < 0.34 ? '#ffffff' : p.col);
  ctx.beginPath();
  switch (p.kind) {
    case 'thrust': // coup droit : fuseau horizontal
      ctx.moveTo(x0 - 20, mid);
      ctx.quadraticCurveTo(x0 + w * 0.5, mid - h * 0.55, tip + 6, mid);
      ctx.quadraticCurveTo(x0 + w * 0.5, mid + h * 0.55, x0 - 20, mid);
      break;
    case 'low': // balayage au ras du sol
      ctx.moveTo(x0 - 30, y0 + h);
      ctx.quadraticCurveTo(x0 + w * 0.5, y0 - h * 0.4, tip + 8, y0 + h * 0.8);
      ctx.quadraticCurveTo(x0 + w * 0.5, y0 + h * 0.5, x0 - 30, y0 + h);
      break;
    case 'up': // arc montant (uppercut)
      ctx.moveTo(x0 - 10, y0 + h);
      ctx.quadraticCurveTo(tip + 40, y0 + h * 0.6, x0 + w * 0.6, y0 - 10);
      ctx.quadraticCurveTo(tip - 6, y0 + h * 0.55, x0 - 10, y0 + h);
      break;
    case 'down': // arc descendant (marteau)
      ctx.moveTo(x0 - 10, y0);
      ctx.quadraticCurveTo(tip + 44, y0 + h * 0.3, x0 + w * 0.7, y0 + h);
      ctx.quadraticCurveTo(tip - 4, y0 + h * 0.4, x0 - 10, y0);
      break;
    case 'side': // croissant (coup de pied circulaire)
      ctx.moveTo(x0 - 40, y0 + h * 0.2);
      ctx.quadraticCurveTo(tip + 50, y0 - h * 0.2, tip, y0 + h * 0.9);
      ctx.quadraticCurveTo(tip - 10, y0 + h * 0.25, x0 - 40, y0 + h * 0.2);
      break;
  }
  ctx.fill();
}

export function drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  /** Avancement de 0 (naissance) à 1 (disparition). */
  const k = p.t / p.life;
  // l'opacité baisse par paliers (et non en douceur) : rendu plus rétro
  const fade = Math.ceil((1 - k) * 4) / 4;
  ctx.save();
  switch (p.type) {
    case 'burst':
      drawBurst(ctx, p, k);
      break;
    case 'ring':
      ctx.globalAlpha = fade;
      ctx.strokeStyle = p.col;
      ctx.lineWidth = PX * (fade > 0.5 ? 2 : 1);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * easeOut(k), 0, 7);
      ctx.stroke();
      break;
    case 'spark':
      ctx.globalAlpha = Math.min(1, fade * 2);
      ctx.strokeStyle = p.col;
      ctx.lineWidth = Math.max(PX, Math.round(p.size / PX) * PX);
      ctx.lineCap = 'square';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2);
      ctx.stroke();
      break;
    case 'smoke':
      // fumée tramée : grain de pixel art au lieu d'une transparence lisse
      ctx.globalAlpha = fade > 0.5 ? 1 : 0.6;
      ctx.fillStyle = dither(ctx, p.col);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.6 + k), 0, 7);
      ctx.fill();
      break;
    case 'rock':
      ctx.globalAlpha = Math.min(1, fade * 3);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot + p.t * 0.3);
      ctx.fillStyle = p.col;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      break;
    case 'bolt':
      ctx.globalAlpha = fade;
      drawBolt(ctx, p);
      break;
    case 'cut':
      ctx.globalAlpha = fade;
      drawCut(ctx, p, k);
      break;
    case 'swoosh':
      drawSwoosh(ctx, p, k);
      break;
  }
  ctx.restore();
}
