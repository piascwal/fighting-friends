/* Compression des images enregistrées sur l'appareil ou exportées.
   WebP qualité 95 % : sur des sprites en pixel art, l'écart avec le PNG d'origine est invisible
   (mesuré sur les images de Lolo : 5 fois plus léger, PSNR > 44 dB), transparence comprise. */

/** Qualité WebP des sprites. En dessous de 0,95, des défauts deviennent visibles en zoomant. */
const SPRITE_QUALITY = 0.95;
/** Les décors sont de grandes images opaques : une qualité un peu plus basse suffit. */
const STAGE_QUALITY = 0.9;

export type ImageKind = 'sprite' | 'stage';

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('encodage impossible'))), type, quality),
  );
}

/**
 * Encode une image pour l'enregistrer. Safari ne sait pas encoder le WebP : il renvoie alors du PNG
 * (sprite, transparence nécessaire) ou du JPEG (décor, opaque).
 */
export async function encodeImage(canvas: HTMLCanvasElement, kind: ImageKind): Promise<Blob> {
  const webp = await toBlob(canvas, 'image/webp', kind === 'stage' ? STAGE_QUALITY : SPRITE_QUALITY);
  if (webp.type === 'image/webp') return webp;
  return kind === 'stage' ? toBlob(canvas, 'image/jpeg', STAGE_QUALITY) : toBlob(canvas, 'image/png');
}

/** Extension de fichier correspondant à une image encodée. */
export function extensionOf(blob: Blob): string {
  if (blob.type === 'image/webp') return 'webp';
  if (blob.type === 'image/jpeg') return 'jpg';
  return 'png';
}

/** Copie une image (chargée ou bitmap) dans un canvas, pour pouvoir la redessiner et la réencoder. */
export function toCanvas(image: CanvasImageSource & { width: number; height: number }): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.getContext('2d')!.drawImage(image, 0, 0);
  return canvas;
}
