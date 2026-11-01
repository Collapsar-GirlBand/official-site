/* ============================================================
   JIZURA — Audio Visualization Suite (音频可视化部件套件)
   专属风格标签: audio_vis
   ============================================================ */
(() => {
'use strict';

const PK = 'audiovis';
const TAU = Math.PI * 2;
const monoF = env => J.FONTS?.helvetica_mono ? 'helvetica_mono' : (env.st?.fonts?.mono?.[0] || 'mono_square');
const inOut = env => {
  const t = env.lt, dur = env.dur || (env.cut ? env.cut.dur : 3);
  const inDur = env.inDur || 0.25, outDur = env.outDur || 0.25;
  const aIn = t < inDur ? t / Math.max(0.01, inDur) : 1;
  const aOut = (dur - t) < outDur ? Math.max(0, (dur - t) / Math.max(0.01, outDur)) : 1;
  return Math.max(0, Math.min(1, aIn * aOut));
};

// 获取实时音频能量 (0.0 ~ 1.0) 及重拍脉冲强度
const getAudioPulse = (env) => {
  const energy = env.energy != null ? env.energy : 0.65;
  let beatHit = 0;
  if (env.beat && env.beat.since != null) {
    // 距上一个重音的时间衰减
    beatHit = Math.exp(-env.beat.since * 14) * (0.6 + energy * 0.4);
  } else {
    // 无音频文件时的节拍模拟 (基于时间与 128 BPM)
    const fauxBeat = (env.lt * 2.133) % 1;
    beatHit = Math.exp(-fauxBeat * 14) * 0.8;
  }
  return { energy, beatHit, total: Math.min(1.5, energy * 0.7 + beatHit * 0.8) };
};

/* ============================================================
   1. DECOR: audio_vis_spectrum — 柱状均衡器频谱 (Equalizer Bars)
   32 段高动态跳动均衡器柱条，带瞬态峰值浮动停留点 (Peak Hold)
   ============================================================ */
J.register('decor', 'audio_vis_spectrum', {
  name: '柱状频谱',
  tags: ['graphic', 'pop', 'glitch'],
  vibes: ['audio_vis'],
  vibeExclusive: true,
  layer: 'front',
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;

    const { energy, beatHit } = getAudioPulse(env);
    const yBase = bb ? Math.min(H * 0.92, bb.y1 + H * 0.08) : H * 0.86;
    const numBars = 32;
    const barW = Math.max(3, Math.min(14, (W * 0.78) / (numBars * 1.5)));
    const gap = barW * 0.5;
    const totalW = numBars * barW + (numBars - 1) * gap;
    const x0 = (W - totalW) / 2;
    const maxBarH = H * 0.16;

    ctx.save();
    for (let i = 0; i < numBars; i++) {
      const u = i / (numBars - 1);
      const bx = x0 + i * (barW + gap);

      // 频段曲线模拟：低频饱满、中高频细节颤动
      const freqWeight = Math.sin(u * Math.PI) * 0.85 + (1 - u) * 0.45;
      const noise = Math.abs(Math.sin(env.lt * 18 + i * 1.6) * 0.35 + Math.cos(env.lt * 32 - i * 0.8) * 0.25);
      const hNorm = J.clamp((freqWeight * energy + noise * 0.5 + beatHit * (i < 10 ? 0.6 : 0.2)) * a, 0.04, 1.0);
      const curH = hNorm * maxBarH;

      // 频谱柱体渐变
      const grad = ctx.createLinearGradient(0, yBase, 0, yBase - curH);
      grad.addColorStop(0, J.rgba(sc.sub, a * 0.4));
      grad.addColorStop(0.7, J.rgba(sc.accent || '#00E5FF', a * 0.85));
      grad.addColorStop(1, '#FFFFFF');

      ctx.fillStyle = grad;
      ctx.fillRect(bx, yBase - curH, barW, curH);

      // 瞬态峰值悬停点 (Peak Hold Indicator)
      const peakOff = (Math.sin(env.lt * 4 + i) * 0.5 + 0.5) * 6;
      const peakY = yBase - curH - 3 - peakOff;
      ctx.fillStyle = sc.accent || '#00E5FF';
      ctx.globalAlpha = a * 0.9;
      ctx.fillRect(bx, peakY, barW, 2);
    }

    // 底部基准线与频率标注
    env.line([[x0 - 10, yBase + 1], [x0 + totalW + 10, yBase + 1]], sc.sub, 1, a * 0.45, false);
    env.draw({ text: '20Hz', font: monoF(env), size: 9, x: x0, y: yBase + 12, align: 'left', color: sc.sub, alpha: a * 0.65, ghost: false });
    env.draw({ text: '1kHz', font: monoF(env), size: 9, x: W / 2, y: yBase + 12, align: 'center', color: sc.sub, alpha: a * 0.65, ghost: false });
    env.draw({ text: '20kHz', font: monoF(env), size: 9, x: x0 + totalW, y: yBase + 12, align: 'right', color: sc.sub, alpha: a * 0.65, ghost: false });

    ctx.restore();
  }
}, PK);

/* ============================================================
   2. DECOR: audio_vis_circular_pulse — 环形辐射脉冲 (Trap Nation Ring)
   中心环形向外发射的声波频谱振幅，随重拍向外扩散冲击光环
   ============================================================ */
J.register('decor', 'audio_vis_circular_pulse', {
  name: '环形脉冲',
  tags: ['graphic', 'pop', 'glitch'],
  vibes: ['audio_vis'],
  vibeExclusive: true,
  layer: 'back',
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;

    const { energy, beatHit } = getAudioPulse(env);
    const cx = bb ? bb.cx : W / 2;
    const cy = bb ? bb.cy : H / 2;
    const baseR = Math.min(W, H) * 0.28 * (1 + beatHit * 0.08);
    const barCount = 64;

    ctx.save();
    // 冲击波扩散环
    const waveR = baseR * (1.1 + (env.lt * 2.5 % 1) * 0.6);
    const waveA = a * (1 - (env.lt * 2.5 % 1)) * (0.3 + beatHit * 0.6);
    env.circle(cx, cy, waveR, null, sc.accent || '#00E5FF', 1.5, waveA, false);

    // 核心内环
    env.circle(cx, cy, baseR, null, sc.sub, 1.2, a * 0.5, false);

    // 360° 辐射射线频谱
    for (let i = 0; i < barCount; i++) {
      const ang = (i / barCount) * TAU + env.lt * 0.15;
      const noise = Math.abs(Math.sin(env.lt * 20 + i * 2.2) * 0.5 + Math.cos(env.lt * 12 - i) * 0.5);
      const amp = (noise * 0.4 + energy * 0.4 + beatHit * 0.6) * (H * 0.09) * a;

      const x0 = cx + Math.cos(ang) * baseR;
      const y0 = cy + Math.sin(ang) * baseR;
      const x1 = cx + Math.cos(ang) * (baseR + amp);
      const y1 = cy + Math.sin(ang) * (baseR + amp);

      env.line([[x0, y0], [x1, y1]], i % 4 === 0 ? sc.accent : sc.sub, i % 4 === 0 ? 2 : 1, a * 0.8, false);
    }
    ctx.restore();
  }
}, PK);

