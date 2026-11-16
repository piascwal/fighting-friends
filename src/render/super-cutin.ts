/* Bandeau de super : quand un super se déclenche, une bande penchée traverse l'écran avec le
   personnage en gros plan (son image « concentration »), des traits de vitesse et le nom du coup.
   Construit à partir de la couleur et des images du personnage : valable pour n'importe lequel. */
import { shade } from '../core/color';
import { VIEW_W } from '../core/constants';
import { clamp, easeOut } from '../core/math';
import type { Character } from '../data/types';
import { drawCharacter } from './character-draw';
import { type PixelLayer, colorPanel, halftone, slamText, slantPath, speedLines, tones } from './motion';

type Ctx = CanvasRenderingContext2D;

const CENTER_Y = 182;
const HEIGHT = 176;
/** Zoom du gros plan : le buste et le visage remplissent la bande. */
const ZOOM = 3;

/**
 * @param facing sens du lanceur : la bande arrive de son côté
 * @param elapsed frames écoulées depuis le déclenchement, sur `total`
 */
export function drawSuperCutIn(
  ctx: Ctx,
  layer: PixelLayer,
  char: Character,
  facing: number,
  name: string,
  elapsed: number,
  total: number,
): void {
  // la bande s'ouvre en claquant, puis se referme sur les dernières images
  const open = Math.min(easeOut(elapsed / 5), clamp((total - elapsed) / 4, 0, 1));
  const h = Math.round(HEIGHT * open);
  if (h < 4) return;
  const top = CENTER_Y - h / 2;
  const slant = 46 * facing;
  const zone = { x: -60, y: top, w: VIEW_W + 120, h };
  const band = (g: Ctx) =>
    slantPath(g, -80 - Math.max(0, slant), top, VIEW_W + 160 + Math.abs(slant), h, slant);

  layer.draw(ctx, (g) => {
    band(g);
    g.clip();
    colorPanel(g, char.color, -100, top, VIEW_W + 200, h, 0);
    halftone(g, zone, shade(char.color, -0.75), -facing, 14);
    speedLines(g, elapsed * 2, facing, tones(char.color)[0]!, zone, 26);
    speedLines(g, elapsed * 2 + 30, facing, '#ffffff', zone, 10);
  });

  // gros plan : le personnage dérive lentement vers l'avant, précédé d'un écho sombre
  const x = VIEW_W / 2 - facing * (250 - elapsed * 1.6);
  const feet = CENTER_Y + 200 * ZOOM * char.size * 0.8;
  ctx.save();
  band(ctx);
  ctx.clip();
  drawCharacter(ctx, char, 'charge', x - facing * 26, feet, facing, ZOOM, 0, {
    silhouette: shade(char.color, -0.8),
  });
  drawCharacter(ctx, char, 'charge', x, feet, facing, ZOOM, 0, { flash: elapsed < 3 });
  ctx.restore();

  layer.draw(ctx, (g) => {
    // liserés blancs et noirs sur les deux bords de la bande
    for (const [y, color] of [
      [top - 8, '#000'],
      [top - 4, '#fff'],
      [top + h - 2, '#fff'],
      [top + h + 2, '#000'],
    ] as const) {
      slantPath(g, -80, y, VIEW_W + 160, 6, 0);
      g.fillStyle = color;
      g.fill();
    }
    slamText(g, name, VIEW_W / 2 + facing * 190, CENTER_Y + h * 0.3, 58, elapsed - 4, {
      colors: ['#fff', '#ffe27a', char.color],
    });
  });
}
