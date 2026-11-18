/* Ce que les menus peuvent demander au jeu. Les menus ne contiennent aucune logique de jeu :
   ils appellent ces actions, fournies par game.ts au démarrage. */
import type { Character } from '../data/types';

import type { Link } from '../net/link';

export type GameMode = 'arcade' | 'versus' | 'duo' | 'training' | 'lan';

export interface UiActions {
  /** Lance un mode de jeu. `opponent` est ignoré en arcade (les adversaires s'enchaînent). */
  startGame(mode: GameMode, player: Character, opponent: Character | null): void;
  togglePause(): void;
  quitFight(): void;
  /** L'écran affiché a changé (sert à montrer ou cacher les commandes tactiles). */
  screenChanged(): void;
  /** Le personnage du joueur dans le combat en cours, s'il y en a un. */
  currentPlayer(): Character | null;
  /** Deux joueurs sur le même Wi-Fi : la liaison est établie (`host` : cet appareil a créé la partie). */
  startLan(link: Link, host: boolean): void;
  /** Combat en réseau : le joueur de cet appareil passe sur une case (identifiant, « ? » : au hasard). */
  lanHover(id: string): void;
  /** Combat en réseau : le joueur de cet appareil a choisi son personnage. */
  lanPicked(char: Character): void;
  /** Quitte le combat en réseau (prévient l'autre appareil). */
  leaveLan(): void;
}

let actions: UiActions | null = null;

export function setActions(a: UiActions): void {
  actions = a;
}

export function game(): UiActions {
  if (!actions) throw new Error("Les menus ont été utilisés avant d'être initialisés");
  return actions;
}
