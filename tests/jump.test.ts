/* Saut : assez haut pour passer par-dessus l'adversaire, sans devenir flottant. */
import { describe, expect, it } from 'vitest';
import { STYLE_LIST } from '../src/data/styles';
import { createTraining } from './harness';

describe('saut par-dessus', () => {
  it.each(STYLE_LIST.map((s) => [s.id] as const))('%s : un saut en avant passe de l’autre côté', (style) => {
    const { sim, pad } = createTraining({ style, distance: 130 });
    const [player, dummy] = sim.fighters;
    pad.x = 1;
    pad.y = -1;
    let top = 0;
    for (let f = 0; f < 60; f++) {
      pad.step();
      sim.update();
      if (f > 2) pad.y = 0;
      top = Math.min(top, player.y);
      if (f > 5 && player.grounded) pad.x = 0;
    }
    expect(-top).toBeGreaterThan(200);
    expect(player.x).toBeGreaterThan(dummy.x); // retombé dans son dos
    expect(player.facing).toBe(-1); // et retourné vers lui
  });
});
