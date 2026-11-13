/** Un écran animé dessiné dans le canvas. La boucle principale appelle update() 60 fois par seconde. */
export interface Scene {
  update(): void;
  render(ctx: CanvasRenderingContext2D): void;
  /** Le joueur a touché l'écran ou pressé une touche : passer l'animation. */
  skip?(): void;
}

/** Faisceau de rayons tournant derrière un personnage (écrans de victoire). */
export function drawRays(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  color: string,
  time: number,
  count: number,
): void {
  const half = 1200 * Math.tan(Math.PI / count / 2);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(time * 0.004);
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    ctx.rotate((Math.PI * 2) / count);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(1200, -half);
    ctx.lineTo(1200, half);
    ctx.fill();
  }
  ctx.restore();
}

/** Écrit un texte centré sur plusieurs lignes si nécessaire. */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  lines.push(line);
  const top = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, top + i * lineHeight));
}
