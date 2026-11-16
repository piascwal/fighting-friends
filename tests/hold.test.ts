/* Coup maintenu : tant que le bouton reste enfoncé, un coup normal garde sa pose tendue. */
import { describe, expect, it } from 'vitest';
import type { Button } from '../src/data/types';
import { HOLD_MAX } from '../src/engine/fighter-attack';
import { createTraining } from './harness';

/** Frames passées dans le coup, bouton relâché aussitôt ou maintenu pendant `holdFor` frames. */
function attackLength(button: Button, holdFor: number): number {
  const { sim, pad } = createTraining({ distance: 300 });
  const player = sim.fighters[0];
  pad.press(button);
  let frames = 0;
  for (let f = 0; f < 120; f++) {
    pad.held = f < holdFor ? { [button]: true } : {};
    pad.step();
    sim.update();
    if (player.state === 'attack') frames++;
    else if (frames) break;
  }
  return frames;
}

describe('coup maintenu', () => {
  it('bouton maintenu : le coup reste tendu plus longtemps', () => {
    const quick = attackLength('hp', 1);
    expect(attackLength('hp', 20)).toBeGreaterThanOrEqual(quick + 8);
  });

  it('la pose maintenue est limitée dans le temps', () => {
    const quick = attackLength('lk', 1);
    expect(attackLength('lk', 200)).toBeLessThanOrEqual(quick + HOLD_MAX);
  });

  it('les coups spéciaux ne se maintiennent pas', () => {
    const specialLength = (held: boolean) => {
      const { sim, pad } = createTraining({ distance: 300 });
      const player = sim.fighters[0];
      pad.commands.push('s1h');
      pad.held = held ? { hp: true } : {};
      let frames = 0;
      for (let f = 0; f < 200; f++) {
        pad.step();
        sim.update();
        if (player.state === 'attack') frames++;
        else if (frames) break;
      }
      return frames;
    };
    expect(specialLength(true)).toBe(specialLength(false));
  });
});
