/* Messages fiables échangés pendant un combat en réseau (canal ctrl). Tout ce qui arrive du réseau est
   vérifié champ par champ : un message invalide est ignoré. */
import { STAGE_W, VIEW_W } from '../core/constants';
import { STYLES } from '../data/styles';
import type { StyleId } from '../data/types';

/** Version du protocole : deux versions différentes refusent de jouer ensemble. */
export const PROTOCOL = 1;

/**
 * Un personnage tel que le combat le simule : ces champs doivent être identiques des deux côtés
 * (un style ou une taille changés en local donneraient deux combats différents). Les images, elles,
 * restent celles de chaque appareil.
 */
export interface CharSpec {
  id: string;
  name: string;
  style: StyleId;
  color: string;
  size: number;
}

/** Décor : celui d'un personnage, ou un décor dessiné du jeu. */
export type StageSpec = { char: string } | { index: number };

export type NetMsg =
  | { t: 'hello'; v: number; name: string }
  | { t: 'pick'; c: CharSpec }
  /** Case survolée pendant le choix (identifiant du personnage, « ? » pour « au hasard »). */
  | { t: 'hover'; id: string }
  | {
      t: 'start';
      p: [CharSpec, CharSpec];
      scales: [number, number];
      stage: StageSpec;
      rounds: number;
      /** Largeur de l'arène (selon l'image du décor chez l'hôte) : la même sur les deux appareils. */
      arena?: number;
    }
  | { t: 'again' }
  | { t: 'reselect' }
  | { t: 'bye' }
  /** Empreinte de l'état du combat à une image donnée : détecte une désynchronisation. */
  | { t: 'sum'; f: number; s: number };

const isText = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= max;
const isNum = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

function readChar(o: unknown): CharSpec | null {
  if (!o || typeof o !== 'object') return null;
  const c = o as Record<string, unknown>;
  if (!isText(c.id, 40) || !/^[a-z0-9-]+$/.test(c.id) || !isText(c.name, 20)) return null;
  if (typeof c.style !== 'string' || !(c.style in STYLES)) return null;
  if (typeof c.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(c.color) || !isNum(c.size, 0.7, 1.3))
    return null;
  return { id: c.id, name: c.name, style: c.style as StyleId, color: c.color, size: c.size };
}

function readStage(o: unknown): StageSpec | null {
  if (!o || typeof o !== 'object') return null;
  const s = o as Record<string, unknown>;
  if (isText(s.char, 40)) return { char: s.char };
  if (isNum(s.index, 0, 99) && Number.isInteger(s.index)) return { index: s.index };
  return null;
}

/** Lit un message reçu ; null s'il est invalide. */
export function readMsg(o: unknown): NetMsg | null {
  if (!o || typeof o !== 'object') return null;
  const m = o as Record<string, unknown>;
  switch (m.t) {
    case 'hello':
      return isNum(m.v, 0, 1000) && isText(m.name, 14) ? { t: 'hello', v: m.v, name: m.name } : null;
    case 'hover':
      return isText(m.id, 40) && /^([a-z0-9-]+|\?)$/.test(m.id) ? { t: 'hover', id: m.id } : null;
    case 'pick': {
      const c = readChar(m.c);
      return c ? { t: 'pick', c } : null;
    }
    case 'start': {
      if (!Array.isArray(m.p) || !Array.isArray(m.scales) || m.p.length !== 2 || m.scales.length !== 2)
        return null;
      const [a, b] = [readChar(m.p[0]), readChar(m.p[1])];
      const stage = readStage(m.stage);
      const scales = m.scales.every((s) => isNum(s, 0.5, 1.5)) ? (m.scales as [number, number]) : null;
      if (!a || !b || !stage || !scales || !isNum(m.rounds, 1, 5)) return null;
      const arena = isNum(m.arena, VIEW_W, STAGE_W) ? m.arena : undefined;
      return { t: 'start', p: [a, b], scales, stage, rounds: m.rounds, arena };
    }
    case 'again':
    case 'reselect':
    case 'bye':
      return { t: m.t };
    case 'sum':
      return isNum(m.f, 0, 1e7) && isNum(m.s, -1e12, 1e12) ? { t: 'sum', f: m.f, s: m.s } : null;
    default:
      return null;
  }
}
