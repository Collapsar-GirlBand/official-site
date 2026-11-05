/* JIZURA pack: decorC — 12 premium graphic accents: luxury typography, celestial motifs, architectural geometry, haute couture patterns */
(() => {
'use strict';
const E = J.E;
const PK = 'decorC';
const DEG = J.DEG, TAU = J.TAU;

/* ============================================================
   shared helpers (mirrors decor / decorB)
   ============================================================ */
const U = env => Math.min(env.W, env.H) / 1080;
const MG = env => Math.round(Math.min(env.W, env.H) * 0.05);
const monoF = env => (env.st.fonts.mono && env.st.fonts.mono[0]) || 'mono';
const bodyF = env => (env.st.fonts.body && env.st.fonts.body[0]) || 'gothic_med';
const serifF = env => (env.st.fonts.serif && env.st.fonts.serif[0]) || 'mincho';
const dark = env => J.lum(env.sc.bg) < 0.5;
const inE = (env, d = 0.4, delay = 0, ease = E.outExpo) => ease(J.clamp((env.lt - delay) / d));
const outE = env => 1 - E.inCubic(env.pOut);
const L2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const colOf = (env, c, g) => (env.pass === 'main' ? c : g ? env.passColor : null);
const FS = env => Math.max(12, 16 * U(env));
const BBC = new WeakMap();
const getBB = (env, bb) => {
  if (bb && isFinite(bb.x0 + bb.x1 + bb.y0 + bb.y1) && bb.x1 > bb.x0 && bb.y1 > bb.y0) {
    const b = { x0: Math.max(bb.x0, -env.W * 0.1), x1: Math.min(bb.x1, env.W * 1.1), y0: Math.max(bb.y0, -env.H * 0.1), y1: Math.min(bb.y1, env.H * 1.1), boxes: bb.boxes || [], cx: bb.cx, cy: bb.cy };
    if (b.x1 <= b.x0) { b.x0 = bb.x0; b.x1 = bb.x1; }
    if (b.y1 <= b.y0) { b.y0 = bb.y0; b.y1 = bb.y1; }
    if (env.cut) BBC.set(env.cut, b);
    return b;
  }
  const c = env.cut && BBC.get(env.cut);
  return c || Object.assign({ boxes: [] }, J.centerBB(env, null));
};
const bw = bb => bb.x1 - bb.x0, bh = bb => bb.y1 - bb.y0;
const hitBB = (x0, y0, x1, y1, bb, pad = 0) => !(x1 < bb.x0 - pad || x0 > bb.x1 + pad || y1 < bb.y0 - pad || y0 > bb.y1 + pad);
function nearBB(env, bb, w, h, P, gap) {
  const { W, H } = env, m = MG(env) * 0.8;
  const sx0 = P.right ? 1 : -1, sy0 = P.low ? 1 : -1;
  const order = P.corner ? [[sx0, sy0], [-sx0, sy0], [sx0, -sy0], [-sx0, -sy0]] : [[sx0, sy0], [sx0, -sy0], [-sx0, sy0], [-sx0, -sy0]];
  const tries = [];
  for (const [sx, sy] of order) {
    const ax = sx > 0 ? bb.x1 - w : bb.x0, ox = sx > 0 ? bb.x1 + gap : bb.x0 - gap - w;
    const ay = sy > 0 ? bb.y1 + gap : bb.y0 - gap - h, iy = sy > 0 ? bb.y1 - h : bb.y0;
    if ((P.v | 0) % 2) tries.push([ox, iy, sx, sy], [ax, ay, sx, sy], [ox, ay, sx, sy]);
    else tries.push([ax, ay, sx, sy], [ox, iy, sx, sy], [ox, ay, sx, sy]);
  }
  for (const [x, y, sx, sy] of tries) {
    const X = J.clamp(x, m, Math.max(m, W - m - w)), Y = J.clamp(y, m, Math.max(m, H - m - h));
    if (!hitBB(X, Y, X + w, Y + h, bb, gap * 0.4)) return { x: X, y: Y, cx: X + w / 2, cy: Y + h / 2, ok: true, sx, sy };
  }
  return cornerSpot(env, bb, w, h, P);
}
function cornerSpot(env, bb, w, h, P, mk = 1) {
  const { W, H } = env, m = MG(env) * mk;
  const sx0 = P.right ? 1 : -1, sy0 = P.low ? 1 : -1;
  const order = [[sx0, sy0], [-sx0, sy0], [sx0, -sy0], [-sx0, -sy0]];
  let best = null, bestA = 1e18;
  for (const [sx, sy] of order) {
    const X = sx > 0 ? W - m - w : m, Y = sy > 0 ? H - m - h : m;
    if (!hitBB(X, Y, X + w, Y + h, bb, 8)) return { x: X, y: Y, cx: X + w / 2, cy: Y + h / 2, ok: true, sx, sy };
    const ov = Math.max(0, Math.min(X + w, bb.x1) - Math.max(X, bb.x0)) * Math.max(0, Math.min(Y + h, bb.y1) - Math.max(Y, bb.y0));
    if (ov < bestA) { bestA = ov; best = { x: X, y: Y, cx: X + w / 2, cy: Y + h / 2, ok: false, sx, sy }; }
  }
  return best;
}
function stroke(env, pts, c, lw, a = 1, g = false, o) {
  const k = colOf(env, c, g); if (!k || a <= 0.003 || !pts || pts.length < 2) return;
  const ctx = env.ctx;
  ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = k; ctx.lineWidth = lw;
  ctx.lineCap = (o && o.cap) || 'butt'; ctx.lineJoin = (o && o.join) || 'miter';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (o && o.close) ctx.closePath();
  ctx.stroke(); ctx.globalAlpha = 1; ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
}
function segs(env, list, c, lw, a = 1, g = false, cap) {
  const k = colOf(env, c, g); if (!k || a <= 0.003 || !list.length) return;
  const ctx = env.ctx;
  ctx.globalAlpha = Math.min(1, a); ctx.strokeStyle = k; ctx.lineWidth = lw; ctx.lineCap = cap || 'butt';
  ctx.beginPath();
  for (const s of list) { ctx.moveTo(s[0], s[1]); ctx.lineTo(s[2], s[3]); }
  ctx.stroke(); ctx.globalAlpha = 1; ctx.lineCap = 'butt';
}
function dots(env, list, c, a = 1, g = false) {
  const k = colOf(env, c, g); if (!k || a <= 0.003 || !list.length) return;
  const ctx = env.ctx;
  ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = k; ctx.beginPath();
  for (const d of list) { if (d[2] <= 0.05) continue; ctx.moveTo(d[0] + d[2], d[1]); ctx.arc(d[0], d[1], d[2], 0, TAU); }
  ctx.fill(); ctx.globalAlpha = 1;
}
function rects(env, list, c, a = 1, g = false) {
  const k = colOf(env, c, g); if (!k || a <= 0.003 || !list.length) return;
  const ctx = env.ctx;
  ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = k; ctx.beginPath();
  for (const r of list) if (r[2] > 0 && r[3] > 0) ctx.rect(r[0], r[1], r[2], r[3]);
  ctx.fill(); ctx.globalAlpha = 1;
}
function polys(env, list, c, a = 1, g = false) {
  const k = colOf(env, c, g); if (!k || a <= 0.003 || !list.length) return;
  const ctx = env.ctx;
  ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = k; ctx.beginPath();
  for (const pts of list) { if (pts.length < 3) continue; ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
  ctx.fill(); ctx.globalAlpha = 1;
}
function dash(env, x0, y0, x1, y1, on, off, c, lw, a = 1, phase = 0) {
  if (env.pass !== 'main' || a <= 0.003) return;
  const L = Math.hypot(x1 - x0, y1 - y0); if (L < 1) return;
  const dx = (x1 - x0) / L, dy = (y1 - y0) / L, per = on + off, list = [];
  let s = -(((phase % per) + per) % per);
  for (let i = 0; i < 600 && s < L; i++, s += per) {
    const a0 = Math.max(0, s), a1 = Math.min(L, s + on);
    if (a1 > a0) list.push([x0 + dx * a0, y0 + dy * a0, x0 + dx * a1, y0 + dy * a1]);
  }
  segs(env, list, c, lw, a, false);
}
function part(pts, e0, e1) {
  e0 = J.clamp(e0); e1 = J.clamp(e1);
  if (e1 <= e0 || pts.length < 2) return [];
  const d = [0];
  for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = d[d.length - 1]; if (L <= 0) return [];
  const A = e0 * L, B = e1 * L;
  const at = s => { let i = 1; while (i < d.length - 1 && d[i] < s) i++; const k = (s - d[i - 1]) / Math.max(1e-6, d[i] - d[i - 1]); return L2(pts[i - 1], pts[i], J.clamp(k)); };
  const out = [at(A)];
  for (let i = 1; i < pts.length - 1; i++) if (d[i] > A && d[i] < B) out.push(pts[i]);
  out.push(at(B));
  return out;
}
const label = (env, text, x, y, o) => env.draw(Object.assign({ text: String(text), font: monoF(env), size: FS(env), x, y, color: env.sc.sub, align: 'left', track: 0.08, ghost: false }, o || {}));
const textW = (text, font, size, track = 0.08) => J.measure({ text: String(text), font, size, track }).w;
const pad2 = (n, k = 2) => String(Math.max(0, Math.floor(n))).padStart(k, '0');
function lyricChar(env, salt) {
  const arr = [...String(env.cut.text || env.cut.lineText || '')].filter(c => c.trim() && !J.isPunct(c));
  if (!arr.length) return '';
  const kan = arr.filter(c => J.isKanji(c));
  const pool = kan.length ? kan : arr.filter(c => J.isKata(c) || J.isHira(c) || J.isLatin(c));
  const p = pool.length ? pool : arr;
  return p[J.h(env.cut.seed, salt | 0, 5) % p.length];
}
const clearOf = (bb, x, y, pad, soft) => { const dx = Math.max(bb.x0 - pad - x, 0, x - bb.x1 - pad), dy = Math.max(bb.y0 - pad - y, 0, y - bb.y1 - pad); return J.clamp(Math.hypot(dx, dy) / soft); };
const wrap = (v, lo, span) => lo + (((v - lo) % span) + span) % span;

const DEF = {};

/* ============================================================
   ✦ 1  黄金比フレーム — Golden ratio frame: nested golden rectangles with a spiralling construction arc
   ============================================================ */
DEF.goldenFrame = {
  name: '黄金比フレーム', tags: ['graphic', 'editorial', 'calm'], w: 1, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const phi = 1.6180339887;
    const S = J.clamp(Math.min(W, H) * 0.22, 140 * u, 300 * u);
    const sp = P.corner ? cornerSpot(env, bb, S * 1.1, S * 1.1 / phi, P) : nearBB(env, bb, S * 1.1, S * 1.1 / phi, P, 24 * u);
    const a = o * (sp.ok ? 1 : 0.35), lw = Math.max(1, 1.2 * u);
    const e = E.outExpo(J.clamp(env.lt / 0.7));

    // draw nested golden rectangles
    let rw = S, rh = S / phi, cx = sp.cx, cy = sp.cy;
    const dir = P.right ? 1 : -1;
    for (let i = 0; i < 7 && rw > 8 * u; i++) {
      const ei = E.outExpo(J.clamp((env.lt - i * 0.06) / 0.5));
      if (ei <= 0) break;
      const x0 = cx - rw / 2, y0 = cy - rh / 2;
      const col = i === 0 ? sc.fg : (i % 3 === 0 ? sc.accent : sc.sub);
      const al = a * (0.9 - i * 0.08) * ei;
      stroke(env, [[x0, y0], [x0 + rw * ei, y0], [x0 + rw * ei, y0 + rh * ei], [x0, y0 + rh * ei]], col, i === 0 ? lw * 1.4 : lw, al, false, { close: true });

      // quarter-arc within the square portion
      const sqSide = Math.min(rw, rh);
      const arcR = sqSide * ei;
      if (arcR > 4 * u) {
        const corners = [[x0, y0], [x0 + rw, y0], [x0 + rw, y0 + rh], [x0, y0 + rh]];
        const ci = (i + (dir > 0 ? 0 : 2)) % 4;
        const acx = corners[ci][0], acy = corners[ci][1];
        const startAng = (-90 + ci * 90 + (dir > 0 ? 0 : 180)) % 360;
        env.arc(acx, acy, arcR * 0.98, startAng, startAng + 90 * ei, sc.accent, lw * 0.8, al * 0.6, false);
      }

      // subdivide: remove the square and keep the smaller rectangle
      if (rw > rh) { const sq = rh; cx += (rw - sq) / 2 * (i % 2 ? -1 : 1) * dir; rw -= sq; }
      else { const sq = rw; cy += (rh - sq) / 2 * (i % 2 ? 1 : -1); rh -= sq; }
    }

    // "φ = 1.618" label
    const fs = FS(env) * 0.8;
    const el = inE(env, 0.3, 0.4) * o;
    label(env, 'φ = 1.618', sp.x + 4 * u, sp.y + S / phi + fs * 1.8, { size: fs, alpha: el, color: sc.accent, track: 0.12 });
  },
};

/* ============================================================
   ✦ 2  月相 — Moon phase indicator: a crescent moon with the current progress phase
   ============================================================ */
DEF.moonPhase = {
  name: '月相', tags: ['emotional', 'calm', 'editorial'], w: 0.8, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc, ctx } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;
    const R = J.clamp(Math.min(env.W, env.H) * 0.06, 36 * u, 72 * u);
    const sp = nearBB(env, bb, R * 2.6, R * 3, P, 20 * u);
    const cx = sp.cx, cy = sp.y + R * 1.2;
    const a = o * (sp.ok ? 1 : 0.4);
    const e = E.outCubic(J.clamp(env.lt / 0.55));
    const prog = J.clamp(env.lt / Math.max(0.1, env.cut.dur));
    const phase = prog * 8;  // 0-8 phases

    // draw the moon disc
    const r = R * e;
    if (r < 2) return;
    ctx.save();
    // full disc (dim background)
    ctx.globalAlpha = a * 0.15;
    ctx.fillStyle = sc.fg;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    // illuminated part using clipping
    ctx.globalAlpha = a * 0.85;
    ctx.fillStyle = sc.fg;
    ctx.beginPath();
    // left half arc
    ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
    // right half: elliptical curve whose x-radius varies with phase
    const illumination = Math.cos(phase / 8 * TAU) * r;
    ctx.ellipse(cx, cy, Math.abs(illumination), r, 0, Math.PI / 2, -Math.PI / 2, illumination > 0);
    ctx.fill();
    ctx.restore();

    // thin orbital ring
    env.arc(cx, cy, r * 1.2, -90, -90 + 360 * e, sc.sub, Math.max(1, u * 0.8), a * 0.4, false);

    // small stars around
    const starDots = [];
    for (let i = 0; i < 5; i++) {
      const ang = J.r(P.seed, i, 1) * TAU;
      const dist = r * (1.4 + J.r(P.seed, i, 2) * 0.8);
      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(env.ltb * (2 + i * 0.7) + i));
      const q = E.outBack(J.clamp((env.lt - 0.2 - i * 0.08) / 0.3), 2);
      if (q > 0) starDots.push([cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist, (1.2 + J.r(P.seed, i, 3)) * u * q * twinkle]);
    }
    dots(env, starDots, sc.fg, a * 0.7);

    // phase name
    const fs = FS(env) * 0.72;
    const el = inE(env, 0.3, 0.35) * a;
    const names = ['●', '◐', '◑', '◐', '○', '◐', '◑', '◐'];
    const pi = Math.floor(phase) % 8;
    label(env, `${names[pi]} ${pad2(Math.round(prog * 100))}%`, cx - R * 0.8, cy + r * 1.35 + fs, { size: fs, alpha: el, track: 0.14 });
  },
};

