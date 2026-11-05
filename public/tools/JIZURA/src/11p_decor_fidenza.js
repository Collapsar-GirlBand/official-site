/* ============================================================
   JIZURA pack: decor_fidenza (流場の成長・フィデンツァ)
   Directly ported and adapted from Tyler Hobbs' "Fidenza" Generative Art Algorithm.
   Leverages the decoupled J.GROW infrastructure (src/07b_grow_core.js).
   Unified Master Harmonic Flow Field Engine & Style Presets
   ============================================================ */
(() => {
'use strict';

const PK = 'decorGrow';
const E = J.E;
const TAU = J.TAU;

// Import J.GROW infrastructure
const {
  makeRng, createField, createRunner
} = J.GROW;

/* ------------------------------------------------------------
   1. Continuous 2D Harmonic Flow Field (Angle Field Generator)
   ------------------------------------------------------------ */
function createFlowField(rng, W, H) {
  const scale = rng.range(0.0016, 0.0028);
  const ox = rng.range(0, 1000), oy = rng.range(0, 1000);
  const f1 = rng.range(0.8, 1.3), f2 = rng.range(0.8, 1.3);
  const rot = rng.range(0, TAU);
  const cosR = Math.cos(rot), sinR = Math.sin(rot);
  const turbulence = rng.range(1.6, 2.6);

  return function getAngle(x, y) {
    const rx = (x * cosR - y * sinR) * scale + ox;
    const ry = (x * sinR + y * cosR) * scale + oy;
    const a1 = Math.sin(rx * f1) * Math.cos(ry * f2);
    const a2 = Math.sin(rx * 1.9 - ry * 1.5) * 0.42;
    const a3 = Math.cos(rx * 0.7 + ry * 2.2) * 0.22;
    return (a1 + a2 + a3) * Math.PI * turbulence;
  };
}

/* ------------------------------------------------------------
   2. Fidenza Spatial Collision Grid Engine (Occupancy Grid)
   ------------------------------------------------------------ */
function createCollisionGrid(W, H, cellSize = 14) {
  const cols = Math.ceil(W / cellSize) + 2;
  const rows = Math.ceil(H / cellSize) + 2;
  const grid = new Uint8Array(cols * rows);

  return {
    cell: cellSize,
    cols, rows, grid,
    isColliding(x, y, radius) {
      const c0 = Math.max(0, Math.floor((x - radius) / cellSize));
      const c1 = Math.min(cols - 1, Math.floor((x + radius) / cellSize));
      const r0 = Math.max(0, Math.floor((y - radius) / cellSize));
      const r1 = Math.min(rows - 1, Math.floor((y + radius) / cellSize));
      const r2 = radius * radius;

      for (let r = r0; r <= r1; r++) {
        const rowOff = r * cols;
        for (let c = c0; c <= c1; c++) {
          if (grid[rowOff + c] === 1) {
            const cx = (c + 0.5) * cellSize, cy = (r + 0.5) * cellSize;
            const dx = cx - x, dy = cy - y;
            if (dx * dx + dy * dy <= r2 + cellSize * cellSize * 0.5) {
              return true;
            }
          }
        }
      }
      return false;
    },
    markOccupied(x, y, radius) {
      const c0 = Math.max(0, Math.floor((x - radius) / cellSize));
      const c1 = Math.min(cols - 1, Math.floor((x + radius) / cellSize));
      const r0 = Math.max(0, Math.floor((y - radius) / cellSize));
      const r1 = Math.min(rows - 1, Math.floor((y + radius) / cellSize));
      const r2 = radius * radius;

      for (let r = r0; r <= r1; r++) {
        const rowOff = r * cols;
        for (let c = c0; c <= c1; c++) {
          const cx = (c + 0.5) * cellSize, cy = (r + 0.5) * cellSize;
          const dx = cx - x, dy = cy - y;
          if (dx * dx + dy * dy <= r2 + cellSize * cellSize * 0.4) {
            grid[rowOff + c] = 1;
          }
        }
      }
    }
  };
}

/* ------------------------------------------------------------
   3. Path Sampling Helper
   ------------------------------------------------------------ */
function samplePathAt(path, dists, d) {
  if (d <= 0) return path[0];
  const last = dists.length - 1;
  if (d >= dists[last]) return path[last];

  let low = 0, high = last;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (dists[mid] < d) low = mid + 1;
    else high = mid - 1;
  }
  const i = Math.max(1, low);
  const p0 = path[i - 1], p1 = path[i];
  const d0 = dists[i - 1], d1 = dists[i];
  const t = d1 > d0 ? (d - d0) / (d1 - d0) : 0;
  return [J.lerp(p0[0], p1[0], t), J.lerp(p0[1], p1[1], t)];
}

/* ------------------------------------------------------------
   4. Fidenza Skeleton Generator (Hierarchical Ribbon Packing)
   ------------------------------------------------------------ */
function buildFidenzaSkeleton(env, bb0, P, field, rng) {
  const { W, H } = env;
  const D = J.clamp(P.density ?? 1, 0.4, 1.8);
  const minDim = Math.min(W, H);

  // Flow Field and Collision Grid
  const getAngle = createFlowField(rng, W, H);
  const cellSize = Math.max(10, Math.round(minDim * 0.016));
  const colGrid = createCollisionGrid(W, H, cellSize);

  // Pre-mark Text Box in collision grid
  if (field.avoidText && field.safeBB) {
    const sbb = field.safeBB;
    const pad = 12;
    for (let y = sbb.y0 - pad; y <= sbb.y1 + pad; y += cellSize) {
      for (let x = sbb.x0 - pad; x <= sbb.x1 + pad; x += cellSize) {
        colGrid.markOccupied(x, y, cellSize);
      }
    }
  }

  // Pre-mark User Exclusion Zones
  if (field.eraseZones && Array.isArray(field.eraseZones)) {
    for (const ez of field.eraseZones) {
      const cx = ez.cx ?? ez.x ?? 0, cy = ez.cy ?? ez.y ?? 0, r = ez.r ?? ez.radius ?? 50;
      colGrid.markOccupied(cx, cy, r);
    }
  }

  // Ribbon Candidates with Width Tiers (Macro / Medium / Micro)
  const targetCount = Math.floor(rng.range(32, 54) * D);
  const candidates = [];

  for (let i = 0; i < targetCount; i++) {
    const roll = rng.u();
    let width, tier, maxSteps;
    if (roll < 0.16) {
      width = rng.range(minDim * 0.038, minDim * 0.056);
      tier = 'macro';
      maxSteps = rng.int(28, 52);
    } else if (roll < 0.65) {
      width = rng.range(minDim * 0.016, minDim * 0.028);
      tier = 'medium';
      maxSteps = rng.int(45, 80);
    } else {
      width = rng.range(minDim * 0.005, minDim * 0.010);
      tier = 'micro';
      maxSteps = rng.int(60, 110);
    }
    candidates.push({ tier, width, maxSteps, index: i });
  }

  candidates.sort((a, b) => b.width - a.width);

  const ribbons = [];
  const stepLen = Math.max(6, Math.round(minDim * 0.012));
  const bufferGap = Math.max(2, minDim * 0.0035);

  for (let c = 0; c < candidates.length; c++) {
    const cand = candidates[c];
    const width = cand.width;
    const radius = width / 2;

    let seedX = 0, seedY = 0, foundValidSeed = false;
    for (let trial = 0; trial < 16; trial++) {
      if (trial < 5 && rng.chance(0.65)) {
        const hole = field.findMaxHole(radius + bufferGap);
        if (hole) { seedX = hole.x; seedY = hole.y; }
        else { seedX = rng.range(W * 0.08, W * 0.92); seedY = rng.range(H * 0.08, H * 0.92); }
      } else {
        seedX = rng.range(W * 0.06, W * 0.94);
        seedY = rng.range(H * 0.06, H * 0.94);
      }

      if (field.isInsideInclusion(seedX, seedY) &&
          (!field.avoidText || field.isClearOfText(seedX, seedY)) &&
          !colGrid.isColliding(seedX, seedY, radius + bufferGap)) {
        foundValidSeed = true;
        break;
      }
    }

    if (!foundValidSeed) continue;

    const path = [[seedX, seedY]];
    colGrid.markOccupied(seedX, seedY, radius);
    field.eraseDisc(seedX, seedY, radius, 1.0);

    let curX = seedX, curY = seedY;
    for (let step = 0; step < cand.maxSteps; step++) {
      const ang = getAngle(curX, curY);
      const nx = curX + Math.cos(ang) * stepLen;
      const ny = curY + Math.sin(ang) * stepLen;

      if (nx < width || nx > W - width || ny < width || ny > H - width) break;
      if (!field.isInsideInclusion(nx, ny)) break;
      if (field.avoidText && !field.isClearOfText(nx, ny)) break;
      if (colGrid.isColliding(nx, ny, radius + bufferGap)) break;

      colGrid.markOccupied(nx, ny, radius);
      field.eraseDisc(nx, ny, radius, 1.0);
      path.push([nx, ny]);
      curX = nx;
      curY = ny;
    }

    if (path.length < 4) continue;

    const dists = [0];
    let totalLen = 0;
    for (let i = 1; i < path.length; i++) {
      totalLen += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
      dists.push(totalLen);
    }
    if (totalLen < width * 2) continue;

    // Mosaic block subdivision
    const segments = [];
    const targetSegLen = cand.tier === 'macro'
      ? width * rng.range(1.2, 2.4)
      : (cand.tier === 'medium' ? width * rng.range(1.8, 3.6) : width * rng.range(3.5, 6.8));
    const jointGap = Math.min(2.5, width * 0.12);

    let curDist = 0;
    let segIdx = 0;
    while (curDist < totalLen) {
      const segLen = targetSegLen * rng.range(0.85, 1.25);
      const startDist = curDist + (segIdx > 0 ? jointGap : 0);
      const endDist = Math.min(totalLen, curDist + segLen);
      if (endDist - startDist < width * 0.4) break;

      const cRoll = rng.u();
      let colorType = 0;
      if (cRoll < 0.45) colorType = 0;
      else if (cRoll < 0.72) colorType = 1;
      else if (cRoll < 0.88) colorType = 2;
      else if (cRoll < 0.95) colorType = 3;
      else colorType = 4;

      segments.push({
        startDist, endDist,
        colorType
      });

      curDist += segLen;
      segIdx++;
    }

    ribbons.push({
      path, dists, totalLen, width, tier: cand.tier, segments,
      atStart: rng.range(0, 0.28),
      atSpan: rng.range(0.48, 0.68)
    });
  }

  return { ribbons, field };
}

/* ============================================================
   5. Rendering Styles (Ribbon Mosaic / Minimal Lines)
   ============================================================ */
const FIDENZA_STYLES = {
  // 5.1 Ribbon Mosaic Blocks
  ribbon(ctx, skel, pGrowth, pAlpha, env, P, ramp) {
    const { sc } = env;
    const palette = [
      ramp(0.25),
      sc.accent || '#ff5722',
      sc.accent2 || ramp(0.68),
      sc.dim || 'rgba(255, 255, 255, 0.45)',
      '#ffffff'
    ];

    ctx.save();
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';

    for (let rIdx = 0; rIdx < skel.ribbons.length; rIdx++) {
      const r = skel.ribbons[rIdx];
      if (pGrowth < r.atStart) continue;

      const progress = J.clamp((pGrowth - r.atStart) / r.atSpan);
      if (progress <= 0) continue;

      const visibleDist = r.totalLen * progress;
      ctx.lineWidth = r.width;

      for (let sIdx = 0; sIdx < r.segments.length; sIdx++) {
        const seg = r.segments[sIdx];
        if (visibleDist <= seg.startDist) break;

        const curEndDist = Math.min(visibleDist, seg.endDist);
        if (curEndDist <= seg.startDist) continue;

        const pStart = samplePathAt(r.path, r.dists, seg.startDist);
        const pEnd = samplePathAt(r.path, r.dists, curEndDist);

        ctx.beginPath();
        ctx.moveTo(pStart[0], pStart[1]);

        for (let i = 0; i < r.path.length; i++) {
          const d = r.dists[i];
          if (d > seg.startDist && d < curEndDist) {
            ctx.lineTo(r.path[i][0], r.path[i][1]);
          }
        }
        ctx.lineTo(pEnd[0], pEnd[1]);

        const col = palette[seg.colorType];
        ctx.strokeStyle = col;
        ctx.stroke();

        if (r.width > 7) {
          ctx.beginPath();
          ctx.arc(pStart[0], pStart[1], r.width * 0.46, 0, TAU);
          ctx.fillStyle = col;
          ctx.fill();
        }
      }
    }

    if (P.debugField && skel.field) skel.field.debugDraw(ctx);
    ctx.restore();
  },

  // 5.2 Delicate Minimal Lines
  line(ctx, skel, pGrowth, pAlpha, env, P, ramp) {
    const { sc, W, H } = env;
    const baseCol = P.accent ? sc.accent : (sc.ink || sc.fg);
    const lineW = Math.max(1.2, Math.min(W, H) * 0.002);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let rIdx = 0; rIdx < skel.ribbons.length; rIdx++) {
      const r = skel.ribbons[rIdx];
      if (pGrowth < r.atStart) continue;

      const progress = J.clamp((pGrowth - r.atStart) / r.atSpan);
      if (progress <= 0) continue;

      const visibleDist = r.totalLen * progress;
      const pStart = r.path[0];
      const pEnd = samplePathAt(r.path, r.dists, visibleDist);

      ctx.beginPath();
      ctx.moveTo(pStart[0], pStart[1]);

      for (let i = 1; i < r.path.length; i++) {
        if (r.dists[i] < visibleDist) {
          ctx.lineTo(r.path[i][0], r.path[i][1]);
        } else {
          break;
        }
      }
      ctx.lineTo(pEnd[0], pEnd[1]);

      ctx.strokeStyle = r.tier === 'macro' ? baseCol : (r.tier === 'medium' ? ramp(0.55) : ramp(0.85));
      ctx.lineWidth = r.tier === 'macro' ? lineW * 2.2 : (r.tier === 'medium' ? lineW * 1.4 : lineW);
      ctx.stroke();
    }

    if (P.debugField && skel.field) skel.field.debugDraw(ctx);
    ctx.restore();
  },

  // 5.3 Luminous Aurora Curtain Ribbons (極光天幕帯流)
  aurora(ctx, skel, pGrowth, pAlpha, env, P, ramp) {
    const { sc, W, H } = env;
    const emerald = '#00ffb4';
    const violet = '#b042ff';
    const cyan = '#4deeea';

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';

    const breath = Math.sin((env.ltb || 0) * Math.PI * 1.5) * 0.15 + 0.85;

    for (let rIdx = 0; rIdx < skel.ribbons.length; rIdx++) {
      const r = skel.ribbons[rIdx];
      if (pGrowth < r.atStart) continue;

      const progress = J.clamp((pGrowth - r.atStart) / r.atSpan);
      if (progress <= 0) continue;

      const visibleDist = r.totalLen * progress;
      const pStart = r.path[0];
      const pEnd = samplePathAt(r.path, r.dists, visibleDist);

      ctx.beginPath();
      ctx.moveTo(pStart[0], pStart[1]);
      for (let i = 1; i < r.path.length; i++) {
        if (r.dists[i] < visibleDist) ctx.lineTo(r.path[i][0], r.path[i][1]);
        else break;
      }
      ctx.lineTo(pEnd[0], pEnd[1]);

      const baseCol = rIdx % 3 === 0 ? emerald : (rIdx % 3 === 1 ? cyan : violet);
      ctx.strokeStyle = J.rgba(baseCol, pAlpha * 0.55 * breath);
      ctx.lineWidth = Math.max(10, r.width * 1.6);
      ctx.shadowColor = baseCol;
      ctx.shadowBlur = 20;
      ctx.stroke();

      // Sharp core
      ctx.lineWidth = Math.max(2, r.width * 0.32);
      ctx.strokeStyle = J.rgba('#ffffff', pAlpha * 0.82 * breath);
      ctx.stroke();
    }

    if (P.debugField && skel.field) skel.field.debugDraw(ctx);
    ctx.restore();
  }
};

