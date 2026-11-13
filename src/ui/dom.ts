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

const canvasBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('image vide'))), 'image/png'),
  );

/** Copie une image dans le presse-papiers. Renvoie false si le navigateur ne le permet pas. */
export async function copyImage(canvas: HTMLCanvasElement): Promise<boolean> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) return false;
  try {
    // la promesse est passée telle quelle : Safari exige que l'appel parte pendant l'appui du joueur
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': canvasBlob(canvas) })]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sur téléphone : ouvre le partage du système (envoyer directement à une appli d'IA, enregistrer dans les
 * photos…). Ailleurs : télécharge le fichier.
 */
export async function shareOrDownloadImage(canvas: HTMLCanvasElement, fileName: string): Promise<void> {
  const blob = await canvasBlob(canvas);
  const file = new File([blob], fileName, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') return; // le joueur a fermé le partage
    }
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 5000);
}
