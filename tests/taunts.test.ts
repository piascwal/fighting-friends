/* Phrases de rencontre du mode arcade. */
import { describe, expect, it } from 'vitest';
import { makeCharacter } from '../src/data/roster';
import { STYLE_LIST } from '../src/data/styles';
import { encounterLine } from '../src/data/taunts';

describe('phrases de rencontre', () => {
  it.each(STYLE_LIST.map((s) => [s.id] as const))('%s a une phrase', (style) => {
    const char = makeCharacter({ id: 'x', name: 'X', style, color: '#fff' });
    expect(encounterLine(char, false).length).toBeGreaterThan(10);
  });

  it('le dernier adversaire a une phrase à part', () => {
    const char = makeCharacter({ id: 'x', name: 'X', style: 'lazy', color: '#fff' });
    expect(encounterLine(char, true)).not.toBe(encounterLine(char, false));
  });
});
