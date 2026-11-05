/* JIZURA pack: xxmd — 向晓昧旦 · 庄重静谧 (Xiang Xiao Mei Dan · Solemn & Serene)
   定制歌词意象与气质：
   “此间辽阔混乱不堪 / 溺于潮水向晓昧旦 / 此处并非长夜漫漫 / 亦无怯懦泪水泛滥”
   “此间辽阔混乱不堪 / 溺于潮水向晓昧旦 / 长夜尽处星芒幽暗 / 勿忧前行步履蹒跚”
   气质定位：庄重静谧、肃穆深沉、辽阔宏大、坚毅从容
*/
(() => {
'use strict';
const PK = 'xxmd';
const DEG = J.DEG || (Math.PI / 180);
const TAU = J.TAU || (Math.PI * 2);
const E = J.E;

const monoF = env => (env.st?.fonts?.mono && env.st.fonts.mono[0]) || 'mono';
const bodyF = env => (env.st?.fonts?.body && env.st.fonts.body[0]) || 'gothic_med';
const displayF = env => (env.st?.fonts?.display && env.st.fonts.display[0]) || 'gothic_black';
const serifF = env => (env.st?.fonts?.serif && env.st.fonts.serif[0]) || 'mincho';
const inOut = env => E.outCubic(J.clamp(env.lt / 0.4)) * (1 - E.inCubic(env.pOut));

/* Helper: 绘制向晓星芒 (4点/8点贝塞尔星芒 + 柔和日冕光晕) */
function drawDawnStar(ctx, x, y, r, fill, stroke, lw, alpha, points = 4) {
  if (r <= 0.5 || alpha <= 0.01) return;
  ctx.save();
  ctx.translate(x, y);

  // 1. 弥散星晕
  const haloR = r * 1.9;
  const gHalo = ctx.createRadialGradient(0, 0, 0, 0, 0, haloR);
  gHalo.addColorStop(0, fill || '#ffffff');
  gHalo.addColorStop(0.35, stroke || 'rgba(232, 168, 106, 0.35)');
  gHalo.addColorStop(1, 'transparent');
  ctx.globalAlpha = alpha * 0.32;
  ctx.fillStyle = gHalo;
  ctx.beginPath();
  ctx.arc(0, 0, haloR, 0, TAU);
  ctx.fill();

  // 2. 主凹形贝塞尔星芒 (4-Point StarFlare)
  ctx.globalAlpha = alpha;
  const drawRays = (radius, scale) => {
    ctx.beginPath();
    const c = radius * 0.22;
    ctx.moveTo(0, -radius);
    ctx.bezierCurveTo(c * 0.25, -c, c, -c * 0.25, radius, 0);
    ctx.bezierCurveTo(c, c * 0.25, c * 0.25, c, 0, radius);
    ctx.bezierCurveTo(-c * 0.25, c, -c, c * 0.25, -radius, 0);
    ctx.bezierCurveTo(-c, -c * 0.25, -c * 0.25, -c, 0, -radius);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = (lw || 1) * scale; ctx.stroke(); }
  };

  drawRays(r, 1);
  if (points === 8) {
    ctx.rotate(Math.PI / 4);
    drawRays(r * 0.58, 0.7);
  }

  ctx.restore();
}

/* Helper: 绘制静谧洋流波浪曲线 */
function drawWaveCurve(ctx, x0, y0, len, baseAmp, freq, phase, color, lw, alpha) {
  if (alpha <= 0.01 || len <= 2) return;
  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.globalAlpha = alpha;

  const steps = 70;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + t * len;
    // 静谧深海：主频 + 柔和二次谐波
    const y = y0 + Math.sin(t * freq * TAU + phase) * baseAmp
                 + Math.cos(t * freq * 1.5 * TAU - phase * 0.8) * (baseAmp * 0.28);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

/* Helper: 航海罗盘十字准星 */
function drawNavCross(ctx, x, y, size, color, alpha) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.globalAlpha = alpha;

  ctx.beginPath();
  ctx.moveTo(x - size, y); ctx.lineTo(x + size, y);
  ctx.moveTo(x, y - size); ctx.lineTo(x, y + size);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, size * 0.42, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

/* ============================================================
   1. LAYOUT: xxmd_solemn_monolith — 庄重静谧 · 肃穆碑刻排版
   “此间辽阔 / 此处并非长夜漫漫 / 庄重静谧”
   如沉静矗立于深海长夜的黑曜石巨碑，严谨中轴对称与极高留白率，字距舒展，凝练静穆
   ============================================================ */
J.register('layout', 'xxmd_solemn_monolith', {
  name: '碑刻排版',
  tags: ['editorial', 'calm', 'emotional'],
  vibes: ['xxmd', 'zzjm'],
  vibeExclusive: true,
  fits: n => n >= 2 && n <= 24,
  plan: (rng, cut, st) => ({
    font: rng.pick(J.fontsOf(st, ['serif', 'display'])),
    track: rng.range(0.18, 0.32)
  }),
  render(env) {
    const { W, H, sc, ctx } = env;
    const P = env.cut.params;
    const t0 = String(env.cut.text || '').trim();
    const a = inOut(env);
    const cx = W / 2, cy = H / 2;

    // 1. 中轴纵向神圣子午线 (Meridian Guide)
    const axisH = H * 0.72;
    const topY = cy - axisH / 2;
    const botY = cy + axisH / 2;
    if (a > 0.01) {
      env.line([[cx, topY], [cx, cy - H * 0.18]], sc.sub, 0.8, a * 0.35, false);
      env.line([[cx, cy + H * 0.18], [cx, botY]], sc.sub, 0.8, a * 0.35, false);
      drawNavCross(ctx, cx, topY, 4, sc.accent, a * 0.65);
      drawNavCross(ctx, cx, botY, 4, sc.accent, a * 0.65);

      env.draw({ text: `[ I · MERIDIAN OF SERENITY · I ]`, font: monoF(env), size: 9, x: cx, y: topY - 12, align: 'center', track: 0.22, color: sc.accent, alpha: a * 0.85, ghost: false });
      env.draw({ text: `SOLEMN HORIZON // LAT 00°00' // DISTANCE TO DAWN`, font: monoF(env), size: 8.5, x: cx, y: botY + 18, align: 'center', track: 0.16, color: sc.sub, alpha: a * 0.75, ghost: false });
    }

    // 2. 主字形：典雅舒展的大幅衬线字
    const fs = Math.min(J.fitSize(t0, P.font, W * 0.74, H * 0.26, { track: P.track }), H * 0.22);
    const it = {
      text: t0,
      font: P.font,
      size: fs,
      x: cx,
      y: cy,
      align: 'center',
      track: P.track,
      color: sc.fg,
      alpha: a
    };
    const bb = J.mainDraw(env, it);

    // 3. 左右两侧对称古典平衡标记
    if (a > 0.01 && bb) {
      const pad = 28;
      env.line([[bb.x0 - pad, cy - 8], [bb.x0 - pad, cy + 8]], sc.sub, 1, a * 0.5, false);
      env.line([[bb.x1 + pad, cy - 8], [bb.x1 + pad, cy + 8]], sc.sub, 1, a * 0.5, false);
      env.draw({ text: `01`, font: monoF(env), size: 8, x: bb.x0 - pad - 8, y: cy + 3, align: 'right', track: 0.1, color: sc.sub, alpha: a * 0.6, ghost: false });
      env.draw({ text: `02`, font: monoF(env), size: 8, x: bb.x1 + pad + 8, y: cy + 3, align: 'left', track: 0.1, color: sc.sub, alpha: a * 0.6, ghost: false });
    }

    return bb || { x0: W * 0.15, x1: W * 0.85, y0: H * 0.25, y1: H * 0.75, cx, cy, boxes: [] };
  }
}, PK);

/* ============================================================
   2. LAYOUT: xxmd_vast_tide — 辽阔潮涌排版 (静谧潮汐呼吸)
   “此间辽阔混乱不堪，溺于潮水向晓昧旦”
   辽阔全景构图，文字在平缓深沉的正弦潮汐涌浪线上沉静沉浮，上下双轨精密海况测绘
   ============================================================ */
J.register('layout', 'xxmd_vast_tide', {
  name: '潮涌排版',
  tags: ['editorial', 'calm', 'emotional'],
  vibes: ['xxmd', 'zzjm'],
  vibeExclusive: true,
  fits: n => n >= 2 && n <= 32,
  plan: (rng, cut, st) => ({
    font: rng.pick(J.fontsOf(st, ['display', 'serif'])),
    track: rng.range(0.12, 0.24),
    waveAmp: rng.range(0.025, 0.045),
    splitWords: rng.chance(0.65)
  }),
  render(env) {
    const { W, H, sc, ctx } = env;
    const P = env.cut.params;
    const t0 = String(env.cut.text || '').trim();
    const a = inOut(env);
    const cy = H * 0.48;

    // 1. 宽银幕极展上下测度导轨
    const railAlpha = a * 0.35;
    const topY = H * 0.15;
    const botY = H * 0.83;
    env.line([[W * 0.06, topY], [W * 0.94, topY]], sc.sub, 0.8, railAlpha, false);
    env.line([[W * 0.06, botY], [W * 0.94, botY]], sc.sub, 0.8, railAlpha, false);

    if (a > 0.01) {
      env.draw({ text: `[VAST TIDE // LAT 31°14'N // SOLEMN & SERENE]`, font: monoF(env), size: 9.5, x: W * 0.06, y: topY - 8, align: 'left', track: 0.14, color: sc.sub, alpha: a * 0.75, ghost: false });
      env.draw({ text: `SURGE DEPTH: -48.6m // TOWARD DAWN // [XXMD]`, font: monoF(env), size: 9.5, x: W * 0.94, y: botY + 16, align: 'right', track: 0.14, color: sc.accent, alpha: a * 0.85, ghost: false });
      drawNavCross(ctx, W * 0.06, topY, 4, sc.accent, a * 0.7);
      drawNavCross(ctx, W * 0.94, botY, 4, sc.accent, a * 0.7);
    }

    // 2. 文字潮汐起伏排列（放缓至静谧周期的深海呼吸）
    const words = (P.splitWords && t0.length > 8) ? J.splitLines(t0, W < H ? 5 : 8) : [t0];
    let bbAll = null;
    const m = words.length;

    words.forEach((w, lineIdx) => {
      const lineCenterY = cy + (lineIdx - (m - 1) / 2) * (H * 0.24);
      const fs = Math.min(J.fitSize(w, P.font, W * 0.78, H * 0.28, { track: P.track }), H * 0.21);
      const t = env.lt * 1.1 + lineIdx * 1.2;

      const charCount = w.length;
      for (let i = 0; i < charCount; i++) {
        const char = w[i];
        const charProg = charCount > 1 ? (i / (charCount - 1)) : 0.5;
        const waveX = (charProg - 0.5) * (fs * charCount * (1 + P.track));
        const waveY = Math.sin(t + i * 0.45) * (H * (P.waveAmp || 0.035));

        const it = {
          text: char,
          font: P.font,
          size: fs,
          x: W / 2 + waveX,
          y: lineCenterY + waveY,
          align: 'center',
          track: P.track,
          color: (i === 0 || i === charCount - 1) ? sc.accent : sc.fg,
          alpha: a,
          mi: lineIdx * 10 + i
        };
        bbAll = J.unionBB(bbAll, J.mainDraw(env, it));
      }
    });

    // 3. 背景平缓潮汐曲线
    if (a > 0.01) {
      drawWaveCurve(ctx, W * 0.08, cy + H * 0.18, W * 0.84, H * 0.025, 1.2, env.lt * 0.8, sc.sub, 0.8, a * 0.3);
      drawWaveCurve(ctx, W * 0.08, cy - H * 0.18, W * 0.84, H * 0.018, 1.6, -env.lt * 0.6, sc.accent2 || sc.sub, 0.7, a * 0.22);
    }

    return bbAll || { x0: W * 0.15, x1: W * 0.85, y0: H * 0.25, y1: H * 0.75, cx: W / 2, cy: H / 2, boxes: [] };
  }
}, PK);

/* ============================================================
   3. LAYOUT: xxmd_stumble_forward — 步履蹒跚排版 (坚定求索)
   “勿忧前行步履蹒跚 / 此处并非长夜漫漫”
   庄重坚毅的阶梯式破浪前行，从容克制的踉跄倾角，坚实连贯的前进航迹导轨
   ============================================================ */
J.register('layout', 'xxmd_stumble_forward', {
  name: '蹒跚排版',
  tags: ['editorial', 'calm', 'emotional'],
  vibes: ['xxmd', 'zzjm'],
  vibeExclusive: true,
  fits: n => n >= 3 && n <= 24,
  plan: (rng, cut, st) => ({
    font: rng.pick(J.fontsOf(st, ['serif', 'display'])),
    track: rng.range(0.08, 0.16),
    stumbleTilt: rng.range(1.2, 2.4)
  }),
  render(env) {
    const { W, H, sc, ctx } = env;
    const P = env.cut.params;
    const t0 = String(env.cut.text || '').trim();
    const a = inOut(env);
    const words = J.splitLines(t0, W < H ? 3 : 5);
    const m = words.length;

    let bbAll = null;
    const startX = W * 0.24;
    const endX = W * 0.76;
    const startY = H * 0.66;
    const endY = H * 0.34;

    // 前进导轨基线
    if (a > 0.01) {
      env.line([[W * 0.14, startY + H * 0.07], [W * 0.86, endY - H * 0.07]], sc.sub, 0.8, a * 0.28, false);
      env.draw({ text: `───[ STEADFAST PILGRIMAGE // BEARING 045° // DAWN APPROACHING ]───`, font: monoF(env), size: 9, x: W * 0.5, y: H * 0.88, align: 'center', track: 0.16, color: sc.accent, alpha: a * 0.8, ghost: false });
    }

    words.forEach((w, i) => {
      const stepProg = m > 1 ? (i / (m - 1)) : 0.5;
      const x = J.lerp(startX, endX, stepProg);
      const y = J.lerp(startY, endY, stepProg);
      const fs = Math.min(W * 0.65 / (w.length * 1.05), H * 0.22);

      // 庄重克制的微踉跄角
      const stumble = (i % 2 === 0 ? 1 : -1) * (P.stumbleTilt || 1.8);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(stumble * DEG);

      const it = {
        text: w,
        font: P.font,
        size: fs,
        x: 0,
        y: 0,
        align: 'center',
        track: P.track,
        color: i === m - 1 ? sc.accent : sc.fg,
        alpha: a,
        mi: i * 4
      };
      const box = J.mainDraw(env, it);
      ctx.restore();

      bbAll = J.unionBB(bbAll, box);

      if (a > 0.01) {
        drawNavCross(ctx, x, y + fs * 0.6, 3, sc.accent2 || sc.sub, a * 0.6);
        env.draw({ text: `PHASE.0${i + 1}`, font: monoF(env), size: 8.5, x: x - fs * 0.6, y: y - fs * 0.45, align: 'left', track: 0.06, color: sc.sub, alpha: a * 0.7, ghost: false });
      }
    });

    return bbAll || { x0: W * 0.15, x1: W * 0.85, y0: H * 0.25, y1: H * 0.75, cx: W / 2, cy: H / 2, boxes: [] };
  }
}, PK);

/* ============================================================
   4. LAYOUT: xxmd_dawn_horizon — 向晓地平线排版
   “溺于潮水向晓昧旦 / 此处并非长夜漫漫”
   天地分割的双重地平线静穆构图：晓光高扬之上与暗潮涌动之下
   ============================================================ */
J.register('layout', 'xxmd_dawn_horizon', {
  name: '地平线排版',
  tags: ['editorial', 'calm', 'emotional'],
  vibes: ['xxmd', 'zzjm'],
  vibeExclusive: true,
  fits: n => n >= 2 && n <= 28,
  plan: (rng, cut, st) => ({
    font: rng.pick(J.fontsOf(st, ['serif', 'display'])),
    track: rng.range(0.14, 0.26)
  }),
  render(env) {
    const { W, H, sc, ctx } = env;
    const P = env.cut.params;
    const t0 = String(env.cut.text || '').trim();
    const a = inOut(env);
    const horizonY = H * 0.52;

    // 1. 地平线发光刻度轴
    if (a > 0.01) {
      const gLine = ctx.createLinearGradient(W * 0.06, 0, W * 0.94, 0);
      gLine.addColorStop(0, 'transparent');
      gLine.addColorStop(0.3, sc.sub);
      gLine.addColorStop(0.5, sc.accent);
      gLine.addColorStop(0.7, sc.sub);
      gLine.addColorStop(1, 'transparent');
      ctx.save();
      ctx.strokeStyle = gLine;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = a * 0.8;
      ctx.beginPath();
      ctx.moveTo(W * 0.06, horizonY);
      ctx.lineTo(W * 0.94, horizonY);
      ctx.stroke();
      ctx.restore();

      for (let k = -4; k <= 4; k++) {
        const tx = W / 2 + k * (W * 0.08);
        const len = k === 0 ? 7 : (k % 2 === 0 ? 4 : 2.5);
        env.line([[tx, horizonY - len], [tx, horizonY + len]], sc.sub, 0.8, a * 0.45, false);
      }
      env.draw({ text: `HORIZON LINE // 00°00' // DAWN ELEVATION: +03.4°`, font: monoF(env), size: 9, x: W / 2, y: horizonY + 18, align: 'center', track: 0.16, color: sc.sub, alpha: a * 0.75, ghost: false });
    }

    // 2. 上部拂晓文字 (Serif / Dawn Light)
    const fs = Math.min(J.fitSize(t0, P.font, W * 0.78, H * 0.26, { track: P.track }), H * 0.21);
    const itUpper = {
      text: t0,
      font: P.font,
      size: fs,
      x: W / 2,
      y: horizonY - fs * 0.85,
      align: 'center',
      track: P.track,
      color: sc.fg,
      alpha: a
    };
    const bb = J.mainDraw(env, itUpper);

    // 3. 下部潮水镜像水影
    if (a > 0.01) {
      ctx.save();
      ctx.translate(W / 2, horizonY + fs * 0.75);
      ctx.scale(1, -0.6);
      ctx.globalAlpha = a * 0.22;
      ctx.font = J.fontCSS(P.font, fs);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = sc.accent2 || sc.sub;
      ctx.fillText(t0, 0, 0);
      ctx.restore();
    }

    return bb || { x0: W * 0.15, x1: W * 0.85, y0: H * 0.25, y1: H * 0.75, cx: W / 2, cy: H / 2, boxes: [] };
  }
}, PK);

/* ============================================================
   5. LAYOUT: xxmd_dim_starlight — 幽暗星芒排版
   “长夜尽处星芒幽暗 / 勿忧前行步履蹒跚”
   天球星座坐标排版，幽远长夜中的孤星信标与赤经赤纬测度网
   ============================================================ */
J.register('layout', 'xxmd_dim_starlight', {
  name: '星芒排版',
  tags: ['editorial', 'calm', 'emotional'],
  vibes: ['xxmd', 'zzjm'],
  vibeExclusive: true,
  fits: n => n >= 2 && n <= 26,
  plan: (rng, cut, st) => ({
    font: rng.pick(J.fontsOf(st, ['serif', 'display'])),
    track: rng.range(0.16, 0.28)
  }),
  render(env) {
    const { W, H, sc, ctx } = env;
    const P = env.cut.params;
    const t0 = String(env.cut.text || '').trim();
    const a = inOut(env);
    const cx = W / 2, cy = H / 2;

    const fs = Math.min(J.fitSize(t0, P.font, W * 0.76, H * 0.28, { track: P.track }), H * 0.22);
    const it = {
      text: t0,
      font: P.font,
      size: fs,
      x: cx,
      y: cy,
      align: 'center',
      track: P.track,
      color: sc.fg,
      alpha: a
    };
    const bb = J.mainDraw(env, it);

    if (a > 0.01 && bb) {
      const starAlpha = a * (0.6 + 0.35 * Math.sin(env.lt * 1.8));
      const starR = Math.min(W, H) * 0.022;

      drawDawnStar(ctx, bb.x0 - 24, bb.y0 - 10, starR * 1.05, sc.accent, sc.fg, 0.8, starAlpha, 4);
      drawDawnStar(ctx, bb.x1 + 24, bb.y1 + 10, starR * 0.85, sc.accent2 || sc.sub, sc.fg, 0.8, starAlpha * 0.8, 8);
      drawDawnStar(ctx, cx, bb.y0 - fs * 0.55, starR * 0.7, sc.accent, sc.fg, 0.7, starAlpha * 0.9, 4);

      env.line([[bb.x0 - 24, bb.y0 - 10], [cx, bb.y0 - fs * 0.55]], sc.sub, 0.7, a * 0.25, false);
      env.line([[cx, bb.y0 - fs * 0.55], [bb.x1 + 24, bb.y1 + 10]], sc.sub, 0.7, a * 0.25, false);

      env.draw({ text: `MAGNITUDE: +5.1 // RA 19h48m // DEC -08°12' // [DIM STARLIGHT]`, font: monoF(env), size: 9, x: cx, y: bb.y1 + 30, align: 'center', track: 0.18, color: sc.sub, alpha: a * 0.75, ghost: false });
    }

    return bb || { x0: W * 0.15, x1: W * 0.85, y0: H * 0.25, y1: H * 0.75, cx, cy, boxes: [] };
  }
}, PK);

/* ============================================================
   6. DECOR: xxmd_quiet_sanctuary — 庄重静谧 · 静穆光轮装饰 (Back Layer)
   “庄重静谧 / 长夜尽处 / 亦无怯懦泪水泛滥”
   同心天文子午圆环与 360° 方位刻度，静穆散发的极远晨曦微晕
   ============================================================ */
J.register('decor', 'xxmd_quiet_sanctuary', {
  name: '光轮',
  tags: ['calm', 'editorial', 'emotional'],
  vibes: ['xxmd', 'zzjm'],
  vibeExclusive: true,
  layer: 'back',
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;

    const cx = bb ? bb.cx : W / 2;
    const cy = bb ? bb.cy : H / 2;
    const baseR = Math.min(W, H) * 0.36;

    ctx.save();

    // 1. 弥散静穆日冕光轮
    const gHalo = ctx.createRadialGradient(cx, cy, baseR * 0.2, cx, cy, baseR * 1.25);
    gHalo.addColorStop(0, J.rgba(sc.accent || '#e8a86a', a * 0.22));
    gHalo.addColorStop(0.5, J.rgba(sc.accent2 || '#2cd8d2', a * 0.08));
    gHalo.addColorStop(1, 'transparent');
    ctx.fillStyle = gHalo;
    ctx.beginPath();
    ctx.arc(cx, cy, baseR * 1.25, 0, TAU);
    ctx.fill();

    // 2. 静穆外规圆环与精密 36 宿刻度
    const rot = env.lt * 0.04;
    env.circle(cx, cy, baseR, null, sc.sub, 0.8, a * 0.35, false);

    const ticks = 36;
    for (let i = 0; i < ticks; i++) {
      const ang = (i / ticks) * TAU + rot;
      const len = i % 9 === 0 ? 7 : (i % 3 === 0 ? 4 : 2);
      const x0 = cx + Math.cos(ang) * baseR;
      const y0 = cy + Math.sin(ang) * baseR;
      const x1 = cx + Math.cos(ang) * (baseR - len);
      const y1 = cy + Math.sin(ang) * (baseR - len);
      env.line([[x0, y0], [x1, y1]], sc.sub, 0.8, a * 0.45, false);
    }

    // 3. 内层虚线恒定轨道
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    ctx.arc(cx, cy, baseR * 0.72, -rot * 0.8, -rot * 0.8 + TAU);
    ctx.strokeStyle = sc.sub;
    ctx.lineWidth = 0.7;
    ctx.globalAlpha = a * 0.25;
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }
}, PK);

/* ============================================================
   7. DECOR: xxmd_tide_surge — 潮水逆涌装饰 (Back Layer)
   “溺于潮水向晓昧旦”
   三层谐波潮汐浪流曲面，深海水压标尺与潮汐沉浮
   ============================================================ */
J.register('decor', 'xxmd_tide_surge', {
  name: '潮水逆涌',
  tags: ['calm', 'emotional', 'graphic'],
  vibes: ['xxmd', 'zzjm'],
  vibeExclusive: true,
  layer: 'back',
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;

    const baseH = H * 0.74;
    const t = env.lt * 1.1;

    ctx.save();
    drawWaveCurve(ctx, 0, baseH, W, H * 0.04, 1.1, t, sc.sub, 1.2, a * 0.35);
    drawWaveCurve(ctx, 0, baseH + H * 0.07, W, H * 0.05, 1.6, -t * 1.1 + 1.0, sc.accent2 || sc.sub, 1.0, a * 0.4);

    ctx.setLineDash([4, 14]);
    drawWaveCurve(ctx, 0, baseH - H * 0.04, W, H * 0.025, 2.2, t * 1.4, sc.accent, 0.8, a * 0.5);
    ctx.setLineDash([]);

    const buoyX = W * 0.84;
    const buoyY = baseH + Math.sin(t * 1.4) * (H * 0.035);
    drawNavCross(ctx, buoyX, buoyY, 4, sc.accent, a * 0.65);
    env.draw({ text: `SURGE: +1.84m`, font: monoF(env), size: 8.5, x: buoyX + 9, y: buoyY + 3, align: 'left', track: 0.08, color: sc.accent, alpha: a * 0.7, ghost: false });

    ctx.restore();
  }
}, PK);

