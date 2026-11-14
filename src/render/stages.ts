/* Décors : soit l'image fournie pour un personnage, soit un décor dessiné par le jeu (préparé à la demande,
   affiché avec parallaxe et ambiance animée). */
import { spriteEntry } from '../assets/sprite-store';
import { STAGE_W, VIEW_H, VIEW_W } from '../core/constants';
import type { Character } from '../data/types';
import { rand } from '../core/math';
import { BACK_W, STAGE_DEFS, type StageDef } from './stage-painters';

interface Mote {
  x: number;
  y: number;
  /** Taille / vitesse relative. */
  s: number;
  /** Déphasage, pour que les particules ne bougent pas toutes ensemble. */
  phase: number;
}

/** Décor dessiné par le jeu, en deux calques. */
interface PaintedStage {
  kind: 'painted';
  def: StageDef;
  back: HTMLCanvasElement;
  front: HTMLCanvasElement;
  motes: Mote[];
}

/** Décor fourni sous forme d'image (un par personnage). */
interface ImageStage {
  kind: 'image';
  image: HTMLCanvasElement;
}

export type Stage = PaintedStage | ImageStage;

export const STAGE_COUNT = STAGE_DEFS.length;
export const randomStageIndex = (): number => Math.floor(Math.random() * STAGE_COUNT);

/** Vitesse de défilement du calque lointain par rapport à la caméra. */
const PARALLAX = 0.35;
const MOTE_COUNT = 36;
const cache = new Map<number, PaintedStage>();
const imageStages = new WeakMap<HTMLCanvasElement, ImageStage>();

function layer(width: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = VIEW_H;
  return [canvas, canvas.getContext('2d')!];
}

export function getStage(index: number): Stage {
  const i = ((index % STAGE_COUNT) + STAGE_COUNT) % STAGE_COUNT;
  let stage = cache.get(i);
  if (!stage) {
    const def = STAGE_DEFS[i]!;
    const [back, backCtx] = layer(BACK_W);
    const [front, frontCtx] = layer(STAGE_W);
    def.paint(backCtx, frontCtx);
    const motes = Array.from({ length: MOTE_COUNT }, () => ({
      x: rand(VIEW_W),
      y: rand(VIEW_H),
      s: rand(0.5, 1.5),
      phase: rand(6.3),
    }));
    stage = { kind: 'painted', def, back, front, motes };
    cache.set(i, stage);
  }
  return stage;
}

function drawMote(ctx: CanvasRenderingContext2D, stage: PaintedStage, m: Mote, time: number): void {
  switch (stage.def.ambience) {
    case 'petal':
      m.x -= 1.2 * m.s;
      m.y += 0.8 * m.s;
      ctx.fillStyle = 'rgba(255,190,200,.8)';
      ctx.beginPath();
      ctx.ellipse(m.x, m.y, 5 * m.s, 2.5 * m.s, time * 0.05 + m.phase, 0, 7);
      ctx.fill();
      break;
    case 'rain':
      m.x -= 3;
      m.y += 16 * m.s;
      ctx.strokeStyle = 'rgba(160,190,255,.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x + 4, m.y - 18);
      ctx.stroke();
      break;
    case 'ember':
      m.y -= 1.4 * m.s;
      m.x += Math.sin(time * 0.04 + m.phase);
      ctx.fillStyle = `rgba(255,${Math.floor(140 + 80 * Math.sin(m.phase))},40,.85)`;
      ctx.fillRect(m.x, m.y, 3 * m.s, 3 * m.s);
      break;
    case 'firefly':
      m.x += Math.sin(time * 0.02 + m.phase) * 0.6;
      m.y += Math.cos(time * 0.017 + m.phase) * 0.5;
      ctx.fillStyle = `rgba(190,255,140,${0.4 + 0.4 * Math.sin(time * 0.06 + m.phase)})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 2.2 * m.s, 0, 7);
      ctx.fill();
      break;
  }
  // une particule sortie de l'écran revient par le bord opposé
  if (m.y > VIEW_H + 10) {
    m.y = -10;
    m.x = rand(VIEW_W + 200);
  }
  if (m.y < -20) {
    m.y = VIEW_H;
    m.x = rand(VIEW_W);
  }
  if (m.x < -20) m.x = VIEW_W + 10;
}

/** Décor d'un personnage : l'image qu'il a fournie, sinon son décor dessiné. */
export function stageForCharacter(char: Character): Stage {
  const entry = spriteEntry(char.id, 'stage');
  if (!entry) return getStage(char.stage);
  let stage = imageStages.get(entry.img);
  if (!stage) imageStages.set(entry.img, (stage = { kind: 'image', image: entry.img }));
  return stage;
}

/**
 * Image de décor : calée sur la hauteur de l'écran, sol en bas. Si elle est plus large que l'écran,
 * elle défile avec la caméra ; sinon elle est agrandie pour couvrir toute la largeur.
 */
function drawImageStage(ctx: CanvasRenderingContext2D, image: HTMLCanvasElement, camX: number): void {
  let k = VIEW_H / image.height;
  if (image.width * k < VIEW_W) k = VIEW_W / image.width;
  const w = image.width * k;
  const h = image.height * k;
  const travel = (w - VIEW_W) * (camX / (STAGE_W - VIEW_W));
  ctx.save();
  // pixel art : agrandi sans lissage pour rester net
  ctx.imageSmoothingEnabled = k * ctx.getTransform().a < 1;
  ctx.drawImage(image, -travel, VIEW_H - h, w, h);
  ctx.restore();
}

/** @param camX bord gauche de l'écran dans le décor */
export function drawStage(ctx: CanvasRenderingContext2D, stage: Stage, camX: number, time: number): void {
  if (stage.kind === 'image') return drawImageStage(ctx, stage.image, camX);
  ctx.drawImage(stage.back, -camX * PARALLAX - 4, 0);
  ctx.drawImage(stage.front, -camX, 0);
  for (const mote of stage.motes) drawMote(ctx, stage, mote, time);
}
