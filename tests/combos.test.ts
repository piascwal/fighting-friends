import { describe, expect, it } from 'vitest';
import { roster } from '../src/data/roster';
import { press, run, wait } from './harness';

const everyone = roster.map((c) => c.id);

describe.each(everyone)('enchaînements de %s', (char) => {
  it('enchaîne les 4 boutons après des coups légers répétés (A A A C B D)', () => {
    const r = run({ char }, [
      wait(3),
      press('lp'),
      press('lp'),
      press('lp'),
      press('lk'),
      press('hp', 9),
      press('hk', 40),
    ]);
    expect(r.moves).toEqual(['lp', 'lk', 'hp', 'hk']);
    expect(r.maxCombo).toBe(6);
  });

  it('B puis B déclenche le spécial 1', () => {
    const r = run({ char }, [wait(3), press('lp'), press('lk'), press('hp', 9), press('hp', 60)]);
    expect(r.moves).toEqual(['lp', 'lk', 'hp', 's1h']);
    expect(r.maxCombo).toBeGreaterThanOrEqual(4);
  });

  it('D puis D déclenche le spécial 2', () => {
    const r = run({ char }, [
      wait(3),
      press('lp'),
      press('lk'),
      press('hp', 9),
      press('hk', 11),
      press('hk', 70),
    ]);
    expect(r.moves).toEqual(['lp', 'lk', 'hp', 'hk', 's2h']);
  });

  it('un troisième B lance le super quand la jauge est pleine', () => {
    const r = run({ char, meter: 100 }, [
      wait(3),
      press('lp'),
      press('lk'),
      press('hp', 9),
      press('hp', 10),
      press('hp', 120),
    ]);
    expect(r.moves).toEqual(['lp', 'lk', 'hp', 's1h', 'super']);
    expect(r.sim.fighters[0].meter).toBeLessThan(100);
  });

  it('sans jauge, le troisième B ne fait pas de super', () => {
    const r = run({ char }, [
      wait(3),
      press('lp'),
      press('lk'),
      press('hp', 9),
      press('hp', 10),
      press('hp', 120),
    ]);
    expect(r.moves).not.toContain('super');
  });

  it("le lanceur permet de continuer le combo en l'air", () => {
    const r = run({ char, distance: 80 }, [
      wait(3),
      { y: 1, press: 'hp', frames: 9 },
      { y: -1, x: 1, frames: 8 },
      press('lp', 6),
      press('lk', 6),
      press('hp', 7),
      press('hk', 40),
    ]);
    expect(r.moves).toEqual(['chp', 'jlp', 'jlk', 'jhp', 'jhk']);
    expect(r.maxCombo).toBe(5);
  });
});

describe('règles générales', () => {
  it("un coup qui ne touche pas ne s'enchaîne pas", () => {
    const r = run({ distance: 400 }, [wait(3), press('lp'), press('lk'), press('hp', 30)]);
    expect(r.moves[0]).toBe('lp');
    expect(r.maxCombo).toBe(0);
    // chaque coup attend la fin du précédent : en 44 frames, pas le temps de sortir les trois
    expect(r.moves.length).toBeLessThan(4);
  });

  it('un même coup fort ne se répète pas dans un enchaînement', () => {
    const r = run({ char: 'ardan' }, [wait(3), press('lk'), press('hk', 11), press('lk', 30)]);
    expect(r.moves.filter((m) => m === 'lk')).toHaveLength(1);
  });

  it('les dégâts diminuent au fil du combo', () => {
    const one = run({}, [wait(3), press('hp', 40)]);
    const chained = run({}, [wait(3), press('lp'), press('lk'), press('hp', 40)]);
    const lastHit = chained.damage - run({}, [wait(3), press('lp'), press('lk', 30)]).damage;
    expect(lastHit).toBeLessThan(one.damage);
  });

  it("un appui fait pendant l'arrêt sur image n'est pas perdu", () => {
    // le 2e bouton est pressé 4 frames après le 1er, donc en plein impact
    const r = run({}, [wait(3), press('hp', 7), press('hk', 40)]);
    expect(r.moves).toEqual(['hp', 'hk']);
    expect(r.maxCombo).toBe(2);
  });
});
