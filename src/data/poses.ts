/* Postures du pantin. Angles en degrés ; un segment à 0 pointe vers le bas, 90 vers l'avant, 180 vers le haut.
   t = inclinaison du buste (+ = vers l'avant), hd = tête, rot = rotation du corps entier.
   aF/aB = bras avant/arrière [bras, avant-bras], lF/lB = jambes avant/arrière [cuisse, tibia].
   Un champ absent reprend la valeur de la posture « idle ». */
import type { SpriteKey } from './sprite-poses';

type Pair = readonly [number, number];
interface RawPose {
  t?: number;
  hd?: number;
  rot?: number;
  flip?: boolean;
  aF?: Pair;
  aB?: Pair;
  lF?: Pair;
  lB?: Pair;
}

const IDLE = { t: 6, hd: 0, aF: [40, 140], aB: [5, 120], lF: [26, 2], lB: [-16, -34] } as const;

const RAW = {
  idle: IDLE,
  idle2: { t: 9, hd: 2, aF: [46, 134], aB: [11, 114], lF: [33, -3], lB: [-21, -41] },
  walkA: { t: 7, lF: [36, 14], lB: [-26, -50] },
  walkB: { t: 7, lF: [-8, -32], lB: [26, 4] },
  // accroupi : fesses presque sur les talons, genou arrière au ras du sol (≈ 60 % de la hauteur debout)
  crouch: { t: 42, hd: -14, aF: [60, 150], aB: [30, 135], lF: [108, -48], lB: [70, -104] },
  jump: { t: 4, aF: [70, 160], aB: [-40, 60], lF: [70, -40], lB: [10, -70] },
  block: { t: -6, hd: -6, aF: [75, 172], aB: [60, 168], lF: [24, 4], lB: [-18, -32] },
  crouchBlock: { t: 32, hd: -12, aF: [75, 172], aB: [60, 168], lF: [108, -48], lB: [70, -104] },
  hit: { t: -24, hd: -28, aF: [-10, 60], aB: [-50, 10], lF: [32, 12], lB: [-8, -28] },
  hitLow: { t: 36, hd: 26, aF: [30, 100], aB: [20, 95], lF: [20, -6], lB: [-20, -42] },
  fall: { rot: -62, t: -6, hd: -16, aF: [-70, -100], aB: [-90, -120], lF: [52, 20], lB: [20, -12] },
  down: { rot: -90, t: 0, hd: 4, aF: [34, 22], aB: [-12, -6], lF: [16, 4], lB: [-4, -16] },
  getup: { t: 42, hd: 10, aF: [30, 10], aB: [20, 0], lF: [95, -20], lB: [50, -90] },
  win: { t: -4, hd: -10, aF: [166, 178], aB: [-34, 44], lF: [14, 4], lB: [-14, -6] },
  intro: { t: 0, hd: 6, aF: [24, 104], aB: [18, 96], lF: [10, 2], lB: [-12, -6] },
  lose: { t: 38, hd: 30, aF: [20, 10], aB: [10, 0], lF: [92, -12], lB: [30, -92] },
  // coups normaux
  windP: { t: -4, aF: [30, 120], aB: [-50, 70] },
  lp: { t: 12, aF: [86, 90], aB: [0, 125], lF: [30, 4], lB: [-20, -36] },
  hp: { t: 24, hd: 4, aF: [-25, 75], aB: [84, 88], lF: [42, 2], lB: [-34, -44] },
  windK: { t: -8, lF: [80, -10], lB: [-4, -10] },
  lk: { t: -12, aF: [30, 130], aB: [-20, 100], lF: [84, 82], lB: [-4, -12] },
  hk: { t: -28, hd: -5, aF: [10, 110], aB: [-50, 40], lF: [120, 126], lB: [4, -6] },
  cLp: { t: 40, hd: -12, aF: [84, 90], aB: [20, 130], lF: [108, -48], lB: [70, -104] },
  cLk: { t: 18, hd: -8, aF: [55, 145], aB: [25, 130], lF: [80, 86], lB: [70, -104] },
  sweep: { t: -32, hd: -5, aF: [20, 100], aB: [-70, -20], lF: [76, 84], lB: [70, -80] },
  windU: { t: 30, hd: 0, aF: [20, 80], aB: [10, 110], lF: [90, -20], lB: [50, -90] },
  upper: { t: -6, hd: -14, aF: [160, 176], aB: [-30, 60], lF: [16, 2], lB: [-14, -24] },
  windO: { t: -12, hd: -6, aF: [150, 215], aB: [20, 110] },
  overhead: { t: 32, hd: 10, aF: [72, 58], aB: [-30, 40], lF: [40, 0], lB: [-30, -44] },
  jP: { t: 28, aF: [62, 56], aB: [-40, 60], lF: [60, -50], lB: [10, -80] },
  jK: { t: 14, aF: [40, 140], aB: [-40, 80], lF: [58, 56], lB: [50, -70] },
  // coups spéciaux
  windCast: { t: -6, aF: [-30, 30], aB: [-50, 10], lF: [30, 0], lB: [-24, -40] },
  cast: { t: 18, aF: [84, 90], aB: [78, 96], lF: [46, -4], lB: [-40, -52] },
  throwS: { t: 22, aF: [96, 82], aB: [-40, 30], lF: [40, 0], lB: [-30, -46] },
  dashP: { t: 38, hd: 8, aF: [88, 92], aB: [-60, -20], lF: [60, -10], lB: [-50, -60] },
  shoulder: { t: 42, hd: 15, aF: [40, 150], aB: [30, 140], lF: [55, -12], lB: [-45, -58] },
  spinK: { t: -20, aF: [-40, 40], aB: [60, 100], lF: [100, 104], lB: [0, -5] },
  spinK2: { t: -20, aF: [-40, 40], aB: [60, 100], lF: [100, 104], lB: [0, -5], flip: true },
  diveK: { rot: 22, t: 10, aF: [-40, 60], aB: [-70, 10], lF: [40, 42], lB: [60, -60] },
  windSlam: { t: -12, hd: -10, aF: [168, 182], aB: [160, 176], lF: [30, 0], lB: [-24, -40] },
  slam: { t: 56, hd: 20, aF: [40, 22], aB: [34, 14], lF: [82, -15], lB: [-30, -72] },
  charge: { t: -6, hd: -12, aF: [80, 172], aB: [-78, -172], lF: [40, 2], lB: [-40, -4] },
  slash: { t: 30, hd: 6, aF: [100, 70], aB: [-60, -10], lF: [50, -6], lB: [-44, -56] },
  slash2: { t: 10, hd: 0, aF: [150, 120], aB: [-30, 60], lF: [44, -4], lB: [-38, -50] },
  dashF: { t: 30, hd: 6, aF: [20, 110], aB: [-40, 40], lF: [56, -14], lB: [-50, -70] },
  dashB: { t: -18, hd: -4, aF: [50, 150], aB: [20, 130], lF: [40, 30], lB: [0, -30] },
  // styles ajoutés : prises, contres, acrobaties, boxe, foudre, ivresse
  grab: { t: 24, hd: 4, aF: [82, 70], aB: [76, 74], lF: [44, -2], lB: [-36, -48] },
  splash: { rot: 62, t: 6, hd: 8, aF: [100, 108], aB: [86, 100], lF: [24, 12], lB: [-8, -22] },
  counterStance: { t: -4, hd: -4, aF: [100, 150], aB: [40, 130], lF: [30, 4], lB: [-24, -36] },
  palm: { t: 22, hd: 2, aF: [92, 92], aB: [-30, 40], lF: [46, -2], lB: [-38, -50] },
  risingSpin: { t: -10, hd: -10, aF: [140, 170], aB: [-60, -20], lF: [110, 100], lB: [20, -60] },
  slide: { t: -40, hd: -8, aF: [10, 60], aB: [-80, -40], lF: [80, 85], lB: [50, -60] },
  hookLunge: { t: 40, hd: 8, aF: [70, 110], aB: [-50, -20], lF: [64, -14], lB: [-56, -66] },
  axeKick: { t: -10, hd: -6, aF: [30, 120], aB: [-20, 90], lF: [168, 174], lB: [0, -6] },
  skyCall: { t: -8, hd: -16, aF: [176, 180], aB: [-40, 30], lF: [28, 2], lB: [-26, -36] },
  sway: { t: -30, hd: -20, aF: [60, 170], aB: [-20, 40], lF: [40, 30], lB: [-10, -40] },
  lobThrow: { t: 16, hd: -4, aF: [124, 150], aB: [-30, 30], lF: [40, 0], lB: [-30, -46] },
} satisfies Record<string, RawPose>;

