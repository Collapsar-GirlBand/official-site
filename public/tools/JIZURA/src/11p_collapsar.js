/* JIZURA pack: collapsar — Black hole, singularity & gravity themed components for 坍缩星 (collapsar) */
(() => {
'use strict';
const E = J.E;
const PK = 'collapsar';
const DEG = J.DEG || (Math.PI / 180);
const TAU = J.TAU || (Math.PI * 2);

const monoF = env => (env.st?.fonts?.mono && env.st.fonts.mono[0]) || 'mono';
const inOut = env => E.outCubic(J.clamp(env.lt / 0.35)) * (1 - E.inCubic(env.pOut));

/* Helper: 4-Point StarFlare concave bezier shape (from Timeline.tsx / Contact.tsx) */
function drawStarFlare(ctx, x, y, r, fill, stroke, lw, alpha) {
  if (r <= 0.5 || alpha <= 0.01) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  const c = r * 0.22;
  ctx.moveTo(0, -r);
  ctx.bezierCurveTo(c * 0.25, -c, c, -c * 0.25, r, 0);
  ctx.bezierCurveTo(c, c * 0.25, c * 0.25, c, 0, r);
  ctx.bezierCurveTo(-c * 0.25, c, -c, c * 0.25, -r, 0);
  ctx.bezierCurveTo(-c, -c * 0.25, -c * 0.25, -c, 0, -r);
  ctx.closePath();
  ctx.globalAlpha = alpha;
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
  ctx.restore();
}

/* ============================================================
   1. DECOR: collapsar_singularity — 奇点事件视界 (Back Layer)
   对冲双向旋转吸积盘、高能呼吸日冕与深黑事件视界核心
   ============================================================ */
J.register('decor', 'collapsar_singularity', {
  name: '奇点事件视界',
  tags: ['graphic', 'calm', 'emotional'],
  vibes: ['collapsar'],
  vibeExclusive: true,
  layer: 'back',
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;

    const cx = bb ? bb.cx : W / 2;
    const cy = bb ? bb.cy : H / 2;
    const baseR = Math.min(W, H) * 0.34;
    const pulse = 1 + 0.04 * Math.sin(env.lt * 2.4);

    ctx.save();

    // 1. 弥散高能呼吸日冕 (Celestial Breathing Corona)
    const coronaR = baseR * 1.35 * pulse;
    const gCorona = ctx.createRadialGradient(cx, cy, baseR * 0.35, cx, cy, coronaR);
    gCorona.addColorStop(0, sc.accent || '#ffffff');
    gCorona.addColorStop(0.5, sc.sub || 'rgba(255,255,255,0.4)');
    gCorona.addColorStop(1, 'transparent');
    ctx.globalAlpha = a * 0.22;
    ctx.fillStyle = gCorona;
    ctx.beginPath();
    ctx.arc(cx, cy, coronaR, 0, TAU);
    ctx.fill();

    // 2. 对冲双向旋转吸积盘轨道 (Counter-rotating accretion rings)
    const rotOuter = env.lt * 0.1;
    const rotInner = -env.lt * 0.16;
    const rOuter = baseR * 1.15;
    const rInner = baseR * 0.82;

    env.circle(cx, cy, rOuter, null, sc.sub, 1, a * 0.35, false);

    // 外轨天文度盘刻度 (36 宿度刻度)
    const ticks = 36;
    for (let i = 0; i < ticks; i++) {
      const ang = (i / ticks) * TAU + rotOuter;
      const len = i % 9 === 0 ? 9 : i % 3 === 0 ? 5 : 2.5;
      const x0 = cx + Math.cos(ang) * rOuter;
      const y0 = cy + Math.sin(ang) * rOuter;
      const x1 = cx + Math.cos(ang) * (rOuter - len);
      const y1 = cy + Math.sin(ang) * (rOuter - len);
      env.line([[x0, y0], [x1, y1]], sc.sub, 1, a * 0.45, false);
    }

    // 内轨虚线视界环
    ctx.setLineDash([10, 8, 3, 8]);
    ctx.beginPath();
    ctx.arc(cx, cy, rInner, rotInner, rotInner + TAU);
    ctx.strokeStyle = sc.sub;
    ctx.lineWidth = 1;
    ctx.globalAlpha = a * 0.3;
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. 事件视界深黑核心与光子环 (Event Horizon & Photon Ring)
    const coreR = baseR * 0.42;
    env.circle(cx, cy, coreR, sc.bg, null, 0, a * 0.96, false);
    env.circle(cx, cy, coreR, null, sc.accent, 1.4, a * 0.85, false);

    // 核心微弱十字测绘线
    const crossL = coreR * 0.4;
    env.line([[cx - crossL, cy], [cx + crossL, cy]], sc.sub, 1, a * 0.5, false);
    env.line([[cx, cy - crossL], [cx, cy + crossL]], sc.sub, 1, a * 0.5, false);

    // 4. 科幻天体物理元数据流标注
    const metaY = cy + baseR * 1.25;
    env.draw({
      text: 'RS = 2GM/c² // EVENT HORIZON // [COLLAPSAR SINGULARITY]',
      font: monoF(env),
      size: Math.max(9, H * 0.013),
      x: cx,
      y: metaY,
      align: 'center',
      track: 0.12,
      color: sc.sub,
      alpha: a * 0.75,
      ghost: false
    });
    env.draw({
      text: 'CURVATURE: SINGULAR // PHOTON SPHERE: 1.5 RS',
      font: monoF(env),
      size: Math.max(9, H * 0.012),
      x: cx,
      y: cy - baseR * 1.22,
      align: 'center',
      track: 0.12,
      color: sc.sub,
      alpha: a * 0.7,
      ghost: false
    });

    ctx.restore();
  }
}, PK);

/* ============================================================
   2. DECOR: collapsar_diffraction_flare — 坍缩衍射星芒 (Front Layer)
   内凹四角贝塞尔星芒、双层旋转星环与星座折线导轨
   ============================================================ */
J.register('decor', 'collapsar_diffraction_flare', {
  name: '坍缩衍射星芒',
  tags: ['graphic', 'pop', 'glitch'],
  vibes: ['collapsar'],
  vibeExclusive: true,
  layer: 'front',
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;

    ctx.save();
    const pulse = 1 + 0.06 * Math.sin(env.lt * 3.6);

    // 锚定在文字包围盒左右两侧或对角
    const nodeSpanX = bb ? Math.max((bb.x1 - bb.x0) * 0.65, 140) : W * 0.35;
    const cx = bb ? bb.cx : W / 2;
    const cy = bb ? bb.cy : H / 2;

    const nodes = [
      { x: cx - nodeSpanX, y: cy - 18, label: 'ALPHA' },
      { x: cx + nodeSpanX, y: cy + 18, label: 'OMEGA' },
    ];

    nodes.forEach((node, idx) => {
      const nx = node.x, ny = node.y;
      const isLeft = idx === 0;

      // 双层微型旋转星轨
      const r1 = 16, r2 = 28;
      const rot = env.lt * 0.6 * (isLeft ? 1 : -1);

      env.circle(nx, ny, r1, null, sc.sub, 1, a * 0.35, false);
      env.circle(nx, ny, r2, null, sc.sub, 0.8, a * 0.22, false);

      // 轨道上的巡航微星
      const px = nx + Math.cos(rot) * r2;
      const py = ny + Math.sin(rot) * r2;
      env.circle(px, py, 2.2, sc.accent, null, 0, a * 0.9, false);

      // 4-Point StarFlare 内凹贝塞尔星芒 (双层高光)
      drawStarFlare(ctx, nx, ny, 24 * pulse, sc.sub, null, 0, a * 0.35);
      drawStarFlare(ctx, nx, ny, 14 * pulse, sc.accent, sc.fg, 1, a * 0.95);

      // 星座折线导轨 (源自 Timeline.tsx)
      const guideDir = isLeft ? -1 : 1;
      const p0 = [nx + guideDir * r2, ny];
      const p1 = [nx + guideDir * (r2 + 30), ny];
      const p2 = [nx + guideDir * (r2 + 55), ny + (isLeft ? -22 : 22)];
      const p3 = [nx + guideDir * (r2 + 105), ny + (isLeft ? -22 : 22)];

      env.line([p0, p1, p2, p3], sc.sub, 1, a * 0.45, false);
      env.circle(p3[0], p3[1], 2.5, sc.accent, null, 0, a * 0.85, false);

      // 导轨末梢终端标注
      env.draw({
        text: `DIFFRACTION_${node.label} [ACT]`,
        font: monoF(env),
        size: Math.max(8.5, H * 0.011),
        x: p3[0] + guideDir * 6,
        y: p3[1],
        align: isLeft ? 'right' : 'left',
        color: sc.sub,
        alpha: a * 0.75,
        ghost: false
      });
    });

    ctx.restore();
  }
}, PK);

