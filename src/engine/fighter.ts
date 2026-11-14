/* Un combattant : position, vie, et la machine à états qui décide ce qu'il peut faire à chaque frame.
   Le déroulement d'un coup est dans fighter-attack.ts, le choix de la posture dans fighter-pose.ts. */
import { GROUND_Y, STAGE_W, WALL_MARGIN } from '../core/constants';
import { clamp } from '../core/math';
import { POSES, POSE_SPRITE, approachPose, clonePose } from '../data/poses';
import type { Pose, PoseName } from '../data/poses';
import type { SpriteKey } from '../data/sprite-poses';
import type { Character, FighterStats, MoveDef, MoveId, MoveSet } from '../data/types';
import type { Ai } from './ai';
import type { Controller } from './controller';
import { InputBuffer } from './input-buffer';
import { runAttack, startMove, startMoveDef } from './fighter-attack';
import { updateFighterPose } from './fighter-pose';
import { canStart, followUpFor, selectMove } from './move-select';
import type { FighterWorld } from './world';

export type FighterState =
  | 'neutral' // libre : debout, marche, accroupi
  | 'jumpsquat' // élan du saut
  | 'air'
  | 'attack'
  | 'recover' // récupération à l'atterrissage d'un coup spécial
  | 'hitstun' // touché, au sol
  | 'blockstun' // en garde, vient de bloquer
  | 'airhit' // projeté en l'air
  | 'down' // au tapis
  | 'getup'
  | 'dash'
  | 'lock'; // immobile : introduction, pose de victoire

/** Gravité d'un saut : forte, pour des sauts vifs. */
const GRAVITY = 1.7;
/** Gravité d'un coup spécial qui décolle (uppercut, vrille…) : plus douce, pour laisser le temps de frapper. */
const SPECIAL_GRAVITY = 1.15;
/** Saut de poursuite après un lanceur : impulsion verticale et vitesse horizontale, identiques pour tous. */
const PURSUIT_JUMP = 19;
const PURSUIT_DRIFT = 4;
export const JUMPSQUAT_FRAMES = 2;
const KNOCKDOWN_FRAMES = 24;
const GETUP_FRAMES = 11;
export const TRAIL_LIFE = 9;

/** Image rémanente laissée derrière un coup rapide. */
export interface TrailGhost {
  x: number;
  y: number;
  facing: number;
  pose: Pose;
  spriteKey: SpriteKey;
  life: number;
}

export class Fighter {
  readonly moves: MoveSet;
  readonly stats: FighterStats;
  readonly maxHp: number;
  readonly input = new InputBuffer();
  world!: FighterWorld;
  opp!: Fighter;
  /** La console qui pilote ce combattant, s'il n'est pas joué par un humain. */
  ai: Ai | null = null;

  // --- situation ---
  x = 0;
  /** Hauteur : 0 au sol, négatif en l'air. */
  y = 0;
  vx = 0;
  vy = 0;
  /** 1 = regarde à droite, -1 = à gauche. */
  facing = 1;
  hp: number;
  /** Jauge de super, de 0 à 100. Conservée d'une manche à l'autre. */
  meter = 0;
  wins = 0;

  // --- état ---
  state: FighterState = 'neutral';
  /** Frames écoulées dans l'état courant. */
  t = 0;
  /** Frame de l'état traitée pendant cette mise à jour (référence pour les zones de frappe). */
  ft = 0;
  move: MoveDef | null = null;
  crouching = false;
  /** En garde visible (recule pendant que l'adversaire attaque). */
  guard = false;
  /** Durée de l'étourdissement ou de la récupération en cours. */
  stun = 0;
  dashDir = 0;
  jumpDir = 0;

  // --- enchaînements ---
  /** Le coup en cours a touché ou a été bloqué : il peut être enchaîné. */
  connected = false;
  /** Coups normaux déjà utilisés dans l'enchaînement en cours. */
  used = new Set<MoveId>();
  /** Répétitions consécutives du même coup léger. */
  chain = 0;
  airAttacks = 0;
  /** Saut de poursuite après un lanceur : plus flottant, pour laisser le temps d'enchaîner en l'air. */
  pursuit = false;
  /** Coups portés dans le combo en cours, et leurs dégâts cumulés. */
  combo = 0;
  comboDmg = 0;
  /** Nombre de fois où ce combattant a été repris en l'air : limite les jongles infinis. */
  juggle = 0;
  lastDmg = 0;
  hitDone = new Set<number>();
  armorLeft = 0;

  // --- présentation (lue par l'affichage) ---
  readonly pose: Pose = clonePose('idle');
  /** Posture visée et vitesse à laquelle `pose` s'en rapproche. */
  poseTarget: Pose = POSES.idle;
  poseRate = 1;
  spriteKey: SpriteKey = 'idle';
  visible = true;
  /** Frames de flash blanc restantes après un coup reçu. */
  flash = 0;
  /** Tremble pendant l'arrêt sur image. */
  shaking = false;
  walkPhase = 0;
  trail: TrailGhost[] = [];

