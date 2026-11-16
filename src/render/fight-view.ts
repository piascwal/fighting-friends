/* Affichage d'un combat : traduit l'état de la simulation et ses événements en images.
   Tout ce qui est purement visuel (particules, secousses, bandeaux de texte) vit ici, pas dans le moteur. */
import { settings } from '../core/settings';
import { rgba } from '../core/color';
import { GROUND_Y, VIEW_H, VIEW_W } from '../core/constants';
import { rand } from '../core/math';
import { activeHits, hurtbox, type Rect } from '../engine/combat';
import type { BannerTone, FightEvent } from '../engine/events';
import { SUPER_FREEZE, type FightSim } from '../engine/fight';
import { drawFighter, drawShadow, drawTrail } from './fighter-view';
import { Fx } from './fx';
import { drawAnnouncement, type Banner } from './announce';
import { drawHud } from './hud';
import { PixelLayer, burstLines } from './motion';
import { drawSuperCutIn } from './super-cutin';
import { drawProjectile, emitProjectileTrail, projectileSprite } from './projectile-view';
import { drawStage, type Stage } from './stages';
import { BLUE, GOLD, RED, type Gradient } from './text';

type Ctx = CanvasRenderingContext2D;

const TONES: Record<BannerTone, Gradient> = { gold: GOLD, red: RED, blue: BLUE };
/** Taille d'un « pixel » des effets, en pixels monde : 3 donne un grain proche des sprites en pixel art. */
const PIXEL = 3;
/** Grain de l'interface (barres, textes) : plus fin que celui des effets, pour rester lisible. */
const HUD_PIXEL = 2;
/** Durée du fond de K.O., calée sur le ralenti du coup final. */
const KO_BACKDROP = 54;

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
  /** Couche de l'interface, à mi-résolution. */
  private readonly hud: CanvasRenderingContext2D;
  /** Couche des séquences de motion design (bandeau de super, fond du K.O.). */
  private readonly motion = new PixelLayer();
  /** Frames restantes du fond de K.O. */
  private koTime = 0;

  constructor(
    private readonly sim: FightSim,
    stage: Stage,
  ) {
    this.stage = stage;
    const layer = document.createElement('canvas');
    layer.width = VIEW_W / PIXEL;
    layer.height = VIEW_H / PIXEL;
    this.pixels = layer.getContext('2d')!;
    const hud = document.createElement('canvas');
    hud.width = VIEW_W / HUD_PIXEL;
    hud.height = VIEW_H / HUD_PIXEL;
    this.hud = hud.getContext('2d')!;
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
      case 'aura':
        for (let i = 0; i < event.count; i++) this.fx.aura(event.x, event.y, event.color);
        return;
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
        if (event.name === 'ko') this.koTime = KO_BACKDROP;
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
    if (this.koTime > 0) this.koTime--;
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
      // bonus temporaire actif : volutes rouges
      if (f.buffed && sim.tick % 3 === 0) fx.aura(f.x, GROUND_Y + f.y, '#ff3b1f');
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
    if (this.koTime > 0) this.drawKoBackdrop(ctx);
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

    if (sim.superFreeze > 0 && sim.superBy) {
      const by = sim.superBy;
      const elapsed = SUPER_FREEZE - sim.superFreeze;
      drawSuperCutIn(ctx, this.motion, by.char, by.facing, sim.superName, elapsed, SUPER_FREEZE);
    }
    this.drawInterface(ctx);
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

  /** Coup final : le décor s'efface derrière des rayons d'impact centrés sur le vaincu. */
  private drawKoBackdrop(ctx: Ctx): void {
    const { sim } = this;
    const loser = sim.fighters.find((f) => f.hp <= 0) ?? sim.fighters[1];
    const age = KO_BACKDROP - this.koTime;
    this.motion.draw(ctx, (g) => {
      g.fillStyle = age < 3 ? '#fff' : '#12060c';
      g.fillRect(-20, -20, VIEW_W + 40, VIEW_H + 40);
      const color = age % 8 < 4 ? '#ff2a2a' : loser.opp.char.color;
      burstLines(g, loser.x - sim.camX, GROUND_Y + loser.y - 110, age, color, 130);
    });
  }

  /**
   * Interface (barres, chrono, textes) : dessinée à mi-résolution puis agrandie sans lissage,
   * pour le même grain que les sprites, en restant lisible.
   */
  private drawInterface(ctx: Ctx): void {
    const { sim } = this;
    const ui = this.hud;
    ui.setTransform(1, 0, 0, 1, 0, 0);
    ui.clearRect(0, 0, ui.canvas.width, ui.canvas.height);
    ui.setTransform(1 / HUD_PIXEL, 0, 0, 1 / HUD_PIXEL, 0, 0);
    ui.imageSmoothingEnabled = false;
    if (sim.mode !== 'attract') drawHud(ui, sim, this.delayedHp);
    this.drawBanners(ui);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(ui.canvas, 0, 0, VIEW_W, VIEW_H);
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
    for (const b of this.banners) drawAnnouncement(ctx, b);
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