/* ============================================================
   3. DECOR: collapsar_gravity_dust — 引力星尘坍缩流 (Back Layer)
   源自 Background.tsx：三次缓动向心引力吸附与视界湮灭消亡
   ============================================================ */
J.register('decor', 'collapsar_gravity_dust', {
  name: '引力星尘坍缩流',
  tags: ['emotional', 'calm', 'graphic'],
  vibes: ['collapsar'],
  vibeExclusive: true,
  layer: 'back',
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;

    const cx = bb ? bb.cx : W / 2;
    const cy = bb ? bb.cy : H / 2;
    const maxR = Math.hypot(W, H) * 0.52;
    const killR = Math.min(W, H) * 0.06;
    const fadeR = Math.min(W, H) * 0.18;

    const s = env.cut.seed || 54321;
    const count = 48;

    ctx.save();
    for (let k = 0; k < count; k++) {
      const initAng = J.r(s, k, 1) * TAU;
      const speed = 0.18 + J.r(s, k, 2) * 0.28;
      const baseSize = 1.2 + J.r(s, k, 3) * 2.2;
      const spiralDir = (J.r(s, k, 4) > 0.5 ? 1 : -1) * (1.5 + J.r(s, k, 5) * 2.2);
      const phase = J.r(s, k, 6) * TAU;

      // 周期向心推进进度 [0, 1)
      const prog = (env.lt * speed + J.r(s, k, 7)) % 1;
      const easeProg = prog * prog; // 二次加速坠入

      const dist = maxR * (1 - easeProg);
      const ang = initAng + spiralDir * Math.log(1 + easeProg * 7);

      const px = cx + Math.cos(ang) * dist;
      const py = cy + Math.sin(ang) * dist;

      // 视界湮灭判断 (Annihilation Boundary)
      if (dist < killR) continue; // 坠入奇点，彻底湮灭

      let pAlpha = 0.65 + 0.35 * Math.sin(env.lt * 6 + phase);
      let pSize = baseSize;

      if (dist < fadeR) {
        // 靠近视界边缘平滑收缩消散
        const t = (dist - killR) / (fadeR - killR);
        pAlpha *= t;
        pSize *= (0.35 + 0.65 * t);
      }

      if (pAlpha > 0.02) {
        const col = k % 4 === 0 ? sc.accent : sc.fg;
        env.circle(px, py, pSize, col, null, 0, a * pAlpha * 0.8, false);
      }
    }
    ctx.restore();
  }
}, PK);

/* ============================================================
   4. DECOR: collapsar_tech_bracket — 引力测绘标尺 (Front Layer)
   源自 Contact.tsx：四角动态直角标尺、扫描线与引力场数据流
   ============================================================ */
