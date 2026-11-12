/* Écrans animés : rencontre (VS), victoire, fin du mode arcade */
(function () {
  const FF = window.FF, W = FF.W, H = FF.H, T = FF.arcadeText;

  function rays(ctx, cx, cy, col, t, n) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.004); ctx.fillStyle = col;
    for (let i = 0; i < n; i++) { ctx.rotate((Math.PI * 2) / n); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1200, -1200 * Math.tan(Math.PI / n / 2)); ctx.lineTo(1200, 1200 * Math.tan(Math.PI / n / 2)); ctx.fill(); }
    ctx.restore();
  }

  /* ---------- Animation de rencontre ---------- */
  class Versus {
    constructor(c1, c2, label, cb) { this.c = [c1, c2]; this.label = label; this.cb = cb; this.t = 0; this.done = false; this.shake = 0; this.flash = 0; }
    skip() { if (this.t > 50 && this.t < 150) this.t = 150; }
    update() {
      this.t++; this.shake *= 0.85; this.flash *= 0.85;
      if (this.t === 4) FF.Audio.play('special');
      if (this.t === 46) { this.shake = 22; this.flash = 1; FF.Audio.play('vs'); }
      if (this.t >= 190 && !this.done) { this.done = true; this.cb(); }
    }
    render(ctx) {
      const t = this.t, [a, b] = this.c;
      ctx.save(); ctx.translate(FF.rand(-1, 1) * this.shake, FF.rand(-1, 1) * this.shake);
      const side = (c, left) => {
        ctx.save(); ctx.beginPath();
        if (left) { ctx.moveTo(-40, -40); ctx.lineTo(W / 2 + 90, -40); ctx.lineTo(W / 2 - 90, H + 40); ctx.lineTo(-40, H + 40); } else { ctx.moveTo(W / 2 + 90, -40); ctx.lineTo(W + 40, -40); ctx.lineTo(W + 40, H + 40); ctx.lineTo(W / 2 - 90, H + 40); }
        ctx.clip();
        const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, FF.shade(c.color, -0.2)); g.addColorStop(1, FF.shade(c.color, -0.75)); ctx.fillStyle = g; ctx.fillRect(-40, -40, W + 80, H + 80);
        ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 26;
        for (let i = -6; i < 24; i++) { const x = i * 80 + ((t * (left ? 5 : -5)) % 80); ctx.beginPath(); ctx.moveTo(x, H + 40); ctx.lineTo(x + 180, -40); ctx.stroke(); }
        const k = FF.easeOut((t - (left ? 6 : 16)) / 26), x = left ? -320 + k * 560 : W + 320 - k * 560;
        FF.drawChar(ctx, c, 'idle', x - (left ? 1 : -1) * 14, 520 + 10, left ? 1 : -1, 2.05, t, { sil: '#000', alpha: 0.3 });
        FF.drawChar(ctx, c, t > 46 ? 'idle' : 'intro', x, 520, left ? 1 : -1, 2.05, t);
        ctx.restore();
        const nk = FF.easeOut((t - 30) / 20);
        T(ctx, c.name, left ? -300 + nk * 330 : W + 300 - nk * 330, 468, 74, { align: left ? 'left' : 'right', colors: ['#fff', '#fff', FF.shade(c.color, 0.5)], glow: c.color });
        T(ctx, c.title, left ? -300 + nk * 334 : W + 300 - nk * 334, 516, 24, { align: left ? 'left' : 'right', colors: ['#fff', '#eee', '#ccc'] });
      };
      side(a, true); side(b, false);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(W / 2 + 90, -40); ctx.lineTo(W / 2 - 90, H + 40); ctx.stroke();
      if (t >= 46) { const k = FF.easeBack((t - 46) / 12); T(ctx, 'VS', W / 2, H / 2 - 20, 190, { scale: 2.4 - 1.4 * k, colors: ['#fff', '#ffd23a', '#ff2a2a'], glow: '#ff5a1f' }); }
      if (this.label && t > 20) T(ctx, this.label, W / 2, 44, 34, { alpha: Math.min(1, (t - 20) / 15) });
      ctx.restore();
      if (this.flash > 0.02) { ctx.fillStyle = `rgba(255,255,255,${this.flash})`; ctx.fillRect(0, 0, W, H); }
      if (t > 172) { ctx.fillStyle = `rgba(0,0,0,${(t - 172) / 18})`; ctx.fillRect(0, 0, W, H); }
    }
  }

  /* ---------- Écran de victoire ---------- */
  class Victory {
    constructor(winner, loser, playerWon) { this.w = winner; this.l = loser; this.won = playerWon; this.t = 0; this.fx = new FF.Fx(); FF.Audio.play('win'); }
    update() { this.t++; this.fx.update(); if (this.t % 50 === 10) this.fx.confetti(FF.rand(200, 760), FF.rand(60, 200)); }
    render(ctx) {
      const t = this.t, c = this.w;
      const g = ctx.createRadialGradient(330, 300, 40, 330, 300, 800); g.addColorStop(0, FF.shade(c.color, 0.25)); g.addColorStop(1, FF.shade(c.color, -0.8)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      rays(ctx, 330, 300, 'rgba(255,255,255,.08)', t, 14);
      const k = FF.easeOut(t / 24);
      FF.drawChar(ctx, c, 'win', -200 + k * 520, 514, 1, 2.0, t);
      T(ctx, this.won === false ? 'DÉFAITE...' : 'VICTOIRE !', 660, 92, 86, { scale: 0.4 + 0.6 * FF.easeBack(t / 14), colors: this.won === false ? ['#fff', '#b9c4ff', '#5a6ad0'] : undefined });
      T(ctx, c.name, 660, 176, 58, { colors: ['#fff', '#fff', FF.shade(c.color, 0.4)], glow: c.color });
      if (t > 26) {
        ctx.save(); ctx.globalAlpha = Math.min(1, (t - 26) / 14); ctx.fillStyle = 'rgba(10,6,24,.82)'; ctx.strokeStyle = c.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.roundRect(470, 222, 400, 96, 14); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = `italic 600 22px system-ui,sans-serif`; ctx.textAlign = 'center';
        wrap(ctx, '« ' + c.quote + ' »', 670, 262, 370, 28); ctx.restore();
      }
      this.fx.draw(ctx);
    }
  }
  function wrap(ctx, text, x, y, maxW, lh) {
    const words = text.split(' '), lines = []; let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
    lines.push(line); const y0 = y - ((lines.length - 1) * lh) / 2 + 6; lines.forEach((l, i) => ctx.fillText(l, x, y0 + i * lh));
  }

  /* ---------- Animation de fin (arcade terminé) ---------- */
  class Ending {
    constructor(char, cb) { this.c = char; this.cb = cb; this.t = 0; this.fx = new FF.Fx(); this.stage = FF.getStage(char.stage); this.x = -80; this.done = false; FF.Audio.music('ending'); }
    skip() { if (this.t < 760) this.t = 760; else if (this.t > 800 && !this.done) { this.done = true; this.cb(); } }
    update() {
      const t = ++this.t; this.fx.update();
      if (t < 150) this.x = -80 + (t / 150) * (W / 2 + 80);
      if (t === 150) { FF.Audio.play('win'); this.fx.confetti(W / 2, 160); }
      if (t > 150 && t % 45 === 0) { const x = FF.rand(100, W - 100), y = FF.rand(60, 220); this.fx.confetti(x, y); this.fx.hit(x, y, FF.pick(['fire', 'elec', 'slash']), 90, 1); if (t < 760) FF.Audio.play('fire'); }
      if (t > 1500 && !this.done) { this.done = true; this.cb(); }
    }
    render(ctx) {
      const t = this.t, c = this.c, G = FF.GROUND;
      FF.drawStage(ctx, this.stage, (FF.STAGE_W - W) / 2, t);
      ctx.fillStyle = 'rgba(8,4,20,.35)'; ctx.fillRect(0, 0, W, H);
      const credits = t >= 760;
      if (!credits) {
        const walking = t < 150, ph = t * 0.2;
        ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(this.x, G + 2, 60, 10, 0, 0, 7); ctx.fill();
        if (walking) {
          if (FF.usesSprites(c)) FF.Sprites.draw(ctx, c, Math.sin(ph) > 0 ? 'walk1' : 'walk2', this.x, G - Math.abs(Math.sin(ph)) * 5, 1, { scale: 1.15 });
          else FF.Rig.draw(ctx, c.look, FF.Rig.mix(FF.POSES.walkA, FF.POSES.walkB, (Math.sin(ph) + 1) / 2, this.tmp || (this.tmp = FF.Rig.clone('idle'))), this.x, G, 1, { scale: 1.15, time: t });
        } else FF.drawChar(ctx, c, 'win', this.x, G, 1, 1.15, t);
        if (t > 150) {
          T(ctx, 'CHAMPION !', W / 2, 78, 84, { scale: 0.4 + 0.6 * FF.easeBack((t - 150) / 14) });
          ctx.fillStyle = 'rgba(8,4,20,.78)'; ctx.fillRect(0, H - 86, W, 86); ctx.fillStyle = c.color; ctx.fillRect(0, H - 86, W, 3);
          const i = Math.min(c.ending.length - 1, Math.floor((t - 190) / 140)), lt = (t - 190) - i * 140;
          if (t > 190) { const s = c.ending[i]; ctx.font = '600 24px system-ui,sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(s.slice(0, Math.floor(lt * 0.9)), W / 2, H - 38); }
        }
      } else {
        const k = Math.min(1, (t - 760) / 30); ctx.fillStyle = `rgba(8,4,20,${0.6 * k})`; ctx.fillRect(0, 0, W, H);
        T(ctx, 'FÉLICITATIONS !', W / 2, 90, 80, { alpha: k });
        const list = FF.roster.slice(0, 8), n = list.length;
        list.forEach((r, i) => { const x = W / 2 + (i - (n - 1) / 2) * Math.min(150, 760 / n), kk = FF.easeOut((t - 780 - i * 8) / 20); FF.drawChar(ctx, r, r === c ? 'win' : 'idle', x, G + 30 + (1 - kk) * 300, i < n / 2 ? 1 : -1, r === c ? 1 : 0.85, t + i * 20); });
        T(ctx, 'Merci d\'avoir joué à FIGHTING FRIENDS', W / 2, 166, 30, { alpha: k, colors: ['#fff', '#fff', '#ccc'] });
        if (t > 860) T(ctx, 'FIN', W / 2, 232, 70, { alpha: Math.min(1, (t - 860) / 20), colors: ['#fff', '#8ff7ff', '#2aa8ff'] });
        if (t > 880 && t % 60 < 40) T(ctx, 'Touchez pour continuer', W / 2, H - 22, 22, { colors: ['#fff', '#fff', '#ccc'] });
      }
      this.fx.draw(ctx);
      if (t < 30) { ctx.fillStyle = `rgba(0,0,0,${1 - t / 30})`; ctx.fillRect(0, 0, W, H); }
    }
  }
  FF.Versus = Versus; FF.Victory = Victory; FF.Ending = Ending;
})();
