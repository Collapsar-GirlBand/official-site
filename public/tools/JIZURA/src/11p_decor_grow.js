/* ============================================================
   JIZURA pack: decor_grow (生长)
   Directly ported and adapted from:
   https://github.com/kevinraymond/florilegium
   Copyright (c) 2026 Kevin Raymond (MIT License)

   And Inconvergent Hyphae (菌丝 / 根系分支形态发生算法)
   Adapted from: https://github.com/inconvergent/hyphae_ani
   Copyright (c) Anders Hoff (inconvergent)

   Leverages the decoupled J.GROW infrastructure (src/07b_grow_core.js)
   Consolidated Master Generative Engines & Unified Runner Presets
   ============================================================ */
(() => {
'use strict';

const PK = 'decorGrow';
const E = J.E;
const DEG = J.DEG, TAU = J.TAU;

// Import decoupled growth infrastructure
const {
  makeRng, norm2, makeToneRamp, makeFbm1,
  bezierHead, branchPath, createField, createRunner,
  renderTaperedBuckets, CACHE: GROW_CACHE
} = J.GROW;

/* ============================================================
   1. Adaptive Greedy Space-Filling Engine (Florilegium / Wong 1998)
   Now powered by decoupled GrowthField
   ============================================================ */
function buildGrowthSkeleton(env, bb, P, themeMode = 'flora') {
  const { W, H } = env;
  const rng = makeRng(P.seed || env.cut?.seed || 42);
  const D = J.clamp(P.density ?? 1, 0.1, 1.8);

  // 1. Create decoupled growth field (handles text avoidance & user regions)
  const field = createField(env, bb, P, { themeMode });
  const { rootX, rootY, targetY, sideX } = field.getRootAndTarget();
  const safeBB = field.safeBB;
  const avoidText = field.avoidText;

  // 2. Main Swaying Stem (with lateral text avoidance clamping)
  const stemPts = [];
  const fbm = makeFbm1(rng, 2);
  const nSegs = 20;
  const baseAmp = field.activeRects.length > 0
    ? (field.activeRects[0][2] - field.activeRects[0][0]) * 0.15
    : (safeBB.x0 > W * 0.4 ? safeBB.x0 * 0.35 : (W - safeBB.x1) * 0.35);
  const amp = baseAmp * (P.ampRatio ?? 1.0);

  const rightSide = sideX > 0;

  for (let i = 0; i <= nSegs; i++) {
    const t = i / nSegs;
    const sy = J.lerp(rootY, targetY, t);
    const drift = amp * fbm(t * 3.5);
    let sx = rootX + (rightSide ? -1 : 1) * Math.abs(drift) * Math.sin(t * Math.PI);
    if (avoidText) {
      if (!rightSide && sx > safeBB.x0 - 20) sx = safeBB.x0 - 20;
      if (rightSide && sx < safeBB.x1 + 20) sx = safeBB.x1 + 20;
    }
    stemPts.push([sx, sy]);
    field.eraseDisc(sx, sy, 16, 1.0);
  }

  // 3. Leaves along the stem nodes (alternating sides)
  const leaves = [];
  if (P.leaves !== false && P.leafRatio !== 0) {
    const leafStep = (P.leafRatio && P.leafRatio > 1.4) ? 1 : 2;
    let side = rng.chance(0.5) ? 1 : -1;
    for (let i = 2; i < stemPts.length - 2; i += leafStep) {
      side = -side;
      const p = stemPts[i], q = stemPts[i + 1];
      const [tx, ty] = norm2(q[0] - p[0], q[1] - p[1]);
      const ang = Math.atan2(ty, tx) + side * rng.range(38, 55) * DEG;
      const len = rng.range(22, 38) * Math.min(1.4, D) * (P.leafScale ?? 1.0);
      leaves.push({
        x: p[0], y: p[1],
        ang, len, side,
        at: i / stemPts.length
      });
      field.eraseDisc(p[0] + Math.cos(ang) * len * 0.5, p[1] + Math.sin(ang) * len * 0.5, len * 0.4, 0.85);
    }
  }

  // 4. Greedy Branching Loop (Wong et al. 1998)
  const branches = [];
  const motifs = [];
  const flowerRatio = P.flowerRatio ?? 1.0;
  const maxBranches = P.branches != null ? P.branches : Math.floor(6 * D * flowerRatio);
  const stemAnchors = [];
  for (let i = 1; i < stemPts.length - 1; i++) {
    const [tx, ty] = norm2(stemPts[i + 1][0] - stemPts[i - 1][0], stemPts[i + 1][1] - stemPts[i - 1][1]);
    stemAnchors.push({ x: stemPts[i][0], y: stemPts[i][1], tx, ty, at: i / stemPts.length });
  }

  const debugDiscs = [];

  for (let b = 0; b < maxBranches; b++) {
    const hole = field.findMaxHole(25);
    if (!hole) break;

    const bx = hole.x, by = hole.y, bestDist = hole.dist;

    let nearest = null, minDist = 1e9;
    for (const st of stemAnchors) {
      const d = Math.hypot(st.x - bx, st.y - by);
      if (d < minDist) { minDist = d; nearest = st; }
    }
    if (!nearest) break;

    const [dx, dy] = norm2(bx - nearest.x, by - nearest.y);
    const [ax, ay] = norm2(dx, dy + 0.3); // upright bias
    const bCurve = branchPath(rng, nearest.x, nearest.y, nearest.tx, nearest.ty, bx, by, ax, ay);
    const mRadius = Math.min(bestDist * 0.9, 32) * (P.motifScale ?? 1.0);

    branches.push({ curve: bCurve, at: nearest.at + 0.15 });
    if (flowerRatio > 0 && !P.heroOnly) {
      motifs.push({
        x: bx, y: by,
        ang: Math.atan2(ay, ax),
        radius: mRadius,
        at: Math.min(0.95, nearest.at + 0.35),
        kind: b === 0 ? 'flower' : (rng.chance(0.5) ? 'lily' : 'bud')
      });
    }

    debugDiscs.push({ x: bx, y: by, r: mRadius });
    field.eraseDisc(bx, by, mRadius, 0.85);
  }

  // 5. Terminal Flower atop the stem
  if (stemPts.length >= 2 && flowerRatio > 0) {
    const lastStem = stemPts[stemPts.length - 1];
    const prevStem = stemPts[stemPts.length - 2];
    const [termTx, termTy] = norm2(lastStem[0] - prevStem[0], lastStem[1] - prevStem[1]);
    motifs.push({
      x: lastStem[0] + termTx * 12,
      y: lastStem[1] + termTy * 12,
      ang: Math.atan2(termTy, termTx),
      radius: Math.min(36, field.pad * 0.9) * (P.motifScale ?? 1.0),
      at: 0.85,
      kind: 'hero'
    });
  }

  return { stemPts, leaves, branches, motifs, themeMode, field, debugDiscs };
}

/* ============================================================
   2. Vine Rendering Preset Map (Flora / Geometric / Cyber)
   ============================================================ */
const VINE_RENDERERS = {
  // 2.1 Botanical Flora (Antique Engraving Watercolor)
  flora(ctx, skel, pGrowth, pAlpha, env, P, ramp) {
    const { sc, W, H } = env;

    // Stem
    const nStemVisible = Math.max(2, Math.floor(skel.stemPts.length * J.clamp(pGrowth * 1.2)));
    ctx.beginPath();
    ctx.moveTo(skel.stemPts[0][0], skel.stemPts[0][1]);
    for (let i = 1; i < nStemVisible; i++) {
      ctx.lineTo(skel.stemPts[i][0], skel.stemPts[i][1]);
    }
    ctx.strokeStyle = ramp(0.12);
    ctx.lineWidth = Math.max(1.8, Math.min(W, H) * 0.0035);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Leaves
    for (const lf of skel.leaves) {
      if (pGrowth < lf.at) continue;
      const lProgress = E.outBack(J.clamp((pGrowth - lf.at) / 0.25), 1.4);
      if (lProgress <= 0) continue;

      ctx.save();
      ctx.translate(lf.x, lf.y);
      ctx.rotate(lf.ang);
      ctx.scale(lProgress, lProgress);

      const L = lf.len, W2 = L * 0.35;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(W2, L * 0.35, W2 * 0.8, L * 0.75, 0, L);
      ctx.bezierCurveTo(-W2 * 0.8, L * 0.75, -W2, L * 0.35, 0, 0);
      ctx.closePath();

      ctx.fillStyle = ramp(0.42);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, L * 0.85);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    }

    // Branches
    for (const br of skel.branches) {
      if (pGrowth < br.at) continue;
      const bProgress = E.outCubic(J.clamp((pGrowth - br.at) / 0.3));
      const head = bezierHead(br.curve[0], br.curve[1], br.curve[2], br.curve[3], bProgress);

      ctx.beginPath();
      ctx.moveTo(head[0][0], head[0][1]);
      ctx.bezierCurveTo(head[1][0], head[1][1], head[2][0], head[2][1], head[3][0], head[3][1]);
      ctx.strokeStyle = ramp(0.2);
      ctx.lineWidth = Math.max(1.2, ctx.lineWidth * 0.7);
      ctx.stroke();
    }

    // Flowers / Motifs
    for (const m of skel.motifs) {
      if (pGrowth < m.at) continue;
      const mProgress = E.outBack(J.clamp((pGrowth - m.at) / 0.28), 1.6);
      if (mProgress <= 0) continue;

      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.ang);
      ctx.scale(mProgress, mProgress);

      const R = m.radius;
      const nPetals = m.kind === 'hero' ? 8 : (m.kind === 'lily' ? 6 : 5);
      for (let k = 0; k < nPetals; k++) {
        const a = (k / nPetals) * TAU;
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(R * 0.3, R * 0.4, R * 0.25, R * 0.8, 0, R);
        ctx.bezierCurveTo(-R * 0.25, R * 0.8, -R * 0.3, R * 0.4, 0, 0);
        ctx.closePath();
        ctx.fillStyle = k % 2 === 0 ? ramp(0.35) : ramp(0.55);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, R * 0.15);
        ctx.lineTo(0, R * 0.75);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      ctx.beginPath();
      ctx.arc(0, 0, R * 0.22, 0, TAU);
      ctx.fillStyle = P.accent ? sc.accent : ramp(0.08);
      ctx.fill();

      ctx.restore();
    }

    if (P.debugField && skel.field) skel.field.debugDraw(ctx);
  },

  // 2.2 Geometric Polygon Flora (Origami Facets)
  geometric(ctx, skel, pGrowth, pAlpha, env, P, ramp) {
    const { sc, W, H } = env;
    const baseCol = P.accent ? sc.accent : (sc.fg || '#FFFFFF');

    // Mitered straight segment stem
    const nPts = skel.stemPts.length;
    const visibleCount = Math.max(2, Math.floor(nPts * J.clamp(pGrowth * 1.2)));
    ctx.beginPath();
    ctx.moveTo(skel.stemPts[0][0], skel.stemPts[0][1]);
    for (let i = 1; i < visibleCount; i += 2) {
      ctx.lineTo(skel.stemPts[i][0], skel.stemPts[i][1]);
    }
    ctx.strokeStyle = baseCol;
    ctx.lineWidth = Math.max(2, Math.min(W, H) * 0.003);
    ctx.stroke();

    // Kite Leaves with light and dark facets
    for (const lf of skel.leaves) {
      if (pGrowth < lf.at) continue;
      const lProg = E.outExpo(J.clamp((pGrowth - lf.at) / 0.2));
      if (lProg <= 0) continue;

      ctx.save();
      ctx.translate(lf.x, lf.y);
      ctx.rotate(lf.ang);
      ctx.scale(lProg, lProg);

      const L = lf.len * 1.1, W2 = L * 0.38;
      // Light facet
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(W2, L * 0.45); ctx.lineTo(0, L); ctx.closePath();
      ctx.fillStyle = J.rgba(baseCol, 0.45);
      ctx.fill();

      // Dark facet
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(-W2, L * 0.45); ctx.lineTo(0, L); ctx.closePath();
      ctx.fillStyle = J.rgba(baseCol, 0.85);
      ctx.fill();

      // Center seam
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, L);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    }

    // Branches with mitered straight paths
    for (const br of skel.branches) {
      if (pGrowth < br.at) continue;
      const bProg = E.outCubic(J.clamp((pGrowth - br.at) / 0.28));
      const p0 = br.curve[0], p3 = br.curve[3];
      const mid = [J.lerp(p0[0], p3[0], 0.5), J.lerp(p0[1], p3[1], 0.2)];

      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1]);
      if (bProg > 0.5) {
        ctx.lineTo(mid[0], mid[1]);
        const t2 = (bProg - 0.5) * 2;
        ctx.lineTo(J.lerp(mid[0], p3[0], t2), J.lerp(mid[1], p3[1], t2));
      } else {
        ctx.lineTo(J.lerp(p0[0], mid[0], bProg * 2), J.lerp(p0[1], mid[1], bProg * 2));
      }
      ctx.strokeStyle = baseCol;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }

    // Rhombus Rosette Motifs
    for (const m of skel.motifs) {
      if (pGrowth < m.at) continue;
      const mProg = E.outBack(J.clamp((pGrowth - m.at) / 0.25), 1.5);
      if (mProg <= 0) continue;

      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.ang);
      ctx.scale(mProg, mProg);

      const R = m.radius * 0.95;
      const nRhombi = 6;
      for (let k = 0; k < nRhombi; k++) {
        const a = (k / nRhombi) * TAU;
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(R * 0.25, R * 0.5);
        ctx.lineTo(0, R);
        ctx.lineTo(-R * 0.25, R * 0.5);
        ctx.closePath();
        ctx.fillStyle = k % 2 === 0 ? J.rgba(baseCol, 0.9) : J.rgba(baseCol, 0.5);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    }

    if (P.debugField && skel.field) skel.field.debugDraw(ctx);
  },

  // 2.3 Cyber Circuit Branching (Manhattan PCB Bus Lines)
  cyber(ctx, skel, pGrowth, pAlpha, env, P, ramp) {
    const { sc } = env;
    const neon = P.accent ? sc.accent : (sc.accent || '#00e5ff');
    const subTrace = sc.dim || 'rgba(0, 229, 255, 0.3)';

    // Manhattan bus lines
    const nPts = skel.stemPts.length;
    const maxIdx = Math.max(2, Math.floor(nPts * J.clamp(pGrowth * 1.2)));

    ctx.beginPath();
    ctx.moveTo(skel.stemPts[0][0], skel.stemPts[0][1]);
    for (let i = 1; i < maxIdx; i++) {
      const prev = skel.stemPts[i - 1], curr = skel.stemPts[i];
      const midY = (prev[1] + curr[1]) / 2;
      ctx.lineTo(prev[0], midY);
      ctx.lineTo(curr[0], curr[1]);
    }
    ctx.strokeStyle = neon;
    ctx.lineWidth = 2;
    ctx.shadowColor = neon;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Circuit Vias and Tap Nodes
    for (const lf of skel.leaves) {
      if (pGrowth < lf.at) continue;
      const p = E.outExpo(J.clamp((pGrowth - lf.at) / 0.2));
      const endX = lf.x + Math.cos(lf.ang) * lf.len * p;
      const endY = lf.y + Math.sin(lf.ang) * lf.len * p;

      ctx.beginPath();
      ctx.moveTo(lf.x, lf.y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = subTrace;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(endX, endY, 3, 0, TAU);
      ctx.fillStyle = neon;
      ctx.fill();
    }

    // Chip Pads (QFP/IC Blocks)
    for (const m of skel.motifs) {
      if (pGrowth < m.at) continue;
      const p = E.outBack(J.clamp((pGrowth - m.at) / 0.25), 1.6);
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.scale(p, p);

      const S = m.radius * 0.7;
      ctx.strokeStyle = neon;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-S / 2, -S / 2, S, S);

      ctx.fillStyle = J.rgba(neon, 0.2);
      ctx.fillRect(-S / 2, -S / 2, S, S);

      const pins = 3;
      for (let k = 0; k < pins; k++) {
        const off = (k - (pins - 1) / 2) * (S / (pins + 1));
        ctx.beginPath();
        ctx.moveTo(-S / 2 - 4, off); ctx.lineTo(-S / 2, off);
        ctx.moveTo(S / 2, off); ctx.lineTo(S / 2 + 4, off);
        ctx.moveTo(off, -S / 2 - 4); ctx.lineTo(off, -S / 2);
        ctx.moveTo(off, S / 2); ctx.lineTo(off, S / 2 + 4);
        ctx.strokeStyle = neon;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.restore();
    }

    if (P.debugField && skel.field) skel.field.debugDraw(ctx);
  },

  // 2.4 Frost Dendrite Crystal (氷霜の樹枝結晶)
  frost(ctx, skel, pGrowth, pAlpha, env, P, ramp) {
    const { sc, W, H } = env;
    const iceWhite = '#ffffff';
    const frostCyan = P.accent ? sc.accent : '#80deea';
    const u = Math.min(W, H) / 1080;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'miter';

    // 1. Crystalline Backbone
    const nPts = skel.stemPts.length;
    const maxIdx = Math.max(2, Math.floor(nPts * J.clamp(pGrowth * 1.2)));

    ctx.shadowColor = frostCyan;
    ctx.shadowBlur = Math.min(14, 10 * pGrowth);

    ctx.beginPath();
    ctx.moveTo(skel.stemPts[0][0], skel.stemPts[0][1]);
    for (let i = 1; i < maxIdx; i++) {
      ctx.lineTo(skel.stemPts[i][0], skel.stemPts[i][1]);
    }
    ctx.strokeStyle = iceWhite;
    ctx.lineWidth = Math.max(2.2, 3.2 * u);
    ctx.stroke();

    ctx.shadowBlur = 0;

    // 2. Frost Needles / Chevron Spines (Leaves)
    for (const lf of skel.leaves) {
      if (pGrowth < lf.at) continue;
      const prog = E.outExpo(J.clamp((pGrowth - lf.at) / 0.18));
      if (prog <= 0) continue;

      ctx.save();
      ctx.translate(lf.x, lf.y);
      ctx.rotate(lf.ang);
      ctx.scale(prog, prog);

      const L = lf.len * 1.2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, L);
      ctx.strokeStyle = frostCyan;
      ctx.lineWidth = Math.max(1.2, 1.8 * u);
      ctx.stroke();

      const subCount = 3;
      for (let s = 1; s <= subCount; s++) {
        const py = L * (s / (subCount + 1));
        const subLen = L * 0.28 * (1 - s / (subCount + 1));
        ctx.beginPath();
        ctx.moveTo(0, py); ctx.lineTo(subLen, py + subLen * 0.58);
        ctx.moveTo(0, py); ctx.lineTo(-subLen, py + subLen * 0.58);
        ctx.strokeStyle = J.rgba(iceWhite, 0.85);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    }

    // 3. Branches with sharp crystalline paths
    for (const br of skel.branches) {
      if (pGrowth < br.at) continue;
      const bProg = E.outCubic(J.clamp((pGrowth - br.at) / 0.25));
      const head = bezierHead(br.curve[0], br.curve[1], br.curve[2], br.curve[3], bProg);
      ctx.beginPath();
      ctx.moveTo(head[0][0], head[0][1]);
      ctx.lineTo(head[1][0], head[1][1]);
      ctx.lineTo(head[2][0], head[2][1]);
      ctx.lineTo(head[3][0], head[3][1]);
      ctx.strokeStyle = frostCyan;
      ctx.lineWidth = Math.max(1.4, 2.0 * u);
      ctx.stroke();
    }

    // 4. Hexagonal Snowflake Star Motifs
    for (const m of skel.motifs) {
      if (pGrowth < m.at) continue;
      const mProg = E.outBack(J.clamp((pGrowth - m.at) / 0.22), 1.5);
      if (mProg <= 0) continue;

      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.ang);
      ctx.scale(mProg, mProg);

      const R = m.radius * 1.1;
      const nArms = 6;
      for (let k = 0; k < nArms; k++) {
        const a = (k / nArms) * TAU;
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, R);
        ctx.strokeStyle = iceWhite;
        ctx.lineWidth = 1.4;
        ctx.stroke();

        const barbY = R * 0.6;
        const bLen = R * 0.32;
        ctx.beginPath();
        ctx.moveTo(0, barbY); ctx.lineTo(bLen * 0.866, barbY - bLen * 0.5);
        ctx.moveTo(0, barbY); ctx.lineTo(-bLen * 0.866, barbY - bLen * 0.5);
        ctx.strokeStyle = frostCyan;
        ctx.lineWidth = 1.0;
        ctx.stroke();
        ctx.restore();
      }

      ctx.beginPath();
      ctx.arc(0, 0, R * 0.22, 0, TAU);
      ctx.fillStyle = iceWhite;
      ctx.fill();

      ctx.restore();
    }

    if (P.debugField && skel.field) skel.field.debugDraw(ctx);
    ctx.restore();
  }
};