J.register('decor', 'collapsar_tech_bracket', {
  name: '引力测绘标尺',
  tags: ['editorial', 'graphic', 'glitch'],
  vibes: ['collapsar'],
  vibeExclusive: true,
  layer: 'front',
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;

    const padX = Math.max(W * 0.025, 26);
    const padY = Math.max(H * 0.02, 18);

    const x0 = (bb ? bb.x0 : W * 0.16) - padX;
    const x1 = (bb ? bb.x1 : W * 0.84) + padX;
    const y0 = (bb ? bb.y0 : H * 0.38) - padY;
    const y1 = (bb ? bb.y1 : H * 0.62) + padY;

    ctx.save();

    // 1. 四角动态测绘直角标尺 (Corner Brackets)
    const bLen = Math.min(22, (x1 - x0) * 0.14, (y1 - y0) * 0.35);

    // Top-Left
    env.line([[x0, y0 + bLen], [x0, y0], [x0 + bLen, y0]], sc.sub, 1.4, a * 0.85, false);
    // Top-Right
    env.line([[x1 - bLen, y0], [x1, y0], [x1, y0 + bLen]], sc.sub, 1.4, a * 0.85, false);
    // Bottom-Left
    env.line([[x0, y1 - bLen], [x0, y1], [x0 + bLen, y1]], sc.sub, 1.4, a * 0.85, false);
    // Bottom-Right
    env.line([[x1 - bLen, y1], [x1, y1], [x1, y1 - bLen]], sc.sub, 1.4, a * 0.85, false);

    // 四角微型十字瞄准准星
    const ch = 4;
    for (const [cx, cy] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) {
      env.line([[cx - ch, cy], [cx + ch, cy]], sc.accent, 1, a * 0.65, false);
      env.line([[cx, cy - ch], [cx, cy + ch]], sc.accent, 1, a * 0.65, false);
    }

    // 2. 动态扫描激光线 (Laser Scanline)
    const scanProg = (env.lt * 0.4) % 1;
    const scanY = y0 + scanProg * (y1 - y0);
    const scanFade = Math.sin(scanProg * Math.PI);
    env.line([[x0 + 6, scanY], [x1 - 6, scanY]], sc.accent, 1, a * scanFade * 0.45, false);

    // 3. 科幻数据流标头 (Header & Footer Streams)
    env.draw({
      text: '/// COLLAPSAR_GRAV_MEASUREMENT // SENSOR: ACTIVE',
      font: monoF(env),
      size: Math.max(8.5, H * 0.012),
      x: x0 + 4,
      y: y0 - 8,
      align: 'left',
      track: 0.08,
      color: sc.sub,
      alpha: a * 0.8,
      ghost: false
    });

    env.draw({
      text: 'STATUS: DETECTED // FIELD: 99.82% // COORD: [RA 17h45m]',
      font: monoF(env),
      size: Math.max(8.5, H * 0.012),
      x: x1 - 4,
      y: y1 + 13,
      align: 'right',
      track: 0.08,
      color: sc.sub,
      alpha: a * 0.8,
      ghost: false
    });

    ctx.restore();
  }
}, PK);

/* ============================================================
   5. DECOR: collapsar_lensing_grid — 时空弯曲网格 (Back Layer)
   广义相对论时空弯曲几何网格，光线在中心奇点周围发生透镜引力偏折
   ============================================================ */
J.register('decor', 'collapsar_lensing_grid', {
  name: '时空弯曲网格',
  tags: ['graphic', 'editorial'],
  vibes: ['collapsar'],
  vibeExclusive: true,
  layer: 'back',
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;

    const cx = bb ? bb.cx : W / 2;
    const cy = bb ? bb.cy : H / 2;
    const gridSpanW = Math.min(W * 0.9, 1080);
    const gridSpanH = Math.min(H * 0.65, 540);
    const x0 = cx - gridSpanW / 2;
    const x1 = cx + gridSpanW / 2;
    const y0 = cy - gridSpanH / 2;
    const y1 = cy + gridSpanH / 2;

    const xStep = gridSpanW / 14;
    const yStep = gridSpanH / 8;
    const mass = Math.min(W, H) * 22;

    ctx.save();
    ctx.strokeStyle = sc.sub;
    ctx.lineWidth = 1;
    ctx.globalAlpha = a * 0.28;

    // 弯曲横线
    for (let gy = y0; gy <= y1; gy += yStep) {
      ctx.beginPath();
      for (let s = 0; s <= 30; s++) {
        const gx = x0 + (s / 30) * gridSpanW;
        const dx = gx - cx, dy = gy - cy;
        const dist = Math.hypot(dx, dy) + 1;
        const pull = (mass / (dist + 40)) * Math.exp(-dist / (W * 0.35));
        const px = gx - (dx / dist) * pull;
        const py = gy - (dy / dist) * pull;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // 弯曲竖线
    for (let gx = x0; gx <= x1; gx += xStep) {
      ctx.beginPath();
      for (let s = 0; s <= 20; s++) {
        const gy = y0 + (s / 20) * gridSpanH;
        const dx = gx - cx, dy = gy - cy;
        const dist = Math.hypot(dx, dy) + 1;
        const pull = (mass / (dist + 40)) * Math.exp(-dist / (W * 0.35));
        const px = gx - (dx / dist) * pull;
        const py = gy - (dy / dist) * pull;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // 爱因斯坦环 (Einstein Radius)
    const rEinstein = Math.min(W, H) * 0.16;
    env.circle(cx, cy, rEinstein, null, sc.accent, 1, a * 0.45, false);

    // 相对论度规标注
    env.draw({
      text: 'ds² = -(1-rs/r)c²dt² + (1-rs/r)⁻¹dr² + r²dΩ² // g_μν METRIC',
      font: monoF(env),
      size: Math.max(8.5, H * 0.011),
      x: x0,
      y: y1 + 14,
      align: 'left',
      track: 0.1,
      color: sc.sub,
      alpha: a * 0.7,
      ghost: false
    });

    ctx.restore();
  }
}, PK);

/* ============================================================
   6. DECOR: collapsar_polar_jets — 极轴相对论喷流 (Back Layer)
   黑洞磁极垂直喷射的相对论等离子体光柱、磁场螺旋与脉冲激波
   ============================================================ */
J.register('decor', 'collapsar_polar_jets', {
  name: '极轴相对论喷流',
  tags: ['graphic', 'pop', 'glitch'],
  vibes: ['collapsar'],
  vibeExclusive: true,
  layer: 'back',
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;

    const cx = bb ? bb.cx : W / 2;
    const cy = bb ? bb.cy : H / 2;
    const jetLen = Math.min(H * 0.46, 420);
    const tilt = 12 * DEG;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tilt);

    // 双向极喷流 (North & South Poles)
    for (const dir of [-1, 1]) {
      // 1. 高能喷流核心细光束
      ctx.beginPath();
      ctx.strokeStyle = sc.accent || '#ffffff';
      ctx.lineWidth = 2.2;
      ctx.globalAlpha = a * 0.85;
      ctx.moveTo(0, dir * 18);
      ctx.lineTo(0, dir * jetLen);
      ctx.stroke();

      // 2. 磁层螺旋线 (Helical magnetic field)
      ctx.beginPath();
      ctx.strokeStyle = sc.sub;
      ctx.lineWidth = 1;
      ctx.globalAlpha = a * 0.45;
      const steps = 36;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const ly = dir * (18 + u * (jetLen - 18));
        const amp = (8 + u * 24) * Math.sin(u * TAU * 3 - env.lt * 18);
        if (i === 0) ctx.moveTo(amp, ly);
        else ctx.lineTo(amp, ly);
      }
      ctx.stroke();

      // 3. 高能粒子脉冲光斑
      const pulseProg = (env.lt * 0.8 + (dir > 0 ? 0 : 0.5)) % 1;
      const py = dir * (18 + pulseProg * (jetLen - 18));
      const pR = 3 + pulseProg * 8;
      env.circle(0, py, pR, null, sc.accent, 1.2, a * (1 - pulseProg) * 0.9, false);
      env.circle(0, py, pR * 0.4, sc.accent, null, 0, a * (1 - pulseProg), false);
    }

    // 视界法线标注
    env.draw({
      text: 'RELATIVISTIC POLAR JET // LORENTZ FACTOR: γ ≈ 25',
      font: monoF(env),
      size: Math.max(8.5, H * 0.011),
      x: 14,
      y: -jetLen * 0.85,
      align: 'left',
      color: sc.sub,
      alpha: a * 0.75,
      ghost: false
    });

    ctx.restore();
  }
}, PK);