/* ============================================================
   8. DECOR: xxmd_dim_starlit_sky — 长夜星芒装饰 (Back Layer)
   “长夜尽处星芒幽暗”
   漫漫长夜穹顶上缓慢闪烁呼吸的极微星群与四点星辉
   ============================================================ */
J.register('decor', 'xxmd_dim_starlit_sky', {
  name: '长夜星芒',
  tags: ['calm', 'editorial', 'emotional'],
  vibes: ['xxmd', 'zzjm'],
  vibeExclusive: true,
  layer: 'back',
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;

    ctx.save();
    const starCount = 12;
    const seed = (env.cut.seed || 1) ^ 0x5a17;

    for (let i = 0; i < starCount; i++) {
      const sx = (J.r(seed, i, 1) * 0.88 + 0.06) * W;
      const sy = (J.r(seed, i, 2) * 0.55 + 0.06) * H;
      const r = (J.r(seed, i, 3) * 0.014 + 0.007) * Math.min(W, H);
      const twinkle = Math.sin(env.lt * (1.2 + J.r(seed, i, 4) * 1.8) + i * 1.2);
      const starAlpha = a * (0.35 + 0.45 * Math.max(0, twinkle));

      drawDawnStar(ctx, sx, sy, r, sc.accent, sc.fg, 0.7, starAlpha, i % 3 === 0 ? 8 : 4);
    }

    ctx.restore();
  }
}, PK);

