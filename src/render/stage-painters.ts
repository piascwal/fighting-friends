/* Peinture des décors. Chaque décor est dessiné une seule fois dans deux calques :
   `back` (lointain, défile lentement) et `front` (sol et premier plan, défile avec la caméra). */
import { ARCADE_FONT, GROUND_Y, STAGE_W, VIEW_H } from '../core/constants';
import { pick, rand } from '../core/math';

type Ctx = CanvasRenderingContext2D;
export type Ambience = 'petal' | 'rain' | 'ember' | 'firefly';

export interface StageDef {
  name: string;
  /** Particules d'ambiance animées par-dessus le décor. */
  ambience: Ambience;
  paint(back: Ctx, front: Ctx): void;
}

/** Largeur du calque lointain : plus étroit que le décor puisqu'il défile moins vite. */
export const BACK_W = 1160;
const H = VIEW_H;
const G = GROUND_Y;
const FLOOR_TOP = G - 34;

function verticalGradient(ctx: Ctx, y0: number, y1: number, colors: readonly string[]): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  colors.forEach((c, i) => g.addColorStop(i / (colors.length - 1), c));
  return g;
}

/** Sol en perspective : dégradé, lignes horizontales resserrées vers le fond, lattes optionnelles. */
function paintFloor(ctx: Ctx, colors: readonly string[], lineColor: string, planks: boolean): void {
  ctx.fillStyle = verticalGradient(ctx, FLOOR_TOP, H, colors);
  ctx.fillRect(0, FLOOR_TOP, STAGE_W, H - FLOOR_TOP);
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 7; i++) {
    const y = FLOOR_TOP + Math.pow(i / 7, 1.7) * (H - FLOOR_TOP);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(STAGE_W, y);
    ctx.stroke();
  }
  if (planks) {
    for (let i = -10; i < 40; i++) {
      const offset = i * 70;
      ctx.beginPath();
      ctx.moveTo(STAGE_W / 2 + offset * 0.82, FLOOR_TOP);
      ctx.lineTo(STAGE_W / 2 + offset * 1.5, H);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  ctx.fillRect(0, FLOOR_TOP, STAGE_W, 3);
}

/** Ligne de collines en silhouette. */
function paintHills(ctx: Ctx, base: number, height: number, color: string, seed: number): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, H);
  for (let x = 0; x <= BACK_W; x += 20) {
    const bump = Math.sin(x * 0.004 + seed) * height + Math.sin(x * 0.011 + seed * 3) * height * 0.4;
    ctx.lineTo(x, base - Math.abs(bump));
  }
  ctx.lineTo(BACK_W, H);
  ctx.fill();
}

function paintStars(ctx: Ctx, count: number, maxY: number): void {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = `rgba(255,255,255,${rand(0.2, 0.9)})`;
    ctx.fillRect(rand(BACK_W), rand(maxY), 2, 2);
  }
}

function disc(ctx: Ctx, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 7);
  ctx.fill();
}

/** Fenêtres allumées au hasard sur un immeuble. */
function paintWindows(ctx: Ctx, x: number, y: number, w: number): void {
  for (let wy = y + 10; wy < G - 30; wy += 16) {
    for (let wx = x + 6; wx < x + w - 8; wx += 12) {
      if (Math.random() > 0.45) continue;
      ctx.fillStyle = pick(['#ffd23a', '#19c6c6', '#ff3d7f', '#fff']);
      ctx.globalAlpha = rand(0.3, 0.9);
      ctx.fillRect(wx, wy, 6, 8);
    }
  }
}

