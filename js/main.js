/* Boucle principale, mise à l'échelle, enchaînement des écrans */
(function () {
  const FF = window.FF, W = FF.W, H = FF.H, In = FF.Input, UI = FF.UI;
  const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
  const Game = (FF.Game = { scene: null, paused: false, mode: null });

  function resize() {
    const vw = window.innerWidth, vh = window.innerHeight, land = vw > vh;
    const s = land ? Math.min(vw / W, vh / H) : vw / W, cw = Math.round(W * s), ch = Math.round(H * s);
    const top = land ? Math.round((vh - ch) / 2) : Math.round(Math.min(vh * 0.07, Math.max(0, (vh - ch) / 2)));
    cv.style.width = cw + 'px'; cv.style.height = ch + 'px'; cv.style.left = Math.round((vw - cw) / 2) + 'px'; cv.style.top = top + 'px';
    const dpr = Math.min(window.devicePixelRatio || 1, 2); cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    const t = document.getElementById('touch'); t.style.top = land ? '0px' : top + ch + 'px';
    document.body.classList.toggle('portrait', !land);
    In.layout();
  }
  window.addEventListener('resize', resize); window.addEventListener('orientationchange', () => setTimeout(resize, 200));

  Game.refresh = function () {
    const inFight = this.scene instanceof FF.Fight && !this.scene.o.attract && !UI.current;
    document.body.classList.toggle('infight', inFight);
    if (!inFight) In.resetTouch(); else In.layout();
  };
  Game.setScene = function (s) { this.scene = s; this.paused = false; this.refresh(); };

  // combat de démonstration derrière les menus
  Game.attract = function () {
    In.twoPlayers = false;
    const [a, b] = FF.shuffle(FF.roster).slice(0, 2);
    this.setScene(new FF.Fight({ chars: [a, b], ctrls: In.p, ais: [new FF.AI(2), new FF.AI(2)], attract: true, rounds: 1, stage: (Math.random() * FF.STAGES.length) | 0, onEnd: () => Game.attract() }));
    FF.Audio.music('menu');
  };
  Game.toMenu = function () { this.attract(); UI.show('menu'); };

  Game.start = function (mode, c1, c2) {
    this.mode = mode; In.twoPlayers = mode === 'duo';
    if (mode === 'arcade') { this.ladder = FF.shuffle(FF.roster.filter((c) => c !== c1)); this.step = 0; this.match(c1, this.ladder[0]); }
    else this.match(c1, c2);
  };
  Game.match = function (c1, c2) {
    const mode = this.mode, d = FF.settings.difficulty, ais = [null, null]; let training = false, label = '';
    if (mode === 'arcade') { const n = this.ladder.length; ais[1] = new FF.AI(FF.clamp(d * 0.9 + (n > 1 ? this.step / (n - 1) : 1) * 1.3, 0, 3)); label = `COMBAT ${this.step + 1} / ${n}`; }
    else if (mode === 'versus') ais[1] = new FF.AI(d + 0.6);
    else if (mode === 'training') { ais[1] = new FF.AI(0, { dummy: true }); training = true; }
    this.cur = [c1, c2]; UI.hide();
    const go = () => {
      FF.Audio.music('fight');
      this.setScene(new FF.Fight({ chars: [c1, c2], ctrls: In.p, ais, stage: mode === 'duo' || mode === 'training' ? (Math.random() * FF.STAGES.length) | 0 : c2.stage, rounds: FF.settings.rounds, training, onEnd: (w) => Game.matchEnd(w) }));
    };
    if (training) go(); else { FF.Audio.music(null); this.setScene(new FF.Versus(c1, c2, label, go)); }
  };
  Game.matchEnd = function (w) {
    const [c1, c2] = this.cur, mode = this.mode, win = w === 0;
    In.p.forEach((c) => { c.ai = null; c.clear(); });
    FF.Audio.music('menu');
    this.setScene(new FF.Victory(this.cur[w], this.cur[1 - w], mode === 'duo' ? undefined : win));
    const menu = ['MENU', () => Game.toMenu()];
    if (mode === 'arcade') {
      if (win && this.step >= this.ladder.length - 1) UI.result([['VOIR LA FIN ▶', () => { UI.hide(); Game.setScene(new FF.Ending(c1, () => { Game.attract(); UI.show('title'); })); }]]);
      else if (win) UI.result([['COMBAT SUIVANT ▶', () => { Game.step++; Game.match(c1, Game.ladder[Game.step]); }], menu]);
      else UI.result([['CONTINUER ?', () => Game.match(c1, c2)], menu]);
    } else UI.result([['REVANCHE', () => Game.match(c1, c2)], ['PERSONNAGES', () => { Game.attract(); UI.openSelect(mode); }], menu]);
  };
  Game.togglePause = function () {
    const s = this.scene; if (!(s instanceof FF.Fight) || s.o.attract || s.done) return;
    if (!this.paused) { this.paused = true; UI.show('pause'); } else if (UI.current === 'pause') { this.paused = false; In.p.forEach((c) => !c.ai && c.clear()); UI.hide(); }
  };
  Game.quit = function () { In.p.forEach((c) => { c.ai = null; c.clear(); }); this.toMenu(); };
  Game.skip = function () { if (this.scene && this.scene.skip && !UI.current) this.scene.skip(); };

  In.onPause = () => Game.togglePause();
  document.getElementById('pauseBtn').addEventListener('click', () => Game.togglePause());
  cv.addEventListener('pointerdown', () => Game.skip());
  document.getElementById('touch').addEventListener('pointerdown', () => Game.skip());
  document.addEventListener('visibilitychange', () => { if (document.hidden && !Game.paused) Game.togglePause(); });

  let last = performance.now(), acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    acc += Math.min(100, now - last); last = now;
    let n = 0;
    while (acc >= 1000 / 60) { acc -= 1000 / 60; if (n++ < 4 && !Game.paused && Game.scene) { In.update(); Game.scene.update(); } }
    const k = cv.width / W; ctx.setTransform(k, 0, 0, k, 0, 0);
    if (Game.scene) Game.scene.render(ctx);
    if (Game.scene instanceof FF.Fight && Game.scene.o.attract) { ctx.fillStyle = 'rgba(8,4,22,.45)'; ctx.fillRect(0, 0, W, H); }
    UI.tick();
  }

  (async function boot() {
    FF.loadCustom();
    try { await FF.Sprites.loadLocal(); } catch (e) {}
    try { await FF.Sprites.loadRepo(); } catch (e) {}
    UI.init(); In.initTouch(); resize();
    Game.attract(); UI.show('title');
    requestAnimationFrame(frame);
  })();
})();