/* ============================================================
   9. DECOR: xxmd_dawn_aurora — 昧旦微芒装饰 (Back Layer)
   “向晓昧旦 / 破晓晨曦”
   地平线处升腾的向晓渐变极光微芒，将黑夜撕开一道晨曦拂晓
   ============================================================ */
J.register('decor', 'xxmd_dawn_aurora', {
  name: '微芒',
  tags: ['calm', 'editorial', 'emotional'],
  vibes: ['xxmd', 'zzjm'],
  vibeExclusive: true,
  layer: 'back',
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;

    ctx.save();
    const horizonY = H * 0.68;
    const pulse = 1 + 0.04 * Math.sin(env.lt * 1.4);
    const radius = Math.min(W, H) * 0.65 * pulse;

    const gAurora = ctx.createRadialGradient(W / 2, horizonY, 10, W / 2, horizonY, radius);
    gAurora.addColorStop(0, J.rgba(sc.accent || '#e8a86a', a * 0.38));
    gAurora.addColorStop(0.4, J.rgba(sc.accent2 || '#2cd8d2', a * 0.18));
    gAurora.addColorStop(0.75, J.rgba(sc.sub, a * 0.06));
    gAurora.addColorStop(1, 'transparent');

    ctx.fillStyle = gAurora;
    ctx.beginPath();
    ctx.arc(W / 2, horizonY, radius, Math.PI, TAU);
    ctx.fill();

    for (let k = -1; k <= 1; k++) {
      const beamAng = -Math.PI / 2 + k * 0.22 + Math.sin(env.lt * 0.6 + k) * 0.03;
      const bLen = radius * 0.95;
      const bx = W / 2 + Math.cos(beamAng) * bLen;
      const by = horizonY + Math.sin(beamAng) * bLen;

      const gBeam = ctx.createLinearGradient(W / 2, horizonY, bx, by);
      gBeam.addColorStop(0, J.rgba(sc.accent || '#ffffff', a * 0.28));
      gBeam.addColorStop(1, 'transparent');

      ctx.strokeStyle = gBeam;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(W / 2, horizonY);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }

    ctx.restore();
  }
}, PK);

