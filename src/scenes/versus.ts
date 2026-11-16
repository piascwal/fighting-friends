/* Animation de rencontre. Chaque camp arrive en trois temps : son panneau de couleur claque depuis le bord,
   sa silhouette noire glisse dessus, puis un flash la révèle. Les noms tombent lettre par lettre,
   « VS » s'écrase au centre, et des volets referment l'écran avant le combat.
   Tout vient de la couleur, du nom et des images du personnage : rien n'est propre à l'un d'eux. */
import { playSfx } from '../audio/audio';
import { shade } from '../core/color';
import { VIEW_H, VIEW_W } from '../core/constants';
import { easeOut, rand } from '../core/math';
import type { Character } from '../data/types';
import { drawCharacter, drawPortrait } from '../render/character-draw';
import {
  PixelLayer,
  blinds,
  burstLines,
  colorPanel,
  halftone,
  slamLetters,
  slamText,
  slantPath,
  speedLines,
  tones,
} from '../render/motion';
import { GREY, arcadeText, arcadeTextWidth } from '../render/text';
import type { Scene } from './scene';

type Ctx = CanvasRenderingContext2D;

/** Déroulé, en frames. Le camp droit suit le gauche avec SIDE_DELAY de retard. */
const SIDE_DELAY = 20;
const REVEAL = 24;
const NAME = 30;
const VS_FRAME = 74;
const FADE_FRAME = 190;
const END_FRAME = 206;
const CHAR_SCALE = 2.05;
/** Demi-décalage de la diagonale qui sépare l'écran en deux. */
const SLANT = 90;
const MID = VIEW_W / 2;

export class Versus implements Scene {
  private t = 0;
  private shake = 0;
  private flash = 0;
  private done = false;
  private readonly back = new PixelLayer();
  private readonly front = new PixelLayer();

  /** @param label texte en haut de l'écran (ex. « COMBAT 2 / 3 ») */
  constructor(
    private readonly left: Character,
    private readonly right: Character,
    private readonly label: string,
    private readonly onDone: () => void,
    /** Mode arcade : tous les adversaires à battre, et le numéro (à partir de 0) de celui-ci. */
    private readonly ladder?: { opponents: readonly Character[]; step: number },
  ) {}

  /** Échelle du mode arcade : les visages des adversaires, battus (barrés), en cours (encadré), à venir. */
  private drawLadder(ctx: Ctx): void {
    const { ladder } = this;
    const since = this.t - VS_FRAME - 12;
    if (!ladder || since < 0) return;
    const shown = ladder.opponents.slice(0, 10);
    const size = 44;
    const gap = 8;
    const left = MID - (shown.length * (size + gap) - gap) / 2;
    shown.forEach((char, i) => {
      if (since < i * 4) return;
      const x = left + i * (size + gap);
      const y = 70 - Math.max(0, 1 - (since - i * 4) / 5) * 30;
      const current = i === ladder.step;
      ctx.fillStyle = current && this.t % 16 < 8 ? '#ffd23a' : '#000';
      ctx.fillRect(x - 4, y - 4, size + 8, size + 8);
      ctx.save();
      ctx.translate(x, y);
      ctx.imageSmoothingEnabled = false;
      drawPortrait(ctx, char, size);
      if (i !== ladder.step) {
        ctx.fillStyle = i < ladder.step ? 'rgba(0,0,0,.6)' : 'rgba(0,0,0,.35)';
        ctx.fillRect(0, 0, size, size);
      }
      if (i < ladder.step) {
        // battu : barré de rouge
        ctx.strokeStyle = '#ff2a2a';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(4, size - 4);
        ctx.lineTo(size - 4, 4);
        ctx.stroke();
      }
      ctx.restore();
    });
  }

  skip(): void {
    if (this.t > VS_FRAME + 6 && this.t < FADE_FRAME - 10) this.t = FADE_FRAME - 10;
  }

  update(): void {
    const t = ++this.t;
    this.shake *= 0.82;
    this.flash *= 0.8;
    if (t === 4 || t === 4 + SIDE_DELAY) playSfx('whoosh');
    if (t === 4 + REVEAL || t === 4 + SIDE_DELAY + REVEAL) {
      this.shake = 10;
      playSfx('hitH');
    }
    if (t === VS_FRAME) {
      this.shake = 24;
      this.flash = 1;
      playSfx('vs');
    }
    if (t >= END_FRAME && !this.done) {
      this.done = true;
      this.onDone();
    }
  }

  /** Temps local d'un camp (le droit démarre plus tard). */
  private local(isLeft: boolean): number {
    return this.t - 4 - (isLeft ? 0 : SIDE_DELAY);
  }

  /** Contour de la moitié d'écran d'un camp, glissée depuis son bord pendant l'entrée. */
  private panelPath(ctx: Ctx, isLeft: boolean): void {
    const slide = (1 - easeOut(this.local(isLeft) / 10)) * 640;
    if (isLeft) slantPath(ctx, -400 - slide, -20, MID - SLANT + 400, VIEW_H + 40, SLANT * 2 + 14);
    else slantPath(ctx, MID - SLANT - 7 + slide, -20, 900, VIEW_H + 40, SLANT * 2 + 14);
  }

