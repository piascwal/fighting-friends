/* Écran des options. */
import { playSfx, refreshMusic } from '../audio/audio';
import { saveSettings, settings, type Settings } from '../core/settings';
import { $$, on, toast } from './dom';
import { showScreen } from './screens';

export const OPTIONS_HTML = `
  <div class="screen panel" id="s-options">
    <div class="bar"><button class="nav sm alt" id="optBack">◀ RETOUR</button><h2>OPTIONS</h2></div>
    <div class="scroll"><div class="opts">
      <button class="nav opt" data-opt="sfx"></button>
      <button class="nav opt" data-opt="music"></button>
      <button class="nav opt" data-opt="difficulty"></button>
      <button class="nav opt" data-opt="rounds"></button>
      <button class="nav opt" data-opt="hitboxes"></button>
      <button class="nav opt" id="optFullscreen">PLEIN ÉCRAN</button>
      <button class="nav opt hl" id="optChars">PERSONNAGES &amp; SPRITES ▶<small>Ajouter un personnage, voir les images manquantes, copier les prompts</small></button>
      <button class="nav opt hl" id="optMoves">COMMANDES &amp; LISTE DES COUPS ▶</button>
    </div></div>
  </div>`;

/** Un réglage : son libellé, ses valeurs possibles (dans l'ordre du cycle) et leur nom affiché. */
interface OptionDef<K extends keyof Settings> {
  label: string;
  values: readonly Settings[K][];
  names: readonly string[];
}

const YES_NO = { values: [false, true], names: ['NON', 'OUI'] } as const;
const OPTIONS: { [K in keyof Settings]: OptionDef<K> } = {
  sfx: { label: 'EFFETS SONORES', ...YES_NO },
  music: { label: 'MUSIQUE', ...YES_NO },
  difficulty: { label: 'DIFFICULTÉ', values: [0, 1, 2], names: ['FACILE', 'NORMAL', 'DIFFICILE'] },
  rounds: { label: 'MANCHES GAGNANTES', values: [1, 2, 3], names: ['1', '2', '3'] },
  hitboxes: { label: 'AFFICHER LES ZONES DE COUPS', ...YES_NO },
};

function refresh(): void {
  for (const button of $$('[data-opt]')) {
    const key = button.dataset.opt as keyof Settings;
    const option = OPTIONS[key] as OptionDef<keyof Settings>;
    const index = Math.max(0, option.values.indexOf(settings[key]));
    button.innerHTML = `${option.label}<em>${option.names[index]}</em>`;
  }
}

/** Passe un réglage à sa valeur suivante. */
function cycle<K extends keyof Settings>(key: K): void {
  const { values } = OPTIONS[key];
  settings[key] = values[(values.indexOf(settings[key]) + 1) % values.length]!;
  saveSettings();
  refresh();
  if (key === 'music') refreshMusic();
  playSfx('move');
}

async function toggleFullscreen(): Promise<void> {
  if (document.fullscreenElement) return document.exitFullscreen();
  try {
    await document.documentElement.requestFullscreen();
    // sur téléphone, on en profite pour basculer à l'horizontale quand c'est permis
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await orientation.lock?.('landscape').catch(() => {});
  } catch {
    toast("Plein écran indisponible ici : ajoute la page à ton écran d'accueil");
  }
}

export function openOptions(): void {
  refresh();
  showScreen('options');
}

export interface OptionsHandlers {
  openCharacters(): void;
  openMoves(): void;
}

export function initOptions(handlers: OptionsHandlers): void {
  for (const button of $$('[data-opt]')) {
    button.addEventListener('click', () => cycle(button.dataset.opt as keyof Settings));
  }
  on('#optBack', () => {
    playSfx('back');
    showScreen('menu');
  });
  on('#optFullscreen', () => void toggleFullscreen());
  on('#optChars', () => {
    playSfx('ok');
    handlers.openCharacters();
  });
  on('#optMoves', () => {
    playSfx('ok');
    handlers.openMoves();
  });
}
