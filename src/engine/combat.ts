/* Collisions et résolution d'un coup : zones vulnérables, zones de frappe, garde, dégâts, projection. */
import { GROUND_Y } from '../core/constants';
import type { HitDef, Launch } from '../data/types';
import type { Fighter } from './fighter';

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface ActiveHit extends Rect {
  index: number;
  hit: HitDef;
}

export type HitResult = 'hit' | 'block' | 'armor';

const MAX_JUGGLE = 8;
const MIN_DAMAGE_SCALE = 0.3;
/** Chaque coup d'un combo fait 10 % de dégâts en moins que le précédent. */
const SCALE_PER_HIT = 0.1;
/** Part des dégâts qui traverse la garde sur un coup spécial. */
const CHIP_RATIO = 0.12;

export const overlaps = (a: Rect, b: Rect): boolean =>
  a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

export function isInvulnerable(f: Fighter): boolean {
  const { state, move } = f;
  if (state === 'down' || state === 'getup' || state === 'lock' || f.juggle >= MAX_JUGGLE) return true;
  if (state === 'dash' && f.dashDir < 0 && f.t < 8) return true;
  return !!(state === 'attack' && move?.inv && f.ft >= move.inv[0] && f.ft < move.inv[1]);
}

/** Zone où le combattant peut être touché (null s'il est invincible). */
export function hurtbox(f: Fighter): Rect | null {
  if (isInvulnerable(f)) return null;
  const s = f.bodyScale;
  const feet = GROUND_Y + f.y;
  const x0 = f.x - 30 * s;
  const x1 = f.x + 30 * s;
  if (!f.grounded) return { x0, x1, y0: feet - 185 * s, y1: feet - 30 * s };
  const lowStates = ['neutral', 'attack', 'hitstun', 'blockstun'];
  const low = (f.crouching && lowStates.includes(f.state)) || f.state === 'recover';
  return { x0, x1, y0: feet - (low ? 132 : 192) * s, y1: feet };
}

/** Zones de frappe actives à cette frame et qui n'ont pas encore touché. */
export function activeHits(f: Fighter): ActiveHit[] {
  const move = f.move;
  if (f.state !== 'attack' || !move?.hits) return [];
  const s = f.bodyScale;
  const feet = GROUND_Y + f.y;
  const out: ActiveHit[] = [];
  move.hits.forEach((hit, index) => {
    if (f.hitDone.has(index) || f.ft < hit.t || f.ft >= hit.t + hit.d) return;
    const [bx, by, bw, bh] = hit.box;
    const xa = f.x + f.facing * bx * s;
    const xb = f.x + f.facing * (bx + bw) * s;
    out.push({
      index,
      hit,
      x0: Math.min(xa, xb),
      x1: Math.max(xa, xb),
      y0: feet + by * s,
      y1: feet + (by + bh) * s,
    });
  });
  return out;
}

/** Le défenseur bloque-t-il ce coup, et dans quelle position ? */
function blockStance(f: Fighter, sourceX: number, hit: HitDef): 'stand' | 'crouch' | null {
  if (!(f.state === 'neutral' || f.state === 'blockstun') || !f.grounded) return null;
  let crouch: boolean;
  if (f.ai) {
    const choice = f.ai.wantBlock(f, hit);
    if (!choice) return null;
    crouch = choice === 'crouch';
  } else {
    // un humain bloque en maintenant la direction opposée à l'attaquant
    const away = f.x >= sourceX ? 1 : -1;
    if (f.ctrl.x !== away) return null;
    crouch = f.ctrl.y > 0;
  }
  if (hit.lvl === 'low' && !crouch) return null;
  if (hit.lvl === 'high' && crouch) return null;
  return crouch ? 'crouch' : 'stand';
}

/**
 * Applique un coup au défenseur.
 * @param dir sens du recul (1 = vers la droite)
 * @param special coup spécial ou projectile : inflige des dégâts même bloqué
 * @returns null si le coup traverse (défenseur invincible)
 */
export function applyHit(
  def: Fighter,
  att: Fighter,
  hit: HitDef,
  dir: number,
  special: boolean,
): HitResult | null {
  if (isInvulnerable(def)) return null;
  const base = hit.dmg * att.power;

  const armor = def.state === 'attack' ? def.move?.armor : undefined;
  if (armor && def.armorLeft > 0 && def.ft >= armor[0] && def.ft < armor[1]) {
    def.armorLeft--;
    def.hp = Math.max(1, def.hp - Math.round(base * 0.5));
    def.flash = 6;
    return 'armor';
  }

  const stance = blockStance(def, att.x, hit);
  if (stance) {
    if (special) def.hp = Math.max(1, def.hp - Math.round(base * CHIP_RATIO));
    def.crouching = stance === 'crouch';
    def.stun = hit.bs;
    def.setState('blockstun');
    def.vx = dir * (hit.kb + 2) * 0.9;
    def.setPose(def.crouching ? 'crouchBlock' : 'block', 0.7);
    return 'block';
  }

  // touché : les dégâts diminuent au fil du combo
  const comboing = def.inHit;
  const scale = Math.max(MIN_DAMAGE_SCALE, 1 - SCALE_PER_HIT * (comboing ? att.combo : 0));
  const dmg = Math.max(1, Math.round(base * scale));
  att.combo = comboing ? att.combo + 1 : 1;
  att.comboDmg = (comboing ? att.comboDmg : 0) + dmg;
  def.hp -= dmg;
  def.lastDmg = dmg;
  def.flash = 6;
  def.visible = true;

  const airborne = !def.grounded || def.state === 'airhit';
  let launch: Launch | undefined = hit.launch ?? (airborne ? [Math.max(2, hit.kb * 0.5), -8] : undefined);
  if (def.hp <= 0) {
    // K.O. : toujours une projection spectaculaire
    def.hp = 0;
    launch = [Math.max(7, launch?.[0] ?? 7), Math.min(-12, launch?.[1] ?? -12)];
  }

  if (launch) {
    def.juggle = def.state === 'airhit' ? def.juggle + 1 : 0;
    def.vx = dir * launch[0];
    def.vy = launch[1] * Math.max(0.45, 1 - 0.12 * def.juggle);
    def.y = Math.min(def.y, -1);
    def.crouching = false;
    def.setState('airhit');
    def.setPose('fall', 0.5);
  } else {
    const hitLow = hit.box[1] + hit.box[3] / 2 > -95;
    const keepsCrouch = ['neutral', 'hitstun', 'blockstun', 'attack'].includes(def.state);
    if (!keepsCrouch) def.crouching = false;
    def.stun = hit.hs;
    def.vx = dir * hit.kb;
    def.setState('hitstun');
    def.setPose(hitLow || def.crouching ? 'hitLow' : 'hit', 0.8);
  }
  return 'hit';
}
