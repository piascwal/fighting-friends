/* Mise à jour du jeu : quand une version plus récente est publiée, on recharge tout seul si rien n'est en cours
   (écran titre ou menu), sinon un bandeau propose de recharger, sans jamais interrompre un combat. */
import { checkVersion, reloadToVersion } from '../core/version';
import { $ } from './dom';
import { currentScreen } from './screens';

/** Au plus une vérification par minute (à l'ouverture, puis à chaque retour dans l'application). */
const CHECK_INTERVAL_MS = 60_000;
/** Écrans où l'on peut recharger sans rien faire perdre au joueur. */
const IDLE_SCREENS = new Set(['title', 'menu']);
const AUTO_RELOAD_KEY = 'ff-auto-reload';

let lastCheck = 0;

/** Ne recharge automatiquement qu'une fois par version : évite une boucle si le site tarde à servir la nouvelle. */
function claimAutoReload(latest: string): boolean {
  try {
    if (sessionStorage.getItem(AUTO_RELOAD_KEY) === latest) return false;
    sessionStorage.setItem(AUTO_RELOAD_KEY, latest);
    return true;
  } catch {
    return false;
  }
}

function showBanner(latest: string): void {
  const banner = $('#update');
  banner.replaceChildren();
  const text = document.createElement('span');
  text.textContent = `Nouvelle version disponible (v${latest}).`;
  const reload = document.createElement('button');
  reload.type = 'button';
  reload.textContent = 'Recharger';
  reload.addEventListener('click', () => reloadToVersion(latest));
  const later = document.createElement('button');
  later.type = 'button';
  later.className = 'later';
  later.textContent = 'Plus tard';
  later.addEventListener('click', () => (banner.hidden = true));
  banner.append(text, reload, later);
  banner.hidden = false;
}

/** Vérifie s'il existe une version plus récente, et la propose (ou l'installe si le joueur est dans les menus). */
export function checkForUpdate(): void {
  if (Date.now() - lastCheck < CHECK_INTERVAL_MS) return;
  lastCheck = Date.now();
  void checkVersion(import.meta.env.BASE_URL).then(({ state, latest }) => {
    if (state !== 'newer' || !latest) return;
    const idle = IDLE_SCREENS.has(currentScreen() ?? '');
    if (idle && claimAutoReload(latest)) reloadToVersion(latest);
    else showBanner(latest);
  });
}
