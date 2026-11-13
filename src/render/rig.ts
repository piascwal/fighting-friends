/* Pantin vectoriel : dessine un personnage dans n'importe quelle posture, sans aucune image.
   Sert de personnage provisoire tant qu'aucun sprite n'est fourni, et de guide de pose dans les menus. */
import { shade } from '../core/color';
import { POSES, type Pose } from '../data/poses';
import type { Look } from '../data/types';
import { drawBandTails, drawHeadDetails, type HeadStyle } from './rig-head';
import { solveSkeleton, type Point, type Skeleton } from './rig-skeleton';

export interface RigOptions {
  /** Zoom (1 = taille de combat). */
  scale?: number;
  /** Tout en blanc : flash d'impact. */
  flash?: boolean;
  /** Silhouette unie de cette couleur (images rémanentes, guides de pose). */
  silhouette?: string;
  alpha?: number;
  /** Temps, pour animer cheveux et écharpe. */
  time?: number;
}

const DEG = Math.PI / 180;
const OUTLINE = '#15101c';
/** Assombrissement des membres situés à l'arrière-plan. */
const BACK_SHADE = -0.28;

/** Pinceau partagé par toutes les parties du corps : gère contours, flash et silhouette. */
class Brush {
  readonly outline: string;
  /** Épaisseur du contour (0 en silhouette). */
  readonly edge: number;
  readonly plain: boolean;

  constructor(
    readonly ctx: CanvasRenderingContext2D,
    readonly s: number,
    private readonly opt: RigOptions,
  ) {
    this.plain = !!(opt.silhouette || opt.flash);
    this.outline = opt.silhouette ?? (opt.flash ? '#ffffff' : OUTLINE);
    this.edge = opt.silhouette ? 0 : 5 * s;
  }

  /** Couleur effective d'une partie, selon le mode de dessin. */
  color(c: string, back = false): string {
    if (this.opt.silhouette) return this.opt.silhouette;
    if (this.opt.flash) return '#ffffff';
    return back ? shade(c, BACK_SHADE) : c;
  }

  line(points: readonly Point[], width: number, color: string): void {
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(points[0]!.x, points[0]!.y);
    for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  /** Membre en deux segments (bras, jambe) avec son contour. */
  limb(a: Point, mid: Point, end: Point, width: number, upper: string, lower: string): void {
    if (this.edge) this.line([a, mid, end], width + this.edge, this.outline);
    this.line([a, mid], width, upper);
    this.line([mid, end], width * 0.92, lower);
    if (upper !== lower) this.disc(mid, width * 0.46, upper, false);
  }

  disc(p: Point, radius: number, color: string, outlined = true): void {
    const { ctx } = this;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, 7);
    ctx.fillStyle = color;
    ctx.fill();
    if (outlined && this.edge) {
      ctx.lineWidth = this.edge * 0.5;
      ctx.strokeStyle = this.outline;
      ctx.stroke();
    }
  }
}

function drawArm(
  b: Brush,
  look: Look,
  bulk: number,
  shoulder: Point,
  elbow: Point,
  hand: Point,
  back: boolean,
) {
  const width = 15 * b.s * bulk;
  const upper = look.sleeve === 'none' ? look.skin : look.top;
  const lower = look.sleeve === 'long' ? look.top : look.skin;
  b.limb(shoulder, elbow, hand, width, b.color(upper, back), b.color(lower, back));
  b.disc(hand, width * 0.68, b.color(look.glove ?? look.skin, back));
}

function drawLeg(
  b: Brush,
  look: Look,
  bulk: number,
  hip: Point,
  knee: Point,
  foot: Point,
  toe: Point,
  back: boolean,
) {
  const width = 19 * b.s * bulk;
  b.limb(
    hip,
    knee,
    foot,
    width,
    b.color(look.pants, back),
    b.color(look.shorts ? look.skin : look.pants, back),
  );
  if (b.edge) b.line([foot, toe], width * 0.8 + b.edge, b.outline);
  b.line([foot, toe], width * 0.8, b.color(look.shoe ?? look.skin, back));
}

function drawScarf(b: Brush, look: Look, sk: Skeleton, time: number): void {
  if (!look.scarf || b.plain) return;
  const { ctx, s } = b;
  const n = sk.neck;
  const wave = Math.sin(time * 0.12) * 6 * s;
  ctx.beginPath();
  ctx.moveTo(n.x - 4 * s, n.y - 4 * s);
  ctx.quadraticCurveTo(n.x - 34 * s, n.y - 12 * s + wave, n.x - 62 * s, n.y + 2 * s - wave);
  ctx.quadraticCurveTo(n.x - 40 * s, n.y + 6 * s + wave, n.x - 6 * s, n.y + 8 * s);
  ctx.closePath();
  ctx.fillStyle = look.scarf;
  ctx.fill();
  ctx.lineWidth = 2.5 * s;
  ctx.strokeStyle = b.outline;
  ctx.stroke();
}

