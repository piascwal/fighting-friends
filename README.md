# Fighting Friends

Jeu de combat d'arcade 2D jouable sur téléphone et sur ordinateur.
TypeScript strict, Vite, Vitest, ESLint + Prettier. Aucune bibliothèque de jeu : un moteur maison sur Canvas.

## Démarrer

```bash
npm install
npm run dev        # jeu sur http://localhost:5173, rechargé à chaque modification
npm run check      # types + règles d'architecture + tests
npm run build      # version de production dans dist/
```

Avant de modifier le code, lire **[ARCHITECTURE.md](ARCHITECTURE.md)** : couches, taille des fichiers,
conventions, et « où mettre quoi ».

## Commandes du jeu

|          |                                                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Tactile  | joystick à gauche, boutons A B C D à droite, un seul bouton à la fois                                                                |
| Clavier  | ZQSD / WASD / flèches, A=`U` B=`I` C=`J` D=`K`, pause `Échap`                                                                        |
| Spéciaux | `↓↘→` + poing, `↓↙←` + pied, super : `↓↓` + poing quand la jauge est pleine                                                          |
| Combos   | quand un coup touche, les 4 boutons s'enchaînent librement ; le même bouton fort deux fois = spécial (B B, D D), une 3ᵉ fois = super |

La liste complète est dans le jeu : **Options ▸ Commandes & liste des coups**.

## Ajouter un personnage avec ses propres sprites

1. Dans le jeu : **Options ▸ Personnages & sprites ▸ Nouveau personnage** (nom + style de combat).
2. Toucher une pose ▸ **Copier le prompt**, le coller dans une IA d'images avec l'image de référence du personnage.
   Si l'IA ne trouve pas la posture, lui joindre aussi l'**image guide** (mannequin gris dans la posture
   exacte) : **Copier l'image guide** ou **Partager / Enregistrer**.
3. **Importer l'image** générée (fond magenta `#FF00FF`) : le fond est retiré automatiquement.
4. Seule la pose `idle` est obligatoire ; les poses manquantes réutilisent la plus proche.
5. **Exporter .zip**, déposer le dossier obtenu dans `public/assets/characters/` et ajouter son nom dans
   `public/assets/characters/index.json` (ex. `["matheo"]`) pour que le personnage soit livré avec le jeu.

Un dossier `public/assets/characters/<id>/` contient `character.json` et un PNG par pose (`idle.png`,
`punch_light.png`… — liste dans `src/data/sprite-poses.ts`). Les PNG peuvent être détourés ou sur fond magenta.

## Installer le jeu sur un téléphone

Le jeu est une application web installable (PWA) : une fois installé, il se lance depuis son icône, en plein
écran, à l'horizontale, et fonctionne sans connexion.

- **Android** : ouvrir le jeu dans Chrome, puis le bouton **Installer le jeu** de l'écran titre (ou menu ⋮ ▸
  _Installer l'application_).
- **iPhone** : ouvrir le jeu dans Safari, bouton **Partager** ▸ **Sur l'écran d'accueil**.

Sans installation, le jeu passe quand même en plein écran au premier appui (sauf sur iPhone, où Safari ne le
permet pas).

## Déploiement

Chaque push lance la CI (`.github/workflows/pages.yml`) : vérifications, build, puis publication sur
GitHub Pages. Prérequis unique : **Settings ▸ Pages ▸ Source : GitHub Actions**.