  private drawPanel(ctx: Ctx, char: Character, isLeft: boolean): void {
    const t = this.local(isLeft);
    if (t < 0) return;
    const dir = isLeft ? 1 : -1;
    const zone = { x: isLeft ? -20 : MID - SLANT, y: 0, w: MID + SLANT + 20, h: VIEW_H };
    ctx.save();
    this.panelPath(ctx, isLeft);
    ctx.clip();
    colorPanel(ctx, char.color, -500, -20, VIEW_W + 1000, VIEW_H + 40, 0);
    halftone(ctx, zone, shade(char.color, -0.7), -dir);
    speedLines(ctx, this.t, dir, tones(char.color)[0]!, zone, 16);
    speedLines(ctx, this.t + 40, dir, '#ffffff', zone, 6);
    ctx.restore();
  }

  private drawFighter(ctx: Ctx, char: Character, isLeft: boolean): void {
    const t = this.local(isLeft);
    if (t < 4) return;
    const facing = isLeft ? 1 : -1;
    const slide = easeOut((t - 4) / 16);
    const x = isLeft ? -340 + slide * 580 : VIEW_W + 340 - slide * 580;
    const pose = this.t > VS_FRAME ? 'idle' : 'intro';
    ctx.save();
    this.panelPath(ctx, isLeft);
    ctx.clip();
    // échos colorés : ils traînent derrière pendant la glissade, puis s'écartent à la révélation
    const spread = t < REVEAL ? (1 - slide) * 90 + 10 : (1 - easeOut((t - REVEAL) / 14)) * 70;
    const colors = tones(char.color);
    if (spread > 2) {
      for (let i = 3; i >= 1; i--) {
        drawCharacter(ctx, char, pose, x - facing * spread * i, 520, facing, CHAR_SCALE, 0, {
          silhouette: colors[i]!,
        });
      }
    }
    if (t < REVEAL) drawCharacter(ctx, char, pose, x, 520, facing, CHAR_SCALE, 0, { silhouette: '#000' });
    else drawCharacter(ctx, char, pose, x, 520, facing, CHAR_SCALE, this.t, { flash: t < REVEAL + 3 });
    ctx.restore();
  }

  private drawName(ctx: Ctx, char: Character, isLeft: boolean): void {
    const t = this.local(isLeft) - NAME;
    if (t < 0) return;
    const align = isLeft ? 'left' : 'right';
    const edge = isLeft ? 34 : VIEW_W - 34;
    const width = Math.max(arcadeTextWidth(ctx, char.name, 78), arcadeTextWidth(ctx, char.title, 24)) + 70;
    const bar = easeOut(t / 8) * width;
    // bandeau noir qui se déroule depuis le bord, souligné de la couleur du personnage
    slantPath(ctx, isLeft ? -20 : VIEW_W + 20 - bar, 424, bar, 78, 16);
    ctx.fillStyle = '#000';
    ctx.fill();
    slantPath(ctx, isLeft ? -20 : VIEW_W + 20 - bar, 502, bar * 0.8, 8, 2);
    ctx.fillStyle = char.color;
    ctx.fill();
    slamLetters(ctx, char.name, edge, 462, 78, t - 4, {
      align,
      colors: ['#fff', '#fff', shade(char.color, 0.5)],
    });
    if (t > 16) arcadeText(ctx, char.title, edge, 524, 24, { align, colors: GREY, alpha: t > 20 ? 1 : 0.5 });
  }

  render(ctx: Ctx): void {
    const { t } = this;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.save();
    ctx.translate(Math.round(rand(-1, 1) * this.shake), Math.round(rand(-1, 1) * this.shake));

    this.back.draw(ctx, (g) => {
      this.drawPanel(g, this.left, true);
      this.drawPanel(g, this.right, false);
      if (t >= VS_FRAME) burstLines(g, MID, VIEW_H / 2 - 10, t, t < VS_FRAME + 14 ? '#fff' : '#ffd23a', 150);
    });
    this.drawFighter(ctx, this.left, true);
    this.drawFighter(ctx, this.right, false);
    this.drawLadder(ctx);
    this.front.draw(ctx, (g) => {
      if (this.local(false) > 6) {
        // la cicatrice blanche entre les deux camps
        slantPath(g, MID - SLANT - 7, -20, 14, VIEW_H + 40, SLANT * 2 + 14);
        g.fillStyle = '#fff';
        g.fill();
      }
      this.drawName(g, this.left, true);
      this.drawName(g, this.right, false);
      slamText(g, 'VS', MID, VIEW_H / 2 - 20, 190, t - VS_FRAME, { colors: ['#fff', '#ffd23a', '#ff2a2a'] });
      if (this.label && t > VS_FRAME + 10) {
        slantPath(g, MID - 170, 18, 340, 46, 12);
        g.fillStyle = '#000';
        g.fill();
        arcadeText(g, this.label, MID, 42, 32);
      }
      blinds(g, (t - FADE_FRAME) / (END_FRAME - FADE_FRAME - 2));
    });
    ctx.restore();

    if (this.flash > 0.05) {
      // flash par paliers, sans fondu
      ctx.fillStyle = `rgba(255,255,255,${Math.ceil(this.flash * 4) / 4})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }
}
