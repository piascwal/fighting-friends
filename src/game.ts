/* Déroulement du jeu : quel écran vient après quel autre (menus ▸ rencontre ▸ combat ▸ victoire ▸ fin). */
import { playMusic } from './audio/audio';
import { ensureSprites, isLoaded, type SpriteGroup } from './assets/repo-characters';
import { clamp, shuffle } from './core/math';
import { settings } from './core/settings';
import { roster } from './data/roster';
import type { Character } from './data/types';
import { Ai } from './engine/ai';
import { input } from './input';
import { getStage, randomStageIndex, stageForCharacter } from './render/stages';
import { Ending } from './scenes/ending';
import { FightScene } from './scenes/fight-scene';
import type { Scene } from './scenes/scene';
import { ArcadeProgress } from './scenes/progress';
import { Versus } from './scenes/versus';
import { Victory } from './scenes/victory';
import { NetFightScene } from './scenes/net-fight-scene';
import { LanGame } from './lan-game';
import type { Link } from './net/link';
import {
  currentScreen,
  hideScreens,
  openSelect,
  showResult,
  showScreen,
  type GameMode,
  type UiActions,
  wipe,
} from './ui';

/** Niveau des combattants du combat de démonstration. */
const ATTRACT_LEVEL = 2;

class Game implements UiActions {
  scene: Scene | null = null;
  paused = false;
  /** Pause posée automatiquement pendant l'écran des sprites (et à lever au retour). */
  private heldForSprites = false;
  private mode: GameMode = 'versus';
  /** Les deux personnages du combat en cours. */
  private fighters: [Character, Character] | null = null;
  /** Mode arcade : adversaires à affronter, et numéro du combat en cours. */
  private ladder: Character[] = [];
  private ladderStep = 0;
  /** Partie en cours avec un autre appareil sur le même Wi-Fi. */
  private lan: LanGame | null = null;

  /** Chaque changement de scène invalide le combat de démonstration en cours de chargement. */
  private attractToken = 0;

  private setScene(scene: Scene): void {
    this.attractToken++;
    this.scene = scene;
    this.paused = false;
    this.heldForSprites = false;
    this.screenChanged();
  }

  /**
   * L'écran des sprites peut s'ouvrir à tout moment par raccourci (même en plein combat ou pendant une
   * animation) : ce qui se joue derrière s'arrête le temps d'y travailler. Au retour dans un combat,
   * on arrive sur le menu pause, pour reprendre quand on est prêt.
   */
  private holdDuringSprites(): void {
    const onSprites = currentScreen() === 'chars';
    const isAttract = this.scene instanceof FightScene && this.scene.isAttract;
    if (onSprites && !isAttract && !this.paused) {
      this.paused = true;
      this.heldForSprites = true;
    } else if (!onSprites && this.heldForSprites) {
      this.heldForSprites = false;
      if (this.activeFight && !currentScreen()) showScreen('pause');
      else this.paused = false;
    }
  }

  /** Un vrai combat est-il affiché (pas la démonstration) ? */
  private get activeFight(): FightScene | null {
    return this.scene instanceof FightScene && !this.scene.isAttract ? this.scene : null;
  }

  screenChanged(): void {
    this.holdDuringSprites();
    // les commandes tactiles n'apparaissent que pendant un combat, sans menu par-dessus
    const fighting = !!(this.activeFight || this.scene instanceof NetFightScene) && !currentScreen();
    // en réseau, pas de pause : le combat continue chez l'autre
    document.body.classList.toggle('netfight', this.scene instanceof NetFightScene);
    document.body.classList.toggle('infight', fighting);
    if (fighting) input.touch.layout();
    else input.touch.reset();
  }

  currentPlayer(): Character | null {
    return this.fighters?.[0] ?? null;
  }

  /**
   * Charge les images de ces personnages. Un petit message s'affiche si cela dure plus d'un instant
   * (premier combat avec un personnage : ses images n'étaient pas encore chargées).
   */
  private async load(chars: readonly Character[], group: SpriteGroup): Promise<void> {
    const waiting = chars.filter((c) => !isLoaded(c.id, group));
    if (!waiting.length) return;
    const timer = setTimeout(() => document.body.classList.add('loading'), 150);
    try {
      await Promise.all(waiting.map((c) => ensureSprites(c.id, group)));
    } finally {
      clearTimeout(timer);
      document.body.classList.remove('loading');
    }
  }

  /** Combat console contre console qui tourne derrière les menus. */
  startAttract(): void {
    input.twoPlayers = false;
    // de préférence deux personnages dont les images sont déjà chargées (ceux qui viennent de combattre)
    const ready = roster.filter((c) => isLoaded(c.id, 'all'));
    const [a, b] = shuffle(ready.length >= 2 ? ready : roster) as [Character, Character];
    const token = this.attractToken;
    const start = () => {
      if (token !== this.attractToken) return; // un autre écran a pris la place pendant le chargement
      this.setScene(
        new FightScene({
          chars: [a, b ?? a],
          ais: [new Ai(ATTRACT_LEVEL), new Ai(ATTRACT_LEVEL)],
          stage: stageForCharacter(b ?? a),
          rounds: 1,
          mode: 'attract',
          onEnd: () => this.startAttract(),
        }),
      );
      playMusic('menu');
    };
    const chars = [a, b ?? a];
    if (chars.every((c) => isLoaded(c.id, 'all'))) start();
    else void Promise.all(chars.map((c) => ensureSprites(c.id, 'all'))).then(start);
  }

  private toMenu(): void {
    this.lan = null;
    this.startAttract();
    showScreen('menu');
  }

