/* La console : elle observe le combat et pilote sa manette comme un joueur (directions + ordres de coups). */
import { clamp, pick } from '../core/math';
import type { Button, HitDef, MoveId } from '../data/types';
import type { AiCommand } from './controller';
import type { Fighter } from './fighter';
import type { FightSim } from './fight';

type PlanKind = 'walk' | 'jumpin' | 'air';
interface Plan {
  x: number;
  y: number;
  kind: PlanKind;
}

/** Suites de combo que la console sait faire. 'END' = finir par le spécial préféré de son style. */
const ROUTES: Partial<Record<MoveId, readonly (MoveId | 'END')[]>> = {
  lp: ['lk', 'lp'],
  clp: ['clk'],
  lk: ['hp'],
  clk: ['hp'],
  hp: ['END', 'hk'],
  hk: ['END'],
  jlp: ['jlk'],
  jlk: ['jhk'],
  jhp: ['jhk'],
};
const CLOSE_ATTACKS: readonly MoveId[] = [
  'lp',
  'lp',
  'lk',
  'clk',
  'clk',
  'clp',
  'hp',
  'hk',
  'chk',
  'fhp',
  'chp',
];

/** Valeur d'un réglage pour un niveau de 0 (facile) à 3 (expert), interpolée entre les paliers. */
function byLevel(steps: readonly [number, number, number, number], level: number): number {
  const l = clamp(level, 0, 3);
  const i = Math.floor(l);
  const next = steps[Math.min(3, i + 1)]!;
  return steps[i]! + (next - steps[i]!) * (l - i);
}

export class Ai {
  private timer = 20;
  private plan: Plan = { x: 0, y: 0, kind: 'walk' };
  private lastMove: unknown = null;
  private rolled = false;
  private followed = false;
  /** Frames entre deux décisions. */
  private readonly react: number;
  private readonly blockRate: number;
  private readonly comboRate: number;
  private readonly aggression: number;
  private readonly specialRate: number;

  /**
   * @param level 0 = facile … 3 = expert
   * @param dummy mannequin d'entraînement : ne bouge pas, ne bloque pas
   */
  constructor(
    private readonly level: number,
    private readonly dummy = false,
  ) {
    this.react = byLevel([28, 17, 11, 7], level);
    this.blockRate = byLevel([0.12, 0.38, 0.6, 0.82], level);
    this.comboRate = byLevel([0.12, 0.45, 0.72, 0.92], level);
    this.aggression = byLevel([0.38, 0.52, 0.66, 0.8], level);
    this.specialRate = byLevel([0.15, 0.3, 0.45, 0.6], level);
  }

  /** Décide de bloquer (et comment) un coup qui arrive. */
  wantBlock(me: Fighter, hit: HitDef): 'stand' | 'crouch' | null {
    if (this.dummy) return null;
    let chance = this.blockRate;
    if (me.state === 'blockstun') chance = Math.max(chance, 0.85);
    if (this.plan.x * me.facing < 0) chance += 0.2;
    if (Math.random() > chance) return null;
    // un bon joueur devine la hauteur du coup, un débutant se trompe souvent
    const reads = Math.random() < 0.45 + this.level * 0.17;
    if (hit.lvl === 'low') return reads ? 'crouch' : 'stand';
    if (hit.lvl === 'high') return reads ? 'stand' : 'crouch';
    return Math.random() < 0.5 ? 'stand' : 'crouch';
  }

  think(me: Fighter, opp: Fighter, sim: FightSim): void {
    const ctrl = me.ctrl;
    ctrl.x = 0;
    ctrl.y = 0;
    if (this.dummy || sim.phase !== 'fight') return;
    const dist = Math.abs(opp.x - me.x);
    const toward = opp.x >= me.x ? 1 : -1;
    const order = (cmd: AiCommand) => ctrl.commands.push(cmd);

    if (me.state === 'attack') {
      this.continueCombo(me, opp, toward, order);
      if (this.plan.kind === 'air') {
        ctrl.x = this.plan.x;
        ctrl.y = -1;
      }
      return;
    }
    if (me.state === 'air') {
      ctrl.x = this.plan.x;
      const diving = this.plan.kind === 'jumpin' && me.vy > 1 && dist < 170;
      const chasing = this.plan.kind === 'air' && dist < 150 && Math.abs(opp.y - me.y) < 120;
      if (diving || chasing) {
        order(Math.random() < 0.5 ? 'jhk' : 'jlp');
        if (diving) this.plan.kind = 'walk';
      }
      return;
    }
    if (me.state !== 'neutral') {
      ctrl.x = this.plan.x;
      return;
    }
    if (--this.timer > 0) {
      ctrl.x = this.plan.x;
      ctrl.y = this.plan.y;
      if (this.plan.y < 0) this.plan.y = 0;
      return;
    }
    this.timer = this.react * (0.6 + Math.random());
    this.decide(me, opp, sim, dist, toward, order);
    ctrl.x = this.plan.x;
    ctrl.y = this.plan.y;
  }

