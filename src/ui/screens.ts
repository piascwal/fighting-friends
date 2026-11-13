/* Gestion des écrans de menu : un seul visible à la fois, par-dessus le canvas du jeu. */
import { input } from '../input';
import { game } from './actions';
import { $, $$ } from './dom';

export type ScreenName = 'title' | 'menu' | 'select' | 'options' | 'chars' | 'moves' | 'pause' | 'result';

let current: ScreenName | null = null;

export const currentScreen = (): ScreenName | null => current;

function apply(name: ScreenName | null): void {
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
