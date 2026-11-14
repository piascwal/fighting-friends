/* Règles d'enchaînement : quel coup correspond à un appui, et a-t-on le droit de le lancer maintenant ?
   Tout se fait avec UN bouton à la fois (les écrans tactiles gèrent mal deux boutons simultanés) :
   - manipulation + bouton : ↓↘→ + poing, ↓↙← + pied, ↓↓ + poing (super) ;
   - ou séquence en combo : le même bouton fort deux fois (B B → spécial 1, D D → spécial 2),
     puis encore B ou D → SUPER si la jauge est pleine. */
import type { Button, MoveDef, MoveId } from '../data/types';
import type { Fighter } from './fighter';
import { MOTIONS, type BufferedPress } from './input-buffer';

const SPECIAL_RANK = 10;
const SUPER_RANK = 20;
/** Un coup léger peut être répété (A A A). */
const MAX_LIGHT_REPEATS = 2;
const MAX_AIR_ATTACKS = 4;
/** Frames après le décollage pendant lesquelles un coup « partout » peut encore partir. */
const ANYWHERE_AIR_WINDOW = 8;

const isPunch = (b: Button) => b === 'lp' || b === 'hp';
const isHeavy = (b: Button) => b === 'hp' || b === 'hk';

/** Le coup demandé par cet appui, compte tenu des directions et du coup en cours. */
export function selectMove(f: Fighter, press: BufferedPress): MoveId {
  const b = press.button;
  const charged = f.char.style.input === 'charge' ? chargeSpecial(f, press) : null;
  if (charged) return charged;
  if (!f.grounded) return `j${b}`;

  const { input } = f;
  const current = f.state === 'attack' ? f.move : null;
  const superReady = f.meter >= 100;

  if (superReady && isPunch(b) && input.hasMotion(MOTIONS.super, press.frame)) return 'super';

  if (current && f.connected) {
    if (superReady && isHeavy(b) && current.rank === SPECIAL_RANK) return 'super';
    const repeatsPunch = b === 'hp' && (current.id === 'hp' || current.id === 'fhp');
    const repeatsKick = b === 'hk' && (current.id === 'hk' || current.id === 'chk');
    if (repeatsPunch && canStart(f, 's1h')) return 's1h';
    if (repeatsKick && canStart(f, 's2h')) return 's2h';
  }

  const motions = f.char.style.input !== 'charge';
  if (motions && isPunch(b) && input.hasMotion(MOTIONS.quarterForward, press.frame)) {
    const id = b === 'hp' ? 's1h' : 's1l';
    if (canStart(f, id)) return id;
  }
  if (motions && !isPunch(b) && input.hasMotion(MOTIONS.quarterBack, press.frame)) {
    const id = b === 'hk' ? 's2h' : 's2l';
    if (canStart(f, id)) return id;
  }

  if (f.ctrl.y > 0) return `c${b}`;
  if (b === 'hp' && f.ctrl.x * f.facing > 0 && !current) return 'fhp';
  return b;
}

/**
 * Styles « à charge » : arrière tenu puis avant + poing → spécial 1 ; bas tenu puis haut + pied → spécial 2.
 * Le spécial 2 part vers le haut : il est permis tout au début d'un saut (le joueur pousse vers le haut).
 */
function chargeSpecial(f: Fighter, press: BufferedPress): MoveId | null {
  const b = press.button;
  const heavy = isHeavy(b);
  if (isPunch(b) && f.ctrl.x * f.facing > 0 && f.input.hasCharge('back', press.frame)) {
    const id = heavy ? 's1h' : 's1l';
    if (canStart(f, id)) return id;
  }
  if (!isPunch(b) && f.ctrl.y < 0 && f.input.hasCharge('down', press.frame)) {
    const id = heavy ? 's2h' : 's2l';
    if (canStart(f, id)) return id;
  }
  return null;
}

/** Suite d'un coup en cours (enchaînement, posture) déclenchée par ce bouton, s'il y en a une. */
export function followUpFor(f: Fighter, press: BufferedPress): MoveDef | null {
  const followUps = f.state === 'attack' ? f.move?.followUps : undefined;
  if (!followUps || f.ft < followUps.from || f.ft >= followUps.to) return null;
  if (followUps.onHit && !f.connected) return null;
  return followUps.moves[press.button] ?? null;
}

/** Ce coup peut-il démarrer maintenant ? */
export function canStart(f: Fighter, id: MoveId): boolean {
  const move = f.moves[id];
  if (move.cost && f.meter < move.cost) return false;
  // un seul projectile à la fois par combattant
  if (move.proj && f.world.hasProjectile(f)) return false;
  if (!move.anywhere && !!move.air !== !f.grounded) return false;

  switch (f.state) {
    case 'neutral':
      return true;
    case 'dash':
      return f.dashDir > 0 && f.t >= 2;
    case 'air':
      // un coup « partout » ne part qu'au tout début du saut : c'est le geste vers le haut qui l'a lancé
      if (move.anywhere) return f.t < ANYWHERE_AIR_WINDOW;
      return f.airAttacks < MAX_AIR_ATTACKS;
    case 'jumpsquat':
      return !!move.anywhere;
    case 'attack': {
      const current = f.move!;
      // on n'enchaîne que si le coup en cours a touché (ou a été bloqué)
      if (!f.connected || current.rank >= SUPER_RANK) return false;
      // normal ▸ spécial ▸ super
      if (move.rank >= SPECIAL_RANK) return move.rank > current.rank;
      if (current.rank >= SPECIAL_RANK) return false;
      if (move.id === current.id) return move.rank <= 2 && f.chain < MAX_LIGHT_REPEATS;
      // chaque coup normal une fois par enchaînement, dans l'ordre qu'on veut
      return !f.used.has(move.id);
    }
    default:
      return false;
  }
}
