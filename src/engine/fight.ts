/* Simulation d'un combat : manches, chrono, collisions, jauges. Aucune image, aucun son :
   tout ce qui doit se voir ou s'entendre part sous forme d'événements (voir events.ts). */
import { GROUND_Y, STAGE_W, VIEW_W, WALL_MARGIN, FPS } from '../core/constants';
import { clamp } from '../core/math';
import type { SfxName } from '../core/sfx';
import type { Character, HitDef, HitFx, MoveDef, ProjectileDef } from '../data/types';
import type { Ai } from './ai';
import { activeHits, applyHit, hurtbox, overlaps, type HitResult } from './combat';
import type { Controller } from './controller';
import type { FightEvent } from './events';
import { Fighter } from './fighter';
import { createProjectile, updateProjectiles, type Projectile } from './projectiles';
import type { FighterWorld } from './world';

/** 'attract' = démonstration derrière les menus, 'training' = pas de chrono ni de K.O. */
export type FightMode = 'match' | 'attract' | 'training';
export type FightPhase = 'intro' | 'fight' | 'ko' | 'outro';

export interface FightOptions {
  chars: readonly [Character, Character];
  ctrls: readonly [Controller, Controller];
  ais: readonly [Ai | null, Ai | null];
  /** Échelle des zones de collision de chaque combattant. */
  bodyScales: readonly [number, number];
  /** Manches à gagner. */
  rounds: number;
  mode: FightMode;
  onEnd?: (winner: number) => void;
}

/** Compteur de combo affiché à l'écran. */
export interface ComboDisplay {
  hits: number;
  dmg: number;
  /** Frames d'affichage restantes. */
  ttl: number;
  /** Frames d'effet « pop » restantes. */
  pop: number;
  praise?: string;
}

const ROUND_SECONDS = 60;
export const SUPER_FREEZE = 30;
const START_GAP = 160;
const PRAISE: readonly (readonly [minHits: number, text: string])[] = [
  [10, 'DÉVASTATEUR !'],
  [7, 'INCROYABLE !'],
  [5, 'SUPER !'],
  [3, 'BIEN !'],
];
const ELEMENT_SFX: Partial<Record<HitFx, SfxName>> = {
  fire: 'fire',
  elec: 'elec',
  earth: 'earth',
  slash: 'slash',
  ice: 'ice',
};

export class FightSim implements FighterWorld {
  readonly fighters: [Fighter, Fighter];
  readonly rounds: number;
  readonly mode: FightMode;
  projectiles: Projectile[] = [];
  round = 1;
  tick = 0;
  /** Frames restantes au chrono. */
  timer = ROUND_SECONDS * FPS;
  phase: FightPhase = 'intro';
  /** Frames écoulées dans la phase courante. */
  private phaseTime = 0;
  roundOver = false;
  /** Vainqueur de la manche (-1 = égalité ou manche en cours). */
  winner = -1;
  done = false;
  /** Arrêt sur image à l'impact : c'est lui qui donne du poids aux coups. */
  hitstop = 0;
  superFreeze = 0;
  superBy: Fighter | null = null;
  superName = '';
  private slowMotion = 0;
  /** Bord gauche de l'écran dans le décor. Les bords de l'écran font office de murs. */
  camX = (STAGE_W - VIEW_W) / 2;
  comboDisplay: [ComboDisplay | null, ComboDisplay | null] = [null, null];
  private events: FightEvent[] = [];
  private readonly ais: readonly [Ai | null, Ai | null];
  private readonly onEnd?: (winner: number) => void;

  constructor(options: FightOptions) {
    const { chars, ctrls, bodyScales } = options;
    this.rounds = options.rounds;
    this.mode = options.mode;
    this.ais = options.ais;
    this.onEnd = options.onEnd;
    this.fighters = [
      new Fighter(chars[0], 0, ctrls[0], bodyScales[0]),
      new Fighter(chars[1], 1, ctrls[1], bodyScales[1]),
    ];
    const [a, b] = this.fighters;
    a.opp = b;
    b.opp = a;
    this.fighters.forEach((f, i) => {
      f.world = this;
      f.ai = this.ais[i]!;
      f.ctrl.clear();
    });
    this.startRound();
  }

