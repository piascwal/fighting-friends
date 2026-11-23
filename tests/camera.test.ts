/* Caméra et arène : un combattant immobile ne bouge pas à l'écran quand l'autre marche au milieu,
   et l'arène suit la largeur du décor. */
import { describe, expect, it } from 'vitest';
import { STAGE_W, VIEW_W } from '../src/core/constants';
import { Controller } from '../src/engine/controller';
import { FightSim } from '../src/engine/fight';
import { fighterChar } from './harness';

function setup(arenaWidth?: number) {
  const ctrls = [new Controller(), new Controller()] as const;
  const sim = new FightSim({
    chars: [fighterChar('ardan', 'heavy'), fighterChar('bruno', 'padel')],
    ctrls,
    ais: [null, null],
    bodyScales: [1, 1],
    rounds: 2,
    mode: 'training',
    arenaWidth,
  });
  const run = (frames: number, oppX: number) => {
    for (let f = 0; f < frames; f++) {
      ctrls[1].x = oppX;
      ctrls.forEach((c) => c.step());
      sim.update();
    }
  };
  return { sim, run };
}

describe('caméra', () => {
  it("l'adversaire qui avance et recule au milieu ne déplace pas le joueur immobile à l'écran", () => {
    const { sim, run } = setup();
    const [player] = sim.fighters;
    const screenX = () => player.x - sim.camX;
    const start = screenX();
    for (const dir of [-1, 1, -1, 1]) {
      run(30, dir);
      expect(Math.abs(screenX() - start)).toBeLessThan(0.5);
    }
  });

  it("elle suit celui qui s'approche du bord de l'écran", () => {
    const { sim, run } = setup();
    const cam = sim.camX;
    run(200, 1); // l'adversaire recule vers la droite jusqu'au bord
    expect(sim.camX).toBeGreaterThan(cam + 50);
  });

  it("décor large comme un écran : l'arène tient sur un écran, la caméra ne bouge jamais", () => {
    const { sim, run } = setup(VIEW_W);
    const cam = sim.camX;
    run(200, 1);
    expect(sim.camX).toBe(cam);
    expect(sim.arena.right - sim.arena.left).toBe(VIEW_W);
    expect(sim.fighters[1].x).toBeLessThanOrEqual(sim.arena.right);
  });

  it('sans décor en image, toute la largeur du monde', () => {
    const { sim } = setup();
    expect(sim.arena).toEqual({ left: 0, right: STAGE_W });
  });
});