/* Unified Runner Builder for Fidenza Variations */
function makeFidenzaRunner(style, name, tags, defaultParams = {}, presets = {}) {
  return createRunner({
    name,
    tags,
    themeMode: 'fidenza_' + style,
    params: Object.assign({ density: 1.0, preset: 'default', style }, defaultParams),
    presets: Object.assign({
      default: { density: 1.0 },
      dense: { density: 1.5 },
      sparse: { density: 0.5 },
      corner_bl: { anchor: 'bottom-left' },
      corner_br: { anchor: 'bottom-right' },
      center: { anchor: 'center' }
    }, presets),
    build(env, bb0, P, field, rng) {
      return buildFidenzaSkeleton(env, bb0, P, field, rng);
    },
    render(ctx, skel, pGrowth, pAlpha, env, P, ramp) {
      const renderFn = FIDENZA_STYLES[P.style || style] || FIDENZA_STYLES.ribbon;
      renderFn(ctx, skel, pGrowth, pAlpha, env, P, ramp);
    }
  }, { growthSpeed: style === 'line' ? 0.90 : 0.88, ease: E.outCubic });
}

/* ============================================================
   6. Registration into JIZURA (2 Distinct UI Cards)
   ============================================================ */
const DEF = {};

/* 6.1 【流場の成長・フィデンツァ】(Flow Field Ribbons) */
DEF.grow_fidenza = makeFidenzaRunner('ribbon', '流場の成長・フィデンツァ', ['生长', 'fidenza', 'flow', 'graphic', 'editorial', 'pop'], {}, {
  default: { density: 1.0 },
  turbulent: { density: 1.5 },
  laminar: { density: 0.8 },
  macro_bold: { density: 0.9 },
  pop_palette: { density: 1.2 },
  corner_bl: { anchor: 'bottom-left' },
  corner_br: { anchor: 'bottom-right' },
  center: { anchor: 'center' }
});