/* ============================================================
   10. DECOR: xxmd_chaos_currents — 辽阔暗涌装饰 (Back Layer)
   “此间辽阔混乱不堪”
   横贯全屏的深层暗洋层流线束与浮游微粒
   ============================================================ */
J.register('decor', 'xxmd_chaos_currents', {
  name: '暗涌',
  tags: ['calm', 'editorial', 'emotional'],
  vibes: ['xxmd', 'zzjm'],
  vibeExclusive: true,
  layer: 'back',
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;

    ctx.save();
    const t = env.lt * 1.0;
    const streamCount = 4;

    for (let k = 0; k < streamCount; k++) {
      const yBase = H * (0.24 + k * 0.16);
      const amp = H * (0.03 + k * 0.012);
      const speed = (0.8 + k * 0.25) * (k % 2 === 0 ? 1 : -1);

      ctx.beginPath();
      ctx.strokeStyle = k % 2 === 0 ? sc.sub : (sc.accent2 || sc.accent);
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = a * (0.2 + k * 0.04);

      const steps = 45;
      for (let s = 0; s <= steps; s++) {
        const u = s / steps;
        const x = u * W;
        const y = yBase + Math.sin(u * 6 + t * speed) * amp + Math.cos(u * 10 - t * 0.8) * (amp * 0.35);
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    env.draw({ text: `LAMINAR FLOW // COEFF: 0.92 // [VAST CURRENTS]`, font: monoF(env), size: 8.5, x: W * 0.08, y: H * 0.92, align: 'left', track: 0.14, color: sc.sub, alpha: a * 0.65, ghost: false });

    ctx.restore();
  }
}, PK);

/* ============================================================
   11. DECOR: xxmd_no_tears_resolve — 决意罗盘装饰 (Front Layer)
   “此处并非长夜漫漫，亦无怯懦泪水泛滥”
   刚劲清澈的航行十字定位仪与四角水平卡尺，决意前行的坚定指引
   ============================================================ */
J.register('decor', 'xxmd_no_tears_resolve', {
  name: '罗盘',
  tags: ['editorial', 'calm', 'graphic'],
  vibes: ['xxmd', 'zzjm'],
  vibeExclusive: true,
  layer: 'front',
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;

    ctx.save();
    const pad = Math.min(W, H) * 0.045;
    const col = sc.accent || '#ffffff';

    const cornerSize = 16;
    const corners = [
      [pad, pad, 1, 1],
      [W - pad, pad, -1, 1],
      [pad, H - pad, 1, -1],
      [W - pad, H - pad, -1, -1]
    ];
    corners.forEach(([cx, cy, dx, dy]) => {
      env.line([[cx, cy + dy * cornerSize], [cx, cy], [cx + dx * cornerSize, cy]], col, 1.0, a * 0.65, false);
    });

    env.draw({ text: `[RESOLUTE & SERENE // NO FEAR // NO TEARS]`, font: monoF(env), size: 9, x: W - pad - 6, y: pad + 14, align: 'right', track: 0.16, color: sc.accent, alpha: a * 0.85, ghost: false });
    env.draw({ text: `STEADY HEADING: 054° // LONG NIGHT WILL END`, font: monoF(env), size: 8.5, x: W - pad - 6, y: pad + 28, align: 'right', track: 0.10, color: sc.sub, alpha: a * 0.7, ghost: false });

    drawNavCross(ctx, pad + 14, H - pad - 14, 5, col, a * 0.75);
    env.draw({ text: `HORIZON: STABLE`, font: monoF(env), size: 8, x: pad + 24, y: H - pad - 11, align: 'left', track: 0.12, color: sc.sub, alpha: a * 0.75, ghost: false });

    ctx.restore();
  }
}, PK);