  startLan(link: Link, host: boolean): void {
    let name = 'JOUEUR';
    try {
      name = localStorage.getItem('ff-pseudo') ?? name;
    } catch {
      // pas de stockage
    }
    this.mode = 'lan';
    this.lan = new LanGame(
      link,
      host,
      {
        setScene: (s) => this.setScene(s),
        toMenu: () => this.toMenu(),
        attract: () => this.startAttract(),
      },
      name,
    );
  }

  lanHover(id: string): void {
    this.lan?.hover(id);
  }

  lanPicked(char: Character): void {
    this.lan?.picked(char);
  }

  leaveLan(): void {
    if (this.lan) this.lan.leave();
    else this.toMenu();
  }

  startGame(mode: GameMode, player: Character, opponent: Character | null): void {
    this.mode = mode;
    input.twoPlayers = mode === 'duo';
    if (mode === 'arcade') {
      this.ladder = shuffle(roster.filter((c) => c !== player));
      this.ladderStep = 0;
      this.startMatch(player, this.ladder[0] ?? player);
    } else {
      this.startMatch(player, opponent ?? player);
    }
  }

  /** Niveau de la console : réglage du joueur, et de plus en plus dur au fil du mode arcade. */
  private opponentAi(): Ai | null {
    const base = settings.difficulty;
    switch (this.mode) {
      case 'arcade': {
        const last = this.ladder.length - 1;
        const progress = last > 0 ? this.ladderStep / last : 1;
        return new Ai(clamp(base + 0.3 + progress * 1.2, 0, 3));
      }
      case 'versus':
        return new Ai(base + 0.9);
      case 'training':
        return new Ai(0, true);
      case 'duo':
      case 'lan':
        return null;
    }
  }

  /** Décor du combat : celui de l'adversaire ; en duo et en entraînement, celui du joueur 1 s'il en a un. */
  private stageFor(player: Character, opponent: Character) {
    if (this.mode !== 'duo' && this.mode !== 'training') return stageForCharacter(opponent);
    const own = stageForCharacter(player);
    return own.kind === 'image' ? own : getStage(randomStageIndex());
  }

  private startMatch(player: Character, opponent: Character): void {
    const { mode } = this;
    this.fighters = [player, opponent];
    hideScreens();
    const chars = [player, opponent];
    const fight = () => {
      playMusic('fight');
      wipe();
      // le prochain adversaire du mode arcade se charge pendant ce combat
      const next = this.ladder[this.ladderStep + 1];
      if (mode === 'arcade' && next) void ensureSprites(next.id, 'all');
      this.setScene(
        new FightScene({
          chars: [player, opponent],
          ais: [null, this.opponentAi()],
          stage: this.stageFor(player, opponent),
          rounds: settings.rounds,
          mode: mode === 'training' ? 'training' : 'match',
          onEnd: (winner) => this.endMatch(winner),
        }),
      );
    };
    if (mode === 'training') {
      void this.load(chars, 'all').then(fight);
      return;
    }
    playMusic(null);
    const label = mode === 'arcade' ? `COMBAT ${this.ladderStep + 1} / ${this.ladder.length}` : '';
    // la rencontre n'a besoin que des poses de présentation : le reste se charge pendant qu'elle joue
    void this.load(chars, 'preview').then(async () => {
      void Promise.all(chars.map((c) => ensureSprites(c.id, 'all')));
      const versus = () =>
        this.setScene(new Versus(player, opponent, label, () => void this.load(chars, 'all').then(fight)));
      if (mode !== 'arcade') return versus();
      // arcade : la carte des étapes (visages de tous les adversaires) précède la rencontre
      await Promise.all(this.ladder.map((c) => ensureSprites(c.id, 'portrait')));
      this.setScene(new ArcadeProgress(player, this.ladder, this.ladderStep, versus));
    });
  }

  private endMatch(winnerIndex: number): void {
    const [player, opponent] = this.fighters!;
    const playerWon = winnerIndex === 0;
    input.clear();
    playMusic('menu');
    const playerLost = this.mode !== 'duo' && !playerWon;
    this.setScene(new Victory(playerWon ? player : opponent, playerLost));
    wipe();

    const menu = ['MENU', () => this.toMenu()] as const;
    const rematch = () => this.startMatch(player, opponent);
    if (this.mode !== 'arcade') {
      showResult([['REVANCHE', rematch], ['PERSONNAGES', () => this.reselect()], menu]);
    } else if (!playerWon) {
      showResult([['CONTINUER ?', rematch], menu]);
    } else if (this.ladderStep < this.ladder.length - 1) {
      showResult([
        ['COMBAT SUIVANT ▶', () => this.startMatch(player, this.ladder[++this.ladderStep]!)],
        menu,
      ]);
    } else {
      showResult([['VOIR LA FIN ▶', () => this.playEnding(player)]]);
    }
  }

  private reselect(): void {
    this.startAttract();
    openSelect(this.mode);
  }

  private playEnding(champion: Character): void {
    hideScreens();
    // le générique montre jusqu'à huit personnages autour du champion
    const cast = [champion, ...roster.filter((c) => c !== champion).slice(0, 8)];
    void this.load(cast, 'preview').then(() =>
      this.setScene(
        new Ending(champion, () => {
          this.startAttract();
          showScreen('title');
        }),
      ),
    );
  }

  togglePause(): void {
    const fight = this.activeFight;
    if (!fight || fight.sim.done) return;
    if (!this.paused) {
      this.paused = true;
      showScreen('pause');
    } else if (currentScreen() === 'pause') {
      this.paused = false;
      input.clear();
      hideScreens();
    }
  }

  quitFight(): void {
    input.clear();
    this.toMenu();
  }

  /** Toucher l'écran ou presser Entrée passe l'animation en cours. */
  skip(): void {
    if (!currentScreen()) this.scene?.skip?.();
  }
}

export const gameState = new Game();
