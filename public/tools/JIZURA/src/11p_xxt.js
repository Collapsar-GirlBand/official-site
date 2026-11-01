/* JIZURA pack: xxt — Star & Summer themed bespoke components for 星宿叹 (xxt) */
(() => {
'use strict';
const E = J.E;
const PK = 'xxt';
const DEG = J.DEG || (Math.PI / 180);
const TAU = J.TAU || (Math.PI * 2);

const monoF = env => (env.st?.fonts?.mono && env.st.fonts.mono[0]) || 'mono';
const bodyF = env => (env.st?.fonts?.body && env.st.fonts.body[0]) || 'gothic_med';
const displayF = env => (env.st?.fonts?.display && env.st.fonts.display[0]) || 'gothic_black';
const inOut = env => E.outCubic(J.clamp(env.lt / 0.35)) * (1 - E.inCubic(env.pOut));

/* ============================================================
   1. LAYOUT: xxt_anamorphic_cinema — 宽银幕电影排版
   2.39:1 电影遮幅、极致留白、瑞士国际主义微缩天体元数据
   ============================================================ */
J.register('layout', 'xxt_anamorphic_cinema', {
  name: '宽银幕电影排版',
  tags: ['editorial', 'calm', 'graphic'],
  vibes: ['xxt'],
  vibeExclusive: true,
  fits: n => n >= 2 && n <= 28,
  plan: (rng, cut, st) => ({
    font: rng.pick(J.fontsOf(st, ['serif', 'display'])),
    track: rng.range(0.12, 0.22),
    accentSub: rng.chance(0.5)
  }),
  render(env) {
    const { W, H, sc } = env;
    const P = env.cut.params;
    const t0 = String(env.cut.text || '').trim();
    const letterboxH = Math.max(0, (H - W / 2.39) / 2);
    const viewH = H - letterboxH * 2;

    if (letterboxH > 2) {
      env.rect(0, 0, W, letterboxH, sc.bg, 1, false);
      env.rect(0, H - letterboxH, W, letterboxH, sc.bg, 1, false);
      env.line([[0, letterboxH], [W, letterboxH]], sc.sub, 1, 0.4, false);
      env.line([[0, H - letterboxH], [W, H - letterboxH]], sc.sub, 1, 0.4, false);
    }

    const size = Math.min(J.fitSize(t0, P.font, W * 0.76, viewH * 0.35, { track: P.track }), viewH * 0.26);
    const cy = H / 2;
    const bb = J.mainDraw(env, {
      text: t0,
      font: P.font,
      size,
      x: W / 2,
      y: cy,
      align: 'center',
      track: P.track,
      color: sc.fg
    });

    const a = inOut(env);
    if (a > 0.01) {
      const topY = letterboxH + 28;
      const metaLeft = `SCENE #${String(env.cut.index + 1).padStart(2, '0')} // TC ${J.fmtTime(env.cut.start)}`;
      const metaRight = `ANAMORPHIC 2.39:1 // EXP: 1/48 // 24FPS`;
      env.draw({ text: metaLeft, font: monoF(env), size: 10, x: W * 0.1, y: topY, align: 'left', color: sc.sub, alpha: a * 0.65, ghost: false });
      env.draw({ text: metaRight, font: monoF(env), size: 10, x: W * 0.9, y: topY, align: 'right', color: sc.sub, alpha: a * 0.65, ghost: false });

      const botY = H - letterboxH - 24;
      env.draw({ text: `c = 299792458 m/s // G = 6.67430e-11 // [XXT-HORIZON]`, font: monoF(env), size: 9.5, x: W / 2, y: botY, align: 'center', track: 0.14, color: sc.sub, alpha: a * 0.6, ghost: false });
    }

    return bb || { x0: W * 0.15, x1: W * 0.85, y0: H * 0.35, y1: H * 0.65, cx: W / 2, cy: H / 2, boxes: [] };
  }
}, PK);

/* ============================================================
   2. LAYOUT: xxt_depth_space — 空间折跃透视
   三维 Z 轴近大远小深度排列，透视灭点导轨与时空纵深排版
   ============================================================ */
J.register('layout', 'xxt_depth_space', {
  name: '空间折跃透视',
  tags: ['graphic', 'glitch', 'editorial'],
  vibes: ['xxt'],
  vibeExclusive: true,
  fits: n => n >= 3 && n <= 24,
  plan: (rng, cut, st) => ({
    font: rng.pick(J.fontsOf(st, ['display'])),
    depthStep: rng.range(0.2, 0.35)
  }),
  render(env) {
    const { W, H, sc } = env;
    const P = env.cut.params;
    const t0 = String(env.cut.text || '').trim();
    const words = J.splitLines(t0, W < H ? 4 : 7);
    const m = words.length;
    const cx = W / 2, cy = H / 2;

    let bbAll = null;
    words.forEach((w, i) => {
      const z = (i / Math.max(1, m - 1)) * 0.65;
      const scale = 1 - z * 0.45;
      const size = Math.min(W * 0.75 / (w.length * 1.1), H * 0.22) * scale;
      const y = cy + (i - (m - 1) / 2) * (size * 1.25);
      const x = cx;

      const it = {
        text: w,
        font: P.font,
        size,
        x,
        y,
        align: 'center',
        track: 0.08 * scale,
        color: i === 0 ? sc.accent : sc.fg,
        alpha: 1 - z * 0.3,
        mi: i * 2
      };
      bbAll = J.unionBB(bbAll, J.mainDraw(env, it));
    });

    const a = inOut(env);
    if (a > 0.01) {
      const railAlpha = a * 0.3;
      env.line([[W * 0.05, H * 0.1], [cx - W * 0.15, cy - H * 0.1]], sc.sub, 1, railAlpha, false);
      env.line([[W * 0.95, H * 0.1], [cx + W * 0.15, cy - H * 0.1]], sc.sub, 1, railAlpha, false);
      env.line([[W * 0.05, H * 0.9], [cx - W * 0.15, cy + H * 0.1]], sc.sub, 1, railAlpha, false);
      env.line([[W * 0.95, H * 0.9], [cx + W * 0.15, cy + H * 0.1]], sc.sub, 1, railAlpha, false);
    }

    return bbAll || { x0: W * 0.2, x1: W * 0.8, y0: H * 0.3, y1: H * 0.7, cx: W / 2, cy: H / 2, boxes: [] };
  }
}, PK);

/* ============================================================
   3. LAYOUT: xxt_freefall — 重力坠落
   重力非线性级联下坠排版，左侧落体标尺，带强力重力加速度动势
   ============================================================ */
J.register('layout', 'xxt_freefall', {
  name: '重力坠落',
  tags: ['graphic', 'editorial', 'emotional'],
  vibes: ['xxt'],
  vibeExclusive: true,
  fits: n => n >= 3 && n <= 30,
  plan: (rng, cut, st) => ({
    font: rng.pick(J.fontsOf(st, ['display', 'serif'])),
    align: rng.pick(['left', 'center', 'left']),
    scaleStep: rng.range(1.08, 1.25),
    stagger: 0.08
  }),
  render(env) {
    const { W, H, sc } = env;
    const P = env.cut.params;
    const t0 = String(env.cut.text || '').trim();
    const lines = J.splitLines(t0, W < H ? 5 : 9);
    const m = lines.length;
    const baseSize = Math.min(W * 0.82 / (lines[0].length * 1.1), H * 0.45 / (m * 1.25));

    let bbAll = null;
    const topY = H * 0.28;
    const gravityAccel = H * 0.055;

    lines.forEach((lineText, i) => {
      const rowSize = baseSize * Math.pow(P.scaleStep, i * 0.35);
      const y = topY + i * (baseSize * 1.15) + (i * i * gravityAccel * 0.5);
      const x = P.align === 'center' ? W / 2 : W * 0.18 + (i * W * 0.05);

      const it = {
        text: lineText,
        font: P.font,
        size: rowSize,
        x,
        y,
        align: P.align,
        track: 0.04,
        lead: 1.1,
        color: i === m - 1 ? sc.accent : sc.fg,
        mi: i * 2
      };
      bbAll = J.unionBB(bbAll, J.mainDraw(env, it));
    });

    const a = inOut(env);
    if (a > 0.01) {
      const rulerX = W * 0.1;
      const rY0 = H * 0.22, rY1 = H * 0.82;
      env.line([[rulerX, rY0], [rulerX, rY1]], sc.sub, 1.2, a * 0.45, false);

      const rMarks = 6;
      for (let k = 0; k <= rMarks; k++) {
        const ry = rY0 + (k / rMarks) * (rY1 - rY0);
        env.line([[rulerX, ry], [rulerX - 8, ry]], sc.sub, 1, a * 0.45, false);
        const depth = `-${k * 250}m`;
        env.draw({ text: depth, font: monoF(env), size: 9, x: rulerX - 12, y: ry, align: 'right', color: sc.sub, alpha: a * 0.6, ghost: false });
      }

      env.draw({
        text: 'g = 9.80665 m/s² ↓ FREEFALL',
        font: monoF(env),
        size: 10,
        x: rulerX + 8,
        y: rY1 + 16,
        align: 'left',
        track: 0.08,
        color: sc.accent,
        alpha: a * 0.8,
        ghost: false
      });
    }

    return bbAll || { x0: W * 0.2, x1: W * 0.8, y0: H * 0.3, y1: H * 0.7, cx: W / 2, cy: H / 2, boxes: [] };
  }
}, PK);

/* ============================================================
   4. LAYOUT: xxt_slash_rip — 对角割裂
   45° 对角线撕裂画面，上下两截文字向对角两极极速错位撕开
   ============================================================ */
J.register('layout', 'xxt_slash_rip', {
  name: '对角割裂',
  tags: ['graphic', 'glitch', 'pop'],
  vibes: ['xxt'],
  vibeExclusive: true,
  fits: n => n >= 2 && n <= 26,
  plan: (rng, cut, st) => ({
    font: rng.pick(J.fontsOf(st, ['display'])),
    shear: rng.range(18, 36)
  }),
  render(env) {
    const { W, H, sc } = env;
    const P = env.cut.params;
    const t0 = String(env.cut.text || '').replace(/\s+/g, '');
    const half = Math.ceil(t0.length / 2);
    const chunkA = t0.slice(0, half);
    const chunkB = t0.slice(half);

    const size = Math.min(W * 0.8 / Math.max(chunkA.length, chunkB.length || 1), H * 0.24);
    const cx = W / 2;
    const cy = H / 2;
    const offset = P.shear * (Math.min(W, H) / 1080) * 1.5;

    const itA = {
      text: chunkA,
      font: P.font,
      size,
      x: cx - offset * 1.6,
      y: cy - size * 0.55 - offset * 0.5,
      align: 'center',
      track: 0.05,
      color: sc.fg,
      mi: 0
    };

    const itB = {
      text: chunkB,
      font: P.font,
      size,
      x: cx + offset * 1.6,
      y: cy + size * 0.55 + offset * 0.5,
      align: 'center',
      track: 0.05,
      color: sc.accent,
      mi: 3
    };

    let bb = J.mainDraw(env, itA);
    if (chunkB) bb = J.unionBB(bb, J.mainDraw(env, itB));

    const a = inOut(env);
    if (a > 0.01) {
      const len = Math.hypot(W, H) * 0.6;
      const slashAngle = -35 * DEG;
      const dx = Math.cos(slashAngle) * len;
      const dy = Math.sin(slashAngle) * len;

      env.line([[cx - dx, cy - dy], [cx + dx, cy + dy]], sc.accent, 2.5, a * 0.9, false);
      env.line([[cx - dx + 8, cy - dy - 6], [cx + dx + 8, cy + dy - 6]], sc.sub, 1, a * 0.4, false);

      env.draw({
        text: '/// FRACTURE LINE // ANGLE: -35.0° // OFFSET ACTIVE ///',
        font: monoF(env),
        size: Math.max(9, H * 0.013),
        x: cx + 24,
        y: cy - 14,
        align: 'left',
        track: 0.12,
        color: sc.sub,
        alpha: a * 0.7,
        ghost: false
      });
    }

    return bb || { x0: W * 0.2, x1: W * 0.8, y0: H * 0.3, y1: H * 0.7, cx: W / 2, cy: H / 2, boxes: [] };
  }
}, PK);

/* ============================================================
   5. TREAT: xxt_deep_glow — 电影级深层核光
   白炽光核 + 高饱和能量圈 + 极光色彩弥散 (Deep Glow 物理多阶衰减)
   ============================================================ */
J.register('treat', 'xxt_deep_glow', {
  name: '深层核光',
  tags: ['pop', 'emotional', 'graphic'],
  vibes: ['xxt'],
  vibeExclusive: true,
  apply(env, it, P) {
    const sc = env.sc;
    it.shadow = {
      color: sc.accent || '#FF4565',
      blur: it.size * 0.45,
      dx: 0,
      dy: 0,
      a: 0.95
    };
    it.echo = {
      n: 3,
      dx: 1.5,
      dy: 1.0,
      color: sc.accent2 || sc.ghostA || '#00E5FF',
      alpha: 0.7
    };
  }
}, PK);

/* ============================================================
   6. TREAT: xxt_solar_aberration — 盛夏逆光文字质感
   夏日刺眼阳光渗透发光与高能 RGB 色散分离
   ============================================================ */
J.register('treat', 'xxt_solar_aberration', {
  name: '盛夏逆光',
  tags: ['pop', 'emotional', 'graphic'],
  vibes: ['xxt'],
  vibeExclusive: true,
  apply(env, it, P) {
    const sc = env.sc;
    it.shadow = {
      color: sc.accent || '#FF4565',
      blur: it.size * 0.28,
      dx: 0,
      dy: 0,
      a: 0.8
    };
    it.echo = {
      n: 2,
      dx: 4,
      dy: 2,
      color: sc.accent2 || sc.ghostA || '#00E5FF',
      alpha: 0.55
    };
  }
}, PK);

/* ============================================================
   7. ENTER: xxt_rack_focus — 景深变焦合焦入场
   模拟大光圈镜头由散景虚化在瞬间精准“合焦”就位，带微量回弹
   ============================================================ */
J.register('enter', 'xxt_rack_focus', {
  name: '景深合焦',
  tags: ['editorial', 'calm', 'emotional'],
  vibes: ['xxt'],
  vibeExclusive: true,
  apply(env, it, p) {
    const ep = E.outExpo(p);
    it.blur = (it.blur || 0) + (1 - ep) * 22;
    it.alpha = (it.alpha ?? 1) * J.clamp(p * 2.5);
    it.charFns.push((i, g, n) => {
      const d = n > 1 ? (i / (n - 1)) * 0.25 : 0;
      const prog = J.clamp((p - d) / 0.75);
      const q = E.outExpo(prog);
      return {
        s: J.lerp(1.35, 1, q),
        dx: J.rs(it.seed || 1, i, 7) * (1 - q) * it.size * 0.2,
        a: J.clamp(prog * 3)
      };
    });
  }
}, PK);

/* ============================================================
   8. ENTER: xxt_rip_burst — 撕裂破空入场
   模拟胶带/纸张撕开瞬间的强烈交错弹射，字形极速咬合就位
   ============================================================ */
J.register('enter', 'xxt_rip_burst', {
  name: '撕裂破空',
  tags: ['graphic', 'glitch', 'pop'],
  vibes: ['xxt'],
  vibeExclusive: true,
  apply(env, it, p) {
    it.charFns.push((i, g, n) => {
      const d = n > 1 ? (i / (n - 1)) * 0.35 : 0;
      const prog = J.clamp((p - d) / 0.65);
      if (prog <= 0) return { hide: true };
      const ep = E.outExpo(prog);
      const kk = 1 - ep;
      const dir = i % 2 === 0 ? -1 : 1;
      return {
        dx: dir * kk * it.size * 0.9,
        dy: (dir * 0.4 + 0.6) * kk * it.size * 0.6,
        rot: dir * kk * 18,
        s: J.lerp(1.7, 1, ep),
        a: J.clamp(prog * 3.5)
      };
    });
  }
}, PK);

/* ============================================================
   9. EXIT: xxt_stardust_fall — 星尘坠落退场
   重力向下拖拽解体，文字逐渐缩小下沉消散为星尘
   ============================================================ */
J.register('exit', 'xxt_stardust_fall', {
  name: '星尘坠落',
  tags: ['graphic', 'emotional', 'calm'],
  vibes: ['xxt'],
  vibeExclusive: true,
  apply(env, it, p) {
    it.charFns.push((i, g, n) => {
      const d = n > 1 ? (i / (n - 1)) * 0.25 : 0;
      const prog = J.clamp((p - d) / 0.75);
      const ep = E.inCubic(prog);
      return {
        dy: ep * it.size * 1.5,
        s: J.lerp(1, 0.35, ep),
        rot: J.rs(it.seed || 1, i, 4) * 25 * ep,
        a: 1 - ep
      };
    });
  }
}, PK);

/* ============================================================
   10. HOLD: xxt_chest_resonate — 胸腔共鸣保持
   模拟心跳节拍与声浪撞击的微呼吸脉冲与频率微震
   ============================================================ */
J.register('hold', 'xxt_chest_resonate', {
  name: '胸腔共鸣',
  tags: ['emotional', 'pop', 'glitch'],
  vibes: ['xxt'],
  vibeExclusive: true,
  apply(env, it, amt) {
    const t = env.lt * 7.5;
    const pulse = Math.sin(t) * Math.sin(t * 1.5) * amt * 0.045;
    it.sx = (it.sx || 1) * (1 + pulse);
    it.sy = (it.sy || 1) * (1 - pulse * 0.6);
    it.charFns.push((i) => ({
      dy: Math.sin(t + i * 1.3) * 2.8 * amt,
      dx: Math.cos(t * 1.4 + i * 0.9) * 1.4 * amt
    }));
  }
}, PK);

/* ============================================================
   11. BG: xxt_gravitational_lens — 引力透镜天体视界
   爱因斯坦环光弧、引力透镜弯折星晕、黑洞事件视界吸积光流
   ============================================================ */
J.register('bg', 'xxt_gravitational_lens', {
  name: '引力透镜视界',
  tags: ['graphic', 'editorial', 'emotional'],
  vibes: ['xxt'],
  vibeExclusive: true,
  plan: rng => ({ seed: rng.int(1, 1e9), rotSpd: rng.range(0.08, 0.15) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env;
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.36;
    const t = env.t * (P.rotSpd || 0.1);

    ctx.save();
    const radGrad = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.4);
    radGrad.addColorStop(0, 'rgba(0,0,0,0.85)');
    radGrad.addColorStop(0.5, J.rgba(sc.accent, 0.15));
    radGrad.addColorStop(0.85, J.rgba(sc.accent2 || sc.sub, 0.06));
    radGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, W, H);

    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.strokeStyle = sc.accent;
    ctx.lineWidth = 1.8;
    ctx.globalAlpha = 0.45 + 0.15 * Math.sin(env.t * 3);
    ctx.stroke();

    for (let j = 0; j < 3; j++) {
      const arcLen = 1.2 + j * 0.5;
      const startAng = t * (j % 2 === 0 ? 1 : -1) + j * 2.1;
      ctx.beginPath();
      ctx.arc(cx, cy, R * (0.88 + j * 0.12), startAng, startAng + arcLen);
      ctx.strokeStyle = j === 0 ? '#FFFFFF' : sc.accent;
      ctx.lineWidth = j === 0 ? 2 : 1.2;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
    }
    ctx.restore();
  }
}, PK);

/* ============================================================
   12. BG: xxt_warp_starmap — 曲速星河背景
   深邃下坠流动的宇宙星图、参商双星连线与曲速星轨光流
   ============================================================ */
J.register('bg', 'xxt_warp_starmap', {
  name: '曲速星河',
  tags: ['graphic', 'editorial', 'emotional'],
  vibes: ['xxt'],
  vibeExclusive: true,
  plan: rng => ({ seed: rng.int(1, 1e9), spd: rng.range(0.85, 1.35) }),
  draw(env, P, ctx) {
    const { W, H, sc } = env;
    const sd = P.seed || 1;
    const t = env.t * (P.spd || 1);
    const cx = W / 2, cy = H / 2;
    const starCount = 80;

    ctx.save();
    for (let i = 0; i < starCount; i++) {
      const ang = J.r(sd, i, 1) * TAU;
      const baseR = J.r(sd, i, 2) * Math.max(W, H) * 0.65;
      const speed = 0.5 + 0.5 * J.r(sd, i, 3);
      const dist = (baseR + t * 160 * speed) % (Math.max(W, H) * 0.65);
      const px = cx + Math.cos(ang) * dist;
      const py = cy + Math.sin(ang) * dist + (t * 35 * speed) % H;
      const pRad = J.lerp(0.8, 2.6, dist / (Math.max(W, H) * 0.65));
      const alpha = J.clamp((dist / 60) * (1 - dist / (Math.max(W, H) * 0.65)));

      if (i % 4 === 0 && dist > 80) {
        const tailX = px - Math.cos(ang) * (dist * 0.1);
        const tailY = py - Math.sin(ang) * (dist * 0.1);
        env.line([[tailX, tailY], [px, py]], i % 8 === 0 ? sc.accent : sc.sub, 1, alpha * 0.45, false);
      }
      env.circle(px, py, pRad, i % 5 === 0 ? sc.accent : sc.fg, null, 0, alpha * 0.8, false);
    }
    ctx.restore();
  }
}, PK);

/* ============================================================
   13. CAM: xxt_cinematic_push — 电影呼吸推轨运镜
   ARRI 电影机摇臂式缓速推进，带 0.5° 微俯仰手持有机呼吸动势
   ============================================================ */
J.register('cam', 'xxt_cinematic_push', {
  name: '电影呼吸推轨',
  tags: ['editorial', 'calm', 'emotional'],
  vibes: ['xxt'],
  vibeExclusive: true,
  plan: rng => ({ sway: rng.range(0.008, 0.016) }),
  get: (env, P) => {
    const prog = J.clamp(env.lt / Math.max(0.3, env.cut.dur));
    const smoothE = E.inOutCubic(prog);
    const breath = Math.sin(env.lt * 2.2) * (P.sway || 0.012) * env.W;
    const tilt = Math.sin(env.lt * 1.6) * 0.45;
    return {
      x: breath,
      y: Math.cos(env.lt * 1.8) * breath * 0.5,
      s: 1.0 + 0.045 * smoothE,
      rot: tilt
    };
  }
}, PK);

/* ============================================================
   14. CAM: xxt_dive_down — 极速下潜运镜
   带失重加速度的向下纵深推进，模拟狂奔坠落的过山车视角
   ============================================================ */
J.register('cam', 'xxt_dive_down', {
  name: '极速下潜',
  tags: ['graphic', 'glitch', 'pop'],
  vibes: ['xxt'],
  vibeExclusive: true,
  plan: rng => ({ dir: 1, amp: rng.range(0.045, 0.085) }),
  get: (env, P) => {
    const prog = J.clamp(env.lt / Math.max(0.3, env.cut.dur));
    const dive = Math.pow(prog, 1.8);
    const shake = Math.sin(env.lt * 32) * env.H * 0.003 * (1 - prog);
    return {
      x: 0,
      y: dive * env.H * (P.amp || 0.065) + shake,
      s: 1 + 0.08 * dive,
      rot: Math.sin(prog * Math.PI) * 0.7
    };
  }
}, PK);

/* ============================================================
   15. TRANS: xxt_anamorphic_flare — 宽银幕耀斑转场
   中心瞬间爆发出贯穿全屏的变形宽银幕水平激光耀斑，过曝切镜
   ============================================================ */
J.register('trans', 'xxt_anamorphic_flare', {
  name: '宽银幕耀斑转场',
  tags: ['graphic', 'glitch', 'pop'],
  vibes: ['xxt'],
  vibeExclusive: true,
  dur: 0.35,
  plan: rng => ({}),
  draw(ctx, A, B, p, I, P) {
    const { cw, ch } = I;
    const bell = Math.sin(p * Math.PI);
    if (p < 0.5) ctx.drawImage(A, 0, 0);
    else ctx.drawImage(B, 0, 0);

    if (bell > 0.01) {
      const cy = ch * 0.5;
      const flareH = Math.max(2, ch * 0.02 * bell);
      const glowH = ch * 0.18 * bell;

      ctx.save();
      const grad = ctx.createLinearGradient(0, cy - glowH, 0, cy + glowH);
      const col = (I.sc && I.sc.accent) || '#00E5FF';
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.35, J.rgba(col, bell * 0.45));
      grad.addColorStop(0.5, '#FFFFFF');
      grad.addColorStop(0.65, J.rgba(col, bell * 0.45));
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = grad;
      ctx.fillRect(0, cy - glowH, cw, glowH * 2);

      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = Math.min(1, bell * 1.6);
      ctx.fillRect(0, cy - flareH * 0.5, cw, flareH);
      ctx.restore();
    }
  }
}, PK);

