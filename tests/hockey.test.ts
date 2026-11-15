/* Style hockeyeur et taille des personnages. */
import { describe, expect, it } from 'vitest';
import { characterById, clampSize, makeCharacter } from '../src/data/roster';
import { Controller } from '../src/engine/controller';
import { hurtbox } from '../src/engine/combat';
import { FightSim } from '../src/engine/fight';
import { createTraining } from './harness';

/** Lance le palet sur un adversaire qui tient la garde (debout ou accroupi) ; renvoie les dégâts reçus. */
function puckDamage(crouching: boolean): number {
  const { sim, pad } = createTraining({ style: 'hockey', distance: 320, humanOpponent: true });
  const dummy = sim.fighters[1];
  dummy.ctrl.x = 1; // garde : vers l'arrière (le joueur est à gauche)
  dummy.ctrl.y = crouching ? 1 : 0;
  pad.commands.push('s1h');
  let dealt = 0;
  for (let f = 0; f < 90; f++) {
    pad.step();
    dummy.ctrl.step();
    const before = dummy.hp;
    sim.update();
    if (dummy.hp < before) dealt += before - dummy.hp;
  }
  return dealt;
}

describe('hockeyeur', () => {
  it('le palet file au ras du sol : il passe une garde debout', () => {
    expect(puckDamage(false)).toBeGreaterThan(50);
  });

  it('le palet se bloque accroupi', () => {
    expect(puckDamage(true)).toBeLessThan(20);
  });

  it('la mise en échec encaisse un coup sans être interrompue, puis renverse', () => {
    const { sim, pad } = createTraining({ style: 'hockey', distance: 130, humanOpponent: true });
    const [player, dummy] = sim.fighters;
    pad.commands.push('s2h');
    dummy.ctrl.commands.push('hp'); // l'adversaire frappe en même temps
    let absorbed = false;
    let knockedDown = false;
    for (let f = 0; f < 40; f++) {
      pad.step();
      dummy.ctrl.step();
      const before = player.hp;
      sim.update();
      if (player.hp < before && player.move?.id === 's2h') absorbed = true;
      if (dummy.state === 'airhit') knockedDown = true;
    }
    expect(absorbed).toBe(true);
    expect(knockedDown).toBe(true);
  });
});

describe('taille des personnages', () => {
  it('la taille est bornée, et vaut « normal » par défaut', () => {
    const base = { id: 'x', name: 'X', style: 'hockey', color: '#fff' } as const;
    expect(makeCharacter(base).size).toBe(1);
    expect(makeCharacter({ ...base, size: 0.8 }).size).toBe(0.8);
    expect(clampSize(5)).toBe(1);
  });

  it('un petit personnage offre une zone de touche plus basse et plus étroite', () => {
    const char = characterById('ardan')!;
    const sim = new FightSim({
      chars: [char, char],
      ctrls: [new Controller(), new Controller()],
      ais: [null, null],
      bodyScales: [1, 0.8],
      rounds: 2,
      mode: 'training',
    });
    const [normal, small] = sim.fighters;
    const a = hurtbox(normal)!;
    const b = hurtbox(small)!;
    expect(b.y1 - b.y0).toBeCloseTo((a.y1 - a.y0) * 0.8);
    expect(b.x1 - b.x0).toBeLessThan(a.x1 - a.x0);
  });
});
