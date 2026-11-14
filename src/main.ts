/* Démarrage : chargement des données, mise à l'échelle de l'écran, boucle principale. */
import './style.css';
import { setBackground } from './audio/audio';
import { applyOverrides, loadCustomCharacters, renameLegacySprite } from './assets/character-files';
import { loadRepoCharacters } from './assets/repo-characters';
import { loadLocalSprites } from './assets/sprite-store';
import { FPS, VIEW_H, VIEW_W } from './core/constants';
import { isPortrait, isTouchDevice } from './core/display';
import { registerServiceWorker } from './core/pwa';
import { gameState } from './game';
import { input } from './input';
import { checkForUpdate, currentScreen, initUi, openCharactersShortcut, tickUi } from './ui';

const canvas = document.getElementById('cv') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const FRAME_MS = 1000 / FPS;
/** Au-delà, on renonce à rattraper le retard (onglet resté en arrière-plan). */
const MAX_CATCH_UP_MS = 100;
const MAX_STEPS_PER_FRAME = 4;
/** Netteté maximale : au-delà de 2, le gain est invisible et le coût réel sur téléphone. */
const MAX_PIXEL_RATIO = 2;

/** Adapte le canvas à l'écran : le plus grand possible en gardant les proportions, centré. */
function resize(): void {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const scale = Math.min(vw / VIEW_W, vh / VIEW_H);
  const width = Math.round(VIEW_W * scale);
  const height = Math.round(VIEW_H * scale);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.style.left = `${Math.round((vw - width) / 2)}px`;
  canvas.style.top = `${Math.round((vh - height) / 2)}px`;
  const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const portrait = isPortrait();
  document.body.classList.toggle('portrait', portrait);
  // téléphone tourné à la verticale en plein combat : on met en pause le temps qu'il revienne
  if (portrait && isTouchDevice() && !gameState.paused) gameState.togglePause();
  input.touch.layout();
}

let last = performance.now();
let lag = 0;

/** La logique avance par pas fixes de 1/60 s, quel que soit le rythme d'affichage de l'écran. */
function frame(now: number): void {
  requestAnimationFrame(frame);
  lag += Math.min(MAX_CATCH_UP_MS, now - last);
  last = now;
  let steps = 0;
  while (lag >= FRAME_MS) {
    lag -= FRAME_MS;
    if (steps++ < MAX_STEPS_PER_FRAME && !gameState.paused) gameState.scene?.update();
  }
  const k = canvas.width / VIEW_W;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  gameState.scene?.render(ctx);
  tickUi();
}

async function boot(): Promise<void> {
  loadCustomCharacters();
  // les sprites sont un plus : si leur chargement échoue, le jeu démarre avec les pantins
  await loadLocalSprites(renameLegacySprite).catch(() => {});
  await loadRepoCharacters().catch(() => {});
  applyOverrides();

  input.init();
  input.onPause = () => gameState.togglePause();
  initUi(gameState);
  resize();
  gameState.startAttract();
  // raccourci de l'icône de l'application (appui long sur Android) : ouvre directement les sprites
  if (new URLSearchParams(location.search).get('ecran') === 'personnages') openCharactersShortcut();

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  document.getElementById('pauseBtn')!.addEventListener('click', () => gameState.togglePause());
  canvas.addEventListener('pointerdown', () => gameState.skip());
  document.getElementById('touch')!.addEventListener('pointerdown', () => gameState.skip());
  window.addEventListener('keydown', (event) => {
    if ((event.code === 'Enter' || event.code === 'Space') && !currentScreen()) gameState.skip();
  });
  // quand on passe à une autre appli : musique coupée et combat en pause
  window.addEventListener('pagehide', () => setBackground(true));
  window.addEventListener('pageshow', () => setBackground(document.hidden));
  document.addEventListener('visibilitychange', () => {
    setBackground(document.hidden);
    if (!document.hidden) checkForUpdate();
    if (document.hidden && !gameState.paused) gameState.togglePause();
  });
  requestAnimationFrame(frame);
  // le jeu a démarré : le filet de sécurité (public/rescue.js) n'a rien à faire
  document.documentElement.dataset.started = '1';
  // une version plus récente a-t-elle été publiée ? (à l'ouverture, puis à chaque retour dans l'application)
  checkForUpdate();
}

registerServiceWorker();
void boot();