export type PoseName = keyof typeof RAW;

/** Posture « à plat » : un nombre par articulation, facile à interpoler. */
export interface Pose {
  t: number;
  hd: number;
  rot: number;
  aF0: number;
  aF1: number;
  aB0: number;
  aB1: number;
  lF0: number;
  lF1: number;
  lB0: number;
  lB1: number;
  /** Dessiné en miroir (coups tournoyants). */
  flip: boolean;
}

const ANGLE_KEYS = ['t', 'hd', 'rot', 'aF0', 'aF1', 'aB0', 'aB1', 'lF0', 'lF1', 'lB0', 'lB1'] as const;

function flatten(raw: RawPose): Pose {
  const aF = raw.aF ?? IDLE.aF;
  const aB = raw.aB ?? IDLE.aB;
  const lF = raw.lF ?? IDLE.lF;
  const lB = raw.lB ?? IDLE.lB;
  return {
    t: raw.t ?? IDLE.t,
    hd: raw.hd ?? 0,
    rot: raw.rot ?? 0,
    flip: raw.flip ?? false,
    aF0: aF[0],
    aF1: aF[1],
    aB0: aB[0],
    aB1: aB[1],
    lF0: lF[0],
    lF1: lF[1],
    lB0: lB[0],
    lB1: lB[1],
  };
}

