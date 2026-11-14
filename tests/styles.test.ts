import { describe, expect, it } from 'vitest';
import { styleSprites } from '../src/data/prompts';
import { SPECIAL_POSES } from '../src/data/special-poses';
import { SPRITE_BY_KEY } from '../src/data/sprite-poses';
import { STYLE_LIST } from '../src/data/styles';
import type { MoveId } from '../src/data/types';
import type { Controller } from '../src/engine/controller';
import type { FightSim } from '../src/engine/fight';
import { autoFight, createTraining, fighterChar, press, run, wait, type Step } from './harness';

/** Une frame : les manettes lisent leurs appuis, puis le combat avance. */
function stepBoth(pad: Controller, sim: FightSim, other?: Controller): void {
  pad.step();
  other?.step();
  sim.update();
}

const SPECIALS: readonly MoveId[] = ['s1l', 's1h', 's2l', 's2h', 'super'];
/** Coups qui ne frappent pas par eux-mêmes : garde de contre (attend un coup), pas éclair (déplacement). */
const NO_DAMAGE: Record<string, readonly MoveId[]> = {
  counter: ['s1l', 's1h'], // garde de contre
  storm: ['s2l', 's2h'], // pas éclair
  tiger: ['s2l', 's2h'], // posture : ce sont ses suites qui frappent
  berserker: ['s2l', 's2h'], // rage
  monk: ['s2l', 's2h'], // méditation
};

/** Lance un coup par ordre direct (comme la console), le mannequin placé à `distance`. */
function damageOf(style: (typeof STYLE_LIST)[number]['id'], id: MoveId, distance: number): number {
  const { sim, pad } = createTraining({ style, distance, meter: 100 });
  const dummy = sim.fighters[1];
  let dealt = 0;
  pad.commands.push(id);
  for (let f = 0; f < 140; f++) {
    pad.step();
    const before = dummy.hp;
    sim.update();
    // en entraînement le mannequin récupère sa vie : on additionne les pertes au fil des frames
    if (dummy.hp < before) dealt += before - dummy.hp;
  }
  return dealt;
}

describe.each(STYLE_LIST.map((s) => [s.id, s] as const))('style %s', (id, style) => {
  it.each(SPECIALS.filter((m) => !NO_DAMAGE[id]?.includes(m)))(
    '%s touche le mannequin à une distance au moins',
    (move) => {
      const best = Math.max(...[80, 140, 200, 260, 330].map((d) => damageOf(style.id, move, d)));
      expect(best).toBeGreaterThan(0);
    },
  );

  it('un combat complet console contre console va au bout', () => {
    const { winner, frames } = autoFight(fighterChar('ardan', style.id), 'bruno');
    expect(winner).toBeGreaterThanOrEqual(0);
    expect(frames).toBeLessThan(60 * 60 * 5);
  });

  it('chacune de ses images a une description pour le prompt', () => {
    const keys = styleSprites(style);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) expect(SPRITE_BY_KEY[key].desc, key).toBeTruthy();
  });
});

describe('catalogue des images de coups spéciaux', () => {
  it('chaque image du catalogue sert au moins à un style', () => {
    const used = new Set(STYLE_LIST.flatMap(styleSprites));
    for (const key of Object.keys(SPECIAL_POSES)) expect(used.has(key as never), key).toBe(true);
  });

  it('des styles partagent des images (moins d’images à fournir en changeant de style)', () => {
    const counts = new Map<string, number>();
    for (const key of STYLE_LIST.flatMap(styleSprites)) counts.set(key, (counts.get(key) ?? 0) + 1);
    expect([...counts.values()].some((n) => n > 1)).toBe(true);
  });
});

describe('mécaniques des nouveaux styles', () => {
  it('la prise du lutteur traverse la garde', () => {
    const { sim, pad } = createTraining({ style: 'grappler', distance: 70, humanOpponent: true });
    const [, defender] = sim.fighters;
    pad.commands.push('s1h');
    for (let f = 0; f < 40; f++) {
      defender.ctrl.x = 1; // recule : il bloquerait n'importe quel coup normal
      defender.ctrl.step();
      pad.step();
      sim.update();
    }
    expect(defender.hp).toBeLessThan(defender.maxHp);
  });

  it("la prise ne saisit pas un adversaire en l'air", () => {
    const { sim, pad } = createTraining({ style: 'grappler', distance: 70, humanOpponent: true });
    const [, defender] = sim.fighters;
    const frame = () => {
      defender.ctrl.step();
      pad.step();
      sim.update();
    };
    defender.ctrl.y = -1; // saute
    for (let f = 0; f < 6; f++) frame();
    pad.commands.push('s1h');
    for (let f = 0; f < 30; f++) frame();
    expect(defender.hp).toBe(defender.maxHp);
  });

  it('la garde de fer absorbe un coup et riposte', () => {
    const { sim, pad } = createTraining({ style: 'counter', distance: 90, humanOpponent: true });
    const [player, attacker] = sim.fighters;
    pad.commands.push('s1h');
    pad.step();
    sim.update();
    attacker.ctrl.press('hp');
    let riposted = false;
    for (let f = 0; f < 50; f++) {
      attacker.ctrl.step();
      pad.step();
      sim.update();
      if (player.move?.name === 'Riposte') riposted = true;
    }
    expect(riposted).toBe(true);
    expect(player.hp).toBe(player.maxHp);
    expect(attacker.hp).toBeLessThan(attacker.maxHp);
  });
});

