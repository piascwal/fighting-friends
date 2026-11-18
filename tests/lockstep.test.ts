/* Combat en réseau : les deux appareils simulent exactement le même combat, même avec des pertes. */
import { describe, expect, it } from 'vitest';
import { characterById } from '../src/data/roster';
import { Controller } from '../src/engine/controller';
import { FightSim } from '../src/engine/fight';
import { Lockstep, readPad, writePad, type PadFrame } from '../src/net/lockstep';

/** Un appareil : sa simulation, ses deux manettes et son lockstep. `side` = le combattant qu'il pilote. */
function device(side: 0 | 1) {
  const ctrls = [new Controller(), new Controller()] as const;
  const sim = new FightSim({
    chars: [characterById('ardan')!, characterById('bruno')!],
    ctrls,
    ais: [null, null],
    bodyScales: [1, 1],
    rounds: 2,
    mode: 'match',
  });
  return { side, ctrls, sim, lock: new Lockstep(), seen: new Map<number, string>() };
}

/** Entrées pseudo-aléatoires mais reproductibles d'un joueur à l'image `t`. */
function script(player: number, t: number): PadFrame {
  const n = Math.sin(t * 12.9898 + player * 78.233) * 43758.5453;
  const r = n - Math.floor(n);
  return {
    x: player ? -1 : 1,
    y: r > 0.9 ? 1 : 0,
    held: 0,
    pressed: r < 0.25 ? 1 << Math.floor(r * 16) : 0,
  };
}

/** Fait tourner deux appareils reliés par un canal qui perd une partie des paquets. */
function play(lossRate: number, ticks: number) {
  const devices = [device(0), device(1)];
  let seed = 7;
  const lost = () => (seed = (seed * 16807) % 2147483647) / 2147483647 < lossRate;
  for (let t = 0; t < ticks; t++) {
    for (const d of devices) d.lock.pushLocal(script(d.side, t));
    const packets = devices.map((d) => d.lock.packet());
    if (!lost()) devices[1]!.lock.receive(packets[0]!);
    if (!lost()) devices[0]!.lock.receive(packets[1]!);
    for (const d of devices) {
      if (!d.lock.ready) continue;
      const [mine, theirs] = d.lock.take();
      writePad(mine, d.ctrls[d.side]);
      writePad(theirs, d.ctrls[1 - d.side]!);
      d.sim.update();
      if (d.lock.frame % 100 === 0) d.seen.set(d.lock.frame, JSON.stringify(snapshot(d.sim)));
    }
  }
  return devices;
}

const snapshot = (sim: FightSim) =>
  sim.fighters.map((f) => [f.hp, Math.round(f.x * 100), Math.round(f.y * 100), f.state, f.wins]);

describe('combat en réseau (lockstep)', () => {
  it('une entrée de manette survit à l’aller-retour', () => {
    const ctrl = new Controller();
    ctrl.x = -1;
    ctrl.held = { hp: true };
    ctrl.pressed = ['lk', 'hp'];
    const copy = new Controller();
    writePad(readPad(ctrl), copy);
    expect([copy.x, copy.held, copy.pressed.sort()]).toEqual([-1, { hp: true }, ['hp', 'lk']]);
  });

  it('sans perte : les deux appareils ont exactement le même combat', () => {
    const [a, b] = play(0, 1500);
    expect(a!.sim.tick).toBeGreaterThan(1400);
    expect(snapshot(a!.sim)).toEqual(snapshot(b!.sim));
    expect(a!.sim.fighters[1].hp).toBeLessThan(a!.sim.fighters[1].maxHp);
  });

  it('avec 30 % de paquets perdus : toujours le même combat, à peine ralenti', () => {
    const [a, b] = play(0.3, 1500);
    expect(a!.lock.frame).toBeGreaterThan(1300);
    // à chaque centaine d'images simulées, les deux combats sont identiques
    for (const [frame, state] of a!.seen)
      if (b!.seen.has(frame)) expect(b!.seen.get(frame), String(frame)).toBe(state);
    expect(a!.seen.size).toBeGreaterThan(10);
  });

  it('un paquet invalide est ignoré', () => {
    const lock = new Lockstep();
    lock.receive(new ArrayBuffer(3));
    const bad = new DataView(new ArrayBuffer(9 + 4));
    bad.setUint8(8, 200); // annonce plus d'entrées qu'il n'en contient
    lock.receive(bad.buffer);
    lock.pushLocal({ x: 0, y: 0, held: 0, pressed: 0 });
    for (let i = 0; i < 3; i++) lock.take();
    expect(lock.ready).toBe(false);
  });
});
