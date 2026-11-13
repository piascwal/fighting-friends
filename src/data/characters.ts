/* Personnages livrés avec le jeu. Un personnage = une fiche ici ; ses coups viennent de son style. */
import type { CharacterDef } from './types';

export const BASE_CHARACTERS: readonly CharacterDef[] = [
  {
    id: 'ardan',
    name: 'ARDAN',
    style: 'balanced',
    color: '#ff6a2b',
    title: 'Le Poing Solaire',
    stage: 0,
    quote: 'Reviens quand ta flamme brûlera plus fort.',
    ending: [
      "Le tournoi s'achève dans une pluie d'étincelles.",
      "Ardan desserre enfin les poings : la flamme qu'il cherchait",
      "n'était pas dans la victoire, mais dans le combat lui-même.",
      "Demain, il reprendra la route. Il reste tant d'amis à défier.",
    ],
  },
  {
    id: 'zelie',
    name: 'ZÉLIE',
    style: 'fast',
    color: '#19c6c6',
    title: "L'Éclair de la Ville",
    stage: 1,
    quote: 'Trop lent ! Tu as cligné des yeux ?',
    ending: [
      "Personne n'a réussi à la toucher deux fois de suite.",
      'Zélie brandit le trophée... puis le lance à la foule.',
      '« Les médailles, ça ralentit. »',
      'Avant même la fin des applaudissements, elle a disparu.',
    ],
  },
  {
    id: 'bruno',
    name: 'BRUNO',
    style: 'heavy',
    color: '#d9a441',
    title: 'La Montagne',
    stage: 2,
    quote: 'La montagne ne recule pas.',
    ending: [
      'Le sol tremble encore sous les pas du champion.',
      "Bruno soulève le trophée d'une seule main,",
      'puis invite tous ses adversaires à sa table.',
      'Chez lui, un combat se termine toujours par un festin.',
    ],
  },
  {
    id: 'sable',
    name: 'SABLE',
    style: 'tech',
    color: '#a25bff',
    title: "L'Ombre Sans Nom",
    stage: 3,
    quote: 'Tu frappais une ombre depuis le début.',
    ending: [
      "Quand les projecteurs s'allument, le ring est vide.",
      'Sur le trophée, un simple ruban rouge noué.',
      'On dit que Sable observe déjà le prochain tournoi,',
      'quelque part entre deux battements de cils.',
    ],
  },
];
