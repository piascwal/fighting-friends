/* Animation de rencontre : les deux combattants entrent de chaque côté, « VS » claque au centre. */
import { playSfx } from '../audio/audio';
import { shade } from '../core/color';
import { VIEW_H, VIEW_W } from '../core/constants';
import { easeBack, easeOut, rand } from '../core/math';
import type { Character } from '../data/types';
import { drawCharacter } from '../render/character-draw';
import { GREY, arcadeText } from '../render/text';
import type { Scene } from './scene';

const VS_FRAME = 46;
const FADE_FRAME = 172;
const END_FRAME = 190;
const CHAR_SCALE = 2.05;
/** Décalage de la diagonale qui sépare l'écran en deux. */
const SLANT = 90;

export class Versus implements Scene {
  private t = 0;
  private shake = 0;
  private flash = 0;
  private done = false;

  /** @param label texte en haut de l'écran (ex. « COMBAT 2 / 3 ») */
  constructor(
    private readonly left: Character,
    private readonly right: Character,
    private readonly label: string,
    private readonly onDone: () => void,
  ) {}

  skip(): void {
    if (this.t > 50 && this.t < 150) this.t = 150;
  }

  update(): void {
    this.t++;
    this.shake *= 0.85;
    this.flash *= 0.85;
    if (this.t === 4) playSfx('special');
    if (this.t === VS_FRAME) {
      this.shake = 22;
      this.flash = 1;
      playSfx('vs');
    }
    if (this.t >= END_FRAME && !this.done) {
      this.done = true;
      this.onDone();
    }
  }

  private drawSide(ctx: CanvasRenderingContext2D, char: Character, isLeft: boolean): void {
    const { t } = this;
    const mid = VIEW_W / 2;
    const facing = isLeft ? 1 : -1;
    ctx.save();
    // moitié d'écran délimitée par la diagonale
    ctx.beginPath();
    if (isLeft) {
      ctx.moveTo(-40, -40);
      ctx.lineTo(mid + SLANT, -40);
      ctx.lineTo(mid - SLANT, VIEW_H + 40);
      ctx.lineTo(-40, VIEW_H + 40);
    } else {
      ctx.moveTo(mid + SLANT, -40);
      ctx.lineTo(VIEW_W + 40, -40);
      ctx.lineTo(VIEW_W + 40, VIEW_H + 40);
      ctx.lineTo(mid - SLANT, VIEW_H + 40);
    }
    ctx.clip();
    const bg = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    bg.addColorStop(0, shade(char.color, -0.2));
    bg.addColorStop(1, shade(char.color, -0.75));
    ctx.fillStyle = bg;
    ctx.fillRect(-40, -40, VIEW_W + 80, VIEW_H + 80);
    // bandes obliques qui défilent
    ctx.strokeStyle = 'rgba(255,255,255,.1)';
    ctx.lineWidth = 26;
    for (let i = -6; i < 24; i++) {
      const x = i * 80 + ((t * 5 * facing) % 80);
      ctx.beginPath();
      ctx.moveTo(x, VIEW_H + 40);
      ctx.lineTo(x + 180, -40);
      ctx.stroke();
    }
    // le personnage glisse depuis le bord, précédé de son ombre
    const slide = easeOut((t - (isLeft ? 6 : 16)) / 26);
    const x = isLeft ? -320 + slide * 560 : VIEW_W + 320 - slide * 560;
    drawCharacter(ctx, char, 'idle', x - facing * 14, 530, facing, CHAR_SCALE, t, {
      silhouette: '#000',
      alpha: 0.3,
    });
    drawCharacter(ctx, char, t > VS_FRAME ? 'idle' : 'intro', x, 520, facing, CHAR_SCALE, t);
    ctx.restore();

    const nameSlide = easeOut((t - 30) / 20);
    const nameX = isLeft ? -300 + nameSlide * 330 : VIEW_W + 300 - nameSlide * 330;
    const align = isLeft ? 'left' : 'right';
    arcadeText(ctx, char.name, nameX, 468, 74, {
      align,
      colors: ['#fff', '#fff', shade(char.color, 0.5)],
      glow: char.color,
    });
    arcadeText(ctx, char.title, nameX + facing * 4, 516, 24, { align, colors: GREY });
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { t } = this;
    const mid = VIEW_W / 2;
    ctx.save();
    ctx.translate(rand(-1, 1) * this.shake, rand(-1, 1) * this.shake);
    this.drawSide(ctx, this.left, true);
    this.drawSide(ctx, this.right, false);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(mid + SLANT, -40);
    ctx.lineTo(mid - SLANT, VIEW_H + 40);
    ctx.stroke();
    if (t >= VS_FRAME) {
      const pop = easeBack((t - VS_FRAME) / 12);
      arcadeText(ctx, 'VS', mid, VIEW_H / 2 - 20, 190, {
        scale: 2.4 - 1.4 * pop,
        colors: ['#fff', '#ffd23a', '#ff2a2a'],
        glow: '#ff5a1f',
      });
    }
    if (this.label && t > 20) arcadeText(ctx, this.label, mid, 44, 34, { alpha: Math.min(1, (t - 20) / 15) });
    ctx.restore();

    if (this.flash > 0.02) {
      ctx.fillStyle = `rgba(255,255,255,${this.flash})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (t > FADE_FRAME) {
      ctx.fillStyle = `rgba(0,0,0,${(t - FADE_FRAME) / (END_FRAME - FADE_FRAME)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }
}
