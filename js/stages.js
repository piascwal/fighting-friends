/* Décors procéduraux (pré-rendus dans des canvas, avec parallaxe) */
(function () {
  const FF = window.FF, W = FF.W, H = FF.H, G = FF.GROUND, SW = FF.STAGE_W, BW = 1160, R = FF.rand;
  const mk = (w) => { const c = document.createElement('canvas'); c.width = w; c.height = H; return [c, c.getContext('2d')]; };
  const grad = (x, y0, y1, stops) => { const g = x.createLinearGradient(0, y0, 0, y1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; };
  function floor(x, top, cols, lineCol, planks) {
    x.fillStyle = grad(x, top, H, cols); x.fillRect(0, top, SW, H - top);
    x.strokeStyle = lineCol; x.lineWidth = 2;
    for (let i = 0; i < 7; i++) { const y = top + Math.pow(i / 7, 1.7) * (H - top); x.globalAlpha = 0.5; x.beginPath(); x.moveTo(0, y); x.lineTo(SW, y); x.stroke(); }
    if (planks) for (let i = -10; i < 40; i++) { const cx = SW / 2 + i * 70; x.beginPath(); x.moveTo(SW / 2 + (cx - SW / 2) * 0.82, top); x.lineTo(SW / 2 + (cx - SW / 2) * 1.5, H); x.stroke(); }
    x.globalAlpha = 1; x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(0, top, SW, 3);
  }
  function hills(x, w, base, amp, col, seed) {
    x.fillStyle = col; x.beginPath(); x.moveTo(0, H);
    for (let i = 0; i <= w; i += 20) x.lineTo(i, base - Math.abs(Math.sin(i * 0.004 + seed) * amp + Math.sin(i * 0.011 + seed * 3) * amp * 0.4));
    x.lineTo(w, H); x.fill();
  }

  const DEFS = [
    { name: 'Dojo du Crépuscule', amb: 'petal', build() {
      const [b, x] = mk(BW), [f, y] = mk(SW);
      x.fillStyle = grad(x, 0, G, ['#2a1b5e', '#b0417a', '#ff8a4c', '#ffd27a']); x.fillRect(0, 0, BW, H);
      x.fillStyle = '#fff1b8'; x.beginPath(); x.arc(BW * 0.5, 290, 110, 0, 7); x.fill();
      x.fillStyle = 'rgba(255,241,184,.25)'; x.beginPath(); x.arc(BW * 0.5, 290, 150, 0, 7); x.fill();
      hills(x, BW, 330, 120, '#6a2f6a', 1); hills(x, BW, 390, 70, '#43204f', 4);
      // pagode
      x.fillStyle = '#2a1436'; for (let i = 0; i < 4; i++) { const yy = 300 - i * 46, ww = 150 - i * 26, cx = BW * 0.78; x.fillRect(cx - ww * 0.3, yy, ww * 0.6, 46); x.beginPath(); x.moveTo(cx - ww, yy + 8); x.quadraticCurveTo(cx, yy - 22, cx + ww, yy + 8); x.lineTo(cx + ww * 0.7, yy - 6); x.lineTo(cx - ww * 0.7, yy - 6); x.fill(); }
      // portique + lanternes
      y.fillStyle = '#7d1f2b'; [240, 1260].forEach((px) => { y.fillRect(px - 16, 120, 32, G - 120); });
      y.fillStyle = '#5a1420'; y.fillRect(180, 110, 1140, 30); y.fillStyle = '#7d1f2b'; y.fillRect(150, 82, 1200, 26);
      y.fillStyle = '#ffcf5a'; [420, 750, 1080].forEach((px) => { y.fillStyle = '#2a1436'; y.fillRect(px - 1, 140, 3, 40); y.fillStyle = '#ffcf5a'; y.beginPath(); y.ellipse(px, 200, 18, 24, 0, 0, 7); y.fill(); y.fillStyle = 'rgba(255,207,90,.25)'; y.beginPath(); y.arc(px, 200, 44, 0, 7); y.fill(); });
      floor(y, G - 34, ['#a8683a', '#7a4526', '#4a2814'], '#3a1e10', true);
      return [b, f];
    } },
    { name: 'Néon City', amb: 'rain', build() {
      const [b, x] = mk(BW), [f, y] = mk(SW);
      x.fillStyle = grad(x, 0, G, ['#05061a', '#1a1050', '#5a1e8a']); x.fillRect(0, 0, BW, H);
      for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(255,255,255,${R(0.2, 0.9)})`; x.fillRect(R(BW), R(200), 2, 2); }
      for (let layer = 0; layer < 2; layer++) for (let i = 0; i < 26; i++) {
        const bw = R(50, 110), bh = R(120, 300) - layer * 40, bx = i * 48 + R(-10, 10), by = G - 20 - bh;
        x.fillStyle = layer ? '#150c33' : '#241457'; x.fillRect(bx, by, bw, bh + 40);
        for (let wy = by + 10; wy < G - 30; wy += 16) for (let wx = bx + 6; wx < bx + bw - 8; wx += 12) if (Math.random() < 0.45) { x.fillStyle = FF.pick(['#ffd23a', '#19c6c6', '#ff3d7f', '#fff']); x.globalAlpha = R(0.3, 0.9); x.fillRect(wx, wy, 6, 8); }
        x.globalAlpha = 1;
      }
      const sign = (px, py, t, col, sz) => { y.save(); y.font = `900 ${sz}px ${FF.FONT}`; y.textAlign = 'center'; y.shadowColor = col; y.shadowBlur = 24; y.fillStyle = col; y.fillText(t, px, py); y.shadowBlur = 8; y.fillStyle = '#fff'; y.fillText(t, px, py); y.restore(); };
      y.fillStyle = '#0d0828'; y.fillRect(0, 150, SW, G - 150); y.fillStyle = '#160d3a'; for (let i = 0; i < 12; i++) y.fillRect(i * 130 + 10, 170, 110, G - 170);
      sign(300, 250, 'ARCADE', '#ff3d7f', 64); sign(760, 230, 'FIGHT!', '#19c6c6', 76); sign(1210, 260, '24H', '#ffd23a', 70);
      y.fillStyle = 'rgba(255,61,127,.5)'; y.fillRect(0, 150, SW, 4); y.fillStyle = 'rgba(25,198,198,.5)'; y.fillRect(0, G - 40, SW, 4);
      floor(y, G - 34, ['#2a1d5c', '#140c33', '#07041a'], '#5a3bd0', true);
      y.globalAlpha = 0.18; [['#ff3d7f', 300], ['#19c6c6', 760], ['#ffd23a', 1210]].forEach(([c, px]) => { y.fillStyle = c; y.fillRect(px - 110, G - 30, 220, H); }); y.globalAlpha = 1;
      return [b, f];
    } },
    { name: 'Forge du Volcan', amb: 'ember', build() {
      const [b, x] = mk(BW), [f, y] = mk(SW);
      x.fillStyle = grad(x, 0, G, ['#1a0508', '#5a0f12', '#c2341a', '#ff8a2a']); x.fillRect(0, 0, BW, H);
      x.fillStyle = '#2a0a0c'; x.beginPath(); x.moveTo(BW * 0.25, G); x.lineTo(BW * 0.47, 130); x.lineTo(BW * 0.55, 130); x.lineTo(BW * 0.8, G); x.fill();
      x.fillStyle = '#ffb02e'; x.beginPath(); x.moveTo(BW * 0.47, 130); x.lineTo(BW * 0.55, 130); x.lineTo(BW * 0.53, 240); x.lineTo(BW * 0.5, 330); x.lineTo(BW * 0.49, 200); x.fill();
      x.fillStyle = 'rgba(255,176,46,.25)'; x.beginPath(); x.arc(BW * 0.51, 120, 120, 0, 7); x.fill();
      hills(x, BW, 400, 60, '#1c0709', 2);
      y.fillStyle = '#140608'; for (let i = 0; i < 9; i++) { const px = i * 190 + 40, hh = 90 + (i % 3) * 60; y.beginPath(); y.moveTo(px - 50, G); y.lineTo(px - 10, G - hh); y.lineTo(px + 24, G - hh * 0.8); y.lineTo(px + 60, G); y.fill(); }
      floor(y, G - 34, ['#4a2a22', '#2a1512', '#120808'], '#ff5a1f', false);
      y.strokeStyle = '#ff8a2a'; y.lineWidth = 3; y.shadowColor = '#ff5a1f'; y.shadowBlur = 12;
      for (let i = 0; i < 14; i++) { let px = R(SW), py = G - 10 + R(80); y.beginPath(); y.moveTo(px, py); for (let j = 0; j < 4; j++) { px += R(-50, 50); py += R(6, 20); y.lineTo(px, py); } y.stroke(); }
      return [b, f];
    } },
    { name: 'Bambouseraie de Minuit', amb: 'firefly', build() {
      const [b, x] = mk(BW), [f, y] = mk(SW);
      x.fillStyle = grad(x, 0, G, ['#020b1c', '#0b2a4a', '#1f5a6a']); x.fillRect(0, 0, BW, H);
      x.fillStyle = '#f2f6ff'; x.beginPath(); x.arc(BW * 0.7, 120, 70, 0, 7); x.fill(); x.fillStyle = 'rgba(242,246,255,.18)'; x.beginPath(); x.arc(BW * 0.7, 120, 110, 0, 7); x.fill();
      for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(255,255,255,${R(0.2, 0.8)})`; x.fillRect(R(BW), R(240), 2, 2); }
      hills(x, BW, 360, 80, '#0a2436', 5);
      const bamboo = (c, n, w, col, a) => { for (let i = 0; i < n; i++) { const px = R(w), ww = R(8, 18), tilt = R(-30, 30); c.strokeStyle = col; c.lineWidth = ww; c.globalAlpha = a; c.beginPath(); c.moveTo(px, G); c.lineTo(px + tilt, -10); c.stroke(); c.lineWidth = 2; c.strokeStyle = 'rgba(0,0,0,.45)'; for (let s = 0; s < 8; s++) { const k = s / 8; c.beginPath(); c.moveTo(px + tilt * k - ww / 2, G - k * (G + 10)); c.lineTo(px + tilt * k + ww / 2, G - k * (G + 10)); c.stroke(); } } c.globalAlpha = 1; };
      bamboo(x, 40, BW, '#0f3d3a', 0.9); bamboo(y, 34, SW, '#1c6a4a', 1);
      floor(y, G - 34, ['#2f4a3a', '#1a2c26', '#0a1412'], '#0a1a14', false);
      return [b, f];
    } },
  ];
  const cache = {};
  FF.STAGES = DEFS;
  FF.getStage = (i) => { i = ((i % DEFS.length) + DEFS.length) % DEFS.length; if (!cache[i]) { const [b, f] = DEFS[i].build(); cache[i] = { back: b, front: f, def: DEFS[i], motes: Array.from({ length: 36 }, () => ({ x: R(W), y: R(H), s: R(0.5, 1.5), p: R(6.3) })) }; } return cache[i]; };
  FF.drawStage = function (ctx, st, camX, t) {
    ctx.drawImage(st.back, -camX * 0.35 - 4, 0); ctx.drawImage(st.front, -camX, 0);
    const amb = st.def.amb;
    for (const m of st.motes) {
      if (amb === 'petal') { m.x -= 1.2 * m.s; m.y += 0.8 * m.s; ctx.fillStyle = 'rgba(255,190,200,.8)'; ctx.beginPath(); ctx.ellipse(m.x, m.y, 5 * m.s, 2.5 * m.s, t * 0.05 + m.p, 0, 7); ctx.fill(); }
      else if (amb === 'rain') { m.x -= 3; m.y += 16 * m.s; ctx.strokeStyle = 'rgba(160,190,255,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + 4, m.y - 18); ctx.stroke(); }
      else if (amb === 'ember') { m.y -= 1.4 * m.s; m.x += Math.sin(t * 0.04 + m.p); ctx.fillStyle = `rgba(255,${(140 + 80 * Math.sin(m.p)) | 0},40,.85)`; ctx.fillRect(m.x, m.y, 3 * m.s, 3 * m.s); }
      else { m.x += Math.sin(t * 0.02 + m.p) * 0.6; m.y += Math.cos(t * 0.017 + m.p) * 0.5; ctx.fillStyle = `rgba(190,255,140,${0.4 + 0.4 * Math.sin(t * 0.06 + m.p)})`; ctx.beginPath(); ctx.arc(m.x, m.y, 2.2 * m.s, 0, 7); ctx.fill(); }
      if (m.y > H + 10) { m.y = -10; m.x = R(W + 200); } if (m.y < -20) { m.y = H; m.x = R(W); } if (m.x < -20) m.x = W + 10;
    }
  };
})();
