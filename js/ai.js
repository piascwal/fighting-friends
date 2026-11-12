/* Adversaire contrôlé par la console */
(function () {
  const FF = window.FF, R = Math.random;
  const lv = (arr, l) => { l = FF.clamp(l, 0, 3); const i = Math.floor(l), k = l - i; return arr[i] + ((arr[Math.min(3, i + 1)] - arr[i]) * k); };
  const ROUTE = { lp: ['lk', 'lp'], clp: ['clk'], lk: ['hp'], clk: ['hp'], hp: ['END', 'hk'], hk: ['END'], jlp: ['jlk'], jlk: ['jhk'], jhp: ['jhk'] };

  class AI {
    constructor(level, opt) {
      this.level = level; this.dummy = opt && opt.dummy; this.timer = 20; this.plan = { x: 0, y: 0 };
      this.react = lv([28, 17, 11, 7], level); this.block = lv([0.12, 0.38, 0.6, 0.82], level);
      this.combo = lv([0.12, 0.45, 0.72, 0.92], level); this.aggr = lv([0.38, 0.52, 0.66, 0.8], level); this.spec = lv([0.15, 0.3, 0.45, 0.6], level);
    }
    wantBlock(me, h) {
      if (this.dummy) return null;
      let p = this.block; if (me.state === 'blockstun') p = Math.max(p, 0.85); if (this.plan.x * me.facing < 0) p += 0.2;
      if (R() > p) return null;
      const smart = R() < 0.45 + this.level * 0.17;
      if (h.lvl === 'low') return smart ? 'crouch' : 'stand';
      if (h.lvl === 'high') return smart ? 'stand' : 'crouch';
      return R() < 0.5 ? 'stand' : 'crouch';
    }
    think(me, opp, w) {
      const c = me.ctrl; c.x = 0; c.y = 0;
      if (this.dummy || w.phase !== 'fight') return;
      const dx = opp.x - me.x, dist = Math.abs(dx), fwd = dx >= 0 ? 1 : -1, t = me.c.tpl.ai, r = R();
      // suite de combo quand un coup touche
      if (me.state === 'attack') {
        if (this.lastMove !== me.move) { this.lastMove = me.move; this.rolled = false; }
        if (me.connected && !this.rolled) {
          this.rolled = true; const id = me.move.id, hitOk = opp.inHit();
          if (hitOk && R() < this.combo) {
            if (me.move.rank >= 10 && me.move.rank < 20) { if (me.meter >= 100 && R() < 0.6) c.cmds.push('super'); }
            else if (ROUTE[id]) { let n = FF.pick(ROUTE[id]); if (n === 'END') n = me.meter >= 100 && R() < 0.35 ? 'super' : t.ender; c.cmds.push(n); }
            else if (id === 'chp') this.plan = { x: fwd, y: -1, type: 'air', until: 30 }, this.timer = 30;
          }
        }
        if (this.plan.type === 'air') { c.x = this.plan.x; c.y = -1; }
        return;
      }
      if (me.state === 'air') {
        c.x = this.plan.x;
        if ((this.plan.type === 'jumpin' && me.vy > 1 && dist < 170) || (this.plan.type === 'air' && dist < 150 && Math.abs(opp.y - me.y) < 120)) { c.cmds.push(R() < 0.5 ? 'jhk' : 'jlp'); if (this.plan.type === 'jumpin') this.plan.type = ''; }
        return;
      }
      if (me.state !== 'neutral') { c.x = this.plan.x; return; }
      if (--this.timer > 0) { c.x = this.plan.x; c.y = this.plan.y; if (this.plan.y < 0) this.plan.y = 0; return; }
      this.timer = this.react * (0.6 + R());
      const P = (x, y, type) => { this.plan = { x, y: y || 0, type }; c.x = x; c.y = y || 0; };
      if (w.projNear(me) && r < 0.3 + this.level * 0.15) { if (R() < 0.5) P(fwd, -1, 'jumpin'); else { P(-fwd, 0); this.timer = 24; } return; }
      if (!opp.grounded && dist < 180 && opp.state !== 'airhit' && r < 0.2 + this.level * 0.2) { c.cmds.push(t.antiAir); P(0, 0); return; }
      if (opp.state === 'down' || opp.state === 'getup') { P(dist > 150 ? fwd : -fwd * (R() < 0.5), 0); return; }
      if (me.meter >= 100 && dist < 160 && r < 0.05 + this.level * 0.03) { c.cmds.push('super'); return; }
      if (dist > 330) {
        if (r < t.zoner * (0.5 + this.spec)) { c.cmds.push(R() < 0.5 ? 's1l' : 's1h'); P(0, 0); this.timer += 20; }
        else if (r < 0.72) { P(fwd, 0); this.timer *= 1.6; }
        else if (r < 0.84) { c.cmds.push('dashF'); P(fwd, 0); }
        else if (r < 0.94) P(fwd, -1, 'jumpin'); else P(0, 0);
      } else if (dist > 135) {
        const a = this.aggr;
        if (r < a * 0.5) P(fwd, 0);
        else if (r < a * 0.5 + 0.16) P(fwd, -1, 'jumpin');
        else if (r < a * 0.5 + 0.16 + this.spec * 0.4) { c.cmds.push(t.zoner && R() < 0.6 ? 's1h' : dist < 230 ? FF.pick(['s2l', 's1l', 'fhp']) : 's1l'); P(0, 0); }
        else if (r < 0.9) { P(-fwd, 0); this.timer = 10 + R() * 16; } else P(0, 1);
      } else {
        if (r < this.aggr) { c.cmds.push(FF.pick(['lp', 'lp', 'lk', 'clk', 'clk', 'clp', 'hp', 'hk', 'chk', 'fhp', 'chp', R() < this.spec ? 's2l' : 'lk'])); P(0, 0); this.timer = this.react * 0.7; }
        else if (r < this.aggr + 0.16) { P(-fwd, R() < 0.4 ? 1 : 0); this.timer = 18 + R() * 20; }
        else if (r < this.aggr + 0.24) { c.cmds.push('dashB'); P(-fwd, 0); }
        else P(-fwd, 0);
      }
    }
  }
  FF.AI = AI;
})();
