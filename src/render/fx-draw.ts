/* Dessin de chaque type de particule. */
import { rgba } from '../core/color';
import { GROUND_Y } from '../core/constants';
import { easeOut } from '../core/math';
import type { Particle } from './fx';

type Of<T extends Particle['type']> = Extract<Particle, { type: T }>;

/** Étoile d'impact à trois couches, du bord vers le cœur. */
function drawBurst(ctx: CanvasRenderingContext2D, p: Of<'burst'>, k: number): void {
  const radius = p.size * (0.4 + 0.6 * easeOut(k * 1.6));
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.globalAlpha = Math.min(1, (1 - k) * 1.6);
  [1, 0.72, 0.42].forEach((ratio, layer) => {
    const r = radius * ratio;
    ctx.fillStyle = p.pal[2 - layer]!;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      // pointes longues et courtes en alternance
      const reach = i % 2 ? r * 0.42 : r * (i % 4 === 0 ? 1 : 0.74);
      ctx.lineTo(Math.cos(angle) * reach, Math.sin(angle) * reach);
    }
    ctx.closePath();
    ctx.fill();
  });
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

/** Entaille : un fuseau coloré avec un cœur blanc. */
function drawCut(ctx: CanvasRenderingContext2D, p: Of<'cut'>, k: number): void {
  const fade = 1 - k;
  const length = p.size * easeOut(k * 2);
  const spindle = (len: number, thickness: number) => {
    ctx.beginPath();
    ctx.moveTo(-len, 0);
    ctx.quadraticCurveTo(0, -thickness, len, 0);
    ctx.quadraticCurveTo(0, thickness, -len, 0);
    ctx.fill();
  };
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.fillStyle = p.col;
  spindle(length, 12 * fade);
  ctx.fillStyle = '#fff';
  spindle(length * 0.9, 4 * fade);
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
  ctx.globalAlpha = (1 - k) * 0.85;
  const fill = ctx.createLinearGradient(x0 - 20, 0, tip, 0);
  fill.addColorStop(0, 'rgba(255,255,255,0)');
  fill.addColorStop(0.6, rgba(p.col, 0.55));
  fill.addColorStop(1, '#fff');
  ctx.fillStyle = fill;
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
      ctx.lineWidth = 7 * fade + 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * easeOut(k), 0, 7);
      ctx.stroke();
      break;
    case 'spark':
      ctx.globalAlpha = Math.min(1, fade * 2);
      ctx.strokeStyle = p.col;
      ctx.lineWidth = p.size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2);
      ctx.stroke();
      break;
    case 'smoke':
      ctx.globalAlpha = fade * 0.7;
      ctx.fillStyle = p.col;
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