/* Unified Runner Builder for Vine Variations */
function makeVineRunner(mode, name, tags, defaultParams = {}, presets = {}) {
  return createRunner({
    name,
    tags,
    themeMode: 'grow_' + mode,
    params: Object.assign({ density: 1.0, preset: 'default', mode }, defaultParams),
    presets: Object.assign({
      default: { density: 1.0 },
      dense: { density: 1.5 },
      sparse: { density: 0.5 },
      corner_bl: { anchor: 'bottom-left' },
      corner_br: { anchor: 'bottom-right' },
      center: { anchor: 'center' }
    }, presets),
    build(env, bb0, P, field, rng) {
      return buildGrowthSkeleton(env, bb0, P, P.mode || mode);
    },
    render(ctx, skel, pGrowth, pAlpha, env, P, ramp) {
      const renderFn = VINE_RENDERERS[P.mode || mode] || VINE_RENDERERS.flora;
      renderFn(ctx, skel, pGrowth, pAlpha, env, P, ramp);
    }
  }, { growthSpeed: 0.85, ease: E.outCubic });
}

/* ============================================================
   3. Physarum Polycephalum Engine (Slime Mold Transport Network)
   Jeff Jones (2010), nicoptere/physarum & Sage Jenson
   ============================================================ */
function buildPhysarumSkeleton(env, bb0, P) {
  const { W, H } = env;
  const rng = makeRng(P.seed || env.cut?.seed || 2024);
  const D = J.clamp(P.density ?? 1, 0.2, 1.8);

  const field = createField(env, bb0, P, { themeMode: 'physarum' });
  const { rootX, rootY, targetX, targetY } = field.getRootAndTarget();
  const avoidText = field.avoidText;

  const cell = Math.max(9, Math.round(Math.min(W, H) * 0.012));
  const gw = Math.max(16, Math.floor(W / cell));
  const gh = Math.max(16, Math.floor(H / cell));
  const totalCells = gw * gh;
  const trail = new Float32Array(totalCells);
  const temp = new Float32Array(totalCells);

  const toGridX = px => Math.min(gw - 1, Math.max(0, Math.floor(px / cell)));
  const toGridY = py => Math.min(gh - 1, Math.max(0, Math.floor(py / cell)));

  const isObstacle = (gx, gy) => {
    const px = (gx + 0.5) * cell, py = (gy + 0.5) * cell;
    if (avoidText && !field.isClearOfText(px, py)) return true;
    if (!field.isInsideInclusion(px, py)) return true;
    return false;
  };

  const decay = J.clamp(P.decay ?? 0.93, 0.80, 0.98);
  const diffuse = () => {
    for (let y = 0; y < gh; y++) {
      const row = y * gw;
      for (let x = 0; x < gw; x++) {
        const xm = x > 0 ? x - 1 : x, xp = x < gw - 1 ? x + 1 : x;
        temp[row + x] = trail[row + xm] * 0.25 + trail[row + x] * 0.5 + trail[row + xp] * 0.25;
      }
    }
    for (let x = 0; x < gw; x++) {
      for (let y = 0; y < gh; y++) {
        const ym = y > 0 ? y - 1 : y, yp = y < gh - 1 ? y + 1 : y;
        trail[y * gw + x] = (temp[ym * gw + x] * 0.25 + temp[y * gw + x] * 0.5 + temp[yp * gw + x] * 0.25) * decay;
      }
    }
  };

  const nFoods = Math.floor(5 * D);
  for (let f = 0; f < nFoods; f++) {
    const hole = field.findMaxHole(25);
    if (hole) {
      const fgx = toGridX(hole.x), fgy = toGridY(hole.y);
      trail[fgy * gw + fgx] += 25.0;
      field.eraseDisc(hole.x, hole.y, hole.dist * 0.6);
    }
  }

  const nAgents = Math.floor(J.clamp(P.agents ?? 360, 100, 700) * D);
  const steps = Math.floor(J.clamp(P.steps ?? 85, 40, 140));
  const agentsX = new Float32Array(nAgents);
  const agentsY = new Float32Array(nAgents);
  const agentsA = new Float32Array(nAgents);

  const mainAngle = Math.atan2(targetY - rootY, targetX - rootX);
  const spread = P.spread ?? (Math.PI * 0.7);

  for (let i = 0; i < nAgents; i++) {
    const rScatter = rng.range(0, cell * 2.5);
    const aScatter = rng.range(0, TAU);
    agentsX[i] = toGridX(rootX + Math.cos(aScatter) * rScatter);
    agentsY[i] = toGridY(rootY + Math.sin(aScatter) * rScatter);
    agentsA[i] = mainAngle + rng.sym(spread * 0.5);
  }

  const SO = J.clamp(P.sensorDist ?? 3.5, 1.5, 6.0);
  const SA = (P.sensorAngle ?? 38) * DEG;
  const RA = (P.turnAngle ?? 28) * DEG;
  const stepSize = J.clamp(P.stepSize ?? 1.4, 0.8, 2.2);

  const rawSegments = [];

  for (let s = 0; s < steps; s++) {
    const at = (s / steps) * 0.88;
    const atEnd = Math.min(0.98, at + 0.10);

    for (let i = 0; i < nAgents; i++) {
      const gx = agentsX[i], gy = agentsY[i], a = agentsA[i];

      const slx = Math.round(gx + Math.cos(a - SA) * SO), sly = Math.round(gy + Math.sin(a - SA) * SO);
      const scx = Math.round(gx + Math.cos(a) * SO),      scy = Math.round(gy + Math.sin(a) * SO);
      const srx = Math.round(gx + Math.cos(a + SA) * SO), sry = Math.round(gy + Math.sin(a + SA) * SO);

      const sample = (x, y) => {
        if (x < 0 || x >= gw || y < 0 || y >= gh) return -10.0;
        if (isObstacle(x, y)) return -25.0;
        return trail[y * gw + x];
      };

      const vl = sample(slx, sly), vc = sample(scx, scy), vr = sample(srx, sry);
      let newA = a;
      if (vc > vl && vc > vr) {
      } else if (vc < vl && vc < vr) {
        newA += (rng.chance(0.5) ? 1 : -1) * RA;
      } else if (vl > vr) {
        newA -= RA;
      } else if (vr > vl) {
        newA += RA;
      } else {
        newA += rng.sym(12 * DEG);
      }

      const ngx = gx + Math.cos(newA) * stepSize;
      const ngy = gy + Math.sin(newA) * stepSize;
      const igx = Math.round(ngx), igy = Math.round(ngy);

      if (igx >= 1 && igx < gw - 1 && igy >= 1 && igy < gh - 1 && !isObstacle(igx, igy)) {
        agentsX[i] = ngx; agentsY[i] = ngy; agentsA[i] = newA;
        const cellIdx = igy * gw + igx;
        trail[cellIdx] += 1.4;

        if (s % 2 === 0) {
          rawSegments.push({
            x0: gx * cell, y0: gy * cell,
            x1: ngx * cell, y1: ngy * cell,
            at, atEnd, head: true,
            flux: trail[cellIdx]
          });
        }
      } else {
        agentsA[i] = newA + Math.PI + rng.sym(45 * DEG);
      }
    }

    if (s % 2 === 0) diffuse();
  }

  const nodes = [];
  const topSpots = [];
  const stride = 3;
  for (let gy = 2; gy < gh - 2; gy += stride) {
    for (let gx = 2; gx < gw - 2; gx += stride) {
      if (isObstacle(gx, gy)) continue;
      const val = trail[gy * gw + gx];
      if (val > 4.5) {
        topSpots.push({ x: (gx + 0.5) * cell, y: (gy + 0.5) * cell, val });
      }
    }
  }
  topSpots.sort((a, b) => b.val - a.val);

  const maxNodes = Math.floor(7 * D);
  for (const sp of topSpots) {
    if (nodes.length >= maxNodes) break;
    let tooClose = false;
    for (const n of nodes) {
      if (Math.hypot(n.x - sp.x, n.y - sp.y) < cell * 4.5) { tooClose = true; break; }
    }
    if (!tooClose) {
      nodes.push({
        x: sp.x, y: sp.y,
        r: Math.min(cell * 1.6, Math.max(3.5, Math.sqrt(sp.val) * 1.1)),
        at: rng.range(0.25, 0.75)
      });
    }
  }

  const buckets = [
    { width: Math.max(3.0, Math.min(W, H) * 0.0036), cap: 'round', segments: [] },
    { width: Math.max(1.8, Math.min(W, H) * 0.0022), cap: 'round', segments: [] },
    { width: Math.max(0.9, Math.min(W, H) * 0.0011), cap: 'round', segments: [] },
  ];

  const maxKeep = 3200;
  const skip = Math.max(1, Math.floor(rawSegments.length / maxKeep));

  for (let i = 0; i < rawSegments.length; i += skip) {
    const seg = rawSegments[i];
    if (seg.flux > 7.0) buckets[0].segments.push(seg);
    else if (seg.flux > 2.8) buckets[1].segments.push(seg);
    else buckets[2].segments.push(seg);
  }

  return { buckets, nodes, rootX, rootY, cell, field, themeMode: 'physarum' };
}

