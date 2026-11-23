/* Combat en réseau : la même simulation tourne sur les deux appareils (voir net/lockstep.ts). Chaque image,
   on envoie son entrée locale, et on ne simule l'image suivante que lorsque l'entrée de l'autre est arrivée.
   L'hôte pilote le combattant de gauche, l'invité celui de droite. */
import { playSfx } from '../audio/audio';
import { VIEW_H, VIEW_W } from '../core/constants';
import type { Character } from '../data/types';
import { Controller } from '../engine/controller';
import { FightSim } from '../engine/fight';
import { input } from '../input';
import type { Link } from '../net/link';
import { Lockstep, readPad, writePad } from '../net/lockstep';
import { FightView } from '../render/fight-view';
import { arenaWidthOf, type Stage } from '../render/stages';
import { arcadeText } from '../render/text';
import type { Scene } from './scene';

export interface NetFightOptions {
  chars: readonly [Character, Character];
  scales: readonly [number, number];
  stage: Stage;
  /** Largeur de l'arène décidée par l'hôte (sinon : celle du décor). */
  arena?: number;
  rounds: number;
  link: Link;
  /** 0 : cet appareil pilote le combattant de gauche (hôte) ; 1 : celui de droite. */
  side: 0 | 1;
  onEnd: (winner: number) => void;
}

/** Une empreinte de l'état du combat est échangée toutes les SUM_EVERY images. */
const SUM_EVERY = 60;
/** Au-delà de cette attente (en images), on affiche que l'on attend l'autre appareil. */
const SHOW_WAIT = 20;

export class NetFightScene implements Scene {
  readonly sim: FightSim;
  private readonly view: FightView;
  private readonly lock = new Lockstep();
  private readonly ctrls: readonly [Controller, Controller] = [new Controller(), new Controller()];
  private readonly sums = new Map<number, number>();
  private waited = 0;
  /** Le combat a divergé entre les deux appareils (ne devrait pas arriver). */
  desync = false;

  constructor(private readonly options: NetFightOptions) {
    this.sim = new FightSim({
      chars: options.chars,
      ais: [null, null],
      ctrls: this.ctrls,
      bodyScales: options.scales,
      rounds: options.rounds,
      mode: 'match',
      // l'hôte fixe la largeur de l'arène : les deux appareils simulent exactement le même combat
      arenaWidth: options.arena ?? arenaWidthOf(options.stage),
      onEnd: options.onEnd,
    });
    this.view = new FightView(this.sim, options.stage);
  }

  /** Un paquet d'entrées de l'autre appareil. */
  receive(data: ArrayBuffer): void {
    this.lock.receive(data);
  }

  /** L'empreinte de l'autre appareil pour une image : comparée à la nôtre. */
  checkSum(frame: number, sum: number): void {
    const mine = this.sums.get(frame);
    if (mine !== undefined && mine !== sum) this.desync = true;
  }

  private fingerprint(): number {
    let s = 0;
    for (const f of this.sim.fighters)
      s = s * 31 + f.hp * 7 + Math.round(f.x * 10) + Math.round(f.y * 10) * 3 + f.wins;
    return s % 1e12;
  }

  update(): void {
    const { link, side } = this.options;
    // l'entrée locale : celle du joueur 1 de l'appareil (clavier, tactile ou manette)
    input.update([true, false]);
    this.lock.pushLocal(readPad(input.players[0]));
    link.sendGame(this.lock.packet());
    if (!this.lock.ready) {
      this.waited++;
      return;
    }
    this.waited = 0;
    const [mine, theirs] = this.lock.take();
    writePad(mine, this.ctrls[side]);
    writePad(theirs, this.ctrls[side === 0 ? 1 : 0]);
    this.sim.update();
    if (this.lock.frame % SUM_EVERY === 0) {
      const sum = this.fingerprint();
      this.sums.set(this.lock.frame, sum);
      link.sendCtrl({ t: 'sum', f: this.lock.frame, s: sum });
    }
    for (const event of this.sim.drainEvents()) {
      if (event.type === 'sfx') playSfx(event.name);
      else this.view.handle(event);
    }
    this.view.update();
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.view.render(ctx);
    if (this.waited > SHOW_WAIT) {
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(0, VIEW_H / 2 - 40, VIEW_W, 80);
      arcadeText(ctx, "EN ATTENTE DE L'AUTRE APPAREIL…", VIEW_W / 2, VIEW_H / 2, 34);
    }
  }
}