export const POSES = Object.fromEntries(
  Object.entries(RAW).map(([name, raw]) => [name, flatten(raw)]),
) as Record<PoseName, Pose>;

export const clonePose = (name: PoseName): Pose => ({ ...POSES[name] });

/** Rapproche `current` de `target` (lissage exponentiel) ; rate = 1 → instantané. */
export function approachPose(current: Pose, target: Pose, rate: number): void {
  for (const k of ANGLE_KEYS) current[k] += (target[k] - current[k]) * rate;
  current.flip = target.flip;
}

/** Mélange deux postures dans `out` (k = 0 → a, k = 1 → b). */
export function mixPose(a: Pose, b: Pose, k: number, out: Pose): Pose {
  for (const key of ANGLE_KEYS) out[key] = a[key] + (b[key] - a[key]) * k;
  out.flip = k < 0.5 ? a.flip : b.flip;
  return out;
}

/** Sprite affiché pour chaque posture quand le personnage a ses propres images. */
export const POSE_SPRITE: Record<PoseName, SpriteKey> = {
  idle: 'idle',
  idle2: 'idle',
  walkA: 'walk1',
  walkB: 'walk2',
  crouch: 'crouch',
  jump: 'jump',
  block: 'block',
  crouchBlock: 'crouch_block',
  hit: 'hit',
  hitLow: 'hit',
  fall: 'fall',
  down: 'down',
  getup: 'crouch',
  win: 'win',
  intro: 'intro',
  lose: 'crouch',
  windP: 'idle',
  lp: 'punch_light',
  hp: 'punch_heavy',
  windK: 'idle',
  lk: 'kick_light',
  hk: 'kick_heavy',
  cLp: 'crouch_punch',
  cLk: 'crouch_kick',
  sweep: 'crouch_kick',
  windU: 'crouch',
  upper: 'uppercut',
  windO: 'idle',
  overhead: 'punch_heavy',
  jP: 'jump_punch',
  jK: 'jump_kick',
  windCast: 'idle',
  cast: 'sp_energy_cast',
  throwS: 'sp_blade_throw',
  dashP: 'sp_dash_punch',
  shoulder: 'sp_shoulder_charge',
  spinK: 'sp_spin_kick',
  spinK2: 'sp_spin_kick',
  diveK: 'sp_dive_kick',
  windSlam: 'idle',
  slam: 'sp_ground_slam',
  charge: 'super',
  slash: 'punch_heavy',
  slash2: 'uppercut',
  dashF: 'walk1',
  dashB: 'idle',
  grab: 'sp_grab',
  splash: 'sp_body_splash',
  counterStance: 'sp_counter_stance',
  palm: 'sp_palm_strike',
  risingSpin: 'sp_rising_spin',
  slide: 'sp_slide',
  hookLunge: 'sp_hook_lunge',
  axeKick: 'sp_axe_kick',
  skyCall: 'sp_sky_call',
  sway: 'sp_sway',
  lobThrow: 'sp_lob_throw',
};

/** Postures de préparation : pendant un coup, elles gardent leur propre sprite au lieu de celui du coup. */
export const NEUTRAL_POSES: ReadonlySet<PoseName> = new Set<PoseName>([
  'windP',
  'windK',
  'windU',
  'windO',
  'windCast',
  'windSlam',
  'idle',
  'crouch',
  'charge',
  // en l'air : entre deux coups, le corps se replie (on voit le pied partir et revenir)
  'jump',
]);
