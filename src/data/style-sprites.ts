/* Images propres à un style de combat : celles de ses coups spéciaux, projectiles et animal de compagnie.
   Elles se déduisent des coups (rien à tenir à jour à la main) et sont publiées dans les besoins du jeu
   pour la banque de sprites (scripts/export-needs.ts). */
import { NEUTRAL_POSES, POSE_SPRITE, type PoseName } from './poses';
import { isSpecialKey, type SpriteKey } from './sprite-poses';
import type { MoveDef, StyleDef } from './types';

/** Image affichée pour une posture d'un coup (même règle que le moteur, voir fighter-attack.ts). */
function animSprite(move: MoveDef, pose: PoseName): SpriteKey {
  return move.sprite && !NEUTRAL_POSES.has(pose) ? move.sprite : POSE_SPRITE[pose];
}

/** Images de coups spéciaux et de projectiles utilisées par un coup, dans l'ordre de son animation. */
export function moveSprites(move: MoveDef): SpriteKey[] {
  const keys = new Set<SpriteKey>();
  for (const m of [move, move.counter?.riposte]) {
    if (!m) continue;
    for (const [, pose] of m.anim) {
      const key = animSprite(m, pose);
      if (isSpecialKey(key)) keys.add(key);
    }
    if (m.proj?.sprite) keys.add(m.proj.sprite);
    for (const frame of m.proj?.frames ?? []) keys.add(frame);
  }
  return [...keys];
}

/** Images propres à un style : celles de ses coups spéciaux et de ses projectiles, dans l'ordre des coups. */
export function styleSprites(style: StyleDef): SpriteKey[] {
  const ids = ['s1l', 's1h', 's2l', 's2h', 'super'] as const;
  const pet = style.companion ? [style.companion.idle, style.companion.win] : [];
  return [...new Set([...pet, ...ids.flatMap((id) => moveSprites(style.moves[id]))])];
}