/* ============================================================
   12. TREAT: xxmd_tide_caustic — 潮光水影文字特效
   “溺于潮水”
   水下焦散粼光折射、双重波纹色散与拂晓晨曦边缘溢光
   ============================================================ */
J.register('treat', 'xxmd_tide_caustic', {
  name: '潮光水影',
  tags: ['calm', 'emotional', 'editorial'],
  vibes: ['xxmd', 'zzjm'],
  vibeExclusive: true,
  apply(env, it, P) {
    const sc = env.sc;
    it.shadow = {
      color: sc.accent2 || '#2cd8d2',
      blur: it.size * 0.28,
      dx: 0,
      dy: 0,
      a: 0.8
    };
    it.echo = {
      n: 2,
      dx: 1.8,
      dy: 1.2,
      color: sc.accent || '#e8a86a',
      alpha: 0.55
    };
  }
}, PK);

/* ============================================================
   13. ENTER: xxmd_submerge_rise — 溺流浮现入场
   “溺于潮水向晓昧旦”
   文字从暗夜潮水深处破浪上浮，折射消退，平稳就位
   ============================================================ */
J.register('enter', 'xxmd_submerge_rise', {
  name: '溺流浮现',
  tags: ['calm', 'emotional', 'editorial'],
  vibes: ['xxmd', 'zzjm'],
  vibeExclusive: true,
  apply(env, it, p) {
    const ep = E.outCubic(p);
    it.blur = (it.blur || 0) + (1 - ep) * 14;
    it.alpha = (it.alpha ?? 1) * J.clamp(p * 2.2);

    it.charFns.push((i, g, n) => {
      const d = n > 1 ? (i / (n - 1)) * 0.35 : 0;
      const prog = J.clamp((p - d) / 0.65);
      const q = E.outCubic(prog);
      const waveBob = Math.sin(prog * Math.PI * 2) * (1 - q) * it.size * 0.12;
      return {
        dy: (1 - q) * it.size * 0.85 + waveBob,
        dx: Math.sin(prog * 4 + i) * (1 - q) * 3,
        s: J.lerp(0.9, 1, q),
        a: J.clamp(prog * 2.8)
      };
    });
  }
}, PK);

