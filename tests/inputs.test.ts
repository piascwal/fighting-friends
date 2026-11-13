import { describe, expect, it } from 'vitest';
import { run, wait, type Step } from './harness';

const far = { distance: 300 };
const quarterForward: Step[] = [
  { y: 1, frames: 3 },
  { x: 1, y: 1, frames: 3 },
  { x: 1, frames: 2 },
];
const quarterBack: Step[] = [
  { y: 1, frames: 3 },
  { x: -1, y: 1, frames: 3 },
  { x: -1, frames: 2 },
];

describe('manipulations', () => {
  it('↓↘→ + poing léger lance le spécial 1 léger', () => {
    const r = run(far, [wait(5), ...quarterForward, { x: 1, press: 'lp', frames: 40 }]);
    expect(r.moves).toEqual(['s1l']);
  });

  it('↓↘ + poing fort suffit (fin en diagonale tolérée)', () => {
    const r = run(far, [
      wait(5),
      { y: 1, frames: 3 },
      { x: 1, y: 1, frames: 3 },
      { x: 1, y: 1, press: 'hp', frames: 40 },
    ]);
    expect(r.moves).toEqual(['s1h']);
  });

  it('↓↙← + pied fort lance le spécial 2 fort', () => {
    const r = run(far, [wait(5), ...quarterBack, { x: -1, press: 'hk', frames: 40 }]);
    expect(r.moves).toEqual(['s2h']);
  });

  it('↓ ↓ + poing lance le super si la jauge est pleine', () => {
    const tapTwice: Step[] = [{ y: 1, frames: 3 }, wait(3), { y: 1, frames: 3 }];
    const full = run({ ...far, meter: 100 }, [wait(5), ...tapTwice, { y: 1, press: 'hp', frames: 40 }]);
    expect(full.moves).toEqual(['super']);
    const empty = run(far, [wait(5), ...tapTwice, { y: 1, press: 'hp', frames: 40 }]);
    expect(empty.moves).toEqual(['chp']);
  });

  it('rester accroupi et frapper deux fois ne déclenche pas le super', () => {
    const r = run({ meter: 100 }, [
      wait(5),
      { y: 1, frames: 6 },
      { y: 1, press: 'lp', frames: 8 },
      { y: 1, press: 'lp', frames: 20 },
    ]);
    expect(r.moves).toEqual(['clp']);
    expect(r.maxCombo).toBe(2);
  });

  it('→ → déclenche une ruée', () => {
    const { sim } = run(far, [wait(5), { x: 1, frames: 3 }, wait(3), { x: 1, frames: 1 }]);
    expect(sim.fighters[0].state).toBe('dash');
  });

  it('↓ + bouton donne le coup accroupi, → + poing fort le marteau', () => {
    expect(run(far, [wait(5), { y: 1, press: 'lk', frames: 20 }]).moves).toEqual(['clk']);
    expect(run(far, [wait(5), { x: 1, frames: 20 }, { x: 1, press: 'hp', frames: 20 }]).moves).toEqual([
      'fhp',
    ]);
  });
});

describe('garde', () => {
  const attackerSetup = { char: 'ardan', opponent: 'bruno', humanOpponent: true };

  it('reculer bloque un coup debout, pas une balayette', async () => {
    const { createTraining } = await import('./harness');
    const blockTest = (attack: Step, defendY: number) => {
      const { sim, pad } = createTraining(attackerSetup);
      const [player, dummy] = sim.fighters;
      // le défenseur est un humain qui recule
      const defender = dummy.ctrl;
      for (let i = 0; i < 30; i++) {
        pad.x = 0;
        pad.y = attack.y ?? 0;
        if (i === 3 && attack.press) pad.press(attack.press);
        defender.x = 1; // l'attaquant est à gauche : reculer = aller à droite
        defender.y = defendY;
        pad.step();
        defender.step();
        sim.update();
      }
      return { hpLost: dummy.maxHp - dummy.hp, combo: player.comboDmg };
    };
    expect(blockTest({ press: 'hp' }, 0).hpLost).toBe(0);
    expect(blockTest({ y: 1, press: 'hk' }, 0).hpLost).toBeGreaterThan(0);
    expect(blockTest({ y: 1, press: 'hk' }, 1).hpLost).toBe(0);
  });
});
