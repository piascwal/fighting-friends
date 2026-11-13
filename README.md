# Fighting Friends

Jeu de combat d'arcade 2D (mobile + ordinateur), sans dépendance ni étape de build : HTML/CSS/JS pur.

## Lancer

Servir le dossier avec n'importe quel serveur statique (`python3 -m http.server`) et ouvrir `index.html`,
ou utiliser la version déployée sur GitHub Pages.

## Commandes

| | |
|---|---|
| Tactile | joystick à gauche, boutons A B C D à droite, un seul bouton à la fois |
| Clavier | ZQSD / WASD / flèches, A=`U` B=`I` C=`J` D=`K`, pause `Échap` |
| Spéciaux | `↓↘→` + poing, `↓↙←` + pied, super : `↓↓` + poing quand la jauge est pleine |
| Combos | quand un coup touche, les 4 boutons s'enchaînent librement ; le même bouton fort deux fois = spécial (B B, D D), une 3ᵉ fois = super |

La liste complète est dans le jeu : **Options ▸ Commandes & liste des coups**.

## Ajouter un personnage avec ses propres sprites

1. Dans le jeu : **Options ▸ Personnages & sprites ▸ Nouveau personnage** (nom + style de combat).
2. Toucher une pose ▸ **Copier le prompt**, le coller dans une IA d'images avec l'image de référence du personnage.
3. **Importer l'image** générée (fond magenta `#FF00FF`) : le fond est retiré automatiquement.
4. Seule la pose `idle` est obligatoire ; les poses manquantes réutilisent la plus proche.
5. **Exporter .zip** puis déposer le dossier obtenu dans `assets/characters/` et ajouter son nom dans
   `assets/characters/index.json` (ex. `["matheo"]`) pour que le personnage soit livré avec le jeu.

Format d'un dossier `assets/characters/<id>/` : `character.json` + un PNG par pose
(`idle.png`, `punch_light.png`, `kick_heavy.png`, ... — noms listés dans `js/poses.js`).
Les PNG peuvent être détourés ou encore sur fond magenta.

## Code

`js/characters.js` styles de combat et coups · `js/fighter.js` moteur (états, combos, manipulations) ·
`js/fight.js` manches, collisions, HUD · `js/poses.js` postures et prompts · `js/sprites.js` import/détourage ·
`js/rig.js` personnages provisoires dessinés par code · `js/ui.js` menus.