/* ============================================================
   4. Registration of Growth Decor Items (6 UI Cards)
   ============================================================ */
const DEF = {};

/* 4.1 【生长・青花繁花】(Antique Botanical Flora) */
DEF.grow_flora = makeVineRunner('flora', '植物の成長・青花', ['生长', 'botanical', 'calm', 'editorial', 'nature'], {}, {
  default: { density: 1.0 },
  bloom: { density: 1.5, flowerRatio: 2.2, motifScale: 1.3, branches: 8 },
  withered: { leaves: false, flowerRatio: 0, ampRatio: 1.6 },
  ivy: { leafRatio: 1.8, leafScale: 1.25, flowerRatio: 0.3 },
  single_stem: { branches: 0, heroOnly: true, flowerRatio: 1.0, motifScale: 1.4 },
  canopy: { anchor: 'top-right' },
  corner_bl: { anchor: 'bottom-left' },
  corner_br: { anchor: 'bottom-right' }
});

/* 4.2 【生长・折面几何藤蔓】(Geometric Polygon Flora) */
DEF.grow_geometric = makeVineRunner('geometric', '植物の成長・折面幾何', ['生长', 'geometric', 'graphic'], {}, {
  default: { density: 1.0 },
  crystal: { density: 1.5, leafScale: 1.3 },
  origami: { density: 1.0, leafScale: 1.6, branches: 4 },
  minimal_poly: { density: 0.6, branches: 2, leafRatio: 0.5 },
  corner_bl: { anchor: 'bottom-left' },
  corner_br: { anchor: 'bottom-right' }
});

