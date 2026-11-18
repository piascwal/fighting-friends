/* Combat en réseau, en « lockstep » : les deux appareils font tourner la même simulation (le moteur est
   déterministe) et n'échangent que les entrées des manettes, image par image. Une image n'est simulée
   que lorsque les entrées des deux joueurs sont connues. Les entrées locales sont jouées avec un léger
   retard (DELAY images) : le temps qu'elles arrivent chez l'autre, sans jamais bloquer sur un bon Wi-Fi.

   Les paquets passent par un canal sans retransmission : chacun renvoie toutes les entrées que l'autre
   n'a pas encore confirmées (son accusé de réception est dans chaque paquet), donc une perte ne fait
   que retarder d'une image. */
import { BUTTONS, type Button } from '../data/types';

/** Entrées d'un joueur pour une image. `held` et `pressed` : un bit par bouton (lp, hp, lk, hk). */
export interface PadFrame {
  x: number;
  y: number;
  held: number;
  pressed: number;
}

/** Ce qui se lit et s'écrit sur une manette (Controller du moteur). */
export interface PadLike {
  x: number;
  y: number;
  held: Partial<Record<Button, boolean>>;
  pressed: Button[];
}

export const EMPTY_PAD: PadFrame = { x: 0, y: 0, held: 0, pressed: 0 };
/** Retard des entrées locales, en images (50 ms) : invisible au toucher, suffisant sur le Wi-Fi. */
export const DELAY = 3;
/** Entrées renvoyées au plus par paquet (une demi-seconde). */
const MAX_PER_PACKET = 30;
const HEADER = 9;
const FRAME_BYTES = 4;

const bits = (list: readonly Button[] | Partial<Record<Button, boolean>>): number =>
  BUTTONS.reduce(
    (n, b, i) =>
      (Array.isArray(list) ? list.includes(b) : (list as Record<string, boolean>)[b]) ? n | (1 << i) : n,
    0,
  );

export function readPad(ctrl: PadLike): PadFrame {
  return { x: Math.sign(ctrl.x), y: Math.sign(ctrl.y), held: bits(ctrl.held), pressed: bits(ctrl.pressed) };
}

export function writePad(frame: PadFrame, ctrl: PadLike): void {
  ctrl.x = frame.x;
  ctrl.y = frame.y;
  ctrl.held = {};
  BUTTONS.forEach((b, i) => {
    if (frame.held & (1 << i)) ctrl.held[b] = true;
  });
  ctrl.pressed = BUTTONS.filter((_, i) => frame.pressed & (1 << i));
}

export class Lockstep {
  /** Prochaine image à simuler. */
  frame = 0;
  private readonly local = new Map<number, PadFrame>();
  private readonly remote = new Map<number, PadFrame>();
  /** Prochaine image à laquelle une entrée locale sera attribuée. */
  private nextLocal: number;
  /** Dernière image reçue de l'autre sans trou (notre accusé de réception). */
  private remoteContiguous: number;
  /** Dernière de nos images que l'autre a confirmée. */
  private acked = -1;
  /** Appuis qui n'ont pas trouvé de place (simulation en attente) : reportés sur l'entrée suivante. */
  private pendingPressed = 0;

  constructor(private readonly delay = DELAY) {
    for (let f = 0; f < delay; f++) {
      this.local.set(f, EMPTY_PAD);
      this.remote.set(f, EMPTY_PAD);
    }
    this.nextLocal = delay;
    this.remoteContiguous = delay - 1;
  }

  /** Enregistre l'entrée locale de cette image ; sans place (attente de l'autre), ses appuis sont gardés. */
  pushLocal(pad: PadFrame): void {
    if (this.nextLocal > this.frame + this.delay) {
      this.pendingPressed |= pad.pressed;
      return;
    }
    this.local.set(this.nextLocal++, { ...pad, pressed: pad.pressed | this.pendingPressed });
    this.pendingPressed = 0;
  }

  /** Les entrées des deux joueurs sont-elles connues pour la prochaine image ? */
  get ready(): boolean {
    return this.local.has(this.frame) && this.remote.has(this.frame);
  }

  /** Prend les entrées de la prochaine image ([locale, distante]) et passe à la suivante. */
  take(): [PadFrame, PadFrame] {
    const f = this.frame++;
    const pads: [PadFrame, PadFrame] = [this.local.get(f)!, this.remote.get(f)!];
    // les entrées déjà simulées et confirmées ne servent plus
    for (const [map, limit] of [
      [this.local, Math.min(f, this.acked)],
      [this.remote, f],
    ] as const) {
      for (const key of map.keys()) if (key < limit - 2) map.delete(key);
    }
    return pads;
  }

  /** Paquet à envoyer : notre accusé de réception, puis nos entrées non confirmées. */
  packet(): ArrayBuffer {
    const start = Math.max(this.acked + 1, this.nextLocal - MAX_PER_PACKET);
    const count = Math.max(0, this.nextLocal - start);
    const view = new DataView(new ArrayBuffer(HEADER + count * FRAME_BYTES));
    view.setInt32(0, this.remoteContiguous);
    view.setUint32(4, start);
    view.setUint8(8, count);
    for (let i = 0; i < count; i++) {
      const pad = this.local.get(start + i) ?? EMPTY_PAD;
      const at = HEADER + i * FRAME_BYTES;
      view.setInt8(at, pad.x);
      view.setInt8(at + 1, pad.y);
      view.setUint8(at + 2, pad.held);
      view.setUint8(at + 3, pad.pressed);
    }
    return view.buffer;
  }

  /** Reçoit un paquet de l'autre. Tout ce qui vient du réseau est vérifié ; un paquet invalide est ignoré. */
  receive(data: ArrayBuffer): void {
    if (data.byteLength < HEADER) return;
    const view = new DataView(data);
    const ack = view.getInt32(0);
    const start = view.getUint32(4);
    const count = view.getUint8(8);
    if (count > MAX_PER_PACKET || data.byteLength !== HEADER + count * FRAME_BYTES) return;
    if (ack >= -1 && ack < this.nextLocal) this.acked = Math.max(this.acked, ack);
    for (let i = 0; i < count; i++) {
      const f = start + i;
      if (f < this.frame || this.remote.has(f)) continue;
      const at = HEADER + i * FRAME_BYTES;
      const pad: PadFrame = {
        x: Math.sign(view.getInt8(at)),
        y: Math.sign(view.getInt8(at + 1)),
        held: view.getUint8(at + 2) & 15,
        pressed: view.getUint8(at + 3) & 15,
      };
      this.remote.set(f, pad);
    }
    while (this.remote.has(this.remoteContiguous + 1)) this.remoteContiguous++;
  }
}