/* ============================================================
   ✦ 3  建築グリッド — Architectural blueprint grid with construction lines and annotation
   ============================================================ */
DEF.blueprintGrid = {
  name: '建築グリッド', tags: ['graphic', 'editorial', 'glitch'], w: 1, layer: 'back', subtle: true,
  draw(env, bb, P) {
    const { W, H, sc } = env, u = U(env);
    if (env.pass !== 'main' || env.lt < 0) return;
    const o = outE(env) * inE(env, 0.5, 0, E.outCubic); if (o <= 0.003) return;

    const g = J.clamp(Math.min(W, H) * 0.04, 28 * u, 52 * u);
    const m = MG(env);
    const e = E.outCubic(J.clamp(env.lt / 0.65));
    const col = dark(env) ? sc.sub : sc.fg;
    const lw = Math.max(1, u * 0.7);

    // fine grid
    const vLines = [], hLines = [];
    const cols2 = Math.ceil((W - 2 * m) / g), rows = Math.ceil((H - 2 * m) / g);
    for (let i = 0; i <= cols2; i++) {
      const x = m + i * g;
      if (x > W - m) break;
      const ye = m + (H - 2 * m) * e;
      vLines.push([x, m, x, ye]);
    }
    for (let j = 0; j <= rows; j++) {
      const y = m + j * g;
      if (y > H - m) break;
      const xe = m + (W - 2 * m) * e;
      if (y <= m + (H - 2 * m) * e)
        hLines.push([m, y, xe, y]);
    }
    segs(env, vLines, col, lw, 0.07 * o);
    segs(env, hLines, col, lw, 0.07 * o);

    // major grid (every 4th line)
    const majV = vLines.filter((_, i) => i % 4 === 0);
    const majH = hLines.filter((_, i) => i % 4 === 0);
    segs(env, majV, col, lw, 0.18 * o);
    segs(env, majH, col, lw, 0.18 * o);

    // tiny + marks at intersections of major lines
    const plusList = [];
    const ps = 3 * u;
    for (const v of majV) for (const h of majH) {
      const x = v[0], y = h[1];
      if (y <= m + (H - 2 * m) * e && x <= m + (W - 2 * m) * e)
        plusList.push([x - ps, y, x + ps, y], [x, y - ps, x, y + ps]);
    }
    segs(env, plusList, col, lw, 0.25 * o);

    // grid reference labels along edges
    const fs = FS(env) * 0.55;
    const el = inE(env, 0.3, 0.3) * o * 0.5;
    for (let i = 0; i <= cols2; i += 4) {
      const x = m + i * g;
      if (x > W - m || x > m + (W - 2 * m) * e) break;
      label(env, String.fromCharCode(65 + (i / 4) % 26), x, m - fs * 0.8, { size: fs, alpha: el, align: 'center' });
    }
    for (let j = 0; j <= rows; j += 4) {
      const y = m + j * g;
      if (y > H - m || y > m + (H - 2 * m) * e) break;
      label(env, pad2(j / 4 + 1), m - fs * 2, y + fs * 0.3, { size: fs, alpha: el, align: 'right' });
    }
  },
};

