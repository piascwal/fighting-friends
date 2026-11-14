import { describe, expect, it } from 'vitest';
import { buildPrompt, poseDescription, spritePosesFor } from '../src/data/prompts';
import { roster } from '../src/data/roster';
import { SPRITE_BY_KEY } from '../src/data/sprite-poses';

const ardan = roster[0]!;

describe('prompts de génération des sprites', () => {
  it.each(roster.map((c) => [c.id, c] as const))(
    '%s : chaque pose a une description et un prompt',
    (_id, char) => {
      for (const spec of spritePosesFor(char)) {
        if (spec.stage) continue; // le décor se décrit librement, par le joueur
        expect(poseDescription(spec.key), spec.key).not.toBe('');
        expect(buildPrompt(char, spec.key)).toContain(char.name);
      }
    },
  );

  it("une posture basse demande un personnage plus petit dans l'image", () => {
    const standing = buildPrompt(ardan, 'idle');
    const crouching = buildPrompt(ardan, 'crouch');
    expect(standing).toContain('80 % de la hauteur');
    expect(standing).not.toContain('POSTURE BASSE');
    // accroupi : 62 % de la hauteur debout, donc 50 % de l'image (debout = 80 %)
    expect(crouching).toContain('POSTURE BASSE');
    expect(crouching).toContain('62 % de sa hauteur debout');
    expect(crouching).toContain('50 % de la hauteur');
  });

  it('toutes les postures accroupies insistent sur la hauteur', () => {
    for (const key of ['crouch', 'crouch_block', 'crouch_punch', 'crouch_kick'] as const) {
      expect(SPRITE_BY_KEY[key].h, key).toBeLessThan(0.8);
      expect(buildPrompt(ardan, key), key).toContain('POSTURE BASSE');
    }
  });

  it('une posture allongée se cadre en largeur', () => {
    expect(buildPrompt(ardan, 'down')).toContain('de la largeur');
  });

  it("le prompt explique à quoi sert l'image guide", () => {
    expect(buildPrompt(ardan, 'crouch')).toContain('mannequin gris');
  });
});

describe('postures du pantin guide', () => {
  it('les postures accroupies du mannequin sont aussi basses que ce que demande le prompt', async () => {
    const { POSES } = await import('../src/data/poses');
    const { DEFAULT_LOOKS } = await import('../src/data/styles');
    const { solveSkeleton } = await import('../src/render/rig-skeleton');
    const look = DEFAULT_LOOKS.balanced;
    const top = (pose: (typeof POSES)[keyof typeof POSES]) => {
      const sk = solveSkeleton(pose, look, 1, 1);
      return -(sk.head.y - sk.headRadius);
    };
    const standing = top(POSES.idle);
    const pairs = [
      ['crouch', 'crouch'],
      ['crouchBlock', 'crouch_block'],
      ['cLp', 'crouch_punch'],
    ] as const;
    for (const [pose, sprite] of pairs) {
      // le guide et le prompt doivent dire la même chose, à 3 points près
      expect(Math.abs(top(POSES[pose]) / standing - SPRITE_BY_KEY[sprite].h!), pose).toBeLessThan(0.03);
    }
  });
});
