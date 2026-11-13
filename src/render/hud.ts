/* Interface du combat : barres de vie, portraits, jauges de super, chrono, compteur de combo. */
import { FPS, VIEW_W } from '../core/constants';
import { clamp } from '../core/math';
import type { FightSim } from '../engine/fight';
import type { Fighter } from '../engine/fighter';
import { drawPortrait } from './character-draw';
import { BLUE, GREY, RED, WHITE, arcadeText, arcadeTextWidth, type Gradient } from './text';

type Ctx = CanvasRenderingContext2D;

const MARGIN = 36;
const TOP = 26;
const PORTRAIT = 54;
/** Barre de vie : début (après le portrait), longueur, épaisseur. */
const BAR_X = 62;
const BAR_W = 372;
const BAR_H = 26;
/** Jauge de super, sous la barre de vie pour rester visible derrière les boutons tactiles. */
const METER_X = BAR_X + 168;
const METER_W = 132;
const METER_Y = BAR_H + 13;
const DARK = '#140a1e';
const NAME_MAX_WIDTH = 118;

/** Parallélogramme aligné sur l'extrémité intérieure de la barre : il se vide vers le centre de l'écran. */
function slanted(ctx: Ctx, width: number, fill: string | CanvasGradient, y = 0, height = BAR_H): void {
  const right = BAR_X + BAR_W;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(right - width + 8, y);
  ctx.lineTo(right + 8, y);
  ctx.lineTo(right, y + height);
  ctx.lineTo(right - width, y + height);
  ctx.fill();
}

function drawHealth(ctx: Ctx, f: Fighter, delayedHp: number): void {
  const ratio = clamp(f.hp / f.maxHp, 0, 1);
  const danger = ratio < 0.25;
  ctx.fillStyle = DARK;
  ctx.beginPath();
  ctx.moveTo(BAR_X + 4, -4);
  ctx.lineTo(BAR_X + BAR_W + 13, -4);
  ctx.lineTo(BAR_X + BAR_W + 4, BAR_H + 4);
  ctx.lineTo(BAR_X - 5, BAR_H + 4);
  ctx.fill();
  slanted(ctx, BAR_W, '#4a0f1e');
  // en rouge : les dégâts tout juste reçus, qui disparaissent avec un temps de retard
  slanted(ctx, BAR_W * clamp(delayedHp / f.maxHp, 0, 1), '#ff3d3d');
  const fill = ctx.createLinearGradient(0, 0, 0, BAR_H);
  fill.addColorStop(0, danger ? '#ffb02e' : '#fff7a0');
  fill.addColorStop(0.5, danger ? '#ff5a1f' : '#ffd23a');
  fill.addColorStop(1, danger ? '#c8001e' : '#7dff6a');
  slanted(ctx, BAR_W * ratio, fill);
  slanted(ctx, BAR_W * ratio, 'rgba(255,255,255,.35)', 3, 5);
}

function drawRoundPips(ctx: Ctx, f: Fighter, rounds: number): void {
  for (let i = 0; i < rounds; i++) {
    ctx.beginPath();
    ctx.arc(BAR_X + BAR_W - 12 - i * 24, BAR_H + 20, 8, 0, 7);
    ctx.fillStyle = i < f.wins ? '#ffd23a' : DARK;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
  }
}

function drawMeter(ctx: Ctx, f: Fighter, tick: number): void {
  const k = f.meter / 100;
  const full = f.meter >= 100;
  const left = METER_X + METER_W * (1 - k);
  ctx.fillStyle = DARK;
  ctx.fillRect(METER_X - 3, METER_Y - 3, METER_W + 6, 18);
  ctx.fillStyle = '#2a1d44';
  ctx.fillRect(METER_X, METER_Y, METER_W, 12);
  // pleine : la jauge clignote
  ctx.fillStyle = full && tick % 10 < 5 ? '#fff' : f.char.color;
  ctx.fillRect(left, METER_Y, METER_W * k, 12);
  ctx.fillStyle = 'rgba(255,255,255,.3)';
  ctx.fillRect(left, METER_Y + 2, METER_W * k, 3);
}

