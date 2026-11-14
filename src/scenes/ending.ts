/* Animation de fin du mode arcade : le champion entre, son histoire défile, puis le générique. */
import { playMusic, playSfx } from '../audio/audio';
import { usesSprites } from '../assets/sprite-store';
import { GROUND_Y, STAGE_W, VIEW_H, VIEW_W } from '../core/constants';
import { easeBack, easeOut, pick, rand } from '../core/math';
import { POSES, clonePose, mixPose } from '../data/poses';
import { roster } from '../data/roster';
import type { Character } from '../data/types';
import { drawCharacter } from '../render/character-draw';
import { Fx } from '../render/fx';
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
      drawSprite(ctx, champion, stride > 0 ? 'walk1' : 'walk2', this.x, y, 1, { scale: CHAR_SCALE });
    } else {
      const pose = mixPose(POSES.walkA, POSES.walkB, (stride + 1) / 2, this.walkPose);
      drawRig(ctx, champion.look, pose, this.x, GROUND_Y, 1, { scale: CHAR_SCALE, time: t });
    }
  }

  private drawStory(ctx: CanvasRenderingContext2D): void {
    const { t, champion } = this;
    arcadeText(ctx, 'CHAMPION !', VIEW_W / 2, 78, 84, { scale: 0.4 + 0.6 * easeBack((t - WALK_END) / 14) });
    ctx.fillStyle = 'rgba(8,4,20,.78)';
    ctx.fillRect(0, VIEW_H - 86, VIEW_W, 86);
    ctx.fillStyle = champion.color;
    ctx.fillRect(0, VIEW_H - 86, VIEW_W, 3);
    if (t <= STORY_START) return;
    // les lignes s'écrivent lettre par lettre, l'une après l'autre
    const index = Math.min(champion.ending.length - 1, Math.floor((t - STORY_START) / LINE_DURATION));
    const typed = Math.floor((t - STORY_START - index * LINE_DURATION) * 0.9);
    ctx.font = '600 24px system-ui,sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(champion.ending[index]!.slice(0, typed), VIEW_W / 2, VIEW_H - 38);
  }

  private drawCredits(ctx: CanvasRenderingContext2D): void {
    const { t, champion } = this;
    const since = t - CREDITS_START;
    const fade = Math.min(1, since / 30);
    ctx.fillStyle = `rgba(8,4,20,${0.6 * fade})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    arcadeText(ctx, 'FÉLICITATIONS !', VIEW_W / 2, 90, 80, { alpha: fade });
    // tous les personnages viennent saluer
    const cast = roster.slice(0, 8);
    const spacing = Math.min(150, 760 / cast.length);
    cast.forEach((char, i) => {
      const x = VIEW_W / 2 + (i - (cast.length - 1) / 2) * spacing;
      const rise = easeOut((since - 20 - i * 8) / 20);
      const isChampion = char === champion;
      const facing = i < cast.length / 2 ? 1 : -1;
      drawCharacter(
        ctx,
        char,
        isChampion ? 'win' : 'idle',
        x,
        GROUND_Y + 30 + (1 - rise) * 300,
        facing,
        isChampion ? 1 : 0.85,
        t + i * 20,
      );
    });
    arcadeText(ctx, "Merci d'avoir joué à FIGHTING FRIENDS", VIEW_W / 2, 166, 30, {
      alpha: fade,
      colors: WHITE,
    });
    if (since > 100)
      arcadeText(ctx, 'FIN', VIEW_W / 2, 232, 70, { alpha: Math.min(1, (since - 100) / 20), colors: BLUE });
    if (since > 120 && t % 60 < 40)
      arcadeText(ctx, 'Touchez pour continuer', VIEW_W / 2, VIEW_H - 22, 22, { colors: WHITE });
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { t } = this;
    drawStage(ctx, this.stage, (STAGE_W - VIEW_W) / 2, t);
    ctx.fillStyle = 'rgba(8,4,20,.35)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (t >= CREDITS_START) this.drawCredits(ctx);
    else {
      this.drawChampion(ctx);
      if (t > WALK_END) this.drawStory(ctx);
    }
    this.fx.draw(ctx);
    if (t < 30) {
      ctx.fillStyle = `rgba(0,0,0,${1 - t / 30})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }
}
