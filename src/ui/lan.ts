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
  <div class="screen panel" id="s-lan">
    <div class="bar"><button class="nav sm alt" id="lanBack">◀ RETOUR</button><h2>2 JOUEURS</h2></div>
    <div class="scroll">
      <div class="menu lanMenu">
        <button class="nav big" id="lanLocal">LOCAL<small>Les deux sur cet appareil (clavier ou manettes)</small></button>
      </div>
      <h3>MÊME WI-FI</h3>
      <p class="note">Chacun sur son téléphone, connectés au même Wi-Fi. L'un crée la partie, l'autre la rejoint.</p>
      <div class="row">
        <label>Ton pseudo <input id="lanName" maxlength="14"></label>
        <button class="nav sm" id="lanHost">CRÉER UNE PARTIE</button>
      </div>
      <div id="lanStatus" class="note"></div>
      <div id="lanGames" class="row"></div>
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
    : '<p class="note">Aucune partie pour l\'instant. Demande à l\'autre joueur de créer la sienne.</p>';
  for (const found of lobby.games) {
    const button = document.createElement('button');
    button.className = 'nav sm';
    button.innerHTML = `REJOINDRE ${escapeHtml(found.name)}`;
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
  $('#lanHost').textContent = 'CRÉER UNE PARTIE';
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
  $('#lanHost').textContent = 'ANNULER';
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

export function openLan(): void {
  $<HTMLInputElement>('#lanName').value = readName();
  showScreen('lan');
  stopLobby();
  void startLobby();
}

export function initLan(): void {
  on('#lanBack', () => {
    playSfx('back');
    stopLobby();
    showScreen('menu');
  });
  on('#lanLocal', () => {
    playSfx('ok');
    stopLobby();
    openSelect('duo');
  });
  on('#lanHost', toggleHost);
}