  /**
   * @param bodyScale échelle des zones de collision (taille du personnage affiché)
   */
  constructor(
    readonly char: Character,
    readonly index: number,
    readonly ctrl: Controller,
    readonly bodyScale: number,
  ) {
    this.moves = char.style.moves;
    this.stats = char.style.stats;
    this.maxHp = this.stats.hp;
    this.hp = this.maxHp;
  }

  get grounded(): boolean {
    return this.y >= 0;
  }
  /** Bonus temporaire (style Berserker) : actif jusqu'à cette frame simulée. */
  buffUntil = 0;
  buffPower = 1;
  buffSpeed = 1;

  get buffed(): boolean {
    return this.input.clock < this.buffUntil;
  }
  get power(): number {
    return this.stats.power * (this.buffed ? this.buffPower : 1);
  }
  get speed(): number {
    return this.stats.speed * (this.buffed ? this.buffSpeed : 1);
  }
  /** Âge en frames réelles : sert aux animations d'attente. */
  get age(): number {
    return this.input.frame;
  }
  /** En train d'encaisser : un nouveau coup reçu prolonge le combo adverse. */
  get inHit(): boolean {
    return this.state === 'hitstun' || this.state === 'airhit';
  }

  /** Remet le combattant en place pour une nouvelle manche (jauge et victoires conservées). */
  reset(x: number, facing: number): void {
    this.x = x;
    this.y = this.vx = this.vy = 0;
    this.facing = facing;
    this.hp = this.maxHp;
    this.state = 'neutral';
    this.t = this.ft = 0;
    this.move = null;
    this.crouching = this.guard = this.connected = this.shaking = false;
    this.combo = this.comboDmg = this.juggle = this.stun = this.flash = 0;
    this.airAttacks = this.chain = this.armorLeft = this.walkPhase = 0;
    this.pursuit = false;
    this.buffUntil = 0;
    this.visible = true;
    this.used.clear();
    this.hitDone.clear();
    this.trail = [];
    this.input.reset();
    this.setPose('idle', 1);
    approachPose(this.pose, POSES.idle, 1);
  }

  setState(state: FighterState): void {
    this.state = state;
    this.t = 0;
    if (state !== 'attack') {
      this.move = null;
      this.visible = true;
    }
    if (state === 'neutral') {
      this.juggle = 0;
      this.chain = 0;
    }
  }

  setPose(name: PoseName, rate = 0.35, sprite?: SpriteKey): void {
    this.poseTarget = POSES[name];
    this.poseRate = rate;
    this.spriteKey = sprite ?? POSE_SPRITE[name];
  }

  /** Atteint immédiatement la posture visée (utilisé quand le temps se fige). */
  snapPose(): void {
    approachPose(this.pose, this.poseTarget, 1);
  }

  faceOpponent(): void {
    if (Math.abs(this.opp.x - this.x) > 4) this.facing = this.opp.x > this.x ? 1 : -1;
  }

  /** Lit la manette. À appeler à chaque frame réelle, y compris pendant l'arrêt sur image. */
  readInput(): void {
    this.input.read(this.ctrl, this.facing);
  }

  // ------------------------------------------------------------------ coups

  /** Lance un coup en attente (bouton en mémoire ou ordre de la console) s'il est permis. */
  tryAttack(): boolean {
    const command = this.input.pendingCommand();
    if (command === 'dashF' || command === 'dashB') {
      if (this.state === 'neutral') {
        this.input.clearCommand();
        this.dashDir = command === 'dashF' ? 1 : -1;
        this.setState('dash');
        return true;
      }
    } else if (command && canStart(this, command)) {
      this.input.clearCommand();
      this.startMove(command);
      return true;
    }
    const press = this.input.pendingPress();
    if (!press) return false;
    const followUp = followUpFor(this, press);
    if (followUp) {
      this.input.consume(press);
      startMoveDef(this, followUp);
      return true;
    }
    const id = selectMove(this, press);
    if (!canStart(this, id)) return false;
    this.input.consume(press);
    this.startMove(id);
    return true;
  }

  startMove(id: MoveId): void {
    startMove(this, id);
  }

  // ------------------------------------------------------------------ une frame

  update(): void {
    this.ft = this.t;
    this.input.tick();
    if (this.flash > 0) this.flash--;
    this.guard = false;
    this.runState();
    this.t++;
    this.applyPhysics();
    updateFighterPose(this);
    this.updateTrail();
  }

  private runState(): void {
    switch (this.state) {
      case 'neutral':
        return this.stateNeutral();
      case 'jumpsquat':
        return this.stateJumpsquat();
      case 'air':
        this.tryAttack();
        return;
      case 'attack':
        return runAttack(this);
      case 'recover':
        if (this.t >= this.stun) this.setState('neutral');
        return;
      case 'hitstun':
      case 'blockstun':
        this.vx *= this.state === 'hitstun' ? 0.8 : 0.86;
        if (this.t >= this.stun) {
          this.vx = 0;
          this.setState('neutral');
        }
        return;
      case 'down':
        this.vx *= 0.8;
        if (this.hp > 0 && this.t >= KNOCKDOWN_FRAMES && !this.world.roundOver) {
          this.setState('getup');
          this.setPose('getup', 0.35);
        }
        return;
      case 'getup':
        this.vx = 0;
        if (this.t >= GETUP_FRAMES) this.setState('neutral');
        return;
      case 'dash':
        return this.stateDash();
      case 'lock':
        this.vx *= 0.8;
        return;
      case 'airhit':
        return;
    }
  }

