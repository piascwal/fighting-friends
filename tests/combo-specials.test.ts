/* Coup spécial déclenché en combo (le même coup fort deux fois, au contact) : il doit toucher, pour tous
   les styles, même ceux dont le coup part à distance (pic, mine, animal, projecteur…). */
import { describe, expect, it } from 'vitest';
import { STYLE_LIST } from '../src/data/styles';
import type { Button, MoveId, StyleId } from '../src/data/types';
import { press, run } from './harness';

/** Spéciaux qui ne frappent pas eux-mêmes : garde de contre, pas éclair, posture, rage, méditation. */
const NO_HIT: Partial<Record<StyleId, MoveId[]>> = {
  counter: ['s1h'],
  storm: ['s2h'],
  tiger: ['s2h'],
  berserker: ['s2h'],
  monk: ['s2h'],
};

const PAIRS: readonly (readonly [Button, MoveId])[] = [
  ['hp', 's1h'],
  ['hk', 's2h'],
];

describe('spéciaux enchaînés en combo', () => {
  for (const style of STYLE_LIST) {
    for (const [button, id] of PAIRS) {
      if (NO_HIT[style.id]?.includes(id)) continue;
      it(`${style.id} : ${button} ${button} → ${id} touche en combo`, () => {
        const r = run({ style: style.id, distance: 85 }, [press(button, 9), press(button, 120)]);
        expect(r.moves).toContain(id);
        expect(r.maxCombo).toBeGreaterThanOrEqual(2);
      });
    }
  }

  // les supers à distance (projecteur, rayon, animal…) touchent aussi enchaînés sur le spécial
  it.each([
    ['dancer', 'hp'],
    ['beam', 'hp'],
    ['trainer', 'hp'],
    ['ice', 'hp'],
  ] as const)('%s : %s %s puis encore → super en combo', (style, button) => {
    const spam = Array.from({ length: 25 }, () => press(button, 3));
    const r = run({ style, distance: 85, meter: 100 }, [
      press(button, 9),
      press(button, 9),
      ...spam,
      press(button, 150),
    ]);
    expect(r.moves).toContain('super');
    expect(r.maxCombo).toBeGreaterThanOrEqual(3);
  });
});