/* 6.2 【流場の成長・細線画】(Flow Field Minimal Lines) */
DEF.grow_fidenza_line = makeFidenzaRunner('line', '流場の成長・細線画', ['生长', 'fidenza', 'flow', 'calm', 'minimal', 'line'], {}, {
  default: { density: 1.0 },
  hairline: { density: 1.8 },
  contour: { density: 1.2 },
  neon: { density: 1.0 },
  corner_bl: { anchor: 'bottom-left' },
  corner_br: { anchor: 'bottom-right' },
  center: { anchor: 'center' }
});

/* 6.3 【極光の成長・天幕帯流】(Aurora Borealis Ribbons) */
DEF.grow_aurora = makeFidenzaRunner('aurora', '極光の成長・天幕帯流', ['生长', 'aurora', 'flow', 'calm', 'nature', 'cyber', 'editorial'], {}, {
  default: { density: 1.0 },
  green_curtain: { density: 1.4 },
  violet_storm: { density: 1.6, anchor: 'top-center' },
  serene: { density: 0.6 },
  center: { anchor: 'center' },
  corner_bl: { anchor: 'bottom-left' }
});

for (const k of Object.keys(DEF)) {
  DEF[k].grow = true;
  DEF[k].set = 'grow';
  if (!DEF[k].vibes) DEF[k].vibes = [];
  if (!DEF[k].vibes.includes('grow')) DEF[k].vibes.push('grow');
  if (!DEF[k].tags) DEF[k].tags = [];
  if (!DEF[k].tags.includes('生长')) DEF[k].tags.unshift('生长');
  J.register('decor', k, DEF[k], PK);
}

})();
