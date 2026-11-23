/* Super du Padel : la balle rebondit sur le sol et sur les bords de l'écran, et frappe plusieurs fois. */
import { describe, expect, it } from 'vitest';
import { createTraining } from './harness';

describe('balle rebondissante', () => {
  it('rebondit au sol, change de sens sur un bord, et touche plusieurs fois', () => {
    const { sim, pad } = createTraining({ style: 'padel', distance: 250, meter: 100 });
    const dummy = sim.fighters[1];
    pad.commands.push('super');
    let hits = 0;
    let bounces = 0;
    let turns = 0;
    let lastVy = 0;
    let lastVx = 0;
    for (let f = 0; f < 260; f++) {
      pad.step();
      const before = dummy.hp;
      sim.update();
      if (dummy.hp < before) hits++;
      const b = sim.projectiles[0];
      if (!b) continue;
      if (lastVy > 0 && b.vy < 0) bounces++;
      if (lastVx * b.vx < 0) turns++;
      lastVy = b.vy;
      lastVx = b.vx;
    }
    expect(bounces).toBeGreaterThanOrEqual(2);
    expect(turns).toBeGreaterThanOrEqual(1);
    expect(hits).toBeGreaterThanOrEqual(3);
  });
});
