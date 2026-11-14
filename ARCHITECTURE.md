# Architecture de Fighting Friends

Ce document fixe les règles qui gardent le code lisible et modifiable par un humain, même quand le jeu grossit.
Les règles marquées **[vérifié]** sont contrôlées automatiquement par `npm run lint` ou `npm test` : une
infraction fait échouer la CI, donc le déploiement. Les autres relèvent de la relecture.

## 1. Principe directeur

**Le jeu est une simulation pure, entourée de couches qui la montrent et la pilotent.**

- La simulation (`engine/`) calcule ce qui se passe : positions, coups, dégâts, manches. Elle ne dessine rien,
  ne joue aucun son, ne lit aucune touche. Elle tourne sans navigateur, ce qui permet de la tester en quelques
  millisecondes.
- Les autres couches lui donnent des entrées (manettes abstraites) et réagissent à ce qu'elle annonce
  (événements : impact, son, secousse…).
- Le contenu (personnages, coups, poses) est de la **donnée déclarative** dans `data/`. Le moteur ne contient
  aucun cas particulier par personnage : ajouter un personnage ou régler un coup ne touche que `data/`.

## 2. Les couches

```
                    main.ts  ──►  game.ts            (assemblage, déroulement des écrans)
                                    │
          ┌─────────────┬───────────┼────────────┬──────────┐
          ▼             ▼           ▼            ▼          ▼
        scenes/   ───►  ui/       input/       audio/     render/
          │                         │                       │
          ▼                         ▼                       ▼
        engine/  ◄──────────────────┘              assets/  (sprites, fichiers)
          │                                            │
          ▼                                            ▼
        data/  ──────────────────────────────────►  core/   (outils sans dépendance)
```

| Couche    | Rôle                                                                                               | Peut importer                                        |
| --------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `core/`   | Outils génériques : maths, couleurs, constantes, stockage, réglages, plateforme (plein écran, PWA) | rien                                                 |
| `data/`   | Contenu du jeu : types, poses, coups, styles, personnages, prompts                                 | `core`                                               |
| `engine/` | Simulation du combat, IA, règles d'enchaînement                                                    | `core`, `data`                                       |
| `assets/` | Sprites en mémoire, détourage, import/export de personnages                                        | `core`, `data`                                       |
| `audio/`  | Synthèse sonore, effets, musique                                                                   | `core`                                               |
| `input/`  | Clavier, tactile, manettes → manettes abstraites du moteur                                         | `core`, `data`, `engine`                             |
| `render/` | Tout ce qui dessine dans le canvas                                                                 | `core`, `data`, `engine`, `assets`                   |
| `scenes/` | Écrans animés du canvas (combat, versus, victoire, fin)                                            | toutes les couches sauf `ui`                         |
| `ui/`     | Menus HTML par-dessus le canvas                                                                    | `core`, `data`, `assets`, `render`, `audio`, `input` |
| `game.ts` | Enchaîne les écrans et les modes de jeu                                                            | tout                                                 |
| `main.ts` | Démarrage, mise à l'échelle, boucle principale                                                     | tout                                                 |

Règles :

1. **[vérifié]** Une couche n'importe que les couches listées en face d'elle. Les dépendances vont toujours
   vers le bas du schéma, jamais vers le haut ni en boucle.
2. **[vérifié]** Rien n'importe `game.ts` ni `main.ts`. Si une couche a besoin de demander quelque chose au
   jeu, elle passe par une interface qu'on lui fournit (exemple : `ui/actions.ts` décrit ce que les menus
   peuvent demander, `game.ts` l'implémente).
3. **[vérifié]** `engine/` et `data/` n'utilisent aucune API du navigateur (`window`, `document`,
   `localStorage`…).
4. Le moteur communique vers l'extérieur uniquement par des **événements** (`engine/events.ts`). Pour ajouter
   un effet visuel ou sonore à un coup, on émet un événement ; la scène le transmet à l'affichage et au son.

## 3. Taille et découpage des fichiers

La taille n'est qu'un signal. Le vrai critère est la **cohésion** : un fichier doit pouvoir se résumer en
une phrase, et cette phrase est écrite dans son commentaire d'en-tête.

| Mesure (lignes de code, hors blancs et commentaires) | Cible | Maximum **[vérifié]** |
| ---------------------------------------------------- | ----- | --------------------- |
| Fichier                                              | ≤ 300 | 400                   |
| Fonction                                             | ≤ 40  | 90                    |
| Imbrication de blocs                                 | ≤ 3   | 4                     |

