/* Affichage d'un combat : traduit l'état de la simulation et ses événements en images.
   Tout ce qui est purement visuel (particules, secousses, bandeaux de texte) vit ici, pas dans le moteur. */
import { settings } from '../core/settings';
import { rgba } from '../core/color';
import { GROUND_Y, VIEW_H, VIEW_W } from '../core/constants';
import { clamp, easeBack, easeOut, rand } from '../core/math';
import { activeHits, hurtbox, type Rect } from '../engine/combat';
import type { BannerTone, FightEvent } from '../engine/events';
import { SUPER_FREEZE, type FightSim } from '../engine/fight';
import { drawFighter, drawShadow, drawTrail } from './fighter-view';
import { Fx } from './fx';
import { drawHud } from './hud';
import { drawProjectile, emitProjectileTrail, projectileSprite } from './projectile-view';
import { drawStage, type Stage } from './stages';
import { BLUE, GOLD, RED, arcadeText, type Gradient } from './text';

type Ctx = CanvasRenderingContext2D;

interface Banner {
  text: string;
  age: number;
  duration: number;
  size: number;
  y: number;
  colors: Gradient;
}

const TONES: Record<BannerTone, Gradient> = { gold: GOLD, red: RED, blue: BLUE };
/** Taille d'un « pixel » des effets, en pixels monde : 3 donne un grain proche des sprites en pixel art. */
const PIXEL = 3;

export class FightView {
  readonly fx = new Fx();
  private readonly stage: Stage;
  private banners: Banner[] = [];
  private shake = 0;
  private flash = 0;
  /** Vie affichée « en retard » : laisse voir les dégâts qui viennent d'être infligés. */
  private delayedHp: [number, number];

  /** Couche basse résolution où se dessinent les effets : agrandie sans lissage, elle les pixelise. */
  private readonly pixels: CanvasRenderingContext2D;

  constructor(
    private readonly sim: FightSim,
    stage: Stage,
  ) {
    this.stage = stage;
    const layer = document.createElement('canvas');
    layer.width = VIEW_W / PIXEL;
    layer.height = VIEW_H / PIXEL;
    this.pixels = layer.getContext('2d')!;
    this.delayedHp = [sim.fighters[0].hp, sim.fighters[1].hp];
  }

  /** Réagit à un événement de la simulation. Les sons sont gérés par la scène. */
  handle(event: FightEvent): void {
    switch (event.type) {
      case 'dust':
        return this.fx.dust(event.x, event.y, event.dir, event.count);
      case 'impact':
        return this.fx.impact(event.x, event.y, event.fx, event.power, event.dir);
      case 'guard':
        return this.fx.guard(event.x, event.y);
      case 'swoosh':
        return this.fx.swoosh(event.fighter, event.box, event.kind, event.fighter.char.color);
      case 'confetti':
        return this.fx.confetti(event.x, event.y);
      case 'shake':
        this.shake = Math.max(this.shake, event.amount);
        return;
      case 'flash':
        this.flash = Math.max(this.flash, event.amount);
        return;
      case 'banner':
        this.banners.push({
          text: event.text,
          age: 0,
          duration: event.duration,
          size: event.size,
          y: event.y ?? 230,
          colors: TONES[event.tone ?? 'gold'],
        });
        return;
      case 'sfx':
        return;
    }
  }

  /** Fait vivre les effets d'une frame. */
  update(): void {
    const { sim, fx } = this;
    fx.update();
    this.banners = this.banners.filter((b) => ++b.age <= b.duration);
    this.shake = this.shake < 0.4 ? 0 : this.shake * 0.86;
    this.flash *= 0.82;
    sim.fighters.forEach((f, i) => {
      // pendant un combo la trace rouge reste, puis elle rattrape vite la vie réelle
      this.delayedHp[i]! += (f.hp - this.delayedHp[i]!) * (f.inHit ? 0.02 : 0.12);
      if (f.hp > this.delayedHp[i]!) this.delayedHp[i] = f.hp;
    });

    const frozen = sim.superFreeze > 0;
    if (frozen && sim.superBy && sim.tick % 2) fx.aura(sim.superBy.x, GROUND_Y, sim.superBy.char.color);
    if (frozen || sim.hitstop > 0) return;
    for (const f of sim.fighters) {
      if (f.meter >= 100 && sim.tick % 5 === 0) fx.aura(f.x, GROUND_Y + f.y, f.char.color);
    }
    if (sim.tick % 2 === 0) for (const p of sim.projectiles) emitProjectileTrail(fx, p);
  }

