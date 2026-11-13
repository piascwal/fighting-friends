/* Outils de test : un combat d'entraînement piloté par un script d'entrées, sans navigateur. */
import { characterById } from '../src/data/roster';
import type { Button, MoveId } from '../src/data/types';
import { Ai } from '../src/engine/ai';
import { Controller } from '../src/engine/controller';
import { FightSim, type FightMode } from '../src/engine/fight';

/** Une étape du script : directions tenues pendant `frames`, bouton pressé à la première frame. */
export interface Step {
  frames?: number;
  x?: number;
  y?: number;
  press?: Button;
}

export interface RunResult {
  /** Coups réellement sortis, dans l'ordre. */
  moves: MoveId[];
  maxCombo: number;
  damage: number;
  sim: FightSim;
}

export interface Setup {
  char?: string;
  opponent?: string;
  /** Distance initiale entre les deux combattants. */
  distance?: number;
  meter?: number;
  /** L'adversaire est piloté par le test (via sa manette) au lieu d'être un mannequin immobile. */
  humanOpponent?: boolean;
}

export function createTraining(setup: Setup = {}): { sim: FightSim; pad: Controller } {
  const pad = new Controller();
  const sim = new FightSim({
    chars: [characterById(setup.char ?? 'ardan')!, characterById(setup.opponent ?? 'bruno')!],
    ctrls: [pad, new Controller()],
    ais: [null, setup.humanOpponent ? null : new Ai(0, true)],
    bodyScales: [1, 1],
    rounds: 2,
    mode: 'training',
  });
  const [player, dummy] = sim.fighters;
  player.x = dummy.x - (setup.distance ?? 85);
  player.meter = setup.meter ?? 0;
  return { sim, pad };
}

export function run(setup: Setup, script: Step[]): RunResult {
  const { sim, pad } = createTraining(setup);
  const player = sim.fighters[0];
  const moves: MoveId[] = [];
  let last: MoveId | null = null;
  let maxCombo = 0;
  let damage = 0;
  for (const step of script) {
    for (let i = 0; i < (step.frames ?? 1); i++) {
      pad.x = step.x ?? 0;
      pad.y = step.y ?? 0;
      if (i === 0 && step.press) pad.press(step.press);
      pad.step();
      sim.update();
      const id = player.move?.id ?? null;
      if (id && id !== last) moves.push(id);
      last = id;
      if (player.combo > maxCombo) {
        maxCombo = player.combo;
        damage = player.comboDmg;
      }
    }
  }
  return { moves, maxCombo, damage, sim };
}

/** Appui sur un bouton, puis attente. */
export const press = (button: Button, frames = 7): Step => ({ press: button, frames });
export const wait = (frames: number): Step => ({ frames });

/** Combat complet console contre console ; renvoie le vainqueur et la durée en frames. */
export function autoFight(a: string, b: string, mode: FightMode = 'match') {
  let winner = -1;
  const ctrls = [new Controller(), new Controller()] as const;
  const sim = new FightSim({
    chars: [characterById(a)!, characterById(b)!],
    ctrls,
    ais: [new Ai(2), new Ai(2)],
    bodyScales: [1, 1],
    rounds: 2,
    mode,
    onEnd: (w) => (winner = w),
  });
  let frames = 0;
  while (winner < 0 && frames < 60 * 60 * 10) {
    ctrls.forEach((c) => c.step());
    sim.update();
    frames++;
  }
  return { winner, frames, sim };
}
