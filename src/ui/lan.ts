/* Écran « 2 JOUEURS » : sur cet appareil (local), ou chacun sur le sien, sur le même Wi-Fi.
   Un joueur crée une partie, l'autre la voit apparaître et la rejoint : aucune adresse à saisir. */
import { playSfx } from '../audio/audio';
import { escapeHtml } from '../core/text';
import { cleanName, openLobby, type FoundGame, type Lobby } from '../net/lobby';
import { game } from './actions';
import { $, on, toast } from './dom';
import { showScreen } from './screens';
import { openSelect } from './select';

export const LAN_HTML = `
  <div class="screen" id="s-lan">
    <h2 id="lanTitle">2 JOUEURS</h2>
    <!-- 1er temps : le choix, deux options de même poids -->
    <div class="menu" id="lanChoice">
      <button class="nav big" id="lanLocal">SUR CET APPAREIL<small>Les deux joueurs sur le même téléphone ou ordinateur</small></button>
      <button class="nav big" id="lanWifi">SUR LE MÊME WI-FI<small>Chacun sur son téléphone, connectés au même Wi-Fi</small></button>
      <button class="nav sm alt" id="lanBack">◀ RETOUR</button>
    </div>
    <!-- 2e temps (Wi-Fi) : pseudo, créer une partie ou en rejoindre une -->
    <div class="lanWifi hidden" id="lanForm">
      <label class="lanName">TON PSEUDO <input id="lanName" maxlength="14"></label>
      <button class="nav big" id="lanHost">CRÉER UNE PARTIE<small>L'autre joueur la verra apparaître chez lui</small></button>
      <h3>OU REJOINS UNE PARTIE</h3>
      <div id="lanGames"></div>
      <div id="lanStatus" class="note"></div>
      <button class="nav sm alt" id="lanFormBack">◀ RETOUR</button>
    </div>
  </div>`;

const NAME_KEY = 'ff-pseudo';
let lobby: Lobby | null = null;
let hosting = false;
/** Numéro de l'ouverture en cours : une recherche lancée par une visite précédente est ignorée. */
let visit = 0;

function readName(): string {
  try {
    const saved = localStorage.getItem(NAME_KEY);
    if (saved) return saved;
  } catch {
    // pas de stockage : pseudo au hasard
  }
  return `JOUEUR ${10 + Math.floor(Math.random() * 90)}`;
}

const name = () => cleanName($<HTMLInputElement>('#lanName').value);

function status(text: string): void {
  $('#lanStatus').textContent = text;
}

function renderGames(): void {
  const box = $('#lanGames');
  if (!lobby || hosting) {
    box.innerHTML = '';
    return;
  }
  box.innerHTML = lobby.games.length
    ? ''
    : '<p class="note">Aucune partie pour l\'instant : demande à l\'autre joueur de toucher « CRÉER UNE PARTIE ».</p>';
  for (const found of lobby.games) {
    const button = document.createElement('button');
    button.className = 'nav sm lanGame';
    button.innerHTML = `<b>${escapeHtml(found.name)}</b> REJOINDRE ▶`;
    button.addEventListener('click', () => void join(found));
    box.appendChild(button);
  }
}

/** Ferme la recherche de parties (et retire l'annonce de notre partie). */
function stopLobby(): void {
  visit++;
  lobby?.close();
  lobby = null;
  hosting = false;
  $('#lanHost').innerHTML = "CRÉER UNE PARTIE<small>L'autre joueur la verra apparaître chez lui</small>";
}

async function startLobby(): Promise<void> {
  const mine = ++visit;
  status('Recherche des parties sur le Wi-Fi…');
  try {
    const opened = await openLobby();
    if (mine !== visit) return opened.close();
    lobby = opened;
    lobby.onGames = renderGames;
    status('');
    renderGames();
  } catch {
    if (mine === visit)
      status(
        'Impossible de rejoindre le réseau. Vérifie que tu es connecté au Wi-Fi (pas en 4G), puis reviens sur cet écran.',
      );
  }
}

function toggleHost(): void {
  if (!lobby) return toast('Recherche du réseau en cours…');
  playSfx('ok');
  if (hosting) {
    // annuler : on referme et on relance la recherche (l'annonce disparaît avec)
    stopLobby();
    void startLobby();
    return;
  }
  hosting = true;
  saveName();
  $('#lanHost').innerHTML = 'ANNULER<small>Retirer ma partie</small>';
  status(`Partie « ${name()} » créée : en attente d'un adversaire sur le Wi-Fi…`);
  renderGames();
  lobby.host(name(), (link) => {
    lobby = null; // la liaison est établie : la recherche est terminée
    hosting = false;
    game().startLan(link, true);
  });
}

async function join(found: FoundGame): Promise<void> {
  if (!lobby) return;
  playSfx('ok');
  saveName();
  status(`Connexion à ${found.name}…`);
  try {
    const link = await lobby.join(found, name());
    stopLobby();
    game().startLan(link, false);
  } catch (error) {
    status(
      (error as Error).message === 'complet'
        ? `${found.name} joue déjà avec quelqu'un d'autre.`
        : `Pas de réponse de ${found.name}. Vérifiez que vous êtes sur le même Wi-Fi.`,
    );
  }
}

function saveName(): void {
  try {
    localStorage.setItem(NAME_KEY, name());
  } catch {
    // pas de stockage : le pseudo vaut pour cette session
  }
}

/** 1er temps (choix local / Wi-Fi) ou 2e temps (formulaire Wi-Fi). */
function showStep(wifi: boolean): void {
  $('#lanChoice').classList.toggle('hidden', wifi);
  $('#lanForm').classList.toggle('hidden', !wifi);
  $('#lanTitle').textContent = wifi ? '2 JOUEURS · MÊME WI-FI' : '2 JOUEURS';
}

export function openLan(): void {
  stopLobby();
  showStep(false);
  showScreen('lan');
}

/** Retour : du formulaire Wi-Fi au choix, ou du choix au menu. */
export function backFromLan(): void {
  playSfx('back');
  if (!$('#lanForm').classList.contains('hidden')) {
    stopLobby();
    showStep(false);
    $('#lanWifi').focus();
  } else {
    showScreen('menu');
  }
}

export function initLan(): void {
  on('#lanBack', backFromLan);
  on('#lanFormBack', backFromLan);
  on('#lanWifi', () => {
    playSfx('ok');
    $<HTMLInputElement>('#lanName').value = readName();
    showStep(true);
    void startLobby();
  });
  on('#lanLocal', () => {
    playSfx('ok');
    stopLobby();
    openSelect('duo');
  });
  on('#lanHost', toggleHost);
}