/* ============================================================
   7. DECOR: collapsar_gravitational_waves — 引力波共振涟漪 (Back Layer)
   源自 GameSystem.tsx 核心共鸣：四极引力辐射波纹、椭圆频散与引变应变标尺
   ============================================================ */
J.register('decor', 'collapsar_gravitational_waves', {
  name: '引力波共振涟漪',
  tags: ['calm', 'emotional', 'graphic'],
  vibes: ['collapsar'],
  vibeExclusive: true,
  layer: 'back',
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;

    const cx = bb ? bb.cx : W / 2;
    const cy = bb ? bb.cy : H / 2;
    const maxR = Math.min(W, H) * 0.48;
    const waveCount = 5;

    ctx.save();
    for (let i = 0; i < waveCount; i++) {
      const prog = (env.lt * 0.25 + i / waveCount) % 1;
      const r = 24 + prog * (maxR - 24);
      const waveAlpha = a * Math.sin(prog * Math.PI) * 0.4;

      if (waveAlpha <= 0.01) continue;

      // 四极引力波变形 (Quadrupole Asymmetry: 横向微伸长，纵向微压缩)
      ctx.beginPath();
      ctx.strokeStyle = i % 2 === 0 ? sc.sub : sc.accent;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = waveAlpha;
      const pts = 36;
      for (let k = 0; k <= pts; k++) {
        const theta = (k / pts) * TAU;
        const quadR = r * (1 + 0.12 * Math.cos(2 * theta + env.lt * 2));
        const px = cx + Math.cos(theta) * quadR * 1.15;
        const py = cy + Math.sin(theta) * quadR;
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }

    env.draw({
      text: 'h_+ = (1/r) · (d²I/dt²) // STRAIN: 1.0e-21 [LIGO/VIRGO]',
      font: monoF(env),
      size: Math.max(8.5, H * 0.011),
      x: cx,
      y: cy + maxR * 0.95,
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
   8. DECOR: collapsar_accretion_stream — 吸积盘多普勒光流 (Front Layer)
   相对论多普勒频移高光轨道，左侧蓝移增亮、右侧红移暗化与高速光子流
   ============================================================ */
J.register('decor', 'collapsar_accretion_stream', {
  name: '吸积多普勒光流',
  tags: ['graphic', 'pop', 'glitch'],
  vibes: ['collapsar'],
  vibeExclusive: true,
  layer: 'front',
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;

    const cx = bb ? bb.cx : W / 2;
    const cy = bb ? bb.cy : H / 2;
    const rx = Math.max((bb ? bb.x1 - bb.x0 : W * 0.6) * 0.62, 180);
    const ry = Math.max((bb ? bb.y1 - bb.y0 : H * 0.22) * 0.85, 50);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-10 * DEG);

    // 1. 轨道椭圆：多普勒非对称发光 (接近观察者侧明显增强)
    const arcSteps = 48;
    for (let i = 0; i < arcSteps; i++) {
      const a0 = (i / arcSteps) * TAU;
      const a1 = ((i + 1) / arcSteps) * TAU;
      // cos(a0) < 0 为左侧 (接近侧，多普勒增强)
      const doppler = 0.5 - 0.5 * Math.cos(a0);
      const segAlpha = a * (0.2 + doppler * 0.65);

      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, a0, a1);
      ctx.strokeStyle = doppler > 0.5 ? sc.accent : sc.sub;
      ctx.lineWidth = 1 + doppler * 1.5;
      ctx.globalAlpha = segAlpha;
      ctx.stroke();
    }

    // 2. 相对论光子流颗粒 (高速环绕流带)
    const photonCount = 6;
    for (let k = 0; k < photonCount; k++) {
      const pProg = (env.lt * 0.65 + k / photonCount) % 1;
      const pAng = pProg * TAU;
      const doppler = 0.5 - 0.5 * Math.cos(pAng);
      const px = Math.cos(pAng) * rx;
      const py = Math.sin(pAng) * ry;

      env.circle(px, py, 2.5 + doppler * 1.5, sc.accent, null, 0, a * (0.4 + doppler * 0.6), false);
    }

    ctx.restore();
  }
}, PK);

/* ============================================================
   9. DECOR: collapsar_horizon_division — 视界居中分隔标尺 (Front Layer)
   黑洞视界面引力虚空中轴线、中心微型奇异点与上下双向遥测数据流
   ============================================================ */
J.register('decor', 'collapsar_horizon_division', {
  name: '视界居中分隔标尺',
  tags: ['editorial', 'calm', 'graphic'],
  vibes: ['collapsar'],
  vibeExclusive: true,
  layer: 'front',
  draw(env, bb, P) {
    const { W, H, sc } = env;
    const a = inOut(env);
    if (a <= 0.005) return;

    const cx = W / 2;
    const cy = bb ? bb.cy : H / 2;
    const halfH = Math.min(H * 0.42, 380);

    // 中心微型奇点
    env.circle(cx, cy, 4, sc.accent, null, 0, a * 0.95, false);
    env.circle(cx, cy, 12, null, sc.sub, 1, a * 0.6, false);

    // 视界垂直中轴细刻度线
    env.line([[cx, cy - halfH], [cx, cy - 22]], sc.sub, 1, a * 0.45, false);
    env.line([[cx, cy + 22], [cx, cy + halfH]], sc.sub, 1, a * 0.45, false);

    // 上下端点刻度短横线
    const tickW = 12;
    env.line([[cx - tickW, cy - halfH], [cx + tickW, cy - halfH]], sc.sub, 1.2, a * 0.6, false);
    env.line([[cx - tickW, cy + halfH], [cx + tickW, cy + halfH]], sc.sub, 1.2, a * 0.6, false);

    // 顶部与底部天体物理遥测数据
    env.draw({
      text: `EVENT HORIZON AXIS // TC: ${J.fmtTime ? J.fmtTime(env.t) : '00:00.00'} // [SEC #${String(env.cut.index + 1).padStart(2, '0')}]`,
      font: monoF(env),
      size: Math.max(8.5, H * 0.011),
      x: cx,
      y: cy - halfH - 10,
      align: 'center',
      track: 0.12,
      color: sc.sub,
      alpha: a * 0.75,
      ghost: false
    });

    env.draw({
      text: 'SCHWARZSCHILD DIVISION // G = 6.6743e-11 // M = 14.8 M☉',
      font: monoF(env),
      size: Math.max(8.5, H * 0.011),
      x: cx,
      y: cy + halfH + 16,
      align: 'center',
      track: 0.12,
      color: sc.sub,
      alpha: a * 0.75,
      ghost: false
    });
  }
}, PK);

/* ============================================================
   10. TREAT: collapsar_doppler_redshift — 引力红移色散
   相对论多普勒与引力频移产生的微蓝移前缘与深红频散阴影
   ============================================================ */
J.register('treat', 'collapsar_doppler_redshift', {
  name: '引力红移色散',
  tags: ['graphic', 'glitch', 'editorial'],
  vibes: ['collapsar'],
  vibeExclusive: true,
  apply(env, it, P) {
    const sc = env.sc;
    it.shadow = {
      color: sc.accent || '#E0600C',
      blur: it.size * 0.32,
      dx: 0,
      dy: 0,
      a: 0.85
    };
    it.echo = {
      n: 2,
      dx: -2.5,
      dy: 1.5,
      color: sc.accent2 || sc.ghostA || '#16F4D4',
      alpha: 0.65
    };
  }
}, PK);

/* ============================================================
   11. ENTER: collapsar_singularity_collapse — 奇点坍缩入场
   字符由大尺度向心引力弹射吸入，伴随角速度加速收缩就位
   ============================================================ */
J.register('enter', 'collapsar_singularity_collapse', {
  name: '奇点坍缩',
  tags: ['glitch', 'graphic', 'pop'],
  vibes: ['collapsar'],
  vibeExclusive: true,
  apply(env, it, p) {
    it.charFns.push((i, g, n) => {
      const d = n > 1 ? (i / (n - 1)) * 0.28 : 0;
      const prog = J.clamp((p - d) / 0.72);
      if (prog <= 0) return { hide: true };
      const ep = E.outExpo(prog);
      const kk = 1 - ep;
      const angle = (i / Math.max(1, n)) * TAU + kk * 2.5;
      const dist = kk * it.size * 2.2;
      return {
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        s: J.lerp(1.8, 1, ep),
        rot: kk * (i % 2 === 0 ? 30 : -30),
        a: J.clamp(prog * 3.5)
      };
    });
  }
}, PK);

/* ============================================================
   12. EXIT: collapsar_supernova_burst — 超新星爆发退场
   引力失衡爆发，字形沿径向高速喷散光子化消失
   ============================================================ */
J.register('exit', 'collapsar_supernova_burst', {
  name: '超新星退场',
  tags: ['glitch', 'graphic'],
  vibes: ['collapsar'],
  vibeExclusive: true,
  apply(env, it, p) {
    it.charFns.push((i, g, n) => {
      const d = n > 1 ? (i / (n - 1)) * 0.2 : 0;
      const prog = J.clamp((p - d) / 0.8);
      const ep = E.inExpo(prog);
      const angle = (i / Math.max(1, n)) * TAU;
      const dist = ep * it.size * 3.5;
      return {
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        s: J.lerp(1, 0.2, ep),
        rot: J.rs(it.seed || 1, i, 9) * 45 * ep,
        a: 1 - ep
      };
    });
  }
}, PK);

/* ============================================================
   13. BG: collapsar_deep_singularity — 深空引力视界背景
   全屏深空背景：引力透镜弯曲星图、微波背景辐射噪点与中心视界暗区
   ============================================================ */
J.register('bg', 'collapsar_deep_singularity', {
  name: '深空引力视界',
  tags: ['calm', 'emotional', 'graphic'],
  vibes: ['collapsar'],
  vibeExclusive: true,
  plan: rng => ({ seed: rng.int(1, 1e9), rotSpd: rng.range(0.06, 0.12) }),
  draw(env, P) {
    const { W, H, sc, ctx } = env;
    const cx = W / 2, cy = H / 2;
    const baseR = Math.min(W, H) * 0.38;

    ctx.save();
    // 1. 视界深空背景径向渐变
    const gBg = ctx.createRadialGradient(cx, cy, baseR * 0.2, cx, cy, Math.hypot(W, H) * 0.6);
    gBg.addColorStop(0, '#000000');
    gBg.addColorStop(0.5, sc.bg || '#060607');
    gBg.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = gBg;
    ctx.fillRect(0, 0, W, H);

    // 2. 引力透镜弯折的恒星场
    const s = P.seed || 8888;
    const stars = 64;
    const rot = env.lt * (P.rotSpd || 0.08);

    for (let k = 0; k < stars; k++) {
      const origDist = J.rr(baseR * 0.45, Math.hypot(W, H) * 0.5, s, k, 1);
      const origAng = J.r(s, k, 2) * TAU + rot;
      const lensDist = origDist * (1 + 0.18 * Math.sin(origAng * 2));
      const px = cx + Math.cos(origAng) * lensDist;
      const py = cy + Math.sin(origAng) * lensDist;
      const size = J.rr(1.0, 2.8, s, k, 3);
      const starAlpha = 0.3 + 0.5 * Math.sin(env.lt * 4 + k);

      env.circle(px, py, size, k % 3 === 0 ? sc.accent : sc.fg, null, 0, starAlpha * 0.65, false);
    }

    // 3. 施瓦西视界暗核
    env.circle(cx, cy, baseR * 0.35, '#000000', sc.sub, 1, 0.8, false);

    ctx.restore();
  }
}, PK);

/* ============================================================
   COLLAPSAR AUDIO-REACTIVE SUITE (坍缩星专属音频可视化套件)
   包含黑洞铃宕波形、吸积多普勒环谱、极轴等离子柱、潮汐面条化、视界声潮
   ============================================================ */

const getAudioPulse = (env) => {
  const energy = env.energy != null ? env.energy : 0.65;
  let beatHit = 0;
  if (env.beat && env.beat.since != null) {
    beatHit = Math.exp(-env.beat.since * 14) * (0.6 + energy * 0.4);
  } else {
    const fauxBeat = (env.lt * 2.133) % 1;
    beatHit = Math.exp(-fauxBeat * 14) * 0.8;
  }
  return { energy, beatHit, total: Math.min(1.5, energy * 0.7 + beatHit * 0.8) };
};

/* ============================================================
   14. DECOR: collapsar_audio_ringdown — 黑洞铃宕波形 (Audio Reactive)
   引力波黑洞碰撞时空铃宕波形 (LIGO Quasi-Normal Modes Chirp)
   时空应变振幅随音频瞬态啁啾震荡，重拍触发铃宕指数衰减
   ============================================================ */
J.register('decor', 'collapsar_audio_ringdown', {
  name: '黑洞铃宕波形',
  tags: ['graphic', 'glitch', 'editorial'],
  vibes: ['collapsar', 'audio_vis'],
  vibeExclusive: true,
  layer: 'front',
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;

    const { energy, beatHit } = getAudioPulse(env);
    const yBase = bb ? Math.min(H * 0.9, bb.y1 + H * 0.08) : H * 0.82;
    const wSpan = Math.min(W * 0.82, 840);
    const x0 = (W - wSpan) / 2;
    const x1 = x0 + wSpan;
    const maxStrainH = H * 0.12 * (1 + beatHit * 0.8);

    ctx.save();

    // 1. 应变边界参考虚线 (+h_max / -h_max)
    ctx.setLineDash([6, 6]);
    env.line([[x0, yBase - maxStrainH * 0.8], [x1, yBase - maxStrainH * 0.8]], sc.sub, 1, a * 0.25, false);
    env.line([[x0, yBase + maxStrainH * 0.8], [x1, yBase + maxStrainH * 0.8]], sc.sub, 1, a * 0.25, false);
    ctx.setLineDash([]);
    env.line([[x0, yBase], [x1, yBase]], sc.sub, 1, a * 0.45, false);

    // 2. 引力波铃宕波形多谐波采样
    const segments = 80;
    const pts = [];
    const tPhase = env.lt * 12;

    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      const px = x0 + u * wSpan;

      const centerU = 0.65;
      const distToCenter = Math.abs(u - centerU);

      const envelope = Math.exp(-distToCenter * (u < centerU ? 4 : 8));
      const freq = 16 + (1 - distToCenter) * 36;
      const wave = Math.sin(u * freq - tPhase) * 0.7 + Math.sin(u * freq * 1.8 + tPhase * 1.5) * 0.3;
      const noise = (Math.sin(env.lt * 35 + i * 2) * 0.15) * energy;

      const strainY = yBase - (wave + noise) * envelope * maxStrainH * (0.4 + energy * 0.6 + beatHit * 0.8);
      pts.push([px, strainY]);
    }

    // 多阶光晕描边
    env.line(pts, sc.accent || '#00E5FF', 2.2, a * 0.9, false);
    env.line(pts, '#FFFFFF', 1.0, a * Math.min(1, 0.4 + beatHit * 0.6), false);

    // 并合中心点星芒闪烁
    const chirpX = x0 + 0.65 * wSpan;
    if (beatHit > 0.35) {
      drawStarFlare(ctx, chirpX, yBase, 18 * beatHit, sc.accent, null, 0, a * beatHit * 0.8);
    }

    // 3. 科学刻度与天体物理遥测数据
    env.draw({
      text: '+h_max [1.0e-21]',
      font: monoF(env),
      size: 9,
      x: x0 - 8,
      y: yBase - maxStrainH * 0.8,
      align: 'right',
      color: sc.sub,
      alpha: a * 0.65,
      ghost: false
    });
    env.draw({
      text: '-h_max',
      font: monoF(env),
      size: 9,
      x: x0 - 8,
      y: yBase + maxStrainH * 0.8,
      align: 'right',
      color: sc.sub,
      alpha: a * 0.65,
      ghost: false
    });
    env.draw({
      text: `GW RINGDOWN // f_QNM ≈ ${(240 + energy * 60).toFixed(0)}Hz // DAMPING τ = 4.2ms // CHIRP MASS M_c = 30.4 M☉`,
      font: monoF(env),
      size: Math.max(9, H * 0.012),
      x: x0,
      y: yBase + maxStrainH * 0.8 + 14,
      align: 'left',
      track: 0.08,
      color: sc.sub,
      alpha: a * 0.75,
      ghost: false
    });

    ctx.restore();
  }
}, PK);