  // ------------------------------------------------------------------ interface FighterWorld

  emit = (event: FightEvent): void => {
    this.events.push(event);
  };

  /** Rend les événements émis depuis le dernier appel. */
  drainEvents(): FightEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  hasProjectile(owner: Fighter): boolean {
    return this.projectiles.some((p) => p.owner === owner);
  }

  projectileNear(target: Fighter): boolean {
    return this.projectiles.some(
      (p) => p.owner !== target && Math.abs(p.x - target.x) < 330 && (target.x - p.x) * p.dir > 0,
    );
  }

  spawnProjectile(owner: Fighter, def: ProjectileDef): void {
    this.projectiles.push(createProjectile(owner, def));
    this.emit({ type: 'sfx', name: ELEMENT_SFX[def.fx] ?? 'special' });
  }

  superFlash(by: Fighter, move: MoveDef): void {
    this.superFreeze = SUPER_FREEZE;
    this.superBy = by;
    this.superName = move.name;
    this.emit({ type: 'flash', amount: 0.7 });
    this.emit({ type: 'shake', amount: 8 });
    by.snapPose();
  }

  // ------------------------------------------------------------------ boucle

  private startRound(): void {
    const [a, b] = this.fighters;
    a.reset(STAGE_W / 2 - START_GAP, 1);
    b.reset(STAGE_W / 2 + START_GAP, -1);
    this.projectiles = [];
    this.timer = ROUND_SECONDS * FPS;
    this.phase = 'intro';
    this.phaseTime = 0;
    this.roundOver = false;
    this.hitstop = this.superFreeze = this.slowMotion = 0;
    this.winner = -1;
    this.camX = (STAGE_W - VIEW_W) / 2;
    if (this.mode === 'match') {
      for (const f of this.fighters) {
        f.setState('lock');
        f.setPose('intro', 0.2);
      }
    } else {
      this.phase = 'fight';
    }
  }

  /** Avance le combat d'une frame (1/60 s). */
  update(): void {
    this.tick++;
    const [a, b] = this.fighters;
    this.ais[0]?.think(a, b, this);
    this.ais[1]?.think(b, a, this);
    a.readInput();
    b.readInput();
    this.comboDisplay = this.comboDisplay.map((c) =>
      c && --c.ttl > 0 ? c : null,
    ) as typeof this.comboDisplay;

    // le temps se fige : super, impact, puis ralenti du K.O.
    if (this.superFreeze > 0) {
      this.superFreeze--;
      return;
    }
    if (this.hitstop > 0) {
      if (--this.hitstop === 0) a.shaking = b.shaking = false;
      return;
    }
    if (this.slowMotion > 0) {
      this.slowMotion--;
      if (this.tick % 3) return;
    }

    this.stepPhase();
    a.update();
    b.update();
    this.separate();
    this.resolveHits(a, b);
    this.resolveHits(b, a);
    this.projectiles = updateProjectiles(this.projectiles, this.emit, this.onHit);
    this.endCombos();
    if (this.mode === 'training') this.applyTrainingRules();
    const mid = (a.x + b.x) / 2 - VIEW_W / 2;
    this.camX += (clamp(mid, 0, STAGE_W - VIEW_W) - this.camX) * 0.15;
  }

  private banner(
    text: string,
    duration: number,
    size: number,
    extra: Partial<FightEvent & { type: 'banner' }> = {},
  ) {
    this.emit({ type: 'banner', text, duration, size, ...extra });
  }