/* ============================================================
   16. DECOR: xxt_lightcone — 时空光锥 (已保留)
   ============================================================ */
J.register('decor', 'xxt_lightcone', {
  name: '时空光锥',
  tags: ['graphic', 'editorial'],
  vibes: ['xxt'],
  vibeExclusive: true,
  layer: 'back',
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;
    const cx = bb ? bb.cx : W / 2;
    const cy = bb ? bb.cy : H / 2;
    const R = Math.min(W, H) * 0.45;
    const pulse = 1 + 0.03 * Math.sin(env.lt * 4);

    ctx.save();
    const coneL = R * 1.15 * pulse;
    env.line([[cx - coneL, cy - coneL], [cx + coneL, cy + coneL]], sc.sub, 1, a * 0.4, false);
    env.line([[cx - coneL, cy + coneL], [cx + coneL, cy - coneL]], sc.sub, 1, a * 0.4, false);

    env.line([[cx, cy - R * 1.1], [cx, cy + R * 1.1]], sc.sub, 1.2, a * 0.5, false);
    env.line([[cx - R * 1.1, cy], [cx + R * 1.1, cy]], sc.sub, 1.2, a * 0.5, false);

    env.draw({ text: '+ct (TIME)', font: monoF(env), size: Math.max(10, H * 0.015), x: cx + 12, y: cy - R * 1.05, align: 'left', color: sc.sub, alpha: a * 0.8, ghost: false });
    env.draw({ text: '+x (SPACE)', font: monoF(env), size: Math.max(10, H * 0.015), x: cx + R * 1.05, y: cy - 10, align: 'right', color: sc.sub, alpha: a * 0.8, ghost: false });

    const ticks = 8;
    for (let i = 1; i <= ticks; i++) {
      const d = (R / ticks) * i;
      const tw = i % 2 === 0 ? 8 : 4;
      env.line([[cx - tw, cy - d], [cx + tw, cy - d]], sc.sub, 1, a * 0.4, false);
      env.line([[cx - tw, cy + d], [cx + tw, cy + d]], sc.sub, 1, a * 0.4, false);
      env.line([[cx - d, cy - tw], [cx - d, cy + tw]], sc.sub, 1, a * 0.4, false);
      env.line([[cx + d, cy - tw], [cx + d, cy + tw]], sc.sub, 1, a * 0.4, false);
    }

    ctx.beginPath();
    ctx.strokeStyle = sc.accent;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = a * 0.65;
    const hypA = R * 0.35;
    for (let sign of [-1, 1]) {
      ctx.beginPath();
      for (let step = -40; step <= 40; step++) {
        const x = (step / 40) * (R * 0.7);
        const y = sign * Math.sqrt(hypA * hypA + x * x);
        if (step === -40) ctx.moveTo(cx + x, cy + y);
        else ctx.lineTo(cx + x, cy + y);
      }
      ctx.stroke();
    }

    const ptCount = 6;
    for (let i = 0; i < ptCount; i++) {
      const prog = (env.lt * 0.4 + i / ptCount) % 1;
      const dist = prog * coneL;
      env.circle(cx + dist, cy - dist, 2.5, sc.accent, null, 0, a * (1 - prog), false);
      env.circle(cx - dist, cy - dist, 2.5, sc.accent, null, 0, a * (1 - prog), false);
    }

    env.draw({
      text: 'HORIZON: c // ds² = -c²dt² + dx² // LIGHT CONE BOUNDARY',
      font: monoF(env),
      size: Math.max(9, H * 0.013),
      x: cx,
      y: cy + R * 0.92,
      align: 'center',
      track: 0.1,
      color: sc.sub,
      alpha: a * 0.7,
      ghost: false
    });

    ctx.restore();
  }
}, PK);

