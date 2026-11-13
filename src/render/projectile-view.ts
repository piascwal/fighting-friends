/* Affichage des projectiles : sprite du personnage s'il en fournit un, sinon dessin selon l'élément. */
import { spriteEntry } from '../assets/sprite-store';
import { GROUND_Y } from '../core/constants';
import { pick, rand } from '../core/math';
import type { Projectile } from '../engine/projectiles';
import type { Fx } from './fx';

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

export function drawProjectile(ctx: Ctx, p: Projectile): void {
  const { def } = p;
  const s = p.owner.bodyScale;
  const w = def.w * s;
  const h = def.h * s;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.dir, 1);
  const sprite = spriteEntry(p.owner.char.id, 'projectile');
  if (sprite) {
    const k = ((h * 1.9) / sprite.h) * sprite.adj.s;
    const lift = def.ground ? -h * 0.3 : 0;
    ctx.drawImage(sprite.img, -sprite.w * k * 0.6, (-sprite.h * k) / 2 + lift, sprite.w * k, sprite.h * k);
  } else if (def.fx === 'fire') drawFireball(ctx, w, h, 1 + Math.sin(p.age * 0.7) * 0.08);
  else if (def.fx === 'earth') drawShockwave(ctx, w, h, p.age);
  else drawBlade(ctx, w, h, p.age);
  ctx.restore();
}

/** Particules laissées dans le sillage d'un projectile. */
export function emitProjectileTrail(fx: Fx, p: Projectile): void {
  const { def } = p;
  if (def.fx === 'fire') {
    fx.add({
      type: 'smoke',
      x: p.x - p.dir * 14 + rand(-8, 8),
      y: p.y + rand(-def.h * 0.3, def.h * 0.3),
      vx: -p.dir * rand(1, 3),
      vy: rand(-1, 1),
      life: rand(8, 16),
      size: def.h * rand(0.14, 0.3),
      col: pick(['#ffb02e', '#ff5a1f', '#ffe27a']),
    });
  } else if (def.fx === 'earth') {
    fx.add({
      type: 'rock',
      x: p.x + rand(-20, 20),
      y: GROUND_Y - 4,
      vx: rand(-3, 3),
      vy: rand(-9, -3),
      g: 0.7,
      life: rand(14, 24),
      size: rand(4, 9),
      col: pick(['#7a5a3a', '#9a7a52', '#c9a56a']),
      rot: rand(6),
    });
  } else {
    fx.add({
      type: 'smoke',
      x: p.x - p.dir * 10,
      y: p.y + rand(-8, 8),
      vx: -p.dir,
      vy: 0,
      life: 10,
      size: 7,
      col: '#8a3bff',
    });
  }
}