/* 4.3 【生长・赛博回路】(Cyber Circuit Branching) */
DEF.grow_cyber = makeVineRunner('cyber', '回路の成長・電脳', ['生长', 'cyber', 'glitch', 'graphic'], {}, {
  default: { density: 1.0 },
  pcb_dense: { density: 1.6 },
  bus_wide: { density: 0.8, ampRatio: 0.6 },
  server: { anchor: 'bottom-center' },
  corner_bl: { anchor: 'bottom-left' },
  corner_br: { anchor: 'bottom-right' }
});

/* 4.3b 【生长・冰霜晶枝】(Frost Dendrite Crystal) */
DEF.grow_frost = makeVineRunner('frost', '氷霜の成長・樹枝結晶', ['生长', 'frost', 'calm', 'nature', 'crystal', 'geometric', 'minimal'], {}, {
  default: { density: 1.0 },
  ice_fern: { density: 1.5, branches: 7, leafRatio: 1.6 },
  snowflake: { flowerRatio: 2.0, motifScale: 1.4 },
  rime: { density: 1.6, leafScale: 0.75, flowerRatio: 0.2 },
  corner_bl: { anchor: 'bottom-left' },
  corner_br: { anchor: 'bottom-right' },
  center: { anchor: 'center' }
});

/* 4.4 【生长・螺旋卷须】(Tendril & Cyme Spiral) */
DEF.grow_tendril = createRunner({
  name: '植物の成長・螺旋巻髭',
  tags: ['生长', 'organic', 'emotional', 'calm'],
  themeMode: 'grow_tendril',
  params: { density: 1.0, turns: 1.4, speed: 0.85, style: 'default' },
  presets: {
    default: { turns: 1.4, density: 1.0, style: 'default' },
    fern: { turns: 2.2, density: 1.4, style: 'fern' },
    ivy_curl: { turns: 1.8, density: 1.2, style: 'ivy' },
    golden: { turns: 2.5, density: 1.0, style: 'golden' },
    wild: { turns: 2.2, density: 1.6, double: true, style: 'wild' },
    corner_bl: { anchor: 'bottom-left' },
    corner_br: { anchor: 'bottom-right' }
  },
  build(env, bb0, P, field, rng) {
    const { W, H } = env;
    const { rootX, rootY, sideX, sideY } = field.getRootAndTarget();
    const curlDir = sideX > 0 ? -1 : 1;
    const turns = P.turns ?? 1.4;
    const totalSteps = Math.round(65 * (P.density ?? 1));
    const points = [];
    const florets = [];
    const leaflets = [];
    const style = P.style || 'default';

    for (let i = 0; i <= totalSteps; i++) {
      const t = i / totalSteps;
      const radDist = (Math.min(W, H) * 0.36) * (style === 'golden' ? Math.pow(t, 1.15) : Math.pow(t, 0.85));
      const angle = (sideY > 0 ? -Math.PI / 2 : Math.PI / 2) + curlDir * t * turns * TAU;
      const x = rootX + Math.cos(angle) * radDist;
      const y = rootY + Math.sin(angle) * radDist;
      points.push({ x, y, at: t });

      if (style === 'fern' && i > 4 && i < totalSteps - 4 && i % 2 === 0) {
        const leafLen = Math.max(8, 26 * Math.sin(t * Math.PI) * (P.density ?? 1));
        const outAng = angle + (curlDir > 0 ? Math.PI * 0.5 : -Math.PI * 0.5) + rng.sym(0.2);
        leaflets.push({
          x0: x, y0: y,
          x1: x + Math.cos(outAng) * leafLen,
          y1: y + Math.sin(outAng) * leafLen,
          at: t,
          len: leafLen
        });
      } else if (i > 0 && i % 6 === 0) {
        florets.push({ x, y, at: t, r: Math.max(2, 6 * (1 - t * 0.5)) });
      }
    }

    // Secondary counter-spiral if double
    let points2 = null;
    if (P.double) {
      points2 = [];
      for (let i = 0; i <= totalSteps; i++) {
        const t = i / totalSteps;
        const radDist = (Math.min(W, H) * 0.32) * Math.pow(t, 0.9);
        const angle = (sideY > 0 ? -Math.PI / 2 : Math.PI / 2) - curlDir * t * (turns * 0.85) * TAU + 0.3;
        points2.push({
          x: rootX + Math.cos(angle) * radDist,
          y: rootY + Math.sin(angle) * radDist,
          at: t
        });
      }
    }

    return { points, points2, florets, leaflets, style, field };
  },
  render(ctx, skel, pGrowth, pAlpha, env, P, ramp) {
    const { sc, W, H } = env;
    const baseCol = P.accent ? sc.accent : sc.fg;
    const u = Math.min(W, H) / 1080;

    // 1. Unfolding Fern Frond Leaflets
    if (skel.leaflets && skel.leaflets.length > 0) {
      for (const lf of skel.leaflets) {
        if (pGrowth < lf.at) continue;
        const prog = E.outBack(J.clamp((pGrowth - lf.at) / 0.18), 1.5);
        if (prog <= 0) continue;
        const lx1 = J.lerp(lf.x0, lf.x1, prog);
        const ly1 = J.lerp(lf.y0, lf.y1, prog);
        ctx.beginPath();
        ctx.moveTo(lf.x0, lf.y0);
        ctx.lineTo(lx1, ly1);
        ctx.strokeStyle = ramp(0.35);
        ctx.lineWidth = Math.max(1, 1.6 * u);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(lx1, ly1, 2.2 * prog, 0, TAU);
        ctx.fillStyle = baseCol;
        ctx.fill();
      }
    }

    // 2. Primary Spiral Stem
    const maxIdx = Math.max(2, Math.floor(skel.points.length * pGrowth));
    ctx.beginPath();
    ctx.moveTo(skel.points[0].x, skel.points[0].y);
    for (let i = 1; i < maxIdx; i++) {
      ctx.lineTo(skel.points[i].x, skel.points[i].y);
    }
    ctx.strokeStyle = baseCol;
    ctx.lineWidth = Math.max(1.8, Math.min(W, H) * 0.003);
    ctx.stroke();

    // Secondary intertwining spiral
    if (skel.points2) {
      const maxIdx2 = Math.max(2, Math.floor(skel.points2.length * pGrowth));
      ctx.beginPath();
      ctx.moveTo(skel.points2[0].x, skel.points2[0].y);
      for (let i = 1; i < maxIdx2; i++) {
        ctx.lineTo(skel.points2[i].x, skel.points2[i].y);
      }
      ctx.strokeStyle = ramp(0.35);
      ctx.lineWidth = Math.max(1.2, Math.min(W, H) * 0.002);
      ctx.stroke();
    }

    // 3. Florets / Buds
    for (const fl of skel.florets) {
      if (pGrowth >= fl.at) {
        ctx.beginPath();
        ctx.arc(fl.x, fl.y, fl.r, 0, TAU);
        ctx.fillStyle = J.rgba(baseCol, 0.7);
        ctx.fill();
      }
    }
    if (P.debugField && skel.field) skel.field.debugDraw(ctx);
  }
}, { growthSpeed: 0.85, ease: E.outCubic });

