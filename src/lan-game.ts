/* Déroulement d'un combat entre deux appareils sur le même Wi-Fi : présentation, choix des personnages
   (chacun le sien), lancement par l'hôte, combat en lockstep, puis revanche, retour aux personnages ou
   départ. L'hôte pilote le combattant de gauche et décide du décor et du nombre de manches. */
import { playMusic } from './audio/audio';
import { settings } from './core/settings';
import { characterById, makeCharacter } from './data/roster';
import { STYLES } from './data/styles';
import type { Character } from './data/types';
import type { Link } from './net/link';
import { PROTOCOL, readMsg, type CharSpec, type NetMsg, type StageSpec } from './net/protocol';
import { bodyScaleOf } from './render/character-draw';
import { getStage, randomStageIndex, stageForCharacter } from './render/stages';
import { NetFightScene } from './scenes/net-fight-scene';
import type { Scene } from './scenes/scene';
import { Versus } from './scenes/versus';
import { Victory } from './scenes/victory';
import { hideScreens, openSelect, setRemotePick, showResult, toast, wipe } from './ui';

/** Ce dont la partie en réseau a besoin du jeu. */
export interface LanHost {
  setScene(scene: Scene): void;
  /** Retour au menu principal (combat de démonstration derrière). */
  toMenu(): void;
  /** Remet le combat de démonstration derrière les menus, sans quitter la partie. */
  attract(): void;
}

const specOf = (char: Character): CharSpec => ({
  id: char.id,
  name: char.name,
  style: char.styleId,
  color: char.color,
  size: char.size,
});

/**
 * Le personnage à simuler : celui de cet appareil s'il le connaît (avec ses images), mais avec le style
 * et la taille de l'autre appareil, pour que les deux combats soient identiques. Inconnu ici : le pantin.
 */
function charFrom(spec: CharSpec): Character {
  const known = characterById(spec.id);
  if (!known) return makeCharacter({ ...spec, custom: true });
  return { ...known, styleId: spec.style, style: STYLES[spec.style], size: spec.size, color: spec.color };
}

const stageFrom = (spec: StageSpec) =>
  'char' in spec
    ? stageForCharacter(
        characterById(spec.char) ??
          charFrom({ id: spec.char, name: '?', style: 'balanced', color: '#888888', size: 1 }),
      )
    : getStage(spec.index);

export class LanGame {
  private remoteName = 'ADVERSAIRE';
  private mine: CharSpec | null = null;
  private theirs: CharSpec | null = null;
  private wantAgain = [false, false];
  private fight: NetFightScene | null = null;
  private warnedDesync = false;
  private ended = false;

  constructor(
    private readonly link: Link,
    readonly isHost: boolean,
    private readonly game: LanHost,
    playerName: string,
  ) {
    link.onCtrl = (raw) => {
      const msg = readMsg(raw);
      if (msg) this.handle(msg);
    };
    link.onGame = (data) => this.fight?.receive(data);
    link.onClose = () => {
      if (this.ended) return;
      this.ended = true;
      toast(`Connexion perdue avec ${this.remoteName}`);
      this.game.toMenu();
    };
    link.sendCtrl({ t: 'hello', v: PROTOCOL, name: playerName });
    openSelect('lan');
  }

  private handle(msg: NetMsg): void {
    switch (msg.t) {
      case 'hello':
        if (msg.v !== PROTOCOL) {
          toast("L'autre appareil n'a pas la même version du jeu : mettez-le à jour tous les deux");
          return this.leave();
        }
        this.remoteName = msg.name;
        void this.link.verification().then((code) => {
          toast(
            code ? `Connecté à ${msg.name} · code ${code} (le même sur ses écran)` : `Connecté à ${msg.name}`,
          );
        });
        return;
      case 'pick':
        this.theirs = msg.c;
        setRemotePick(charFrom(msg.c));
        return this.maybeStart();
      case 'start':
        if (!this.isHost) this.start(msg);
        return;
      case 'again':
        this.wantAgain[1] = true;
        return this.maybeStart();
      case 'reselect':
        return this.reselect(false);
      case 'bye':
        toast(`${this.remoteName} a quitté la partie`);
        return this.leave(false);
      case 'sum':
        this.fight?.checkSum(msg.f, msg.s);
        if (this.fight?.desync && !this.warnedDesync) {
          this.warnedDesync = true;
          toast('Les deux appareils ne voient plus le même combat (désynchronisation)');
        }
        return;
    }
  }