/* ============================================================
   ✦ 4  万華鏡 — Kaleidoscope: a symmetrical rotating mandala pattern
   ============================================================ */
DEF.kaleidoscope = {
  name: '万華鏡', tags: ['pop', 'emotional', 'graphic'], w: 1, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc, ctx } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;

    const R = J.clamp(Math.min(env.W, env.H) * 0.12, 80 * u, 170 * u);
    const sp = nearBB(env, bb, R * 2.4, R * 2.4, P, 24 * u);
    const cx = sp.cx, cy = sp.cy;
    const a = o * (sp.ok ? 1 : 0.35);
    const e = E.outExpo(J.clamp(env.lt / 0.65));
    const lw = Math.max(1, 1.2 * u);

    const N = 6 + ((P.v | 0) % 3) * 2;  // 6, 8, or 10 fold symmetry
    const rot = env.ltb * 8 * (P.right ? 1 : -1) + P.r * 360;

    // draw symmetric petals
    for (let i = 0; i < N; i++) {
      const baseAng = (rot + i * 360 / N) * DEG;
      const ei = E.outExpo(J.clamp((env.lt - i * 0.02) / 0.5));
      if (ei <= 0) continue;

      // inner petal (filled)
      const r1 = R * 0.25 * ei, r2 = R * 0.6 * ei;
      const halfAng = (180 / N) * 0.7 * DEG;
      const pts = [];
      pts.push([cx + Math.cos(baseAng) * r1 * 0.3, cy + Math.sin(baseAng) * r1 * 0.3]);
      pts.push([cx + Math.cos(baseAng - halfAng) * r1, cy + Math.sin(baseAng - halfAng) * r1]);
      pts.push([cx + Math.cos(baseAng) * r2, cy + Math.sin(baseAng) * r2]);
      pts.push([cx + Math.cos(baseAng + halfAng) * r1, cy + Math.sin(baseAng + halfAng) * r1]);
      polys(env, [pts], i % 3 === 0 ? sc.accent : sc.fg, a * 0.5 * ei);

      // outer ray (hairline)
      const r3 = R * 0.92 * ei;
      stroke(env, [[cx + Math.cos(baseAng) * r2, cy + Math.sin(baseAng) * r2], [cx + Math.cos(baseAng) * r3, cy + Math.sin(baseAng) * r3]], sc.sub, lw, a * 0.7 * ei);

      // tiny circle at outer tip
      if (i % 2 === 0) {
        const tx = cx + Math.cos(baseAng) * r3, ty = cy + Math.sin(baseAng) * r3;
        env.circle(tx, ty, 2.2 * u * ei, i % 4 === 0 ? sc.accent : sc.fg, null, 0, a * 0.8, false);
      }
    }

    // concentric rings
    [0.3, 0.6, 0.92].forEach((k, i) => {
      const re = R * k * e;
      env.arc(cx, cy, re, -90, -90 + 360 * e, sc.sub, lw * (i === 1 ? 1.3 : 0.8), a * (0.3 + i * 0.1), false);
    });

    // centre dot
    env.circle(cx, cy, 3 * u * e, sc.accent, null, 0, a, false);
  },
};