/* ============================================================
   17. DECOR: xxt_celestial_orbit — 宿度星轨 (已保留)
   ============================================================ */
J.register('decor', 'xxt_celestial_orbit', {
  name: '宿度星轨',
  tags: ['graphic', 'calm', 'emotional'],
  vibes: ['xxt'],
  vibeExclusive: true,
  layer: 'back',
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;
    const cx = bb ? bb.cx : W / 2;
    const cy = bb ? bb.cy : H / 2;
    const R1 = Math.min(W, H) * 0.38;
    const R2 = Math.min(W, H) * 0.28;
    const rot = env.lt * 0.12;

    ctx.save();
    env.circle(cx, cy, R1, null, sc.sub, 1, a * 0.35, false);
    env.circle(cx, cy, R2, null, sc.sub, 1, a * 0.25, false);

    const tickSteps = 36;
    for (let i = 0; i < tickSteps; i++) {
      const ang = (i / tickSteps) * TAU + rot;
      const len = i % 9 === 0 ? 12 : i % 3 === 0 ? 7 : 3.5;
      const x0 = cx + Math.cos(ang) * R1;
      const y0 = cy + Math.sin(ang) * R1;
      const x1 = cx + Math.cos(ang) * (R1 - len);
      const y1 = cy + Math.sin(ang) * (R1 - len);
      env.line([[x0, y0], [x1, y1]], sc.sub, 1, a * 0.5, false);
    }

    const starAng = rot * 1.5;
    const shenX = cx + Math.cos(starAng) * R2;
    const shenY = cy + Math.sin(starAng) * R2;
    const shangX = cx + Math.cos(starAng + Math.PI) * R2;
    const shangY = cy + Math.sin(starAng + Math.PI) * R2;

    env.line([[shenX, shenY], [shangX, shangY]], sc.accent, 1, a * 0.25, false);

    env.circle(shenX, shenY, 4, sc.accent, null, 0, a * 0.9, false);
    env.circle(shenX, shenY, 9, null, sc.accent, 1, a * 0.6, false);
    env.draw({ text: '参 [SHEN] · RA 05h35m', font: monoF(env), size: Math.max(9, H * 0.013), x: shenX + 12, y: shenY - 6, align: 'left', color: sc.accent, alpha: a * 0.85, ghost: false });

    env.circle(shangX, shangY, 4, sc.fg, null, 0, a * 0.9, false);
    env.circle(shangX, shangY, 9, null, sc.fg, 1, a * 0.6, false);
    env.draw({ text: '商 [SHANG] · RA 16h29m', font: monoF(env), size: Math.max(9, H * 0.013), x: shangX - 12, y: shangY + 12, align: 'right', color: sc.sub, alpha: a * 0.85, ghost: false });

    ctx.setLineDash([12, 10, 4, 10]);
    ctx.beginPath();
    ctx.arc(cx, cy, R1 * 1.25, -0.4 + rot * 0.5, 1.2 + rot * 0.5);
    ctx.strokeStyle = sc.sub;
    ctx.lineWidth = 1;
    ctx.globalAlpha = a * 0.35;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, R1 * 1.25, Math.PI - 0.4 + rot * 0.5, Math.PI + 1.2 + rot * 0.5);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }
}, PK);