/* ============================================================
   3. DECOR: audio_vis_pulsar_ridge — 脉冲星山脊叠线 (Joy Division Topo)
   经典 Unknown Pleasures 风格：20 层由近及远堆叠的地形等高线，
   利用 Canvas 实体背景遮挡算法实现真正的 3D 浮雕声浪
   ============================================================ */
J.register('decor', 'audio_vis_pulsar_ridge', {
  name: '脉冲山脊',
  tags: ['graphic', 'editorial', 'calm'],
  vibes: ['audio_vis'],
  vibeExclusive: true,
  layer: 'back',
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;

    const { energy, beatHit } = getAudioPulse(env);
    const numLines = 20;
    const wSpan = Math.min(W * 0.74, 760);
    const x0 = (W - wSpan) / 2;
    const yTop = bb ? Math.max(H * 0.15, bb.y0 - H * 0.28) : H * 0.24;
    const yBot = bb ? Math.min(H * 0.88, bb.y1 + H * 0.22) : H * 0.76;
    const yStep = (yBot - yTop) / (numLines - 1);
    const segments = 64;

    ctx.save();
    // 由远及近依次绘制（从上往下），前面的遮挡后面的
    for (let l = 0; l < numLines; l++) {
      const yBase = yTop + l * yStep;
      const phaseOffset = env.lt * 4 + l * 0.4;

      ctx.beginPath();
      ctx.moveTo(x0, yBase);

      for (let s = 0; s <= segments; s++) {
        const u = s / segments;
        const px = x0 + u * wSpan;
        // 中间高斯钟形加权，两端平缓
        const bell = Math.exp(-Math.pow((u - 0.5) / 0.22, 2));
        const wave1 = Math.sin(u * 14 + phaseOffset) * 0.6;
        const wave2 = Math.cos(u * 28 - phaseOffset * 1.4) * 0.4;
        const noise = (Math.sin(l * 3.7 + u * 20) * 0.5 + 0.5);
        const amp = (wave1 + wave2 + noise) * bell * (H * 0.08) * (energy * 0.7 + beatHit * 0.8) * a;
        ctx.lineTo(px, yBase - amp);
      }

      ctx.lineTo(x0 + wSpan, yBase + yStep * 1.5);
      ctx.lineTo(x0, yBase + yStep * 1.5);
      ctx.closePath();

      // 遮挡下层线条
      ctx.fillStyle = sc.bg;
      ctx.fill();

      // 重新描边脊线
      ctx.beginPath();
      ctx.moveTo(x0, yBase);
      for (let s = 0; s <= segments; s++) {
        const u = s / segments;
        const px = x0 + u * wSpan;
        const bell = Math.exp(-Math.pow((u - 0.5) / 0.22, 2));
        const wave1 = Math.sin(u * 14 + phaseOffset) * 0.6;
        const wave2 = Math.cos(u * 28 - phaseOffset * 1.4) * 0.4;
        const noise = (Math.sin(l * 3.7 + u * 20) * 0.5 + 0.5);
        const amp = (wave1 + wave2 + noise) * bell * (H * 0.08) * (energy * 0.7 + beatHit * 0.8) * a;
        ctx.lineTo(px, yBase - amp);
      }
      ctx.strokeStyle = l % 4 === 0 ? sc.accent : sc.sub;
      ctx.lineWidth = l % 4 === 0 ? 1.4 : 0.85;
      ctx.globalAlpha = a * (0.4 + (l / numLines) * 0.55);
      ctx.stroke();
    }
    ctx.restore();
  }
}, PK);