/* ============================================================
   ✦ 5  光のプリズム — Light prism: a triangle splitting white light into spectral bands
   ============================================================ */
DEF.prismLight = {
  name: '光のプリズム', tags: ['pop', 'graphic', 'emotional'], w: 0.9, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { W, H, sc, ctx } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;

    const S = J.clamp(Math.min(W, H) * 0.14, 90 * u, 180 * u);
    const sp = nearBB(env, bb, S * 2.8, S * 1.6, P, 24 * u);
    const cx = sp.cx, cy = sp.cy;
    const a = o * (sp.ok ? 1 : 0.35);
    const e = E.outExpo(J.clamp(env.lt / 0.6));
    const lw = Math.max(1, 1.4 * u);

    // prism triangle
    const h = S * 0.8, hw = h * 0.58;
    const tri = [[cx, cy - h * 0.45], [cx - hw, cy + h * 0.55], [cx + hw, cy + h * 0.55]];
    // draw with progressive reveal
    stroke(env, part([...tri, tri[0]], 0, e), sc.fg, lw * 1.5, a * 0.9, false, { join: 'round' });

    // incoming white beam (left)
    const beamStart = [cx - S * 1.3, cy + h * 0.08];
    const beamHit = [cx - hw * 0.35, cy - h * 0.08];
    const beamE = E.outExpo(J.clamp((env.lt - 0.1) / 0.4));
    if (beamE > 0) {
      stroke(env, [beamStart, L2(beamStart, beamHit, beamE)], sc.fg, lw * 2, a * 0.85);
    }

    // spectral bands (right side)
    const specE = E.outExpo(J.clamp((env.lt - 0.3) / 0.5));
    if (specE > 0) {
      const exitPt = [cx + hw * 0.35, cy + h * 0.06];
      const spread = S * 0.6 * specE;
      const rayLen = S * 1.2 * specE;
      const nBands = 7;
      const hues = [0, 30, 55, 120, 200, 260, 300]; // ROYGBIV approximate
      for (let i = 0; i < nBands; i++) {
        const f = (i - (nBands - 1) / 2) / ((nBands - 1) / 2);
        const angle = f * 0.35 + 0.05;
        const endX = exitPt[0] + rayLen, endY = exitPt[1] + angle * spread;
        // use the accent/sub colors from the scheme instead of literal hues for consistency
        const bandCol = i === 0 || i === 6 ? sc.accent : (i === 3 ? sc.fg : sc.sub);
        const bandA = a * (0.4 + 0.3 * (1 - Math.abs(f))) * specE;
        stroke(env, [exitPt, [endX, endY]], bandCol, lw * (1.8 - Math.abs(f) * 0.8), bandA, false, { cap: 'round' });
      }
    }

    // label
    const fs = FS(env) * 0.72;
    const el = inE(env, 0.3, 0.5) * a;
    label(env, 'SPECTRUM', cx - S * 0.3, cy + h * 0.55 + fs * 2.2, { size: fs, alpha: el, track: 0.3 });
  },
};

