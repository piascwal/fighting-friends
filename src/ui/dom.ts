/* Petits outils DOM partagés par les menus. */
import { playSfx } from '../audio/audio';

export function $<T extends HTMLElement = HTMLElement>(selector: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Élément introuvable : ${selector}`);
  return el;
}

export const $$ = <T extends HTMLElement = HTMLElement>(selector: string, root: ParentNode = document): T[] =>
  Array.from(root.querySelectorAll<T>(selector));

export function on<K extends keyof HTMLElementEventMap>(
  selector: string,
  handler: (event: HTMLElementEventMap[K]) => void,
  type: K = 'click' as K,
): void {
  $(selector).addEventListener(type, handler as EventListener);
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

/** Message bref en bas de l'écran. */
export function toast(message: string): void {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 2200);
}

/** Copie un texte dans le presse-papiers, avec une solution de secours pour les vieux navigateurs. */
export async function copyText(text: string, confirmation: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
  toast(confirmation);
  playSfx('ok');
}

export function newCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  return [canvas, canvas.getContext('2d')!];
}
