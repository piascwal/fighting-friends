/* Manette abstraite : le moteur ne sait pas si les entrées viennent d'un clavier, d'un écran tactile ou de la console. */
import type { Button, MoveId } from '../data/types';

/** Ordre direct donné par la console (elle ne fait pas de manipulations au joystick). */
export type AiCommand = MoveId | 'dashF' | 'dashB';

export class Controller {
  /** Direction horizontale absolue : -1 gauche, 0, 1 droite. */
  x = 0;
  /** Direction verticale : -1 haut (saut), 0, 1 bas (accroupi). */
  y = 0;
  held: Partial<Record<Button, boolean>> = {};
  /** Boutons enfoncés pendant cette frame logique. */
  pressed: Button[] = [];
  commands: AiCommand[] = [];
  private queue: Button[] = [];

  /** Enregistre un appui ; il sera visible par le moteur à la prochaine frame logique. */
  press(button: Button): void {
    this.queue.push(button);
  }

  /** À appeler une fois par frame logique, avant la simulation. */
  step(): void {
    this.pressed = this.queue;
    this.queue = [];
  }

  clear(): void {
    this.x = 0;
    this.y = 0;
    this.held = {};
    this.pressed = [];
    this.queue = [];
    this.commands = [];
  }
}
