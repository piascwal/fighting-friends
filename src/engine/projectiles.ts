/* Projectiles : déplacement, touche sur l'adversaire, annulation mutuelle de deux projectiles. */
import { GROUND_Y, STAGE_W } from '../core/constants';
import { clamp } from '../core/math';
import type { HitDef, ProjectileDef } from '../data/types';
import { applyHit, hurtbox, overlaps, type HitResult, type Rect } from './combat';
import type { Emit } from './events';
import type { Fighter } from './fighter';

export interface Projectile {
  owner: Fighter;
  def: ProjectileDef;
  x: number;
  y: number;
  vx: number;
  /** Sens de déplacement : 1 = droite. */
  dir: number;
  /** Touches restantes. */
  hits: number;
  /** Frames avant de pouvoir retoucher (projectiles à touches multiples). */
  cooldown: number;
  age: number;
}

const REHIT_DELAY = 7;
const MAX_AGE = 240;

export type OnHit = (
  att: Fighter,
  def: Fighter,
  hit: HitDef,
  result: HitResult,
  x: number,
  y: number,
  dir: number,
) => void;

export function createProjectile(owner: Fighter, def: ProjectileDef): Projectile {
  const s = owner.bodyScale;
  return {
    owner,
    def,
    x: owner.x + owner.facing * (def.x ?? 70) * s,
    y: GROUND_Y + def.y * s,
    vx: def.vx * owner.facing,
    dir: owner.facing,
    hits: def.hits ?? 1,
    cooldown: 0,
    age: 0,
  };
}

export function projectileBox(p: Projectile): Rect {
  const s = p.owner.bodyScale;
  const hw = (p.def.w / 2) * s;
  const hh = (p.def.h / 2) * s;
  return { x0: p.x - hw, x1: p.x + hw, y0: p.y - hh, y1: p.y + hh };
}

/** Avance tous les projectiles d'une frame et renvoie ceux qui restent en jeu. */
export function updateProjectiles(list: Projectile[], emit: Emit, onHit: OnHit): Projectile[] {
  for (const p of list) {
    p.x += p.vx;
    p.age++;
    p.cooldown--;
    hitTarget(p, onHit);
    clash(p, list, emit);
  }
  return list.filter((p) => p.hits > 0 && p.x > -150 && p.x < STAGE_W + 150 && p.age <= MAX_AGE);
}

function hitTarget(p: Projectile, onHit: OnHit): void {
  const target = p.owner.opp;
  const box = hurtbox(target);
  if (!box || p.cooldown > 0 || !overlaps(projectileBox(p), box)) return;
  const d = p.def;
  const hit: HitDef = {
    t: 0,
    d: 1,
    box: [0, d.y, 1, 1],
    dmg: d.dmg,
    hs: d.hs,
    bs: d.bs,
    kb: d.kb,
    lvl: 'mid',
    fx: d.fx,
    launch: p.hits === 1 ? d.launchLast : undefined,
    stop: d.hits ? 5 : undefined,
  };
  const result = applyHit(target, p.owner, hit, p.dir, true);
  if (!result) return;
  p.hits--;
  p.cooldown = REHIT_DELAY;
  // le lanceur peut enchaîner (ex. boule de feu ▸ super) si son projectile touche pendant son animation
  if (p.owner.state === 'attack' && p.owner.move?.proj) p.owner.connected = true;
  onHit(
    p.owner,
    target,
    hit,
    result,
    clamp(p.x + p.dir * 20, box.x0, box.x1),
    clamp(p.y, box.y0, box.y1),
    p.dir,
  );
}

/** Deux projectiles adverses qui se croisent s'annulent. */
function clash(p: Projectile, list: Projectile[], emit: Emit): void {
  for (const q of list) {
    if (q.owner === p.owner || q.hits <= 0 || p.hits <= 0) continue;
    const touching =
      Math.abs(q.x - p.x) < (q.def.w + p.def.w) / 2 && Math.abs(q.y - p.y) < (q.def.h + p.def.h) / 2;
    if (!touching) continue;
    p.hits--;
    q.hits--;
    emit({ type: 'impact', x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, fx: 'elec', power: 80, dir: 1 });
    emit({ type: 'sfx', name: 'block' });
  }
}
