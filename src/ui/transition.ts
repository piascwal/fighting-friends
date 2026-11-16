/* Transition entre deux écrans : des volets penchés couvrent l'image d'un coup, puis s'écartent en
   cascade. Le changement d'écran lui-même reste immédiat (il se fait sous les volets). */

const BARS = 8;
/** Durée totale de la transition (animation + cascade), avec une marge. */
const DURATION_MS = 650;
let overlay: HTMLElement | null = null;
let hideTimer = 0;

function ensureOverlay(): HTMLElement {
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'wipe';
    for (let i = 0; i < BARS; i++) {
      const bar = document.createElement('i');
      bar.style.setProperty('--i', String(i));
      overlay.appendChild(bar);
    }
    document.getElementById('app')!.appendChild(overlay);
  }
  return overlay;
}

/** Joue la transition (à appeler juste après avoir changé d'écran ou de scène). */
export function wipe(): void {
  const el = ensureOverlay();
  el.classList.remove('go');
  void el.offsetWidth; // relance l'animation si elle était déjà en cours
  el.classList.add('go');
  // une fois les volets partis, la couche est retirée de l'affichage : sur certains navigateurs
  // (Safari), un volet pouvait rester figé à l'écran après l'animation
  clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => el.classList.remove('go'), DURATION_MS);
}
