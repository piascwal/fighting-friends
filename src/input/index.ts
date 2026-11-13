/* Rassemble clavier, tactile et manettes dans les deux manettes abstraites lues par le moteur. */
import { BUTTONS } from '../data/types';
import { Controller } from '../engine/controller';
import { readGamepad } from './gamepad';
import { initKeyboard, readKeyboard, type PadState } from './keyboard';
import { TouchPad } from './touch';

const players: readonly [Controller, Controller] = [new Controller(), new Controller()];
const touch = new TouchPad((button) => players[0].press(button));

export const input = {
  players,
  touch,
  /** Deux humains sur le même clavier (change la répartition des touches). */
  twoPlayers: false,
  onPause: (): void => {},
  /** Touche pressée, pour la navigation dans les menus. */
  onKey: (_event: KeyboardEvent): void => {},

  init(): void {
    initKeyboard(
      {
        onPress: (player, button) => players[player]!.press(button),
        onPause: () => input.onPause(),
        onKey: (event) => input.onKey(event),
      },
      () => input.twoPlayers,
    );
    touch.init();
  },

  /**
   * À appeler à chaque frame logique.
   * @param humans quels joueurs sont pilotés par un humain (les autres le sont par la console)
   */
  update(humans: readonly [boolean, boolean]): void {
    players.forEach((ctrl, i) => {
      if (humans[i]) {
        const sources: (PadState | null)[] = [
          readKeyboard(i, input.twoPlayers),
          i === 0 ? touch.state : null,
          readGamepad(
            i,
            (b) => ctrl.press(b),
            () => input.onPause(),
          ),
        ];
        ctrl.x = 0;
        ctrl.y = 0;
        ctrl.held = {};
        for (const source of sources) {
          if (!source) continue;
          // la dernière source qui indique une direction l'emporte
          if (source.x || source.y) {
            ctrl.x = source.x;
            ctrl.y = source.y;
          }
          for (const b of BUTTONS) if (source.held[b]) ctrl.held[b] = true;
        }
      }
      ctrl.step();
    });
  },

  clear(): void {
    for (const ctrl of players) ctrl.clear();
  },
};
