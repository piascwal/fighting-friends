/* Combattant : machine à états, tampon d'entrées, manipulations (quarts de cercle), annulations/combos */
(function () {
  const FF = window.FF, Rig = FF.Rig, P = FF.POSES;
  const BUF = 12;         // frames pendant lesquelles un appui reste en mémoire
  const HIT_STATES = { hitstun: 1, airhit: 1 };

  class Fighter {
    constructor(char, idx, ctrl) {
      this.c = char; this.idx = idx; this.ctrl = ctrl; this.moves = char.moves; this.st = char.stats;
      this.spr = FF.usesSprites(char); this.scaleH = this.spr ? 1 : char.look.h || 1;
      this.maxHp = this.st.hp; this.power = this.st.power; this.meter = 0; this.wins = 0;
      this.pose = Rig.clone('idle'); this.tmp = Rig.clone('idle'); this.w = null;
      this.reset(0, 1);
    }
    reset(x, facing) {
      Object.assign(this, { x, y: 0, vx: 0, vy: 0, facing, hp: this.maxHp, hpLag: this.maxHp, state: 'neutral', t: 0, ft: 0, move: null,
        crouching: false, combo: 0, comboDmg: 0, juggle: 0, stun: 0, now: 0, dirHist: [{ d: 5, f: 0 }], btnBuf: [], dashReq: 0, trail: [],
        flash: 0, shake: 0, airAtk: 0, chain: 0, visible: true, connected: false, walkPh: 0, guard: false, dur: 0, hitDone: {}, armorLeft: 0, clk: 0, used: {}, cmd: null });
      this.setPose('idle', 1); Rig.approach(this.pose, P.idle, 1);
    }
    get grounded() { return this.y >= 0; }
    inHit() { return !!HIT_STATES[this.state]; }
    setState(s) { this.state = s; this.t = 0; if (s !== 'attack') { this.move = null; this.visible = true; } if (s === 'neutral') { this.juggle = 0; this.chain = 0; } }
    setPose(name, rate, spr) { this.target = P[name]; this.rate = rate || 0.35; this.sprKey = spr || FF.POSE_SPRITE[name] || 'idle'; }
    faceOpp() { const o = this.opp; if (o && Math.abs(o.x - this.x) > 4) this.facing = o.x > this.x ? 1 : -1; }

    /* ---------- lecture des entrées (appelée à chaque frame, même pendant l'arrêt sur image) ---------- */
    readInput() {
      const c = this.ctrl; this.now++;
      const d = 5 + c.x * this.facing - 3 * c.y, h = this.dirHist, last = h[h.length - 1];
      if (d !== last.d) {
        h.push({ d, f: this.now }); if (h.length > 24) h.shift();
        const n = h.length;
        if ((d === 6 || d === 4) && n >= 3 && h[n - 2].d === 5 && h[n - 3].d === d && this.now - h[n - 2].f <= 9 && h[n - 2].f - h[n - 3].f <= 14) this.dashReq = d === 6 ? 1 : -1, this.dashF = this.now;
      }
      for (const b of c.pressed) this.btnBuf.push({ b, f: this.now, c: this.clk });
      if (this.btnBuf.length > 12) this.btnBuf.splice(0, this.btnBuf.length - 12);
      if (c.cmds.length) { this.cmd = { m: c.cmds[c.cmds.length - 1], c: this.clk }; c.cmds.length = 0; }
      if (this.dashReq && this.now - this.dashF > 6) this.dashReq = 0;
    }
    // la suite de directions a-t-elle été faite juste avant l'appui ? (ex. [2,6] = quart de cercle avant)
    motion(seq, pf) {
      const h = this.dirHist; let need = seq.length - 1, lastF = 0;
      for (let i = h.length - 1; i >= 0 && need >= 0; i--) {
        const e = h[i];
        if (e.d === seq[need]) {
          if (need === seq.length - 1) { const until = i + 1 < h.length ? h[i + 1].f : this.now; if (until < pf - 11) return false; }
          else if (lastF - e.f > 18) return false;
          lastF = e.f; need--;
        } else if (pf - e.f > 60) return false;
      }
      return need < 0;
    }
    /* Quel coup pour cet appui ? Un seul bouton à la fois :
       - manipulation + bouton (quart de cercle, ↓↓) ;
       - ou "même bouton fort deux fois" en combo : B puis B = spécial 1, D puis D = spécial 2,
         puis encore B ou D = SUPER si la jauge est pleine. */
    decide(e) {
      const b = e.b, air = !this.grounded, punch = b === 'lp' || b === 'hp', heavy = b === 'hp' || b === 'hk';
      if (air) return 'j' + b;
      const cur = this.state === 'attack' ? this.move : null, ok = (id) => (this.canStart(id) ? id : null);
      if (this.meter >= 100 && punch && (this.motion([2, 6, 2, 6], e.f) || this.motion([2, 3, 2, 3], e.f) || this.motion([2, 5, 2], e.f))) return 'super';
      if (cur && this.connected) {
        if (heavy && cur.rank === 10 && this.meter >= 100) return 'super';
        if (b === 'hp' && (cur.id === 'hp' || cur.id === 'fhp')) { const s = ok('s1h'); if (s) return s; }
        if (b === 'hk' && (cur.id === 'hk' || cur.id === 'chk')) { const s = ok('s2h'); if (s) return s; }
      }
      if (punch && (this.motion([2, 6], e.f) || this.motion([2, 3], e.f))) { const s = ok(b === 'hp' ? 's1h' : 's1l'); if (s) return s; }
      if (!punch && (this.motion([2, 4], e.f) || this.motion([2, 1], e.f))) { const s = ok(b === 'hk' ? 's2h' : 's2l'); if (s) return s; }
      if (this.ctrl.y > 0) return 'c' + b;
      if (b === 'hp' && this.ctrl.x * this.facing > 0 && !cur) return 'fhp';
      return b;
    }
    canStart(id) {
      const m = this.moves[id]; if (!m) return false;
      if (m.cost && this.meter < m.cost) return false;
      if (m.proj && this.w && this.w.hasProj(this)) return false;
      const air = !this.grounded; if (!!m.air !== air) return false;
      const S = this.state;
      if (S === 'neutral' || (S === 'dash' && this.dashDir > 0 && this.t >= 2)) return true;
      if (S === 'air') return this.airAtk < 4;
      if (S === 'attack') {
        const cur = this.move;
        if (!this.connected || cur.rank >= 20) return false;      // on n'enchaîne que si le coup a touché (ou a été bloqué)
        if (m.rank > cur.rank && m.rank >= 10) return true;        // normal ▸ spécial ▸ super
        if (cur.rank >= 10) return false;
        if (m.id === cur.id) return m.rank <= 2 && this.chain < 2; // coups légers répétables (A A A)
        return !this.used[m.id];                                    // chaque coup normal une fois par enchaînement, dans n'importe quel ordre
      }
      return false;
    }
    tryAttack() {
      if (this.cmd && this.clk - this.cmd.c <= 12) {
        const id = this.cmd.m;
        if (id === 'dashF' || id === 'dashB') { if (this.state === 'neutral') { this.dashDir = id === 'dashF' ? 1 : -1; this.cmd = null; this.setState('dash'); return true; } }
        else if (this.canStart(id)) { this.cmd = null; this.startMove(id); return true; }
      }
      const bb = this.btnBuf; let e = null;
      for (let i = bb.length - 1; i >= 0; i--) if (!bb[i].used && this.clk - bb[i].c <= BUF) { e = bb[i]; break; }
      if (!e) return false;
      const id = this.decide(e);
      if (id && this.canStart(id)) { for (const o of bb) if (o.c <= e.c) o.used = true; this.startMove(id); return true; }
      return false;
    }
    startMove(id) {
      const m = this.moves[id], prev = this.move;
      if (this.grounded && this.state !== 'attack') this.faceOpp();
      const chaining = this.state === 'attack';
      this.chain = chaining && prev && prev.id === m.id ? this.chain + 1 : 0;
      if (!chaining) this.used = {}; this.used[m.id] = true;
      this.state = 'attack'; this.move = m; this.t = 0; this.hitDone = {}; this.connected = false; this.visible = true;
      this.armorLeft = m.armor ? 1 : 0; this.crouching = !!m.low;
      if (m.cost) this.meter -= m.cost;
      if (m.air) this.airAtk++; else if (this.grounded) this.vx = 0;
      if (m.flash && this.w) this.w.superFlash(this, m);
      if (m.rank >= 10) { this.meter = Math.min(100, this.meter + (m.cost ? 0 : 3)); FF.Audio.play(m.sfx); }
      this.anim(0);
    }
    anim(t) { const m = this.move; for (const k of m.anim) if (k[0] === t) this.setPose(k[1], k[2], k[1].startsWith('wind') || k[1] === 'idle' || k[1] === 'crouch' || k[1] === 'charge' ? null : m.sprite); }
    teleport(mode) {
      const o = this.opp, w = this.w; w.fx.dust(this.x, FF.GROUND, 0, 8);
      if (mode === 'near') { this.x = o.x - this.facing * 88; }
      else { const side = mode === 'behind' ? 1 : -1; this.x = o.x + side * this.facing * 80; this.y = -250; this.faceOpp(); this.vx = this.facing * 5.5; this.vy = 12; }
      this.x = FF.clamp(this.x, 40, FF.STAGE_W - 40); w.fx.dust(this.x, FF.GROUND + this.y, 0, 8); FF.Audio.play('slash');
    }

    /* ---------- une frame de logique ---------- */
    update(opp) {
      this.opp = opp; this.ft = this.t; this.clk++; if (this.flash > 0) this.flash--;
      this.guard = false;
      this['s_' + this.state]();
      this.t++;
      this.x += this.vx;
      if (this.y < 0 || this.vy < 0) {
        this.vy += this.state === 'airhit' ? 0.95 + 0.09 * this.juggle : 1.15; this.y += this.vy;
        if (this.y >= 0) { this.y = 0; this.vy = 0; this.land(); }
      }
      this.x = FF.clamp(this.x, 40, FF.STAGE_W - 40);
      this.updatePose();
      if ((this.state === 'attack' && this.move.trail) || this.state === 'dash') { if (this.now % 2 === 0) this.trail.push({ x: this.x, y: this.y, f: this.facing, pose: Object.assign({}, this.pose), spr: this.sprKey, life: 9 }); }
      for (let i = this.trail.length - 1; i >= 0; i--) if (--this.trail[i].life <= 0) this.trail.splice(i, 1);
    }
    land() {
      const w = this.w, S = this.state;
      if (S === 'airhit') { this.setState('down'); this.setPose('down', 0.6); this.vx *= 0.5; w.shake(6); w.fx.dust(this.x, FF.GROUND, 0, 9); FF.Audio.play('land'); }
      else if (S === 'attack' && !this.move.air) { this.dur = this.move.landRec || 6; this.setState('recover'); this.setPose('crouch', 0.5); this.vx = 0; w.fx.dust(this.x, FF.GROUND, 0, 5); }
      else if (S === 'air' || S === 'attack') { this.setState('neutral'); this.vx = 0; w.fx.dust(this.x, FF.GROUND, 0, 4); FF.Audio.play('land'); }
    }
    s_neutral() {
      this.faceOpp();
      if (this.tryAttack()) return;
      const c = this.ctrl, rx = c.x * this.facing, o = this.opp;
      if (this.dashReq) { this.dashDir = this.dashReq; this.dashReq = 0; this.setState('dash'); return; }
      if (c.y < 0) { this.jumpDir = c.x; this.crouching = false; this.setState('jumpsquat'); this.setPose('crouch', 0.5, 'idle'); this.vx = 0; return; }
      // garde visible quand on recule alors que l'adversaire attaque
      this.guard = rx < 0 && o && (o.state === 'attack' && Math.abs(o.x - this.x) < 300 || this.w.projNear(this));
      if (c.y > 0) { this.crouching = true; this.vx = 0; }
      else { this.crouching = false; this.vx = this.guard ? 0 : rx > 0 ? this.st.speed * this.facing : rx < 0 ? -this.st.speed * 0.8 * this.facing : 0; }
      if (this.vx) this.walkPh += 0.27 * rx;
    }
    s_jumpsquat() {
      if (this.t >= 2) { this.vy = -this.st.jump; this.vx = this.jumpDir * this.st.speed * 1.1; this.y = -1; this.airAtk = 0; this.setState('air'); this.setPose('jump', 0.4); FF.Audio.play('jump'); this.w.fx.dust(this.x, FF.GROUND, 0, 4); }
    }
    s_air() { this.tryAttack(); }
    s_recover() { if (this.t >= this.dur) this.setState('neutral'); }
    s_attack() {
      const m = this.move, t = this.t, w = this.w;
      if (t > 0) this.anim(t);
      if (m.vel) { let on = false; for (const v of m.vel) if (t >= v[0] && t < v[1]) { this.vx = v[2] * this.facing; on = true; } if (!on && this.grounded) this.vx *= 0.7; }
      else if (this.grounded) this.vx *= 0.8;
      if (m.imp && t === m.imp[0]) { this.vx = m.imp[1] * this.facing; this.vy = m.imp[2]; this.y = -1; w.fx.dust(this.x, FF.GROUND, 0, 6); }
      if (m.proj && t === m.proj.t) w.spawnProj(this, m.proj);
      if (m.tele && t === m.tele.t) this.teleport(m.tele.mode);
      if (m.shakeAt === t) { w.shake(12); FF.Audio.play('earth'); w.fx.hit(this.x + this.facing * 60, FF.GROUND - 6, 'earth', 80, this.facing); }
      if (m.hits) for (const h of m.hits) if (h.t === t) { w.fx.swoosh(this, h.box, h.sw, this.c.color); if (m.rank < 10 || h === m.hits[0]) FF.Audio.play('whoosh'); }
      this.visible = !(m.vanish && t >= m.vanish[0] && t < m.vanish[1]);
      if (m.jc && this.connected && this.ctrl.y < 0 && this.grounded) { this.jumpDir = this.ctrl.x; this.setState('jumpsquat'); this.t = 2; return; }
      if (this.tryAttack()) return;
      if (t >= m.total) { if (this.grounded) this.setState('neutral'); else { this.setState('air'); this.setPose('jump', 0.3); } }
    }
    s_hitstun() { this.vx *= 0.8; if (this.t >= this.stun) { this.vx = 0; this.setState('neutral'); } }
    s_blockstun() { this.vx *= 0.86; if (this.t >= this.stun) { this.vx = 0; this.setState('neutral'); } }
    s_airhit() {}
    s_down() { this.vx *= 0.8; if (this.hp > 0 && this.t >= 24 && !this.w.roundOver) { this.setState('getup'); this.setPose('getup', 0.35); } }
    s_getup() { this.vx = 0; if (this.t >= 11) this.setState('neutral'); }
    s_dash() {
      const fwd = this.dashDir > 0, sp = this.st.speed;
      if (this.t === 0) { this.setPose(fwd ? 'dashF' : 'dashB', 0.6); this.w.fx.dust(this.x, FF.GROUND, this.facing * this.dashDir, 6); FF.Audio.play('whoosh'); }
      this.vx = this.facing * this.dashDir * (this.t < 9 ? sp * (fwd ? 2.5 : 2.3) : sp);
      if (fwd && this.t >= 2 && this.tryAttack()) return;
      if (this.t >= (fwd ? 12 : 14)) { this.vx = 0; this.setState('neutral'); }
    }
    s_lock() { this.vx *= 0.8; }

    updatePose() {
      let tg = this.target, rate = this.rate;
      if (this.state === 'neutral') {
        if (this.crouching) { tg = this.guard ? P.crouchBlock : P.crouch; this.sprKey = this.guard ? 'crouch_block' : 'crouch'; rate = 0.4; }
        else if (this.guard) { tg = P.block; this.sprKey = 'block'; rate = 0.4; }
        else if (this.vx) { const k = (Math.sin(this.walkPh) + 1) / 2; tg = Rig.mix(P.walkA, P.walkB, k, this.tmp); tg.aF0 = P.idle.aF0; tg.aF1 = P.idle.aF1; tg.aB0 = P.idle.aB0; tg.aB1 = P.idle.aB1; this.sprKey = k > 0.5 ? 'walk2' : 'walk1'; rate = 0.5; }
        else { tg = Rig.mix(P.idle, P.idle2, (Math.sin(this.now * 0.09) + 1) / 2, this.tmp); this.sprKey = 'idle'; rate = 0.3; }
      } else if (this.state === 'hitstun' && this.t > this.stun - 5) { tg = this.crouching ? P.crouch : P.idle; rate = 0.3; }
      Rig.approach(this.pose, tg, rate);
    }

    /* ---------- boîtes de collision ---------- */
    invuln() {
      const S = this.state, m = this.move;
      if (S === 'down' || S === 'getup' || S === 'lock' || this.juggle >= 8) return true;
      if (S === 'dash' && this.dashDir < 0 && this.t < 8) return true;
      return !!(S === 'attack' && m.inv && this.ft >= m.inv[0] && this.ft < m.inv[1]);
    }
    hurtbox() {
      if (this.invuln()) return null;
      const s = this.scaleH, S = this.state, gy = FF.GROUND + this.y;
      const low = this.crouching && (S === 'neutral' || S === 'attack' || S === 'hitstun' || S === 'blockstun') || S === 'recover';
      if (!this.grounded) return { x0: this.x - 30 * s, x1: this.x + 30 * s, y0: gy - 185 * s, y1: gy - 30 * s };
      return { x0: this.x - 30 * s, x1: this.x + 30 * s, y0: gy - (low ? 132 : 192) * s, y1: gy };
    }
    hitBoxes() {
      if (this.state !== 'attack' || !this.move.hits) return [];
      const out = [], s = this.scaleH, gy = FF.GROUND + this.y;
      this.move.hits.forEach((h, i) => {
        if (this.hitDone[i] || this.ft < h.t || this.ft >= h.t + h.d) return;
        const b = h.box, xa = this.x + this.facing * b[0] * s, xb = this.x + this.facing * (b[0] + b[2]) * s;
        out.push({ i, h, x0: Math.min(xa, xb), x1: Math.max(xa, xb), y0: gy + b[1] * s, y1: gy + (b[1] + b[3]) * s });
      });
      return out;
    }
    wantsBlock(srcX, h) {
      if (!(this.state === 'neutral' || this.state === 'blockstun') || !this.grounded) return null;
      let crouch;
      if (this.ctrl.ai) { const r = this.ctrl.ai.wantBlock(this, h); if (!r) return null; crouch = r === 'crouch'; }
      else { const away = this.x >= srcX ? 1 : -1; if (this.ctrl.x !== away) return null; crouch = this.ctrl.y > 0; }
      if (h.lvl === 'low' && !crouch) return null;
      if (h.lvl === 'high' && crouch) return null;
      return crouch ? 'crouch' : 'stand';
    }
    /* Reçoit un coup. Retourne 'hit' | 'block' | 'armor' | null */
    takeHit(att, h, dir, special) {
      if (this.invuln()) return null;
      const base = h.dmg * att.power;
      if (this.state === 'attack' && this.move.armor && this.armorLeft > 0 && this.ft >= this.move.armor[0] && this.ft < this.move.armor[1]) {
        this.armorLeft--; this.hp = Math.max(1, this.hp - Math.round(base * 0.5)); this.flash = 6; return 'armor';
      }
      const bl = this.wantsBlock(att.x, h);
      if (bl) {
        if (special) this.hp = Math.max(1, this.hp - Math.round(base * 0.12));
        this.crouching = bl === 'crouch'; this.stun = h.bs; this.setState('blockstun'); this.vx = dir * (h.kb + 2) * 0.9;
        this.setPose(this.crouching ? 'crouchBlock' : 'block', 0.7); return 'block';
      }
      const was = this.inHit();
      const dmg = Math.max(1, Math.round(base * Math.max(0.3, 1 - 0.1 * (was ? att.combo : 0))));
      att.combo = was ? att.combo + 1 : 1; att.comboDmg = (was ? att.comboDmg : 0) + dmg;
      this.hp -= dmg; this.lastDmg = dmg; this.flash = 6; this.visible = true;
      const air = !this.grounded || this.state === 'airhit';
      let launch = h.launch || (air ? [Math.max(2, h.kb * 0.5), -8] : null);
      if (this.hp <= 0) { this.hp = 0; launch = [Math.max(7, launch ? launch[0] : 7), Math.min(-12, launch ? launch[1] : -12)]; }
      if (launch) {
        this.juggle = this.state === 'airhit' ? this.juggle + 1 : 0;
        this.vx = dir * launch[0]; this.vy = launch[1] * Math.max(0.45, 1 - 0.12 * this.juggle); this.y = Math.min(this.y, -1);
        this.crouching = false; this.setState('airhit'); this.setPose('fall', 0.5);
      } else {
        this.stun = h.hs; this.vx = dir * h.kb; const lowHit = h.box && h.box[1] + h.box[3] / 2 > -95;
        if (this.state !== 'hitstun' && this.state !== 'neutral' && this.state !== 'blockstun') this.crouching = this.state === 'attack' ? this.crouching : false;
        this.setState('hitstun'); this.setPose(lowHit || this.crouching ? 'hitLow' : 'hit', 0.8);
      }
      return 'hit';
    }

    /* ---------- rendu ---------- */
    drawShadow(ctx) {
      const k = FF.clamp(1 + this.y / 400, 0.4, 1);
      ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(this.x, FF.GROUND + 2, 54 * k * this.scaleH, 9 * k, 0, 0, 7); ctx.fill();
    }
    drawTrail(ctx) {
      for (const g of this.trail) {
        const a = (g.life / 9) * 0.45;
        if (this.spr) FF.Sprites.draw(ctx, this.c, g.spr, g.x, FF.GROUND + g.y, g.f * (g.pose.flip ? -1 : 1), { alpha: a, flash: true });
        else Rig.draw(ctx, this.c.look, g.pose, g.x, FF.GROUND + g.y, g.f, { sil: this.c.color, alpha: a });
      }
    }
    draw(ctx) {
      if (!this.visible) return;
      const sh = this.shake > 0 ? (this.now % 2 ? 3 : -3) : 0, gx = this.x + sh, gy = FF.GROUND + this.y, fl = this.flash > 2;
      if (!this.spr) { Rig.draw(ctx, this.c.look, this.pose, gx, gy, this.facing, { flash: fl, time: this.now }); return; }
      // sprites : une image par pose, animée par étirements / inclinaisons
      let sx = 1, sy = 1, rot = 0, dx = 0, dy = 0; const S = this.state, m = this.move;
      if (S === 'neutral') { if (this.vx) dy = -Math.abs(Math.sin(this.walkPh)) * 5; else sy = 1 + Math.sin(this.now * 0.09) * 0.012; }
      else if (S === 'attack') {
        const first = m.hits ? m.hits[0].t : m.proj ? m.proj.t : 8, t = this.ft;
        if (t < first) { const k = t / first; dx = -10 * k; rot = -4 * k; sx = 1 - 0.03 * k; }
        else if (t < first + 7) { dx = 12; rot = 3; sx = 1.06; sy = 0.97; }
      } else if (S === 'hitstun') { rot = this.sprKey === 'hit' && !FF.Sprites.has(this.c.id, 'hit') ? -10 : -3; }
      else if (S === 'air') { sy = 1 + FF.clamp(-this.vy * 0.005, -0.04, 0.07); sx = 2 - sy; }
      else if (S === 'jumpsquat' || S === 'recover') { sy = 0.86; sx = 1.08; }
      else if (S === 'dash') rot = this.dashDir > 0 ? 8 : -6;
      FF.Sprites.draw(ctx, this.c, this.sprKey, gx + dx * this.facing, gy + dy, this.facing * (this.pose.flip ? -1 : 1), { flash: fl, sx, sy, rot });
    }
  }
  FF.Fighter = Fighter;

  // dessine un personnage dans une pose fixe (menus, écran versus, fin...)
  FF.drawChar = function (ctx, char, poseName, x, y, facing, scale, time, opt) {
    opt = opt || {};
    if (FF.usesSprites(char)) {
      const key = FF.POSE_SPRITE[poseName] || poseName, sy = 1 + Math.sin((time || 0) * 0.08) * 0.012;
      FF.Sprites.draw(ctx, char, key, x, y, facing, Object.assign({ scale, sy }, opt));
    } else {
      let p = P[poseName];
      if (poseName === 'idle') p = Rig.mix(P.idle, P.idle2, (Math.sin((time || 0) * 0.09) + 1) / 2, FF.drawChar.tmp || (FF.drawChar.tmp = Rig.clone('idle')));
      Rig.draw(ctx, char.look, p, x, y, facing, Object.assign({ scale, time }, opt));
    }
  };
})();