/* ============================================================
   15. DECOR: collapsar_audio_accretion_disc — 吸积多普勒环谱 (Audio Reactive)
   相对论吸积盘 64 段多普勒频移环谱：近端强多普勒增亮蓝移、远端红移暗化
   ============================================================ */
J.register('decor', 'collapsar_audio_accretion_disc', {
  name: '吸积多普勒环谱',
  tags: ['graphic', 'pop', 'glitch'],
  vibes: ['collapsar', 'audio_vis'],
  vibeExclusive: true,
  layer: 'back',
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;

    const { energy, beatHit } = getAudioPulse(env);
    const cx = bb ? bb.cx : W / 2;
    const cy = bb ? bb.cy : H / 2;
    const rx = Math.min(W * 0.45, 520);
    const ry = rx * 0.38;
    const barCount = 64;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-14 * DEG);

    // 1. 视界中心施瓦西暗核
    env.circle(0, 0, ry * 0.45, '#000000', sc.sub, 1, a * 0.95, false);

    // 2. 64 段相对论吸积辐射牙齿 / 光谱柱
    for (let i = 0; i < barCount; i++) {
      const ang = (i / barCount) * TAU + env.lt * 0.25;
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);

      const doppler = Math.pow(0.55 - 0.45 * cosA, 2.2);

      const u = i / (barCount - 1);
      const freqAmp = Math.sin(u * Math.PI) * 0.7 + Math.cos(u * 12 + env.lt * 8) * 0.3;
      const barH = J.clamp((freqAmp * energy * 1.2 + beatHit * 0.8) * (H * 0.09) * doppler * a, 3, H * 0.14);

      const xInner = cosA * (rx * 0.52);
      const yInner = sinA * (ry * 0.52);
      const xOuter = cosA * (rx * 0.52 + barH);
      const yOuter = sinA * (ry * 0.52 + barH);

      const isApproaching = cosA < 0;
      const col = isApproaching ? (sc.accent || '#00E5FF') : sc.sub;
      const lineAlpha = a * J.clamp(0.2 + doppler * 0.75 + beatHit * 0.3, 0.1, 1);

      ctx.beginPath();
      ctx.moveTo(xInner, yInner);
      ctx.lineTo(xOuter, yOuter);
      ctx.strokeStyle = col;
      ctx.lineWidth = isApproaching ? 2.0 : 1.0;
      ctx.globalAlpha = lineAlpha;
      ctx.stroke();

      if (isApproaching && i % 3 === 0 && beatHit > 0.3) {
        env.circle(xOuter, yOuter, 2.5, '#FFFFFF', null, 0, a * beatHit * 0.9, false);
      }
    }

    // 3. 重拍时的引力爱因斯坦环扩散波
    if (beatHit > 0.1) {
      const ringRx = rx * (0.65 + (1 - beatHit) * 0.4);
      const ringRy = ry * (0.65 + (1 - beatHit) * 0.4);
      ctx.beginPath();
      ctx.ellipse(0, 0, ringRx, ringRy, 0, 0, TAU);
      ctx.strokeStyle = sc.accent || '#00E5FF';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = a * beatHit * 0.65;
      ctx.stroke();
    }

    // 4. 吸积率与多普勒遥测参数
    env.draw({
      text: 'ACCRETION DOPPLER DISK // BEAMING FACTOR: δ^3.5 // M_DOT = 0.84 M_EDD',
      font: monoF(env),
      size: Math.max(8.5, H * 0.011),
      x: 0,
      y: ry * 1.45,
      align: 'center',
      track: 0.1,
      color: sc.sub,
      alpha: a * 0.75,
      ghost: false
    });

    ctx.restore();
  }
}, PK);