/* ============================================================
   ✦ 6  神聖幾何学 — Sacred geometry: Flower of Life / Metatron's Cube pattern
   ============================================================ */
DEF.sacredGeometry = {
  name: '神聖幾何学', tags: ['calm', 'emotional', 'graphic'], w: 1, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;

    const R = J.clamp(Math.min(env.W, env.H) * 0.14, 100 * u, 200 * u);
    const sp = P.corner ? cornerSpot(env, bb, R * 2.3, R * 2.3, P) : nearBB(env, bb, R * 2.3, R * 2.3, P, 28 * u);
    const cx = sp.cx, cy = sp.cy;
    const a = o * (sp.ok ? 1 : 0.35);
    const lw = Math.max(1, u);
    const v = (P.v | 0) % 2;  // 0 = flower of life, 1 = Metatron's cube

    const rot = env.ltb * 3 * (P.right ? 1 : -1);

    if (v === 0) {
      // Flower of Life: 7 interlocking circles
      const centres = [[0, 0]];
      for (let i = 0; i < 6; i++) {
        const ang = (i * 60 + rot) * DEG;
        centres.push([Math.cos(ang) * R * 0.5, Math.sin(ang) * R * 0.5]);
      }
      centres.forEach(([x, y], i) => {
        const ei = E.outExpo(J.clamp((env.lt - i * 0.05) / 0.5));
        if (ei <= 0) return;
        const r = R * 0.5 * ei;
        env.arc(cx + x, cy + y, r, -90, -90 + 360 * ei, i === 0 ? sc.accent : sc.sub, lw, a * (i === 0 ? 0.7 : 0.45), false);
      });
      // outer bounding circle
      const eOuter = E.outExpo(J.clamp((env.lt - 0.35) / 0.5));
      env.arc(cx, cy, R * eOuter, -90, -90 + 360 * eOuter, sc.fg, lw * 1.2, a * 0.6, false);
    } else {
      // Metatron's Cube: 13 circles + connecting lines
      const centres = [[0, 0]];
      for (let ring = 1; ring <= 2; ring++) {
        const n = 6, r = R * 0.38 * ring;
        for (let i = 0; i < n; i++) {
          const ang = (i * 60 + rot + ring * 30) * DEG;
          centres.push([Math.cos(ang) * r, Math.sin(ang) * r]);
        }
      }
      // connecting lines (between all pairs)
      const lineList = [];
      const lineE = E.outExpo(J.clamp((env.lt - 0.15) / 0.6));
      for (let i = 0; i < centres.length; i++) for (let j = i + 1; j < centres.length; j++) {
        const d = Math.hypot(centres[j][0] - centres[i][0], centres[j][1] - centres[i][1]);
        if (d < R * 0.85) {
          const x0 = cx + centres[i][0], y0 = cy + centres[i][1];
          const x1 = cx + centres[j][0], y1 = cy + centres[j][1];
          const mx = x0 + (x1 - x0) * lineE, my = y0 + (y1 - y0) * lineE;
          lineList.push([x0, y0, mx, my]);
        }
      }
      segs(env, lineList, sc.sub, lw * 0.8, a * 0.3);

      // circles at each centre
      centres.forEach(([x, y], i) => {
        const ei = E.outBack(J.clamp((env.lt - i * 0.03) / 0.35), 1.5);
        if (ei <= 0) return;
        const r = R * 0.12 * ei;
        env.circle(cx + x, cy + y, r, null, i === 0 ? sc.accent : (i <= 6 ? sc.fg : sc.sub), lw, a * (0.5 + (i === 0 ? 0.3 : 0)), false);
        env.circle(cx + x, cy + y, 1.5 * u * ei, i === 0 ? sc.accent : sc.fg, null, 0, a * 0.6, false);
      });
    }
  },
};

/* ============================================================
   ✦ 7  砂時計 — Hourglass: a decorative hourglass with flowing sand particles
   ============================================================ */
