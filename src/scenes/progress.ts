/* Écran de progression du mode arcade : une carte à étapes où l'on voit d'où l'on vient (adversaires déjà
   battus), où l'on va, et la phrase que lance le prochain adversaire. Il précède l'animation de rencontre. */
import { playSfx } from '../audio/audio';
import { shade } from '../core/color';
import { VIEW_H, VIEW_W } from '../core/constants';
import { easeOut } from '../core/math';
import { encounterLine } from '../data/taunts';
import type { Character } from '../data/types';
import { drawPortrait } from '../render/character-draw';
import { PixelLayer, blinds, halftone, slamText, slantPath, speedLines, tones } from '../render/motion';
import { GREY, arcadeText, arcadeTextWidth, type Gradient } from '../render/text';
import type { Scene } from './scene';

type Ctx = CanvasRenderingContext2D;

/** Déroulé, en frames. */
const WALK_START = 22;
const WALK_END = 64;
const SPEECH_START = 70;
const LETTERS_PER_FRAME = 0.6;
const HOLD_AFTER_TEXT = 110;
const FADE_LENGTH = 16;
/** Carte : nombre d'étapes par rangée, et marges. */
const PER_ROW = 6;
const NODE = 56;
const MARGIN_X = 90;
const ROW_TOP = 178;
const ROW_STEP = 140;
const DARK = '#140a1e';
const GOLD_BAR: Gradient = ['#fff7c2', '#ffd23a', '#ff5a1f'];

interface Point {
  x: number;
  y: number;
}

export class ArcadeProgress implements Scene {
  private t = 0;
  private done = false;
  private readonly back = new PixelLayer();
  private readonly front = new PixelLayer();
  private readonly points: Point[];
  private readonly line: string;

  /**
   * @param opponents tous les adversaires du parcours, dans l'ordre
   * @param step numéro (à partir de 0) de l'adversaire à affronter
   */
  constructor(
    private readonly player: Character,
    private readonly opponents: readonly Character[],
    private readonly step: number,
    private readonly onDone: () => void,
  ) {
    this.points = opponents.map((_, i) => this.nodePosition(i));
    this.line = encounterLine(opponents[step]!, step === opponents.length - 1);
  }

  /** Le parcours serpente : la première rangée va vers la droite, la suivante revient, et ainsi de suite. */
  private nodePosition(i: number): Point {
    const row = Math.floor(i / PER_ROW);
    const col = i % PER_ROW;
    const inRow = Math.min(PER_ROW, this.opponents.length - row * PER_ROW);
    const span = VIEW_W - MARGIN_X * 2;
    const gap = inRow > 1 ? span / (PER_ROW - 1) : 0;
    const x = MARGIN_X + (row % 2 ? PER_ROW - 1 - col : col) * gap;
    return { x, y: ROW_TOP + row * ROW_STEP };
  }

  private get end(): number {
    return SPEECH_START + this.line.length / LETTERS_PER_FRAME + HOLD_AFTER_TEXT;
  }

  skip(): void {
    const text = SPEECH_START + this.line.length / LETTERS_PER_FRAME;
    if (this.t < text) this.t = Math.ceil(text);
    else this.t = Math.max(this.t, this.end - FADE_LENGTH + 1);
  }

  update(): void {
    const t = ++this.t;
    if (t === WALK_START) playSfx('whoosh');
    if (t === WALK_END) playSfx('hitH');
    if (t === SPEECH_START) playSfx('vs');
    if (t >= this.end && !this.done) {
      this.done = true;
      this.onDone();
    }
  }

