/* Style Dresseur : l'animal de compagnie arrive, frappe, puis repart sans disparaître d'un coup. */
import { describe, expect, it } from 'vitest';
import type { MoveId } from '../src/data/types';
import { createTraining } from './harness';

/** Lance un coup du dresseur et suit son animal, image par image. */
function follow(id: MoveId, frames = 160) {
  const { sim, pad } = createTraining({ style: 'trainer', distance: 200, meter: 100 });
  const [player, dummy] = sim.fighters;
  pad.commands.push(id);
  const track: { x: number; y: number; landed: boolean; hits: number }[] = [];
  let hits = 0;
  for (let f = 0; f < frames; f++) {
    pad.step();
    const before = dummy.hp;
    sim.update();
    if (dummy.hp < before) hits++;
    const pet = sim.projectiles[0];
    if (pet) track.push({ x: pet.x, y: pet.y, landed: pet.landed, hits: pet.hits });
  }
  return { player, dummy, track, hits };
}

describe('dresseur', () => {
  it("« Va chercher ! » : l'animal surgit de derrière, bouscule l'adversaire, puis continue sa course", () => {
    const { player, dummy, track, hits } = follow('s1h');
    expect(track[0]!.x).toBeLessThan(player.x); // il arrive de derrière le dresseur
    expect(hits).toBe(1);
    // après l'avoir touché, il reste visible et le dépasse
    expect(track.at(-1)!.x).toBeGreaterThan(dummy.x + 100);
    expect(track.at(-1)!.hits).toBe(0);
  });

  it("« Saute ! » : l'animal bondit, atterrit et repart en courant", () => {
    const { track, hits } = follow('s2h');
    const highest = Math.min(...track.map((p) => p.y));
    expect(track[0]!.y - highest).toBeGreaterThan(120);
    expect(track.some((p) => p.landed)).toBe(true);
    expect(hits).toBe(1);
  });

  it("le super : l'animal frappe plusieurs fois", () => {
    const { hits } = follow('super', 220);
    expect(hits).toBeGreaterThanOrEqual(3);
  });
});
