/* Écran titre : derrière le logo, un bandeau noir où tous les personnages du jeu défilent en
   silhouette à leur couleur, sur des traits de vitesse. Dessiné petit puis agrandi : grain pixel art. */
import { roster } from '../data/roster';
import { drawCharacter } from '../render/character-draw';
import { slantPath, speedLines } from '../render/motion';
import { $ } from './dom';

export const TITLE_FX_HTML = '<canvas id="titleFx" width="480" height="150"></canvas>';

const W = 960;
const BAND_TOP = 36;
const BAND_H = 228;
/** Écart entre deux silhouettes, et vitesse du défilé (pixels par image). */
const GAP = 250;
const SPEED = 7;

let time = 0;

/** Appelé à chaque image tant que l'écran titre est affiché. */
export function tickTitle(): void {
  const ctx = $<HTMLCanvasElement>('#titleFx').getContext('2d')!;
  const t = time++;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, 480, 150);
  ctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
  ctx.imageSmoothingEnabled = false;
  // le bandeau se déroule à l'ouverture
  const open = Math.min(1, t / 10);
  ctx.save();
  slantPath(ctx, -80, BAND_TOP, (W + 200) * open, BAND_H, 40);
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.clip();
  const zone = { x: 0, y: BAND_TOP, w: W, h: BAND_H };
  speedLines(ctx, t, -1, '#c8001e', zone, 16);
  speedLines(ctx, t + 50, -1, '#ffd23a', zone, 7);
  const span = Math.max(W + 400, roster.length * GAP);
  roster.forEach((char, i) => {
    const x = ((t * SPEED + i * GAP) % span) - 200;
    const pose = Math.floor((t + i * 5) / 9) % 2 ? 'walkA' : 'walkB';
    drawCharacter(ctx, char, pose, x, BAND_TOP + BAND_H - 6, 1, 1.05, 0, { silhouette: char.color });
  });
  ctx.restore();
  for (const [y, color] of [
    [BAND_TOP - 10, '#ffd23a'],
    [BAND_TOP + BAND_H + 4, '#c8001e'],
  ] as const) {
    slantPath(ctx, -80, y, (W + 200) * open, 6, 1);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

/** Relance l'animation (à chaque retour sur l'écran titre). */
export function resetTitle(): void {
  time = 0;
}