Quand un fichier approche de la limite, on ne coupe pas au hasard : on cherche **la responsabilité qui peut
partir avec son vocabulaire**. Exemples dans le projet :

- `engine/fighter.ts` (états du combattant) → `fighter-attack.ts` (déroulement d'un coup) et
  `fighter-pose.ts` (choix de la posture).
- `render/rig.ts` (pantin) → `rig-skeleton.ts` (géométrie) et `rig-head.ts` (visage, coiffures).
- `render/fx.ts` (quoi faire apparaître) → `fx-draw.ts` (comment le dessiner).

Exceptions admises :

- **Données** : une liste de données longue mais homogène (ex. toutes les poses) peut dépasser la cible.
  Si elle dépasse 400 lignes, on la découpe par thème (un fichier par style de combat, par exemple).
- **Cohésion réelle** : si découper rendrait la lecture plus difficile, on garde le fichier entier et on le
  dit en tête de fichier avec `/* eslint-disable max-lines -- raison */`. La raison est obligatoire et
  relue en revue.

Signes qu'il faut découper même sous la limite : le fichier a deux groupes de fonctions qui ne s'appellent
jamais entre eux ; on ne sait pas où ranger une nouvelle fonction ; le nom du fichier contient « et » ou
« utils ».

## 4. Où mettre quoi

| Je veux…                                                         | Je touche…                                                                                                                          |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Ajouter un personnage                                            | une fiche dans `data/characters.ts` (ou un dossier `public/assets/characters/<id>/`)                                                |
| Régler un coup (dégâts, vitesse, zone)                           | `data/normals.ts` ou `data/styles/<style>.ts`                                                                                       |
| Créer un style de combat                                         | `data/styles/<nouveau>.ts` + une ligne dans `data/styles/index.ts` + son id dans `StyleId` + son pantin dans `data/styles/looks.ts` |
| Ajouter une image de coup spécial ou de projectile               | `data/special-poses.ts` (nom, description pour le prompt, posture guide) ; le coup la cite dans `sprite` ou `proj.sprite`           |
| Changer la direction artistique des prompts                      | `ART_DIRECTION` dans `data/prompts.ts`                                                                                              |
| Changer une règle d'enchaînement                                 | `engine/move-select.ts` (+ un test dans `tests/combos.test.ts`)                                                                     |
| Changer une manipulation (↓↘→…)                                  | `engine/input-buffer.ts`, constante `MOTIONS`                                                                                       |
| Ajouter un effet visuel                                          | `render/fx.ts` (création) et `render/fx-draw.ts` (dessin)                                                                           |
| Ajouter un son                                                   | `core/sfx.ts` (son nom) puis `audio/sounds.ts` (sa recette)                                                                         |
| Ajouter un décor dessiné par le jeu                              | `render/stage-painters.ts` (un décor par personnage, lui, est une image importée)                                                   |
| Changer l'icône, le nom ou l'orientation de l'application        | `public/manifest.webmanifest` et `public/icons/`                                                                                    |
| Changer ce qui marche hors ligne                                 | `scripts/sw-template.js` (modèle du service worker)                                                                                 |
| Changer la compression des images                                | `assets/image-codec.ts`                                                                                                             |
| Changer la reprise d'un personnage local par sa version du dépôt | `assets/repo-characters.ts`                                                                                                         |
| Ajouter un écran de menu                                         | un fichier dans `ui/`, branché dans `ui/index.ts`                                                                                   |
| Changer l'enchaînement des écrans                                | `game.ts`                                                                                                                           |

## 5. Application installable (PWA)

Le jeu est une application web installable, qui se lance en plein écran à l'horizontale et marche hors ligne.

- `public/manifest.webmanifest` décrit l'application : nom, icônes, `display: fullscreen`,
  `orientation: landscape`.
- **Mises à jour sans problème de cache** (même mécanisme que dkk-rock) :
  - chaque déploiement porte un numéro de version (`majeur.mineur` de package.json + numéro d'exécution de la
    CI), publié dans `version.json` et affiché sur l'écran titre ;
  - le service worker est **généré à la construction** (`scripts/sw-template.js`, rempli par `vite.config.ts`)
    avec cette version et la liste complète des fichiers : chaque version a son propre cache, rempli d'un coup,
    donc une page ne mélange jamais deux versions. La page et `version.json` passent par le réseau d'abord,
    le reste vient du cache (jouable hors ligne) ;
  - à l'ouverture et à chaque retour dans l'application (une fois par minute au plus), le jeu compare sa
    version à `version.json` (`core/version.ts`). Sur l'écran titre ou le menu, il se recharge tout seul ;
    ailleurs (combat en cours…), un bandeau propose de recharger (`ui/update-banner.ts`) ;
  - filet de sécurité `public/rescue.js` : si le jeu n'a pas démarré au bout de 6 s (page d'une version
    effacée), il vide le cache et recharge, une seule fois.