/* ============================================================
   18. DECOR: xxt_guitar_wave — 夏夜声浪 (已保留)
   ============================================================ */
J.register('decor', 'xxt_guitar_wave', {
  name: '夏夜声浪',
  tags: ['pop', 'graphic', 'glitch'],
  vibes: ['xxt'],
  vibeExclusive: true,
  layer: 'front',
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;
    const yBase = bb ? Math.min(H * 0.88, bb.y1 + H * 0.08) : H * 0.82;
    const wSpan = Math.min(W * 0.84, 820);
    const x0 = (W - wSpan) / 2;

    ctx.save();
    const lineSpacing = 5;
    const numLines = 6;
    for (let l = 0; l < numLines; l++) {
      const ly = yBase - (numLines - 1 - l) * lineSpacing;
      env.line([[x0, ly], [x0 + wSpan, ly]], sc.sub, 1, a * 0.35, false);
    }
    env.draw({ text: 'TAB', font: monoF(env), size: 10, x: x0 - 8, y: yBase - 12, align: 'right', color: sc.sub, alpha: a * 0.7, ghost: false });

    const pts = [];
    const segments = 48;
    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      const px = x0 + u * wSpan;
      const freq = 14 + Math.sin(env.lt * 3) * 6;
      const envelope = Math.sin(u * Math.PI);
      const amp = (Math.sin(u * freq + env.lt * 22) * 16 + Math.sin(u * 32 - env.lt * 35) * 8) * envelope;
      pts.push([px, yBase - 12 + amp]);
    }
    env.line(pts, sc.accent, 1.6, a * 0.85, false);

    const frets = ['7', '9', '9', '8', '7', '7'];
    frets.forEach((f, idx) => {
      const fx = x0 + wSpan * (0.2 + idx * 0.11);
      const fy = yBase - idx * lineSpacing;
      env.rect(fx - 6, fy - 6, 12, 12, sc.bg, a * 0.8, false);
      env.draw({ text: f, font: monoF(env), size: 10, x: fx, y: fy, align: 'center', color: sc.fg, alpha: a * 0.9, ghost: false });
    });

    const tagY = yBase - numLines * lineSpacing - 12;
    env.draw({
      text: 'SUMMER VIBE // 38.5℃ // 98.4dB // FREQ: 440Hz [A4]',
      font: monoF(env),
      size: Math.max(9, H * 0.012),
      x: x0,
      y: tagY,
      align: 'left',
      track: 0.08,
      color: sc.sub,
      alpha: a * 0.75,
      ghost: false
    });

    ctx.restore();
  }
}, PK);

})();
