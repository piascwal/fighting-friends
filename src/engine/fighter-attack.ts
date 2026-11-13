/* Déroulement d'un coup : démarrage, puis ce qui se passe à chaque frame (animation, déplacement,
   projectile, téléportation, enchaînement). Tout est piloté par la définition du coup (MoveDef). */
import { GROUND_Y, STAGE_W, WALL_MARGIN } from '../core/constants';
import { clamp } from '../core/math';
import { NEUTRAL_POSES } from '../data/poses';
import type { MoveDef, MoveId } from '../data/types';
import { JUMPSQUAT_FRAMES, type Fighter } from './fighter';

export function startMove(f: Fighter, id: MoveId): void {
  const move = f.moves[id];
  const chaining = f.state === 'attack';
  if (f.grounded && !chaining) f.faceOpponent();
  f.chain = chaining && f.move?.id === id ? f.chain + 1 : 0;
  if (!chaining) f.used.clear();
  f.used.add(id);

  f.state = 'attack';
  f.move = move;
  f.t = 0;
  f.hitDone.clear();
  f.connected = false;
  f.visible = true;
  f.armorLeft = move.armor ? 1 : 0;
  f.crouching = !!move.low;
  if (move.cost) f.meter -= move.cost;
  if (move.air) f.airAttacks++;
  else if (f.grounded) f.vx = 0;
  if (move.flash) f.world.superFlash(f, move);
  if (move.sfx) {
    // un coup spécial remplit un peu la jauge, même dans le vide
    if (!move.cost) f.meter = Math.min(100, f.meter + 3);
    f.world.emit({ type: 'sfx', name: move.sfx });
  }
  applyAnim(f, move, 0);
}

/** Applique les postures prévues par le coup à cette frame. */
function applyAnim(f: Fighter, move: MoveDef, frame: number): void {
  for (const [at, pose, rate] of move.anim) {
    if (at === frame) f.setPose(pose, rate, NEUTRAL_POSES.has(pose) ? undefined : move.sprite);
  }
}

function teleport(f: Fighter, mode: 'near' | 'front' | 'behind'): void {
  const { emit } = f.world;
  emit({ type: 'dust', x: f.x, y: GROUND_Y, dir: 0, count: 8 });
  if (mode === 'near') {
    // réapparaît au sol, au contact
    f.x = f.opp.x - f.facing * 88;
  } else {
    // réapparaît en l'air, devant ou derrière l'adversaire, et plonge sur lui
    const side = mode === 'behind' ? 1 : -1;
    f.x = f.opp.x + side * f.facing * 80;
    f.y = -250;
    f.faceOpponent();
    f.vx = f.facing * 5.5;
    f.vy = 12;
  }
  f.x = clamp(f.x, WALL_MARGIN, STAGE_W - WALL_MARGIN);
  emit({ type: 'dust', x: f.x, y: GROUND_Y + f.y, dir: 0, count: 8 });
  emit({ type: 'sfx', name: 'slash' });
}

/** Une frame de l'état « attack ». */
export function runAttack(f: Fighter): void {
  const move = f.move!;
  const t = f.t;
  const { emit } = f.world;
  if (t > 0) applyAnim(f, move, t);

  // déplacement imposé par le coup, sinon frottement
  const window = move.vel?.find(([from, to]) => t >= from && t < to);
  if (window) f.vx = window[2] * f.facing;
  else if (f.grounded) f.vx *= move.vel ? 0.7 : 0.8;

  if (move.imp && t === move.imp[0]) {
    f.vx = move.imp[1] * f.facing;
    f.vy = move.imp[2];
    f.y = -1;
    emit({ type: 'dust', x: f.x, y: GROUND_Y, dir: 0, count: 6 });
  }
  if (move.proj && t === move.proj.t) f.world.spawnProjectile(f, move.proj);
  if (move.tele && t === move.tele.t) teleport(f, move.tele.mode);
  if (move.shakeAt === t) {
    emit({ type: 'shake', amount: 12 });
    emit({ type: 'sfx', name: 'earth' });
    emit({ type: 'impact', x: f.x + f.facing * 60, y: GROUND_Y - 6, fx: 'earth', power: 80, dir: f.facing });
  }
  move.hits?.forEach((hit, i) => {
    if (hit.t !== t) return;
    emit({ type: 'swoosh', fighter: f, box: hit.box, kind: hit.sw ?? 'thrust' });
    if (move.rank < 10 || i === 0) emit({ type: 'sfx', name: 'whoosh' });
  });
  f.visible = !(move.vanish && t >= move.vanish[0] && t < move.vanish[1]);

  // lanceur : maintenir ↑ quand il touche enchaîne sur un saut
  if (move.jc && f.connected && f.ctrl.y < 0 && f.grounded) {
    f.jumpDir = f.ctrl.x;
    f.setState('jumpsquat');
    f.t = JUMPSQUAT_FRAMES;
    return;
  }
  if (f.tryAttack()) return;
  if (t >= move.total) {
    if (f.grounded) f.setState('neutral');
    else {
      f.setState('air');
      f.setPose('jump', 0.3);
    }
  }
}