describe('saut et coups aériens', () => {
  it('un saut dure moins de 0,6 s', () => {
    const { sim, pad } = createTraining({ distance: 300 });
    const player = sim.fighters[0];
    pad.y = -1;
    let airborne = 0;
    for (let f = 0; f < 90; f++) {
      pad.step();
      sim.update();
      pad.y = 0;
      if (!player.grounded) airborne++;
    }
    expect(airborne).toBeGreaterThan(20);
    expect(airborne).toBeLessThan(36);
  });

  it("en l'air, la jambe se replie entre deux coups de pied", () => {
    const { sim, pad } = createTraining({ distance: 300 });
    const player = sim.fighters[0];
    const keys: string[] = [];
    pad.y = -1;
    pad.step();
    sim.update();
    pad.y = 0;
    for (const step of [wait(3), press('lk', 10), press('lk', 10)]) {
      for (let f = 0; f < (step.frames ?? 1); f++) {
        if (f === 0 && step.press) pad.press(step.press);
        pad.step();
        sim.update();
        if (keys[keys.length - 1] !== player.spriteKey) keys.push(player.spriteKey);
      }
    }
    // pied tendu, replié, pied tendu
    const kicks = keys.map((k, i) => (k === 'jump_kick' ? i : -1)).filter((i) => i >= 0);
    expect(kicks.length).toBeGreaterThanOrEqual(2);
    expect(keys.slice(kicks[0], kicks[1])).toContain('jump');
  });

  it('le lanceur reste enchaînable pour tous les styles', () => {
    for (const style of STYLE_LIST) {
      const r = run({ style: style.id, distance: 80 }, [
        wait(3),
        { y: 1, press: 'hp', frames: 9 },
        { y: -1, x: 1, frames: 8 },
        press('lp', 6),
        press('lk', 6),
        press('hp', 7),
        press('hk', 40),
      ]);
      expect(r.maxCombo, style.id).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('mécaniques inspirées des jeux de combat', () => {
  /** Joue une suite d'étapes avec le joueur d'un style donné ; renvoie les coups sortis et les dégâts infligés. */
  const play = (style: (typeof STYLE_LIST)[number]['id'], steps: Step[], distance = 90) => {
    const { sim, pad } = createTraining({ style, distance });
    const [player, dummy] = sim.fighters;
    const names: string[] = [];
    let dealt = 0;
    for (const step of steps) {
      for (let f = 0; f < (step.frames ?? 1); f++) {
        pad.x = step.x ?? 0;
        pad.y = step.y ?? 0;
        if (f === 0 && step.press) pad.press(step.press);
        pad.step();
        const before = dummy.hp;
        sim.update();
        if (dummy.hp < before) dealt += before - dummy.hp;
        const name = player.move?.name;
        if (name && names[names.length - 1] !== name) names.push(name);
      }
    }
    return { names, dealt, player };
  };

  it('charge : arrière tenu puis avant + poing lance le disque', () => {
    const r = play(
      'soldier',
      [
        { x: -1, frames: 35 },
        { x: 1, press: 'lp', frames: 40 },
      ],
      300,
    );
    expect(r.names).toContain('Disque tranchant');
  });

  it("charge : sans avoir tenu l'arrière, avant + poing reste un coup normal", () => {
    const r = play(
      'soldier',
      [
        { x: -1, frames: 8 },
        { x: 1, press: 'lp', frames: 30 },
      ],
      300,
    );
    expect(r.names).not.toContain('Disque tranchant');
  });

  it('charge : bas tenu puis haut + pied lance le saut périlleux', () => {
    const r = play(
      'soldier',
      [
        { y: 1, frames: 35 },
        { y: -1, frames: 1 },
        { y: -1, press: 'hk', frames: 40 },
      ],
      90,
    );
    expect(r.names).toContain('Saut périlleux');
    expect(r.dealt).toBeGreaterThan(0);
  });

  it('enchaîneur : deux nouveaux appuis sur un poing donnent la deuxième puis la troisième frappe', () => {
    const { sim, pad } = createTraining({ style: 'chain', distance: 90 });
    const player = sim.fighters[0];
    const names = new Set<string>();
    pad.commands.push('s1h');
    for (let f = 0; f < 90; f++) {
      if (f === 10 || f === 24) pad.press('hp');
      pad.step();
      sim.update();
      if (player.move) names.add(player.move.name);
    }
    expect([...names]).toEqual(['Triple frappe', 'Triple frappe (2)', 'Triple frappe (3)']);
  });

  it('enchaîneur : sans toucher, pas de suite', () => {
    const { sim, pad } = createTraining({ style: 'chain', distance: 400 });
    const player = sim.fighters[0];
    const names = new Set<string>();
    pad.commands.push('s1h');
    for (let f = 0; f < 60; f++) {
      if (f === 10) pad.press('hp');
      pad.step();
      sim.update();
      if (player.move) names.add(player.move.name);
    }
    expect(names.has('Triple frappe (2)')).toBe(false);
  });

  it('tigre : chaque bouton fait sortir la posture sur un coup différent', () => {
    const exits = (button: 'lp' | 'hp' | 'lk' | 'hk') => {
      const { sim, pad } = createTraining({ style: 'tiger', distance: 90 });
      const player = sim.fighters[0];
      pad.commands.push('s2h');
      const names = new Set<string>();
      for (let f = 0; f < 70; f++) {
        if (f === 12) pad.press(button);
        pad.step();
        sim.update();
        if (player.move) names.add(player.move.name);
      }
      return names;
    };
    expect(exits('lp')).toContain('Griffe');
    expect(exits('hp')).toContain('Bond du tigre');
    expect(exits('lk')).toContain('Fauchage');
    expect(exits('hk')).toContain('Ruade');
  });

  it('berserker : la rage augmente les dégâts pendant quelques secondes', () => {
    const hitOnce = (enraged: boolean) => {
      const { sim, pad } = createTraining({ style: 'berserker', distance: 300 });
      const [player, dummy] = sim.fighters;
      if (enraged) {
        pad.commands.push('s2l');
        for (let f = 0; f < 40; f++) stepBoth(pad, sim);
        expect(player.buffed).toBe(true);
      }
      player.x = dummy.x - 90;
      pad.press('hp');
      let dealt = 0;
      for (let f = 0; f < 30; f++) {
        pad.step();
        const before = dummy.hp;
        sim.update();
        if (dummy.hp < before) dealt += before - dummy.hp;
      }
      return dealt;
    };
    expect(hitOnce(true)).toBeGreaterThan(hitOnce(false));
  });

  it("artificier : la mine reste au sol et explose quand l'adversaire y marche", () => {
    const { sim, pad } = createTraining({ style: 'trapper', distance: 330, humanOpponent: true });
    const [, dummy] = sim.fighters;
    pad.commands.push('s1h');
    for (let f = 0; f < 60; f++) stepBoth(pad, sim, dummy.ctrl);
    expect(sim.projectiles.length).toBe(1);
    expect(dummy.hp).toBe(dummy.maxHp);
    // l'adversaire avance vers le joueur et passe sur la mine
    dummy.ctrl.x = -1;
    let exploded = false;
    for (let f = 0; f < 60; f++) {
      pad.step();
      dummy.ctrl.step();
      const before = dummy.hp;
      sim.update();
      if (dummy.hp < before) exploded = true;
    }
    expect(exploded).toBe(true);
  });

  it('miroir : la garde renvoie un projectile à son lanceur', () => {
    const { sim, pad } = createTraining({
      style: 'mirror',
      opponent: 'ardan',
      distance: 300,
      humanOpponent: true,
    });
    const [player, caster] = sim.fighters;
    caster.ctrl.commands.push('s1l'); // boule de feu
    let reflected = false;
    let casterHit = false;
    for (let f = 0; f < 80; f++) {
      if (f === 14) pad.commands.push('s1h');
      pad.step();
      caster.ctrl.step();
      const before = caster.hp;
      sim.update();
      if (sim.projectiles.some((p) => p.owner === player)) reflected = true;
      // (en entraînement, la vie de l'adversaire remonte aussitôt : on regarde la perte sur la frame)
      if (caster.hp < before) casterHit = true;
    }
    expect(reflected).toBe(true);
    expect(player.hp).toBe(player.maxHp);
    expect(casterHit).toBe(true);
  });

  it('moine : la méditation rend de la vie', () => {
    const { sim, pad } = createTraining({ style: 'monk', distance: 300 });
    const player = sim.fighters[0];
    player.hp = 500;
    pad.commands.push('s2h');
    for (let f = 0; f < 80; f++) stepBoth(pad, sim);
    expect(player.hp).toBeGreaterThan(500);
  });
});
