/* Affichage des projectiles : sprite du personnage s'il en fournit un, sinon dessin selon l'élément. */
import { spriteEntry } from '../assets/sprite-store';
import { GROUND_Y } from '../core/constants';
import { pick, rand } from '../core/math';
import { drawProjectileShape } from './projectile-shapes';
import type { Projectile } from '../engine/projectiles';
import type { Fx } from './fx';

type Ctx = CanvasRenderingContext2D;

/** Image du projectile fournie par le personnage, s'il y en a une. */
export const projectileSprite = (p: Projectile) =>
  p.def.sprite ? spriteEntry(p.owner.char.id, p.def.sprite) : undefined;

/**
 * Dessine un projectile. Avec une image fournie : dessinée telle quelle (elle est déjà en pixel art) ;
 * sinon, sa forme vectorielle, destinée à la couche pixelisée.
 */
export function drawProjectile(ctx: Ctx, p: Projectile): void {
  const { def } = p;
  const s = p.owner.bodyScale;
  const w = def.w * s;
  const h = def.h * s;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.dir, 1);
  const sprite = projectileSprite(p);
  if (sprite) {
    // l'image couvre la zone de frappe : en hauteur pour les projectiles hauts (éclair, pic), en largeur sinon
    const k =
      (def.h > def.w * 2 ? h / sprite.h : (Math.max(w, h) * 1.6) / Math.max(sprite.w, sprite.h)) *
      sprite.adj.s;
    const lift = def.ground && def.h <= def.w * 2 ? -h * 0.3 : 0;
    ctx.drawImage(sprite.img, (-sprite.w * k) / 2, (-sprite.h * k) / 2 + lift, sprite.w * k, sprite.h * k);
  } else {
    drawProjectileShape(ctx, def.look, w, h, p.age);
  }
  ctx.restore();
}

/** Particules laissées dans le sillage d'un projectile. */
export function emitProjectileTrail(fx: Fx, p: Projectile): void {
  const { def } = p;
  // projectiles fixes : pas de traînée
  if (def.look === 'spike' || def.look === 'bolt' || def.look === 'mine' || def.look === 'beam') return;
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
      col: def.fx === 'ice' ? '#bfe9ff' : def.look === 'bottle' ? '#f2d39b' : '#8a3bff',
    });
  }
}