  private stepPhase(): void {
    const [a, b] = this.fighters;
    const t = ++this.phaseTime;
    const quiet = this.mode === 'attract';

    if (this.phase === 'intro') {
      if (t === 12) {
        const final = this.rounds > 1 && a.wins + b.wins >= (this.rounds - 1) * 2;
        this.banner(final ? 'MANCHE FINALE' : `MANCHE ${this.round}`, 62, 96);
        this.emit({ type: 'sfx', name: 'round' });
      }
      if (t === 50) this.fighters.forEach((f) => f.setPose('idle', 0.15));
      if (t === 80) {
        this.banner('COMBATTEZ !', 46, 120, { tone: 'red' });
        this.emit({ type: 'sfx', name: 'fight' });
        this.emit({ type: 'flash', amount: 0.5 });
      }
      if (t === 96) {
        this.phase = 'fight';
        this.fighters.forEach((f) => f.setState('neutral'));
      }
    } else if (this.phase === 'fight') {
      if (this.mode === 'match') this.timer--;
      const ko = a.hp <= 0 || b.hp <= 0;
      if (!ko && this.timer > 0) return;
      this.phase = 'ko';
      this.phaseTime = 0;
      this.roundOver = true;
      const ra = a.hp / a.maxHp;
      const rb = b.hp / b.maxHp;
      this.winner = ra === rb ? -1 : ra > rb ? 0 : 1;
      if (ko) {
        this.slowMotion = 54;
        this.emit({ type: 'flash', amount: 1 });
        this.emit({ type: 'shake', amount: 16 });
        this.emit({ type: 'sfx', name: 'ko' });
        this.banner('K.O.', 100, 170, { tone: 'red' });
      } else {
        this.banner('TEMPS ÉCOULÉ', 90, 96);
      }
    } else if (this.phase === 'ko') {
      const settled = this.fighters.every(
        (f) => f.state === 'down' || (f.grounded && f.state !== 'airhit' && f.state !== 'attack'),
      );
      if (!(t > 70 && settled) && t <= 240) return;
      this.phase = 'outro';
      this.phaseTime = 0;
      if (this.winner < 0) {
        if (!quiet) this.banner('ÉGALITÉ', 110, 100);
        return;
      }
      const winner = this.fighters[this.winner]!;
      const loser = winner.opp;
      winner.wins++;
      winner.faceOpponent();
      winner.setState('lock');
      winner.setPose('win', 0.2);
      if (loser.hp > 0) {
        loser.setState('lock');
        loser.setPose('lose', 0.2);
      }
      this.emit({ type: 'confetti', x: winner.x, y: GROUND_Y - 220 });
      if (quiet) return;
      this.banner(`${winner.char.name} GAGNE`, 120, 84, { y: 200 });
      if (winner.hp >= winner.maxHp) this.banner('PERFECT !', 120, 70, { y: 290, tone: 'blue' });
      this.emit({ type: 'sfx', name: 'win' });
    } else if (t > 140 && !this.done) {
      const champion = this.fighters.findIndex((f) => f.wins >= this.rounds);
      if (champion >= 0) {
        this.done = true;
        this.onEnd?.(champion);
      } else {
        this.round++;
        this.startRound();
      }
    }
  }

  /** Empêche les combattants de se chevaucher et de sortir de l'écran. */
  private separate(): void {
    const [a, b] = this.fighters;
    const solid = (f: Fighter) => f.state !== 'down' && f.state !== 'airhit' && f.visible;
    const sameHeight = Math.abs(a.y - b.y) < 110;
    const pushing = solid(a) && solid(b) && sameHeight;
    if (pushing) {
      const min = 30 * (a.bodyScale + b.bodyScale);
      const dx = b.x - a.x;
      if (Math.abs(dx) < min) {
        const dir = dx > 0 ? 1 : dx < 0 ? -1 : a.facing;
        const push = (min - Math.abs(dx)) / 2;
        a.x -= dir * push;
        b.x += dir * push;
      }
    }
    const left = Math.max(WALL_MARGIN, this.camX + 36);
    const right = Math.min(STAGE_W - WALL_MARGIN, this.camX + VIEW_W - 36);
    for (const f of this.fighters) {
      const shift = clamp(f.x, left, right) - f.x;
      if (!shift) continue;
      f.x += shift;
      // acculé contre un bord : c'est l'autre qui est repoussé
      if (pushing && Math.abs(f.opp.x - f.x) < 58) f.opp.x += shift;
    }
  }