/* ============================================================
   16. DECOR: collapsar_audio_polar_jet — 极轴脉冲等离子柱 (Audio Reactive)
   相对论极轴喷流示波：音量与重音驱动等离子喷流伸缩与激波钻石暴闪
   ============================================================ */
J.register('decor', 'collapsar_audio_polar_jet', {
  name: '极轴脉冲等离子柱',
  tags: ['graphic', 'pop', 'glitch'],
  vibes: ['collapsar', 'audio_vis'],
  vibeExclusive: true,
  layer: 'back',
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;

    const { energy, beatHit } = getAudioPulse(env);
    const cx = bb ? bb.cx : W / 2;
    const cy = bb ? bb.cy : H / 2;
    const maxJetLen = Math.min(H * 0.48, 450);
    const curJetLen = maxJetLen * J.clamp(0.45 + energy * 0.4 + beatHit * 0.35, 0.35, 1.15);
    const tilt = 14 * DEG;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tilt);

    for (const dir of [-1, 1]) {
      // 1. 核心高能极光柱
      ctx.beginPath();
      ctx.strokeStyle = sc.accent || '#FFFFFF';
      ctx.lineWidth = 2.4 + beatHit * 2.0;
      ctx.globalAlpha = a * (0.7 + beatHit * 0.3);
      ctx.moveTo(0, dir * 16);
      ctx.lineTo(0, dir * curJetLen);
      ctx.stroke();

      // 2. 磁螺旋谐波线 (Helical Coils)
      ctx.beginPath();
      ctx.strokeStyle = sc.sub;
      ctx.lineWidth = 1;
      ctx.globalAlpha = a * 0.45;
      const steps = 40;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const ly = dir * (16 + u * (curJetLen - 16));
        const helixR = (6 + u * 28) * (1 + beatHit * 0.4);
        const amp = helixR * Math.sin(u * TAU * 4 - env.lt * 20);
        if (i === 0) ctx.moveTo(amp, ly);
        else ctx.lineTo(amp, ly);
      }
      ctx.stroke();

      // 3. 激波钻石节点 (Mach Shock Diamonds)
      const numDiamonds = 4;
      for (let k = 1; k <= numDiamonds; k++) {
        const du = k / (numDiamonds + 0.5);
        const dy = dir * (16 + du * (curJetLen - 16));
        const diamondR = (5 + k * 2.5) * (1 + beatHit * 0.6);

        ctx.beginPath();
        ctx.moveTo(0, dy - diamondR * dir);
        ctx.lineTo(diamondR * 0.65, dy);
        ctx.lineTo(0, dy + diamondR * dir);
        ctx.lineTo(-diamondR * 0.65, dy);
        ctx.closePath();
        ctx.fillStyle = k === 1 && beatHit > 0.3 ? '#FFFFFF' : sc.accent;
        ctx.globalAlpha = a * (0.6 + beatHit * 0.4);
        ctx.fill();

        if (beatHit > 0.45 && k <= 2) {
          drawStarFlare(ctx, 0, dy, diamondR * 2.2, '#FFFFFF', null, 0, a * beatHit * 0.7);
        }
      }
    }

    env.draw({
      text: 'RELATIVISTIC POLAR BEAM // SHOCK DIAMONDS: ACTIVE // γ = 28',
      font: monoF(env),
      size: Math.max(8.5, H * 0.011),
      x: 16,
      y: -curJetLen * 0.9,
      align: 'left',
      track: 0.1,
      color: sc.sub,
      alpha: a * 0.75,
      ghost: false
    });

    ctx.restore();
  }
}, PK);