/* ============================================================
   14. ENTER: xxmd_dawn_break — 晓光破晓入场
   “长夜尽处，向晓昧旦”
   庄严拂晓晨曦自左向右掠过，光芒舒展，点亮每个字符
   ============================================================ */
J.register('enter', 'xxmd_dawn_break', {
  name: '破晓',
  tags: ['editorial', 'calm', 'emotional'],
  vibes: ['xxmd', 'zzjm'],
  vibeExclusive: true,
  apply(env, it, p) {
    it.charFns.push((i, g, n) => {
      const d = n > 1 ? (i / (n - 1)) * 0.4 : 0;
      const prog = J.clamp((p - d) / 0.6);
      if (prog <= 0) return { hide: true };
      const ep = E.outCubic(prog);
      return {
        dx: (1 - ep) * it.size * 0.35,
        s: J.lerp(1.25, 1, ep),
        a: J.clamp(prog * 3.0)
      };
    });
  }
}, PK);

/* ============================================================
   15. EXIT: xxmd_receding_tide — 潮浪退隐退场
   “潮水退隐，归于长夜”
   文字随退潮横向拉伸溶解消散于微光中
   ============================================================ */
J.register('exit', 'xxmd_receding_tide', {
  name: '潮浪退隐',
  tags: ['calm', 'editorial', 'emotional'],
  vibes: ['xxmd', 'zzjm'],
  vibeExclusive: true,
  apply(env, it, p) {
    it.charFns.push((i, g, n) => {
      const d = n > 1 ? (i / (n - 1)) * 0.25 : 0;
      const prog = J.clamp((p - d) / 0.75);
      const ep = E.inCubic(prog);
      return {
        dx: ep * it.size * 0.95,
        dy: ep * it.size * 0.18,
        s: J.lerp(1, 0.45, ep),
        a: 1 - ep
      };
    });
  }
}, PK);

