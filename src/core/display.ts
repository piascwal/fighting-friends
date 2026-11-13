/* Affichage sur téléphone : plein écran et verrouillage à l'horizontale.
   Le jeu se joue uniquement à l'horizontale ; à la verticale, un message demande de tourner le téléphone. */

/** `lock()` n'existe pas partout (absent sur iOS) : on le traite comme optionnel. */
type LockableOrientation = Omit<ScreenOrientation, 'lock'> & {
  lock?: (orientation: 'landscape') => Promise<void>;
};

/** Appareil tactile (téléphone, tablette) : c'est là que le plein écran et l'orientation comptent. */
export const isTouchDevice = (): boolean => matchMedia('(pointer: coarse)').matches;

/** Lancé depuis l'icône de l'écran d'accueil (application installée). */
export const isInstalledApp = (): boolean =>
  matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const isPortrait = (): boolean => window.innerHeight > window.innerWidth;

/** iPhone / iPad : pas de plein écran pour une page web, il faut installer le jeu. */
export const isIos = (): boolean =>
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

async function lockLandscape(): Promise<void> {
  const orientation = screen.orientation as unknown as LockableOrientation | undefined;
  // refusé hors plein écran ou sur iOS : le message « tourne ton téléphone » prend le relais
  await orientation?.lock?.('landscape').catch(() => {});
}

/**
 * Passe en plein écran à l'horizontale sur téléphone.
 * Doit être appelé pendant un geste du joueur (appui) : les navigateurs l'exigent.
 * Sans effet sur ordinateur, et inutile dans l'application installée (déjà plein écran).
 */
export async function enterImmersive(): Promise<void> {
  if (!isTouchDevice()) return;
  if (!isInstalledApp() && !document.fullscreenElement) {
    await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => {});
  }
  await lockLandscape();
}

/** Bascule le plein écran (bouton des options). Renvoie false si le navigateur le refuse. */
export async function toggleFullscreen(): Promise<boolean> {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return true;
  }
  try {
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    await lockLandscape();
    return true;
  } catch {
    return false;
  }
}
