/* Affichage des projectiles : sprite du personnage s'il en fournit un, sinon dessin selon l'élément. */
import { spriteEntry, type SpriteEntry } from '../assets/sprite-store';
import type { SpriteKey } from '../data/sprite-poses';
import type { ProjectileLook } from '../data/types';
import { GROUND_Y } from '../core/constants';
import { pick, rand } from '../core/math';
import { PET_SIZE, petScale } from './companion-draw';
import { drawProjectileShape } from './projectile-shapes';
import type { Projectile } from '../engine/projectiles';
import type { Fx } from './fx';

type Ctx = CanvasRenderingContext2D;

/** Image à afficher : en course au sol, les images de course en boucle ; sinon l'image principale. */
function spriteKeyOf(p: Projectile): SpriteKey | undefined {
  const { def } = p;
  const running = def.frames?.length && (!def.gravity || p.landed);
  return running ? def.frames![Math.floor(p.age / RUN_FRAME) % def.frames!.length] : def.sprite;
}

/** Image du projectile fournie par le personnage, s'il y en a une (sinon une autre de ses images). */
export function projectileSprite(p: Projectile): SpriteEntry | undefined {
  const id = p.owner.char.id;
  const keys = [spriteKeyOf(p), p.def.sprite, ...(p.def.frames ?? [])];
  for (const key of keys) {
    const entry = key && spriteEntry(id, key);
    if (entry) return entry;
  }
  return undefined;
}

/** Durée d'une image de course, en frames. */
const RUN_FRAME = 5;

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
  if (sprite && def.look === 'beam') {
    drawBeamSprite(ctx, p, sprite, w, h);
  } else if (sprite && def.look === 'companion') {
    // animal : posé sur le bas de sa zone (ses pattes touchent le sol), à sa taille habituelle
    const k = petScale(sprite, PET_SIZE * p.owner.bodyScale);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite.img, (-sprite.w * k) / 2, h / 2 - sprite.h * k, sprite.w * k, sprite.h * k);
  } else if (sprite) {
    // l'image couvre la zone de frappe : en hauteur pour les projectiles hauts (éclair, pic), en largeur sinon
    const k =
      (def.h > def.w * 2 ? h / sprite.h : (Math.max(w, h) * 1.6) / Math.max(sprite.w, sprite.h)) *
      sprite.adj.s *
      (def.drawScale ?? 1);
    const lift = def.ground && def.h <= def.w * 2 ? -h * 0.3 : 0;
    drawGlowing(
      ctx,
      sprite.img,
      def.look,
      (-sprite.w * k) / 2,
      (-sprite.h * k) / 2 + lift,
      sprite.w * k,
      sprite.h * k,
      def.opacity,
    );
  } else {
    drawProjectileShape(ctx, def.look, w, h, p.age);
  }
  ctx.restore();
}

/**
 * Rayon en image : il part des mains du lanceur et s'étire sur toute la longueur de sa zone de frappe
 * (l'image est étirée en longueur, pas en épaisseur). Il jaillit en quelques images, vibre, puis s'amincit.
 */
function drawBeamSprite(ctx: Ctx, p: Projectile, sprite: SpriteEntry, w: number, h: number): void {
  const life = p.def.life ?? 30;
  const grow = Math.min(1, (p.age + 1) / 4);
  const fade = Math.min(1, (life - p.age) / 6);
  // épaisseur : le cœur lumineux de l'image couvre la zone de frappe, avec un léger halo autour
  const thickness = h * 1.5 * fade * (p.age % 4 < 2 ? 1 : 0.92) * sprite.adj.s;
  const length = w * grow;
  ctx.imageSmoothingEnabled = false;
  drawGlowing(ctx, sprite.img, 'beam', -w / 2, -thickness / 2, length, thickness);
}

/**
 * Effets lumineux (rayon, éclair, projecteur, énergie) : une lumière laisse voir à travers elle. L'image est
 * dessinée en partie transparente, puis une seconde fois en mode additif pour l'éclat du cœur lumineux.
 * Les objets (palet, mine, animal…) restent opaques.
 */
const GLOW: Partial<Record<ProjectileLook, readonly [opacity: number, glow: number]>> = {
  beam: [0.62, 0.35],
  bolt: [0.7, 0.3],
  light: [0.72, 0.28],
  fire: [0.85, 0.2],
};

function drawGlowing(
  ctx: Ctx,
  img: CanvasImageSource,
  look: ProjectileLook,
  x: number,
  y: number,
  w: number,
  h: number,
  /** Opacité propre au projectile (ProjectileDef.opacity), à la place de celle de son genre. */
  opacity?: number,
): void {
  const glow = GLOW[look] ?? (opacity !== undefined ? ([opacity, 0] as const) : undefined);
  if (!glow) {
    ctx.drawImage(img, x, y, w, h);
    return;
  }
  const alpha = ctx.globalAlpha;
  ctx.globalAlpha = alpha * (opacity ?? glow[0]);
  ctx.drawImage(img, x, y, w, h);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha * glow[1];
  ctx.drawImage(img, x, y, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = alpha;
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
