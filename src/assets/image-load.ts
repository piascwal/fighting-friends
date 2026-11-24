/* Chargement des images de la banque : décodage, et mise à la taille d'affichage des décors. */

/** Plus grande largeur conservée pour un décor (affiché au plus sur la largeur d'un grand écran). */
const STAGE_MAX_WIDTH = 2560;

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image illisible : ${src}`));
    img.src = src;
  });
}

/** Décor : réduit s'il dépasse STAGE_MAX_WIDTH, lissé (c'est une grande image opaque). */
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

/** Copie une image (chargée ou bitmap) dans un canvas, pour pouvoir la redessiner. */
export function toCanvas(image: CanvasImageSource & { width: number; height: number }): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.getContext('2d')!.drawImage(image, 0, 0);
  return canvas;
}
