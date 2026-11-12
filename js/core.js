/* Fighting Friends — noyau : constantes, utilitaires, stockage */
(function () {
  const FF = (window.FF = {});
  FF.W = 960; FF.H = 540; FF.GROUND = 452; FF.STAGE_W = 1500;
  FF.FONT = '"Impact","Haettenschweiler","Arial Narrow Bold","Roboto Condensed","Arial Black",sans-serif';
  FF.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  FF.lerp = (a, b, t) => a + (b - a) * t;
  FF.rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
  FF.pick = (a) => a[(Math.random() * a.length) | 0];
  FF.shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  FF.easeOut = (t) => 1 - Math.pow(1 - FF.clamp(t, 0, 1), 3);
  FF.easeBack = (t) => { t = FF.clamp(t, 0, 1); const c = 2.2; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  // éclaircit (amt>0) ou assombrit (amt<0) une couleur #rrggbb
  const shadeCache = {};
  FF.shade = (hex, amt) => {
    const k = hex + amt; if (shadeCache[k]) return shadeCache[k];
    let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = (c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
    return (shadeCache[k] = `rgb(${f(r)},${f(g)},${f(b)})`);
  };
  FF.rgba = (hex, a) => {
    let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  };

  // réglages persistants
  const DEF = { sfx: true, music: true, difficulty: 1, rounds: 2, hitboxes: false };
  FF.settings = Object.assign({}, DEF);
  try { Object.assign(FF.settings, JSON.parse(localStorage.getItem('ff-settings') || '{}')); } catch (e) {}
  FF.saveSettings = () => { try { localStorage.setItem('ff-settings', JSON.stringify(FF.settings)); } catch (e) {} };

  // mini IndexedDB clé/valeur (sprites importés)
  let dbp = null;
  function db() {
    if (!dbp) dbp = new Promise((res, rej) => {
      const r = indexedDB.open('fighting-friends', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('kv');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  const tx = (mode, fn) => db().then((d) => new Promise((res, rej) => {
    const t = d.transaction('kv', mode); const rq = fn(t.objectStore('kv'));
    t.oncomplete = () => res(rq && rq.result); t.onerror = () => rej(t.error);
  }));
  FF.idb = {
    get: (k) => tx('readonly', (s) => s.get(k)),
    set: (k, v) => tx('readwrite', (s) => s.put(v, k)),
    del: (k) => tx('readwrite', (s) => s.delete(k)),
    all: () => db().then((d) => new Promise((res, rej) => {
      const out = []; const t = d.transaction('kv', 'readonly');
      const c = t.objectStore('kv').openCursor();
      c.onsuccess = () => { const cur = c.result; if (cur) { out.push({ key: cur.key, val: cur.value }); cur.continue(); } };
      t.oncomplete = () => res(out); t.onerror = () => rej(t.error);
    })),
  };
  FF.slug = (s) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'perso';
})();
