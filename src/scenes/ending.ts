/* Animation de fin du mode arcade : le champion entre, son histoire défile, puis le générique. */
import { playMusic, playSfx } from '../audio/audio';
import { usesSprites } from '../assets/sprite-store';
import { GROUND_Y, STAGE_W, VIEW_H, VIEW_W } from '../core/constants';
import { shade } from '../core/color';
import { easeOut, pick, rand } from '../core/math';
import { POSES, clonePose, mixPose } from '../data/poses';
import { roster } from '../data/roster';
import type { Character } from '../data/types';
import { drawCharacter } from '../render/character-draw';
import { Fx } from '../render/fx';
import {
  PixelLayer,
  blinds,
  burstLines,
  colorPanel,
  halftone,
  slamLetters,
  slamText,
  slantPath,
  tones,
} from '../render/motion';
import { drawRig } from '../render/rig';
import { drawSprite } from '../render/sprite-draw';
import { drawStage, stageForCharacter, type Stage } from '../render/stages';
import { BLUE, WHITE, arcadeText } from '../render/text';
import type { Scene } from './scene';

/** Déroulé, en frames. */
const WALK_END = 150;
const STORY_START = 190;
const LINE_DURATION = 140;
const CREDITS_START = 760;
const AUTO_END = 1500;
const CHAR_SCALE = 1.15;

export class Ending implements Scene {
  private t = 0;
  private x = -80;
  private done = false;
  private readonly fx = new Fx();
  private readonly layer = new PixelLayer();
  private readonly stage: Stage;
  private readonly walkPose = clonePose('idle');

  constructor(
    private readonly champion: Character,
    private readonly onDone: () => void,
  ) {
    this.stage = stageForCharacter(champion);
    playMusic('ending');
  }

  /** Premier appui : aller au générique. Second appui : quitter. */
  skip(): void {
    if (this.t < CREDITS_START) this.t = CREDITS_START;
    else if (this.t > CREDITS_START + 40) this.finish();
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    this.onDone();
  }

  update(): void {
    const t = ++this.t;
    this.fx.update();
    if (t < WALK_END) this.x = -80 + (t / WALK_END) * (VIEW_W / 2 + 80);
    if (t === WALK_END) {
      playSfx('win');
      this.fx.confetti(VIEW_W / 2, 160);
    }
    if (t > WALK_END && t % 45 === 0) {
      // feu d'artifice
      const x = rand(100, VIEW_W - 100);
      const y = rand(60, 220);
      this.fx.confetti(x, y);
      this.fx.impact(x, y, pick(['fire', 'elec', 'slash'] as const), 90, 1);
      if (t < CREDITS_START) playSfx('fire');
    }
    if (t > AUTO_END) this.finish();
  }

  private drawChampion(ctx: CanvasRenderingContext2D): void {
    const { t, champion } = this;
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(this.x, GROUND_Y + 2, 60, 10, 0, 0, 7);
    ctx.fill();
    if (t >= WALK_END) {
      drawCharacter(ctx, champion, 'win', this.x, GROUND_Y, 1, CHAR_SCALE, t);
      return;
    }
    const stride = Math.sin(t * 0.2);
    if (usesSprites(champion)) {
      const y = GROUND_Y - Math.abs(stride) * 5;
      drawSprite(ctx, champion, stride > 0 ? 'walk1' : 'walk2', this.x, y, 1, {
        scale: CHAR_SCALE * champion.size,
      });
    } else {
      const pose = mixPose(POSES.walkA, POSES.walkB, (stride + 1) / 2, this.walkPose);
      drawRig(ctx, champion.look, pose, this.x, GROUND_Y, 1, { scale: CHAR_SCALE * champion.size, time: t });
    }
  }

  /** Titre « CHAMPION ! » et bandeau du récit (dessinés sur la couche pixelisée). */
  private drawStoryFrame(g: CanvasRenderingContext2D): void {
    const { t, champion } = this;
    const since = t - WALK_END;
    burstLines(g, this.x, GROUND_Y - 120, t, 'rgba(255,255,255,.16)', 150);
    slamLetters(g, 'CHAMPION !', VIEW_W / 2, 78, 84, since - 2);
    const open = easeOut(since / 10) * (VIEW_W + 200);
    slantPath(g, -100, VIEW_H - 92, open, 100, 18);
    g.fillStyle = '#000';
    g.fill();
    slantPath(g, -100, VIEW_H - 100, open, 6, 2);
    g.fillStyle = champion.color;
    g.fill();
  }

