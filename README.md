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

## Personnages et sprites : la banque

Les images des personnages ne se fabriquent plus dans le jeu : elles vivent dans la **banque de sprites**
([sprite-bank](https://github.com/piascwal/sprite-bank)), partagée avec les autres jeux, et son **atelier**
(https://piascwal.github.io/sprite-bank/) sert à les créer : nouveau personnage, prompts à copier, image
guide, import, réglages, décor, export. Dans le jeu, **Options ▸ Personnages & sprites** ouvre l'atelier.

**Le jeu copie les sprites de la banque à sa construction.** `public/assets/characters/` n'est pas versionné
ici : `npm run sprites` le remplit avec le dossier `characters/` de sprite-bank, à la version fixée par
`sprites.json` (`"v2"` = la plus récente des v2.x ; `"v2.4"` = cette version exacte, pour figer le jeu). La CI
le fait avant chaque construction : après un changement dans la banque, relancer le déploiement (onglet
**Actions**, **Vérifier et déployer**, **Run workflow**) suffit pour que le jeu le récupère. En local, lancer
`npm run sprites` une fois avant `npm run dev`. La version récupérée est écrite dans
`public/assets/characters/VERSION`.

**Le jeu publie ses besoins dans la banque** : les poses communes et, pour chaque style de combat, ses images
propres et son accessoire (`npm run needs -- ../sprite-bank/games/fighting-friends.json`). À refaire quand un
style ou une pose change : l'atelier affiche alors ce qui manque à chaque personnage pour ce jeu.

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

Sans installation, le jeu passe quand même en plein écran au premier appui (sauf sur iPhone, où Safari ne le
permet pas).

## Déploiement

Chaque push lance la CI (`.github/workflows/pages.yml`) : vérifications, build, puis publication sur
GitHub Pages. Prérequis unique : **Settings ▸ Pages ▸ Source : GitHub Actions**.