/* ============================================================
   4. DECOR: audio_vis_lissajous — 李萨如向量示波环 (Lissajous CRT)
   模拟双通道示波器 XY 相位图：平滑的谐波扭结与磷光余辉
   ============================================================ */
J.register('decor', 'audio_vis_lissajous', {
  name: '李萨如示波环',
  tags: ['graphic', 'glitch', 'pop'],
  vibes: ['audio_vis'],
  vibeExclusive: true,
  layer: 'back',
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;

    const { energy, beatHit } = getAudioPulse(env);
    const cx = bb ? bb.cx : W / 2;
    const cy = bb ? bb.cy : H / 2;
    const rx = Math.min(W, H) * 0.32 * (1 + beatHit * 0.06);
    const ry = rx * 0.75;
    const steps = 180;
    const freqA = 3;
    const freqB = 2;
    const phase = env.lt * 1.8 + energy * 2.2;

    ctx.save();
    // 示波器外圈微弱刻度标尺
    env.circle(cx, cy, rx * 1.15, null, sc.sub, 1, a * 0.25, false);

    // 磷光发光多阶线条
    const passes = [
      { width: 4.5, alpha: 0.18, color: sc.accent || '#00E5FF' },
      { width: 2.2, alpha: 0.55, color: sc.accent || '#00E5FF' },
      { width: 1.0, alpha: 0.95, color: '#FFFFFF' }
    ];

    passes.forEach(pass => {
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const u = (i / steps) * TAU;
        // 李萨如参数方程
        const x = cx + Math.sin(freqA * u + phase) * rx;
        const y = cy + Math.sin(freqB * u) * ry;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = pass.color;
      ctx.lineWidth = pass.width;
      ctx.globalAlpha = a * pass.alpha * (0.6 + energy * 0.4);
      ctx.stroke();
    });

    // 示波器网格十字线与刻度读数
    env.line([[cx - rx * 1.1, cy], [cx + rx * 1.1, cy]], sc.sub, 1, a * 0.2, false);
    env.line([[cx, cy - ry * 1.1], [cx, cy + ry * 1.1]], sc.sub, 1, a * 0.2, false);
    env.draw({ text: 'CH1: X-AXIS // CH2: Y-AXIS // PHASE: ' + (phase % TAU).toFixed(2) + ' rad', font: monoF(env), size: 9, x: cx, y: cy + ry * 1.25, align: 'center', color: sc.sub, alpha: a * 0.65, ghost: false });

    ctx.restore();
  }
}, PK);