  /** Le joueur de cet appareil a choisi son personnage. */
  picked(char: Character): void {
    this.mine = specOf(char);
    this.link.sendCtrl({ t: 'pick', c: this.mine });
    this.maybeStart();
  }

  /** L'hôte lance le combat dès que les deux ont choisi (et, après un combat, voulu la revanche). */
  private maybeStart(): void {
    if (!this.isHost || !this.mine || !this.theirs) return;
    if (this.fight && !(this.wantAgain[0] && this.wantAgain[1])) return;
    const p: [CharSpec, CharSpec] = [this.mine, this.theirs];
    const chars = p.map(charFrom);
    // décor : celui d'un des deux personnages s'il en a un, sinon un décor dessiné au hasard
    const own = chars.find((c) => stageForCharacter(c).kind === 'image');
    const stage: StageSpec = own ? { char: own.id } : { index: randomStageIndex() };
    const msg = {
      t: 'start' as const,
      p,
      scales: [bodyScaleOf(chars[0]!), bodyScaleOf(chars[1]!)] as [number, number],
      stage,
      rounds: settings.rounds,
    };
    this.link.sendCtrl(msg);
    this.start(msg);
  }

  private start(msg: Extract<NetMsg, { t: 'start' }>): void {
    this.wantAgain = [false, false];
    const [left, right] = msg.p.map(charFrom) as [Character, Character];
    hideScreens();
    playMusic(null);
    const fight = new NetFightScene({
      chars: [left, right],
      scales: msg.scales,
      stage: stageFrom(msg.stage),
      rounds: msg.rounds,
      link: this.link,
      side: this.isHost ? 0 : 1,
      onEnd: (winner) => this.end(winner, left, right),
    });
    this.fight = fight;
    this.game.setScene(
      new Versus(
        left,
        right,
        `${this.isHost ? 'TOI' : this.remoteName} VS ${this.isHost ? this.remoteName : 'TOI'}`,
        () => {
          playMusic('fight');
          wipe();
          this.game.setScene(fight);
        },
      ),
    );
  }

  private end(winner: number, left: Character, right: Character): void {
    const mySide = this.isHost ? 0 : 1;
    playMusic('menu');
    this.game.setScene(new Victory(winner === 1 ? right : left, winner !== mySide));
    wipe();
    showResult([
      ['REVANCHE', () => this.again()],
      ['PERSONNAGES', () => this.reselect(true)],
      ['QUITTER', () => this.leave()],
    ]);
  }

  private again(): void {
    this.wantAgain[0] = true;
    this.link.sendCtrl({ t: 'again' });
    if (!this.wantAgain[1]) toast(`En attente de ${this.remoteName}…`);
    this.maybeStart();
  }

  private reselect(ours: boolean): void {
    if (ours) this.link.sendCtrl({ t: 'reselect' });
    this.mine = this.theirs = this.fight = null;
    this.game.attract();
    openSelect('lan');
  }

  /** Quitte la partie ; `notify` : prévenir l'autre appareil. */
  leave(notify = true): void {
    if (this.ended) return;
    this.ended = true;
    if (notify) this.link.sendCtrl({ t: 'bye' });
    // laisse partir le message d'au revoir avant de couper
    setTimeout(() => this.link.close(), notify ? 300 : 0);
    this.game.toMenu();
  }
}