const dojo: StageDef = {
  name: 'Dojo du Crépuscule',
  ambience: 'petal',
  paint(back, front) {
    back.fillStyle = verticalGradient(back, 0, G, ['#2a1b5e', '#b0417a', '#ff8a4c', '#ffd27a']);
    back.fillRect(0, 0, BACK_W, H);
    disc(back, BACK_W * 0.5, 290, 150, 'rgba(255,241,184,.25)');
    disc(back, BACK_W * 0.5, 290, 110, '#fff1b8');
    paintHills(back, 330, 120, '#6a2f6a', 1);
    paintHills(back, 390, 70, '#43204f', 4);
    // pagode à quatre étages
    back.fillStyle = '#2a1436';
    const cx = BACK_W * 0.78;
    for (let floor = 0; floor < 4; floor++) {
      const y = 300 - floor * 46;
      const w = 150 - floor * 26;
      back.fillRect(cx - w * 0.3, y, w * 0.6, 46);
      back.beginPath();
      back.moveTo(cx - w, y + 8);
      back.quadraticCurveTo(cx, y - 22, cx + w, y + 8);
      back.lineTo(cx + w * 0.7, y - 6);
      back.lineTo(cx - w * 0.7, y - 6);
      back.fill();
    }
    // portique rouge et lanternes
    front.fillStyle = '#7d1f2b';
    for (const x of [240, 1260]) front.fillRect(x - 16, 120, 32, G - 120);
    front.fillStyle = '#5a1420';
    front.fillRect(180, 110, 1140, 30);
    front.fillStyle = '#7d1f2b';
    front.fillRect(150, 82, 1200, 26);
    for (const x of [420, 750, 1080]) {
      front.fillStyle = '#2a1436';
      front.fillRect(x - 1, 140, 3, 40);
      disc(front, x, 200, 44, 'rgba(255,207,90,.25)');
      front.fillStyle = '#ffcf5a';
      front.beginPath();
      front.ellipse(x, 200, 18, 24, 0, 0, 7);
      front.fill();
    }
    paintFloor(front, ['#a8683a', '#7a4526', '#4a2814'], '#3a1e10', true);
  },
};

const neonCity: StageDef = {
  name: 'Néon City',
  ambience: 'rain',
  paint(back, front) {
    back.fillStyle = verticalGradient(back, 0, G, ['#05061a', '#1a1050', '#5a1e8a']);
    back.fillRect(0, 0, BACK_W, H);
    paintStars(back, 90, 200);
    // deux rangées d'immeubles aux fenêtres allumées
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 26; i++) {
        const w = rand(50, 110);
        const h = rand(120, 300) - row * 40;
        const x = i * 48 + rand(-10, 10);
        const y = G - 20 - h;
        back.fillStyle = row ? '#150c33' : '#241457';
        back.fillRect(x, y, w, h + 40);
        paintWindows(back, x, y, w);
        back.globalAlpha = 1;
      }
    }
    // façade et enseignes lumineuses
    front.fillStyle = '#0d0828';
    front.fillRect(0, 150, STAGE_W, G - 150);
    front.fillStyle = '#160d3a';
    for (let i = 0; i < 12; i++) front.fillRect(i * 130 + 10, 170, 110, G - 170);
    const signs: [x: number, y: number, text: string, color: string, size: number][] = [
      [300, 250, 'ARCADE', '#ff3d7f', 64],
      [760, 230, 'FIGHT!', '#19c6c6', 76],
      [1210, 260, '24H', '#ffd23a', 70],
    ];
    for (const [x, y, text, color, size] of signs) {
      front.save();
      front.font = `900 ${size}px ${ARCADE_FONT}`;
      front.textAlign = 'center';
      front.shadowColor = color;
      front.shadowBlur = 24;
      front.fillStyle = color;
      front.fillText(text, x, y);
      front.shadowBlur = 8;
      front.fillStyle = '#fff';
      front.fillText(text, x, y);
      front.restore();
    }
    front.fillStyle = 'rgba(255,61,127,.5)';
    front.fillRect(0, 150, STAGE_W, 4);
    front.fillStyle = 'rgba(25,198,198,.5)';
    front.fillRect(0, G - 40, STAGE_W, 4);
    paintFloor(front, ['#2a1d5c', '#140c33', '#07041a'], '#5a3bd0', true);
    // reflets des enseignes sur le sol mouillé
    front.globalAlpha = 0.18;
    for (const [x, , , color] of signs) {
      front.fillStyle = color;
      front.fillRect(x - 110, G - 30, 220, H);
    }
    front.globalAlpha = 1;
  },
};

