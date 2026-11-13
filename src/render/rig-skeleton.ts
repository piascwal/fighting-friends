/* Squelette du pantin : transforme une posture (angles) en positions d'articulations. */
import type { Pose } from '../data/poses';
import type { Look } from '../data/types';

export interface Point {
  x: number;
  y: number;
}

/** Positions des articulations, relatives au point d'appui au sol (y = 0 : le sol). */
export interface Skeleton {
  hip: Point;
  /** Base du cou. */
  neck: Point;
  head: Point;
  shoulderF: Point;
  elbowF: Point;
  handF: Point;
  shoulderB: Point;
  elbowB: Point;
  handB: Point;
  hipF: Point;
  kneeF: Point;
  footF: Point;
  toeF: Point;
  hipB: Point;
  kneeB: Point;
  footB: Point;
  toeB: Point;
  headRadius: number;
}

const DEG = Math.PI / 180;
// longueurs des segments pour un personnage de taille 1 (≈ 200 px debout)
const THIGH = 46;
const SHIN = 46;
const TORSO = 60;
const UPPER_ARM = 33;
const FOREARM = 32;
const HEAD_RADIUS = 19;
const FOOT = 15;

/** Extrémité d'un segment partant de `from` : angle 0 = vers le bas, 90 = vers l'avant. */
function segment(from: Point, angle: number, length: number): Point {
  return { x: from.x + Math.sin(angle * DEG) * length, y: from.y + Math.cos(angle * DEG) * length };
}

/**
 * @param s échelle globale (taille du personnage × zoom)
 * @param bulk corpulence
 */
export function solveSkeleton(pose: Pose, look: Look, s: number, bulk: number): Skeleton {
  const headRadius = HEAD_RADIUS * s * (look.head ?? 1);
  const hip: Point = { x: 0, y: 0 };
  const neck: Point = { x: Math.sin(pose.t * DEG) * TORSO * s, y: -Math.cos(pose.t * DEG) * TORSO * s };
  const headAngle = (pose.t * 0.6 + pose.hd) * DEG;
  const headDist = 5 * s + headRadius;
  const head: Point = {
    x: neck.x + Math.sin(headAngle) * headDist,
    y: neck.y - Math.cos(headAngle) * headDist,
  };

  const shoulderF: Point = { x: neck.x + 5 * s * bulk, y: neck.y + 5 * s };
  const shoulderB: Point = { x: neck.x - 6 * s * bulk, y: neck.y + 5 * s };
  const elbowF = segment(shoulderF, pose.aF0, UPPER_ARM * s);
  const elbowB = segment(shoulderB, pose.aB0, UPPER_ARM * s);
  const hipF: Point = { x: 5 * s * bulk, y: 0 };
  const hipB: Point = { x: -5 * s * bulk, y: 0 };
  const kneeF = segment(hipF, pose.lF0, THIGH * s);
  const kneeB = segment(hipB, pose.lB0, THIGH * s);
  const footF = segment(kneeF, pose.lF1, SHIN * s);
  const footB = segment(kneeB, pose.lB1, SHIN * s);

  const sk: Skeleton = {
    hip,
    neck,
    head,
    shoulderF,
    elbowF,
    handF: segment(elbowF, pose.aF1, FOREARM * s),
    shoulderB,
    elbowB,
    handB: segment(elbowB, pose.aB1, FOREARM * s),
    hipF,
    kneeF,
    footF,
    toeF: segment(footF, pose.lF1 + 82, FOOT * s),
    hipB,
    kneeB,
    footB,
    toeB: segment(footB, pose.lB1 + 82, FOOT * s),
    headRadius,
  };
  const points = Object.values(sk).filter((v): v is Point => typeof v === 'object');

  // rotation du corps entier (chutes, plongeons)
  if (pose.rot) {
    const cos = Math.cos(pose.rot * DEG);
    const sin = Math.sin(pose.rot * DEG);
    for (const p of points) {
      const x = p.x * cos - p.y * sin;
      p.y = p.x * sin + p.y * cos;
      p.x = x;
    }
  }

  // ancrage automatique : le point le plus bas du corps touche le sol, quelle que soit la posture
  const limb = 9 * s * bulk;
  const lowest = Math.max(
    sk.footF.y + limb,
    sk.footB.y + limb,
    sk.toeF.y + limb * 0.7,
    sk.toeB.y + limb * 0.7,
    sk.kneeF.y + limb,
    sk.kneeB.y + limb,
    sk.hip.y + 15 * s,
    sk.head.y + headRadius,
    sk.handF.y + 7 * s,
    sk.handB.y + 7 * s,
    sk.neck.y + 16 * s,
  );
  for (const p of points) p.y -= lowest;
  return sk;
}
