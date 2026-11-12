/* Effets : étincelles d'impact, poussière, traînées de coups, textes */
(function () {
  const FF = window.FF, R = FF.rand;
  const PAL = {
    punch: ['#fff', '#ffe27a', '#ff9d2e'], kick: ['#fff', '#ffe27a', '#ff9d2e'], heavy: ['#fff', '#ffd23a', '#ff5a1f'],
    fire: ['#fff', '#ffb02e', '#ff3b1f'], elec: ['#fff', '#8ff7ff', '#2aa8ff'], earth: ['#fff', '#e8c98a', '#9a6a3a'],
    slash: ['#fff', '#d8b4ff', '#8a3bff'], block: ['#fff', '#9fd8ff', '#3b7bff'],
  };
  class Fx {
    constructor() { this.p = []; }
    add(o) { o.t = 0; this.p.push(o); return o; }
    hit(x, y, kind, power, dir) {
      const pal = PAL[kind] || PAL.punch, big = power > 60;
      this.add({ type: 'burst', x, y, life: big ? 16 : 11, size: big ? 74 : 44, pal, rot: R(6.3) });
      this.add({ type: 'ring', x, y, life: big ? 18 : 12, size: big ? 90 : 52, col: pal[1] });
      const n = big ? 14 : 7;
      for (let i = 0; i < n; i++) { const a = R(-1.2, 1.2) + (dir > 0 ? 0 : Math.PI), s = R(4, big ? 15 : 10); this.add({ type: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, g: 0.35, life: R(10, 22), size: R(2, big ? 6 : 4), col: FF.pick(pal) }); }
      if (kind === 'elec') for (let i = 0; i < 3; i++) this.add({ type: 'bolt', x: x + R(-20, 20), y: y + R(-30, 30), life: 9, size: R(40, 80), col: '#bff', rot: R(6.3), seed: R(99) });
      if (kind === 'slash') this.add({ type: 'cut', x, y, life: 12, size: big ? 170 : 120, col: pal[1], rot: R(-0.9, 0.9) });
      if (kind === 'fire') for (let i = 0; i < 6; i++) this.add({ type: 'smoke', x: x + R(-14, 14), y: y + R(-14, 14), vx: R(-1.5, 1.5), vy: R(-3.5, -1), life: R(16, 28), size: R(10, 22), col: FF.pick(['#ff9d2e', '#ff5a1f', '#ffd23a']) });
      if (kind === 'earth') for (let i = 0; i < 7; i++) this.add({ type: 'rock', x: x + R(-20, 20), y, vx: R(-5, 5), vy: R(-11, -4), g: 0.6, life: R(20, 34), size: R(4, 9), col: FF.pick(['#7a5a3a', '#9a7a52', '#5a4028']), rot: R(6) });
    }
    block(x, y) {
      this.add({ type: 'ring', x, y, life: 10, size: 46, col: '#9fd8ff' }); this.add({ type: 'burst', x, y, life: 8, size: 34, pal: PAL.block, rot: R(6.3) });
      for (let i = 0; i < 5; i++) { const a = R(6.3); this.add({ type: 'spark', x, y, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, g: 0.2, life: 12, size: 3, col: '#bfe6ff' }); }
    }
    dust(x, y, dir, n) { for (let i = 0; i < (n || 5); i++) this.add({ type: 'smoke', x: x + R(-10, 10), y: y - R(0, 6), vx: -dir * R(0.5, 3) + R(-1, 1), vy: R(-1.6, -0.2), life: R(14, 26), size: R(7, 15), col: 'rgba(230,220,200,1)' }); }
    // traînée blanche qui suit un coup (attachée au combattant)
    swoosh(f, box, kind, col) { this.add({ type: 'sw', f, box, kind: kind || 'thrust', life: 9, col }); }
    aura(x, y, col) { for (let i = 0; i < 2; i++) this.add({ type: 'smoke', x: x + R(-34, 34), y: y - R(0, 150), vx: 0, vy: R(-5, -2), life: R(12, 22), size: R(5, 12), col }); }
    confetti(x, y) { for (let i = 0; i < 60; i++) { const a = R(6.3), s = R(3, 13); this.add({ type: 'rock', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 4, g: 0.22, life: R(50, 110), size: R(4, 8), col: FF.pick(['#ff3d7f', '#ffd23a', '#19c6c6', '#fff', '#a25bff', '#7dff6a']), rot: R(6) }); } }
    update() {
      const p = this.p;
      for (let i = p.length - 1; i >= 0; i--) {
        const o = p[i]; o.t++;
        if (o.vx !== undefined) { o.x += o.vx; o.y += o.vy; if (o.g) o.vy += o.g; o.vx *= 0.96; }
        if (o.t >= o.life) p.splice(i, 1);
      }
      if (p.length > 500) p.splice(0, p.length - 500);
    }
    draw(ctx) {
      for (const o of this.p) {
        const k = o.t / o.life, a = 1 - k;
        ctx.save();
        switch (o.type) {
          case 'burst': { // étoile d'impact
            const r = o.size * (0.4 + 0.6 * FF.easeOut(k * 1.6)); ctx.translate(o.x, o.y); ctx.rotate(o.rot);
            ctx.globalAlpha = Math.min(1, a * 1.6);
            for (let j = 0; j < 3; j++) {
              const rr = r * [1, 0.72, 0.42][j]; ctx.fillStyle = o.pal[2 - j]; ctx.beginPath();
              for (let i = 0; i < 16; i++) { const an = (i / 16) * 6.283, q = i % 2 ? rr * 0.42 : rr * (i % 4 === 0 ? 1 : 0.74); ctx.lineTo(Math.cos(an) * q, Math.sin(an) * q); }
              ctx.closePath(); ctx.fill();
            } break;
          }
          case 'ring': ctx.globalAlpha = a; ctx.strokeStyle = o.col; ctx.lineWidth = 7 * a + 1; ctx.beginPath(); ctx.arc(o.x, o.y, o.size * FF.easeOut(k), 0, 7); ctx.stroke(); break;
          case 'spark': ctx.globalAlpha = Math.min(1, a * 2); ctx.strokeStyle = o.col; ctx.lineWidth = o.size; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.x - o.vx * 2.2, o.y - o.vy * 2.2); ctx.stroke(); break;
          case 'smoke': ctx.globalAlpha = a * 0.7; ctx.fillStyle = o.col; ctx.beginPath(); ctx.arc(o.x, o.y, o.size * (0.6 + k), 0, 7); ctx.fill(); break;
          case 'rock': ctx.globalAlpha = Math.min(1, a * 3); ctx.translate(o.x, o.y); ctx.rotate(o.rot + o.t * 0.3); ctx.fillStyle = o.col; ctx.fillRect(-o.size / 2, -o.size / 2, o.size, o.size * 0.7); break;
          case 'bolt': {
            ctx.globalAlpha = a; ctx.translate(o.x, o.y); ctx.rotate(o.rot); ctx.strokeStyle = o.col; ctx.lineWidth = 3; ctx.shadowColor = '#4cf'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(-o.size / 2, 0);
            for (let i = 1; i <= 6; i++) ctx.lineTo(-o.size / 2 + (o.size * i) / 6, Math.sin(o.seed + i * 7.3 + o.t) * 12); ctx.stroke(); break;
          }
          case 'cut': {
            ctx.translate(o.x, o.y); ctx.rotate(o.rot); ctx.globalAlpha = a; const L = o.size * FF.easeOut(k * 2);
            ctx.fillStyle = o.col; ctx.beginPath(); ctx.moveTo(-L, 0); ctx.quadraticCurveTo(0, -12 * a, L, 0); ctx.quadraticCurveTo(0, 12 * a, -L, 0); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-L * 0.9, 0); ctx.quadraticCurveTo(0, -4 * a, L * 0.9, 0); ctx.quadraticCurveTo(0, 4 * a, -L * 0.9, 0); ctx.fill(); break;
          }
          case 'sw': {
            const f = o.f, b = o.box, s = f.scaleH; ctx.translate(f.x, FF.GROUND + f.y); ctx.scale(f.facing, 1);
            ctx.globalAlpha = a * 0.85; const x0 = b[0] * s, y0 = b[1] * s, w = b[2] * s, h = b[3] * s, cx = x0 + w, cy = y0 + h / 2;
            const g = ctx.createLinearGradient(x0 - 20, 0, cx, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.6, FF.rgba(o.col || '#ffffff', 0.55)); g.addColorStop(1, '#fff');
            ctx.fillStyle = g; ctx.beginPath();
            if (o.kind === 'thrust') { ctx.moveTo(x0 - 20, cy); ctx.quadraticCurveTo(x0 + w * 0.5, cy - h * 0.55, cx + 6, cy); ctx.quadraticCurveTo(x0 + w * 0.5, cy + h * 0.55, x0 - 20, cy); }
            else if (o.kind === 'low') { ctx.moveTo(x0 - 30, y0 + h); ctx.quadraticCurveTo(x0 + w * 0.5, y0 - h * 0.4, cx + 8, y0 + h * 0.8); ctx.quadraticCurveTo(x0 + w * 0.5, y0 + h * 0.5, x0 - 30, y0 + h); }
            else if (o.kind === 'up') { ctx.moveTo(x0 - 10, y0 + h); ctx.quadraticCurveTo(cx + 40, y0 + h * 0.6, x0 + w * 0.6, y0 - 10); ctx.quadraticCurveTo(cx - 6, y0 + h * 0.55, x0 - 10, y0 + h); }
            else if (o.kind === 'down') { ctx.moveTo(x0 - 10, y0); ctx.quadraticCurveTo(cx + 44, y0 + h * 0.3, x0 + w * 0.7, y0 + h); ctx.quadraticCurveTo(cx - 4, y0 + h * 0.4, x0 - 10, y0); }
            else { ctx.moveTo(x0 - 40, y0 + h * 0.2); ctx.quadraticCurveTo(cx + 50, y0 - h * 0.2, cx, y0 + h * 0.9); ctx.quadraticCurveTo(cx - 10, y0 + h * 0.25, x0 - 40, y0 + h * 0.2); }
            ctx.fill(); break;
          }
        }
        ctx.restore();
      }
    }
  }
  FF.Fx = Fx;

  // gros texte d'arcade (italique, contour, dégradé)
  FF.arcadeText = function (ctx, txt, x, y, size, opt) {
    opt = opt || {};
    ctx.save(); ctx.translate(x, y); if (opt.scale) ctx.scale(opt.scale, opt.scale); if (opt.rot) ctx.rotate(opt.rot);
    ctx.transform(1, 0, -0.18, 1, 0, 0);
    ctx.font = `900 ${size}px ${FF.FONT}`; ctx.textAlign = opt.align || 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    if (opt.alpha !== undefined) ctx.globalAlpha = opt.alpha;
    ctx.lineWidth = size * 0.22; ctx.strokeStyle = opt.stroke || '#140a1e'; ctx.strokeText(txt, 0, 0);
    if (opt.glow) { ctx.shadowColor = opt.glow; ctx.shadowBlur = size * 0.4; }
    const c = opt.colors || ['#fff7c2', '#ffd23a', '#ff5a1f'];
    const g = ctx.createLinearGradient(0, -size * 0.5, 0, size * 0.5); g.addColorStop(0, c[0]); g.addColorStop(0.5, c[1]); g.addColorStop(1, c[2]);
    ctx.fillStyle = g; ctx.fillText(txt, 0, 0);
    ctx.shadowBlur = 0; ctx.lineWidth = Math.max(1, size * 0.03); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.strokeText(txt, 0, 0);
    ctx.restore();
  };
})();
