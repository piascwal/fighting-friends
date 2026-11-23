/* Phrases de rencontre du mode arcade : ce que dit chaque adversaire avant le combat, selon son style. */
import type { Character, StyleId } from './types';

const TAUNTS: Record<StyleId, string> = {
  balanced: "Je n'ai pas de point faible. Essaie toujours.",
  fast: "Tu as déjà perdu et tu ne t'en es pas encore aperçu.",
  heavy: 'Reste là. Je vais juste te passer dessus.',
  tech: "J'ai prévu tes trois prochains coups. Et les suivants.",
  grappler: 'Viens plus près. Ne sois pas timide.',
  counter: "Vas-y, attaque. J'adore quand on m'attaque.",
  ice: 'Garde ton calme… moi, je garde le froid.',
  acrobat: 'Attrape-moi si tu peux !',
  boxer: "Les poings en garde. Le reste, c'est du bruit.",
  kicker: 'Mes jambes parlent plus fort que ma bouche.',
  storm: "Entends-tu le tonnerre ? C'est pour toi.",
  drunken: 'Hips ! Pardon… tu as dit quelque chose ?',
  soldier: 'Soldat, en position. Cible repérée.',
  chain: 'Un, deux, trois… et tu es au tapis.',
  tiger: 'Le tigre ne prévient jamais.',
  berserker: "Ma rage ne demande qu'à sortir !",
  trapper: 'Fais attention où tu mets les pieds…',
  mirror: 'Tout ce que tu lances, je te le renvoie.',
  beam: 'Prépare-toi à voir la lumière.',
  monk: 'Respire. Cela rendra ta défaite plus douce.',
  hockey: 'Gants jetés. Ça va chauffer sur la glace !',
  trainer: 'On forme une équipe, mon compagnon et moi. Toi, tu es seul.',
  padel: 'Un petit match ? Je sers en premier.',
  yogi: 'Mon esprit est calme. Le tien ne le restera pas.',
  dancer: 'Suis le rythme, ou tombe sur la piste.',
  lazy: 'Bon… on est vraiment obligés de se battre ?',
};

const LAST_STEP = 'Tu as fait tout ce chemin… mais ici, tout s’arrête. Je suis l’ultime étape.';

/** Ce que dit l'adversaire de cette étape (la dernière a une phrase à part). */
export function encounterLine(opponent: Character, last: boolean): string {
  return last ? LAST_STEP : TAUNTS[opponent.style.id];
}
