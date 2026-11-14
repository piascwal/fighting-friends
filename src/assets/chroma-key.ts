/* Détourage : retire le fond magenta (#FF00FF) d'une image générée et la recadre sur le sujet. */

/** Plus grand côté conservé : au-delà, l'image est réduite (suffisant à l'écran, léger à stocker). */
const MAX_SIDE = 640;
/** « Magenta-ité » au-dessus de laquelle un pixel est entièrement supprimé. */
const KEY_FULL = 0.55;
/** En dessous, le pixel est conservé tel quel ; entre les deux, il devient semi-transparent (bords). */
const KEY_SOFT = 0.3;

export function removeMagentaBackground(image: HTMLImageElement | HTMLCanvasElement): HTMLCanvasElement {
  const srcW = 'naturalWidth' in image ? image.naturalWidth : image.width;
  const srcH = 'naturalHeight' in image ? image.naturalHeight : image.height;
  const k = Math.min(1, MAX_SIDE / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * k));
  const h = Math.max(1, Math.round(srcH * k));

  const work = document.createElement('canvas');
  work.width = w;
  work.height = h;
  const ctx = work.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0, w, h);
  const pixels = ctx.getImageData(0, 0, w, h);
  const d = pixels.data;
  // déjà détourée (export du jeu, image du dépôt) : on ne touche pas aux couleurs, on recadre seulement
  const keyed = isTransparentCorner(d, w, h);

  // boîte englobante de ce qui reste visible
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const r = d[i]!;
    const g = d[i + 1]!;
    const b = d[i + 2]!;
    const max = Math.max(r, b);
    // magenta = rouge et bleu forts et proches l'un de l'autre, vert faible
    if (!keyed && max > 60 && Math.abs(r - b) / max < 0.3) {
      const magenta = (Math.min(r, b) - g) / max;
      if (magenta > KEY_FULL) {
        d[i + 3] = 0;
      } else if (magenta > KEY_SOFT) {
        const keep = 1 - (magenta - KEY_SOFT) / (KEY_FULL - KEY_SOFT);
        d[i + 3] = Math.round(d[i + 3]! * keep);
        // on retire aussi la teinte rose du bord
        d[i] = Math.round(g + (r - g) * keep * 0.5);
        d[i + 2] = Math.round(g + (b - g) * keep * 0.5);
      }
    }
    if (d[i + 3]! > 24) {
      const px = p % w;
      const py = Math.floor(p / w);
      if (px < x0) x0 = px;
      if (px > x1) x1 = px;
      if (py < y0) y0 = py;
      if (py > y1) y1 = py;
    }
  }
  if (x1 < 0) {
    x0 = 0;
    y0 = 0;
    x1 = w - 1;
    y1 = h - 1;
  }
  ctx.putImageData(pixels, 0, 0);

  const out = document.createElement('canvas');
  out.width = x1 - x0 + 1;
  out.height = y1 - y0 + 1;
  out.getContext('2d')!.drawImage(work, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

/** Un coin transparent signale une image déjà détourée. */
function isTransparentCorner(d: Uint8ClampedArray, w: number, h: number): boolean {
  const corners = [0, w - 1, (h - 1) * w, h * w - 1];
  return corners.some((p) => d[p * 4 + 3]! < 16);
}

/** Plus grande largeur conservée pour un décor (affiché au plus sur la largeur d'un grand écran). */
const STAGE_MAX_WIDTH = 2560;

/** Prépare une image de décor : pas de détourage, seulement réduite si elle est très grande. */
export function prepareStage(image: HTMLImageElement): HTMLCanvasElement {
  const k = Math.min(1, STAGE_MAX_WIDTH / image.naturalWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.naturalWidth * k);
  canvas.height = Math.round(image.naturalHeight * k);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image illisible : ${src}`));
    img.src = src;
  });
}