  /** Enchaînements en plusieurs temps et postures : appuie sur un des boutons de suite, une fois par coup. */
  private tryFollowUp(me: Fighter): void {
    const followUps = me.move?.followUps;
    if (!followUps || this.followed || me.ft < followUps.from) return;
    if (followUps.onHit && !me.connected) return;
    this.followed = true;
    const buttons = Object.keys(followUps.moves) as Button[];
    if (buttons.length && Math.random() < this.comboRate) me.ctrl.press(pick(buttons));
  }

  /** Quand un coup touche, tente (selon son niveau) le coup suivant du combo. */
  private continueCombo(me: Fighter, opp: Fighter, toward: number, order: (c: AiCommand) => void): void {
    const move = me.move!;
    if (this.lastMove !== move) {
      this.lastMove = move;
      this.rolled = false;
      this.followed = false;
    }
    this.tryFollowUp(me);
    if (!me.connected || this.rolled) return;
    this.rolled = true;
    if (!opp.inHit || Math.random() >= this.comboRate) return;
    const style = me.char.style.ai;
    const superReady = me.meter >= 100;
    if (move.rank >= 10 && move.rank < 20) {
      if (superReady && Math.random() < 0.6) order('super');
    } else if (ROUTES[move.id]) {
      const next = pick(ROUTES[move.id]!);
      if (next === 'END') order(superReady && Math.random() < 0.35 ? 'super' : style.ender);
      else order(next);
    } else if (move.id === 'chp') {
      // après un lanceur : sauter pour continuer en l'air
      this.plan = { x: toward, y: -1, kind: 'air' };
      this.timer = 30;
    }
  }

  private decide(
    me: Fighter,
    opp: Fighter,
    sim: FightSim,
    dist: number,
    toward: number,
    order: (c: AiCommand) => void,
  ): void {
    const r = Math.random();
    const style = me.char.style.ai;
    const go = (x: number, y = 0, kind: PlanKind = 'walk') => {
      this.plan = { x, y, kind };
    };

    if (sim.projectileNear(me) && r < 0.3 + this.level * 0.15) {
      if (Math.random() < 0.5) go(toward, -1, 'jumpin');
      else {
        go(-toward);
        this.timer = 24;
      }
      return;
    }
    if (!opp.grounded && dist < 180 && opp.state !== 'airhit' && r < 0.2 + this.level * 0.2) {
      order(style.antiAir);
      return go(0);
    }
    if (opp.state === 'down' || opp.state === 'getup') {
      return go(dist > 150 ? toward : Math.random() < 0.5 ? -toward : 0);
    }
    if (me.meter >= 100 && dist < 160 && r < 0.05 + this.level * 0.03) {
      order('super');
      return go(0);
    }

    if (dist > 330) {
      // loin : se rapprocher ou harceler à distance
      if (r < style.zoner * (0.5 + this.specialRate)) {
        order(Math.random() < 0.5 ? 's1l' : 's1h');
        go(0);
        this.timer += 20;
      } else if (r < 0.72) {
        go(toward);
        this.timer *= 1.6;
      } else if (r < 0.84) {
        order('dashF');
        go(toward);
      } else if (r < 0.94) go(toward, -1, 'jumpin');
      else go(0);
      return;
    }
    if (dist > 135) {
      // mi-distance : avancer, sauter dessus, tenter un spécial ou temporiser
      const a = this.aggression * 0.5;
      if (r < a) go(toward);
      else if (r < a + 0.16) go(toward, -1, 'jumpin');
      else if (r < a + 0.16 + this.specialRate * 0.4) {
        if (style.zoner && Math.random() < 0.6) order('s1h');
        else order(dist < 230 ? pick<AiCommand>(['s2l', 's1l', 'fhp']) : 's1l');
        go(0);
      } else if (r < 0.9) {
        go(-toward);
        this.timer = 10 + Math.random() * 16;
      } else go(0, 1);
      return;
    }
    // au contact : attaquer, se protéger ou reculer
    if (r < this.aggression) {
      order(Math.random() < this.specialRate * 0.1 ? 's2l' : pick(CLOSE_ATTACKS));
      go(0);
      this.timer = this.react * 0.7;
    } else if (r < this.aggression + 0.16) {
      go(-toward, Math.random() < 0.4 ? 1 : 0);
      this.timer = 18 + Math.random() * 20;
    } else if (r < this.aggression + 0.24) {
      order('dashB');
      go(-toward);
    } else go(-toward);
  }
}
