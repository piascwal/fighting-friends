/* Effets « waouh » des supers : pulsations d'énergie pendant le coup, impacts géants à la couleur du
   personnage, traînées d'étincelles derrière ses projectiles. Valable pour n'importe quel super. */
import { GROUND_Y } from '../core/constants';
import { rand } from '../core/math';
import type { HitFx } from '../data/types';
import type { Fighter } from '../engine/fighter';
import type { Projectile } from '../engine/projectiles';
import type { Fx, Palette } from './fx';
import { tones } from './motion';

/** Un super est-il en cours pour ce combattant (coup ou projectile encore actif) ? */
export const inSuper = (f: Fighter): boolean => f.state === 'attack' && f.move?.id === 'super';

/** Palette éclatante : blanc, puis les tons de la couleur du personnage. */
const palette = (color: string): Palette => {
  const t = tones(color);
  return ['#ffffff', t[0]!, t[1]!];
};

/** Pendant le coup : ondes qui partent des pieds, étincelles qui jaillissent, flammes de couleur. */
export function superPulse(fx: Fx, f: Fighter, tick: number): void {
  const color = f.char.color;
  if (tick % 5 === 0) fx.add({ type: 'ring', x: f.x, y: GROUND_Y - 6, life: 20, size: 170, col: color });
  for (let i = 0; i < 2; i++) {
    fx.add({
      type: 'spark',
      x: f.x + rand(-40, 40),
      y: GROUND_Y + f.y - rand(0, 40),
      vx: rand(-2, 2),
      vy: rand(-12, -5),
      g: 0.25,
      life: rand(14, 26),
      size: rand(3, 6),
      col: i ? '#ffffff' : color,
    });
  }
  fx.aura(f.x, GROUND_Y + f.y, color);
}

/** Impact d'un coup de super : étoile géante, doubles ondes, éclats et entailles de lumière. */
export function superImpact(fx: Fx, x: number, y: number, kind: HitFx, dir: number, color: string): void {
  const pal = palette(color);
  fx.add({ type: 'burst', x, y, life: 20, size: 130, pal, rot: rand(6.3) });
  fx.add({ type: 'burst', x, y, life: 14, size: 80, pal: ['#fff', '#fff', pal[1]], rot: rand(6.3) });
  fx.add({ type: 'ring', x, y, life: 22, size: 190, col: '#ffffff' });
  fx.add({ type: 'ring', x, y, life: 16, size: 120, col: color });
  for (let i = 0; i < 4; i++)
    fx.add({
      type: 'cut',
      x,
      y,
      life: 12,
      size: rand(170, 260),
      col: i % 2 ? '#fff' : color,
      rot: rand(6.3),
    });
  for (let i = 0; i < 24; i++) {
    const angle = rand(6.3);
    const speed = rand(6, 19);
    fx.add({
      type: 'spark',
      x,
      y,
      vx: Math.cos(angle) * speed + dir * 3,
      vy: Math.sin(angle) * speed - 2,
      g: 0.3,
      life: rand(14, 30),
      size: rand(3, 7),
      col: i % 3 === 0 ? '#ffffff' : pal[i % 2 ? 1 : 2],
    });
  }
  if (kind === 'earth') {
    for (let i = 0; i < 10; i++)
      fx.add({
        type: 'rock',
        x: x + rand(-50, 50),
        y: GROUND_Y - 4,
        vx: rand(-7, 7),
        vy: rand(-15, -6),
        g: 0.6,
        life: rand(24, 40),
        size: rand(5, 11),
        col: '#9a7a52',
        rot: rand(6),
      });
  }
}

/** Traînée dense d'étincelles et d'anneaux derrière un projectile de super. */
export function superTrail(fx: Fx, p: Projectile): void {
  const color = p.owner.char.color;
  for (let i = 0; i < 3; i++) {
    fx.add({
      type: 'spark',
      x: p.x - p.dir * rand(6, 24),
      y: p.y + rand(-p.def.h * 0.5, p.def.h * 0.5),
      vx: -p.dir * rand(1, 5),
      vy: rand(-2, 2),
      life: rand(8, 18),
      size: rand(2, 5),
      col: i ? color : '#ffffff',
    });
  }
  if (p.age % 6 === 0) fx.add({ type: 'ring', x: p.x, y: p.y, life: 12, size: p.def.h * 1.6, col: color });
}
