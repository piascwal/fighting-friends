/* Style Flemmard : une-deux au ballon qui revient, sieste qui encaisse et soigne. */
import { describe, expect, it } from 'vitest';
import type { MoveId } from '../src/data/types';
import { createTraining } from './harness';

/** Lance un coup ; suit le ballon et compte les touches sur l'adversaire. */
function ball(id: MoveId, distance: number, frames = 120) {
  const { sim, pad } = createTraining({ style: 'lazy', distance, meter: 100 });
  const [player, dummy] = sim.fighters;
  pad.commands.push(id);
  const xs: number[] = [];
  let hits = 0;
  for (let f = 0; f < frames; f++) {
    pad.step();
    const before = dummy.hp;
    sim.update();
    if (dummy.hp < before) hits++;
    const b = sim.projectiles[0];
    if (b) xs.push(b.x);
  }
  return { player, xs, hits };
}

describe('flemmard', () => {
  it('le ballon fait demi-tour et revient vers son lanceur', () => {
    const { xs, player } = ball('s1h', 420);
    const far = Math.max(...xs);
    expect(far).toBeGreaterThan(player.x + 120);
    expect(xs.at(-1)!).toBeLessThan(far - 60);
  });

  it('le ballon touche aussi à bout portant (aller puis retour possibles)', () => {
    expect(ball('s1l', 120).hits).toBeGreaterThanOrEqual(1);
  });

  it('la sieste soigne', () => {
    const { sim, pad } = createTraining({ style: 'lazy', distance: 300 });
    const me = sim.fighters[0];
    me.hp = 500;
    pad.commands.push('s2h');
    for (let f = 0; f < 120; f++) {
      pad.step();
      sim.update();
    }
    expect(me.hp).toBeGreaterThan(500);
  });
});
