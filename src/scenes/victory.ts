/* Écran de fin de combat : un panneau à la couleur du vainqueur claque, il arrive précédé de ses échos,
   le titre tombe lettre par lettre et sa réplique s'écrit dans un cartouche. */
import { playSfx } from '../audio/audio';
import { shade } from '../core/color';
import { VIEW_H, VIEW_W } from '../core/constants';
import { easeOut, rand } from '../core/math';
import type { Character } from '../data/types';
import { drawCharacter } from '../render/character-draw';
import { Fx } from '../render/fx';
import {
  PixelLayer,
  burstLines,
  colorPanel,
  halftone,
  slamLetters,
  slantPath,
  speedLines,
  tones,
} from '../render/motion';
import { arcadeText, arcadeTextWidth } from '../render/text';
import { wrapText, type Scene } from './scene';

type Ctx = CanvasRenderingContext2D;

/** Frame où le vainqueur se pose (flash, secousse). */
const LAND = 22;
const QUOTE_START = 40;
const HERO_X = 300;
const TEXT_X = 668;

export class Victory implements Scene {
  private t = 0;
  private shake = 0;
  private readonly fx = new Fx();
  private readonly layer = new PixelLayer();

  /** @param playerLost le joueur humain a perdu contre la console : le titre devient « DÉFAITE » */
  constructor(
    private readonly winner: Character,
    private readonly playerLost: boolean,
  ) {
    playSfx('win');
  }

  update(): void {
    const t = ++this.t;
    this.fx.update();
    this.shake *= 0.82;
    if (t === LAND) {
      this.shake = 14;
      playSfx('hitH');
    }
    if (t % 50 === 30) this.fx.confetti(rand(200, 760), rand(60, 200));
  }

  private drawBackdrop(g: Ctx): void {
    const { t, winner } = this;
    g.fillStyle = shade(winner.color, -0.88);
    g.fillRect(-20, -20, VIEW_W + 40, VIEW_H + 40);
    speedLines(g, t * 0.4, -1, shade(winner.color, -0.6), { x: 0, y: 0, w: VIEW_W, h: VIEW_H }, 14);
    // le panneau du vainqueur claque depuis la gauche
    const slide = (1 - easeOut(t / 10)) * 700;
    g.save();
    slantPath(g, -300 - slide, -20, 760, VIEW_H + 40, 150);
    g.clip();
    colorPanel(g, winner.color, -400, -20, 1200, VIEW_H + 40, 0);
    halftone(g, { x: 0, y: 0, w: 620, h: VIEW_H }, shade(winner.color, -0.7), 1);
    if (t > LAND) burstLines(g, HERO_X, 290, t, tones(winner.color)[0]!, 170);
    g.restore();
    slantPath(g, 460 - slide, -20, 12, VIEW_H + 40, 150);
    g.fillStyle = '#fff';
    g.fill();
  }

  private drawHero(ctx: Ctx): void {
    const { t, winner } = this;
    const arrive = easeOut(t / LAND);
    const x = -260 + arrive * (HERO_X + 260);
    const colors = tones(winner.color);
    // échos : en file derrière lui à l'arrivée, puis projetés vers l'avant quand il se pose
    const spread = t < LAND ? (1 - arrive) * 120 + 14 : (1 - easeOut((t - LAND) / 16)) * -60;
    if (Math.abs(spread) > 2) {
      for (let i = 3; i >= 1; i--) {
        drawCharacter(ctx, winner, 'win', x - spread * i, 514, 1, 2, 0, { silhouette: colors[i]! });
      }
    }
    drawCharacter(ctx, winner, 'win', x, 514, 1, 2, t, { flash: t >= LAND && t < LAND + 3 });
  }

  private drawTitles(g: Ctx): void {
    const { t, winner } = this;
    slamLetters(g, this.playerLost ? 'DÉFAITE...' : 'VICTOIRE !', TEXT_X, 88, 84, t - 12, {
      colors: this.playerLost ? ['#fff', '#b9c4ff', '#5a6ad0'] : undefined,
    });
    if (t < 30) return;
    // nom du vainqueur sur un bandeau noir qui se déroule
    const width = arcadeTextWidth(g, winner.name, 56) + 80;
    const open = easeOut((t - 30) / 8);
    slantPath(g, TEXT_X - (width / 2) * open, 146, width * open, 62, 14);
    g.fillStyle = '#000';
    g.fill();
    slantPath(g, TEXT_X - (width / 2) * open, 208, width * open, 6, 2);
    g.fillStyle = winner.color;
    g.fill();
    if (t > 34)
      arcadeText(g, winner.name, TEXT_X, 178, 56, { colors: ['#fff', '#fff', shade(winner.color, 0.4)] });
    if (t < QUOTE_START) return;
    // cartouche de la réplique : angles vifs, bord à la couleur du vainqueur
    const box = easeOut((t - QUOTE_START) / 8);
    slantPath(g, TEXT_X - 204 * box, 232, 408 * box, 96, 10);
    g.fillStyle = winner.color;
    g.fill();
    slantPath(g, TEXT_X - 200 * box, 236, 400 * box, 88, 9);
    g.fillStyle = '#0a0612';
    g.fill();
  }

  /** La réplique s'écrit lettre par lettre (en pleine résolution, pour rester lisible). */
  private drawQuote(ctx: Ctx): void {
    const typed = Math.floor((this.t - QUOTE_START - 8) * 0.9);
    if (typed <= 0) return;
    const quote = `« ${this.winner.quote} »`;
    ctx.fillStyle = '#fff';
    ctx.font = 'italic 700 21px system-ui,sans-serif';
    ctx.textAlign = 'center';
    wrapText(ctx, quote.slice(0, typed), TEXT_X + 4, 287, 360, 27);
  }

  render(ctx: Ctx): void {
    ctx.save();
    ctx.translate(Math.round(rand(-1, 1) * this.shake), Math.round(rand(-1, 1) * this.shake));
    this.layer.draw(ctx, (g) => this.drawBackdrop(g));
    this.drawHero(ctx);
    this.layer.draw(ctx, (g) => {
      this.drawTitles(g);
      this.fx.draw(g);
    });
    this.drawQuote(ctx);
    ctx.restore();
  }
}
