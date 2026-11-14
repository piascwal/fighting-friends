/* Dessin des projectiles sans image fournie, selon leur apparence (`look`). Repère : projectile centré
   en (0, 0), tourné vers la droite ; w et h sont sa taille. Dessinés dans la couche pixelisée du combat. */
import type { ProjectileLook } from '../data/types';

type Ctx = CanvasRenderingContext2D;

function drawFireball(ctx: Ctx, w: number, h: number, pulse: number): void {
  ctx.fillStyle = '#ff5a1f';
  ctx.beginPath();
  ctx.moveTo(w * 0.5, 0);
  ctx.quadraticCurveTo(w * 0.3, -h * 0.62 * pulse, -w * 0.3, -h * 0.4);
  ctx.quadraticCurveTo(-w * 1.5, 0, -w * 0.3, h * 0.4);
  ctx.quadraticCurveTo(w * 0.3, h * 0.62 * pulse, w * 0.5, 0);
  ctx.fill();
  ctx.fillStyle = '#ffd23a';
  ctx.beginPath();
  ctx.ellipse(w * 0.05, 0, w * 0.4, h * 0.4 * pulse, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(w * 0.12, 0, w * 0.22, h * 0.22, 0, 0, 7);
  ctx.fill();
}

/** Vague de roche : des pointes de plus en plus hautes vers l'avant. */
function drawShockwave(ctx: Ctx, w: number, h: number, age: number): void {
  ctx.fillStyle = '#6a4a2e';
  ctx.strokeStyle = '#1c120a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-w * 0.9, h * 0.5);
  for (let i = 0; i < 6; i++) {
    const x = -w * 0.9 + (i + 0.5) * w * 0.3;
    const peak = h * (0.4 + (i / 5) * 0.9) * (0.8 + 0.3 * Math.sin(age * 0.9 + i * 2));
    ctx.lineTo(x - w * 0.08, h * 0.5 - peak);
    ctx.lineTo(x + w * 0.1, h * 0.5 - peak * 0.4);
  }
  ctx.lineTo(w * 0.9, h * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd98a';
  ctx.globalAlpha = 0.6;
  ctx.fillRect(-w * 0.9, h * 0.42, w * 1.8, 6);
}

/** Lame tournoyante : deux croissants opposés. */
function drawBlade(ctx: Ctx, w: number, h: number, age: number): void {
  ctx.rotate(age * 0.5);
  for (const color of ['#8a3bff', '#e9d5ff']) {
    ctx.rotate(Math.PI);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-w * 0.55, 0);
    ctx.quadraticCurveTo(0, -h * 0.9, w * 0.55, 0);
    ctx.quadraticCurveTo(0, -h * 0.3, -w * 0.55, 0);
    ctx.fill();
  }
}

/** Éclat de glace : losange allongé, reflet clair. */
function drawIceShard(ctx: Ctx, w: number, h: number): void {
  ctx.fillStyle = '#5ab8ff';
  ctx.beginPath();
  ctx.moveTo(w * 0.6, 0);
  ctx.lineTo(0, -h * 0.45);
  ctx.lineTo(-w * 0.6, 0);
  ctx.lineTo(0, h * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e6f7ff';
  ctx.beginPath();
  ctx.moveTo(w * 0.45, 0);
  ctx.lineTo(0, -h * 0.2);
  ctx.lineTo(-w * 0.2, 0);
  ctx.closePath();
  ctx.fill();
}

/** Pic de glace qui jaillit du sol : il pousse pendant les premières frames. */
function drawIceSpike(ctx: Ctx, w: number, h: number, age: number): void {
  const grow = Math.min(1, age / 4);
  const top = h / 2 - h * grow;
  ctx.fillStyle = '#5ab8ff';
  ctx.beginPath();
  ctx.moveTo(-w / 2, h / 2);
  ctx.lineTo(0, top);
  ctx.lineTo(w / 2, h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e6f7ff';
  ctx.beginPath();
  ctx.moveTo(-w * 0.1, h / 2);
  ctx.lineTo(0, top + h * 0.15);
  ctx.lineTo(w * 0.12, h / 2);
  ctx.closePath();
  ctx.fill();
}

/** Éclair vertical en zigzag, qui scintille. */
function drawBolt(ctx: Ctx, w: number, h: number, age: number): void {
  if (age % 4 === 3) return; // scintillement
  const steps = 7;
  for (const [color, width] of [
    ['#3b7bff', w * 0.45],
    ['#bff4ff', w * 0.18],
  ] as const) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    for (let i = 1; i <= steps; i++) {
      const x = i === steps ? 0 : Math.sin(i * 2.7 + age) * w * 0.35;
      ctx.lineTo(x, -h / 2 + (h * i) / steps);
    }
    ctx.stroke();
  }
}

/** Gourde qui tournoie. */
function drawBottle(ctx: Ctx, w: number, h: number, age: number): void {
  ctx.rotate(age * 0.35);
  ctx.fillStyle = '#b5652e';
  ctx.beginPath();
  ctx.ellipse(0, h * 0.1, w * 0.42, h * 0.38, 0, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#7a3f18';
  ctx.fillRect(-w * 0.12, -h * 0.5, w * 0.24, h * 0.3);
  ctx.fillStyle = '#f2d39b';
  ctx.fillRect(-w * 0.2, h * 0.02, w * 0.4, h * 0.12);
}

/** Onde de paume : arcs de souffle concentriques. */
function drawPalmWave(ctx: Ctx, w: number, h: number, age: number): void {
  for (let i = 0; i < 3; i++) {
    const k = (age * 0.15 + i / 3) % 1;
    ctx.strokeStyle = i % 2 ? '#ffffff' : '#c9b6ff';
    ctx.lineWidth = 4;
    ctx.globalAlpha = 1 - k;
    ctx.beginPath();
    ctx.ellipse(-w * 0.2 + k * w * 0.5, 0, w * 0.18, h * (0.25 + k * 0.25), 0, -1.2, 1.2);
    ctx.stroke();
  }
}

export function drawProjectileShape(ctx: Ctx, look: ProjectileLook, w: number, h: number, age: number): void {
  switch (look) {
    case 'fire':
      return drawFireball(ctx, w, h, 1 + Math.sin(age * 0.7) * 0.08);
    case 'wave':
      return drawShockwave(ctx, w, h, age);
    case 'blade':
      return drawBlade(ctx, w, h, age);
    case 'ice':
      return drawIceShard(ctx, w, h);
    case 'spike':
      return drawIceSpike(ctx, w, h, age);
    case 'bolt':
      return drawBolt(ctx, w, h, age);
    case 'bottle':
      return drawBottle(ctx, w, h, age);
    case 'palm':
      return drawPalmWave(ctx, w, h, age);
  }
}