  private resolveHits(att: Fighter, def: Fighter): void {
    const box = hurtbox(def);
    if (!box) return;
    for (const active of activeHits(att)) {
      if (!overlaps(active, box)) continue;
      const dir = def.x === att.x ? att.facing : def.x > att.x ? 1 : -1;
      const result = applyHit(def, att, active.hit, dir, att.move!.rank >= 10);
      if (!result) continue;
      att.hitDone.add(active.index);
      // un coup absorbé par un contre ne compte pas comme réussi : pas d'enchaînement
      if (result !== 'counter') att.connected = true;
      const x = (Math.max(active.x0, box.x0) + Math.min(active.x1, box.x1)) / 2;
      const y = (Math.max(active.y0, box.y0) + Math.min(active.y1, box.y1)) / 2;
      this.onHit(att, def, active.hit, result, x, y, dir);
      // défenseur acculé : c'est l'attaquant qui recule, pour ne pas rester collé
      const cornered = def.x < this.camX + 60 || def.x > this.camX + VIEW_W - 60;
      if (cornered && att.grounded && !att.move!.vel) att.vx = -dir * (active.hit.kb * 0.7 + 1);
      return;
    }
  }

  private onHit = (
    att: Fighter,
    def: Fighter,
    hit: HitDef,
    result: HitResult,
    x: number,
    y: number,
    dir: number,
  ) => {
    const big = hit.dmg >= 60;
    const gain = (f: Fighter, amount: number) => (f.meter = Math.min(100, f.meter + amount));
    if (result === 'block') {
      this.emit({ type: 'guard', x, y });
      this.emit({ type: 'sfx', name: 'block' });
      this.hitstop = 3;
      gain(att, 2);
      gain(def, 2);
      return;
    }
    if (result === 'counter') {
      this.emit({ type: 'guard', x, y });
      this.emit({ type: 'flash', amount: 0.35 });
      this.emit({ type: 'sfx', name: 'block' });
      this.emit({ type: 'sfx', name: 'special' });
      this.hitstop = 10;
      return;
    }
    if (result === 'armor') {
      this.emit({ type: 'guard', x, y });
      this.emit({ type: 'impact', x, y, fx: 'earth', power: 30, dir });
      this.emit({ type: 'sfx', name: 'hitH' });
      this.hitstop = 8;
      return;
    }
    this.emit({ type: 'impact', x, y, fx: hit.fx, power: hit.dmg, dir });
    this.hitstop = hit.stop ?? (big ? 7 : 4);
    def.shaking = true;
    if (big) this.emit({ type: 'shake', amount: hit.dmg >= 100 ? 11 : 6 });
    if (hit.launch) this.emit({ type: 'flash', amount: 0.25 });
    const elementSfx = ELEMENT_SFX[hit.fx];
    this.emit({ type: 'sfx', name: elementSfx ?? (big ? 'hitH' : 'hitL') });
    if (big && elementSfx) this.emit({ type: 'sfx', name: 'hitH' });
    gain(att, def.lastDmg * 0.13);
    gain(def, def.lastDmg * 0.06);
    if (att.combo >= 2)
      this.comboDisplay[att.index] = { hits: att.combo, dmg: att.comboDmg, ttl: 70, pop: 8 };
  };

  /** Un combo se termine quand l'adversaire a récupéré : on affiche alors l'appréciation. */
  private endCombos(): void {
    for (const f of this.fighters) {
      if (!f.combo || f.opp.inHit || f.opp.state === 'down') continue;
      const praise = PRAISE.find(([min]) => f.combo >= min);
      if (praise && this.mode !== 'attract') {
        this.comboDisplay[f.index] = { hits: f.combo, dmg: f.comboDmg, ttl: 80, pop: 0, praise: praise[1] };
      }
      f.combo = 0;
    }
  }

  /** Entraînement : personne ne meurt, le mannequin récupère sa vie, la jauge du joueur se remplit. */
  private applyTrainingRules(): void {
    const [player, dummy] = this.fighters;
    if (!dummy.inHit && dummy.state === 'neutral') dummy.hp = dummy.maxHp;
    dummy.hp = Math.max(dummy.hp, 1);
    player.hp = Math.max(player.hp, 1);
    if (player.state === 'neutral' && this.tick % 4 === 0) player.meter = Math.min(100, player.meter + 1);
  }
}