/* ============================================================
   17. HOLD: collapsar_audio_spaghettification — 潮汐面条化 (Audio Reactive)
   强引力潮汐撕裂面条化：重音瞬间字形沿径向剧烈拉长，伴随引力红移
   ============================================================ */
J.register('hold', 'collapsar_audio_spaghettification', {
  name: '潮汐面条化',
  tags: ['glitch', 'pop', 'graphic'],
  vibes: ['collapsar', 'audio_vis'],
  vibeExclusive: true,
  apply(env, it, amt) {
    const { energy, beatHit } = getAudioPulse(env);
    const stretchY = beatHit * 0.32 * amt;
    const compressX = beatHit * 0.18 * amt;

    it.sy = (it.sy || 1) * (1 + stretchY);
    it.sx = (it.sx || 1) * (1 - compressX);

    const sc = env.sc;
    it.shadow = {
      color: beatHit > 0.35 ? (sc.accent || '#FF3300') : (sc.sub || '#555555'),
      blur: it.size * (0.25 + beatHit * 0.35),
      dx: 0,
      dy: 0,
      a: Math.min(1, 0.6 + beatHit * 0.4)
    };

    it.charFns.push((i, g, n) => {
      const mid = (n - 1) / 2;
      const distFromCenter = Math.abs(i - mid);
      const tidalY = Math.sign(i - mid || 1) * Math.sin(env.lt * 10 + i) * 6 * beatHit * amt;
      return {
        dy: tidalY,
        dx: (Math.random() - 0.5) * 3 * beatHit * amt,
        s: 1 + (distFromCenter / Math.max(1, mid)) * beatHit * 0.12 * amt
      };
    });
  }
}, PK);

