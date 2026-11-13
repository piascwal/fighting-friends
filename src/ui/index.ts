/* Point d'entrée des menus : assemble les écrans, branche leurs boutons et la navigation au clavier. */
import { playSfx, unlockAudio } from '../audio/audio';
import { input } from '../input';
import { game, setActions, type UiActions } from './actions';
import { CHARACTERS_HTML, initCharacters, openCharacters } from './characters';
import { $, $$ } from './dom';
import { MENUS_HTML, initMenus } from './menus';
import { MOVES_HTML, backFromMoves, initMoves, openMoves } from './moves';
import { OPTIONS_HTML, initOptions, openOptions } from './options';
import { closePoseModal, isPoseModalOpen, tickPoseModal } from './pose-modal';
import { currentScreen, hideScreens, mountScreens, showScreen } from './screens';
import { SELECT_HTML, backFromSelect, initSelect, openSelect, tickSelect } from './select';

export type { GameMode, UiActions } from './actions';
export { showResult } from './menus';
export { currentScreen, hideScreens, showScreen } from './screens';
export { openSelect } from './select';

const MOVE_KEYS: Record<string, number> = {
  ArrowDown: 1,
  ArrowRight: 1,
  KeyS: 1,
  KeyD: 1,
  ArrowUp: -1,
  ArrowLeft: -1,
  KeyW: -1,
  KeyA: -1,
};
const CONFIRM_KEYS = ['KeyU', 'KeyJ'];

/** Touche « retour » : ferme la fenêtre ouverte, sinon revient à l'écran précédent. */
function goBack(screen: string): void {
  if (screen === 'chars' && isPoseModalOpen()) closePoseModal();
  else if (screen === 'select') backFromSelect();
  else if (screen === 'moves') backFromMoves();
  else if (screen === 'chars') $('#chBack').click();
  else if (screen === 'options') $('#optBack').click();
}

/** Navigation au clavier : les flèches déplacent le curseur de bouton en bouton. */
function onKey(event: KeyboardEvent): void {
  const screen = currentScreen();
  if (!screen) return;
  if (screen === 'title') {
    if (event.code === 'Enter' || event.code === 'Space') {
      // sans cela, la même touche active aussi le bouton du menu qui vient de prendre le focus
      event.preventDefault();
      $('#s-title').click();
    }
    return;
  }
  const scope = screen === 'chars' && isPoseModalOpen() ? $('#chModal') : $(`#s-${screen}`);
  const items = $$<HTMLButtonElement>('.nav', scope).filter((b) => b.offsetParent !== null && !b.disabled);
  const index = items.indexOf(document.activeElement as HTMLButtonElement);
  const step = MOVE_KEYS[event.code];
  if (step && items.length) {
    event.preventDefault();
    items[(index + step + items.length) % items.length]!.focus();
    playSfx('move');
  } else if (CONFIRM_KEYS.includes(event.code) && index >= 0) {
    items[index]!.click();
  } else if (event.code === 'Escape') {
    goBack(screen);
  }
}

export function initUi(actions: UiActions): void {
  setActions(actions);
  mountScreens(MENUS_HTML + SELECT_HTML + OPTIONS_HTML + CHARACTERS_HTML + MOVES_HTML);
  initMenus({
    openSelect,
    openOptions,
    openMovesFromPause: () => openMoves('pause', game().currentPlayer()),
  });
  initSelect();
  initOptions({ openCharacters: () => openCharacters(), openMoves: () => openMoves('options') });
  initCharacters(openOptions);
  initMoves();
  $('#rotateChars').addEventListener('click', openCharactersShortcut);
  input.onKey = onKey;
  document.addEventListener('pointerdown', unlockAudio, { once: true });
  showScreen('title');
}

/**
 * Accès direct à l'écran des sprites (depuis le message « tourne ton téléphone » ou le raccourci de l'icône).
 * Le bouton Retour ramène exactement là où l'on était.
 */
export function openCharactersShortcut(): void {
  const from = currentScreen();
  playSfx('ok');
  openCharacters(() => (from ? showScreen(from) : hideScreens()));
}

/** Anime les aperçus des menus ; appelé à chaque image. */
export function tickUi(): void {
  const screen = currentScreen();
  if (screen === 'select') tickSelect();
  else if (screen === 'chars') tickPoseModal();
}
