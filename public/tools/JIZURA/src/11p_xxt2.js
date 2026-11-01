/* 星宿叹 II — quiet star charts, classical letters and distant encounters. */
(() => {
'use strict';
const E = J.E, TAU = Math.PI * 2;
const reg = (group, key, def) => J.register(group, key, Object.assign({
  vibes: ['xxt'], vibeExclusive: true, tags: ['calm', 'emotional', 'editorial'], w: 1,
}, def), 'xxt2');
const fade = env => E.outCubic(J.clamp(env.lt / 0.55)) * (1 - E.inCubic(env.pOut));
const hair = env => Math.max(1, Math.min(env.W, env.H) * 0.001);
const serif = (rng, st) => rng.pick(J.fontsOf(st, ['serif', 'body']));
const label = (env, text, x, y, alpha, align = 'center') => env.draw({
  text, x, y, font: env.st.fonts.mono?.[0] || 'mono', size: Math.min(env.W, env.H) * 0.015,
  color: env.sc.sub, alpha, align, ghost: false,
});
const star = (env, x, y, r, a, color = env.sc.accent) => {
  env.line([[x - r, y], [x + r, y]], color, hair(env), a, false);
  env.line([[x, y - r], [x, y + r]], color, hair(env), a, false);
  env.circle(x, y, r * 0.26, color, null, 0, a, false);
};
const lines = (text, per) => J.splitLines(String(text || ''), per);
const main = (env, text, x, y, w, h, extra = {}) => {
  const opts = Object.assign({ track: 0.12, lead: 1.5 }, extra);
  const font = env.cut.params.font;
  return J.mainDraw(env, Object.assign({ text, font, x, y, color: env.sc.fg,
    size: Math.min(Math.min(env.W, env.H) * 0.12, J.fitSize(text, font, w, h, opts)),
    align: 'center',
  }, opts));
};

reg('layout', 'xxtStarLedger', {
  name: '星官连字', ae: 'wave', fits: n => n >= 1 && n <= 24, treat: false,
  plan: (rng, cut, st) => ({ font: serif(rng, st), phase: rng.range(-0.4, 0.4) }),
  render(env) {
    const { W, H, sc, cut } = env, a = fade(env), M = Math.min(W, H);
    // A folded star chart: full lyric stays readable, paths sit below its glyphs.
    const chars = Array.from(String(cut.text || '').replace(/\s+/g, ''));
    const per = W < H ? 4 : 8, rows = Math.max(1, Math.ceil(chars.length / per));
    const rowH = Math.min(H * 0.52 / rows, M * 0.23);
    const size = Math.min(M * 0.085, W * 0.72 / Math.min(per, Math.max(1, chars.length)) * 0.65, rowH * 0.47);
    let box = null, previous = null;
    chars.forEach((ch, i) => {
      const row = Math.floor(i / per), col = i % per, count = Math.min(per, chars.length - row * per);
      const x = W * 0.5 + (col - (count - 1) / 2) * W * 0.76 / per;
      const y = H * 0.5 + (row - (rows - 1) / 2) * rowH + Math.sin(col * 1.1 + cut.params.phase) * rowH * 0.1;
      const point = [x, y + size * 0.84];
      const reveal = E.outCubic(J.clamp((env.lt - i * 0.025) / 0.5)) * (1 - E.inCubic(env.pOut));
      if (previous && col > 0) env.line([previous, point], sc.sub, hair(env), reveal * 0.33, false);
      star(env, point[0], point[1], M * 0.004, reveal * 0.8);
      box = J.unionBB(box, J.mainDraw(env, { text: ch, font: cut.params.font, size, x, y, mi: i, color: sc.fg }));
      previous = point;
    });
    label(env, '星 官 · 连 缀', W * 0.5, H * 0.14, a * 0.65);
    label(env, '一 字 一 星 ／ 遥 遥 相 系', W * 0.5, H * 0.86, a * 0.45);
    return box;
  },
});

reg('layout', 'xxtFateLetter', {
  name: '宿命书简', ae: 'vcols', fits: n => n >= 1 && n <= 30, treat: 'safe',
  plan: (rng, cut, st) => ({ font: serif(rng, st), side: rng.pick([-1, 1]) }),
  render(env) {
    const { W, H, sc } = env, a = fade(env), M = Math.min(W, H), port = W < H;
    const cx = W * (port ? 0.5 : env.cut.params.side > 0 ? 0.58 : 0.42);
    const rw = W * (port ? 0.76 : 0.49), rh = H * 0.72;
    env.rect(cx - rw / 2, H * 0.14, rw, rh, sc.sub, a * 0.035, false);
    for (const side of [-1, 1]) {
      const x = cx + side * rw / 2;
      env.line([[x, H * 0.14], [x, H * 0.86]], sc.sub, hair(env), a * 0.4, false);
      env.line([[x, H * 0.14], [x - side * M * 0.035, H * 0.14]], sc.sub, hair(env), a * 0.6, false);
    }
    const text = lines(env.cut.text, port ? 5 : 8);
    const box = main(env, text, cx, H * 0.5, rw * 0.78, rh * 0.62, { track: 0.18, lead: 1.7 });
    label(env, '寄 ／ 未 抵 达 的 星 辰', cx, H * 0.21, a * 0.65);
    star(env, cx, H * 0.79, M * 0.008, a * 0.7);
    return box;
  },
});

reg('layout', 'xxtDistantTwins', {
  name: '隔岸双星', ae: 'mixed', fits: n => n >= 2 && n <= 24,
  plan: (rng, cut, st) => ({ font: serif(rng, st), tilt: rng.pick([-1, 1]) }),
  render(env) {
    const { W, H, sc } = env, a = fade(env), port = W < H, M = Math.min(W, H);
    const chars = Array.from(String(env.cut.text || '').trim()), half = Math.ceil(chars.length / 2);
    const chunks = [chars.slice(0, half).join(''), chars.slice(half).join('')];
    const points = port ? [[W * 0.5, H * 0.32], [W * 0.5, H * 0.68]] : [[W * 0.28, H * 0.44], [W * 0.72, H * 0.56]];
    let box = null;
    points.forEach(([x, y], i) => {
      box = J.unionBB(box, main(env, lines(chunks[i], port ? 5 : 6), x, y, W * (port ? 0.72 : 0.36), H * 0.23, { mi: i * 2 }));
      star(env, x, y - H * (port ? 0.1 : 0.16), M * 0.009, a * (i ? 0.55 : 0.9), i ? sc.sub : sc.accent);
    });
    // Broken connector leaves a deliberate gap: two stars that never meet.
    const y = H * 0.5, gap = M * 0.04;
    env.line([[W * 0.12, y], [W * 0.5 - gap, y]], sc.sub, hair(env), a * 0.22, false);
    env.line([[W * 0.5 + gap, y], [W * 0.88, y]], sc.sub, hair(env), a * 0.22, false);
    label(env, '遥 遥 ／ 不 相 逢', W * 0.5, H * 0.89, a * 0.5);
    return box;
  },
});

reg('decor', 'xxtStarLot', {
  name: '垂星签', ae: 'leaders', layer: 'back', subtle: true,
  draw(env, bb, P) {
    const { W, H, sc } = env, a = fade(env), M = Math.min(W, H);
    const x = W * (P.right ? 0.92 : 0.08), y = H * (0.22 + (P.r || 0) * 0.23);
    env.line([[x, H * 0.06], [x, y - M * 0.017]], sc.sub, hair(env), a * 0.4, false);
    star(env, x, y, M * 0.012, a * 0.8);
    env.circle(x, y, M * 0.025, null, sc.sub, hair(env), a * 0.35, false);
    label(env, '宿\n命', x, y + M * 0.07, a * 0.45);
  },
});

reg('decor', 'xxtUnfinishedThread', {
  name: '未续红线', ae: 'leaders', layer: 'back', subtle: true,
  draw(env, bb, P) {
    const { W, H, sc } = env, a = fade(env), M = Math.min(W, H);
    const y = H * (P.low ? 0.88 : 0.12), x = W * (0.4 + (P.r || 0) * 0.2), d = M * 0.022;
    env.line([[W * 0.08, y], [x - d, y]], sc.accent, hair(env), a * 0.48, false);
    env.line([[x + d, y], [W * 0.92, y]], sc.sub, hair(env), a * 0.35, false);
    env.circle(x - d, y, M * 0.004, sc.accent, null, 0, a * 0.8, false);
    env.circle(x + d, y, M * 0.004, null, sc.sub, hair(env), a * 0.6, false);
  },
});

reg('decor', 'xxtLunarMargin', {
  name: '月相页边', ae: 'dots', layer: 'back', subtle: true,
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env, a = fade(env), M = Math.min(W, H), r = M * 0.009;
    const vertical = W < H, x = W * (P.right ? 0.94 : 0.06), y = H * (P.low ? 0.93 : 0.07);
    for (let i = 0; i < 5; i++) {
      const cx = vertical ? x : W * 0.5 + (i - 2) * M * 0.047;
      const cy = vertical ? H * 0.5 + (i - 2) * M * 0.047 : y;
      env.circle(cx, cy, r, null, sc.sub, hair(env), a * 0.45, false);
      if (env.pass !== 'main') continue;
      ctx.save();
      try {
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
        env.circle(cx + (i - 2) * r * 0.75, cy, r, sc.sub, null, 0, a * 0.3, false);
      } finally { ctx.restore(); }
    }
  },
});

reg('bg', 'xxtSilentAtlas', {
  name: '寂夜星历', subtle: true,
  plan: rng => ({ seed: rng.int(1, 999999), phase: rng.range(0, TAU) }),
  draw(env, P) {
    const { W, H, sc } = env, M = Math.min(W, H), t = env.t || 0;
    // Schematic coordinates, deliberately unlabeled as real astronomical data.
    for (let row = 0; row < 5; row++) {
      const y = H * (0.12 + row * 0.19), pts = [];
      for (let j = 0; j <= 24; j++) {
        const x = W * j / 24;
        pts.push([x, y + Math.sin(j / 24 * Math.PI + (P.phase || 0)) * M * 0.06]);
      }
      env.line(pts, sc.sub, hair(env), 0.075, false);
    }
    for (let i = 0; i < 44; i++) {
      const x = W * (0.05 + J.r(P.seed || 1, i, 1) * 0.9);
      const y = H * (0.05 + J.r(P.seed || 1, i, 2) * 0.9);
      const a = 0.08 + 0.09 * (0.5 + 0.5 * Math.sin(t * 0.35 + i * 1.8));
      env.circle(x, y, M * (i % 9 ? 0.0009 : 0.0018), sc.sub, null, 0, a, false);
    }
  },
});

reg('enter', 'xxtDewLetters', {
  name: '寒露凝字', ae: 'blur', inDur: dur => Math.min(0.85, dur * 0.4),
  apply(env, it, p) {
    it.charFns.push((i, glyph, n) => {
      const q = E.outCubic(J.clamp((p - (n > 1 ? i / (n - 1) * 0.24 : 0)) / 0.76));
      return { a: q, dy: (1 - q) * it.size * 0.17, s: 0.97 + 0.03 * q };
    });
  },
});
reg('exit', 'xxtUnsentSigh', {
  name: '叹息留白', ae: 'drift', outDur: dur => Math.min(0.8, dur * 0.35),
  apply(env, it, p) {
    it.charFns.push((i, glyph, n) => {
      const q = E.inCubic(J.clamp((p - (n > 1 ? (n - 1 - i) / (n - 1) * 0.2 : 0)) / 0.8));
      return { a: 1 - q, dy: -q * it.size * 0.23, dx: q * (i - (n - 1) / 2) * it.size * 0.035 };
    });
  },
});
reg('hold', 'xxtSiderealBreath', {
  name: '恒星微息', ae: 'breathe',
  apply(env, it, amt) {
    const amount = amt * (env.fx.motion ?? 0.7), t = env.ltb ?? env.lt;
    it.y += Math.sin(t * 0.62) * it.size * 0.014 * amount;
    it.alpha = (it.alpha ?? 1) * (1 - (0.5 + 0.5 * Math.sin(t * 0.8)) * 0.045 * amount);
  },
});
reg('cam', 'xxtLongWatch', {
  name: '长夜守望',
  get(env) {
    const amount = env.fx.motion ?? 0.7, p = J.clamp(env.lt / Math.max(0.3, env.cut.dur));
    return { x: Math.sin(p * Math.PI) * env.W * 0.008 * amount,
      y: -Math.sin(p * Math.PI * 0.5) * env.H * 0.006 * amount, s: 1 + E.inOutSine(p) * 0.018 * amount };
  },
});
reg('trans', 'xxtEclipseVeil', {
  name: '月蚀过笺', dur: 0.65,
  draw(ctx, A, B, p, info) {
    const { cw, ch } = info;
    if (p <= 0) { ctx.drawImage(A, 0, 0); return; }
    if (p >= 1) { ctx.drawImage(B, 0, 0); return; }
    const q = E.inOutSine(p), reach = Math.hypot(cw, ch);
    ctx.drawImage(A, 0, 0);
    ctx.save();
    try {
      // The curved lunar limb crosses the page, revealing the next shot.
      ctx.beginPath(); ctx.arc(-reach * 0.15, ch * 0.5, reach * 1.3 * q, 0, TAU); ctx.clip();
      ctx.drawImage(B, 0, 0);
    } finally { ctx.restore(); }
  },
});
})();