/* ============================================================
   16. EXIT: xxmd_starlight_fade — 星芒寂灭退场
   “长夜尽处星芒幽暗”
   文字笔画向中心凝缩为孤星微光，随晨曦轻柔隐没
   ============================================================ */
J.register('exit', 'xxmd_starlight_fade', {
  name: '星芒寂灭',
  tags: ['calm', 'editorial', 'emotional'],
  vibes: ['xxmd', 'zzjm'],
  vibeExclusive: true,
  apply(env, it, p) {
    it.charFns.push((i, g, n) => {
      const prog = J.clamp(p);
      const ep = E.inExpo(prog);
      return {
        s: J.lerp(1, 0.15, ep),
        rot: ep * 10 * (i % 2 === 0 ? 1 : -1),
        a: 1 - ep
      };
    });
  }
}, PK);

/* ============================================================
   17. HOLD: xxmd_ocean_swell — 潮涌浪行持续
   “勿忧前行步履蹒跚”
   模拟航行于辽阔大洋之上的重力波浮沉律动，沉稳而有力
   ============================================================ */
J.register('hold', 'xxmd_ocean_swell', {
  name: '潮涌浪行',
  tags: ['calm', 'editorial', 'emotional'],
  vibes: ['xxmd', 'zzjm'],
  vibeExclusive: true,
  apply(env, it, amt) {
    const t = env.lt * 1.8;
    const dy = Math.sin(t) * 3.8 * amt;
    const dx = Math.cos(t * 0.6) * 1.8 * amt;
    it.charFns.push((i) => ({
      dy: dy + Math.sin(t + i * 0.5) * 1.5 * amt,
      dx: dx
    }));
  }
}, PK);

/* ============================================================
   18. BG: xxmd_abyssal_dawn — 深渊向晓全屏背景
   “此间辽阔混乱不堪 / 溺于潮水向晓昧旦”
   午夜深渊海面到拂晓晨曦地平线的宏大光晕、星屑浮游与深水暗流
   ============================================================ */
J.register('bg', 'xxmd_abyssal_dawn', {
  name: '深渊向晓',
  tags: ['calm', 'editorial', 'emotional'],
  vibes: ['xxmd', 'zzjm'],
  vibeExclusive: true,
  draw(env) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;

    ctx.save();

    // 1. 底层大跨度渐变：深渊靛蓝 -> 向晓晨曦金青微光
    const gBg = ctx.createLinearGradient(0, 0, 0, H);
    gBg.addColorStop(0, '#03050c');
    gBg.addColorStop(0.55, '#060d1b');
    gBg.addColorStop(0.82, '#0a1628');
    gBg.addColorStop(1, '#040710');
    ctx.fillStyle = gBg;
    ctx.fillRect(0, 0, W, H);

    // 2. 地平线晓光微弧
    const cy = H * 0.68;
    const gDawn = ctx.createRadialGradient(W / 2, cy, 20, W / 2, cy, W * 0.75);
    gDawn.addColorStop(0, J.rgba(sc.accent || '#e8a86a', a * 0.28));
    gDawn.addColorStop(0.35, J.rgba(sc.accent2 || '#2cd8d2', a * 0.14));
    gDawn.addColorStop(0.7, 'transparent');
    ctx.fillStyle = gDawn;
    ctx.fillRect(0, 0, W, H);

    // 3. 漂浮星尘微粒流 (放慢至静谧深邃流速)
    const seed = 0x4d61;
    for (let i = 0; i < 28; i++) {
      const px = ((J.r(seed, i, 1) + env.lt * 0.008) % 1) * W;
      const py = ((J.r(seed, i, 2) + Math.sin(env.lt * 0.6 + i) * 0.02) % 1) * H;
      const pr = (J.r(seed, i, 3) * 1.4 + 0.6);
      ctx.fillStyle = i % 2 === 0 ? (sc.accent || '#ffffff') : (sc.sub || '#6f8ca6');
      ctx.globalAlpha = a * (0.2 + 0.3 * Math.sin(env.lt * 1.5 + i));
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, TAU);
      ctx.fill();
    }

    ctx.restore();
  }
}, PK);