/* ============================================================
   5. DECOR: audio_vis_ascii_matrix — 池田亮司字符声流 (ASCII Data Stream)
   密集的等宽声音数据矩阵，十六进制编码与密度字符随瞬态重音瞬闪
   ============================================================ */
J.register('decor', 'audio_vis_ascii_matrix', {
  name: '字符声流',
  tags: ['editorial', 'graphic', 'glitch'],
  vibes: ['audio_vis'],
  vibeExclusive: true,
  layer: 'back',
  draw(env, bb, P) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;

    const { energy, beatHit } = getAudioPulse(env);
    const chars = ' .:|!I01#@$%&*';
    const cols = 28, rows = 8;
    const cellW = Math.min(W * 0.8, 640) / cols;
    const cellH = 14;
    const x0 = (W - cols * cellW) / 2;
    const y0 = bb ? Math.max(H * 0.12, bb.y0 - rows * cellH - 10) : H * 0.16;

    ctx.save();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = x0 + c * cellW;
        const py = y0 + r * cellH;
        const n = Math.sin(c * 1.3 + r * 2.8 + env.lt * 12) * 0.5 + 0.5;
        const charVal = J.clamp(n * energy + beatHit * 0.6, 0, 1);
        const charIdx = Math.floor(charVal * (chars.length - 1));
        const ch = chars[charIdx];

        const isHighlight = charVal > 0.85;
        env.draw({
          text: ch,
          font: monoF(env),
          size: 11,
          x: px,
          y: py,
          align: 'left',
          color: isHighlight ? sc.accent : sc.sub,
          alpha: a * (isHighlight ? 0.95 : 0.35),
          ghost: false
        });
      }
    }
    ctx.restore();
  }
}, PK);

/* ============================================================
   6. HOLD: audio_vis_bass_pump — 低音共振泵感 (Bass Pump)
   文字随音乐低音底鼓（Kick）产生强有力的空气震荡放大与回弹
   ============================================================ */
