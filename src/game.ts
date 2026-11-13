/* Déroulement du jeu : quel écran vient après quel autre (menus ▸ rencontre ▸ combat ▸ victoire ▸ fin). */
import { playMusic } from './audio/audio';
import { clamp, shuffle } from './core/math';
import { settings } from './core/settings';
import { roster } from './data/roster';
import type { Character } from './data/types';
import { Ai } from './engine/ai';
import { input } from './input';
import { randomStageIndex } from './render/stages';
import { Ending } from './scenes/ending';
import { FightScene } from './scenes/fight-scene';
import type { Scene } from './scenes/scene';
import { Versus } from './scenes/versus';
import { Victory } from './scenes/victory';
import {
  currentScreen,
  hideScreens,
  openSelect,
  showResult,
  showScreen,
  type GameMode,
  type UiActions,
} from './ui';

/** Niveau des combattants du combat de démonstration. */
const ATTRACT_LEVEL = 2;

class Game implements UiActions {
  scene: Scene | null = null;
  paused = false;
  private mode: GameMode = 'versus';
  /** Les deux personnages du combat en cours. */
  private fighters: [Character, Character] | null = null;
  /** Mode arcade : adversaires à affronter, et numéro du combat en cours. */
  private ladder: Character[] = [];
  private ladderStep = 0;

  private setScene(scene: Scene): void {
    this.scene = scene;
    this.paused = false;
    this.screenChanged();
  }

  /** Un vrai combat est-il affiché (pas la démonstration) ? */
  private get activeFight(): FightScene | null {
    return this.scene instanceof FightScene && !this.scene.isAttract ? this.scene : null;
  }

  screenChanged(): void {
    // les commandes tactiles n'apparaissent que pendant un combat, sans menu par-dessus
    const fighting = !!this.activeFight && !currentScreen();
    document.body.classList.toggle('infight', fighting);
    if (fighting) input.touch.layout();
    else input.touch.reset();
  }

  currentPlayer(): Character | null {
    return this.fighters?.[0] ?? null;
  }

  /** Combat console contre console qui tourne derrière les menus. */
  startAttract(): void {
    input.twoPlayers = false;
    const [a, b] = shuffle(roster) as [Character, Character];
    this.setScene(
      new FightScene({
        chars: [a, b ?? a],
        ais: [new Ai(ATTRACT_LEVEL), new Ai(ATTRACT_LEVEL)],
        stage: randomStageIndex(),
        rounds: 1,
        mode: 'attract',
        onEnd: () => this.startAttract(),
      }),
    );
    playMusic('menu');
  }

  private toMenu(): void {
    this.startAttract();
    showScreen('menu');
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
        return new Ai(clamp(base * 0.9 + progress * 1.3, 0, 3));
      }
      case 'versus':
        return new Ai(base + 0.6);
      case 'training':
        return new Ai(0, true);
      case 'duo':
        return null;
    }
  }

  private startMatch(player: Character, opponent: Character): void {
    const { mode } = this;
    this.fighters = [player, opponent];
    hideScreens();
    const fight = () => {
      playMusic('fight');
      this.setScene(
        new FightScene({
          chars: [player, opponent],
          ais: [null, this.opponentAi()],
          stage: mode === 'duo' || mode === 'training' ? randomStageIndex() : opponent.stage,
          rounds: settings.rounds,
          mode: mode === 'training' ? 'training' : 'match',
          onEnd: (winner) => this.endMatch(winner),
        }),
      );
    };
    if (mode === 'training') return fight();
    playMusic(null);
    const label = mode === 'arcade' ? `COMBAT ${this.ladderStep + 1} / ${this.ladder.length}` : '';
    this.setScene(new Versus(player, opponent, label, fight));
  }

  private endMatch(winnerIndex: number): void {
    const [player, opponent] = this.fighters!;
    const playerWon = winnerIndex === 0;
    input.clear();
    playMusic('menu');
    const playerLost = this.mode !== 'duo' && !playerWon;
    this.setScene(new Victory(playerWon ? player : opponent, playerLost));

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
    this.setScene(
      new Ending(champion, () => {
        this.startAttract();
        showScreen('title');
      }),
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