function drawTorso(b: Brush, look: Look, bulk: number, sk: Skeleton): void {
  const { ctx, s } = b;
  const { hip, neck } = sk;
  const angle = Math.atan2(neck.y - hip.y, neck.x - hip.x);
  // (nx, ny) : perpendiculaire au buste, pour lui donner sa largeur
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);
  const hipHalf = 15 * s * bulk;
  const shoulderHalf = 22 * s * bulk;
  const top: Point = { x: neck.x + Math.cos(angle) * 6 * s, y: neck.y + Math.sin(angle) * 6 * s };
  const along = (from: Point, k: number): Point => ({ x: from.x + nx * k, y: from.y + ny * k });

  ctx.beginPath();
  const corners = [
    along(hip, -hipHalf),
    along(hip, hipHalf),
    along(top, shoulderHalf),
    along(top, -shoulderHalf),
  ];
  ctx.moveTo(corners[0]!.x, corners[0]!.y);
  for (const c of corners.slice(1)) ctx.lineTo(c.x, c.y);
  ctx.closePath();
  if (b.edge) {
    ctx.lineWidth = b.edge + 8 * s;
    ctx.strokeStyle = b.outline;
    ctx.stroke();
  }
  ctx.lineWidth = 8 * s;
  ctx.strokeStyle = ctx.fillStyle = b.color(look.top);
  ctx.stroke();
  ctx.fill();
  if (b.plain) return;

  if (look.outfit === 'gi') {
    // encolure en V laissant voir le torse
    const tip = along(
      { x: hip.x + (top.x - hip.x) * 0.35, y: hip.y + (top.y - hip.y) * 0.35 },
      hipHalf * 0.2,
    );
    const a = along(top, shoulderHalf * 0.5);
    const c = along(top, -shoulderHalf * 0.2);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(c.x, c.y);
    ctx.closePath();
    ctx.fillStyle = look.skin;
    ctx.fill();
    ctx.lineWidth = 2 * s;
    ctx.strokeStyle = shade(look.top, -0.35);
    ctx.stroke();
  } else if (look.outfit === 'stripe') {
    b.line([along(top, shoulderHalf * 0.9), along(hip, -hipHalf * 0.6)], 7 * s, look.accent);
  } else if (look.outfit === 'emblem') {
    const center = along({ x: (top.x + hip.x) / 2, y: (top.y + hip.y) / 2 - 8 * s }, 4 * s);
    b.disc(center, 9 * s, look.accent, false);
  }

  // ceinture et son nœud
  ctx.lineCap = 'butt';
  b.line([along(hip, -(hipHalf + 3 * s)), along(hip, hipHalf + 3 * s)], 9 * s, look.belt);
  ctx.lineCap = 'round';
  b.line([hip, { x: hip.x - 6 * s, y: hip.y + 16 * s }], 5 * s, look.belt);
}

function drawHead(b: Brush, look: Look, pose: Pose, sk: Skeleton, time: number): void {
  const { ctx, s } = b;
  const style: HeadStyle = { r: sk.headRadius, s, outline: b.outline, time };
  ctx.save();
  ctx.translate(sk.head.x, sk.head.y);
  ctx.rotate((pose.t * 0.6 + pose.hd + pose.rot) * DEG);
  if (!b.plain) drawBandTails(ctx, look, style);
  b.disc({ x: 0, y: 0 }, sk.headRadius, b.color(look.hair === 'hood' ? look.hairCol : look.skin));
  if (!b.plain) drawHeadDetails(ctx, look, style);
  ctx.restore();
}

/** Dessine le pantin, pieds posés en (x, y). */
export function drawRig(
  ctx: CanvasRenderingContext2D,
  look: Look,
  pose: Pose,
  x: number,
  y: number,
  facing: number,
  opt: RigOptions = {},
): void {
  const s = look.h * (opt.scale ?? 1);
  const bulk = look.bulk;
  const sk = solveSkeleton(pose, look, s, bulk);
  const b = new Brush(ctx, s, opt);
  const time = opt.time ?? 0;

  ctx.save();
  if (opt.alpha !== undefined) ctx.globalAlpha = opt.alpha;
  ctx.translate(x, y);
  ctx.scale(facing * (pose.flip ? -1 : 1), 1);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // de l'arrière-plan vers le premier plan
  drawScarf(b, look, sk, time);
  drawArm(b, look, bulk, sk.shoulderB, sk.elbowB, sk.handB, true);
  drawLeg(b, look, bulk, sk.hipB, sk.kneeB, sk.footB, sk.toeB, true);
  drawLeg(b, look, bulk, sk.hipF, sk.kneeF, sk.footF, sk.toeF, false);
  drawTorso(b, look, bulk, sk);
  drawHead(b, look, pose, sk, time);
  drawArm(b, look, bulk, sk.shoulderF, sk.elbowF, sk.handF, false);
  ctx.restore();
}

/** Portrait carré : gros plan sur la tête du pantin. */
export function drawRigPortrait(ctx: CanvasRenderingContext2D, look: Look, size: number): void {
  const zoom = size / 74;
  const head = solveSkeleton(POSES.idle, look, look.h * zoom, look.bulk).head;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, size, size);
  ctx.clip();
  drawRig(ctx, look, POSES.idle, size * 0.46 - head.x, size * 0.5 - head.y, 1, { scale: zoom });
  ctx.restore();
}
