/* Tête du pantin : visage, coiffures, bandeau. Dessinée dans le repère de la tête (centre = 0,0, avant = +x). */
import type { Look } from '../data/types';

const DEG = Math.PI / 180;

export interface HeadStyle {
  /** Rayon de la tête. */
  r: number;
  /** Échelle des traits. */
  s: number;
  outline: string;
  /** Temps, pour faire onduler cheveux et bandeau. */
  time: number;
}

/** Les deux pans du bandeau qui flottent derrière la tête (dessinés avant la tête). */
export function drawBandTails(ctx: CanvasRenderingContext2D, look: Look, h: HeadStyle): void {
  if (!look.band) return;
  const { r, s } = h;
  const wave = Math.sin(h.time * 0.15) * 5 * s;
  ctx.beginPath();
  ctx.moveTo(-r * 0.9, -r * 0.3);
  ctx.quadraticCurveTo(-r * 1.8, -r * 0.5 + wave, -r * 2.5, r * 0.1 - wave);
  ctx.moveTo(-r * 0.9, -r * 0.2);
  ctx.quadraticCurveTo(-r * 1.6, r * 0.3 - wave, -r * 2.2, r * 0.8 + wave);
  ctx.lineWidth = 5 * s;
  ctx.strokeStyle = h.outline;
  ctx.stroke();
  ctx.lineWidth = 3 * s;
  ctx.strokeStyle = look.band;
  ctx.stroke();
}

/** Calotte de cheveux couvrant le haut et l'arrière du crâne. */
function cap(ctx: CanvasRenderingContext2D, r: number, s: number, from: number, to: number): void {
  ctx.beginPath();
  ctx.arc(0, 0, r + 1.5 * s, from * DEG, to * DEG, true);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawHair(ctx: CanvasRenderingContext2D, look: Look, h: HeadStyle): void {
  const { r, s } = h;
  const sway = Math.sin(h.time * 0.13) * 5 * s;
  const closeFillStroke = () => {
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  switch (look.hair) {
    case 'spiky': {
      const spikes: [angle: number, length: number][] = [
        [150, 1.5],
        [185, 1.7],
        [215, 1.75],
        [245, 1.8],
        [275, 1.75],
        [305, 1.6],
      ];
      ctx.beginPath();
      ctx.moveTo(Math.cos(165 * DEG) * r, Math.sin(165 * DEG) * r);
      for (const [angle, length] of spikes) {
        ctx.lineTo(Math.cos(angle * DEG) * r * length, Math.sin(angle * DEG) * r * length);
        ctx.lineTo(Math.cos((angle + 16) * DEG) * r * 1.08, Math.sin((angle + 16) * DEG) * r * 1.08);
      }
      ctx.lineTo(Math.cos(-38 * DEG) * r * 1.05, Math.sin(-38 * DEG) * r * 1.05);
      ctx.arc(0, 0, r * 0.72, -38 * DEG, 165 * DEG, true);
      closeFillStroke();
      break;
    }
    case 'ponytail':
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, -r * 0.5);
      ctx.quadraticCurveTo(-r * 2.6, -r + sway, -r * 2.3, r * 1.3 - sway);
      ctx.quadraticCurveTo(-r * 1.6, r * 0.2, -r * 0.8, 0);
      closeFillStroke();
      cap(ctx, r, s, -35, 150);
      // mèche sur le front
      ctx.beginPath();
      ctx.moveTo(r * 0.78, -r * 0.62);
      ctx.quadraticCurveTo(r * 1.05, 0, r * 0.7, r * 0.5);
      ctx.quadraticCurveTo(r * 0.6, -r * 0.1, r * 0.3, -r * 0.8);
      closeFillStroke();
      break;
    case 'long':
      ctx.beginPath();
      ctx.moveTo(r * 0.5, -r * 0.9);
      ctx.quadraticCurveTo(-r * 1.9, -r * 1.5, -r * 1.5, r * 1.9);
      ctx.quadraticCurveTo(-r * 0.7, r * 1.2, -r * 0.3, r * 0.2);
      closeFillStroke();
      cap(ctx, r, s, -35, 170);
      break;
    case 'mohawk':
      ctx.beginPath();
      ctx.moveTo(r * 0.6, -r * 0.8);
      ctx.quadraticCurveTo(0, -r * 2.1, -r * 1.1, -r * 0.5);
      ctx.quadraticCurveTo(-r * 0.3, -r, r * 0.6, -r * 0.8);
      closeFillStroke();
      break;
    case 'hood':
      // cagoule : seule une bande de peau reste visible pour les yeux
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r - 1, 0, 7);
      ctx.clip();
      ctx.fillStyle = look.skin;
      ctx.fillRect(-r * 0.1, -r * 0.42, r * 1.2, r * 0.5);
      ctx.restore();
      break;
    case 'short':
      cap(ctx, r, s, -45, 175);
      break;
    case 'bald':
      break;
  }
}

/** Cheveux, barbe, bandeau et visage par-dessus le disque de la tête. */
export function drawHeadDetails(ctx: CanvasRenderingContext2D, look: Look, h: HeadStyle): void {
  const { r, s, outline } = h;
  ctx.fillStyle = look.hairCol;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 2.5 * s;
  drawHair(ctx, look, h);

  if (look.beard) {
    ctx.beginPath();
    ctx.arc(0, 0, r + s, 15 * DEG, 110 * DEG);
    ctx.quadraticCurveTo(r * 0.3, r * 0.5, r * 0.95, r * 0.25);
    ctx.closePath();
    ctx.fillStyle = look.beard;
    ctx.fill();
    ctx.stroke();
  }
  if (look.band) {
    ctx.beginPath();
    ctx.arc(0, 0, r + 0.5 * s, -28 * DEG, -168 * DEG, true);
    ctx.lineWidth = 6 * s;
    ctx.strokeStyle = look.band;
    ctx.lineCap = 'butt';
    ctx.stroke();
    ctx.lineCap = 'round';
  }

  // œil, sourcil froncé, bouche
  ctx.fillStyle = outline;
  ctx.beginPath();
  ctx.ellipse(r * 0.5, -r * 0.12, r * 0.1, r * 0.17, 0, 0, 7);
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.beginPath();
  ctx.moveTo(r * 0.25, -r * 0.48);
  ctx.lineTo(r * 0.78, -r * 0.3);
  ctx.lineWidth = 3 * s;
  ctx.stroke();
  if (look.hair !== 'hood') {
    ctx.beginPath();
    ctx.moveTo(r * 0.5, r * 0.45);
    ctx.lineTo(r * 0.82, r * 0.4);
    ctx.lineWidth = 2.2 * s;
    ctx.stroke();
  }
}
