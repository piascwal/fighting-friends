/* Types de la partie de lan-kit utilisée par le jeu.
   lan-kit est livré en TypeScript source, écrit pour TypeScript 5 : deux lignes de son mqtt.ts ne passent
   plus la vérification de TypeScript 6 (types des tableaux d'octets), sans effet à l'exécution. Pour que
   `npm run typecheck` ne lise pas ses sources, tsconfig.json fait pointer le module vers ce fichier.
   Vite, lui, compile le vrai paquet. À retirer quand lan-kit passera à TypeScript 6. */
declare module '@piascwal/lan-kit' {
  export interface AppLan {
    id: string;
    version: number;
  }
  export interface Salon {
    base: string;
  }
  export type Annonce<T> = T & { id: string; v: number; t: number; salon: number };
  export type Signal =
    | { type: 'offre'; sdp: string; nom: string; spect: boolean }
    | { type: 'reponse'; sdp: string }
    | { type: 'refus'; raison: 'complet' | 'version' | 'spectateurs' };
  export type ValideContenu<T> = (o: Record<string, unknown>) => T | null;
  export interface OptionsAnnuaire<T> {
    app: AppLan;
    salons: Salon[];
    valideContenu: ValideContenu<T>;
    courtiers?: string[];
    testament?: boolean;
  }
  export const TEXTE_SUR: RegExp;
  export function idAleatoire(octets?: number): string;
  export function nettoiePseudo(saisie: string, repli?: string): string;
  export function salonsDuReseau(
    app: AppLan,
    reseauForce?: string | null,
  ): Promise<{ salons: Salon[]; ipsPubliques: string[] }>;

  export class Annuaire<T extends object> {
    readonly id: string;
    onAnnonce: (a: Annonce<T>) => void;
    onRetrait: (id: string) => void;
    onSignal: (de: string, salon: number, s: Signal) => void;
    constructor(o: OptionsAnnuaire<T>);
    ouvre(): Promise<number>;
    ecouteAnnonces(): void;
    annonce(contenu: T): void;
    retireAnnonce(): void;
    signale(dest: string, salon: number, s: Signal): Promise<void>;
    ferme(): void;
  }

  export class Liaison {
    onCtrl: (msg: unknown) => void;
    onJeu: (data: ArrayBuffer) => void;
    onFerme: () => void;
    constructor(plageStricte?: boolean, ipsPubliques?: readonly string[], options?: { enLigne?: boolean });
    creeOffre(): Promise<string>;
    accepteOffre(sdp: string): Promise<string>;
    accepteReponse(sdp: string): Promise<void>;
    ouverte(delaiMs?: number): Promise<void>;
    codeVerification(): Promise<string>;
    envoieCtrl(msg: unknown): void;
    envoieJeu(data: ArrayBuffer): void;
    ferme(): void;
  }

  export class Veille {
    latenceMs: number | null;
    constructor(liaison: Liaison, surSilence: () => void, silenceMaxMs?: number);
    recu(m: { t: string; k?: number }): boolean;
    recuJeu(): void;
    arrete(): void;
  }
}