  /** Le récit s'écrit lettre par lettre, une ligne après l'autre (en pleine résolution : lisible). */
  private drawStoryText(ctx: CanvasRenderingContext2D): void {
    const { t, champion } = this;
    if (t <= STORY_START) return;
    const index = Math.min(champion.ending.length - 1, Math.floor((t - STORY_START) / LINE_DURATION));
    const typed = Math.floor((t - STORY_START - index * LINE_DURATION) * 0.9);
    ctx.font = 'italic 700 24px system-ui,sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(champion.ending[index]!.slice(0, typed), VIEW_W / 2, VIEW_H - 38);
  }

  /** Générique : chaque personnage monte devant un panneau à sa couleur ; le champion est au centre, plus grand. */
  private cast(): Character[] {
    const others = roster.filter((c) => c !== this.champion).slice(0, 6);
    const half = Math.ceil(others.length / 2);
    return [...others.slice(0, half), this.champion, ...others.slice(half)];
  }

  private drawCreditsBack(g: CanvasRenderingContext2D): void {
    const since = this.t - CREDITS_START;
    g.fillStyle = '#07030f';
    g.fillRect(-20, -20, VIEW_W + 40, VIEW_H + 40);
    const cast = this.cast();
    const width = VIEW_W / cast.length;
    cast.forEach((char, i) => {
      // les panneaux tombent l'un après l'autre
      const drop = easeOut((since - 6 - i * 5) / 12);
      if (drop <= 0) return;
      const x = i * width;
      g.save();
      slantPath(g, x - 30, -20, width, (VIEW_H + 40) * drop, 60);
      g.clip();
      colorPanel(g, char.color, x - 60, -20, width + 120, VIEW_H + 40, 0);
      halftone(g, { x: x - 30, y: 0, w: width + 60, h: VIEW_H }, shade(char.color, -0.7), i % 2 ? 1 : -1);
      if (char === this.champion) burstLines(g, x + width / 2, 300, this.t, tones(char.color)[0]!, 120);
      g.restore();
    });
  }

  private drawCreditsCast(ctx: CanvasRenderingContext2D): void {
    const since = this.t - CREDITS_START;
    const cast = this.cast();
    const width = VIEW_W / cast.length;
    cast.forEach((char, i) => {
      const rise = easeOut((since - 24 - i * 6) / 16);
      if (rise <= 0) return;
      const isChampion = char === this.champion;
      const facing = i < cast.length / 2 ? 1 : -1;
      const scale = Math.min(isChampion ? 1.5 : 1.15, width / 110);
      const y = VIEW_H - 10 + (1 - rise) * 340;
      drawCharacter(ctx, char, isChampion ? 'win' : 'idle', x(i, width), y, facing, scale, this.t + i * 20);
    });
  }

  private drawCreditsFront(g: CanvasRenderingContext2D): void {
    const { t } = this;
    const since = t - CREDITS_START;
    slantPath(g, -100, 24, easeOut(since / 10) * (VIEW_W + 200), 118, 20);
    g.fillStyle = '#000';
    g.fill();
    slamLetters(g, 'FÉLICITATIONS !', VIEW_W / 2, 66, 72, since - 8);
    if (since > 40)
      arcadeText(g, "Merci d'avoir joué à FIGHTING FRIENDS", VIEW_W / 2, 120, 26, { colors: WHITE });
    slamText(g, 'FIN', VIEW_W / 2, 210, 96, since - 110, { colors: BLUE });
    if (since > 130 && t % 60 < 40) {
      slantPath(g, VIEW_W / 2 - 180, VIEW_H - 40, 360, 34, 8);
      g.fillStyle = '#000';
      g.fill();
      arcadeText(g, 'Touchez pour continuer', VIEW_W / 2, VIEW_H - 22, 22, { colors: WHITE });
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { t } = this;
    if (t >= CREDITS_START) {
      this.layer.draw(ctx, (g) => this.drawCreditsBack(g));
      this.drawCreditsCast(ctx);
      this.layer.draw(ctx, (g) => {
        this.drawCreditsFront(g);
        this.fx.draw(g);
        blinds(g, 1 - (t - CREDITS_START) / 10);
      });
      return;
    }
    drawStage(ctx, this.stage, (STAGE_W - VIEW_W) / 2, t);
    ctx.fillStyle = 'rgba(8,4,20,.35)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (t > WALK_END) this.layer.draw(ctx, (g) => this.drawStoryFrame(g));
    this.drawChampion(ctx);
    if (t > WALK_END) this.drawStoryText(ctx);
    this.layer.draw(ctx, (g) => {
      this.fx.draw(g);
      // volets : ouverture au début, fermeture juste avant le générique
      blinds(g, Math.max(1 - t / 12, (t - (CREDITS_START - 12)) / 10));
    });
  }
}

/** Centre de la colonne d'un personnage dans le générique. */
const x = (index: number, width: number): number => (index + 0.5) * width;
