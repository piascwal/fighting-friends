/* Particules et effets d'impact. Ce fichier décide QUOI faire apparaître ; fx-draw.ts sait le dessiner. */
import { pick, rand } from '../core/math';
import type { Box, HitFx, SwooshKind } from '../data/types';
import type { Fighter } from '../engine/fighter';
import { drawParticle } from './fx-draw';

export type Palette = readonly [core: string, mid: string, edge: string];

interface Base {
  /** Âge et durée de vie, en frames. */
  t: number;
  life: number;
  x: number;
  y: number;
}
interface Moving extends Base {
  vx: number;
  vy: number;
  /** Gravité. */
  g?: number;
}

export type Particle =
  | (Base & { type: 'burst'; size: number; pal: Palette; rot: number })
  | (Base & { type: 'ring'; size: number; col: string })
  | (Moving & { type: 'spark'; size: number; col: string })
  | (Moving & { type: 'smoke'; size: number; col: string })
  | (Moving & { type: 'rock'; size: number; col: string; rot: number })
  | (Base & { type: 'bolt'; size: number; col: string; rot: number; seed: number })
  | (Base & { type: 'cut'; size: number; col: string; rot: number })
  | (Base & { type: 'swoosh'; fighter: Fighter; box: Box; kind: SwooshKind; col: string });

/** Omit qui s'applique à chaque variante de l'union séparément. */
type Without<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type NewParticle = Without<Particle, 't'>;

const PALETTES: Record<HitFx | 'block', Palette> = {
  punch: ['#fff', '#ffe27a', '#ff9d2e'],
  kick: ['#fff', '#ffe27a', '#ff9d2e'],
  heavy: ['#fff', '#ffd23a', '#ff5a1f'],
  fire: ['#fff', '#ffb02e', '#ff3b1f'],
  elec: ['#fff', '#8ff7ff', '#2aa8ff'],
  earth: ['#fff', '#e8c98a', '#9a6a3a'],
  slash: ['#fff', '#d8b4ff', '#8a3bff'],
  ice: ['#fff', '#bfe9ff', '#3b9cff'],
  block: ['#fff', '#9fd8ff', '#3b7bff'],
};
const CONFETTI = ['#ff3d7f', '#ffd23a', '#19c6c6', '#fff', '#a25bff', '#7dff6a'];
const MAX_PARTICLES = 500;
/** À partir de cette puissance, l'impact est « gros » : plus d'étincelles, plus grand. */
const BIG_HIT = 60;

export class Fx {
  private particles: Particle[] = [];

  add(p: NewParticle): void {
    this.particles.push({ ...p, t: 0 } as Particle);
  }

  /** Étoile d'impact + étincelles, avec un supplément selon l'élément du coup. */
  impact(x: number, y: number, fx: HitFx, power: number, dir: number): void {
    const pal = PALETTES[fx];
    const big = power > BIG_HIT;
    this.add({ type: 'burst', x, y, life: big ? 16 : 11, size: big ? 74 : 44, pal, rot: rand(6.3) });
    this.add({ type: 'ring', x, y, life: big ? 18 : 12, size: big ? 90 : 52, col: pal[1] });
    for (let i = 0; i < (big ? 14 : 7); i++) {
      // les étincelles partent dans le sens du coup
      const angle = rand(-1.2, 1.2) + (dir > 0 ? 0 : Math.PI);
      const speed = rand(4, big ? 15 : 10);
      this.add({
        type: 'spark',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        g: 0.35,
        life: rand(10, 22),
        size: rand(2, big ? 6 : 4),
        col: pick(pal),
      });
    }
    if (fx === 'elec') {
      for (let i = 0; i < 3; i++) {
        this.add({
          type: 'bolt',
          x: x + rand(-20, 20),
          y: y + rand(-30, 30),
          life: 9,
          size: rand(40, 80),
          col: '#bff',
          rot: rand(6.3),
          seed: rand(99),
        });
      }
    } else if (fx === 'slash') {
      this.add({ type: 'cut', x, y, life: 12, size: big ? 170 : 120, col: pal[1], rot: rand(-0.9, 0.9) });
    } else if (fx === 'fire') {
      for (let i = 0; i < 6; i++) {
        this.add({
          type: 'smoke',
          x: x + rand(-14, 14),
          y: y + rand(-14, 14),
          vx: rand(-1.5, 1.5),
          vy: rand(-3.5, -1),
          life: rand(16, 28),
          size: rand(10, 22),
          col: pick(['#ff9d2e', '#ff5a1f', '#ffd23a']),
        });
      }
    } else if (fx === 'earth') {
      for (let i = 0; i < 7; i++) {
        this.add({
          type: 'rock',
          x: x + rand(-20, 20),
          y,
          vx: rand(-5, 5),
          vy: rand(-11, -4),
          g: 0.6,
          life: rand(20, 34),
          size: rand(4, 9),
          col: pick(['#7a5a3a', '#9a7a52', '#5a4028']),
          rot: rand(6),
        });
      }
    }
  }

  /** Éclat bleu d'un coup bloqué. */
  guard(x: number, y: number): void {
    this.add({ type: 'ring', x, y, life: 10, size: 46, col: '#9fd8ff' });
    this.add({ type: 'burst', x, y, life: 8, size: 34, pal: PALETTES.block, rot: rand(6.3) });
    for (let i = 0; i < 5; i++) {
      const angle = rand(6.3);
      this.add({
        type: 'spark',
        x,
        y,
        vx: Math.cos(angle) * 6,
        vy: Math.sin(angle) * 6,
        g: 0.2,
        life: 12,
        size: 3,
        col: '#bfe6ff',
      });
    }
  }

  dust(x: number, y: number, dir: number, count: number): void {
    for (let i = 0; i < count; i++) {
      this.add({
        type: 'smoke',
        x: x + rand(-10, 10),
        y: y - rand(0, 6),
        vx: -dir * rand(0.5, 3) + rand(-1, 1),
        vy: rand(-1.6, -0.2),
        life: rand(14, 26),
        size: rand(7, 15),
        col: 'rgb(230,220,200)',
      });
    }
  }

  /** Traînée blanche qui accompagne un coup ; elle suit le combattant. */
  swoosh(fighter: Fighter, box: Box, kind: SwooshKind, col: string): void {
    this.add({ type: 'swoosh', x: 0, y: 0, fighter, box, kind, life: 9, col });
  }

  /** Volutes qui montent autour d'un combattant (jauge pleine, super). */
  aura(x: number, y: number, col: string): void {
    for (let i = 0; i < 2; i++) {
      this.add({
        type: 'smoke',
        x: x + rand(-34, 34),
        y: y - rand(0, 150),
        vx: 0,
        vy: rand(-5, -2),
        life: rand(12, 22),
        size: rand(5, 12),
        col,
      });
    }
  }

  confetti(x: number, y: number): void {
    for (let i = 0; i < 60; i++) {
      const angle = rand(6.3);
      const speed = rand(3, 13);
      this.add({
        type: 'rock',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        g: 0.22,
        life: rand(50, 110),
        size: rand(4, 8),
        col: pick(CONFETTI),
        rot: rand(6),
      });
    }
  }

  update(): void {
    for (const p of this.particles) {
      p.t++;
      if ('vx' in p) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.g) p.vy += p.g;
        p.vx *= 0.96;
      }
    }
    this.particles = this.particles.filter((p) => p.t < p.life);
    if (this.particles.length > MAX_PARTICLES)
      this.particles.splice(0, this.particles.length - MAX_PARTICLES);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) drawParticle(ctx, p);
  }
}