/* 4.5 【生长・菌丝根系】(Inconvergent Hyphae Circle Packing Tip Growth) */
DEF.grow_hyphae = createRunner({
  name: '植物の成長・菌絲網',
  tags: ['生长', 'hyphae', 'dark', 'organic', 'creepy', 'fractal'],
  themeMode: 'grow_hyphae',
  params: { density: 1.0, speed: 0.85, wildness: 1.0 },
  presets: {
    default: { density: 1.0, wildness: 1.0 },
    dense: { density: 1.6, wildness: 1.2 },
    sparse: { density: 0.5, wildness: 0.7 },
    spores: { density: 1.4, wildness: 1.3, radScale: 0.88 },
    fine: { density: 1.4, radScale: 0.95 },
    corner_bl: { anchor: 'bottom-left' },
    corner_br: { anchor: 'bottom-right' },
    center: { anchor: 'center' }
  },
  build(env, bb0, P, field, rng) {
    return J.GROW.buildHyphaeSkeleton(env, bb0, P, field, rng);
  },
  render(ctx, skel, pGrowth, pAlpha, env, P, ramp) {
    const { sc } = env;
    const sporeCol = P.accent ? sc.accent : (sc.accent || '#ff7700');
    const tierColors = [
      ramp(0.08), // Trunk
      ramp(0.24), // Main branch
      ramp(0.42), // Fine branch
      ramp(0.65)  // Capillaries
    ];
    for (let t = 0; t < skel.buckets.length; t++) {
      skel.buckets[t].color = tierColors[t];
    }
    J.GROW.renderTaperedBuckets(ctx, skel.buckets, pGrowth);

    if (skel.spores && skel.spores.length > 0) {
      ctx.fillStyle = sporeCol;
      ctx.beginPath();
      for (let i = 0; i < skel.spores.length; i++) {
        const sp = skel.spores[i];
        if (pGrowth >= sp.at) {
          const pop = E.outBack(J.clamp((pGrowth - sp.at) / 0.12), 1.8);
          if (pop > 0) {
            ctx.moveTo(sp.x + sp.r * pop, sp.y);
            ctx.arc(sp.x, sp.y, sp.r * pop, 0, TAU);
          }
        }
      }
      ctx.fill();
    }
    if (P.debugField && skel.field) skel.field.debugDraw(ctx);
  }
}, { growthSpeed: 0.85, ease: E.outCubic });

