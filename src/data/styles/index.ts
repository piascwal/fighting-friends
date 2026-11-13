/* Registre des styles de combat. Ajouter un style = un nouveau fichier + une ligne ici (+ son id dans StyleId). */
import type { Look, StyleDef, StyleId } from '../types';
import { balanced } from './balanced';
import { fast } from './fast';
import { heavy } from './heavy';
import { tech } from './tech';

export const STYLES: Record<StyleId, StyleDef> = { balanced, fast, heavy, tech };
export const STYLE_LIST: readonly StyleDef[] = Object.values(STYLES);

/** Pantin par défaut de chaque style, utilisé pour un personnage qui n'a pas encore ses sprites. */
export const DEFAULT_LOOKS: Record<StyleId, Look> = {
  balanced: {
    h: 1,
    bulk: 1,
    skin: '#f0bd8c',
    hair: 'spiky',
    hairCol: '#d8431f',
    top: '#2d5fd0',
    sleeve: 'none',
    outfit: 'gi',
    pants: '#f0ede4',
    belt: '#1d1b26',
    band: '#ffb300',
    glove: '#ffb300',
    accent: '#ff6a2b',
  },
  fast: {
    h: 0.94,
    bulk: 0.86,
    skin: '#eab692',
    hair: 'ponytail',
    hairCol: '#19c6c6',
    top: '#ffd23a',
    sleeve: 'none',
    outfit: 'stripe',
    pants: '#2b2b3a',
    shorts: true,
    belt: '#2b2b3a',
    glove: '#ffffff',
    shoe: '#ffd23a',
    accent: '#19c6c6',
  },
  heavy: {
    h: 1.08,
    bulk: 1.32,
    head: 0.95,
    skin: '#b9794f',
    hair: 'bald',
    hairCol: '#2a1a12',
    beard: '#2a1a12',
    top: '#3c8a4a',
    sleeve: 'none',
    outfit: 'emblem',
    pants: '#5a4632',
    belt: '#d9a441',
    glove: '#e8dcc0',
    shoe: '#26222a',
    accent: '#d9a441',
  },
  tech: {
    h: 0.98,
    bulk: 0.92,
    skin: '#dcae8e',
    hair: 'hood',
    hairCol: '#2b2540',
    top: '#3a3260',
    sleeve: 'long',
    outfit: 'none',
    pants: '#2b2540',
    belt: '#b3123a',
    scarf: '#b3123a',
    glove: '#1b1830',
    shoe: '#1b1830',
    accent: '#a25bff',
  },
};
