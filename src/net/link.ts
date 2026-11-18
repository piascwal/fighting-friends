/* Lien entre les deux appareils d'un combat en réseau : deux canaux, comme une liaison WebRTC de lan-kit.
   - ctrl : messages fiables et ordonnés (choix des personnages, lancement, revanche…) ;
   - jeu  : paquets d'entrées, sans retransmission (voir lockstep.ts).
   Un second lien, par BroadcastChannel, relie deux onglets du même navigateur : il sert à tester le
   combat en réseau sans deux appareils (adresse du jeu suivie de « ?lan=test »). */
import { Veille, type Liaison } from '@piascwal/lan-kit';

export interface Link {
  sendCtrl(msg: unknown): void;
  sendGame(data: ArrayBuffer): void;
  onCtrl: (msg: unknown) => void;
  onGame: (data: ArrayBuffer) => void;
  /** Le lien est coupé (l'autre est parti, ou ne répond plus). */
  onClose: () => void;
  /** Aller-retour mesuré, en ms (null tant qu'inconnu). */
  readonly latency: number | null;
  /** Code à 4 chiffres identique sur les deux écrans (null si sans objet). */
  verification(): Promise<string | null>;
  close(): void;
}

/** Lien sur une liaison WebRTC de lan-kit, surveillé (ping, coupure après un silence de 6 s). */
export class LanLink implements Link {
  onCtrl: (msg: unknown) => void = () => {};
  onGame: (data: ArrayBuffer) => void = () => {};
  onClose: () => void = () => {};
  private readonly watch: Veille;
  private closed = false;

  constructor(private readonly liaison: Liaison) {
    this.watch = new Veille(liaison, () => this.close());
    liaison.onCtrl = (msg) => {
      const m = msg as { t?: unknown; k?: number };
      if (typeof m === 'object' && m && typeof m.t === 'string' && this.watch.recu(m as { t: string }))
        return;
      this.onCtrl(msg);
    };
    liaison.onJeu = (data) => {
      this.watch.recuJeu();
      this.onGame(data);
    };
    liaison.onFerme = () => this.close();
  }

  get latency(): number | null {
    return this.watch.latenceMs;
  }

  sendCtrl(msg: unknown): void {
    this.liaison.envoieCtrl(msg);
  }

  sendGame(data: ArrayBuffer): void {
    this.liaison.envoieJeu(data);
  }

  verification(): Promise<string | null> {
    return this.liaison.codeVerification();
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.watch.arrete();
    this.liaison.ferme();
    this.onClose();
  }
}

/** Lien de test entre deux onglets du même navigateur. */
export class TabLink implements Link {
  onCtrl: (msg: unknown) => void = () => {};
  onGame: (data: ArrayBuffer) => void = () => {};
  onClose: () => void = () => {};
  readonly latency = 0;
  private closed = false;

  constructor(
    private readonly channel: BroadcastChannel,
    private readonly me: string,
  ) {
    channel.onmessage = (event) => {
      const m = event.data as { from: string; ctrl?: unknown; game?: ArrayBuffer; bye?: boolean };
      if (m.from === this.me) return;
      if (m.bye) this.close();
      else if (m.game instanceof ArrayBuffer) this.onGame(m.game);
      else if ('ctrl' in m) this.onCtrl(m.ctrl);
    };
  }

  sendCtrl(msg: unknown): void {
    if (!this.closed) this.channel.postMessage({ from: this.me, ctrl: msg });
  }

  sendGame(data: ArrayBuffer): void {
    if (!this.closed) this.channel.postMessage({ from: this.me, game: data });
  }

  verification(): Promise<string | null> {
    return Promise.resolve(null);
  }

  close(): void {
    if (this.closed) return;
    this.channel.postMessage({ from: this.me, bye: true });
    this.closed = true;
    this.channel.close();
    this.onClose();
  }
}
