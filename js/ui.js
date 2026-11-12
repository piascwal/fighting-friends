/* Menus (DOM) : titre, menu, sélection, options, personnages & sprites, liste des coups, pause, résultat */
(function () {
  const FF = window.FF, S = FF.Sprites;
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const UI = (FF.UI = { current: null, t: 0 });
  let root, sel = null, ch = { id: null, pose: null, missOnly: false }, mvChar = null, prevScreen = 'menu';

  const HTML = `
  <div class="screen" id="s-title"><div class="logo"><span>FIGHTING</span><b>FRIENDS</b></div><div class="blink" id="pressStart">TOUCHE L'ÉCRAN POUR JOUER</div><div class="ver">Astuce : ajoute la page à ton écran d'accueil pour jouer en plein écran</div></div>

  <div class="screen" id="s-menu"><div class="logo small"><span>FIGHTING</span><b>FRIENDS</b></div>
    <div class="menu">
      <button class="nav big" data-go="arcade">ARCADE<small>Bats tous les adversaires</small></button>
      <button class="nav big" data-go="versus">VERSUS<small>Un combat contre la console</small></button>
      <button class="nav big" data-go="duo">2 JOUEURS<small>Sur le même clavier / manettes</small></button>
      <button class="nav big" data-go="training">ENTRAÎNEMENT<small>Répète tes combos</small></button>
      <button class="nav big alt" data-go="options">OPTIONS<small>Personnages, sprites, commandes</small></button>
    </div></div>

  <div class="screen" id="s-select">
    <h2 id="selTitle">CHOISIS TON COMBATTANT</h2>
    <div class="selWrap">
      <div class="side" id="side0"><canvas width="300" height="360"></canvas><div class="pname"></div><div class="ptag">JOUEUR 1</div></div>
      <div class="mid"><div id="selGrid"></div><div id="selInfo"></div></div>
      <div class="side" id="side1"><canvas width="300" height="360"></canvas><div class="pname"></div><div class="ptag" id="tag1">ADVERSAIRE</div></div>
    </div>
    <div class="foot"><button class="nav sm alt" id="selBack">◀ RETOUR</button><button class="nav sm" id="selOk">VALIDER ▶</button></div>
  </div>

  <div class="screen panel" id="s-options"><div class="bar"><button class="nav sm alt" data-back="menu">◀ RETOUR</button><h2>OPTIONS</h2></div>
    <div class="scroll"><div class="opts">
      <button class="nav opt" data-opt="sfx"></button><button class="nav opt" data-opt="music"></button>
      <button class="nav opt" data-opt="difficulty"></button><button class="nav opt" data-opt="rounds"></button>
      <button class="nav opt" data-opt="hitboxes"></button><button class="nav opt" id="optFs">PLEIN ÉCRAN</button>
      <button class="nav opt hl" data-go="chars">PERSONNAGES &amp; SPRITES ▶<small>Ajouter un personnage, voir les images manquantes, copier les prompts</small></button>
      <button class="nav opt hl" data-go="moves">COMMANDES &amp; LISTE DES COUPS ▶</button>
    </div></div></div>

  <div class="screen panel" id="s-chars"><div class="bar"><button class="nav sm alt" data-back="options">◀ RETOUR</button><h2>PERSONNAGES &amp; SPRITES</h2></div>
    <div class="scroll">
      <div class="row"><select id="chSel"></select><button class="nav sm" id="chNewBtn">＋ NOUVEAU PERSONNAGE</button></div>
      <div class="row hidden" id="chNew"><input id="newName" maxlength="16" placeholder="Nom du personnage"><select id="newTpl"></select><button class="nav sm" id="newOk">CRÉER</button></div>
      <div class="row hidden" id="chEdit"><label>Style de combat <select id="edTpl"></select></label><label>Couleur <input type="color" id="edCol"></label><button class="nav sm alt" id="edDel">SUPPRIMER LE PERSONNAGE</button></div>
      <div id="chInfo"></div>
      <div class="row"><button class="nav sm" id="chCopyAll">COPIER TOUS LES PROMPTS MANQUANTS</button><button class="nav sm alt" id="chZip">EXPORTER .ZIP</button><label class="chk"><input type="checkbox" id="chMiss"> Manquants seulement</label></div>
      <details class="help"><summary>Comment ça marche ?</summary>
        <ol><li>Prépare <b>une image de référence</b> de ton personnage (debout, en entier).</li>
        <li>Touche une pose ci-dessous, puis <b>COPIER LE PROMPT</b>. Colle-le dans ton IA d'images <b>avec l'image de référence en pièce jointe</b>.</li>
        <li>Récupère l'image générée (fond magenta <code>#FF00FF</code>) et fais <b>IMPORTER L'IMAGE</b> : le fond est retiré automatiquement et le sprite est utilisable tout de suite.</li>
        <li>Seule la pose <b>Garde (repos)</b> est obligatoire pour jouer : les poses manquantes réutilisent la pose la plus proche. Plus tu en ajoutes, plus le personnage est vivant.</li>
        <li><b>EXPORTER .ZIP</b> crée le dossier à déposer dans <code>assets/characters/</code> du projet pour que le personnage soit disponible pour tout le monde.</li></ol>
        <p>Les images importées ici sont enregistrées uniquement sur cet appareil.</p></details>
      <div id="chGrid"></div>
    </div>
    <div class="modal hidden" id="chModal"><div class="box">
      <div class="mhead"><h3 id="mTitle"></h3><button class="nav sm alt" id="mClose">✕</button></div>
      <div class="mbody">
        <div class="mleft"><canvas id="mPrev" width="320" height="300"></canvas><div id="mStatus"></div>
          <div id="mAdj"><label>Taille <input type="range" id="adS" min="0.5" max="1.7" step="0.01"></label><label>Décalage ↔ <input type="range" id="adX" min="-80" max="80" step="1"></label><label>Décalage ↕ <input type="range" id="adY" min="-80" max="80" step="1"></label></div></div>
        <div class="mright"><div class="lbl">Prompt à coller dans ton IA d'images (avec l'image de référence) :</div><textarea id="mPrompt" readonly></textarea>
          <div class="row"><button class="nav sm" id="mCopy">COPIER LE PROMPT</button><label class="nav sm filebtn">IMPORTER L'IMAGE<input type="file" id="mFile" accept="image/*"></label><button class="nav sm alt" id="mDel">SUPPRIMER L'IMAGE</button></div></div>
      </div></div></div>
  </div>

  <div class="screen panel" id="s-moves"><div class="bar"><button class="nav sm alt" id="mvBack">◀ RETOUR</button><h2>COMMANDES &amp; COUPS</h2></div>
    <div class="scroll"><div class="row"><select id="mvSel"></select></div><div id="mvBody"></div></div></div>

  <div class="screen dim" id="s-pause"><h2>PAUSE</h2><div class="menu">
    <button class="nav big" id="pResume">REPRENDRE</button><button class="nav big" id="pMoves">LISTE DES COUPS</button><button class="nav big alt" id="pQuit">QUITTER LE COMBAT</button></div></div>

  <div class="screen clear" id="s-result"><div class="resBtns" id="resBtns"></div></div>`;

  UI.toast = function (msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(UI._tt); UI._tt = setTimeout(() => t.classList.remove('on'), 2200); };
  UI.show = function (name) {
    $$('.screen', root).forEach((s) => s.classList.toggle('on', s.id === 's-' + name));
    UI.current = name; document.body.dataset.screen = name; FF.Game && FF.Game.refresh();
    const f = $('#s-' + name + ' .nav'); if (f && !FF.Input.touchSeen) f.focus();
  };
  UI.hide = function () { $$('.screen', root).forEach((s) => s.classList.remove('on')); UI.current = null; document.body.dataset.screen = ''; FF.Game && FF.Game.refresh(); };
  const snd = (n) => FF.Audio.play(n);

  /* ---------- sélection des personnages ---------- */
  UI.openSelect = function (mode) {
    sel = { mode, step: 0, picks: [null, null], cur: [0, Math.min(1, FF.roster.length - 1)], flash: [0, 0] };
    $('#tag1').textContent = mode === 'duo' ? 'JOUEUR 2' : mode === 'arcade' ? 'ADVERSAIRES' : 'ADVERSAIRE';
    const g = $('#selGrid'); g.innerHTML = '';
    FF.roster.concat([null]).forEach((c, i) => {
      const b = document.createElement('button'); b.className = 'nav tile'; b.dataset.i = i;
      if (c) { const cv = document.createElement('canvas'); cv.width = cv.height = 120; FF.drawPortrait(cv.getContext('2d'), c, 120); b.appendChild(cv); b.style.setProperty('--c', c.color); }
      else { b.textContent = '?'; b.classList.add('rnd'); }
      b.addEventListener('pointerdown', () => { b._pd = true; });
      b.addEventListener('click', () => { b._pd = false; if (sel.cur[sel.step] === i) return confirmSel(); sel.cur[sel.step] = i; snd('move'); refreshSel(); });
      b.addEventListener('focus', () => { if (!b._pd && sel.cur[sel.step] !== i) { sel.cur[sel.step] = i; refreshSel(); } });
      g.appendChild(b);
    });
    UI.show('select'); refreshSel();
  };
  const selChar = (i) => (sel.picks[i] !== null ? sel.picks[i] : sel.step === i ? FF.roster[sel.cur[i]] || 'rnd' : null);
  function refreshSel() {
    const st = sel.step;
    $('#selTitle').textContent = st === 0 ? (sel.mode === 'duo' ? 'JOUEUR 1 : CHOISIS TON COMBATTANT' : 'CHOISIS TON COMBATTANT') : sel.mode === 'duo' ? 'JOUEUR 2 : CHOISIS TON COMBATTANT' : "CHOISIS L'ADVERSAIRE";
    $$('#selGrid .tile').forEach((b, i) => { b.classList.toggle('c0', sel.cur[0] === i && (st === 0 || sel.picks[0] !== null)); b.classList.toggle('c1', st === 1 && sel.cur[1] === i); });
    for (let i = 0; i < 2; i++) { const c = selChar(i); $('#side' + i + ' .pname').textContent = c === 'rnd' ? 'AU HASARD' : c ? c.name : sel.mode === 'arcade' && i === 1 ? '? ? ?' : ''; $('#side' + i).style.setProperty('--c', c && c !== 'rnd' ? c.color : '#555'); $('#side' + i).classList.toggle('active', st === i); }
    const c = FF.roster[sel.cur[st]], info = $('#selInfo');
    if (!c) { info.innerHTML = '<div class="iname">AU HASARD</div><div class="ititle">Laisse le destin choisir</div>'; return; }
    const bar = (l, v) => `<div class="stat"><span>${l}</span><i><b style="width:${Math.round(FF.clamp(v, 0.08, 1) * 100)}%"></b></i></div>`, s = c.stats;
    info.innerHTML = `<div class="iname" style="color:${c.color}">${esc(c.name)}</div><div class="ititle">${esc(c.title)} — style ${c.tpl.label.toLowerCase()}</div>
      <div class="stats">${bar('Vie', (s.hp - 780) / 400)}${bar('Vitesse', (s.speed - 2.4) / 2)}${bar('Puissance', (s.power - 0.8) / 0.38)}</div><div class="ihint">${esc(c.tpl.hint)}</div>`;
  }
  function confirmSel() {
    const st = sel.step; let c = FF.roster[sel.cur[st]];
    if (!c) { const pool = FF.roster.filter((r) => r !== sel.picks[0] || FF.roster.length < 2); c = FF.pick(pool); sel.cur[st] = FF.roster.indexOf(c); }
    sel.picks[st] = c; sel.flash[st] = 14; snd('ok');
    if (st === 0 && sel.mode !== 'arcade') { sel.step = 1; if (sel.cur[1] === sel.cur[0]) sel.cur[1] = (sel.cur[0] + 1) % FF.roster.length; refreshSel(); return; }
    refreshSel(); const s = sel; $('#selOk').disabled = true;
    setTimeout(() => { $('#selOk').disabled = false; if (UI.current === 'select' && sel === s) FF.Game.start(s.mode, s.picks[0], s.picks[1]); }, 650);
  }
  function drawSide(i) {
    const cv = $('#side' + i + ' canvas'), x = cv.getContext('2d'), c = selChar(i), W = 300, H = 360;
    x.clearRect(0, 0, W, H);
    const col = c && c !== 'rnd' ? c.color : '#666', g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, FF.rgba('#000000', 0)); g.addColorStop(1, FF.shade(col.length === 4 ? '#666666' : col, -0.3));
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(W / 2, H - 22, 90, 12, 0, 0, 7); x.fill();
    if (c === 'rnd' || (!c && sel.mode === 'arcade' && i === 1)) FF.arcadeText(x, '?', W / 2, H / 2, 200, { colors: ['#fff', '#bbb', '#666'] });
    else if (c) { const picked = sel.picks[i] !== null; FF.drawChar(x, c, picked ? 'win' : 'idle', W / 2 + (i ? 10 : -10), H - 24, i ? -1 : 1, 1.42, UI.t, { flash: sel.flash[i] > 8 }); }
    if (sel.flash[i] > 0) { x.fillStyle = `rgba(255,255,255,${sel.flash[i] / 20})`; x.fillRect(0, 0, W, H); sel.flash[i]--; }
  }

  /* ---------- options ---------- */
  const OPT = {
    sfx: { l: 'EFFETS SONORES', v: ['NON', 'OUI'], bool: true }, music: { l: 'MUSIQUE', v: ['NON', 'OUI'], bool: true },
    difficulty: { l: 'DIFFICULTÉ', v: ['FACILE', 'NORMAL', 'DIFFICILE'] }, rounds: { l: 'MANCHES GAGNANTES', v: { 1: '1', 2: '2', 3: '3' }, cyc: [1, 2, 3] },
    hitboxes: { l: 'AFFICHER LES ZONES DE COUPS', v: ['NON', 'OUI'], bool: true },
  };
  function refreshOpts() {
    $$('[data-opt]').forEach((b) => { const k = b.dataset.opt, o = OPT[k], v = FF.settings[k]; b.innerHTML = `${o.l}<em>${o.bool ? o.v[v ? 1 : 0] : o.v[v]}</em>`; });
  }

  /* ---------- personnages & sprites ---------- */
  const curChar = () => FF.charById(ch.id) || FF.roster[0];
  const posesFor = (c) => FF.SPRITE_POSES.filter((s) => !s.proj || (c.tpl.spriteDesc && c.tpl.spriteDesc.projectile));
  function fillTplSelect(el, val) { el.innerHTML = Object.values(FF.TEMPLATES).map((t) => `<option value="${t.id}">${t.label} — ${t.hint}</option>`).join(''); if (val) el.value = val; }
  function thumb(cv, c, sp) {
    const x = cv.getContext('2d'), W = cv.width, H = cv.height, e = S.entry(c.id, sp.key); x.clearRect(0, 0, W, H);
    if (e) { const k = Math.min((W - 10) / e.w, (H - 10) / e.h); x.drawImage(e.img, (W - e.w * k) / 2, (H - e.h * k) / 2, e.w * k, e.h * k); return; }
    if (sp.proj) { FF.arcadeText(x, '✦', W / 2, H / 2, 70, { colors: ['#666', '#555', '#444'], stroke: '#222' }); return; }
    if (sp.portrait) { x.save(); x.globalAlpha = 0.35; x.translate(W * 0.15, H * 0.15); FF.Rig.portrait(x, c.look, W * 0.7); x.restore(); return; }
    FF.Rig.draw(x, c.look, FF.POSES[FF.poseRig(c, sp.key)], W / 2 - 4, H - 8, 1, { scale: 0.5 / (c.look.h || 1), sil: 'rgba(255,255,255,.22)' });
  }
  function refreshChars() {
    const c = curChar(); ch.id = c.id;
    $('#chSel').innerHTML = FF.roster.map((r) => `<option value="${r.id}">${esc(r.name)} (${S.count(r.id)} sprite${S.count(r.id) > 1 ? 's' : ''})</option>`).join(''); $('#chSel').value = c.id;
    const editable = c.custom && !c.repo; $('#chEdit').classList.toggle('hidden', !editable);
    if (editable) { fillTplSelect($('#edTpl'), c.template); $('#edCol').value = c.color; }
    const list = posesFor(c), have = list.filter((s) => S.has(c.id, s.key)).length;
    $('#chInfo').innerHTML = `<b style="color:${c.color}">${esc(c.name)}</b> — style ${c.tpl.label.toLowerCase()} — <b>${have} / ${list.length}</b> sprites. ` +
      (S.has(c.id, 'idle') ? 'Ce personnage est affiché avec <b>tes images</b>.' : `Sans image « Garde (repos) », ce personnage est affiché avec le <b>pantin provisoire</b>.`);
    const g = $('#chGrid'); g.innerHTML = '';
    list.forEach((sp) => {
      const has = S.has(c.id, sp.key); if (ch.missOnly && has) return;
      const b = document.createElement('button'); b.className = 'nav card ' + (has ? 'ok' : sp.req ? 'req' : 'miss');
      const cv = document.createElement('canvas'); cv.width = cv.height = 120; thumb(cv, c, sp); b.appendChild(cv);
      b.insertAdjacentHTML('beforeend', `<span class="cl">${esc(sp.label)}</span><span class="badge">${has ? '✓ OK' : sp.req ? 'OBLIGATOIRE' : 'MANQUANT'}</span>`);
      b.addEventListener('click', () => openPose(sp.key)); g.appendChild(b);
    });
    if (!g.children.length) g.innerHTML = '<p class="done">Toutes les images sont là. Beau travail !</p>';
  }
  function openPose(key) {
    ch.pose = key; const c = curChar(), sp = FF.SPRITE_BY_KEY[key], e = S.entry(c.id, key);
    $('#mTitle').textContent = sp.label; $('#mPrompt').value = FF.buildPrompt(c, key);
    const r = S.resolve(c.id, key);
    $('#mStatus').innerHTML = e ? `<span class="okc">✓ Image ${e.src === 'repo' ? 'fournie avec le jeu' : 'importée sur cet appareil'}</span>` : r && !sp.proj && !sp.portrait ? `<span class="warn">Image manquante — le jeu utilise « ${FF.SPRITE_BY_KEY[r.key].label} » à la place</span>` : `<span class="warn">Image manquante${sp.req ? ' (obligatoire)' : ''}</span>`;
    $('#mAdj').classList.toggle('hidden', !e || sp.portrait); $('#mDel').classList.toggle('hidden', !e || e.src === 'repo');
    if (e) { $('#adS').value = e.adj.s; $('#adX').value = e.adj.dx; $('#adY').value = e.adj.dy; }
    $('#chModal').classList.remove('hidden');
  }
  function drawModal() {
    const c = curChar(), sp = FF.SPRITE_BY_KEY[ch.pose], cv = $('#mPrev'), x = cv.getContext('2d'), W = cv.width, H = cv.height, e = S.entry(c.id, sp.key);
    for (let i = 0; i < W; i += 20) for (let j = 0; j < H; j += 20) { x.fillStyle = (i + j) / 20 % 2 ? '#2a2440' : '#221c36'; x.fillRect(i, j, 20, 20); }
    if (sp.portrait || sp.proj) { if (e) { const k = Math.min((W - 40) / e.w, (H - 40) / e.h); x.drawImage(e.img, (W - e.w * k) / 2, (H - e.h * k) / 2, e.w * k, e.h * k); } else thumb2(x, c, sp, W, H); return; }
    const gy = H - 34; x.strokeStyle = 'rgba(255,255,255,.35)'; x.setLineDash([6, 6]); x.beginPath(); x.moveTo(0, gy); x.lineTo(W, gy); x.stroke(); x.setLineDash([]);
    FF.Rig.draw(x, c.look, FF.POSES[FF.poseRig(c, sp.key)], W / 2 - 20, gy, 1, { scale: 1 / (c.look.h || 1), sil: e ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.3)' });
    if (e) S.draw(x, c, sp.key, W / 2 - 20, gy, 1, { scale: 1 });
    else { x.fillStyle = 'rgba(255,255,255,.6)'; x.font = '600 13px system-ui'; x.textAlign = 'center'; x.fillText('Guide de pose (silhouette)', W / 2, 18); }
  }
  function thumb2(x, c, sp, W, H) { x.save(); x.translate((W - 120) / 2, (H - 120) / 2); const t = document.createElement('canvas'); t.width = t.height = 120; thumb(t, c, sp); x.drawImage(t, 0, 0); x.restore(); }
  async function copy(text, okMsg) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (er) {} ta.remove(); }
    UI.toast(okMsg); snd('ok');
  }

  /* ---------- liste des coups ---------- */
  function refreshMoves() {
    const c = mvChar || FF.roster[0], n = c.tpl.names, two = FF.Input.twoPlayers;
    $('#mvSel').innerHTML = FF.roster.map((r) => `<option value="${r.id}">${esc(r.name)} — ${r.tpl.label}</option>`).join(''); $('#mvSel').value = c.id;
    const k = (s) => `<kbd>${s}</kbd>`, A = '<i class="b pa">A</i>', B = '<i class="b pb">B</i>', C = '<i class="b ka">C</i>', D = '<i class="b kb">D</i>';
    const row = (a, b) => `<tr><td>${a}</td><td>${b}</td></tr>`;
    $('#mvBody').innerHTML = `
      <h3>Commandes</h3><table>
      ${row('Tactile', `Joystick à gauche (apparaît sous ton pouce) · boutons ${A} ${B} ${C} ${D} à droite. Pose ton pouce <b>entre deux boutons</b> pour appuyer sur les deux.`)}
      ${row('Clavier (1 joueur)', `Déplacement ${k('Z Q S D')} / ${k('W A S D')} ou flèches · ${A} ${k('U')} ${B} ${k('I')} ${C} ${k('J')} ${D} ${k('K')} · pause ${k('Échap')}`)}
      ${row('Clavier (2 joueurs)', `J1 : ${k('ZQSD')} + ${k('F')} ${k('G')} ${k('V')} ${k('B')} — J2 : flèches + ${k('O')} ${k('P')} ${k('L')} ${k('M / ;')}`)}
      ${row('Manette', 'Croix ou stick · X/Y = poings · A/B = pieds · Start = pause')}</table>
      <h3>Bases</h3><table>
      ${row(`${A} poing léger · ${B} poing fort`, `${C} pied léger · ${D} pied fort`)}
      ${row('Se protéger', 'Maintiens <b>← (arrière)</b>. Les coups bas se bloquent accroupi <b>↙</b>, les coups sautés et le marteau se bloquent debout.')}
      ${row('Sauter / s\'accroupir', '<b>↑</b> / <b>↓</b> — tous les boutons marchent aussi en l\'air et accroupi')}
      ${row('Ruée', '<b>→ →</b> rapidement (ou <b>← ←</b> pour une esquive arrière invincible)')}
      ${row(`↓ + ${B}`, 'Uppercut : <b>lance l\'adversaire en l\'air</b>. Maintiens ↑ pour le suivre et continuer le combo.')}
      ${row(`↓ + ${D}`, 'Balayette : fait tomber')}${row(`→ + ${B}`, 'Marteau : touche les adversaires accroupis en garde')}</table>
      <h3>Coups spéciaux de ${esc(c.name)}</h3><table>
      ${row(`<b>↓ ↘ →</b> + ${A} ou ${B} &nbsp;<span class="or">ou</span>&nbsp; ${A}+${B} ensemble`, `<b>${esc(n.s1)}</b>`)}
      ${row(`<b>↓ ↙ ←</b> + ${C} ou ${D} &nbsp;<span class="or">ou</span>&nbsp; ${C}+${D} ensemble`, `<b>${esc(n.s2)}</b>`)}
      ${row(`<b>↓ ↘ → ↓ ↘ →</b> + ${A}/${B} &nbsp;<span class="or">ou</span>&nbsp; ${B}+${D} ensemble`, `<b class="sup">${esc(n.super)}</b> — jauge SUPER pleine`)}</table>
      <h3>Combos</h3><p class="note">Règle d'or : quand un coup <b>touche</b>, tu peux l'annuler par un coup plus fort : léger ▸ fort ▸ spécial ▸ SUPER. Appuie sur le bouton suivant dès l'impact.</p><table>
      ${c.tpl.combos.map((x) => row(esc(x[0]), esc(x[1]).replace(/\bA\b/g, A).replace(/\bB\b/g, B).replace(/\bC\b/g, C).replace(/\bD\b/g, D))).join('')}</table>`;
  }

  /* ---------- résultat ---------- */
  UI.result = function (btns) {
    const box = $('#resBtns'); box.innerHTML = '';
    btns.forEach(([l, fn], i) => { const b = document.createElement('button'); b.className = 'nav big' + (i ? ' alt' : ''); b.textContent = l; b.addEventListener('click', () => { snd('ok'); fn(); }); box.appendChild(b); });
    UI.show('result');
  };

  UI.tick = function () {
    UI.t++;
    if (UI.current === 'select' && sel) { drawSide(0); drawSide(1); }
    if (UI.current === 'chars' && ch.pose && UI.t % 2 === 0) drawModal();
  };

  UI.init = function () {
    root = $('#ui'); root.innerHTML = HTML;
    const on = (s, fn, ev) => $(s).addEventListener(ev || 'click', fn);
    on('#s-title', () => { FF.Audio.unlock(); FF.Audio.music('menu'); snd('ok'); UI.show('menu'); });
    document.addEventListener('pointerdown', () => FF.Audio.unlock(), { once: true });
    $$('[data-go]').forEach((b) => b.addEventListener('click', () => {
      const g = b.dataset.go; snd('ok');
      if (g === 'options') { refreshOpts(); UI.show('options'); }
      else if (g === 'chars') { ch.pose = null; $('#chModal').classList.add('hidden'); refreshChars(); UI.show('chars'); }
      else if (g === 'moves') { prevScreen = 'options'; refreshMoves(); UI.show('moves'); }
      else UI.openSelect(g);
    }));
    $$('[data-back]').forEach((b) => b.addEventListener('click', () => { snd('back'); if (b.dataset.back === 'options') refreshOpts(); UI.show(b.dataset.back); }));
    on('#selOk', confirmSel);
    on('#selBack', () => { snd('back'); if (sel.step === 1) { sel.step = 0; sel.picks[0] = null; refreshSel(); } else UI.show('menu'); });
    $$('[data-opt]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.opt, o = OPT[k], st = FF.settings;
      if (o.bool) st[k] = !st[k]; else if (o.cyc) st[k] = o.cyc[(o.cyc.indexOf(st[k]) + 1) % o.cyc.length]; else st[k] = (st[k] + 1) % o.v.length;
      FF.saveSettings(); refreshOpts(); if (k === 'music') FF.Audio.refresh(); snd('move');
    }));
    on('#optFs', () => { const d = document; if (d.fullscreenElement) d.exitFullscreen(); else { const r = d.documentElement.requestFullscreen && d.documentElement.requestFullscreen(); if (r && r.then) r.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => UI.toast('Plein écran indisponible ici : ajoute la page à ton écran d\'accueil')); else UI.toast('Plein écran indisponible ici : ajoute la page à ton écran d\'accueil'); } });
    // personnages
    on('#chSel', (e) => { ch.id = e.target.value; refreshChars(); }, 'change');
    on('#chNewBtn', () => { fillTplSelect($('#newTpl')); $('#chNew').classList.toggle('hidden'); $('#newName').focus(); });
    on('#newOk', () => {
      const name = $('#newName').value.trim(); if (!name) return UI.toast('Donne un nom au personnage');
      let id = FF.slug(name), n = 2; const baseId = id; while (FF.charById(id)) id = baseId + '-' + n++;
      const c = FF.addChar({ id, name: name.toUpperCase(), template: $('#newTpl').value, color: FF.pick(['#ff3d7f', '#3d9bff', '#7dff6a', '#ff9d2e', '#c56bff', '#2ee6c8']), custom: true, stage: (Math.random() * 4) | 0 });
      FF.saveCustom(); ch.id = c.id; $('#newName').value = ''; $('#chNew').classList.add('hidden'); refreshChars(); UI.toast(`${c.name} créé ! Importe d'abord la pose « Garde (repos) ».`);
    });
    on('#edTpl', (e) => { FF.setTemplate(curChar(), e.target.value); FF.saveCustom(); refreshChars(); }, 'change');
    on('#edCol', (e) => { const c = curChar(); c.color = e.target.value; FF.setTemplate(c, c.template); FF.saveCustom(); refreshChars(); }, 'change');
    on('#edDel', async () => { const c = curChar(); if (!confirm(`Supprimer ${c.name} et toutes ses images de cet appareil ?`)) return; await S.removeChar(c.id); FF.roster.splice(FF.roster.indexOf(c), 1); FF.saveCustom(); ch.id = null; refreshChars(); });
    on('#chMiss', (e) => { ch.missOnly = e.target.checked; refreshChars(); }, 'change');
    on('#chZip', () => { const c = curChar(); if (!S.count(c.id)) return UI.toast('Aucune image à exporter pour ce personnage'); S.exportZip(c); });
    on('#chCopyAll', () => {
      const c = curChar(), miss = posesFor(c).filter((s) => !S.has(c.id, s.key)); if (!miss.length) return UI.toast('Aucune image manquante');
      copy(miss.map((s, i) => `### ${i + 1}. ${s.label}  →  fichier : ${s.key}.png\n${FF.buildPrompt(c, s.key)}`).join('\n\n'), `${miss.length} prompts copiés`);
    });
    on('#mClose', () => { $('#chModal').classList.add('hidden'); ch.pose = null; refreshChars(); });
    on('#chModal', (e) => { if (e.target.id === 'chModal') $('#mClose').click(); });
    on('#mCopy', () => copy($('#mPrompt').value, 'Prompt copié !'));
    on('#mFile', async (e) => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return; const c = curChar();
      try { await S.importFile(c.id, ch.pose, f); UI.toast('Image importée, fond magenta retiré'); openPose(ch.pose); }
      catch (er) { UI.toast("Impossible de lire cette image"); }
    }, 'change');
    on('#mDel', async () => { await S.remove(curChar().id, ch.pose); openPose(ch.pose); });
    ['adS', 'adX', 'adY'].forEach((id) => {
      on('#' + id, () => { const e = S.entry(curChar().id, ch.pose); if (e) { e.adj.s = +$('#adS').value; e.adj.dx = +$('#adX').value; e.adj.dy = +$('#adY').value; } }, 'input');
      on('#' + id, () => { const e = S.entry(curChar().id, ch.pose); if (e && e.src !== 'repo') S.saveAdj(curChar().id, ch.pose); }, 'change');
    });
    // coups
    on('#mvSel', (e) => { mvChar = FF.charById(e.target.value); refreshMoves(); }, 'change');
    on('#mvBack', () => { snd('back'); UI.show(prevScreen); });
    // pause
    on('#pResume', () => FF.Game.togglePause());
    on('#pMoves', () => { prevScreen = 'pause'; mvChar = FF.Game.cur ? FF.Game.cur[0] : null; refreshMoves(); UI.show('moves'); });
    on('#pQuit', () => FF.Game.quit());

    // navigation clavier dans les menus
    FF.Input.onAny = (e) => {
      if (!UI.current) { if (e.code === 'Enter' || e.code === 'Space') FF.Game.skip(); return; }
      const scr = $('#s-' + UI.current); if (UI.current === 'title') { if (e.code === 'Enter' || e.code === 'Space') scr.click(); return; }
      const modal = !$('#chModal').classList.contains('hidden') && UI.current === 'chars';
      const items = $$('.nav', modal ? $('#chModal') : scr).filter((b) => b.offsetParent !== null && !b.disabled), i = items.indexOf(document.activeElement);
      const mv = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1, KeyS: 1, KeyD: 1, KeyW: -1, KeyA: -1 }[e.code];
      if (mv && items.length) { e.preventDefault(); items[(i + mv + items.length) % items.length].focus(); snd('move'); }
      else if ((e.code === 'KeyU' || e.code === 'KeyJ') && i >= 0) items[i].click();
      else if (e.code === 'Escape') { if (modal) $('#mClose').click(); else if (UI.current === 'select') $('#selBack').click(); else if (UI.current === 'moves') $('#mvBack').click(); else { const b = $('[data-back]', scr); if (b) b.click(); } }
    };
  };
})();
