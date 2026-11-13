/* Écrans simples : titre, menu principal, pause, boutons de fin de combat. */
import { playMusic, playSfx, unlockAudio } from '../audio/audio';
import { game, type GameMode } from './actions';
import { $, $$, on } from './dom';
import { showScreen } from './screens';

export const MENUS_HTML = `
  <div class="screen" id="s-title">
    <div class="logo"><span>FIGHTING</span><b>FRIENDS</b></div>
    <div class="blink">TOUCHE L'ÉCRAN POUR JOUER</div>
    <div class="ver">Astuce : ajoute la page à ton écran d'accueil pour jouer en plein écran</div>
  </div>

  <div class="screen" id="s-menu">
    <div class="logo small"><span>FIGHTING</span><b>FRIENDS</b></div>
    <div class="menu">
      <button class="nav big" data-mode="arcade">ARCADE<small>Bats tous les adversaires</small></button>
      <button class="nav big" data-mode="versus">VERSUS<small>Un combat contre la console</small></button>
      <button class="nav big" data-mode="duo">2 JOUEURS<small>Sur le même clavier / manettes</small></button>
      <button class="nav big" data-mode="training">ENTRAÎNEMENT<small>Répète tes combos</small></button>
      <button class="nav big alt" id="menuOptions">OPTIONS<small>Personnages, sprites, commandes</small></button>
    </div>
  </div>

  <div class="screen dim" id="s-pause">
    <h2>PAUSE</h2>
    <div class="menu">
      <button class="nav big" id="pResume">REPRENDRE</button>
      <button class="nav big" id="pMoves">LISTE DES COUPS</button>
      <button class="nav big alt" id="pQuit">QUITTER LE COMBAT</button>
    </div>
  </div>

  <div class="screen clear" id="s-result"><div class="resBtns" id="resBtns"></div></div>`;

export interface MenuHandlers {
  openSelect(mode: GameMode): void;
  openOptions(): void;
  openMovesFromPause(): void;
}

export function initMenus(handlers: MenuHandlers): void {
  on('#s-title', () => {
    unlockAudio();
    playMusic('menu');
    playSfx('ok');
    showScreen('menu');
  });
  for (const button of $$('[data-mode]')) {
    button.addEventListener('click', () => {
      playSfx('ok');
      handlers.openSelect(button.dataset.mode as GameMode);
    });
  }
  on('#menuOptions', () => {
    playSfx('ok');
    handlers.openOptions();
  });
  on('#pResume', () => game().togglePause());
  on('#pMoves', handlers.openMovesFromPause);
  on('#pQuit', () => game().quitFight());
}

/** Affiche les boutons proposés après un combat ; le premier est mis en avant. */
export function showResult(buttons: readonly (readonly [label: string, action: () => void])[]): void {
  const box = $('#resBtns');
  box.innerHTML = '';
  buttons.forEach(([label, action], i) => {
    const button = document.createElement('button');
    button.className = `nav big${i ? ' alt' : ''}`;
    button.textContent = label;
    button.addEventListener('click', () => {
      playSfx('ok');
      action();
    });
    box.appendChild(button);
  });
  showScreen('result');
}