/* ============================================================
   19. CAM: xxmd_cinematic_tide_drift — 破浪巡航运镜
   “勿忧前行步履蹒跚”
   低角度航海巡航推轨运镜，带海浪节奏的有机俯仰与推进
   ============================================================ */
J.register('cam', 'xxmd_cinematic_tide_drift', {
  name: '巡航运镜',
  tags: ['editorial', 'calm', 'emotional'],
  vibes: ['xxmd', 'zzjm'],
  vibeExclusive: true,
  plan: rng => ({ sway: rng.range(0.008, 0.015) }),
  get: (env, P) => {
    const prog = J.clamp(env.lt / Math.max(0.3, env.cut.dur));
    const smoothE = E.inOutCubic(prog);
    const waveSway = Math.sin(env.lt * 1.8) * (P.sway || 0.012) * env.W;
    const waveHeave = Math.cos(env.lt * 1.4) * env.H * 0.01;
    const tilt = Math.sin(env.lt * 1.2) * 0.35;

    return {
      x: waveSway,
      y: waveHeave,
      s: 1.0 + 0.042 * smoothE,
      rot: tilt
    };
  }
}, PK);

/* ============================================================
   20. TRANS: xxmd_tidal_wipe — 潮汐推浪转场
   “溺于潮水向晓昧旦”
   一道拂晓潮浪横卷过屏幕，前后镜头随浪潮更迭交接
   ============================================================ */
J.register('trans', 'xxmd_tidal_wipe', {
  name: '推浪转场',
  tags: ['calm', 'editorial', 'emotional'],
  vibes: ['xxmd', 'zzjm'],
  vibeExclusive: true,
  dur: 0.42,
  plan: rng => ({}),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I;
    ctx.save();

    ctx.drawImage(A, 0, 0);

    const waveX = J.lerp(-cw * 0.3, cw * 1.3, p);
    const waveAmp = cw * 0.07;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(waveX, 0);
    const steps = 30;
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      const y = u * ch;
      const x = waveX + Math.sin(u * TAU * 2.2 + p * 6) * waveAmp;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(cw, ch);
    ctx.lineTo(cw, 0);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(B, 0, 0);
    ctx.restore();

    const bell = Math.sin(p * Math.PI);
    if (bell > 0.01) {
      ctx.beginPath();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.0;
      ctx.globalAlpha = bell * 0.85;
      for (let s = 0; s <= steps; s++) {
        const u = s / steps;
        const y = u * ch;
        const x = waveX + Math.sin(u * TAU * 2.2 + p * 6) * waveAmp;
        if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }
}, PK);

/* ============================================================
   21. STYLE: xxmd — 向晓昧旦 · 庄重静谧专属风格包
   配置沉稳肃穆、静谧幽邃的三套配色方案
   ============================================================ */
const styleDef = {
  name: '向晓昧旦',
  desc: '深海潮水・拂晓晨曦・庄重肃穆・长夜静谧',
  vibes: ['xxmd', 'zzjm'],
  schemes: [
    {
      bg: '#040711',
      fg: '#f4f8fb',
      sub: '#627a94',
      accent: '#deb37e',
      accent2: '#32b8b4',
      ink: '#f4f8fb',
      dim: '#0b1320',
      ghostA: '#deb37e',
      ghostB: '#32b8b4'
    },
    {
      bg: '#020408',
      fg: '#eef2f7',
      sub: '#42566d',
      accent: '#e5bf82',
      accent2: '#72a5cc',
      ink: '#eef2f7',
      dim: '#070c14',
      ghostA: '#e5bf82',
      ghostB: '#72a5cc'
    },
    {
      bg: '#070d1a',
      fg: '#fafafa',
      sub: '#7891ad',
      accent: '#f09c6c',
      accent2: '#48cfba',
      ink: '#fafafa',
      dim: '#101b2d',
      ghostA: '#f09c6c',
      ghostB: '#48cfba'
    }
  ],
  fonts: {
    display: ['mincho_black', 'gothic_black', 'zenkaku'],
    serif: ['mincho', 'mincho_light'],
    body: ['gothic_med'],
    mono: ['mono']
  },
  texture: { grain: 0.5, paper: 0.12, scan: 0.08 },
  ghost: 0.75,
  bias: {
    layout: {
      xxmd_solemn_monolith: 3.2,
      xxmd_vast_tide: 2.8,
      xxmd_dawn_horizon: 2.8,
      xxmd_dim_starlight: 2.6,
      xxmd_stumble_forward: 2.4
    },
    enter: {
      xxmd_submerge_rise: 2.8,
      xxmd_dawn_break: 2.5
    },
    exit: {
      xxmd_receding_tide: 2.8,
      xxmd_starlight_fade: 2.5
    }
  },
  decor: {
    xxmd_quiet_sanctuary: 2.0,
    xxmd_tide_surge: 1.8,
    xxmd_dim_starlit_sky: 1.8,
    xxmd_dawn_aurora: 1.6,
    xxmd_no_tears_resolve: 1.5,
    xxmd_chaos_currents: 1.2
  },
  hud: false
};

if (J.STYLES) {
  J.STYLES.xxmd = styleDef;
  J.STYLES.zzjm = Object.assign({}, styleDef, { name: '庄重静谧', desc: '肃穆碑刻・极深暗海・微弱星辉・静穆破晓' });

  if (J.STYLE_ORDER) {
    if (!J.STYLE_ORDER.includes('xxmd')) J.STYLE_ORDER.push('xxmd');
    if (!J.STYLE_ORDER.includes('zzjm')) J.STYLE_ORDER.push('zzjm');
  }
}

})();