/** Tout ce qui se dessine pareil des deux côtés, dans un repère en miroir pour le joueur 2. */
function drawSide(ctx: Ctx, sim: FightSim, f: Fighter, delayedHp: number): void {
  const right = f.index === 1;
  ctx.save();
  ctx.translate(right ? VIEW_W - MARGIN : MARGIN, TOP);
  ctx.scale(right ? -1 : 1, 1);
  ctx.fillStyle = DARK;
  ctx.fillRect(-6, -8, PORTRAIT + 8, PORTRAIT + 8);
  ctx.save();
  ctx.translate(-2, -4);
  drawPortrait(ctx, f.char, PORTRAIT);
  ctx.restore();
  ctx.strokeStyle = f.char.color;
  ctx.lineWidth = 3;
  ctx.strokeRect(-2, -4, PORTRAIT, PORTRAIT);
  drawHealth(ctx, f, delayedHp);
  drawRoundPips(ctx, f, sim.rounds);
  drawMeter(ctx, f, sim.tick);
  ctx.restore();
}

/** Les textes ne doivent pas être en miroir : ils sont placés à la main de chaque côté. */
function drawSideTexts(ctx: Ctx, sim: FightSim, f: Fighter): void {
  const right = f.index === 1;
  const align = right ? 'right' : 'left';
  const at = (offset: number) => (right ? VIEW_W - offset : offset);
  const full = f.meter >= 100;

  const nameScale = Math.min(1, NAME_MAX_WIDTH / arcadeTextWidth(ctx, f.char.name, 26));
  arcadeText(ctx, f.char.name, at(104), TOP + 44, 26, { align, colors: WHITE, scale: nameScale });
  const dark: Gradient = [DARK, DARK, DARK];
  arcadeText(
    ctx,
    full ? 'SUPER PRÊT !' : 'SUPER',
    at(MARGIN + METER_X + METER_W / 2),
    TOP + METER_Y + 6.5,
    full ? 13 : 12,
    {
      colors: full ? dark : GREY,
      stroke: full ? 'rgba(255,255,255,.9)' : DARK,
    },
  );

  const combo = sim.comboDisplay[f.index];
  if (!combo) return;
  const pop = combo.pop > 0 ? 1 + (combo.pop-- / 8) * 0.5 : 1;
  const alpha = Math.min(1, combo.ttl / 12);
  arcadeText(ctx, `${combo.hits} COUPS`, at(60), 150, 52, { align, scale: pop, alpha });
  arcadeText(ctx, `${combo.dmg} dégâts`, at(60), 192, 22, { align, alpha, colors: ['#fff', '#fff', '#bbb'] });
  if (combo.praise) arcadeText(ctx, combo.praise, at(60), 228, 34, { align, alpha, colors: BLUE });
}

function drawTimer(ctx: Ctx, sim: FightSim): void {
  const training = sim.mode === 'training';
  const seconds = Math.max(0, Math.ceil(sim.timer / FPS));
  const cx = VIEW_W / 2;
  ctx.fillStyle = DARK;
  ctx.beginPath();
  ctx.moveTo(cx - 40, 14);
  ctx.lineTo(cx + 40, 14);
  ctx.lineTo(cx + 30, 70);
  ctx.lineTo(cx - 30, 70);
  ctx.fill();
  // les dix dernières secondes passent au rouge
  const urgent = !training && seconds <= 10;
  arcadeText(ctx, training ? '∞' : String(seconds), cx, 44, 46, { colors: urgent ? RED : undefined });
  if (training) arcadeText(ctx, 'ENTRAÎNEMENT', cx, 106, 20, { colors: BLUE });
}

/** @param delayedHp vie « en retard » de chaque combattant, pour la trace rouge des dégâts */
export function drawHud(ctx: Ctx, sim: FightSim, delayedHp: readonly [number, number]): void {
  sim.fighters.forEach((f, i) => {
    drawSide(ctx, sim, f, delayedHp[i]!);
    drawSideTexts(ctx, sim, f);
  });
  drawTimer(ctx, sim);
}
