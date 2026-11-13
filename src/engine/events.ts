/* Ce que la simulation annonce au reste du jeu. Le moteur ne dessine rien et ne joue aucun son :
   il émet des événements, que la scène de combat transmet à l'affichage et à l'audio. */
import type { SfxName } from '../core/sfx';
import type { Box, HitFx, SwooshKind } from '../data/types';
import type { Fighter } from './fighter';

export type BannerTone = 'gold' | 'red' | 'blue';

export type FightEvent =
  | { type: 'sfx'; name: SfxName }
  | { type: 'dust'; x: number; y: number; dir: number; count: number }
  | { type: 'impact'; x: number; y: number; fx: HitFx; power: number; dir: number }
  | { type: 'guard'; x: number; y: number }
  | { type: 'swoosh'; fighter: Fighter; box: Box; kind: SwooshKind }
  | { type: 'shake'; amount: number }
  | { type: 'flash'; amount: number }
  | { type: 'confetti'; x: number; y: number }
  | { type: 'banner'; text: string; duration: number; size: number; y?: number; tone?: BannerTone };

export type Emit = (event: FightEvent) => void;
