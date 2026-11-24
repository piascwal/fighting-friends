/* Gestion des écrans de menu : un seul visible à la fois, par-dessus le canvas du jeu. */
import { input } from '../input';
import { game } from './actions';
import { $, $$ } from './dom';
import { wipe } from './transition';

export type ScreenName = 'title' | 'menu' | 'select' | 'options' | 'moves' | 'pause' | 'result' | 'lan';

let current: ScreenName | null = null;
/** Faux au tout premier affichage : le jeu s'ouvre sans transition. */
let started = false;

export const currentScreen = (): ScreenName | null => current;

/** Pas de transition pour la pause (on reste dans le combat) ni entre deux affichages du même écran. */
const instant = (from: ScreenName | null, to: ScreenName | null) =>
  from === to || from === 'pause' || to === 'pause' || (from === null && to === null);

function apply(name: ScreenName | null): void {
  if (started && !instant(current, name)) wipe();
  started = true;
  for (const screen of $$('.screen')) screen.classList.toggle('on', screen.id === `s-${name}`);
  current = name;
  document.body.dataset.screen = name ?? '';
  game().screenChanged();
}

export function showScreen(name: ScreenName): void {
  apply(name);
  // au clavier, on place le curseur sur le premier bouton
  if (!input.touch.seen) $$(`#s-${name} .nav`)[0]?.focus();
}

export function hideScreens(): void {
  apply(null);
}

export function mountScreens(html: string): void {
  $('#ui').innerHTML = html;
}