  /** Position du joueur : il part de l'étape précédente (ou du bord, au premier combat) vers l'étape en cours. */
  private playerPosition(): Point {
    const to = this.points[this.step]!;
    const from = this.step > 0 ? this.points[this.step - 1]! : { x: to.x - 120, y: to.y };
    const k = easeOut(Math.min(1, Math.max(0, (this.t - WALK_START) / (WALK_END - WALK_START))));
    return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * 26 };
  }

  /** Chemin pointillé entre deux étapes consécutives ; plein (doré) quand l'étape est franchie. */
  private drawPath(g: Ctx): void {
    for (let i = 1; i < this.points.length; i++) {
      const a = this.points[i - 1]!;
      const b = this.points[i]!;
      const cleared = i <= this.step;
      g.strokeStyle = cleared ? '#ffd23a' : '#5b4a78';
      g.lineWidth = cleared ? 8 : 6;
      g.setLineDash(cleared ? [] : [12, 10]);
      g.beginPath();
      g.moveTo(a.x, a.y);
      g.lineTo(b.x, b.y);
      g.stroke();
    }
    g.setLineDash([]);
  }

  private drawNode(ctx: Ctx, i: number): void {
    const { x, y } = this.points[i]!;
    const char = this.opponents[i]!;
    const beaten = i < this.step;
    const current = i === this.step;
    const last = i === this.opponents.length - 1;
    const size = last ? NODE + 14 : NODE;
    // arrivée du joueur : le nœud en cours « claque »
    const pop = current && this.t >= WALK_END ? 1 + Math.max(0, 1 - (this.t - WALK_END) / 8) * 0.35 : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pop, pop);
    const pulse = current && this.t % 20 < 10;
    ctx.fillStyle = pulse ? '#ffd23a' : last ? '#ff2a2a' : current ? '#ffffff' : DARK;
    ctx.fillRect(-size / 2 - 5, -size / 2 - 5, size + 10, size + 10);
    ctx.save();
    ctx.translate(-size / 2, -size / 2);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    drawPortrait(ctx, char, size);
    if (!current) {
      ctx.fillStyle = beaten ? 'rgba(0,0,0,.62)' : 'rgba(0,0,0,.4)';
      ctx.fillRect(0, 0, size, size);
    }
    if (beaten) {
      ctx.strokeStyle = '#ff2a2a';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(4, size - 4);
      ctx.lineTo(size - 4, 4);
      ctx.moveTo(4, 4);
      ctx.lineTo(size - 4, size - 4);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
    const label = last ? 'FINAL' : String(i + 1);
    arcadeText(ctx, label, x, y + size / 2 + 20, last ? 20 : 16, {
      colors: current ? GOLD_BAR : GREY,
      alpha: beaten ? 0.5 : 1,
    });
  }

  /** Le joueur sur la carte : son portrait entouré de sa couleur, qui rebondit. */
  private drawPlayer(ctx: Ctx): void {
    const { x, y } = this.playerPosition();
    const bob = this.t >= WALK_END ? Math.sin(this.t * 0.25) * 3 : 0;
    const size = 44;
    ctx.save();
    ctx.translate(x, y - NODE / 2 - 26 + bob);
    ctx.fillStyle = this.player.color;
    ctx.fillRect(-size / 2 - 4, -size / 2 - 4, size + 8, size + 8);
    ctx.save();
    ctx.translate(-size / 2, -size / 2);
    drawPortrait(ctx, this.player, size);
    ctx.restore();
    ctx.fillStyle = this.player.color;
    ctx.beginPath();
    ctx.moveTo(-8, size / 2 + 4);
    ctx.lineTo(8, size / 2 + 4);
    ctx.lineTo(0, size / 2 + 14);
    ctx.fill();
    ctx.restore();
  }

  /** Bulle de dialogue en bas : le visage de l'adversaire, son nom, son titre et sa phrase lettre à lettre. */
  private speechTop(): number | null {
    const t = this.t - SPEECH_START;
    return t < 0 ? null : VIEW_H - 150 * easeOut(Math.min(1, t / 8));
  }

  /** Fond de la bulle (couche à gros grain). */
  private drawSpeechBox(g: Ctx): void {
    const y = this.speechTop();
    if (y === null) return;
    const opponent = this.opponents[this.step]!;
    slantPath(g, 30, y, VIEW_W - 60, 130, 14);
    g.fillStyle = '#000';
    g.fill();
    slantPath(g, 30, y + 124, (VIEW_W - 60) * 0.7, 6, 2);
    g.fillStyle = opponent.color;
    g.fill();
  }

  /** Contenu de la bulle, net : visage, nom, phrase. */
  private drawSpeech(ctx: Ctx): void {
    const y = this.speechTop();
    const t = this.t - SPEECH_START;
    if (y === null || t < 8) return;
    const opponent = this.opponents[this.step]!;
    const portrait = 92;
    ctx.fillStyle = opponent.color;
    ctx.fillRect(54, y + 17, portrait + 8, portrait + 8);
    ctx.save();
    ctx.translate(58, y + 21);
    ctx.imageSmoothingQuality = 'high';
    drawPortrait(ctx, opponent, portrait);
    ctx.restore();
    arcadeText(ctx, opponent.name, 178, y + 34, 34, {
      align: 'left',
      colors: ['#fff', '#fff', shade(opponent.color, 0.5)],
    });
    if (opponent.title)
      arcadeText(ctx, opponent.title, 178 + arcadeTextWidth(ctx, opponent.name, 34) + 20, y + 38, 18, {
        align: 'left',
        colors: GREY,
      });
    ctx.save();
    ctx.font = `700 24px Arial, sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const shown = this.line.slice(0, Math.floor(t * LETTERS_PER_FRAME));
    wrapLines(ctx, `« ${shown}${shown.length < this.line.length ? '' : ' »'}`, 178, y + 62, VIEW_W - 260, 30);
    ctx.restore();
  }

  render(ctx: Ctx): void {
    const { t } = this;
    ctx.fillStyle = DARK;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const color = this.player.color;
    this.back.draw(ctx, (g) => {
      g.fillStyle = shade(color, -0.78);
      g.fillRect(0, 0, VIEW_W, VIEW_H);
      halftone(g, { x: 0, y: 0, w: VIEW_W, h: VIEW_H }, shade(color, -0.6), 1);
      speedLines(g, t, 1, tones(color)[3]!, { x: 0, y: 0, w: VIEW_W, h: VIEW_H }, 10);
      this.drawPath(g);
    });
    this.opponents.forEach((_, i) => this.drawNode(ctx, i));
    this.drawPlayer(ctx);
    this.front.draw(ctx, (g) => {
      slamText(g, `ÉTAPE ${this.step + 1} / ${this.opponents.length}`, VIEW_W / 2, 56, 52, t - 2, {
        colors: GOLD_BAR,
      });
      this.drawSpeechBox(g);
    });
    this.drawSpeech(ctx);
    // volets d'entrée et de sortie, par-dessus tout (la couche du fond est réutilisée)
    this.back.draw(ctx, (g) => {
      blinds(g, (t - (this.end - FADE_LENGTH)) / (FADE_LENGTH - 2));
      blinds(g, 1 - t / 10);
    });
  }
}

/** Écrit un texte en passant à la ligne aux espaces. */
function wrapLines(ctx: Ctx, text: string, x: number, y: number, maxWidth: number, lineHeight: number): void {
  let line = '';
  let top = y;
  for (const word of text.split(' ')) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      ctx.fillText(line, x, top);
      top += lineHeight;
      line = word;
    } else {
      line = candidate;
    }
  }
  ctx.fillText(line, x, top);
}
