/* Publie les besoins en sprites de Fighting Friends pour la banque (dépôt sprite-bank) : les poses communes,
   puis, pour chaque style de combat, ses images propres (coups spéciaux, projectiles, animal) et son
   accessoire (texte ajouté aux prompts : la crosse du hockeyeur…). La banque n'a ainsi jamais besoin de
   connaître les coups du jeu. À relancer quand un style ou une pose change :
     npm run needs -- ../sprite-bank/games/fighting-friends.json */
import { writeFileSync } from 'node:fs';
import { styleSprites } from '../src/data/prompts';
import { SPRITE_POSES } from '../src/data/sprite-poses';
import { STYLE_LIST } from '../src/data/styles';

const needs = {
  game: 'fighting-friends',
  label: 'Fighting Friends',
  /** Poses demandées à tous les personnages. */
  common: SPRITE_POSES.map((spec) => spec.key),
  /** Par style de combat (champ « style » du character.json) : images propres et accessoire. */
  styles: Object.fromEntries(
    STYLE_LIST.map((style) => [
      style.id,
      {
        label: style.label,
        hint: style.hint,
        archetype: style.archetype,
        tags: style.tags,
        poses: styleSprites(style),
        ...(style.gear ? { gear: style.gear } : {}),
        ...(style.companion ? { companion: { idle: style.companion.idle, win: style.companion.win } } : {}),
      },
    ]),
  ),
};

const out = process.argv[2];
if (!out)
  throw new Error('Chemin du fichier à écrire attendu (ex. ../sprite-bank/games/fighting-friends.json)');
writeFileSync(out, `${JSON.stringify(needs, null, 2)}\n`);
console.log(
  `Besoins de Fighting Friends : ${needs.common.length} poses communes, ${STYLE_LIST.length} styles → ${out}`,
);
