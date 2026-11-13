/* Application installable (PWA) : travail hors ligne et installation sur l'écran d'accueil. */

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: InstallPromptEvent | null = null;
let onAvailabilityChange: () => void = () => {};

/** Enregistre le service worker (version de production uniquement : en développement il gênerait les rechargements). */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // sans service worker le jeu marche quand même, simplement pas hors ligne
    });
  });
}

/** Écoute la proposition d'installation du navigateur (Android, ordinateur) pour l'offrir au bon moment. */
export function watchInstallPrompt(changed: () => void): void {
  onAvailabilityChange = changed;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as InstallPromptEvent;
    onAvailabilityChange();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    onAvailabilityChange();
  });
}

/** Le navigateur propose l'installation en un appui. */
export const canPromptInstall = (): boolean => deferredPrompt !== null;

export async function promptInstall(): Promise<void> {
  const prompt = deferredPrompt;
  if (!prompt) return;
  deferredPrompt = null;
  await prompt.prompt();
  await prompt.userChoice;
  onAvailabilityChange();
}
