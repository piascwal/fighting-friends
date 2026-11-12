/* Entrées : clavier, manette, tactile (joystick flottant + 4 boutons multi-touch) */
(function () {
  const FF = window.FF;
  const BTN = ['lp', 'hp', 'lk', 'hk'];

  class Controller {
    constructor() { this.x = 0; this.y = 0; this.held = {}; this.pressed = []; this.cmds = []; this.ai = null; this.queue = []; }
    press(b) { this.queue.push(b); }
    // appelé une fois par frame logique
    step() { this.pressed = this.queue; this.queue = []; }
    clear() { this.x = this.y = 0; this.held = {}; this.pressed = []; this.queue = []; this.cmds = []; }
  }
  FF.Controller = Controller;

  const In = (FF.Input = { p: [new Controller(), new Controller()], twoPlayers: false, touchSeen: false, onPause: null, onAny: null });
  const keys = {};
  // event.code = position physique des touches : fonctionne en AZERTY comme en QWERTY
  const SOLO = { up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
    lp: ['KeyU'], hp: ['KeyI'], lk: ['KeyJ'], hk: ['KeyK'] };
  const DUO = [
    { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], lp: ['KeyF'], hp: ['KeyG'], lk: ['KeyV'], hk: ['KeyB'] },
    { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], lp: ['KeyO', 'Numpad4'], hp: ['KeyP', 'Numpad5'], lk: ['KeyL', 'Numpad1'], hk: ['Semicolon', 'Numpad2'] },
  ];
  const maps = () => (In.twoPlayers ? DUO : [SOLO]);
  const any = (list) => list.some((c) => keys[c]);

  window.addEventListener('keydown', (e) => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.repeat) { if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault(); return; }
    keys[e.code] = true;
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    if ((e.code === 'Escape' || e.code === 'KeyP' && !In.twoPlayers) && In.onPause) In.onPause();
    maps().forEach((m, i) => BTN.forEach((b) => { if (m[b].includes(e.code)) In.p[i].press(b); }));
    if (In.onAny) In.onAny(e);
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  /* ---------- tactile ---------- */
  const touch = { x: 0, y: 0, held: {}, stickId: null, bx: 0, by: 0, btnTouches: {} };
  let layer, stick, knob, pad, btnEls = {}, geo = null;
  const vib = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} };

  function layout() {
    if (!layer) return;
    const r = layer.getBoundingClientRect(), land = window.innerWidth > window.innerHeight;
    const R = land ? FF.clamp(r.height * 0.105, 26, 46) : FF.clamp(r.width * 0.1, 30, 46);
    const S = R * 2.28, mx = land ? Math.max(18, r.width * 0.035) : r.width * 0.06, my = land ? Math.max(14, r.height * 0.07) : Math.max(24, r.height * 0.16);
    // grille 2x2 façon borne : rangée du haut décalée
    const x1 = r.width - mx - R, y1 = r.height - my - R;
    const pos = { lk: [x1 - S - R * 0.35, y1], hk: [x1 - R * 0.35, y1], lp: [x1 - S, y1 - S], hp: [x1, y1 - S] };
    for (const b of BTN) { const el = btnEls[b]; el.style.width = el.style.height = R * 2 + 'px'; el.style.left = pos[b][0] - R + 'px'; el.style.top = pos[b][1] - R + 'px'; el.style.fontSize = R * 0.8 + 'px'; }
    const sr = land ? FF.clamp(r.height * 0.17, 44, 74) : FF.clamp(r.width * 0.16, 48, 70);
    stick.style.width = stick.style.height = sr * 2 + 'px'; knob.style.width = knob.style.height = sr + 'px';
    geo = { r, R, pos, sr, home: [mx + sr + (land ? 10 : 0), r.height - my - sr * 1.1] };
    if (touch.stickId === null) placeStick(geo.home[0], geo.home[1]);
  }
  function placeStick(x, y) { touch.bx = x; touch.by = y; stick.style.left = x - geo.sr + 'px'; stick.style.top = y - geo.sr + 'px'; moveKnob(0, 0); }
  function moveKnob(dx, dy) { knob.style.transform = `translate(${dx}px,${dy}px)`; }

  function stickMove(px, py) {
    let dx = px - touch.bx, dy = py - touch.by; const d = Math.hypot(dx, dy), max = geo.sr;
    if (d > max * 1.35) { // la base suit le pouce : pas besoin de regarder l'écran
      const k = (d - max * 1.35) / d; touch.bx += dx * k; touch.by += dy * k; stick.style.left = touch.bx - geo.sr + 'px'; stick.style.top = touch.by - geo.sr + 'px';
      dx = px - touch.bx; dy = py - touch.by;
    }
    const dd = Math.hypot(dx, dy), k = dd > max ? max / dd : 1; moveKnob(dx * k, dy * k);
    if (dd < max * 0.3) { touch.x = touch.y = 0; return; }
    const a = Math.atan2(dy, dx), oct = Math.round(a / (Math.PI / 4));
    touch.x = [1, 1, 0, -1, -1, -1, 0, 1, 1][(oct + 8) % 8]; touch.y = [0, 1, 1, 1, 0, -1, -1, -1, 0][(oct + 8) % 8];
  }
  // un doigt posé entre deux boutons appuie sur les deux (pour les combinaisons A+B, C+D, B+D)
  function buttonsAt(px, py) {
    const out = []; let best = null, bd = 1e9;
    for (const b of BTN) { const d = Math.hypot(px - geo.pos[b][0], py - geo.pos[b][1]); if (d < geo.R * 1.2) out.push(b); if (d < bd) { bd = d; best = b; } }
    if (!out.length && bd < geo.R * 2.1) out.push(best);
    return out;
  }
  function refreshButtons() {
    const now = {};
    for (const id in touch.btnTouches) for (const b of touch.btnTouches[id]) now[b] = true;
    for (const b of BTN) {
      if (now[b] && !touch.held[b]) { In.p[0].press(b); vib(8); }
      btnEls[b].classList.toggle('on', !!now[b]);
    }
    touch.held = now;
  }
  function onTouch(e) {
    e.preventDefault(); In.touchSeen = true;
    const r = geo.r = layer.getBoundingClientRect();
    for (const t of e.changedTouches) {
      const px = t.clientX - r.left, py = t.clientY - r.top;
      if (e.type === 'touchstart') {
        if (px < r.width * 0.46) { if (touch.stickId === null) { touch.stickId = t.identifier; placeStick(px, py); stick.classList.add('on'); } }
        else touch.btnTouches[t.identifier] = buttonsAt(px, py);
      } else if (e.type === 'touchmove') {
        if (t.identifier === touch.stickId) stickMove(px, py);
        else if (touch.btnTouches[t.identifier]) touch.btnTouches[t.identifier] = buttonsAt(px, py);
      } else {
        if (t.identifier === touch.stickId) { touch.stickId = null; touch.x = touch.y = 0; stick.classList.remove('on'); placeStick(geo.home[0], geo.home[1]); }
        delete touch.btnTouches[t.identifier];
      }
    }
    refreshButtons();
  }
  In.initTouch = function () {
    layer = document.getElementById('touch'); stick = document.getElementById('stick'); knob = document.getElementById('knob'); pad = document.getElementById('pad');
    BTN.forEach((b) => (btnEls[b] = pad.querySelector(`[data-b="${b}"]`)));
    ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach((t) => layer.addEventListener(t, onTouch, { passive: false }));
    window.addEventListener('touchstart', () => { if (!In.touchSeen) { In.touchSeen = true; document.body.classList.add('touch'); layout(); } }, { passive: true });
    if (matchMedia('(pointer: coarse)').matches) { In.touchSeen = true; document.body.classList.add('touch'); }
    layout();
  };
  In.layout = layout;
  In.resetTouch = () => { touch.x = touch.y = 0; touch.stickId = null; touch.btnTouches = {}; touch.held = {}; if (geo) { placeStick(geo.home[0], geo.home[1]); refreshButtons(); } };

  /* ---------- manettes ---------- */
  const padPrev = [{}, {}];
  function readPad(i) {
    const gp = (navigator.getGamepads ? navigator.getGamepads() : [])[i]; if (!gp) return null;
    const o = { x: 0, y: 0, held: {} }, ax = gp.axes, bt = gp.buttons, dn = (n) => bt[n] && bt[n].pressed;
    if (ax[0] < -0.45 || dn(14)) o.x = -1; else if (ax[0] > 0.45 || dn(15)) o.x = 1;
    if (ax[1] < -0.45 || dn(12)) o.y = -1; else if (ax[1] > 0.45 || dn(13)) o.y = 1;
    const m = { lp: 2, hp: 3, lk: 0, hk: 1 };
    for (const b of BTN) { o.held[b] = dn(m[b]); if (o.held[b] && !padPrev[i][b]) In.p[i].press(b); padPrev[i][b] = o.held[b]; }
    if (dn(9) && !padPrev[i].start && In.onPause) In.onPause(); padPrev[i].start = dn(9);
    return o;
  }

  // appelé à chaque frame logique
  In.update = function () {
    const ms = maps();
    for (let i = 0; i < 2; i++) {
      const c = In.p[i]; if (c.ai) { c.step(); continue; }
      const m = ms[i]; let x = 0, y = 0; const held = {};
      if (m) { x = (any(m.right) ? 1 : 0) - (any(m.left) ? 1 : 0); y = (any(m.down) ? 1 : 0) - (any(m.up) ? 1 : 0); BTN.forEach((b) => (held[b] = any(m[b]))); }
      if (i === 0) { if (touch.x || touch.y) { x = touch.x; y = touch.y; } BTN.forEach((b) => (held[b] = held[b] || !!touch.held[b])); }
      const g = readPad(i); if (g) { if (g.x || g.y) { x = g.x; y = g.y; } BTN.forEach((b) => (held[b] = held[b] || g.held[b])); }
      c.x = x; c.y = y; c.held = held; c.step();
    }
  };
})();
