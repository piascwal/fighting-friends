/* Styles de combat (jeux de coups) + personnages de départ */
(function () {
  const FF = window.FF;
  const H = (t, d, box, dmg, o) => Object.assign({ t, d, box, dmg, hs: 16, bs: 11, kb: 5, lvl: 'mid', fx: 'punch' }, o || {});

  // Coups normaux communs à tous les styles
  function normals() {
    return {
      lp: { name: 'Poing léger', rank: 1, total: 12, sprite: 'punch_light', anim: [[0, 'lp', 1], [7, 'idle', 0.45]], vel: [[0, 3, 2]],
        hits: [H(3, 3, [15, -168, 82, 36], 26, { hs: 15, bs: 9, kb: 2.5 })] },
      lk: { name: 'Pied léger', rank: 2, total: 15, sprite: 'kick_light', anim: [[0, 'windK', 0.9], [3, 'lk', 1], [9, 'idle', 0.45]], vel: [[1, 5, 4]],
        hits: [H(4, 3, [15, -112, 102, 44], 34, { hs: 17, bs: 10, kb: 3, fx: 'kick' })] },
      hp: { name: 'Poing fort', rank: 3, total: 21, sprite: 'punch_heavy', anim: [[0, 'windP', 0.9], [4, 'hp', 1], [13, 'idle', 0.4]], vel: [[2, 7, 6]],
        hits: [H(6, 4, [15, -162, 104, 46], 68, { hs: 21, bs: 13, kb: 4.5, fx: 'heavy' })] },
      hk: { name: 'Pied fort', rank: 4, total: 25, sprite: 'kick_heavy', anim: [[0, 'windK', 0.9], [5, 'hk', 1], [15, 'idle', 0.4]], vel: [[3, 8, 6]],
        hits: [H(8, 4, [10, -190, 108, 80], 82, { hs: 23, bs: 15, kb: 6, fx: 'heavy', sw: 'side' })] },
      clp: { name: 'Poing accroupi', rank: 1, total: 11, low: true, sprite: 'crouch_punch', anim: [[0, 'cLp', 1], [6, 'crouch', 0.45]], vel: [[0, 3, 2]],
        hits: [H(3, 3, [15, -108, 78, 34], 22, { hs: 14, bs: 9, kb: 2.5 })] },
      clk: { name: 'Pied bas', rank: 2, total: 14, low: true, sprite: 'crouch_kick', anim: [[0, 'cLk', 1], [8, 'crouch', 0.45]], vel: [[0, 4, 3]],
        hits: [H(4, 3, [15, -42, 98, 40], 28, { hs: 16, bs: 10, kb: 3, lvl: 'low', fx: 'kick', sw: 'low' })] },
      chp: { name: 'Uppercut (lanceur)', rank: 5, total: 27, jc: true, sprite: 'uppercut', anim: [[0, 'windU', 0.9], [4, 'upper', 1], [17, 'idle', 0.35]], vel: [[1, 5, 4]],
        hits: [H(5, 6, [5, -215, 76, 160], 64, { launch: [1.5, -16.5], bs: 15, kb: 5, fx: 'heavy', sw: 'up' })] },
      chk: { name: 'Balayette', rank: 5, total: 29, low: true, sprite: 'crouch_kick', anim: [[0, 'cLk', 0.9], [5, 'sweep', 1], [18, 'crouch', 0.35]], vel: [[2, 7, 4]],
        hits: [H(7, 4, [15, -44, 118, 44], 64, { launch: [3, -7], bs: 14, kb: 6, lvl: 'low', fx: 'kick', sw: 'low' })] },
      fhp: { name: 'Marteau (casse-garde basse)', rank: 5, total: 31, sprite: 'punch_heavy', anim: [[0, 'windO', 0.7], [11, 'overhead', 1], [22, 'idle', 0.35]],
        vel: [[3, 12, 4]], hits: [H(14, 4, [10, -200, 92, 130], 76, { hs: 22, bs: 13, kb: 5, lvl: 'high', fx: 'heavy', sw: 'down' })] },
      jlp: { name: 'Poing sauté', rank: 1, total: 15, air: true, sprite: 'jump_punch', anim: [[0, 'jP', 1]],
        hits: [H(3, 10, [5, -120, 78, 72], 36, { hs: 17, bs: 11, kb: 3, lvl: 'high' })] },
      jhp: { name: 'Poing sauté fort', rank: 3, total: 20, air: true, sprite: 'jump_punch', anim: [[0, 'jP', 1]],
        hits: [H(5, 10, [5, -125, 86, 86], 62, { hs: 21, bs: 13, kb: 4, lvl: 'high', fx: 'heavy', sw: 'down' })] },
      jlk: { name: 'Pied sauté', rank: 2, total: 16, air: true, sprite: 'jump_kick', anim: [[0, 'jK', 1]],
        hits: [H(4, 11, [5, -80, 92, 66], 40, { hs: 18, bs: 11, kb: 3, lvl: 'high', fx: 'kick' })] },
      jhk: { name: 'Pied sauté fort', rank: 4, total: 22, air: true, sprite: 'jump_kick', anim: [[0, 'jK', 1]],
        hits: [H(5, 12, [5, -85, 102, 76], 72, { hs: 22, bs: 14, kb: 6, lvl: 'high', fx: 'heavy' })] },
    };
  }
  const SP = (o) => Object.assign({ rank: 10, sfx: 'special' }, o);
  const SU = (o) => Object.assign({ rank: 20, cost: 100, flash: true, trail: true, sfx: 'super' }, o);

  const COMBOS = [['Rafale', 'A  A  A  C  B  D'], ['Finir par le spécial 1', 'A  C  B  B'], ['Finir par le spécial 2', 'A  C  B  D  D'], ['Jusqu\'au SUPER (jauge pleine)', 'A  C  B  B  B'],
    ['Lanceur', '↓+B  ▸  ↑ (saut)  ▸  A  C  B  D'], ['Balayage', '↓+A  ↓+C  ↓+D']];
  const T = (FF.TEMPLATES = {});

  /* ---------- ÉQUILIBRÉ : projectile + uppercut ---------- */
  T.balanced = {
    label: 'Équilibré', hint: 'Boule de feu, uppercut enflammé',
    stats: { hp: 1000, speed: 4.7, jump: 20, power: 1 },
    names: { s1: 'Boule de feu', s2: 'Comète ascendante', super: 'BRASIER FINAL' },
    element: 'fire',
    spriteDesc: {
      special1: "lancer d'une boule d'énergie : jambes en fente, buste engagé, les deux bras tendus vers l'avant, paumes ouvertes jointes devant lui (ne dessine PAS la boule d'énergie)",
      special2: "uppercut sauté : en l'air, corps étiré en diagonale vers le haut, un poing levé très haut au-dessus de la tête, un genou relevé (aucun sol visible)",
      projectile: "une boule de feu / d'énergie incandescente avec une courte traînée de flammes vers la gauche",
    },
    spriteRig: { special1: 'cast', special2: 'upper' },
    build() {
      const m = normals();
      const fb = (heavy) => SP({ name: 'Boule de feu', total: 34, sprite: 'special1', anim: [[0, 'windCast', 0.9], [6, 'cast', 1], [24, 'idle', 0.35]],
        proj: { t: 9, kind: 'fire', vx: heavy ? 14 : 9.5, y: -128, w: 46, h: 40, dmg: 70, hs: 20, bs: 14, kb: 7, fx: 'fire' } });
      const up = (heavy) => SP({ name: 'Comète ascendante', sprite: 'special2', total: 60, landRec: 10, inv: [0, 7], trail: true,
        anim: [[0, 'windU', 0.9], [2, 'upper', 1]], imp: [3, heavy ? 4 : 2.5, heavy ? -20 : -16.5],
        hits: [H(3, 14, [0, -225, 76, 170], heavy ? 130 : 105, { launch: [4, -13], bs: 18, kb: 8, fx: 'fire', sw: 'up', stop: 12 })] });
      m.s1l = fb(false); m.s1h = fb(true); m.s2l = up(false); m.s2h = up(true);
      m.super = SU({ name: 'BRASIER FINAL', total: 52, sprite: 'special1', anim: [[0, 'charge', 0.8], [8, 'cast', 1], [40, 'idle', 0.3]],
        proj: { t: 11, kind: 'superfire', vx: 16, y: -130, w: 120, h: 110, dmg: 62, hits: 5, hs: 24, bs: 16, kb: 9, fx: 'fire', launchLast: [8, -12] } });
      return m;
    },
    combos: COMBOS,
    ai: { zoner: 0.5, antiAir: 's2h', ender: 's1h' },
  };

  /* ---------- RAPIDE : ruée + coups de pied tournoyants ---------- */
  T.fast = {
    label: 'Rapide', hint: 'Ruée éclair, cyclone de coups de pied',
    stats: { hp: 900, speed: 5.7, jump: 21, power: 0.9 },
    names: { s1: 'Éclair', s2: 'Cyclone', super: 'MILLE ÉCLAIRS' },
    element: 'elec',
    spriteDesc: {
      special1: "coup de poing en pleine ruée : corps très penché vers l'avant presque à l'horizontale, bras avant tendu droit devant, jambe arrière tendue loin derrière, comme un sprint",
      special2: "coup de pied tournoyant : debout sur une jambe, l'autre jambe tendue à l'horizontale à hauteur de poitrine, bras écartés pour l'équilibre, corps en pleine rotation",
    },
    spriteRig: { special1: 'dashP', special2: 'spinK' },
    build() {
      const m = normals();
      const da = (heavy) => SP({ name: 'Éclair', total: 32, trail: true, sprite: 'special1', anim: [[0, 'windP', 0.9], [4, 'dashP', 1], [22, 'idle', 0.35]],
        vel: [[4, 14, heavy ? 24 : 18]],
        hits: [H(5, 10, [5, -160, 90, 80], heavy ? 105 : 85, heavy ? { launch: [7, -8], bs: 16, kb: 10, fx: 'elec', stop: 11 } : { hs: 24, bs: 15, kb: 10, fx: 'elec' })] });
      const sp = (heavy) => SP({ name: 'Cyclone', total: heavy ? 40 : 32, trail: true, sprite: 'special2',
        anim: [[0, 'windK', 0.9], [3, 'spinK', 1], [9, 'spinK2', 1], [12, 'spinK', 1], [16, 'spinK2', 1], [19, 'spinK', 1], [23, 'spinK2', 1], [heavy ? 27 : 20, 'idle', 0.35]],
        vel: [[3, heavy ? 26 : 19, 8]],
        hits: (heavy ? [5, 12, 19] : [5, 12]).map((t, i, a) => H(t, 4, [-20, -175, 120, 80], 42,
          i === a.length - 1 ? { launch: [5, -9.5], bs: 14, kb: 6, fx: 'kick', sw: 'side' } : { hs: 22, bs: 12, kb: 1, fx: 'kick', sw: 'side' })) });
      m.s1l = da(false); m.s1h = da(true); m.s2l = sp(false); m.s2h = sp(true);
      const hits = [];
      for (let i = 0; i < 9; i++) hits.push(H(6 + i * 3, 3, [-10, -190, 130, 180], 30, { hs: 24, bs: 10, kb: 0, fx: 'elec', stop: 3 }));
      hits.push(H(35, 5, [-10, -210, 130, 200], 90, { launch: [9, -17], bs: 18, kb: 12, fx: 'elec', stop: 14, sw: 'up' }));
      const an = [[0, 'charge', 0.8], [3, 'dashP', 1]];
      for (let i = 0; i < 9; i++) an.push([6 + i * 3, ['lp', 'hp', 'lk', 'hk'][i % 4], 1]);
      an.push([33, 'windU', 1], [35, 'upper', 1], [50, 'idle', 0.3]);
      m.super = SU({ name: 'MILLE ÉCLAIRS', total: 62, anim: an, vel: [[3, 9, 24]], hits });
      return m;
    },
    combos: COMBOS,
    ai: { zoner: 0, antiAir: 'chp', ender: 's2h' },
  };

  /* ---------- LOURD : onde de choc + charge ---------- */
  T.heavy = {
    label: 'Lourd', hint: 'Onde de choc au sol, charge blindée',
    stats: { hp: 1150, speed: 3.9, jump: 19, power: 1.15 },
    names: { s1: 'Onde de choc', s2: 'Bélier', super: 'SÉISME' },
    element: 'earth',
    spriteDesc: {
      special1: "frappe du sol : buste complètement plié vers l'avant, les deux poings écrasés ensemble contre le sol devant ses pieds, genoux fléchis",
      special2: "charge à l'épaule : corps penché vers l'avant, épaule avant en bélier, bras repliés contre le torse, tête rentrée, en pleine course",
      projectile: "une onde de choc qui court au ras du sol : éclats de roche et poussière soulevés en forme de vague",
    },
    spriteRig: { special1: 'slam', special2: 'shoulder' },
    build() {
      const m = normals();
      const wv = (heavy) => SP({ name: 'Onde de choc', total: 40, sprite: 'special1', anim: [[0, 'windSlam', 0.8], [9, 'slam', 1], [28, 'idle', 0.35]],
        shakeAt: 11, proj: { t: 12, kind: 'wave', vx: heavy ? 12 : 8.5, y: -34, x: 60, w: 70, h: 68, dmg: 85, hs: 22, bs: 15, kb: 8, fx: 'earth', ground: true } });
      const ch = (heavy) => SP({ name: 'Bélier', total: 40, trail: true, armor: [2, 20], sprite: 'special2', anim: [[0, 'windP', 0.9], [4, 'shoulder', 1], [26, 'idle', 0.35]],
        vel: [[5, heavy ? 20 : 17, heavy ? 16 : 13]],
        hits: [H(6, 14, [0, -175, 78, 140], heavy ? 145 : 120, { launch: [9, -9], bs: 20, kb: 12, fx: 'earth', stop: 13 })] });
      m.s1l = wv(false); m.s1h = wv(true); m.s2l = ch(false); m.s2h = ch(true);
      m.super = SU({ name: 'SÉISME', total: 62, sprite: 'special1', anim: [[0, 'charge', 0.8], [5, 'windSlam', 0.9], [12, 'slam', 1], [46, 'idle', 0.3]],
        shakeAt: 14, hits: [H(14, 5, [-40, -210, 210, 210], 150, { launch: [3, -18], bs: 20, kb: 12, fx: 'earth', stop: 16, sw: 'down' })],
        proj: { t: 15, kind: 'quake', vx: 15, y: -60, x: 110, w: 110, h: 120, dmg: 70, hits: 3, hs: 24, bs: 16, kb: 9, fx: 'earth', ground: true, launchLast: [5, -13] } });
      return m;
    },
    combos: COMBOS,
    ai: { zoner: 0.3, antiAir: 'chp', ender: 's2h' },
  };

  /* ---------- TECHNIQUE : lames + téléportation ---------- */
  T.tech = {
    label: 'Technique', hint: 'Lame à distance, téléportation plongeante',
    stats: { hp: 950, speed: 5.2, jump: 21, power: 0.95 },
    names: { s1: "Lame d'ombre", s2: 'Chute fantôme', super: 'NUIT SANS FIN' },
    element: 'slash',
    spriteDesc: {
      special1: "lancer d'un projectile : buste engagé, bras avant tendu vers l'avant main ouverte comme s'il venait de lancer une lame, l'autre bras tiré en arrière (ne dessine PAS le projectile)",
      special2: "coup de pied plongeant : en l'air (aucun sol visible), corps en diagonale, une jambe tendue pointée vers le bas et l'avant, l'autre repliée, bras en arrière",
      projectile: "une lame d'énergie tranchante en forme de croissant, avec une courte traînée vers la gauche",
    },
    spriteRig: { special1: 'throwS', special2: 'diveK' },
    build() {
      const m = normals();
      const bl = (heavy) => SP({ name: "Lame d'ombre", total: 28, sprite: 'special1', anim: [[0, 'windP', 0.9], [5, 'throwS', 1], [18, 'idle', 0.35]],
        proj: { t: 6, kind: 'blade', vx: heavy ? 19 : 14, y: -130, w: 44, h: 34, dmg: 52, hs: 17, bs: 12, kb: 5, fx: 'slash' } });
      const tp = (heavy) => SP({ name: 'Chute fantôme', total: 90, landRec: 8, inv: [0, 9], sprite: 'special2', trail: true,
        anim: [[0, 'crouch', 0.9], [7, 'diveK', 1]], tele: { t: 7, mode: heavy ? 'behind' : 'front' }, vanish: [2, 7],
        hits: [H(9, 40, [0, -70, 80, 90], 95, { hs: 24, bs: 14, kb: 7, fx: 'slash', lvl: 'high' })] });
      m.s1l = bl(false); m.s1h = bl(true); m.s2l = tp(false); m.s2h = tp(true);
      const hits = [], an = [[0, 'charge', 0.5]];
      for (let i = 0; i < 7; i++) { hits.push(H(8 + i * 4, 3, [-20, -200, 140, 190], 36, { hs: 26, bs: 10, kb: 0, fx: 'slash', stop: 3, sw: i % 2 ? 'up' : 'down' })); an.push([7 + i * 4, i % 2 ? 'slash2' : 'slash', 1]); }
      hits.push(H(38, 5, [-20, -210, 150, 200], 95, { launch: [8, -16], bs: 18, kb: 12, fx: 'slash', stop: 14, sw: 'side' }));
      an.push([36, 'hk', 1], [52, 'idle', 0.3]);
      m.super = SU({ name: 'NUIT SANS FIN', total: 64, anim: an, tele: { t: 5, mode: 'near' }, vanish: [2, 5], inv: [0, 8], hits });
      return m;
    },
    combos: COMBOS,
    ai: { zoner: 0.45, antiAir: 'chp', ender: 's1h' },
  };
  for (const k in T) { T[k].id = k; T[k].moves = T[k].build(); for (const n in T[k].moves) T[k].moves[n].id = n; }

  const LOOKS = {
    balanced: { h: 1, bulk: 1, skin: '#f0bd8c', hair: 'spiky', hairCol: '#d8431f', top: '#2d5fd0', sleeve: 'none', outfit: 'gi', pants: '#f0ede4', belt: '#1d1b26', band: '#ffb300', glove: '#ffb300', accent: '#ff6a2b' },
    fast: { h: 0.94, bulk: 0.86, skin: '#eab692', hair: 'ponytail', hairCol: '#19c6c6', top: '#ffd23a', sleeve: 'none', outfit: 'stripe', pants: '#2b2b3a', shorts: true, belt: '#2b2b3a', glove: '#ffffff', shoe: '#ffd23a', accent: '#19c6c6' },
    heavy: { h: 1.08, bulk: 1.32, head: 0.95, skin: '#b9794f', hair: 'bald', hairCol: '#2a1a12', beard: '#2a1a12', top: '#3c8a4a', sleeve: 'none', outfit: 'emblem', pants: '#5a4632', belt: '#d9a441', glove: '#e8dcc0', shoe: '#26222a', accent: '#d9a441' },
    tech: { h: 0.98, bulk: 0.92, skin: '#dcae8e', hair: 'hood', hairCol: '#2b2540', top: '#3a3260', sleeve: 'long', outfit: 'none', pants: '#2b2540', belt: '#b3123a', scarf: '#b3123a', glove: '#1b1830', shoe: '#1b1830', accent: '#a25bff' },
  };
  FF.LOOKS = LOOKS;

  const BASE = [
    { id: 'ardan', name: 'ARDAN', template: 'balanced', color: '#ff6a2b', title: 'Le Poing Solaire', stage: 0,
      quote: "Reviens quand ta flamme brûlera plus fort.", ending: ["Le tournoi s'achève dans une pluie d'étincelles.", "Ardan desserre enfin les poings : la flamme qu'il cherchait", "n'était pas dans la victoire, mais dans le combat lui-même.", "Demain, il reprendra la route. Il reste tant d'amis à défier."] },
    { id: 'zelie', name: 'ZÉLIE', template: 'fast', color: '#19c6c6', title: "L'Éclair de la Ville", stage: 1,
      quote: "Trop lent ! Tu as cligné des yeux ?", ending: ["Personne n'a réussi à la toucher deux fois de suite.", "Zélie brandit le trophée... puis le lance à la foule.", "« Les médailles, ça ralentit. »", "Avant même la fin des applaudissements, elle a disparu."] },
    { id: 'bruno', name: 'BRUNO', template: 'heavy', color: '#d9a441', title: 'La Montagne', stage: 2,
      quote: "La montagne ne recule pas.", ending: ["Le sol tremble encore sous les pas du champion.", "Bruno soulève le trophée d'une seule main,", "puis invite tous ses adversaires à sa table.", "Chez lui, un combat se termine toujours par un festin."] },
    { id: 'sable', name: 'SABLE', template: 'tech', color: '#a25bff', title: "L'Ombre Sans Nom", stage: 3,
      quote: "Tu frappais une ombre depuis le début.", ending: ["Quand les projecteurs s'allument, le ring est vide.", "Sur le trophée, un simple ruban rouge noué.", "On dit que Sable observe déjà le prochain tournoi,", "quelque part entre deux battements de cils."] },
  ];

  FF.makeChar = (def) => {
    const tpl = T[def.template] || T.balanced;
    const look = def.look || Object.assign({}, LOOKS[tpl.id], def.custom ? { top: def.color, accent: def.color, band: def.color } : {});
    return Object.assign({ title: 'Nouveau challenger', quote: "À qui le tour ?", stage: 0,
      ending: ['Un nouveau champion est né.', `${def.name} a prouvé sa valeur face aux meilleurs.`, "Mais ce n'est que le début de la légende..."] },
      def, { tpl, look, moves: tpl.moves, stats: tpl.stats, color: def.color || look.accent });
  };

  FF.roster = BASE.map(FF.makeChar);
  FF.charById = (id) => FF.roster.find((c) => c.id === id);

  // personnages créés dans le menu Options > Personnages (stockés sur l'appareil)
  FF.loadCustom = () => {
    let list = []; try { list = JSON.parse(localStorage.getItem('ff-custom-chars') || '[]'); } catch (e) {}
    list.forEach((d) => { if (!FF.charById(d.id)) FF.roster.push(FF.makeChar(Object.assign({ custom: true }, d))); });
  };
  FF.saveCustom = () => {
    const list = FF.roster.filter((c) => c.custom && !c.repo).map((c) => ({ id: c.id, name: c.name, template: c.template, color: c.color }));
    try { localStorage.setItem('ff-custom-chars', JSON.stringify(list)); } catch (e) {}
  };
  FF.addChar = (def) => { const c = FF.makeChar(def); const i = FF.roster.findIndex((r) => r.id === c.id); if (i >= 0) FF.roster[i] = c; else FF.roster.push(c); return c; };
  FF.setTemplate = (c, tplId) => { const tpl = T[tplId]; c.template = tplId; c.tpl = tpl; c.moves = tpl.moves; c.stats = tpl.stats; if (c.custom) c.look = Object.assign({}, LOOKS[tplId], { top: c.color, accent: c.color, band: c.color }); };
})();