/* 4.6 【放电・树状电弧】(Lightning & Lichtenberg Arc Discharge)
   Engine: Hyphae with high searchMax, fast angular penetration & lighter glow */
DEF.grow_lightning = createRunner({
  name: '放電の成長・樹状電弧',
  tags: ['生长', 'lightning', 'cyber', 'kinetic', 'dark', 'glitch'],
  themeMode: 'grow_lightning',
  params: { density: 1.0, speed: 0.72, wildness: 1.4 },
  presets: {
    default: { density: 1.0, wildness: 1.4 },
    overcharge: { density: 1.7, wildness: 1.8, speed: 0.60 },
    spark: { density: 0.5, wildness: 0.9, speed: 0.85 },
    skyfall: { anchor: 'top-center' },
    ground: { anchor: 'bottom-center' },
    corner_bl: { anchor: 'bottom-left' }
  },
  build(env, bb0, P, field, rng) {
    return J.GROW.buildHyphaeSkeleton(env, bb0, P, field, rng, {
      ckMax: 4,
      radScale: 0.96,
      searchMax: Math.PI * 1.5,
      wildness: P.wildness ?? 1.4,
      baseRadiusRatio: 0.026,
      roots: P.roots ?? 1
    });
  },
  render(ctx, skel, pGrowth, pAlpha, env, P, ramp) {
    const { sc } = env;
    const neonCyan = P.accent ? sc.accent : (sc.accent || '#4deeea');
    const plasmaWhite = '#ffffff';

    ctx.save();
    // 1. Electric Outer Glow
    ctx.shadowColor = neonCyan;
    ctx.shadowBlur = Math.min(16, 12 * pGrowth + 2);
    const glowColors = [neonCyan, J.rgba(neonCyan, 0.85), J.rgba(neonCyan, 0.65), J.rgba(neonCyan, 0.45)];
    for (let t = 0; t < skel.buckets.length; t++) skel.buckets[t].color = glowColors[t];
    J.GROW.renderTaperedBuckets(ctx, skel.buckets, pGrowth);
    ctx.shadowBlur = 0;

    // 2. White-Hot Plasma Core Trace (Lighter Additive Blending)
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = pAlpha * 0.9;
    skel.buckets[0].color = plasmaWhite;
    skel.buckets[1].color = plasmaWhite;
    J.GROW.renderTaperedBuckets(ctx, [skel.buckets[0], skel.buckets[1]], pGrowth);

    // 3. Electric sparks at tips
    if (skel.spores && skel.spores.length > 0) {
      ctx.fillStyle = plasmaWhite;
      ctx.beginPath();
      for (let i = 0; i < skel.spores.length; i++) {
        const sp = skel.spores[i];
        if (pGrowth >= sp.at) {
          const sparkProg = (pGrowth - sp.at) / 0.12;
          if (sparkProg >= 0 && sparkProg <= 1.0) {
            ctx.moveTo(sp.x + sp.r * 1.2, sp.y);
            ctx.arc(sp.x, sp.y, sp.r * 1.2, 0, TAU);
          }
        }
      }
      ctx.fill();
    }
    if (P.debugField && skel.field) skel.field.debugDraw(ctx);
    ctx.restore();
  }
}, { growthSpeed: 0.72, ease: E.outExpo });

