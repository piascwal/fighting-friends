/** Réglages du joueur, conservés sur l'appareil. */
export interface Settings {
  sfx: boolean;
  music: boolean;
  /** 0 = facile, 1 = normal, 2 = difficile */
  difficulty: number;
  /** Nombre de manches à gagner pour remporter un combat. */
  rounds: number;
  hitboxes: boolean;
}

const KEY = 'ff-settings';
const DEFAULTS: Settings = { sfx: true, music: true, difficulty: 1, rounds: 2, hitboxes: false };

function load(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export const settings: Settings = load();

export function saveSettings(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // stockage indisponible (navigation privée) : les réglages restent valables pour la session
  }
}
