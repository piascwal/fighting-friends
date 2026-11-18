/* Combat en réseau : les messages reçus de l'autre appareil sont vérifiés avant d'être utilisés. */
import { describe, expect, it } from 'vitest';
import { readMsg } from '../src/net/protocol';

const char = { id: 'mat', name: 'MAT', style: 'boxer', color: '#ff0000', size: 1 };

describe('protocole du combat en réseau', () => {
  it('accepte les messages valides', () => {
    expect(readMsg({ t: 'pick', c: char })).toEqual({ t: 'pick', c: char });
    const start = { t: 'start', p: [char, char], scales: [1, 0.8], stage: { index: 2 }, rounds: 2 };
    expect(readMsg(start)).toEqual(start);
    expect(readMsg({ t: 'bye' })).toEqual({ t: 'bye' });
    expect(readMsg({ t: 'hover', id: 'mar-1' })).toEqual({ t: 'hover', id: 'mar-1' });
    expect(readMsg({ t: 'hover', id: '?' })).toEqual({ t: 'hover', id: '?' });
  });

  it('refuse un style inconnu, une taille hors bornes, un identifiant douteux ou un type inconnu', () => {
    expect(readMsg({ t: 'pick', c: { ...char, style: 'ninja' } })).toBeNull();
    expect(readMsg({ t: 'pick', c: { ...char, size: 3 } })).toBeNull();
    expect(readMsg({ t: 'pick', c: { ...char, id: '../hack' } })).toBeNull();
    expect(readMsg({ t: 'start', p: [char], scales: [1, 1], stage: { index: 0 }, rounds: 2 })).toBeNull();
    expect(readMsg({ t: 'boom' })).toBeNull();
    expect(readMsg({ t: 'hover', id: '<img>' })).toBeNull();
    expect(readMsg('texte')).toBeNull();
  });
});
