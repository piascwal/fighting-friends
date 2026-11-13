/* Combat : manches, collisions, projectiles, caméra, effets, HUD */
(function () {
  const FF = window.FF, W = FF.W, H = FF.H, G = FF.GROUND, SW = FF.STAGE_W, T = FF.arcadeText;
  const overlap = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  const PRAISE = [[10, 'DÉVASTATEUR !'], [7, 'INCROYABLE !'], [5, 'SUPER !'], [3, 'BIEN !']];

  class Fight {
    /* o : chars[2], ctrls[2], ais[2], stage, rounds, attract, training, onEnd(winnerIdx) */
    constructor(o) {
      this.o = o; this.f = o.chars.map((c, i) => new FF.Fighter(c, i, o.ctrls[i]));
      this.f.forEach((f) => (f.w = this)); this.ais = o.ais || [null, null];
      o.ctrls.forEach((c, i) => { c.clear(); c.ai = this.ais[i]; });
      this.fx = new FF.Fx(); this.stage = FF.getStage(o.stage || 0); this.rounds = o.rounds || 2;
      this.round = 1; this.tick = 0; this.camX = (SW - W) / 2; this.shakeAmt = 0; this.flashA = 0; this.done = false;
      this.cshow = [null, null]; this.banners = []; this.paused = false;
      this.startRound();
    }
    startRound() {
      this.f[0].reset(SW / 2 - 160, 1); this.f[1].reset(SW / 2 + 160, -1);
      this.f.forEach((f, i) => { f.opp = this.f[1 - i]; f.setState('lock'); f.setPose('intro', 0.2); });
      this.projs = []; this.timer = 60 * 60; this.phase = 'intro'; this.pt = 0; this.roundOver = false; this.hitstop = 0; this.superFreeze = 0; this.slow = 0; this.winner = -1;
      this.camX = (SW - W) / 2;
      if (this.o.attract || this.o.training) { this.phase = 'fight'; this.f.forEach((f) => f.setState('neutral')); }
    }
    banner(txt, o) { this.banners.push(Object.assign({ txt, t: 0, dur: 70, size: 110, y: 230 }, o || {})); }
    shake(a) { this.shakeAmt = Math.max(this.shakeAmt, a); }
    hasProj(f) { return this.projs.some((p) => p.o === f); }
    projNear(f) { return this.projs.some((p) => p.o !== f && Math.abs(p.x - f.x) < 330 && (f.x - p.x) * p.dir > 0); }
    spawnProj(o, d) {
      const s = o.scaleH;
      this.projs.push({ o, d, x: o.x + o.facing * (d.x || 70) * s, y: G + d.y * s, vx: d.vx * o.facing, dir: o.facing, hits: d.hits || 1, cd: 0, t: 0 });
      FF.Audio.play(d.fx === 'slash' ? 'slash' : d.fx === 'earth' ? 'earth' : 'fire');
    }
    superFlash(f, m) {
      this.superFreeze = 30; this.superBy = f; this.superName = m.name; this.flashA = 0.7; this.shake(8);
      FF.Rig.approach(f.pose, f.target, 1);
    }

    update() {
      this.tick++;
      const [a, b] = this.f;
      this.ais.forEach((ai, i) => ai && ai.think(this.f[i], this.f[1 - i], this));
      a.readInput(); b.readInput();
      this.fx.update();
      for (let i = this.banners.length - 1; i >= 0; i--) if (++this.banners[i].t > this.banners[i].dur) this.banners.splice(i, 1);
      this.shakeAmt *= 0.86; if (this.shakeAmt < 0.4) this.shakeAmt = 0; this.flashA *= 0.82;
      this.f.forEach((f) => { f.hpLag += (f.hp - f.hpLag) * (f.inHit() ? 0.02 : 0.12); });
      for (let i = 0; i < 2; i++) if (this.cshow[i] && --this.cshow[i].t <= 0) this.cshow[i] = null;
      if (this.superFreeze > 0) { this.superFreeze--; const s = this.superBy; if (this.tick % 2) this.fx.aura(s.x, G, s.c.color); return; }
      if (this.hitstop > 0) { if (--this.hitstop === 0) this.f.forEach((f) => (f.shake = 0)); return; }
      if (this.slow > 0) { this.slow--; if (this.tick % 3) return; }
      this.phaseStep();
      a.update(b); b.update(a);
      this.push(); this.resolveHits(a, b); this.resolveHits(b, a); this.updateProjs();
      // fin de combo
      for (let i = 0; i < 2; i++) {
        const f = this.f[i], d = this.f[1 - i];
        if (f.combo && !d.inHit() && d.state !== 'down') {
          if (f.combo >= 3 && !this.o.attract) { const p = PRAISE.find((x) => f.combo >= x[0]); this.cshow[i] = { n: f.combo, dmg: f.comboDmg, t: 80, praise: p[1], end: true }; }
          f.combo = 0;
        }
        if (f.meter >= 100 && this.tick % 5 === 0) this.fx.aura(f.x, G + f.y, f.c.color);
      }
      if (this.o.training) { const d = b; if (!d.inHit() && d.state === 'neutral') d.hp = d.maxHp; d.hp = Math.max(d.hp, 1); a.hp = Math.max(a.hp, 1); if (a.state === 'neutral' && this.tick % 4 === 0) a.meter = Math.min(100, a.meter + 1); }
      const mid = (a.x + b.x) / 2 - W / 2; this.camX += (FF.clamp(mid, 0, SW - W) - this.camX) * 0.15;
    }
    phaseStep() {
      const [a, b] = this.f, o = this.o; this.pt++;
      if (this.phase === 'intro') {
        if (this.pt === 12) { this.banner(a.wins + b.wins >= (this.rounds - 1) * 2 && this.rounds > 1 ? 'MANCHE FINALE' : 'MANCHE ' + this.round, { dur: 62, size: 96 }); FF.Audio.play('round'); }
        if (this.pt === 50) this.f.forEach((f) => f.setPose('idle', 0.15));
        if (this.pt === 80) { this.banner('COMBATTEZ !', { dur: 46, size: 120, colors: ['#fff', '#ff9d2e', '#ff2a2a'] }); FF.Audio.play('fight'); this.flashA = 0.5; }
        if (this.pt === 96) { this.phase = 'fight'; this.f.forEach((f) => f.setState('neutral')); }
      } else if (this.phase === 'fight') {
        if (!o.attract && !o.training) this.timer--;
        const ko = a.hp <= 0 || b.hp <= 0;
        if (ko || this.timer <= 0) {
          this.phase = 'ko'; this.pt = 0; this.roundOver = true;
          const ra = a.hp / a.maxHp, rb = b.hp / b.maxHp; this.winner = ra === rb ? -1 : ra > rb ? 0 : 1;
          if (ko) { this.slow = 54; this.flashA = 1; this.shake(16); this.banner('K.O.', { dur: 100, size: 170, colors: ['#fff', '#ff5a1f', '#c8001e'] }); FF.Audio.play('ko'); }
          else this.banner('TEMPS ÉCOULÉ', { dur: 90, size: 96 });
        }
      } else if (this.phase === 'ko') {
        const settled = this.f.every((f) => f.grounded && f.state !== 'airhit' && f.state !== 'attack' || f.state === 'down');
        if (this.pt > 70 && settled || this.pt > 240) {
          this.phase = 'outro'; this.pt = 0;
          if (this.winner >= 0) {
            const w = this.f[this.winner], l = this.f[1 - this.winner]; w.wins++; w.faceOpp(); w.setState('lock'); w.setPose('win', 0.2);
            if (l.hp > 0) { l.setState('lock'); l.setPose('lose', 0.2); }
            if (!o.attract) { this.banner(w.c.name + ' GAGNE', { dur: 120, size: 84, y: 200 }); if (w.hp >= w.maxHp) this.banner('PERFECT !', { dur: 120, size: 70, y: 290, colors: ['#fff', '#8ff7ff', '#2aa8ff'] }); FF.Audio.play('win'); }
            this.fx.confetti(w.x, G - 220);
          } else if (!o.attract) this.banner('ÉGALITÉ', { dur: 110, size: 100 });
        }
      } else if (this.phase === 'outro' && this.pt > 140 && !this.done) {
        const w = this.f.findIndex((f) => f.wins >= this.rounds);
        if (w >= 0) { this.done = true; if (o.onEnd) o.onEnd(w); }
        else { this.round++; this.startRound(); }
      }
    }
    push() {
      const [a, b] = this.f, lying = (f) => f.state === 'down' || f.state === 'airhit' || !f.visible;
      if (!lying(a) && !lying(b) && Math.abs(a.y - b.y) < 110) {
        const min = 30 * (a.scaleH + b.scaleH), dx = b.x - a.x;
        if (Math.abs(dx) < min) { const dir = dx > 0 ? 1 : dx < 0 ? -1 : a.facing, p = (min - Math.abs(dx)) / 2; a.x -= dir * p; b.x += dir * p; }
      }
      for (const f of this.f) { const lo = Math.max(40, this.camX + 36), hi = Math.min(SW - 40, this.camX + W - 36), x = FF.clamp(f.x, lo, hi), d = x - f.x; if (d) { f.x = x; const o = f.opp; if (!lying(o) && !lying(f) && Math.abs(o.x - f.x) < 58 && Math.abs(a.y - b.y) < 110) o.x += d; } }
    }
    resolveHits(a, d) {
      const hb = d.hurtbox(); if (!hb) return;
      for (const bx of a.hitBoxes()) {
        if (!overlap(bx, hb)) continue;
        const dir = d.x === a.x ? a.facing : d.x > a.x ? 1 : -1;
        const res = d.takeHit(a, bx.h, dir, a.move.rank >= 10);
        if (!res) continue;
        a.hitDone[bx.i] = true; a.connected = true;
        const px = (Math.max(bx.x0, hb.x0) + Math.min(bx.x1, hb.x1)) / 2, py = (Math.max(bx.y0, hb.y0) + Math.min(bx.y1, hb.y1)) / 2;
        this.onHit(a, d, bx.h, res, px, py, dir);
        if (a.grounded && !a.move.vel && (d.x < this.camX + 60 || d.x > this.camX + W - 60)) a.vx = -dir * (bx.h.kb * 0.7 + 1);
        break;
      }
    }
    onHit(a, d, h, res, x, y, dir) {
      const big = h.dmg >= 60;
      if (res === 'hit') {
        this.fx.hit(x, y, h.fx, h.dmg, dir); this.hitstop = h.stop || (big ? 7 : 4); d.shake = 1;
        if (big) this.shake(h.dmg >= 100 ? 11 : 6); if (h.launch) this.flashA = Math.max(this.flashA, 0.25);
        FF.Audio.play({ fire: 'fire', elec: 'elec', earth: 'earth', slash: 'slash' }[h.fx] || (big ? 'hitH' : 'hitL')); if (big && h.fx !== 'heavy') FF.Audio.play('hitH');
        a.meter = Math.min(100, a.meter + d.lastDmg * 0.13); d.meter = Math.min(100, d.meter + d.lastDmg * 0.06);
        if (a.combo >= 2) this.cshow[a.idx] = { n: a.combo, dmg: a.comboDmg, t: 70, pop: 8 };
      } else if (res === 'block') {
        this.fx.block(x, y); this.hitstop = 3; FF.Audio.play('block'); a.meter = Math.min(100, a.meter + 2); d.meter = Math.min(100, d.meter + 2);
      } else { this.fx.block(x, y); this.fx.hit(x, y, 'earth', 30, dir); this.hitstop = 8; FF.Audio.play('hitH'); }
    }
    updateProjs() {
      const ps = this.projs;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i], d = p.d, o = p.o, t = o.opp; p.x += p.vx; p.t++; p.cd--;
        const s = o.scaleH, box = { x0: p.x - (d.w / 2) * s, x1: p.x + (d.w / 2) * s, y0: p.y - (d.h / 2) * s, y1: p.y + (d.h / 2) * s };
        if (this.tick % 2 === 0) {
          const R = FF.rand;
          if (d.fx === 'fire') this.fx.add({ type: 'smoke', x: p.x - p.dir * 14 + R(-8, 8), y: p.y + R(-d.h * 0.3, d.h * 0.3), vx: -p.dir * R(1, 3), vy: R(-1, 1), life: R(8, 16), size: d.h * R(0.14, 0.3), col: FF.pick(['#ffb02e', '#ff5a1f', '#ffe27a']) });
          else if (d.fx === 'earth') this.fx.add({ type: 'rock', x: p.x + R(-20, 20), y: G - 4, vx: R(-3, 3), vy: R(-9, -3), g: 0.7, life: R(14, 24), size: R(4, 9), col: FF.pick(['#7a5a3a', '#9a7a52', '#c9a56a']), rot: R(6) });
          else this.fx.add({ type: 'smoke', x: p.x - p.dir * 10, y: p.y + R(-8, 8), vx: -p.dir, vy: 0, life: 10, size: 7, col: '#8a3bff' });
        }
        const hb = t.hurtbox();
        if (hb && p.cd <= 0 && overlap(box, hb)) {
          const h = { dmg: d.dmg, hs: d.hs, bs: d.bs, kb: d.kb, lvl: 'mid', fx: d.fx, launch: p.hits === 1 ? d.launchLast : undefined, stop: d.hits ? 5 : 0, box: [0, d.y, 1, 1] };
          const res = t.takeHit(o, h, p.dir, true);
          if (res) { p.hits--; p.cd = 7; if (o.state === 'attack' && o.move.proj) o.connected = true; this.onHit(o, t, h, res, FF.clamp(p.x + p.dir * 20, hb.x0, hb.x1), FF.clamp(p.y, hb.y0, hb.y1), p.dir); }
        }
        for (const q of ps) if (q.o !== o && q.hits > 0 && p.hits > 0 && Math.abs(q.x - p.x) < (q.d.w + d.w) / 2 && Math.abs(q.y - p.y) < (q.d.h + d.h) / 2) { p.hits--; q.hits--; this.fx.hit((p.x + q.x) / 2, (p.y + q.y) / 2, 'elec', 80, 1); FF.Audio.play('block'); }
        if (p.hits <= 0 || p.x < -150 || p.x > SW + 150 || p.t > 240) ps.splice(i, 1);
      }
    }

    /* ---------- rendu ---------- */
    drawProj(ctx, p) {
      const d = p.d, s = p.o.scaleH, t = p.t, e = FF.Sprites.entry(p.o.c.id, 'projectile');
      ctx.save(); ctx.translate(p.x, p.y); ctx.scale(p.dir, 1);
      if (e) { const k = (d.h * 1.9 * s) / e.h * e.adj.s; ctx.drawImage(e.img, -e.w * k * 0.6, -e.h * k / 2 + (d.ground ? -d.h * 0.3 : 0), e.w * k, e.h * k); ctx.restore(); return; }
      const w = d.w * s, h = d.h * s, pul = 1 + Math.sin(t * 0.7) * 0.08;
      if (d.fx === 'fire') {
        
        ctx.fillStyle = '#ff5a1f'; ctx.beginPath(); ctx.moveTo(w * 0.5, 0); ctx.quadraticCurveTo(w * 0.3, -h * 0.62 * pul, -w * 0.3, -h * 0.4); ctx.quadraticCurveTo(-w * 1.5, 0, -w * 0.3, h * 0.4); ctx.quadraticCurveTo(w * 0.3, h * 0.62 * pul, w * 0.5, 0); ctx.fill();
        ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.ellipse(w * 0.05, 0, w * 0.4, h * 0.4 * pul, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(w * 0.12, 0, w * 0.22, h * 0.22, 0, 0, 7); ctx.fill();
      } else if (d.fx === 'earth') {
        ctx.fillStyle = '#6a4a2e'; ctx.strokeStyle = '#1c120a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-w * 0.9, h * 0.5);
        for (let i = 0; i < 6; i++) { const xx = -w * 0.9 + (i + 0.5) * w * 0.3, hh = h * (0.4 + (i / 5) * 0.9) * (0.8 + 0.3 * Math.sin(t * 0.9 + i * 2)); ctx.lineTo(xx - w * 0.08, h * 0.5 - hh); ctx.lineTo(xx + w * 0.1, h * 0.5 - hh * 0.4); }
        ctx.lineTo(w * 0.9, h * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffd98a'; ctx.globalAlpha = 0.6; ctx.fillRect(-w * 0.9, h * 0.42, w * 1.8, 6);
      } else {
        ctx.rotate(t * 0.5);
        for (let i = 0; i < 2; i++) { ctx.rotate(Math.PI); ctx.fillStyle = i ? '#e9d5ff' : '#8a3bff'; ctx.beginPath(); ctx.moveTo(-w * 0.55, 0); ctx.quadraticCurveTo(0, -h * 0.9, w * 0.55, 0); ctx.quadraticCurveTo(0, -h * 0.3, -w * 0.55, 0); ctx.fill(); }
      }
      ctx.restore();
    }
    render(ctx) {
      const o = this.o, [a, b] = this.f, cam = this.camX;
      ctx.save();
      if (this.shakeAmt) ctx.translate(FF.rand(-1, 1) * this.shakeAmt, FF.rand(-1, 1) * this.shakeAmt);
      FF.drawStage(ctx, this.stage, cam, this.tick);
      ctx.translate(-cam, 0);
      if (this.superFreeze > 0) {
        const s = this.superBy, k = this.superFreeze / 30;
        ctx.fillStyle = 'rgba(4,2,18,.72)'; ctx.fillRect(cam - 20, -20, W + 40, H + 40);
        ctx.save(); ctx.translate(s.x, G - 110); ctx.strokeStyle = FF.rgba(s.c.color, 0.7); ctx.lineWidth = 3;
        for (let i = 0; i < 40; i++) { const an = i * 0.157 + this.tick * 0.02, r0 = 110 + ((i * 37 + this.tick * 14) % 200); ctx.beginPath(); ctx.moveTo(Math.cos(an) * r0, Math.sin(an) * r0); ctx.lineTo(Math.cos(an) * (r0 + 120), Math.sin(an) * (r0 + 120)); ctx.stroke(); }
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 6 * k; ctx.beginPath(); ctx.arc(0, 0, (1 - k) * 420, 0, 7); ctx.stroke(); ctx.restore();
      }
      a.drawShadow(ctx); b.drawShadow(ctx); a.drawTrail(ctx); b.drawTrail(ctx);
      const front = b.state === 'attack' && a.state !== 'attack' ? b : a, back = front === a ? b : a;
      back.draw(ctx); front.draw(ctx);
      for (const p of this.projs) this.drawProj(ctx, p);
      this.fx.draw(ctx);
      if (FF.settings.hitboxes && !o.attract) this.drawBoxes(ctx);
      ctx.restore();
      if (!o.attract) this.drawHUD(ctx);
      if (this.superFreeze > 0) { const k = FF.easeOut((30 - this.superFreeze) / 8); T(ctx, this.superName, W / 2, 150, 68, { scale: 0.6 + 0.4 * k, colors: ['#fff', '#ffe27a', this.superBy.c.color], glow: this.superBy.c.color }); }
      for (const bn of this.banners) {
        const k = FF.easeBack(bn.t / 9), out = FF.clamp((bn.dur - bn.t) / 8, 0, 1);
        T(ctx, bn.txt, W / 2, bn.y, bn.size, { scale: (0.3 + 0.7 * k) * (1 + (1 - out) * 0.5), alpha: out, colors: bn.colors });
      }
      if (this.flashA > 0.02) { ctx.fillStyle = `rgba(255,255,255,${this.flashA})`; ctx.fillRect(0, 0, W, H); }
    }
    drawBoxes(ctx) {
      ctx.lineWidth = 2;
      for (const f of this.f) {
        const h = f.hurtbox(); if (h) { ctx.strokeStyle = '#3f8'; ctx.fillStyle = 'rgba(60,255,130,.15)'; ctx.fillRect(h.x0, h.y0, h.x1 - h.x0, h.y1 - h.y0); ctx.strokeRect(h.x0, h.y0, h.x1 - h.x0, h.y1 - h.y0); }
        for (const b of f.hitBoxes()) { ctx.strokeStyle = '#f33'; ctx.fillStyle = 'rgba(255,50,50,.3)'; ctx.fillRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); }
      }
    }
    drawHUD(ctx) {
      const o = this.o;
      ctx.save();
      for (let i = 0; i < 2; i++) {
        const f = this.f[i], dir = i ? -1 : 1, x0 = i ? W - 36 : 36, bw = 372, bh = 26, y = 26;
        ctx.save(); ctx.translate(x0, y); ctx.scale(dir, 1);
        // portrait
        ctx.fillStyle = '#140a1e'; ctx.fillRect(-6, -8, 62, 62); ctx.save(); ctx.translate(-2, -4); ctx.scale(1, 1); FF.drawPortrait(ctx, f.c, 54); ctx.restore();
        ctx.strokeStyle = f.c.color; ctx.lineWidth = 3; ctx.strokeRect(-2, -4, 54, 54);
        // barre de vie (parallélogramme)
        const bx = 62, par = (w, col, hh, yy) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(bx + bw - w + 8, yy || 0); ctx.lineTo(bx + bw + 8, yy || 0); ctx.lineTo(bx + bw, (yy || 0) + (hh || bh)); ctx.lineTo(bx + bw - w, (yy || 0) + (hh || bh)); ctx.fill(); };
        ctx.transform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#140a1e'; ctx.beginPath(); ctx.moveTo(bx - 4 + 8, -4); ctx.lineTo(bx + bw + 13, -4); ctx.lineTo(bx + bw + 4, bh + 4); ctx.lineTo(bx - 5, bh + 4); ctx.fill();
        par(bw, '#4a0f1e'); par(bw * FF.clamp(f.hpLag / f.maxHp, 0, 1), '#ff3d3d');
        const r = FF.clamp(f.hp / f.maxHp, 0, 1); const g = ctx.createLinearGradient(0, 0, 0, bh); g.addColorStop(0, r < 0.25 ? '#ffb02e' : '#fff7a0'); g.addColorStop(0.5, r < 0.25 ? '#ff5a1f' : '#ffd23a'); g.addColorStop(1, r < 0.25 ? '#c8001e' : '#7dff6a');
        par(bw * r, g); par(bw * r, 'rgba(255,255,255,.35)', 5, 3);
        // manches gagnées
        for (let k = 0; k < this.rounds; k++) { ctx.beginPath(); ctx.arc(bx + bw - 12 - k * 24, bh + 20, 8, 0, 7); ctx.fillStyle = k < f.wins ? '#ffd23a' : '#140a1e'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke(); }
        // jauge de super (sous la barre de vie : reste visible derrière les boutons tactiles)
        const k = f.meter / 100, full = f.meter >= 100, mx = bx + 168, mw = 132, my = bh + 13;
        ctx.fillStyle = '#140a1e'; ctx.fillRect(mx - 3, my - 3, mw + 6, 18); ctx.fillStyle = '#2a1d44'; ctx.fillRect(mx, my, mw, 12);
        ctx.fillStyle = full ? (this.tick % 10 < 5 ? '#fff' : f.c.color) : f.c.color; ctx.fillRect(mx + mw * (1 - k), my, mw * k, 12);
        ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(mx + mw * (1 - k), my + 2, mw * k, 3);
        ctx.restore();
        ctx.save(); ctx.font = `900 26px ${FF.FONT}`; const nw = ctx.measureText(f.c.name).width; ctx.restore();
        T(ctx, f.c.name, i ? W - 104 : 104, y + 44, 26, { align: i ? 'right' : 'left', colors: ['#fff', '#fff', '#ddd'], scale: Math.min(1, 118 / nw) });
        T(ctx, full ? 'SUPER PRÊT !' : 'SUPER', i ? W - 36 - mx - mw / 2 : 36 + mx + mw / 2, y + my + 6.5, full ? 13 : 12, { colors: full ? ['#140a1e', '#140a1e', '#140a1e'] : ['#fff', '#eee', '#ccc'], stroke: full ? 'rgba(255,255,255,.9)' : '#140a1e' });
        // compteur de combo
        const c = this.cshow[i];
        if (c) {
          const pop = c.pop ? 1 + (c.pop-- / 8) * 0.5 : 1, al = Math.min(1, c.t / 12), cx = i ? W - 60 : 60, al2 = i ? 'right' : 'left';
          T(ctx, c.n + ' COUPS', cx, 150, 52, { align: al2, scale: pop, alpha: al });
          T(ctx, c.dmg + ' dégâts', cx, 192, 22, { align: al2, alpha: al, colors: ['#fff', '#fff', '#bbb'] });
          if (c.praise) T(ctx, c.praise, cx, 228, 34, { align: al2, alpha: al, colors: ['#fff', '#8ff7ff', '#2aa8ff'] });
        }
      }
      // chrono
      const tt = o.training ? '∞' : String(Math.max(0, Math.ceil(this.timer / 60)));
      ctx.fillStyle = '#140a1e'; ctx.beginPath(); ctx.moveTo(W / 2 - 40, 14); ctx.lineTo(W / 2 + 40, 14); ctx.lineTo(W / 2 + 30, 70); ctx.lineTo(W / 2 - 30, 70); ctx.fill();
      T(ctx, tt, W / 2, 44, 46, { colors: this.timer < 600 && !o.training ? ['#fff', '#ff9d2e', '#ff2a2a'] : undefined });
      if (o.training) T(ctx, 'ENTRAÎNEMENT', W / 2, 106, 20, { colors: ['#fff', '#8ff7ff', '#2aa8ff'] });
      ctx.restore();
    }
  }
  FF.Fight = Fight;

  // portrait carré d'un personnage (sprite ou squelette)
  FF.drawPortrait = function (ctx, char, size) {
    const p = FF.Sprites.portrait(char.id);
    ctx.fillStyle = FF.shade(char.color, -0.55); ctx.fillRect(0, 0, size, size);
    if (p) ctx.drawImage(p, 0, 0, size, size); else FF.Rig.portrait(ctx, char.look, size);
  };
})();
