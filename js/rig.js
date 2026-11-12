/* Squelette procédural : dessine un personnage vectoriel dans n'importe quelle posture.
   Sert de personnage par défaut tant qu'aucun sprite n'est fourni, et de "guide de pose". */
(function () {
  const FF = window.FF, D = Math.PI / 180, KEYS = FF.POSE_KEYS;
  const OUT = '#15101c';

  const Rig = (FF.Rig = {
    clone(name) { return Object.assign({}, FF.POSES[name]); },
    // rapproche la posture courante de la cible (lissage exponentiel)
    approach(cur, target, rate) {
      for (const k of KEYS) cur[k] += (target[k] - cur[k]) * rate;
      cur.flip = target.flip || 0;
    },
    mix(a, b, k, out) {
      for (const key of KEYS) out[key] = a[key] + (b[key] - a[key]) * k;
      out.flip = k < 0.5 ? a.flip : b.flip; return out;
    },
  });

  function solve(p, L, s, b) {
    const TH = 46 * s, SH = 46 * s, TO = 60 * s, UA = 33 * s, FA = 32 * s, HR = 19 * s * (L.head || 1);
    const pts = {};
    const seg = (o, a, len) => ({ x: o.x + Math.sin(a * D) * len, y: o.y + Math.cos(a * D) * len });
    pts.hip = { x: 0, y: 0 };
    pts.sh = { x: Math.sin(p.t * D) * TO, y: -Math.cos(p.t * D) * TO };
    const ha = (p.t * 0.6 + p.hd) * D;
    pts.head = { x: pts.sh.x + Math.sin(ha) * (5 * s + HR), y: pts.sh.y - Math.cos(ha) * (5 * s + HR) };
    pts.shF = { x: pts.sh.x + 5 * s * b, y: pts.sh.y + 5 * s }; pts.shB = { x: pts.sh.x - 6 * s * b, y: pts.sh.y + 5 * s };
    pts.elF = seg(pts.shF, p.aF0, UA); pts.haF = seg(pts.elF, p.aF1, FA);
    pts.elB = seg(pts.shB, p.aB0, UA); pts.haB = seg(pts.elB, p.aB1, FA);
    pts.hpF = { x: 5 * s * b, y: 0 }; pts.hpB = { x: -5 * s * b, y: 0 };
    pts.knF = seg(pts.hpF, p.lF0, TH); pts.ftF = seg(pts.knF, p.lF1, SH);
    pts.knB = seg(pts.hpB, p.lB0, TH); pts.ftB = seg(pts.knB, p.lB1, SH);
    pts.toF = seg(pts.ftF, p.lF1 + 82, 15 * s); pts.toB = seg(pts.ftB, p.lB1 + 82, 15 * s);
    if (p.rot) {
      const c = Math.cos(p.rot * D), sn = Math.sin(p.rot * D);
      for (const k in pts) { const q = pts[k], x = q.x * c - q.y * sn, y = q.x * sn + q.y * c; q.x = x; q.y = y; }
    }
    // ancrage automatique : le point le plus bas touche le sol
    const lw = 9 * s * b;
    let maxY = Math.max(pts.ftF.y + lw, pts.ftB.y + lw, pts.toF.y + lw * 0.7, pts.toB.y + lw * 0.7, pts.knF.y + lw, pts.knB.y + lw,
      pts.hip.y + 15 * s, pts.head.y + HR, pts.haF.y + 7 * s, pts.haB.y + 7 * s, pts.sh.y + 16 * s);
    for (const k in pts) pts[k].y -= maxY;
    pts.HR = HR;
    return pts;
  }
  Rig.solve = solve;

  /* opt : scale, flash (0..1 blanc), sil (couleur de silhouette), alpha, time */
  Rig.draw = function (ctx, L, pose, x, y, facing, opt) {
    opt = opt || {};
    const s = (L.h || 1) * (opt.scale || 1), b = L.bulk || 1;
    const P = solve(pose, L, s, b), HR = P.HR, time = opt.time || 0;
    const sil = opt.sil, fl = opt.flash;
    const C = (c) => (sil ? sil : fl ? '#ffffff' : c);
    const out = sil ? sil : fl ? '#fff' : OUT;
    const ow = sil ? 0 : 5 * s;
    ctx.save();
    if (opt.alpha !== undefined) ctx.globalAlpha = opt.alpha;
    ctx.translate(x, y); ctx.scale(facing * (pose.flip ? -1 : 1), 1);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    const armW = 15 * s * b, legW = 19 * s * b;
    const dk = (c) => (sil || fl ? C(c) : FF.shade(c, -0.28));
    const line = (pts, w, col) => {
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.lineWidth = w; ctx.strokeStyle = col; ctx.stroke();
    };
    const limb = (a, m, e, w, c1, c2) => {
      if (ow) line([a, m, e], w + ow, out);
      line([a, m], w, c1); line([m, e], w * 0.92, c2);
      if (c1 !== c2) { ctx.beginPath(); ctx.arc(m.x, m.y, w * 0.46, 0, 7); ctx.fillStyle = c1; ctx.fill(); }
    };
    const blob = (p, r, col) => {
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fillStyle = col; ctx.fill();
      if (ow) { ctx.lineWidth = ow * 0.5; ctx.strokeStyle = out; ctx.stroke(); }
    };
    const arm = (sh, el, ha, back) => {
      const f = back ? dk : C;
      const up = L.sleeve === 'none' ? L.skin : L.top, lo = L.sleeve === 'long' ? L.top : L.skin;
      limb(sh, el, ha, armW, f(up), f(lo));
      blob(ha, armW * 0.68, f(L.glove || L.skin));
    };
    const leg = (hp, kn, ft, toe, back) => {
      const f = back ? dk : C;
      limb(hp, kn, ft, legW, f(L.pants), f(L.shorts ? L.skin : L.pants));
      if (ow) line([ft, toe], legW * 0.8 + ow, out);
      line([ft, toe], legW * 0.8, f(L.shoe || L.skin));
    };

    // écharpe / cape derrière
    if (L.scarf && !sil) {
      const n = P.sh, w = Math.sin(time * 0.12) * 6 * s;
      ctx.beginPath(); ctx.moveTo(n.x - 4 * s, n.y - 4 * s);
      ctx.quadraticCurveTo(n.x - 34 * s, n.y - 12 * s + w, n.x - 62 * s, n.y + 2 * s - w);
      ctx.quadraticCurveTo(n.x - 40 * s, n.y + 6 * s + w, n.x - 6 * s, n.y + 8 * s);
      ctx.closePath(); ctx.fillStyle = C(L.scarf); ctx.fill(); ctx.lineWidth = 2.5 * s; ctx.strokeStyle = out; ctx.stroke();
    }
    arm(P.shB, P.elB, P.haB, true);
    leg(P.hpB, P.knB, P.ftB, P.toB, true);
    leg(P.hpF, P.knF, P.ftF, P.toF, false);

    // buste
    const ta = Math.atan2(P.sh.y - P.hip.y, P.sh.x - P.hip.x), nx = -Math.sin(ta), ny = Math.cos(ta);
    const hw = 15 * s * b, sw = 22 * s * b;
    const up = { x: P.sh.x + Math.cos(ta) * 6 * s, y: P.sh.y + Math.sin(ta) * 6 * s };
    ctx.beginPath();
    ctx.moveTo(P.hip.x - nx * hw, P.hip.y - ny * hw); ctx.lineTo(P.hip.x + nx * hw, P.hip.y + ny * hw);
    ctx.lineTo(up.x + nx * sw, up.y + ny * sw); ctx.lineTo(up.x - nx * sw, up.y - ny * sw); ctx.closePath();
    if (ow) { ctx.lineWidth = ow + 8 * s; ctx.strokeStyle = out; ctx.stroke(); }
    ctx.lineWidth = 8 * s; ctx.strokeStyle = C(L.top); ctx.stroke(); ctx.fillStyle = C(L.top); ctx.fill();
    if (!sil && !fl) {
      // détail de tenue
      if (L.outfit === 'gi') {
        ctx.beginPath(); ctx.moveTo(up.x + nx * sw * 0.5, up.y + ny * sw * 0.5);
        ctx.lineTo(P.hip.x + nx * hw * 0.2 + (up.x - P.hip.x) * 0.35, P.hip.y + ny * hw * 0.2 + (up.y - P.hip.y) * 0.35);
        ctx.lineTo(up.x - nx * sw * 0.2, up.y - ny * sw * 0.2); ctx.closePath(); ctx.fillStyle = L.skin; ctx.fill();
        ctx.lineWidth = 2 * s; ctx.strokeStyle = FF.shade(L.top, -0.35); ctx.stroke();
      } else if (L.outfit === 'stripe') {
        ctx.beginPath(); ctx.moveTo(up.x + nx * sw * 0.9, up.y + ny * sw * 0.9);
        ctx.lineTo(P.hip.x - nx * hw * 0.6, P.hip.y - ny * hw * 0.6);
        ctx.lineWidth = 7 * s; ctx.strokeStyle = L.accent; ctx.stroke();
      } else if (L.outfit === 'emblem') {
        const cx = (up.x + P.hip.x) / 2 + nx * 4 * s, cy = (up.y + P.hip.y) / 2 + ny * 4 * s - 8 * s;
        ctx.beginPath(); ctx.arc(cx, cy, 9 * s, 0, 7); ctx.fillStyle = L.accent; ctx.fill();
      }
      // ceinture
      ctx.beginPath(); ctx.moveTo(P.hip.x - nx * (hw + 3 * s), P.hip.y - ny * (hw + 3 * s));
      ctx.lineTo(P.hip.x + nx * (hw + 3 * s), P.hip.y + ny * (hw + 3 * s));
      ctx.lineWidth = 9 * s; ctx.strokeStyle = L.belt; ctx.lineCap = 'butt'; ctx.stroke(); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(P.hip.x, P.hip.y); ctx.lineTo(P.hip.x - 6 * s, P.hip.y + 16 * s);
      ctx.lineWidth = 5 * s; ctx.stroke();
    }

    // tête
    ctx.save();
    ctx.translate(P.head.x, P.head.y); ctx.rotate((pose.t * 0.6 + pose.hd + pose.rot) * D);
    if (L.band && !sil) {
      const w = Math.sin(time * 0.15) * 5 * s;
      ctx.beginPath(); ctx.moveTo(-HR * 0.9, -HR * 0.3);
      ctx.quadraticCurveTo(-HR * 1.8, -HR * 0.5 + w, -HR * 2.5, HR * 0.1 - w);
      ctx.moveTo(-HR * 0.9, -HR * 0.2); ctx.quadraticCurveTo(-HR * 1.6, HR * 0.3 - w, -HR * 2.2, HR * 0.8 + w);
      ctx.lineWidth = 5 * s; ctx.strokeStyle = out; ctx.stroke(); ctx.lineWidth = 3 * s; ctx.strokeStyle = C(L.band); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, HR, 0, 7); ctx.fillStyle = C(L.hair === 'hood' ? L.hairCol : L.skin); ctx.fill();
    if (ow) { ctx.lineWidth = ow * 0.6; ctx.strokeStyle = out; ctx.stroke(); }
    if (!sil && !fl) {
      const hc = L.hairCol;
      ctx.fillStyle = hc; ctx.strokeStyle = out; ctx.lineWidth = 2.5 * s;
      const cap = (a0, a1) => { ctx.beginPath(); ctx.arc(0, 0, HR + 1.5 * s, a0 * D, a1 * D, true); ctx.closePath(); ctx.fill(); ctx.stroke(); };
      if (L.hair === 'spiky') {
        ctx.beginPath(); ctx.arc(0, 0, HR + 1 * s, -40 * D, 165 * D, true);
        const sp = [[150, 1.5], [185, 1.7], [215, 1.75], [245, 1.8], [275, 1.75], [305, 1.6]];
        ctx.beginPath(); ctx.moveTo(Math.cos(165 * D) * HR, Math.sin(165 * D) * HR);
        for (const [a, r] of sp) {
          ctx.lineTo(Math.cos(a * D) * HR * r, Math.sin(a * D) * HR * r);
          ctx.lineTo(Math.cos((a + 16) * D) * HR * 1.08, Math.sin((a + 16) * D) * HR * 1.08);
        }
        ctx.lineTo(Math.cos(-38 * D) * HR * 1.05, Math.sin(-38 * D) * HR * 1.05);
        ctx.arc(0, 0, HR * 0.72, -38 * D, 165 * D, true); ctx.closePath(); ctx.fill(); ctx.stroke();
      } else if (L.hair === 'ponytail') {
        const w = Math.sin(time * 0.13) * 5 * s;
        ctx.beginPath(); ctx.moveTo(-HR * 0.8, -HR * 0.5);
        ctx.quadraticCurveTo(-HR * 2.6, -HR * 1.0 + w, -HR * 2.3, HR * 1.3 - w);
        ctx.quadraticCurveTo(-HR * 1.6, HR * 0.2, -HR * 0.8, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        cap(-35, 150);
        ctx.beginPath(); ctx.moveTo(HR * 0.78, -HR * 0.62); ctx.quadraticCurveTo(HR * 1.05, 0, HR * 0.7, HR * 0.5);
        ctx.quadraticCurveTo(HR * 0.6, -HR * 0.1, HR * 0.3, -HR * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke();
      } else if (L.hair === 'long') {
        ctx.beginPath(); ctx.moveTo(HR * 0.5, -HR * 0.9); ctx.quadraticCurveTo(-HR * 1.9, -HR * 1.5, -HR * 1.5, HR * 1.9);
        ctx.quadraticCurveTo(-HR * 0.7, HR * 1.2, -HR * 0.3, HR * 0.2); ctx.closePath(); ctx.fill(); ctx.stroke(); cap(-35, 170);
      } else if (L.hair === 'mohawk') {
        ctx.beginPath(); ctx.moveTo(HR * 0.6, -HR * 0.8); ctx.quadraticCurveTo(0, -HR * 2.1, -HR * 1.1, -HR * 0.5);
        ctx.quadraticCurveTo(-HR * 0.3, -HR * 1.0, HR * 0.6, -HR * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke();
      } else if (L.hair === 'hood') {
        // cagoule : bande de peau pour les yeux
        ctx.save(); ctx.beginPath(); ctx.arc(0, 0, HR - 1, 0, 7); ctx.clip();
        ctx.fillStyle = L.skin; ctx.fillRect(-HR * 0.1, -HR * 0.42, HR * 1.2, HR * 0.5); ctx.restore();
      } else if (L.hair === 'short') cap(-45, 175);
      if (L.beard) {
        ctx.beginPath(); ctx.arc(0, 0, HR + 1 * s, 15 * D, 110 * D); ctx.quadraticCurveTo(HR * 0.3, HR * 0.5, HR * 0.95, HR * 0.25);
        ctx.closePath(); ctx.fillStyle = L.beard; ctx.fill(); ctx.stroke();
      }
      if (L.band) { ctx.beginPath(); ctx.arc(0, 0, HR + 0.5 * s, -28 * D, -168 * D, true); ctx.lineWidth = 6 * s; ctx.strokeStyle = L.band; ctx.lineCap = 'butt'; ctx.stroke(); ctx.lineCap = 'round'; }
      // visage
      ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(HR * 0.5, -HR * 0.12, HR * 0.1, HR * 0.17, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(HR * 0.25, -HR * 0.48); ctx.lineTo(HR * 0.78, -HR * 0.3); ctx.lineWidth = 3 * s; ctx.strokeStyle = OUT; ctx.stroke();
      if (L.hair !== 'hood') { ctx.beginPath(); ctx.moveTo(HR * 0.5, HR * 0.45); ctx.lineTo(HR * 0.82, HR * 0.4); ctx.lineWidth = 2.2 * s; ctx.stroke(); }
    }
    ctx.restore();

    arm(P.shF, P.elF, P.haF, false);
    ctx.restore();
    return P;
  };

  // portrait carré (tête en gros plan)
  Rig.portrait = function (ctx, L, size, bg) {
    ctx.save();
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size); }
    ctx.beginPath(); ctx.rect(0, 0, size, size); ctx.clip();
    const sc = size / 74, pose = FF.POSES.idle;
    const h = solve(pose, L, (L.h || 1) * sc, L.bulk || 1).head;
    Rig.draw(ctx, L, pose, size * 0.46 - h.x, size * 0.5 - h.y, 1, { scale: sc });
    ctx.restore();
  };
})();