DEF.hourglass = {
  name: '砂時計', tags: ['editorial', 'calm', 'emotional'], w: 0.8, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;

    const H = J.clamp(Math.min(env.W, env.H) * 0.18, 110 * u, 210 * u);
    const W2 = H * 0.4;
    const sp = nearBB(env, bb, W2 * 2.2, H * 1.3, P, 20 * u);
    const cx = sp.cx, cy = sp.cy;
    const a = o * (sp.ok ? 1 : 0.4);
    const e = E.outExpo(J.clamp(env.lt / 0.55));
    const prog = J.clamp(env.lt / Math.max(0.1, env.cut.dur));
    const lw = Math.max(1, 1.3 * u);

    // hourglass outline (two triangles meeting at a pinch)
    const top = H * 0.48, pinch = W2 * 0.08;
    const outline = [
      [cx - W2, cy - top], [cx + W2, cy - top],
      [cx + pinch, cy],
      [cx + W2, cy + top], [cx - W2, cy + top],
      [cx - pinch, cy],
    ];
    stroke(env, part([...outline, outline[0]], 0, e), sc.fg, lw * 1.3, a * 0.85, false, { join: 'round' });

    // top and bottom caps
    const capW = W2 * 1.1;
    segs(env, [
      [cx - capW, cy - top, cx + capW, cy - top],
      [cx - capW, cy + top, cx + capW, cy + top]
    ], sc.fg, lw * 1.8, a * e);

    // sand level in top half (decreasing) and bottom half (increasing)
    const sandTop = (1 - prog) * (top - 8 * u);
    const sandBot = prog * (top - 8 * u);

    // top sand (triangular fill)
    if (sandTop > 2 * u && e > 0.5) {
      const t = sandTop / (top - 8 * u);
      const w = J.lerp(pinch, W2 * 0.9, t);
      const y0 = cy - 4 * u, y1 = cy - 4 * u - sandTop;
      polys(env, [[[cx - w, y1], [cx + w, y1], [cx + pinch * 0.8, y0], [cx - pinch * 0.8, y0]]], sc.sub, a * 0.35);
    }
    // bottom sand
    if (sandBot > 2 * u && e > 0.5) {
      const t = sandBot / (top - 8 * u);
      const w = J.lerp(pinch, W2 * 0.9, t);
      const y0 = cy + 4 * u, y1 = cy + 4 * u + sandBot;
      polys(env, [[[cx - pinch * 0.8, y0], [cx + pinch * 0.8, y0], [cx + w, y1], [cx - w, y1]]], sc.accent, a * 0.3);
    }

    // falling sand stream (thin vertical line through pinch)
    if (prog < 0.98 && e > 0.5) {
      stroke(env, [[cx, cy - 3 * u], [cx, cy + 3 * u]], sc.fg, lw, a * (0.5 + 0.5 * Math.sin(env.ltb * 12)));
    }

    // falling particles
    const parts = [];
    for (let i = 0; i < 6; i++) {
      const r = k => J.r(P.seed, i, k);
      const y = cy - 2 * u + wrap(r(1) * 12 * u + env.ltb * 60 * u, 0, 12 * u);
      const x = cx + (r(2) - 0.5) * pinch * 1.5;
      parts.push([x, y, (0.8 + r(3)) * u]);
    }
    dots(env, parts, sc.fg, a * 0.6);

    // percentage
    const fs = FS(env) * 0.8;
    const el = inE(env, 0.3, 0.3) * a;
    label(env, `${pad2(Math.round(prog * 100))}%`, cx, cy + top + fs * 2.5, { size: fs, align: 'center', alpha: el, color: sc.accent });
  },
};

/* ============================================================
   ✦ 8  ダイヤモンドカット — Diamond cut: a brilliant-cut gemstone facet pattern
   ============================================================ */
DEF.diamondCut = {
  name: 'ダイヤモンドカット', tags: ['pop', 'graphic'], w: 0.9, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc, ctx } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;

    const S = J.clamp(Math.min(env.W, env.H) * 0.12, 80 * u, 160 * u);
    const sp = nearBB(env, bb, S * 1.8, S * 2, P, 22 * u);
    const cx = sp.cx, cy = sp.cy - S * 0.1;
    const a = o * (sp.ok ? 1 : 0.4);
    const e = E.outExpo(J.clamp(env.lt / 0.55));
    const lw = Math.max(1, u);

    // brilliant-cut diamond profile
    const crownH = S * 0.32, pavH = S * 0.68;
    const tableW = S * 0.35, crownW = S * 0.5;
    const girdleY = cy + crownH * 0.5;

    // crown (top)
    const crown = [
      [cx - tableW, cy - crownH * 0.5],
      [cx + tableW, cy - crownH * 0.5],
      [cx + crownW, girdleY],
      [cx - crownW, girdleY],
    ];
    // pavilion (bottom)
    const culet = [cx, girdleY + pavH];
    const pavL = [cx - crownW, girdleY];
    const pavR = [cx + crownW, girdleY];

    // draw crown facets
    const crownFacets = [
      [crown[0], crown[1], [cx + crownW * 0.3, girdleY * 0.99 + cy * 0.01]],
      [crown[0], [cx - crownW * 0.3, girdleY * 0.99 + cy * 0.01], crown[3]],
      [crown[1], crown[2], [cx + crownW * 0.3, girdleY * 0.99 + cy * 0.01]],
      [crown[0], crown[3], [cx - crownW * 0.3, girdleY * 0.99 + cy * 0.01]],
    ];
    crownFacets.forEach((f, i) => {
      const ei = E.outExpo(J.clamp((env.lt - i * 0.04) / 0.4));
      if (ei <= 0) return;
      stroke(env, f, i % 2 === 0 ? sc.fg : sc.sub, lw, a * 0.7 * ei, false, { close: true });
    });

    // draw pavilion facets
    const nFacets = 5;
    for (let i = 0; i < nFacets; i++) {
      const t0 = i / nFacets, t1 = (i + 1) / nFacets;
      const p0 = L2(pavL, pavR, t0), p1 = L2(pavL, pavR, t1);
      const ei = E.outExpo(J.clamp((env.lt - 0.15 - i * 0.04) / 0.4));
      if (ei <= 0) continue;
      const facet = [p0, p1, L2(L2(p0, culet, ei), L2(p1, culet, ei), 0.5)];
      stroke(env, facet, i % 2 === 0 ? sc.accent : sc.fg, lw, a * 0.65 * ei, false, { close: true, join: 'round' });
    }

    // outer outline
    const outline = [...crown, pavR, culet, pavL, crown[3]];
    stroke(env, part(outline, 0, e), sc.fg, lw * 1.5, a * 0.9, false, { join: 'round' });

    // sparkle flash
    const flash = Math.exp(-((env.lt - 0.5) * (env.lt - 0.5)) / 0.02);
    if (flash > 0.01) {
      const fLen = S * 0.6 * flash;
      const fLw = lw * 2.5 * flash;
      segs(env, [
        [cx - fLen, cy - crownH * 0.3, cx + fLen, cy - crownH * 0.3],
        [cx, cy - crownH * 0.3 - fLen, cx, cy - crownH * 0.3 + fLen * 0.6]
      ], sc.accent, fLw, a * flash);
    }
  },
};