/* 4.7 【珊瑚・深海群生】(Coral Reef Colony & Bioluminescent Polyps)
   Engine: Hyphae with dense fan-out & translucent overlapping disc volume */
DEF.grow_coral = createRunner({
  name: '珊瑚の成長・深海群生',
  tags: ['生长', 'coral', 'nature', 'calm', 'organic', 'editorial'],
  themeMode: 'grow_coral',
  params: { density: 1.0, speed: 0.88 },
  presets: {
    default: { density: 1.0 },
    anemone: { density: 1.5, baseRadiusRatio: 0.042 },
    solitary: { density: 0.6 },
    corner_bl: { anchor: 'bottom-left' },
    corner_br: { anchor: 'bottom-right' },
    center: { anchor: 'center' }
  },
  build(env, bb0, P, field, rng) {
    return J.GROW.buildHyphaeSkeleton(env, bb0, P, field, rng, {
      ckMax: 14,
      radScale: 0.88,
      searchMax: Math.PI * 1.05,
      baseRadiusRatio: P.baseRadiusRatio ?? 0.036,
      roots: P.roots ?? 2
    });
  },
  render(ctx, skel, pGrowth, pAlpha, env, P, ramp) {
    const { sc } = env;
    const coralCol = P.accent ? sc.accent : '#ff6f61';
    const emerald = sc.accent2 || '#00e5a3';

    ctx.save();
    // 1. Calcareous branch conduits
    const coralTiers = [ramp(0.20), ramp(0.38), ramp(0.55), ramp(0.72)];
    for (let t = 0; t < skel.buckets.length; t++) skel.buckets[t].color = coralTiers[t];
    J.GROW.renderTaperedBuckets(ctx, skel.buckets, pGrowth);

    // 2. Translucent Overlapping Polyp Discs
    if (skel.spores && skel.spores.length > 0) {
      const breath = Math.sin((env.ltb || 0) * TAU) * 0.12 + 1.0;
      for (let i = 0; i < skel.spores.length; i++) {
        const sp = skel.spores[i];
        if (pGrowth >= sp.at) {
          const pop = E.outBack(J.clamp((pGrowth - sp.at) / 0.18), 1.5);
          if (pop > 0) {
            const rad = sp.r * 2.2 * pop * breath;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, rad, 0, TAU);
            ctx.fillStyle = J.rgba(coralCol, 0.22);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(sp.x, sp.y, rad * 0.45, 0, TAU);
            ctx.fillStyle = emerald;
            ctx.fill();
          }
        }
      }
    }
    if (P.debugField && skel.field) skel.field.debugDraw(ctx);
    ctx.restore();
  }
}, { growthSpeed: 0.88, ease: E.outCubic });

/* 4.8 【神经・突触联结】(Neural Connectome & Action Potential Synapses)
   Engine: Hyphae with dendritic spines & traveling action potential pulses */
