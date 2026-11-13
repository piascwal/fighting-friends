/* Commandes tactiles : joystick flottant à gauche, 4 boutons à droite.
   Un doigt = un seul bouton (le plus proche) : le jeu ne demande jamais deux boutons à la fois. */
import { clamp } from '../core/math';
import { BUTTONS, type Button } from '../data/types';
import type { PadState } from './keyboard';

interface Geometry {
  /** Rayon d'un bouton et du joystick. */
  button: number;
  stick: number;
  centers: Record<Button, [number, number]>;
  /** Position de repos du joystick. */
  home: [number, number];
}

/** Part gauche de l'écran réservée au joystick. */
const STICK_ZONE = 0.46;
/** En dessous de cette fraction du rayon, le joystick est considéré au neutre. */
const DEAD_ZONE = 0.3;
/** Un bouton réagit jusqu'à cette distance de son centre (en rayons) : pas besoin de viser juste. */
const BUTTON_REACH = 2.2;
/** Direction (x, y) pour chacun des 8 secteurs du joystick, en partant de la droite. */
const OCTANTS: readonly [number, number][] = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

export class TouchPad {
  readonly state: PadState = { x: 0, y: 0, held: {} };
  /** Un doigt a déjà touché l'écran : on affiche les commandes tactiles. */
  seen = false;
  private layer!: HTMLElement;
  private stick!: HTMLElement;
  private knob!: HTMLElement;
  private buttons = {} as Record<Button, HTMLElement>;
  private geo: Geometry | null = null;
  private stickTouch: number | null = null;
  private base: [number, number] = [0, 0];
  /** Bouton tenu par chaque doigt posé à droite. */
  private fingers = new Map<number, Button | null>();

  constructor(private readonly onPress: (button: Button) => void) {}

  init(): void {
    this.layer = document.getElementById('touch')!;
    this.stick = document.getElementById('stick')!;
    this.knob = document.getElementById('knob')!;
    for (const b of BUTTONS) this.buttons[b] = this.layer.querySelector<HTMLElement>(`[data-b="${b}"]`)!;
    for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel'] as const) {
      this.layer.addEventListener(type, (e) => this.onTouch(e), { passive: false });
    }
    const markSeen = () => {
      if (this.seen) return;
      this.seen = true;
      document.body.classList.add('touch');
      this.layout();
    };
    window.addEventListener('touchstart', markSeen, { passive: true });
    if (matchMedia('(pointer: coarse)').matches) markSeen();
    this.layout();
  }

  /** Recalcule tailles et positions (rotation de l'écran, redimensionnement). */
  layout(): void {
    if (!this.layer) return;
    const rect = this.layer.getBoundingClientRect();
    // le jeu se joue à l'horizontale : les tailles se calent sur la hauteur de l'écran
    const r = clamp(rect.height * 0.105, 26, 46);
    const gap = r * 2.28;
    const marginX = Math.max(18, rect.width * 0.035);
    const marginY = Math.max(14, rect.height * 0.07);
    // grille 2×2 façon borne d'arcade, rangée du haut légèrement décalée
    const x = rect.width - marginX - r;
    const y = rect.height - marginY - r;
    const centers: Geometry['centers'] = {
      lk: [x - gap - r * 0.35, y],
      hk: [x - r * 0.35, y],
      lp: [x - gap, y - gap],
      hp: [x, y - gap],
    };
    for (const b of BUTTONS) {
      const el = this.buttons[b];
      el.style.width = el.style.height = `${r * 2}px`;
      el.style.left = `${centers[b][0] - r}px`;
      el.style.top = `${centers[b][1] - r}px`;
      el.style.fontSize = `${r * 0.8}px`;
    }
    const stick = clamp(rect.height * 0.17, 44, 74);
    this.stick.style.width = this.stick.style.height = `${stick * 2}px`;
    this.knob.style.width = this.knob.style.height = `${stick}px`;
    this.geo = {
      button: r,
      stick,
      centers,
      home: [marginX + stick + 10, rect.height - marginY - stick * 1.1],
    };
    if (this.stickTouch === null) this.placeStick(...this.geo.home);
  }

  /** Relâche tout (changement d'écran, pause). */
  reset(): void {
    this.state.x = this.state.y = 0;
    this.stickTouch = null;
    this.fingers.clear();
    if (!this.geo) return;
    this.placeStick(...this.geo.home);
    this.refreshButtons();
  }

  private placeStick(x: number, y: number): void {
    this.base = [x, y];
    this.stick.style.left = `${x - this.geo!.stick}px`;
    this.stick.style.top = `${y - this.geo!.stick}px`;
    this.knob.style.transform = '';
  }

  private moveStick(px: number, py: number): void {
    const max = this.geo!.stick;
    let dx = px - this.base[0];
    let dy = py - this.base[1];
    const dist = Math.hypot(dx, dy);
    // si le pouce s'éloigne trop, la base le suit : inutile de regarder l'écran
    if (dist > max * 1.35) {
      const k = (dist - max * 1.35) / dist;
      this.base[0] += dx * k;
      this.base[1] += dy * k;
      this.stick.style.left = `${this.base[0] - max}px`;
      this.stick.style.top = `${this.base[1] - max}px`;
      dx = px - this.base[0];
      dy = py - this.base[1];
    }
    const d = Math.hypot(dx, dy);
    const k = d > max ? max / d : 1;
    this.knob.style.transform = `translate(${dx * k}px,${dy * k}px)`;
    if (d < max * DEAD_ZONE) {
      this.state.x = this.state.y = 0;
      return;
    }
    const octant = (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8;
    [this.state.x, this.state.y] = OCTANTS[octant]!;
  }

  private buttonAt(px: number, py: number): Button | null {
    const geo = this.geo!;
    let best: Button | null = null;
    let bestDist = geo.button * BUTTON_REACH;
    for (const b of BUTTONS) {
      const d = Math.hypot(px - geo.centers[b][0], py - geo.centers[b][1]);
      if (d < bestDist) {
        bestDist = d;
        best = b;
      }
    }
    return best;
  }

  private refreshButtons(): void {
    const held: PadState['held'] = {};
    for (const b of this.fingers.values()) if (b) held[b] = true;
    for (const b of BUTTONS) {
      if (held[b] && !this.state.held[b]) {
        this.onPress(b);
        navigator.vibrate?.(8);
      }
      this.buttons[b].classList.toggle('on', !!held[b]);
    }
    this.state.held = held;
  }

  private onTouch(event: TouchEvent): void {
    event.preventDefault();
    if (!this.geo) return;
    const rect = this.layer.getBoundingClientRect();
    for (const touch of Array.from(event.changedTouches)) {
      const px = touch.clientX - rect.left;
      const py = touch.clientY - rect.top;
      const id = touch.identifier;
      if (event.type === 'touchstart') {
        if (px >= rect.width * STICK_ZONE) this.fingers.set(id, this.buttonAt(px, py));
        else if (this.stickTouch === null) {
          this.stickTouch = id;
          this.placeStick(px, py);
          this.stick.classList.add('on');
        }
      } else if (event.type === 'touchmove') {
        if (id === this.stickTouch) this.moveStick(px, py);
        else if (this.fingers.has(id)) this.fingers.set(id, this.buttonAt(px, py));
      } else {
        if (id === this.stickTouch) {
          this.stickTouch = null;
          this.state.x = this.state.y = 0;
          this.stick.classList.remove('on');
          this.placeStick(...this.geo.home);
        }
        this.fingers.delete(id);
      }
    }
    this.refreshButtons();
  }
}