/* ============================================================
   ✦ 9  波紋の池 — Ripple pond: concentric expanding ripples from a drop point (behind the lyric)
   ============================================================ */
DEF.ripplePond = {
  name: '波紋の池', tags: ['calm', 'emotional'], w: 1, layer: 'back', subtle: true,
  draw(env, bb, P) {
    if (env.pass !== 'main') return;
    const { W, H, sc } = env, u = U(env);
    const o = outE(env) * inE(env, 0.5, 0, E.outCubic); if (o <= 0.003 || env.lt < 0) return;

    const cx = W * (P.right ? 0.65 : 0.35) + J.rs(P.seed, 1) * W * 0.15;
    const cy = H * (P.low ? 0.65 : 0.35) + J.rs(P.seed, 2) * H * 0.15;
    const maxR = Math.hypot(W, H) * 0.5;
    const col = dark(env) ? sc.sub : sc.fg;
    const nRings = 8;
    const period = 0.8 + J.r(P.seed, 3) * 0.4;
    const lw = Math.max(1, u);

    for (let i = 0; i < nRings; i++) {
      const t = ((env.ltb / period + i / nRings) % 1);
      const r = t * maxR;
      const fade = Math.pow(1 - t, 1.5) * Math.min(1, t * 8);
      if (fade < 0.02 || r < 4 * u) continue;

      const dashed = (P.v | 0) % 2 === 1;
      if (dashed) {
        for (let s = 0; s < 36; s++) {
          env.arc(cx, cy, r, s * 10, s * 10 + 6, col, lw * (1 + (1 - t) * 0.8), fade * 0.25 * o, false);
        }
      } else {
        env.circle(cx, cy, r, null, col, lw * (1 + (1 - t) * 0.8), fade * 0.25 * o, false);
      }
    }

    // drop splash point
    const splashE = Math.exp(-env.ltb * 3 % 3);
    env.circle(cx, cy, (4 + splashE * 8) * u, col, null, 0, o * 0.4 * (0.3 + splashE * 0.7), false);
  },
};

/* ============================================================
   ✦ 10  織物パターン — Woven textile: an elegant weave pattern as a subtle backdrop
   ============================================================ */
DEF.weavePattern = {
  name: '織物パターン', tags: ['calm', 'editorial', 'emotional'], w: 0.9, layer: 'back', subtle: true,
  draw(env, bb, P) {
    const { W, H, sc } = env, u = U(env);
    if (env.pass !== 'main' || env.lt < 0) return;
    const o = outE(env) * inE(env, 0.5, 0, E.outCubic); if (o <= 0.003) return;

    const g = J.clamp(Math.min(W, H) * 0.022, 14 * u, 26 * u);
    const e = E.outCubic(J.clamp(env.lt / 0.7));
    const m = MG(env);
    const col = dark(env) ? sc.sub : sc.fg;
    const lw = Math.max(1, u * 0.9);

    // warp (vertical) threads
    const warpList = [];
    for (let x = m; x < W - m; x += g) {
      const ye = m + (H - 2 * m) * e;
      if (x < m + (W - 2 * m) * e)
        warpList.push([x, m, x, ye]);
    }
    segs(env, warpList, col, lw, 0.06 * o);

    // weft (horizontal) threads — with over-under illusion via alternating opacity
    const weftA = [], weftB = [];
    let row = 0;
    for (let y = m; y < H - m; y += g, row++) {
      if (y > m + (H - 2 * m) * e) break;
      const xe = m + (W - 2 * m) * e;
      let col2 = 0;
      for (let x = m; x < xe; x += g, col2++) {
        const over = (row + col2) % 2 === 0;
        (over ? weftA : weftB).push([x, y, Math.min(x + g, xe), y]);
      }
    }
    segs(env, weftA, col, lw * 1.3, 0.12 * o);
    segs(env, weftB, col, lw * 0.7, 0.04 * o);

    // accent thread every 8th row
    const accList = [];
    row = 0;
    for (let y = m; y < H - m; y += g, row++) {
      if (row % 8 !== 0) continue;
      if (y > m + (H - 2 * m) * e) break;
      const xe = m + (W - 2 * m) * e;
      accList.push([m, y, xe, y]);
    }
    segs(env, accList, sc.accent, lw * 0.8, 0.08 * o);
  },
};

/* ============================================================
   ✦ 11  星図盤 — Astrolabe: a rotating celestial chart with star positions and degree markings
   ============================================================ */
