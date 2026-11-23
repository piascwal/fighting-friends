/* Ce qu'un combattant a le droit de demander au combat qui l'entoure. */
import type { MoveDef, ProjectileDef } from '../data/types';
import type { Emit } from './events';
import type { Fighter } from './fighter';

/** Arène : bords gauche et droit, en pixels monde (les murs sont à WALL_MARGIN à l'intérieur). */
export interface Arena {
  readonly left: number;
  readonly right: number;
}

export interface FighterWorld {
  emit: Emit;
  readonly arena: Arena;
  /** La manche est jouée : un combattant au sol ne se relève plus. */
  readonly roundOver: boolean;
  hasProjectile(owner: Fighter): boolean;
  /** Un projectile adverse approche-t-il de ce combattant ? */
  projectileNear(target: Fighter): boolean;
  spawnProjectile(owner: Fighter, def: ProjectileDef): void;
  superFlash(by: Fighter, move: MoveDef): void;
}
