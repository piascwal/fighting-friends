import { describe, expect, it } from 'vitest';
import { buildCreationPrompt, buildPrompt, poseDescription, spritePosesFor } from '../src/data/prompts';
import { makeCharacter, roster } from '../src/data/roster';
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

  it('hockeyeur : la crosse est demandée sur les poses communes, mais pas sur le portrait', () => {
    const hockey = makeCharacter({ id: 'h', name: 'PUCK', style: 'hockey', color: '#fff' });
    for (const spec of spritePosesFor(hockey)) {
      if (spec.stage || spec.proj || spec.portrait || spec.key === 'sp_hockey_fight') continue;
      expect(buildPrompt(hockey, spec.key), spec.key).toContain('crosse');
    }
    expect(buildPrompt(hockey, 'idle')).toContain('à deux mains');
    expect(buildPrompt(hockey, 'portrait')).not.toContain('crosse');
    expect(buildPrompt(ardan, 'idle')).not.toContain('crosse');
  });

  it('les prompts de pose interdisent de recopier le personnage de référence à côté', () => {
    expect(buildPrompt(ardan, 'crouch_kick')).toContain('UNE SEULE FOIS');
  });

  it('prompt de création : photo + modèle de style, nom, taille et accessoire du style', () => {
    const small = makeCharacter({ id: 'p', name: 'PUCK', style: 'hockey', color: '#fff', size: 0.8 });
    const prompt = buildCreationPrompt(small, 'maillot rouge', 'LOLO');
    for (const part of ['PHOTO', '« PUCK »', '« LOLO »', 'maillot rouge', 'PETITE', 'crosse', '#FF00FF']) {
      expect(prompt).toContain(part);
    }
    expect(buildCreationPrompt(ardan, '', 'LOLO')).not.toContain('PETITE');
  });

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
