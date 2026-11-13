import { describe, expect, it } from 'vitest';
import { roster } from '../src/data/roster';
import { STYLE_LIST } from '../src/data/styles';
import { autoFight } from './harness';

describe('combats complets console contre console', () => {
  const pairs = roster.flatMap((a) => roster.filter((b) => b !== a).map((b) => [a.id, b.id] as const));

  it.each(pairs)('%s contre %s se termine avec un vainqueur', (a, b) => {
    const { winner, frames, sim } = autoFight(a, b);
    expect(winner).toBeGreaterThanOrEqual(0);
    expect(sim.fighters[winner]!.wins).toBe(2);
    // un combat dure entre 10 secondes et 5 minutes
    expect(frames).toBeGreaterThan(600);
    expect(frames).toBeLessThan(60 * 60 * 5);
  });
});

describe('cohérence des données', () => {
  it.each(STYLE_LIST.map((s) => [s.id, s] as const))('style %s : chaque coup est jouable', (_id, style) => {
    for (const move of Object.values(style.moves)) {
      expect(move.total, move.id).toBeGreaterThan(0);
      for (const h of move.hits ?? []) {
        // une frappe doit commencer et finir avant la fin du coup (sauf coups qui durent jusqu'à l'atterrissage)
        expect(h.t, `${move.id} frappe`).toBeLessThan(move.total);
        expect(h.dmg).toBeGreaterThan(0);
      }
      if (move.rank >= 20) expect(move.cost).toBe(100);
    }
  });

  it('les identifiants de personnages sont uniques', () => {
    expect(new Set(roster.map((c) => c.id)).size).toBe(roster.length);
  });
});
