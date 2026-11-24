# Fighting Friends

Jeu de combat d'arcade 2D jouable sur téléphone et sur ordinateur.
TypeScript strict, Vite, Vitest, ESLint + Prettier. Aucune bibliothèque de jeu : un moteur maison sur Canvas.

## Démarrer

```bash
npm install
npm run sprites    # copie les sprites des personnages depuis la banque (sprite-bank)
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

En **mode arcade**, une carte des étapes montre avant chaque combat les adversaires déjà battus, le
prochain (avec sa phrase de rencontre) et ceux qui restent, puis l'animation VS se lance.

## Ajouter un personnage avec ses propres sprites

1. Dans le jeu : **Options ▸ Personnages & sprites ▸ Nouveau personnage** (nom, style de combat et taille :
   petit, normal ou grand ; un petit est plus dur à toucher mais a moins d'allonge).
   Pour créer son apparence à partir d'une photo : panneau **Créer son apparence à partir d'une photo**
   (ouvert d'office tant que le personnage n'a pas d'image de garde). Il donne un prompt à copier et l'image
   de garde d'un personnage existant sur fond magenta, qui sert de modèle de direction artistique.
2. Toucher une pose ▸ **Copier le prompt**, le coller dans une IA d'images avec l'image de référence du personnage.
   Si l'IA ne trouve pas la posture, lui joindre aussi l'**image guide** (mannequin gris dans la posture
   exacte) : **Copier l'image guide** ou **Partager / Enregistrer**.
3. **Importer l'image** générée (fond magenta `#FF00FF`) : le fond est retiré automatiquement.
4. Seule la pose `idle` est obligatoire ; les poses manquantes réutilisent la plus proche.
5. **Exporter .zip**, déposer le dossier obtenu dans `collections/fighting-friends/` de la **banque de
   sprites** ([sprite-bank](https://github.com/piascwal/sprite-bank)) et ajouter son nom dans son
   `index.json` (ex. `["matheo"]`) pour que le personnage soit livré avec le jeu.

**Les sprites viennent de la banque.** `public/assets/characters/` n'est pas versionné ici : `npm run sprites`
le remplit avec la collection `fighting-friends` de sprite-bank, à la version fixée par `sprites.json`
(`"v1"` = la plus récente des v1.x ; `"v1.4"` = cette version exacte, pour figer le jeu). La CI le fait avant
chaque construction : après un changement dans la banque, relancer le déploiement (onglet **Actions**,
**Vérifier et déployer**, **Run workflow**) suffit pour que le jeu le récupère. En local, lancer
`npm run sprites` une fois avant `npm run dev`. La version récupérée est écrite dans
`public/assets/characters/VERSION`.

Un dossier `public/assets/characters/<id>/` contient `character.json` (style, couleur, réglages et liste des
fichiers) et une image par pose, en WebP (`idle.webp`, `punch_light.webp`… — liste dans
`src/data/sprite-poses.ts` et `src/data/special-poses.ts`). Les images importées sont compressées
automatiquement : 5 fois plus légères qu'en PNG, sans différence visible.

### Envoyer les retouches d'un personnage déjà livré

Sur un personnage livré avec le jeu, tout ce qui est changé sur l'appareil (image importée qui remplace ou
complète celles du jeu, taille/position retouchée) est marqué **✎ À ENVOYER** sur sa carte et listé sous le
personnage. **Exporter les changements** télécharge `<id>-changements.zip` : le `character.json` complet à
jour (avec `"changes": { "images": [...], "adjust": [...] }`) et **seulement** les images modifiées.
Pour l'intégrer : copier le contenu du dossier dans `public/assets/characters/<id>/` (les images s'ajoutent
ou remplacent, `character.json` est remplacé). Sa date `updated` étant plus récente que les retouches, les
copies locales sont effacées et les marqueurs disparaissent au chargement suivant.

**Export en masse** (en haut de l'écran des sprites) : tous les changements de tous les personnages
(images, tailles/positions, style, couleur, taille, nouveaux personnages) dans une liste à cocher, avec
**Tout sélectionner**. La sélection part dans un seul .zip, un dossier par personnage. Un changement non
coché reste sur l'appareil : la date `updated` de l'export est placée juste avant lui.

Chaque personnage peut aussi avoir son **décor** : carte « Décor » dans l'écran des sprites, avec un prompt à
compléter par la description de la scène et une image guide qui fixe le sol et la taille des combattants.

**26 styles de combat**, chacun avec sa famille et ses capacités (affichées à la sélection) :
Équilibré, Rapide, Lourd, Technique, Lutteur (prises imparables), Maître du contre, Givre, Voltigeur, Boxeur,
Taekwondo, Tempête, Poing ivre, Soldat (coups à charge), Enchaîneur (frappe en trois temps), Tigre (posture
à quatre sorties), Berserker (rage temporaire), Artificier (mines), Miroir (renvoie les projectiles), Énergiste
(rayon), Moine (méditation qui soigne) et Hockeyeur (palet au ras du sol à bloquer accroupi, mise en
échec avec armure, bagarre « gants jetés » en super) et Dresseur (son animal de compagnie fonce, bondit par-dessus lui et
bouscule l'adversaire ; ses images se génèrent à partir d'une photo de l'animal).
S'y ajoutent Padel (balle tendue et smash à la raquette), Yogi (mandala, lévitation, esprit totem) et
Danseuse (pirouettes, pole dance, projecteurs du club) et Flemmard (une-deux au ballon qui revient, flemme nonchalante qui soigne). Changer le style d'un personnage ne fait perdre aucune image ; la liste
des styles indique ceux qui sont déjà pris, et un nouveau personnage reçoit d'office un style libre.

## Jouer à deux sur le même Wi-Fi

**2 JOUEURS ▸ Même Wi-Fi** : chacun sur son appareil, connectés au même Wi-Fi. L'un fait **Créer une
partie**, l'autre la voit apparaître et la **rejoint** : aucune adresse à saisir, aucun serveur à installer.
La mise en relation passe par [lan-kit](https://github.com/piascwal/lan-kit) (comme Face-Off et Bandeja),
puis les deux appareils sont reliés directement (WebRTC, réseau local uniquement).

Chacun choisit son personnage ; les deux appareils font tourner le même combat et n'échangent que les
entrées des manettes, image par image (« lockstep », `src/net/lockstep.ts`), avec 50 ms de retard
d'entrée. Pour le tester sur un seul ordinateur : ouvrir le jeu dans deux onglets avec `?lan=test`
au bout de l'adresse.

## Installer le jeu sur un téléphone

Le jeu est une application web installable (PWA) : une fois installé, il se lance depuis son icône, en plein
écran, à l'horizontale, et fonctionne sans connexion.

- **Android** : ouvrir le jeu dans Chrome, puis le bouton **Installer le jeu** de l'écran titre (ou menu ⋮ ▸
  _Installer l'application_).
- **iPhone** : ouvrir le jeu dans Safari, bouton **Partager** ▸ **Sur l'écran d'accueil**.

Pour travailler les sprites en alternant avec un générateur d'images : **Options ▸ Personnages & sprites** passe
le jeu à la verticale (quand le téléphone le permet) et le remet à l'horizontale en quittant cet écran. Sur
Android, un appui long sur l'icône du jeu propose aussi ce raccourci.

Sans installation, le jeu passe quand même en plein écran au premier appui (sauf sur iPhone, où Safari ne le
permet pas).

## Déploiement

Chaque push lance la CI (`.github/workflows/pages.yml`) : vérifications, build, puis publication sur
GitHub Pages. Prérequis unique : **Settings ▸ Pages ▸ Source : GitHub Actions**.
