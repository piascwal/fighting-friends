/* Écran de fin de combat : le vainqueur prend la pose et lance sa réplique. */
import { playSfx } from '../audio/audio';
import { shade } from '../core/color';
import { VIEW_H, VIEW_W } from '../core/constants';
import { easeBack, easeOut, rand } from '../core/math';
import type { Character } from '../data/types';
import { drawCharacter } from '../render/character-draw';
import { Fx } from '../render/fx';
import { arcadeText } from '../render/text';
import { drawRays, wrapText, type Scene } from './scene';

export class Victory implements Scene {
  private t = 0;
  private readonly fx = new Fx();

  /** @param playerLost le joueur humain a perdu contre la console : le titre devient « DÉFAITE » */
  constructor(
    private readonly winner: Character,
    private readonly playerLost: boolean,
  ) {
    playSfx('win');
  }

  update(): void {
    this.t++;
    this.fx.update();
    if (this.t % 50 === 10) this.fx.confetti(rand(200, 760), rand(60, 200));
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { t, winner } = this;
    const bg = ctx.createRadialGradient(330, 300, 40, 330, 300, 800);
    bg.addColorStop(0, shade(winner.color, 0.25));
    bg.addColorStop(1, shade(winner.color, -0.8));
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawRays(ctx, 330, 300, 'rgba(255,255,255,.08)', t, 14);
    drawCharacter(ctx, winner, 'win', -200 + easeOut(t / 24) * 520, 514, 1, 2, t);

    arcadeText(ctx, this.playerLost ? 'DÉFAITE...' : 'VICTOIRE !', 660, 92, 86, {
      scale: 0.4 + 0.6 * easeBack(t / 14),
      colors: this.playerLost ? ['#fff', '#b9c4ff', '#5a6ad0'] : undefined,
    });
    arcadeText(ctx, winner.name, 660, 176, 58, {
      colors: ['#fff', '#fff', shade(winner.color, 0.4)],
      glow: winner.color,
    });

    if (t > 26) {
      // bulle avec la réplique du vainqueur
      ctx.save();
      ctx.globalAlpha = Math.min(1, (t - 26) / 14);
      ctx.fillStyle = 'rgba(10,6,24,.82)';
      ctx.strokeStyle = winner.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(470, 222, 400, 96, 14);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'italic 600 22px system-ui,sans-serif';
      ctx.textAlign = 'center';
      wrapText(ctx, `« ${winner.quote} »`, 670, 268, 370, 28);
      ctx.restore();
    }
    this.fx.draw(ctx);
  }
}
