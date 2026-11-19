/* Coups à distance fixe (pic de glace, foudre) : seuls, ils frappent loin ; en combo, sous l'adversaire. */
import { describe, expect, it } from 'vitest';
import type { MoveId, StyleId } from '../src/data/types';
import { createTraining, press, run } from './harness';

/** Dégâts d'un coup lancé seul (par ordre direct), l'adversaire collé à soi. */
function aloneDamage(style: StyleId, id: MoveId): number {
  const { sim, pad } = createTraining({ style, distance: 85 });
  const dummy = sim.fighters[1];
  pad.commands.push(id);
  let dealt = 0;
  for (let f = 0; f < 90; f++) {
    pad.step();
    const before = dummy.hp;
    sim.update();
    if (dummy.hp < before) dealt += before - dummy.hp;
  }
  return dealt;
}

describe('coups à distance fixe en combo', () => {
  it.each([
    ['ice', 's2h'],
    ['storm', 's1h'],
  ] as const)('%s : lancé seul au contact, %s passe loin derrière l’adversaire', (style, id) => {
    expect(aloneDamage(style, id)).toBe(0);
  });

  it('givre : pied fort, puis pied fort encore en combo → le pic surgit sous l’adversaire et touche', () => {
    const r = run({ style: 'ice', distance: 85 }, [press('hk', 9), press('hk', 70)]);
    expect(r.moves).toContain('s2h');
    expect(r.maxCombo).toBeGreaterThanOrEqual(2);
  });

  it('tempête : poing fort, puis poing fort encore en combo → la foudre tombe sur l’adversaire', () => {
    const r = run({ style: 'storm', distance: 85 }, [press('hp', 9), press('hp', 70)]);
    expect(r.moves).toContain('s1h');
    expect(r.maxCombo).toBeGreaterThanOrEqual(2);
  });
});
