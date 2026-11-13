/* Manettes (API Gamepad) : croix ou stick, X/Y = poings, A/B = pieds, Start = pause. */
import { BUTTONS, type Button } from '../data/types';
import type { PadState } from './keyboard';

const BUTTON_INDEX: Record<Button, number> = { lp: 2, hp: 3, lk: 0, hk: 1 };
const START = 9;
const DPAD = { up: 12, down: 13, left: 14, right: 15 };
const STICK_THRESHOLD = 0.45;

const previous: [Record<string, boolean>, Record<string, boolean>] = [{}, {}];

export function readGamepad(
  index: number,
  onPress: (button: Button) => void,
  onPause: () => void,
): PadState | null {
  const pad = navigator.getGamepads?.()[index];
  if (!pad) return null;
  const pressed = (n: number) => !!pad.buttons[n]?.pressed;
  const [ax = 0, ay = 0] = pad.axes;
  const state: PadState = { x: 0, y: 0, held: {} };
  if (ax < -STICK_THRESHOLD || pressed(DPAD.left)) state.x = -1;
  else if (ax > STICK_THRESHOLD || pressed(DPAD.right)) state.x = 1;
  if (ay < -STICK_THRESHOLD || pressed(DPAD.up)) state.y = -1;
  else if (ay > STICK_THRESHOLD || pressed(DPAD.down)) state.y = 1;

  const before = previous[index as 0 | 1];
  for (const button of BUTTONS) {
    const now = pressed(BUTTON_INDEX[button]);
    state.held[button] = now;
    if (now && !before[button]) onPress(button);
    before[button] = now;
  }
  const start = pressed(START);
  if (start && !before.start) onPause();
  before.start = start;
  return state;
}