J.register('hold', 'audio_vis_bass_pump', {
  name: '低音共振',
  tags: ['pop', 'graphic', 'glitch'],
  vibes: ['audio_vis'],
  vibeExclusive: true,
  apply(env, it, amt) {
    const { energy, beatHit } = getAudioPulse(env);
    // 鼓点瞬间猛烈放大，随后指数级衰减
    const pump = beatHit * 0.14 * amt * (1 + energy * 0.5);
    it.sx = (it.sx || 1) * (1 + pump);
    it.sy = (it.sy || 1) * (1 + pump * 0.85);

    // 伴随极微小的重音震颤
    if (beatHit > 0.4) {
      it.dx = (it.dx || 0) + (Math.random() - 0.5) * 6 * beatHit;
      it.dy = (it.dy || 0) + (Math.random() - 0.5) * 4 * beatHit;
    }
  }
}, PK);

/* ============================================================
   7. HOLD: audio_vis_kick_tracking — 鼓点字距炸开 (Dynamic Tracking)
   重音瞬间字间距（Letter Spacing）向两侧爆冲拉开，随后强阻尼吸附回弹
   ============================================================ */
J.register('hold', 'audio_vis_kick_tracking', {
  name: '鼓点字间距',
  tags: ['pop', 'graphic', 'editorial'],
  vibes: ['audio_vis'],
  vibeExclusive: true,
  apply(env, it, amt) {
    const { beatHit } = getAudioPulse(env);
    const extraTrack = beatHit * 0.22 * amt;
    it.track = (it.track || 0.04) + extraTrack;
    it.charFns.push((i, g, n) => {
      const mid = (n - 1) / 2;
      const dir = (i - mid);
      return {
        dx: dir * beatHit * 14 * amt,
        dy: (Math.random() - 0.5) * beatHit * 2 * amt
      };
    });
  }
}, PK);

/* ============================================================
   8. TREAT: audio_vis_energy_bloom — 能量感光辉光 (Dynamic Bloom)
   文字周围的霓虹外发光强度与当前音频振幅实时联动
   ============================================================ */
J.register('treat', 'audio_vis_energy_bloom', {
  name: '声能辉光',
  tags: ['pop', 'emotional', 'graphic'],
  vibes: ['audio_vis'],
  vibeExclusive: true,
  apply(env, it, P) {
    const sc = env.sc;
    const { energy, beatHit } = getAudioPulse(env);
    const intensity = J.clamp(energy * 0.6 + beatHit * 0.8, 0.2, 1.4);

    it.shadow = {
      color: sc.accent || '#00E5FF',
      blur: it.size * (0.2 + intensity * 0.35),
      dx: 0,
      dy: 0,
      a: Math.min(1, 0.5 + intensity * 0.5)
    };
    it.echo = {
      n: intensity > 0.8 ? 2 : 1,
      dx: 1.5 * intensity,
      dy: 1.0 * intensity,
      color: '#FFFFFF',
      alpha: 0.6 * intensity
    };
  }
}, PK);

/* ============================================================
   9. BG: audio_vis_soundfield — 反应式声场粒子流 (Soundfield Grid)
   背景暗光网格点阵，在重音到来时如声波排开般向四周涌动
   ============================================================ */
J.register('bg', 'audio_vis_soundfield', {
  name: '声场点阵',
  tags: ['graphic', 'calm', 'pop'],
  vibes: ['audio_vis'],
  vibeExclusive: true,
  draw(env, P) {
    const { W, H, sc, ctx } = env;
    const a = inOut(env);
    if (a <= 0.005) return;

    const { energy, beatHit } = getAudioPulse(env);
    const rows = 12, cols = 20;
    const stepX = W / cols, stepY = H / rows;

    ctx.save();
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const cx = c * stepX;
        const cy = r * stepY;
        const dist = Math.hypot(cx - W / 2, cy - H / 2);
        const wave = Math.sin(dist * 0.015 - env.lt * 6 + beatHit * 2);
        const radius = Math.max(1, (1.5 + wave * 1.5 + beatHit * 2.5) * a);

        ctx.fillStyle = wave > 0.4 ? (sc.accent || '#00E5FF') : sc.sub;
        ctx.globalAlpha = J.clamp((0.2 + (wave + 1) * 0.25 + beatHit * 0.4) * a, 0, 0.85);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}, PK);

})();