const volcano: StageDef = {
  name: 'Forge du Volcan',
  ambience: 'ember',
  paint(back, front) {
    back.fillStyle = verticalGradient(back, 0, G, ['#1a0508', '#5a0f12', '#c2341a', '#ff8a2a']);
    back.fillRect(0, 0, BACK_W, H);
    // cône du volcan et coulée de lave
    back.fillStyle = '#2a0a0c';
    back.beginPath();
    back.moveTo(BACK_W * 0.25, G);
    back.lineTo(BACK_W * 0.47, 130);
    back.lineTo(BACK_W * 0.55, 130);
    back.lineTo(BACK_W * 0.8, G);
    back.fill();
    back.fillStyle = '#ffb02e';
    back.beginPath();
    back.moveTo(BACK_W * 0.47, 130);
    back.lineTo(BACK_W * 0.55, 130);
    back.lineTo(BACK_W * 0.53, 240);
    back.lineTo(BACK_W * 0.5, 330);
    back.lineTo(BACK_W * 0.49, 200);
    back.fill();
    disc(back, BACK_W * 0.51, 120, 120, 'rgba(255,176,46,.25)');
    paintHills(back, 400, 60, '#1c0709', 2);
    // pitons rocheux
    front.fillStyle = '#140608';
    for (let i = 0; i < 9; i++) {
      const x = i * 190 + 40;
      const h = 90 + (i % 3) * 60;
      front.beginPath();
      front.moveTo(x - 50, G);
      front.lineTo(x - 10, G - h);
      front.lineTo(x + 24, G - h * 0.8);
      front.lineTo(x + 60, G);
      front.fill();
    }
    paintFloor(front, ['#4a2a22', '#2a1512', '#120808'], '#ff5a1f', false);
    // fissures incandescentes
    front.strokeStyle = '#ff8a2a';
    front.lineWidth = 3;
    front.shadowColor = '#ff5a1f';
    front.shadowBlur = 12;
    for (let i = 0; i < 14; i++) {
      let x = rand(STAGE_W);
      let y = G - 10 + rand(80);
      front.beginPath();
      front.moveTo(x, y);
      for (let j = 0; j < 4; j++) {
        x += rand(-50, 50);
        y += rand(6, 20);
        front.lineTo(x, y);
      }
      front.stroke();
    }
    front.shadowBlur = 0;
  },
};

/** Tiges de bambou légèrement penchées, avec leurs nœuds. */
function paintBamboo(ctx: Ctx, count: number, width: number, color: string, alpha: number): void {
  for (let i = 0; i < count; i++) {
    const x = rand(width);
    const thickness = rand(8, 18);
    const tilt = rand(-30, 30);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(x, G);
    ctx.lineTo(x + tilt, -10);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,.45)';
    for (let node = 0; node < 8; node++) {
      const k = node / 8;
      const y = G - k * (G + 10);
      ctx.beginPath();
      ctx.moveTo(x + tilt * k - thickness / 2, y);
      ctx.lineTo(x + tilt * k + thickness / 2, y);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

const bamboo: StageDef = {
  name: 'Bambouseraie de Minuit',
  ambience: 'firefly',
  paint(back, front) {
    back.fillStyle = verticalGradient(back, 0, G, ['#020b1c', '#0b2a4a', '#1f5a6a']);
    back.fillRect(0, 0, BACK_W, H);
    disc(back, BACK_W * 0.7, 120, 110, 'rgba(242,246,255,.18)');
    disc(back, BACK_W * 0.7, 120, 70, '#f2f6ff');
    paintStars(back, 70, 240);
    paintHills(back, 360, 80, '#0a2436', 5);
    paintBamboo(back, 40, BACK_W, '#0f3d3a', 0.9);
    paintBamboo(front, 34, STAGE_W, '#1c6a4a', 1);
    paintFloor(front, ['#2f4a3a', '#1a2c26', '#0a1412'], '#0a1a14', false);
  },
};

export const STAGE_DEFS: readonly StageDef[] = [dojo, neonCity, volcano, bamboo];
