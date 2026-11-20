/* Martelage d'un bouton : après quelques coups, l'adversaire qui tient la garde doit pouvoir bloquer. */
import { describe, expect, it } from 'vitest';
import type { Button } from '../src/data/types';
import { hitstunDecay } from '../src/engine/combat';
import { createTraining } from './harness';

/**
 * L'attaquant tape `buttons` en boucle toutes les `every` images. Le défenseur se fait toucher une première
 * fois, puis tient la garde. Renvoie la plus longue série de coups encaissés et le nombre de coups bloqués.
 */
function mash(buttons: Button[], every: number) {
  const { sim, pad } = createTraining({ distance: 80, humanOpponent: true });
  const dummy = sim.fighters[1];
  let streak = 0;
  let best = 0;
  let blocked = 0;
  for (let f = 0; f < 600; f++) {
    if (f % every === 0) pad.press(buttons[(f / every) % buttons.length]!);
    pad.step();
    dummy.ctrl.step();
    const before = dummy.hp;
    const wasBlocking = dummy.state === 'blockstun';
    sim.update();
    if (dummy.hp < before) {
      dummy.ctrl.x = 1; // garde
      best = Math.max(best, ++streak);
    }
    if (dummy.state === 'blockstun' && !wasBlocking) {
      blocked++;
      streak = 0;
    }
  }
  return { best, blocked };
}

describe("décroissance de l'étourdissement", () => {
  it.each(['lp', 'lk', 'clp'] as const)('marteler %s : au plus 3 coups, puis la garde tient', (button) => {
    for (const every of [3, 6, 10]) {
      const { best, blocked } = mash([button === 'clp' ? 'lp' : button], every);
      expect(best, `${button}/${every}`).toBeLessThanOrEqual(3);
      expect(blocked, `${button}/${every}`).toBeGreaterThan(5);
    }
  });

  it('alterner les boutons au hasard ne fait pas un combo infini non plus', () => {
    for (const every of [4, 7]) expect(mash(['lp', 'lk', 'hp', 'hk'], every).best).toBeLessThanOrEqual(6);
  });

  it('le même coup étourdit de moins en moins ; un long combo varié aussi, plus doucement', () => {
    expect(hitstunDecay(1, 0)).toBe(1);
    expect(hitstunDecay(3, 2)).toBeLessThan(hitstunDecay(3, 0));
    expect(hitstunDecay(12, 0)).toBeLessThan(1);
    expect(hitstunDecay(12, 0)).toBeGreaterThan(hitstunDecay(12, 2));
  });
});
