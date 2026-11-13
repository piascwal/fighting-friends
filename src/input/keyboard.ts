/* Clavier. On lit `event.code` (position physique de la touche) : les mêmes touches marchent en AZERTY et en QWERTY. */
import { BUTTONS, type Button } from '../data/types';

type Action = 'up' | 'down' | 'left' | 'right' | Button;
type KeyMap = Record<Action, readonly string[]>;

/** Un seul joueur : ZQSD/WASD ou flèches, coups sur U I J K. */
const SOLO: KeyMap = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  lp: ['KeyU'],
  hp: ['KeyI'],
  lk: ['KeyJ'],
  hk: ['KeyK'],
};
/** Deux joueurs sur le même clavier. */
const DUO: readonly [KeyMap, KeyMap] = [
  {
    up: ['KeyW'],
    down: ['KeyS'],
    left: ['KeyA'],
    right: ['KeyD'],
    lp: ['KeyF'],
    hp: ['KeyG'],
    lk: ['KeyV'],
    hk: ['KeyB'],
  },
  {
    up: ['ArrowUp'],
    down: ['ArrowDown'],
    left: ['ArrowLeft'],
    right: ['ArrowRight'],
    lp: ['KeyO', 'Numpad4'],
    hp: ['KeyP', 'Numpad5'],
    lk: ['KeyL', 'Numpad1'],
    hk: ['Semicolon', 'Numpad2'],
  },
];

export interface PadState {
  x: number;
  y: number;
  held: Partial<Record<Button, boolean>>;
}

export interface KeyboardHooks {
  /** Un bouton de coup vient d'être enfoncé par ce joueur. */
  onPress(player: number, button: Button): void;
  onPause(): void;
  /** Toute touche (pour la navigation dans les menus). */
  onKey(event: KeyboardEvent): void;
}

const down = new Set<string>();
const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(target.tagName);
const scrollsPage = (code: string) => code.startsWith('Arrow') || code === 'Space';

const mapFor = (player: number, twoPlayers: boolean): KeyMap | undefined =>
  twoPlayers ? DUO[player] : player === 0 ? SOLO : undefined;

export function initKeyboard(hooks: KeyboardHooks, isTwoPlayers: () => boolean): void {
  window.addEventListener('keydown', (event) => {
    if (isTyping(event.target)) return;
    if (scrollsPage(event.code)) event.preventDefault();
    if (event.repeat) return;
    down.add(event.code);
    const duo = isTwoPlayers();
    // P sert de touche de coup au joueur 2 : il ne met en pause qu'en solo
    if (event.code === 'Escape' || (event.code === 'KeyP' && !duo)) hooks.onPause();
    for (const player of [0, 1]) {
      const map = mapFor(player, duo);
      if (!map) continue;
      for (const button of BUTTONS) if (map[button].includes(event.code)) hooks.onPress(player, button);
    }
    hooks.onKey(event);
  });
  window.addEventListener('keyup', (event) => down.delete(event.code));
  window.addEventListener('blur', () => down.clear());
}

export function readKeyboard(player: number, twoPlayers: boolean): PadState {
  const map = mapFor(player, twoPlayers);
  const state: PadState = { x: 0, y: 0, held: {} };
  if (!map) return state;
  const any = (action: Action) => map[action].some((code) => down.has(code));
  state.x = (any('right') ? 1 : 0) - (any('left') ? 1 : 0);
  state.y = (any('down') ? 1 : 0) - (any('up') ? 1 : 0);
  for (const button of BUTTONS) state.held[button] = any(button);
  return state;
}
