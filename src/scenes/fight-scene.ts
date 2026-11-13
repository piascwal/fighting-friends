/* Scène de combat : relie la simulation (engine) à l'affichage (render) et au son (audio). */
import { playSfx } from '../audio/audio';
import { VIEW_H, VIEW_W } from '../core/constants';
import type { Character } from '../data/types';
import type { Ai } from '../engine/ai';
import { FightSim, type FightMode } from '../engine/fight';
import { input } from '../input';
import { bodyScaleOf } from '../render/character-draw';
import { FightView } from '../render/fight-view';
import type { Scene } from './scene';

export interface FightSceneOptions {
  chars: readonly [Character, Character];
  ais: readonly [Ai | null, Ai | null];
  stage: number;
  rounds: number;
  mode: FightMode;
  onEnd?: (winner: number) => void;
}

export class FightScene implements Scene {
  readonly sim: FightSim;
  private readonly view: FightView;
  /** Quels joueurs sont humains : leurs manettes sont alimentées par le clavier / le tactile. */
  readonly humans: readonly [boolean, boolean];

  constructor(options: FightSceneOptions) {
    const { chars, ais } = options;
    this.humans = [!ais[0], !ais[1]];
    this.sim = new FightSim({
      chars,
      ais,
      ctrls: input.players,
      bodyScales: [bodyScaleOf(chars[0]), bodyScaleOf(chars[1])],
      rounds: options.rounds,
      mode: options.mode,
      onEnd: options.onEnd,
    });
    this.view = new FightView(this.sim, options.stage);
  }

  /** Combat de démonstration : tourne derrière les menus, sans interface ni son. */
  get isAttract(): boolean {
    return this.sim.mode === 'attract';
  }

  update(): void {
    input.update(this.humans);
    this.sim.update();
    for (const event of this.sim.drainEvents()) {
      if (event.type === 'sfx') {
        if (!this.isAttract) playSfx(event.name);
      } else {
        this.view.handle(event);
      }
    }
    this.view.update();
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.view.render(ctx);
    if (this.isAttract) {
      ctx.fillStyle = 'rgba(8,4,22,.45)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }
}