  render(ctx: Ctx): void {
    const { sim } = this;
    const [a, b] = sim.fighters;
    const shakeX = this.shake ? rand(-1, 1) * this.shake : 0;
    const shakeY = this.shake ? rand(-1, 1) * this.shake : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    drawStage(ctx, this.stage, sim.camX, sim.tick);
    ctx.translate(-sim.camX, 0);
    if (sim.superFreeze > 0) this.drawSuperBackdrop(ctx);
    drawShadow(ctx, a);
    drawShadow(ctx, b);
    drawTrail(ctx, a);
    drawTrail(ctx, b);
    // celui qui attaque passe devant
    const front = b.state === 'attack' && a.state !== 'attack' ? b : a;
    drawFighter(ctx, front.opp);
    drawFighter(ctx, front);
    // projectiles en image : déjà en pixel art, dessinés tels quels
    for (const p of sim.projectiles) if (projectileSprite(p)) drawProjectile(ctx, p);
    if (settings.hitboxes && sim.mode !== 'attract') this.drawBoxes(ctx);
    ctx.restore();
    this.drawPixelLayer(ctx, shakeX - sim.camX, shakeY);

    if (sim.mode !== 'attract') drawHud(ctx, sim, this.delayedHp);
    if (sim.superFreeze > 0 && sim.superBy) {
      const k = easeOut((SUPER_FREEZE - sim.superFreeze) / 8);
      const color = sim.superBy.char.color;
      arcadeText(ctx, sim.superName, VIEW_W / 2, 150, 68, {
        scale: 0.6 + 0.4 * k,
        colors: ['#fff', '#ffe27a', color],
      });
    }
    this.drawBanners(ctx);
    if (this.flash > 0.02) {
      ctx.fillStyle = `rgba(255,255,255,${this.flash})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  /** Effets et projectiles dessinés : rendus en basse résolution puis agrandis, pour un rendu pixel art. */
  private drawPixelLayer(ctx: Ctx, offsetX: number, offsetY: number): void {
    const px = this.pixels;
    px.setTransform(1, 0, 0, 1, 0, 0);
    px.clearRect(0, 0, px.canvas.width, px.canvas.height);
    px.setTransform(1 / PIXEL, 0, 0, 1 / PIXEL, offsetX / PIXEL, offsetY / PIXEL);
    for (const p of this.sim.projectiles) if (!projectileSprite(p)) drawProjectile(px, p);
    this.fx.draw(px);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(px.canvas, 0, 0, VIEW_W, VIEW_H);
    ctx.restore();
  }

  /** Pendant un super : l'écran s'assombrit et des traits fusent autour de l'attaquant. */
  private drawSuperBackdrop(ctx: Ctx): void {
    const { sim } = this;
    const by = sim.superBy!;
    const remaining = sim.superFreeze / SUPER_FREEZE;
    ctx.fillStyle = 'rgba(4,2,18,.72)';
    ctx.fillRect(sim.camX - 20, -20, VIEW_W + 40, VIEW_H + 40);
    ctx.save();
    ctx.translate(by.x, GROUND_Y - 110);
    ctx.strokeStyle = rgba(by.char.color, 0.7);
    ctx.lineWidth = 3;
    for (let i = 0; i < 40; i++) {
      const angle = i * 0.157 + sim.tick * 0.02;
      const from = 110 + ((i * 37 + sim.tick * 14) % 200);
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * from, Math.sin(angle) * from);
      ctx.lineTo(Math.cos(angle) * (from + 120), Math.sin(angle) * (from + 120));
      ctx.stroke();
    }
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 6 * remaining;
    ctx.beginPath();
    ctx.arc(0, 0, (1 - remaining) * 420, 0, 7);
    ctx.stroke();
    ctx.restore();
  }

  private drawBanners(ctx: Ctx): void {
    for (const b of this.banners) {
      const appear = easeBack(b.age / 9);
      const leave = clamp((b.duration - b.age) / 8, 0, 1);
      const scale = (0.3 + 0.7 * appear) * (1 + (1 - leave) * 0.5);
      arcadeText(ctx, b.text, VIEW_W / 2, b.y, b.size, { scale, alpha: leave, colors: b.colors });
    }
  }

  /** Option de mise au point : zones vulnérables en vert, zones de frappe en rouge. */
  private drawBoxes(ctx: Ctx): void {
    const box = (r: Rect, stroke: string, fill: string) => {
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
      ctx.strokeRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
    };
    ctx.lineWidth = 2;
    for (const f of this.sim.fighters) {
      const hurt = hurtbox(f);
      if (hurt) box(hurt, '#3f8', 'rgba(60,255,130,.15)');
      for (const h of activeHits(f)) box(h, '#f33', 'rgba(255,50,50,.3)');
    }
  }
}