- `core/display.ts` gère plein écran et verrouillage de l'orientation ; `core/pwa.ts` l'enregistrement du
  service worker et la proposition d'installation.
- Le jeu ne se joue qu'à l'horizontale : à la verticale sur téléphone, un message recouvre tout et le
  combat se met en pause. Seule exception : l'écran « Personnages & sprites », utilisable dans les deux sens
  pour passer facilement du jeu au générateur d'images. On y accède depuis ce message, ou par le raccourci de
  l'icône (`?ecran=personnages`) ; ce qui se jouait derrière reste figé pendant ce temps (`game.ts`).

## 6. Images des personnages

- **Une image par pose, nommée par ce qu'elle montre.** Les poses communes (`data/sprite-poses.ts`) servent
  à tous les styles ; les coups spéciaux et projectiles ont chacun leur image (`data/special-poses.ts`),
  partagée par les styles qui font le même geste. La liste demandée pour un style se déduit de ses coups
  (`styleSprites`) : rien à tenir à jour à la main.
- **Rien ne se perd en changeant de style** : les images sont rangées par nom, pas par « spécial 1/2 ».
  Celles qui ne servent plus apparaissent dans « Images conservées des autres styles ».
- **Compression** : WebP 95 % (`assets/image-codec.ts`), visuellement identique au PNG et 5 fois plus léger.
  Un fichier compressé est gardé tel quel (enregistrement, export) : il n'est jamais recompressé.
- **Personnage du dépôt déjà présent sur l'appareil** : la version du dépôt remplace la version locale
  (copies locales effacées) sauf pour les images importées après son export (`updated` du character.json).

## 7. Conventions de code

- **TypeScript strict**, pas de `any`. Les données de jeu ont des types précis (`MoveDef`, `HitDef`…) :
  une faute de frappe dans un coup est une erreur de compilation.
- **[vérifié]** Exports nommés uniquement (pas de `export default`) : un même nom partout.
- **Pas de nombres magiques dans la logique** : toute valeur réglable devient une constante nommée en haut du
  fichier, avec son unité (`frames`, `px/frame`…). Les données (coups, poses) sont l'exception : ce sont des
  tableaux de réglages par nature, et leur format est documenté dans `data/types.ts`.
- **Unités** : le temps se compte en **frames** (1/60 s), les distances en **pixels monde** (écran de
  960 × 540, sol à y = 452, `y` négatif vers le haut).
- **Commentaires en français**, qui expliquent le _pourquoi_ et le vocabulaire du jeu (hitstop, juggle,
  annulation). Chaque fichier commence par un commentaire d'une ou deux phrases qui dit son rôle.
- **Noms parlants** : `hitstun` plutôt que `hs` dans le code ; les abréviations ne sont tolérées que dans
  les données compactes, et elles y sont documentées (`hs`, `bs`, `kb` dans `HitDef`).
- **Formatage** automatique par Prettier (`npm run format`) : on ne discute jamais de mise en page.

## 8. Tests

- Toute règle de gameplay a un test dans `tests/` : un enchaînement, une manipulation, une garde. Les tests
  rejouent une suite d'entrées frame par frame dans une vraie simulation (`tests/harness.ts`) et vérifient
  les coups réellement sortis.
- Avant de modifier une règle d'enchaînement, on écrit d'abord le test qui décrit le nouveau comportement.
- Les combats console contre console (`tests/matches.test.ts`) vérifient qu'aucune combinaison de
  personnages ne bloque le jeu.
- Pas de tests sur l'affichage : il est vérifié à l'œil (`npm run dev`).

## 9. Chaîne de vérification

`npm run check` = types + lint (règles ci-dessus) + tests. La CI le lance à chaque push, avant de construire
et de déployer sur GitHub Pages : **un code qui ne respecte pas l'architecture n'est jamais déployé.**
