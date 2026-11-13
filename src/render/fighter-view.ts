/* Affichage d'un combattant en combat : pantin ou sprites, ombre, images rémanentes. */
import { hasSprite, usesSprites } from '../assets/sprite-store';
import { GROUND_Y } from '../core/constants';
import { clamp } from '../core/math';
import { TRAIL_LIFE, type Fighter } from '../engine/fighter';
import { drawRig } from './rig';
import { drawSprite, type SpriteOptions } from './sprite-draw';

export function drawShadow(ctx: CanvasRenderingContext2D, f: Fighter): void {
  // l'ombre rétrécit quand le combattant s'élève
  const k = clamp(1 + f.y / 400, 0.4, 1);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(f.x, GROUND_Y + 2, 54 * k * f.bodyScale, 9 * k, 0, 0, 7);
  ctx.fill();
}

export function drawTrail(ctx: CanvasRenderingContext2D, f: Fighter): void {
  const sprites = usesSprites(f.char);
  for (const ghost of f.trail) {
    const alpha = (ghost.life / TRAIL_LIFE) * 0.45;
    const y = GROUND_Y + ghost.y;
    if (sprites) {
      const facing = ghost.facing * (ghost.pose.flip ? -1 : 1);
      drawSprite(ctx, f.char, ghost.spriteKey, ghost.x, y, facing, { alpha, flash: true });
    } else {
      drawRig(ctx, f.char.look, ghost.pose, ghost.x, y, ghost.facing, { silhouette: f.char.color, alpha });
    }
  }
}

/**
 * Un personnage en sprites n'a qu'une image par pose : on lui donne du mouvement
 * par de légers étirements, inclinaisons et décalages selon ce qu'il fait.
 */
function spriteMotion(f: Fighter): SpriteOptions & { dx: number; dy: number } {
  const m = { sx: 1, sy: 1, rot: 0, dx: 0, dy: 0 };
  switch (f.state) {
    case 'neutral':
      if (f.vx)
        m.dy = -Math.abs(Math.sin(f.walkPhase)) * 5; // rebond de la marche
      else m.sy = 1 + Math.sin(f.age * 0.09) * 0.012; // respiration
      break;
    case 'attack': {
      const move = f.move!;
      const strike = move.hits?.[0]?.t ?? move.proj?.t ?? 8;
      if (f.ft < strike) {
        // élan : le corps recule et se penche en arrière
        const k = f.ft / strike;
        m.dx = -10 * k;
        m.rot = -4 * k;
        m.sx = 1 - 0.03 * k;
      } else if (f.ft < strike + 7) {
        // frappe : le corps se jette en avant
        m.dx = 12;
        m.rot = 3;
        m.sx = 1.06;
        m.sy = 0.97;
      }
      break;
    }
    case 'hitstun':
      m.rot = f.spriteKey === 'hit' && !hasSprite(f.char.id, 'hit') ? -10 : -3;
      break;
    case 'air':
      m.sy = 1 + clamp(-f.vy * 0.005, -0.04, 0.07);
      m.sx = 2 - m.sy;
      break;
    case 'jumpsquat':
    case 'recover':
      m.sy = 0.86;
      m.sx = 1.08;
      break;
    case 'dash':
      m.rot = f.dashDir > 0 ? 8 : -6;
      break;
  }
  return m;
}

export function drawFighter(ctx: CanvasRenderingContext2D, f: Fighter): void {
  if (!f.visible) return;
  const shiver = f.shaking ? (f.age % 2 ? 3 : -3) : 0;
  const x = f.x + shiver;
  const y = GROUND_Y + f.y;
  const flash = f.flash > 2;
  if (!usesSprites(f.char)) {
    drawRig(ctx, f.char.look, f.pose, x, y, f.facing, { flash, time: f.age });
    return;
  }
  const { dx, dy, ...motion } = spriteMotion(f);
  const facing = f.facing * (f.pose.flip ? -1 : 1);
  drawSprite(ctx, f.char, f.spriteKey, x + dx * f.facing, y + dy, facing, { flash, ...motion });
}