DEF.astrolabe = {
  name: '星図盤', tags: ['editorial', 'graphic', 'calm'], w: 1, layer: 'front',
  draw(env, bb0, P) {
    if (env.pass !== 'main') return;
    const bb = getBB(env, bb0), { sc } = env, u = U(env);
    const o = outE(env); if (o <= 0.003 || env.lt < 0) return;

    const R = J.clamp(Math.min(env.W, env.H) * 0.11, 80 * u, 160 * u);
    const sp = P.corner ? cornerSpot(env, bb, R * 2.4, R * 2.6, P) : nearBB(env, bb, R * 2.4, R * 2.6, P, 24 * u);
    const cx = sp.cx, cy = sp.y + R * 1.15;
    const a = o * (sp.ok ? 1 : 0.35);
    const e = E.outExpo(J.clamp(env.lt / 0.6));
    const lw = Math.max(1, u);
    const rot = env.ltb * 6 * (P.right ? 1 : -1);

    // outer ring with degree markings
    env.arc(cx, cy, R * e, -90, -90 + 360 * e, sc.fg, lw * 1.3, a * 0.7, false);
    env.arc(cx, cy, R * 0.92 * e, -90, -90 + 360 * e, sc.sub, lw, a * 0.4, false);

    // degree tick marks
    const ticks = [];
    for (let i = 0; i < 72 && i < 72 * e; i++) {
      const ang = (i * 5 + rot) * DEG;
      const r0 = R * 0.92, r1 = R * (i % 6 === 0 ? 1.0 : i % 3 === 0 ? 0.97 : 0.95);
      ticks.push([cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0, cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1]);
    }
    segs(env, ticks, sc.fg, lw, a * 0.6);

    // inner rings (ecliptic, horizon)
    [0.7, 0.45].forEach((k, i) => {
      const re = R * k * e;
      const rotOff = (i === 0 ? rot * 1.3 : -rot * 0.8);
      env.arc(cx, cy, re, -90 + rotOff, -90 + rotOff + 360 * e, sc.sub, lw * 0.8, a * (0.25 + i * 0.1), false);
    });

    // cross-wires
    const crossE = E.outExpo(J.clamp((env.lt - 0.2) / 0.4));
    if (crossE > 0) {
      const cr = R * 0.92 * crossE;
      const crossAng = rot * DEG;
      const cx1 = Math.cos(crossAng), cy1 = Math.sin(crossAng);
      const cx2 = Math.cos(crossAng + Math.PI / 2), cy2 = Math.sin(crossAng + Math.PI / 2);
      segs(env, [
        [cx + cx1 * cr, cy + cy1 * cr, cx - cx1 * cr, cy - cy1 * cr],
        [cx + cx2 * cr, cy + cy2 * cr, cx - cx2 * cr, cy - cy2 * cr],
      ], sc.sub, lw, a * 0.3);
    }

    // star positions
    const starList = [];
    for (let i = 0; i < 9; i++) {
      const starAng = (J.r(P.seed, i, 1) * 360 + rot * (0.8 + i * 0.05)) * DEG;
      const starR = R * (0.15 + J.r(P.seed, i, 2) * 0.7);
      const se = E.outBack(J.clamp((env.lt - 0.3 - i * 0.04) / 0.3), 1.8);
      if (se > 0 && starR < R * 0.88) {
        const sz = (1.5 + J.r(P.seed, i, 3) * 2) * u * se;
        starList.push([cx + Math.cos(starAng) * starR * e, cy + Math.sin(starAng) * starR * e, sz]);
      }
    }
    dots(env, starList, sc.fg, a * 0.8);
    // highlight brightest star
    if (starList.length > 0) {
      const s = starList[0];
      segs(env, [[s[0] - 6 * u, s[1], s[0] + 6 * u, s[1]], [s[0], s[1] - 6 * u, s[0], s[1] + 6 * u]], sc.accent, lw, a * 0.6);
    }

    // label
    const fs = FS(env) * 0.72;
    const el = inE(env, 0.3, 0.4) * a;
    label(env, `${pad2(Math.round(rot % 360), 3)}°`, cx - R * 0.2, cy + R * e + fs * 1.5, { size: fs, alpha: el, color: sc.accent, track: 0.08 });
  },
};

/* ============================================================
   ✦ 12  オーラ — Aura: soft luminous halos breathing around the lyric bounding box
   ============================================================ */
DEF.auraGlow = {
  name: 'オーラ', tags: ['emotional', 'calm', 'pop'], w: 1, layer: 'back', subtle: true,
  draw(env, bb0, P) {
    const bb = getBB(env, bb0), { W, H, sc, ctx } = env, u = U(env);
    if (env.pass !== 'main' || env.lt < 0) return;
    const o = outE(env) * inE(env, 0.6, 0, E.outCubic); if (o <= 0.003) return;

    const dk = dark(env);
    const pick = c => c && (dk ? J.lum(c) > 0.15 : J.lum(c) < 0.9) ? c : null;
    const c1 = pick(sc.accent) || sc.sub;
    const c2 = pick(sc.accent2) || pick(sc.sub) || c1;
    const breathe1 = 0.8 + 0.2 * Math.sin(env.ltb * 1.2 + P.r * 6);
    const breathe2 = 0.8 + 0.2 * Math.sin(env.ltb * 0.9 + P.r * 6 + 2);

    const cx = (bb.x0 + bb.x1) / 2, cy = (bb.y0 + bb.y1) / 2;
    const rx = bw(bb) / 2 + 40 * u, ry = bh(bb) / 2 + 30 * u;
    const maxR = Math.max(rx, ry) * 2.2;

    ctx.save();
    ctx.globalCompositeOperation = dk ? 'screen' : 'multiply';

    // primary aura
    const A1 = (dk ? 0.12 : 0.08) * o * breathe1;
    const g1 = ctx.createRadialGradient(cx, cy, Math.min(rx, ry) * 0.5, cx, cy, maxR);
    g1.addColorStop(0, J.rgba(c1, A1 * 0.8));
    g1.addColorStop(0.4, J.rgba(c1, A1 * 0.4));
    g1.addColorStop(0.7, J.rgba(c1, A1 * 0.15));
    g1.addColorStop(1, J.rgba(c1, 0));
    ctx.fillStyle = g1;
    ctx.fillRect(cx - maxR, cy - maxR, maxR * 2, maxR * 2);

    // secondary aura (offset)
    const ox = (P.right ? 1 : -1) * rx * 0.3, oy = (P.low ? 1 : -1) * ry * 0.3;
    const A2 = (dk ? 0.08 : 0.06) * o * breathe2;
    const g2 = ctx.createRadialGradient(cx + ox, cy + oy, Math.min(rx, ry) * 0.3, cx + ox, cy + oy, maxR * 0.75);
    g2.addColorStop(0, J.rgba(c2, A2));
    g2.addColorStop(0.5, J.rgba(c2, A2 * 0.3));
    g2.addColorStop(1, J.rgba(c2, 0));
    ctx.fillStyle = g2;
    ctx.fillRect(cx + ox - maxR, cy + oy - maxR, maxR * 2, maxR * 2);

    ctx.restore();
  },
};

/* ============================================================ registration */
for (const k of Object.keys(DEF)) {
  DEF[k].cl = true;
  if (!DEF[k].tags) DEF[k].tags = [];
  if (!DEF[k].tags.includes('cl')) DEF[k].tags.push('cl');
  J.register('decor', k, DEF[k], PK);
}
})();
