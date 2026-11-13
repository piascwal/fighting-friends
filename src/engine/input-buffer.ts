/* Mémoire des entrées d'un combattant : appuis récents et historique des directions.
   C'est elle qui rend le jeu tolérant : un bouton pressé un peu trop tôt est joué dès que possible,
   et une manipulation (quart de cercle) n'a pas besoin d'être parfaite. */
import type { Button } from '../data/types';
import type { AiCommand, Controller } from './controller';

/** Durée de vie d'un appui, en frames simulées (l'arrêt sur image ne compte pas). */
export const PRESS_BUFFER = 12;
const COMMAND_BUFFER = 12;
const HISTORY_SIZE = 24;

/* Directions en notation « pavé numérique », relatives au regard du combattant :
   7 8 9
   4 5 6    6 = avant, 4 = arrière, 2 = bas, 5 = neutre
   1 2 3 */
export const MOTIONS = {
  /** ↓ ↘ → (on tolère de finir en diagonale) */
  quarterForward: [
    [2, 6],
    [2, 3],
  ],
  /** ↓ ↙ ← */
  quarterBack: [
    [2, 4],
    [2, 1],
  ],
  /** ↓↘→ ↓↘→, ou plus simple : ↓ ↓ */
  super: [
    [2, 6, 2, 6],
    [2, 3, 2, 3],
    [2, 5, 2],
  ],
} as const;

export interface BufferedPress {
  button: Button;
  /** Frame réelle de l'appui (sert à dater les manipulations). */
  frame: number;
  /** Frame simulée de l'appui (sert à l'expiration). */
  clock: number;
  used: boolean;
}

interface DirectionEntry {
  dir: number;
  frame: number;
}

export class InputBuffer {
  /** Compte toutes les frames, arrêt sur image compris. */
  frame = 0;
  /** Compte uniquement les frames simulées. */
  clock = 0;
  /** 1 = ruée avant demandée, -1 = esquive arrière, 0 = rien. */
  dashRequest = 0;
  private dashFrame = 0;
  private dirs: DirectionEntry[] = [{ dir: 5, frame: 0 }];
  private presses: BufferedPress[] = [];
  private command: { id: AiCommand; clock: number } | null = null;

  reset(): void {
    this.frame = 0;
    this.clock = 0;
    this.dashRequest = 0;
    this.dirs = [{ dir: 5, frame: 0 }];
    this.presses = [];
    this.command = null;
  }

  /** À appeler à chaque frame réelle, même pendant l'arrêt sur image. */
  read(ctrl: Controller, facing: number): void {
    this.frame++;
    const dir = 5 + ctrl.x * facing - 3 * ctrl.y;
    const last = this.dirs[this.dirs.length - 1]!;
    if (dir !== last.dir) {
      this.dirs.push({ dir, frame: this.frame });
      if (this.dirs.length > HISTORY_SIZE) this.dirs.shift();
      this.detectDash(dir);
    }
    for (const button of ctrl.pressed) {
      this.presses.push({ button, frame: this.frame, clock: this.clock, used: false });
    }
    if (this.presses.length > 12) this.presses.splice(0, this.presses.length - 12);
    if (ctrl.commands.length) {
      this.command = { id: ctrl.commands[ctrl.commands.length - 1]!, clock: this.clock };
      ctrl.commands.length = 0;
    }
    if (this.dashRequest && this.frame - this.dashFrame > 6) this.dashRequest = 0;
  }

  /** À appeler à chaque frame simulée. */
  tick(): void {
    this.clock++;
  }

  /** Deux pressions rapides dans la même direction (→ → ou ← ←). */
  private detectDash(dir: number): void {
    if (dir !== 6 && dir !== 4) return;
    const n = this.dirs.length;
    if (n < 3) return;
    const release = this.dirs[n - 2]!;
    const first = this.dirs[n - 3]!;
    const quick = this.frame - release.frame <= 9 && release.frame - first.frame <= 14;
    if (release.dir === 5 && first.dir === dir && quick) {
      this.dashRequest = dir === 6 ? 1 : -1;
      this.dashFrame = this.frame;
    }
  }

  /** La suite de directions a-t-elle été faite juste avant l'appui à `pressFrame` ? */
  private matches(seq: readonly number[], pressFrame: number): boolean {
    let need = seq.length - 1;
    let lastFrame = 0;
    for (let i = this.dirs.length - 1; i >= 0 && need >= 0; i--) {
      const entry = this.dirs[i]!;
      if (entry.dir === seq[need]) {
        if (need === seq.length - 1) {
          // la dernière direction doit être encore tenue, ou relâchée depuis très peu
          const heldUntil = i + 1 < this.dirs.length ? this.dirs[i + 1]!.frame : this.frame;
          if (heldUntil < pressFrame - 11) return false;
        } else if (lastFrame - entry.frame > 18) {
          return false;
        }
        lastFrame = entry.frame;
        need--;
      } else if (pressFrame - entry.frame > 60) {
        return false;
      }
    }
    return need < 0;
  }

  hasMotion(variants: readonly (readonly number[])[], pressFrame: number): boolean {
    return variants.some((seq) => this.matches(seq, pressFrame));
  }

  /** L'appui le plus récent encore valable et pas encore joué. */
  pendingPress(): BufferedPress | null {
    for (let i = this.presses.length - 1; i >= 0; i--) {
      const press = this.presses[i]!;
      if (!press.used && this.clock - press.clock <= PRESS_BUFFER) return press;
    }
    return null;
  }

  /** Marque cet appui (et les plus anciens) comme joués. */
  consume(press: BufferedPress): void {
    for (const p of this.presses) if (p.clock <= press.clock) p.used = true;
  }

  pendingCommand(): AiCommand | null {
    return this.command && this.clock - this.command.clock <= COMMAND_BUFFER ? this.command.id : null;
  }

  clearCommand(): void {
    this.command = null;
  }
}
