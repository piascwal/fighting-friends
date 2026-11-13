/* Règles d'enchaînement : quel coup correspond à un appui, et a-t-on le droit de le lancer maintenant ?
   Tout se fait avec UN bouton à la fois (les écrans tactiles gèrent mal deux boutons simultanés) :
   - manipulation + bouton : ↓↘→ + poing, ↓↙← + pied, ↓↓ + poing (super) ;
   - ou séquence en combo : le même bouton fort deux fois (B B → spécial 1, D D → spécial 2),
     puis encore B ou D → SUPER si la jauge est pleine. */
import type { Button, MoveId } from '../data/types';
import type { Fighter } from './fighter';
import { MOTIONS, type BufferedPress } from './input-buffer';

const SPECIAL_RANK = 10;
const SUPER_RANK = 20;
/** Un coup léger peut être répété (A A A). */
const MAX_LIGHT_REPEATS = 2;
const MAX_AIR_ATTACKS = 4;

const isPunch = (b: Button) => b === 'lp' || b === 'hp';
const isHeavy = (b: Button) => b === 'hp' || b === 'hk';

/** Le coup demandé par cet appui, compte tenu des directions et du coup en cours. */
export function selectMove(f: Fighter, press: BufferedPress): MoveId {
  const b = press.button;
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

  if (isPunch(b) && input.hasMotion(MOTIONS.quarterForward, press.frame)) {
    const id = b === 'hp' ? 's1h' : 's1l';
    if (canStart(f, id)) return id;
  }
  if (!isPunch(b) && input.hasMotion(MOTIONS.quarterBack, press.frame)) {
    const id = b === 'hk' ? 's2h' : 's2l';
    if (canStart(f, id)) return id;
  }

  if (f.ctrl.y > 0) return `c${b}`;
  if (b === 'hp' && f.ctrl.x * f.facing > 0 && !current) return 'fhp';
  return b;
}

/** Ce coup peut-il démarrer maintenant ? */
export function canStart(f: Fighter, id: MoveId): boolean {
  const move = f.moves[id];
  if (move.cost && f.meter < move.cost) return false;
  // un seul projectile à la fois par combattant
  if (move.proj && f.world.hasProjectile(f)) return false;
  if (!!move.air !== !f.grounded) return false;

  switch (f.state) {
    case 'neutral':
      return true;
    case 'dash':
      return f.dashDir > 0 && f.t >= 2;
    case 'air':
      return f.airAttacks < MAX_AIR_ATTACKS;
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
