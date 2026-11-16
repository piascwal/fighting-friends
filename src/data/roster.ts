/* La liste des personnages jouables, en mémoire : ceux du jeu + ceux ajoutés par le joueur ou par le dépôt. */
import { DEFAULT_LOOKS, STYLES } from './styles';
import type { Character, CharacterDef, Look, StyleId } from './types';

/** Tailles proposées à la création d'un personnage. Un petit est plus dur à toucher mais a moins d'allonge. */
export const SIZES = [
  { value: 0.8, label: 'Petit' },
  { value: 1, label: 'Normal' },
  { value: 1.12, label: 'Grand' },
] as const;

/** Taille ramenée aux bornes prévues (une valeur absente ou invalide vaut « normal »). */
export const clampSize = (size: number | undefined): number =>
  typeof size === 'number' && size >= 0.7 && size <= 1.3 ? size : 1;

/** Pantin d'un personnage sans apparence propre : celui de son style, recoloré à sa couleur. */
function defaultLook(style: StyleId, color: string, tint: boolean): Look {
  const base = DEFAULT_LOOKS[style];
  return tint ? { ...base, top: color, accent: color, band: color } : { ...base };
}

export function makeCharacter(def: CharacterDef): Character {
  const styleId = STYLES[def.style] ? def.style : 'balanced';
  const custom = def.custom ?? false;
  return {
    id: def.id,
    name: def.name,
    color: def.color,
    styleId,
    style: STYLES[styleId],
    look: def.look ?? defaultLook(styleId, def.color, custom),
    title: def.title ?? 'Nouveau challenger',
    quote: def.quote ?? 'À qui le tour ?',
    stage: def.stage ?? 0,
    size: clampSize(def.size),
    ending: def.ending ?? [
      'Un nouveau champion est né.',
      `${def.name} a prouvé sa valeur face aux meilleurs.`,
      "Mais ce n'est que le début de la légende...",
    ],
    custom,
    repo: def.repo ?? false,
  };
}

/** Rempli au démarrage : personnages livrés dans public/assets/characters, puis ceux créés sur l'appareil. */
export const roster: Character[] = [];

export const characterById = (id: string): Character | undefined => roster.find((c) => c.id === id);

/** Personnages qui utilisent ce style (sauf `except`) : pour éviter d'avoir deux fois le même. */
export function styleUsers(style: StyleId, except?: Character): Character[] {
  return roster.filter((c) => c.styleId === style && c !== except);
}

/** Ajoute un personnage, ou remplace celui qui porte déjà cet identifiant. */
export function addCharacter(def: CharacterDef): Character {
  const char = makeCharacter(def);
  const index = roster.findIndex((c) => c.id === char.id);
  if (index >= 0) roster[index] = char;
  else roster.push(char);
  return char;
}

export function removeCharacter(char: Character): void {
  const index = roster.indexOf(char);
  if (index >= 0) roster.splice(index, 1);
}

/** Change le style (ou rafraîchit le pantin après un changement de couleur) d'un personnage créé par le joueur. */
export function restyleCharacter(char: Character, style: StyleId): void {
  char.styleId = style;
  char.style = STYLES[style];
  if (char.custom) char.look = defaultLook(style, char.color, true);
}
