/* Trouver un adversaire sur le même Wi-Fi, avec lan-kit : un appareil crée une partie (il l'annonce),
   l'autre la voit dans la liste et la rejoint. Aucune adresse à saisir, aucun serveur à nous :
   lan-kit passe par des serveurs publics de mise en relation, tout chiffré, puis relie les deux
   appareils directement (WebRTC, réseau local uniquement).

   En test (« ?lan=test »), deux onglets du même navigateur se trouvent par BroadcastChannel. */
import {
  Annuaire,
  Liaison,
  TEXTE_SUR,
  idAleatoire,
  nettoiePseudo,
  salonsDuReseau,
  type Annonce,
  type AppLan,
  type Signal,
} from '@piascwal/lan-kit';
import { LanLink, TabLink, type Link } from './link';

/** Identité du jeu pour lan-kit : deux versions incompatibles du protocole ne se voient pas. */
const APP: AppLan = { id: 'fighting-friends', version: 1 };

/** Ce qu'une partie annonce : le pseudo de celui qui l'a créée. */
interface GameAd {
  nom: string;
}

export interface FoundGame {
  id: string;
  name: string;
  /** Pour rejoindre : la partie lan-kit, ou l'identifiant d'un onglet de test. */
  ad: Annonce<GameAd> | string;
}

const validAd = (o: Record<string, unknown>): GameAd | null =>
  typeof o.nom === 'string' && TEXTE_SUR.test(o.nom) ? { nom: o.nom } : null;

/** Pseudo affichable sur le réseau : majuscules, chiffres et espaces, 14 caractères au plus. */
export const cleanName = (name: string): string => nettoiePseudo(name) || 'JOUEUR';

const testMode = (): boolean => new URLSearchParams(location.search).get('lan') === 'test';

/** Un appareil qui cherche ou propose une partie. `close()` arrête tout (annonce comprise). */
export interface Lobby {
  /** Parties visibles sur le réseau (mise à jour par onGames). */
  games: FoundGame[];
  onGames: () => void;
  /** Annonce une partie ; `onLink` est appelé quand un adversaire la rejoint. */
  host(name: string, onLink: (link: Link) => void): void;
  /** Rejoint une partie de la liste. */
  join(game: FoundGame, name: string): Promise<Link>;
  close(): void;
}

/** Ouvre la recherche de parties : sur le Wi-Fi, ou entre onglets en mode test. */
export async function openLobby(): Promise<Lobby> {
  return testMode() ? new TabLobby() : LanLobby.open();
}

class LanLobby implements Lobby {
  games: FoundGame[] = [];
  onGames: () => void = () => {};
  private hosting = false;

  private constructor(
    private readonly directory: Annuaire<GameAd>,
    private readonly publicIps: string[],
  ) {}

  static async open(): Promise<LanLobby> {
    const { salons, ipsPubliques } = await salonsDuReseau(APP);
    const directory = new Annuaire<GameAd>({ app: APP, salons, valideContenu: validAd, testament: true });
    await directory.ouvre();
    const lobby = new LanLobby(directory, ipsPubliques);
    directory.onAnnonce = (ad) => {
      lobby.games = [...lobby.games.filter((g) => g.id !== ad.id), { id: ad.id, name: ad.nom, ad }];
      lobby.onGames();
    };
    directory.onRetrait = (id) => {
      lobby.games = lobby.games.filter((g) => g.id !== id);
      lobby.onGames();
    };
    directory.ecouteAnnonces();
    return lobby;
  }

  host(name: string, onLink: (link: Link) => void): void {
    this.hosting = true;
    let busy = false;
    this.directory.annonce({ nom: cleanName(name) });
    this.directory.onSignal = (from, salon, signal) => {
      if (signal.type !== 'offre') return;
      if (busy || !this.hosting) {
        void this.directory.signale(from, salon, { type: 'refus', raison: 'complet' });
        return;
      }
      busy = true;
      void (async () => {
        const liaison = new Liaison(true, this.publicIps);
        try {
          const answer = await liaison.accepteOffre(signal.sdp);
          await this.directory.signale(from, salon, { type: 'reponse', sdp: answer });
          await liaison.ouverte();
          this.directory.retireAnnonce();
          this.hosting = false;
          onLink(new LanLink(liaison));
        } catch {
          liaison.ferme();
          busy = false;
        }
      })();
    };
  }

  async join(game: FoundGame, name: string): Promise<Link> {
    const ad = game.ad as Annonce<GameAd>;
    const liaison = new Liaison(true, this.publicIps);
    const answer = new Promise<Signal>((resolve) => {
      this.directory.onSignal = (from, _salon, signal) => {
        if (from === ad.id) resolve(signal);
      };
    });
    const offer = await liaison.creeOffre();
    await this.directory.signale(ad.id, ad.salon, {
      type: 'offre',
      sdp: offer,
      nom: cleanName(name),
      spect: false,
    });
    const reply = await Promise.race([answer, new Promise<null>((r) => setTimeout(() => r(null), 12_000))]);
    if (!reply || reply.type !== 'reponse') {
      liaison.ferme();
      throw new Error(reply?.type === 'refus' ? 'complet' : 'pas de réponse');
    }
    await liaison.accepteReponse(reply.sdp);
    await liaison.ouverte();
    return new LanLink(liaison);
  }

  close(): void {
    this.hosting = false;
    this.directory.ferme();
  }
}

/** Mise en relation entre onglets du même navigateur (test). */
class TabLobby implements Lobby {
  games: FoundGame[] = [];
  onGames: () => void = () => {};
  private readonly me = idAleatoire();
  private readonly channel = new BroadcastChannel('ff-lan-test');
  private hostName: string | null = null;
  private onLink: ((link: Link) => void) | null = null;
  private timer: ReturnType<typeof setInterval>;

  constructor() {
    this.channel.onmessage = (event) => {
      const m = event.data as { t: string; from: string; to?: string; name?: string; room?: string };
      if (m.from === this.me) return;
      if (m.t === 'ad' && m.name && !this.games.some((g) => g.id === m.from)) {
        this.games.push({ id: m.from, name: m.name, ad: m.from });
        this.onGames();
      } else if (m.t === 'join' && m.to === this.me && this.onLink && m.room) {
        const link = new TabLink(new BroadcastChannel(m.room), this.me);
        const done = this.onLink;
        this.hostName = this.onLink = null;
        done(link);
      }
    };
    this.timer = setInterval(() => {
      if (this.hostName) this.channel.postMessage({ t: 'ad', from: this.me, name: this.hostName });
    }, 500);
  }

  host(name: string, onLink: (link: Link) => void): void {
    this.hostName = cleanName(name);
    this.onLink = onLink;
  }

  join(game: FoundGame): Promise<Link> {
    const room = `ff-lan-test-${idAleatoire()}`;
    // le canal du salon est ouvert avant de prévenir l'hôte : rien de ce qu'il envoie ne se perd
    const link = new TabLink(new BroadcastChannel(room), this.me);
    this.channel.postMessage({ t: 'join', from: this.me, to: game.ad, room });
    return new Promise((resolve) => setTimeout(() => resolve(link), 150));
  }

  close(): void {
    clearInterval(this.timer);
    this.channel.close();
  }
}
