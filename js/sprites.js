/* Sprites des personnages : détourage du fond magenta, stockage local, chargement du dépôt, export zip */
(function () {
  const FF = window.FF;
  const data = {}; // data[charId][pose] = { img, w, h, adj:{s,dx,dy}, src }
  const S = (FF.Sprites = { data });
  const BY = FF.SPRITE_BY_KEY;

  // Supprime le fond magenta (#FF00FF), recadre sur le sujet. Retourne un canvas.
  S.process = function (image) {
    const iw = image.naturalWidth || image.width, ih = image.naturalHeight || image.height;
    const k = Math.min(1, 640 / Math.max(iw, ih));
    const w = Math.max(1, Math.round(iw * k)), h = Math.max(1, Math.round(ih * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(image, 0, 0, w, h);
    const id = x.getImageData(0, 0, w, h), d = id.data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const mx = Math.max(r, b), mn = Math.min(r, b);
      if (mx > 60 && Math.abs(r - b) / mx < 0.3) {
        const m = (mn - g) / mx;
        if (m > 0.55) d[i + 3] = 0;
        else if (m > 0.3) { // bord : semi-transparent + retrait de la teinte magenta
          const a = 1 - (m - 0.3) / 0.25; d[i + 3] = Math.round(d[i + 3] * a);
          d[i] = Math.round(g + (r - g) * a * 0.5); d[i + 2] = Math.round(g + (b - g) * a * 0.5);
        }
      }
      if (d[i + 3] > 24) { const px = p % w, py = (p / w) | 0; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; }
    }
    if (x1 < 0) { x0 = 0; y0 = 0; x1 = w - 1; y1 = h - 1; }
    x.putImageData(id, 0, 0);
    const o = document.createElement('canvas'); o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
    o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
    return o;
  };

  function put(charId, pose, canvas, adj, src) {
    (data[charId] = data[charId] || {})[pose] = { img: canvas, w: canvas.width, h: canvas.height, adj: Object.assign({ s: 1, dx: 0, dy: 0 }, adj || {}), src };
    if (pose === 'idle' || pose === 'portrait') delete data[charId]._portrait;
  }
  const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const key = (c, p) => `spr:${c}:${p}`;

  S.has = (charId, pose) => !!(data[charId] && data[charId][pose || 'idle']);
  S.count = (charId) => (data[charId] ? Object.keys(data[charId]).filter((k) => k[0] !== '_').length : 0);
  S.entry = (charId, pose) => data[charId] && data[charId][pose];

  S.importFile = async function (charId, pose, file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImg(url); const cv = S.process(img);
      put(charId, pose, cv, null, 'local');
      await FF.idb.set(key(charId, pose), { png: cv.toDataURL('image/png'), adj: data[charId][pose].adj });
    } finally { URL.revokeObjectURL(url); }
  };
  S.saveAdj = (charId, pose) => { const e = S.entry(charId, pose); if (e) return FF.idb.set(key(charId, pose), { png: e.img.toDataURL('image/png'), adj: e.adj }); };
  S.remove = async function (charId, pose) { if (data[charId]) { delete data[charId][pose]; delete data[charId]._portrait; } await FF.idb.del(key(charId, pose)); };
  S.removeChar = async function (charId) { const all = await FF.idb.all(); for (const r of all) if (r.key.startsWith(`spr:${charId}:`)) await FF.idb.del(r.key); delete data[charId]; };

  S.loadLocal = async function () {
    let all = []; try { all = await FF.idb.all(); } catch (e) { return; }
    await Promise.all(all.map(async (r) => {
      const m = /^spr:(.+):([a-z0-9_]+)$/.exec(r.key); if (!m || !BY[m[2]]) return;
      try { const img = await loadImg(r.val.png); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0); put(m[1], m[2], c, r.val.adj, 'local'); } catch (e) {}
    }));
  };

  // Personnages livrés dans le dépôt : assets/characters/index.json -> ["id", ...]
  S.loadRepo = async function () {
    let ids = [];
    try { const r = await fetch('assets/characters/index.json', { cache: 'no-cache' }); if (r.ok) ids = await r.json(); } catch (e) { return; }
    await Promise.all(ids.map(async (id) => {
      const base = `assets/characters/${id}/`; let def = {};
      try { const r = await fetch(base + 'character.json', { cache: 'no-cache' }); if (r.ok) def = await r.json(); } catch (e) {}
      const ex = FF.charById(id);
      if (!ex) FF.addChar(Object.assign({ id, name: id.toUpperCase(), template: 'balanced', color: '#ff3d7f', custom: true, repo: true }, def));
      const list = def.sprites || FF.SPRITE_POSES.map((s) => s.key);
      await Promise.all(list.map(async (pose) => {
        if (S.has(id, pose) || !BY[pose]) return; // une image importée localement est prioritaire
        try { const img = await loadImg(base + pose + '.png'); put(id, pose, S.process(img), def.adjust && def.adjust[pose], 'repo'); } catch (e) {}
      }));
    }));
  };

  // Trouve le sprite à utiliser pour une pose (avec repli si l'image manque)
  S.resolve = function (charId, pose) {
    const d = data[charId]; if (!d) return null;
    if (d[pose]) return { e: d[pose], key: pose };
    const fb = BY[pose] ? BY[pose].fb : [];
    for (const k of fb) if (d[k]) return { e: d[k], key: k };
    return d.idle ? { e: d.idle, key: 'idle' } : null;
  };

  function white(e) {
    if (!e.white) { const c = document.createElement('canvas'); c.width = e.w; c.height = e.h; const x = c.getContext('2d'); x.drawImage(e.img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, e.w, e.h); e.white = c; }
    return e.white;
  }

  /* Dessine le sprite d'une pose aux pieds (x,y). opt : scale, flash, alpha, sx, sy, rot(deg), tint */
  S.draw = function (ctx, char, pose, x, y, facing, opt) {
    const r = S.resolve(char.id, pose); if (!r) return false;
    opt = opt || {};
    const e = r.e, sp = BY[r.key], want = BY[pose] || sp, HH = 200 * (opt.scale || 1);
    let u = (sp.w ? (sp.w * HH) / e.w : ((sp.h || 1) * HH) / e.h) * e.adj.s;
    let sx = opt.sx || 1, sy = opt.sy || 1, rot = opt.rot || 0, lie = false;
    if (r.key !== pose) {
      if (want.h && sp.h && want.h < sp.h * 0.9) sy *= want.h / sp.h;
      if (pose === 'down' && r.key !== 'fall') lie = true;
      if (pose === 'fall') rot -= 55;
    }
    const w = e.w * u, h = e.h * u;
    ctx.save();
    if (opt.alpha !== undefined) ctx.globalAlpha = opt.alpha;
    ctx.translate(x, y); ctx.scale(facing, 1);
    ctx.translate(e.adj.dx * (opt.scale || 1), e.adj.dy * (opt.scale || 1));
    if (lie) { ctx.translate(h / 2, -w * 0.5); ctx.rotate(-Math.PI / 2); ctx.translate(0, 0); }
    else if (rot) { ctx.translate(0, -h / 2); ctx.rotate((rot * Math.PI) / 180); ctx.translate(0, h / 2); }
    ctx.scale(sx, sy);
    const im = opt.flash ? white(e) : e.img;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(im, lie ? -w / 2 : -sp.ax * w, -h, w, h);
    ctx.restore();
    return true;
  };

  // portrait carré : image "portrait" si fournie, sinon recadrage du haut de "idle"
  S.portrait = function (charId) {
    const d = data[charId]; if (!d) return null;
    if (d._portrait) return d._portrait;
    const c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d');
    if (d.portrait) { const e = d.portrait, s = Math.max(160 / e.w, 160 / e.h); x.drawImage(e.img, (160 - e.w * s) / 2, 0, e.w * s, e.h * s); }
    else if (d.idle) { const e = d.idle, sz = Math.min(e.w, e.h * 0.34), cx = FF.clamp(e.w * 0.56 - sz / 2, 0, e.w - sz); x.drawImage(e.img, cx, 0, sz, sz, 0, 0, 160, 160); }
    else return null;
    return (d._portrait = c);
  };

  /* ---------- export .zip (sans compression) ---------- */
  const crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (u8) => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = crcT[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(files) {
    const enc = new TextEncoder(), parts = [], cd = []; let off = 0;
    for (const f of files) {
      const name = enc.encode(f.name), crc = crc32(f.data), n = f.data.length;
      const lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, n, true); lh.setUint32(22, n, true); lh.setUint16(26, name.length, true);
      parts.push(new Uint8Array(lh.buffer), name, f.data);
      const ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, n, true); ch.setUint32(24, n, true); ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
      cd.push(new Uint8Array(ch.buffer), name); off += 30 + name.length + n;
    }
    const cdSize = cd.reduce((a, b) => a + b.length, 0);
    const end = new DataView(new ArrayBuffer(22)); end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, off, true);
    return new Blob([...parts, ...cd, new Uint8Array(end.buffer)], { type: 'application/zip' });
  }
  S.exportZip = function (char) {
    const d = data[char.id] || {}, enc = new TextEncoder(), files = [], adjust = {}, sprites = [];
    for (const pose in d) {
      if (pose[0] === '_') continue;
      const bin = atob(d[pose].img.toDataURL('image/png').split(',')[1]); const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      files.push({ name: `${char.id}/${pose}.png`, data: u8 }); adjust[pose] = d[pose].adj; sprites.push(pose);
    }
    const def = { id: char.id, name: char.name, template: char.template, color: char.color, title: char.title, quote: char.quote, sprites, adjust };
    files.unshift({ name: `${char.id}/character.json`, data: enc.encode(JSON.stringify(def, null, 2)) });
    const a = document.createElement('a'); a.href = URL.createObjectURL(zip(files)); a.download = `${char.id}.zip`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  // un personnage s'affiche en sprites dès que son image "idle" existe
  FF.usesSprites = (char) => S.has(char.id, 'idle');
})();