  private stateNeutral(): void {
    this.faceOpponent();
    if (this.tryAttack()) return;
    const { ctrl, opp } = this;
    const forward = ctrl.x * this.facing;
    if (this.input.dashRequest) {
      this.dashDir = this.input.dashRequest;
      this.input.dashRequest = 0;
      this.setState('dash');
      return;
    }
    if (ctrl.y < 0) {
      this.jumpDir = ctrl.x;
      this.crouching = false;
      this.vx = 0;
      this.setState('jumpsquat');
      this.setPose('crouch', 0.5, 'idle');
      return;
    }
    const threatened =
      (opp.state === 'attack' && Math.abs(opp.x - this.x) < 300) || this.world.projectileNear(this);
    this.guard = forward < 0 && threatened;
    this.crouching = ctrl.y > 0;
    if (this.crouching || this.guard || forward === 0) this.vx = 0;
    else this.vx = this.speed * this.facing * (forward > 0 ? 1 : -0.8);
    if (this.vx) this.walkPhase += 0.27 * forward;
  }

  private stateJumpsquat(): void {
    // un coup de charge vers le haut (pousser vers le haut + pied) part avant même de décoller
    if (this.tryAttack()) return;
    if (this.t < JUMPSQUAT_FRAMES) return;
    // le saut de poursuite est calé sur le lanceur (même hauteur pour tous) pour rester à portée de l'adversaire
    this.vy = this.pursuit ? -PURSUIT_JUMP : -this.stats.jump;
    this.vx = this.jumpDir * (this.pursuit ? PURSUIT_DRIFT : this.speed * 1.35);
    this.y = -1;
    this.airAttacks = 0;
    this.setState('air');
    this.setPose('jump', 0.4);
    this.world.emit({ type: 'sfx', name: 'jump' });
    this.world.emit({ type: 'dust', x: this.x, y: GROUND_Y, dir: 0, count: 4 });
  }

  private stateDash(): void {
    const forward = this.dashDir > 0;
    const speed = this.speed;
    if (this.t === 0) {
      this.setPose(forward ? 'dashF' : 'dashB', 0.6);
      this.world.emit({ type: 'dust', x: this.x, y: GROUND_Y, dir: this.facing * this.dashDir, count: 6 });
      this.world.emit({ type: 'sfx', name: 'whoosh' });
    }
    const burst = this.t < 9 ? speed * (forward ? 2.5 : 2.3) : speed;
    this.vx = this.facing * this.dashDir * burst;
    if (forward && this.t >= 2 && this.tryAttack()) return;
    if (this.t >= (forward ? 12 : 14)) {
      this.vx = 0;
      this.setState('neutral');
    }
  }

  private applyPhysics(): void {
    this.x += this.vx;
    if (this.y < 0 || this.vy < 0) {
      // plus on est repris en l'air, plus on retombe vite
      this.vy += this.state === 'airhit' ? 0.95 + 0.09 * this.juggle : this.gravity();
      this.y += this.vy;
      if (this.y >= 0) {
        this.y = 0;
        this.vy = 0;
        this.land();
      }
    }
    this.x = clamp(this.x, WALL_MARGIN, STAGE_W - WALL_MARGIN);
  }

  private gravity(): number {
    const special = this.state === 'attack' && !this.move!.air;
    return special || this.pursuit ? SPECIAL_GRAVITY : GRAVITY;
  }

  private land(): void {
    this.pursuit = false;
    const { emit } = this.world;
    const dust = (count: number) => emit({ type: 'dust', x: this.x, y: GROUND_Y, dir: 0, count });
    if (this.state === 'airhit') {
      this.setState('down');
      this.setPose('down', 0.6);
      this.vx *= 0.5;
      emit({ type: 'shake', amount: 6 });
      dust(9);
      emit({ type: 'sfx', name: 'land' });
    } else if (this.state === 'attack' && !this.move!.air) {
      this.stun = this.move!.landRec ?? 6;
      this.setState('recover');
      this.setPose('crouch', 0.5);
      this.vx = 0;
      dust(5);
    } else if (this.state === 'air' || this.state === 'attack') {
      this.setState('neutral');
      this.vx = 0;
      dust(4);
      emit({ type: 'sfx', name: 'land' });
    }
  }

  private updateTrail(): void {
    const leaving = (this.state === 'attack' && this.move!.trail) || this.state === 'dash';
    if (leaving && this.age % 2 === 0) {
      this.trail.push({
        x: this.x,
        y: this.y,
        facing: this.facing,
        pose: { ...this.pose },
        spriteKey: this.spriteKey,
        life: TRAIL_LIFE,
      });
    }
    for (const ghost of this.trail) ghost.life--;
    this.trail = this.trail.filter((ghost) => ghost.life > 0);
  }
}