/* ============================================================
   18. BG: collapsar_audio_horizon_tide — 视界声潮深渊 (Audio Reactive)
   全屏深空背景：引力视界爱因斯坦环与引力透镜随音频能量潮汐起伏
   ============================================================ */
J.register('bg', 'collapsar_audio_horizon_tide', {
  name: '视界声潮深渊',
  tags: ['calm', 'emotional', 'graphic'],
  vibes: ['collapsar', 'audio_vis'],
  vibeExclusive: true,
  plan: rng => ({ seed: rng.int(1, 1e9), rotSpd: rng.range(0.04, 0.08) }),
  draw(env, P) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;

    const { energy, beatHit } = getAudioPulse(env);
    const cx = W / 2, cy = H / 2;
    const baseR = Math.min(W, H) * 0.36;
    const tidalR = baseR * (1 + beatHit * 0.12 + energy * 0.06);

    ctx.save();

    // 1. 视界深空背景径向渐变
    const gBg = ctx.createRadialGradient(cx, cy, tidalR * 0.3, cx, cy, Math.hypot(W, H) * 0.65);
    gBg.addColorStop(0, '#000000');
    gBg.addColorStop(0.45, sc.bg || '#060607');
    gBg.addColorStop(1, 'rgba(0,0,0,0.92)');
    ctx.fillStyle = gBg;
    ctx.fillRect(0, 0, W, H);

    // 2. 引力透镜弯折的恒星场：重拍时产生爱因斯坦弧形拉伸
    const s = P.seed || 9999;
    const stars = 72;
    const rot = env.lt * (P.rotSpd || 0.05);

    for (let k = 0; k < stars; k++) {
      const origDist = J.rr(tidalR * 0.48, Math.hypot(W, H) * 0.52, s, k, 1);
      const origAng = J.r(s, k, 2) * TAU + rot;
      const lensArc = (1 + 0.22 * Math.sin(origAng * 2) + beatHit * 0.2);
      const px = cx + Math.cos(origAng) * (origDist * lensArc);
      const py = cy + Math.sin(origAng) * (origDist * lensArc);
      const starSize = J.rr(1.0, 2.8, s, k, 3) * (1 + beatHit * 0.3);
      const starAlpha = 0.35 + 0.45 * Math.sin(env.lt * 4 + k);

      env.circle(px, py, starSize, k % 3 === 0 ? sc.accent : sc.fg, null, 0, starAlpha * a * 0.75, false);
    }

    // 3. 相对论光子球环 (Photon Sphere Ring)
    const photonR = tidalR * 0.52;
    env.circle(cx, cy, photonR, null, sc.accent || '#00E5FF', 1.5 + beatHit * 1.5, a * (0.6 + beatHit * 0.4), false);

    // 4. 施瓦西视界暗核 (绝对黑暗深渊)
    env.circle(cx, cy, photonR * 0.88, '#000000', sc.sub, 1, a * 0.98, false);

    // 5. 视界动力学底部科学水印
    env.draw({
      text: 'HORIZON TIDE // AREA THEOREM: ΔA_H ≥ 0 // TIDAL RESPONSE: ACTIVE',
      font: monoF(env),
      size: Math.max(8.5, H * 0.011),
      x: cx,
      y: H * 0.94,
      align: 'center',
      track: 0.12,
      color: sc.sub,
      alpha: a * 0.65,
      ghost: false
    });

    ctx.restore();
  }
}, PK);

})();