DEF.grow_neural = createRunner({
  name: '神経の成長・シナプス網',
  tags: ['生长', 'neural', 'cyber', 'editorial', 'dark', 'organic'],
  themeMode: 'grow_neural',
  params: { density: 1.0, speed: 0.82 },
  presets: {
    default: { density: 1.0 },
    cortex: { density: 1.6 },
    sparse_axon: { density: 0.5 },
    center_soma: { anchor: 'center' },
    corner_bl: { anchor: 'bottom-left' },
    corner_br: { anchor: 'bottom-right' }
  },
  build(env, bb0, P, field, rng) {
    return J.GROW.buildHyphaeSkeleton(env, bb0, P, field, rng, {
      ckMax: 8,
      radScale: 0.91,
      searchMax: Math.PI * 1.25,
      baseRadiusRatio: 0.025,
      roots: P.roots ?? 3
    });
  },
  render(ctx, skel, pGrowth, pAlpha, env, P, ramp) {
    const { sc } = env;
    const axonCol = P.accent ? sc.accent : ramp(0.35);
    const somaCol = sc.accent || '#ffaa00';
    const pulseCol = '#ffffff';

    ctx.save();
    // 1. Axons and Dendrites
    const neuralTiers = [ramp(0.18), ramp(0.32), ramp(0.50), ramp(0.70)];
    for (let t = 0; t < skel.buckets.length; t++) skel.buckets[t].color = neuralTiers[t];
    J.GROW.renderTaperedBuckets(ctx, skel.buckets, pGrowth);

    // 2. Soma Neuron Cell Bodies
    if (skel.spores && skel.spores.length > 0) {
      for (let i = 0; i < skel.spores.length; i++) {
        const sp = skel.spores[i];
        if (pGrowth >= sp.at) {
          const pop = E.outBack(J.clamp((pGrowth - sp.at) / 0.15), 1.6);
          if (pop > 0) {
            const r = sp.r * 1.4 * pop;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, r, 0, TAU);
            ctx.fillStyle = axonCol;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(sp.x, sp.y, r * 0.42, 0, TAU);
            ctx.fillStyle = somaCol;
            ctx.fill();
          }
        }
      }
    }

    // 3. Traveling Action Potential Pulses
    if (pGrowth > 0.1) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = pulseCol;
      const bMain = skel.buckets[1];
      if (bMain && bMain.segments) {
        const pulseCycle = ((env.lt * 2.5) % 1.0);
        ctx.beginPath();
        for (let i = 0; i < bMain.segments.length; i += 4) {
          const seg = bMain.segments[i];
          if (pGrowth >= seg.atEnd) {
            const px = J.lerp(seg.x0, seg.x1, pulseCycle);
            const py = J.lerp(seg.y0, seg.y1, pulseCycle);
            ctx.moveTo(px + 2.5, py);
            ctx.arc(px, py, 2.5, 0, TAU);
          }
        }
        ctx.fill();
      }
    }

    if (P.debugField && skel.field) skel.field.debugDraw(ctx);
    ctx.restore();
  }
}, { growthSpeed: 0.82, ease: E.outCubic });

/* 4.6 【生长・粘菌原生网】(Physarum Transport Network) */
DEF.grow_physarum = createRunner({
  name: '植物の成長・粘菌網',
  tags: ['生长', 'physarum', 'organic', 'horror', 'cyber', 'experimental'],
  themeMode: 'grow_physarum',
  params: { density: 1.0, speed: 0.85 },
  presets: {
    default: { density: 1.0 },
    angio: { density: 1.5, agents: 450, themeStyle: 'angio', decay: 0.95 },
    maze: { density: 1.2, sensorDist: 5.5, turnAngle: 36, steps: 110 },
    biolum: { density: 1.4, agents: 380, themeStyle: 'biolum' },
    dense: { density: 1.6, agents: 500 },
    sparse: { density: 0.5, agents: 180 },
    corner_bl: { anchor: 'bottom-left' },
    corner_br: { anchor: 'bottom-right' }
  },
  build(env, bb0, P, field, rng) {
    return buildPhysarumSkeleton(env, bb0, P);
  },
  render(ctx, skel, pGrowth, pAlpha, env, P, ramp) {
    const { sc, W, H } = env;
    const isAngio = P.themeStyle === 'angio';
    const isBiolum = P.themeStyle === 'biolum';

    const nodeCol = isAngio ? '#ff3344' : (isBiolum ? '#00f5d4' : (sc.accent || '#ff5500'));
    if (isAngio) {
      skel.buckets[0].color = '#b7094c';
      skel.buckets[1].color = '#c72c41';
      skel.buckets[2].color = '#ee6c4d';
    } else if (isBiolum) {
      skel.buckets[0].color = '#00f5d4';
      skel.buckets[1].color = '#52b788';
      skel.buckets[2].color = '#74c69d';
      ctx.shadowColor = '#00f5d4';
      ctx.shadowBlur = Math.min(12, 8 * pGrowth);
    } else {
      skel.buckets[0].color = ramp(0.10);
      skel.buckets[1].color = ramp(0.32);
      skel.buckets[2].color = ramp(0.60);
    }

    J.GROW.renderTaperedBuckets(ctx, skel.buckets, pGrowth);
    if (isBiolum) ctx.shadowBlur = 0;

    if (skel.nodes && skel.nodes.length > 0) {
      const beatPulse = Math.sin((env.ltb || 0) * Math.PI * 2) * 0.15 + 1.0;
      for (let i = 0; i < skel.nodes.length; i++) {
        const nd = skel.nodes[i];
        if (pGrowth >= nd.at) {
          const pop = E.outBack(J.clamp((pGrowth - nd.at) / 0.15), 1.6);
          if (pop > 0) {
            const r = nd.r * pop * beatPulse;
            ctx.beginPath();
            ctx.arc(nd.x, nd.y, r, 0, TAU);
            ctx.fillStyle = isAngio ? 'rgba(183,9,76,0.5)' : ramp(0.20);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(nd.x, nd.y, r * 0.45, 0, TAU);
            ctx.fillStyle = nodeCol;
            ctx.fill();
          }
        }
      }
    }
    const rootR = Math.min(W, H) * 0.016 * E.outCubic(J.clamp(pGrowth * 3.0));
    if (rootR > 1) {
      ctx.beginPath();
      ctx.arc(skel.rootX, skel.rootY, rootR, 0, TAU);
      ctx.fillStyle = isAngio ? '#800f2f' : ramp(0.15);
      ctx.fill();
    }
    if (P.debugField && skel.field) skel.field.debugDraw(ctx);
  }
}, { growthSpeed: 0.85, ease: E.outCubic });

/* ============================================================
   5. Registration into JIZURA
   ============================================================ */
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
