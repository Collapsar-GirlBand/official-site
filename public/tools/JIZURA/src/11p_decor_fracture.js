/* ============================================================
   JIZURA pack: decorFracture (地裂・破片・貫入)
   Directly ported and adapted from:
   https://github.com/inconvergent/fracture
   Copyright (c) 2016-2026 Anders Hoff / Inconvergent (MIT License)

   Core Algorithms & Adaptations:
   - Pre-distributed attraction seeds & forward-cone vector steering
   - Relative Neighborhood / T-junction collision arrest (脆性物理断裂截断)
   - Decoupled J.GROW infrastructure (src/07b_grow_core.js)
   - Causal timestamping for deterministic 60FPS timeline scrubbing
   - Multi-tier tapered bucket batch rendering (renderTaperedBuckets)
   - Unified master engine with 3 distinctive preset cards
   ============================================================ */
(() => {
'use strict';

const PK = 'decorFracture';
const E = J.E;
const DEG = J.DEG, TAU = J.TAU;

// Import decoupled growth infrastructure from J.GROW
const {
  makeRng, norm2, makeToneRamp, createField, createRunner,
  renderTaperedBuckets, makeSpatialGrid, CACHE: GROW_CACHE
} = J.GROW;

const U = env => Math.min(env.W, env.H) / 1080;

/* ============================================================
   1. Core Fracture Simulation Engine (Anders Hoff / Inconvergent)
   ============================================================ */
function simulateFracture(env, bb0, P, field, rng, opts = {}) {
  const { W, H } = env;
  const u = U(env);

  const numSeeds = opts.numSeeds ?? Math.round(700 * (P.density ?? 1));
  const fracDst = (opts.fracDst ?? 65) * u;
  const fracDot = opts.fracDot ?? 0.72;
  const fracStp = (opts.fracStp ?? 10) * u;
  const diminish = opts.diminish ?? 0.993;
  const spawnChance = opts.spawnChance ?? 0.22;
  const spawnDiminish = opts.spawnDiminish ?? 0.82;
  const maxSteps = opts.maxSteps ?? 80;
  const avoidText = field.avoidText && opts.avoidText !== false;

  // 1. Generate & Register Seeds into Spatial Hash Grid
  const seedGrid = makeSpatialGrid(fracDst * 0.9);
  const pad = field.pad;

  for (let i = 0; i < numSeeds; i++) {
    const sx = rng.range(pad, W - pad);
    const sy = rng.range(pad, H - pad);
    if (!field.isInsideInclusion(sx, sy)) continue;
    if (avoidText && !field.isClearOfText(sx, sy)) continue;
    seedGrid.insert(sx, sy, { id: i });
  }

  // 2. Spatial Grid for Existing Cracks (for Relative Neighborhood & T-Junction Arrest)
  const crackGrid = makeSpatialGrid(fracStp * 1.4);

  // 3. Initialize Fractures from Roots
  const initialRoots = opts.roots || [];
  let crackCounter = 0;
  const activeCracks = [];
  const completedPaths = [];
  const junctions = [];

  for (const r of initialRoots) {
    const cid = ++crackCounter;
    const crack = {
      id: cid,
      points: [{ x: r.x, y: r.y, at: r.at ?? 0 }],
      dir: norm2(r.dx, r.dy),
      spd: r.spd ?? 1.0,
      width: r.width ?? 3.5 * u,
      depth: r.depth ?? 0,
      birthAt: r.at ?? 0,
      stepCount: 0,
      alive: true
    };
    crackGrid.insert(r.x, r.y, { crackId: cid, step: 0 });
    activeCracks.push(crack);
  }

  // 4. Stepping Simulation Loop
  let globalStep = 0;
  const maxGlobalSteps = maxSteps * 2;

  while (activeCracks.length > 0 && globalStep < maxGlobalSteps) {
    globalStep++;
    const numActive = activeCracks.length;

    for (let cIdx = numActive - 1; cIdx >= 0; cIdx--) {
      const crack = activeCracks[cIdx];
      if (!crack.alive) {
        activeCracks.splice(cIdx, 1);
        completedPaths.push(crack);
        continue;
      }

      crack.stepCount++;
      crack.spd *= diminish;

      const lastPt = crack.points[crack.points.length - 1];
      const cx = lastPt.x, cy = lastPt.y;
      const cdx = crack.dir[0], cdy = crack.dir[1];

      // Query forward-cone attraction seeds
      let sumDx = 0, sumDy = 0, countCandidates = 0;
      seedGrid.queryRadius(cx, cy, fracDst, (p, dx, dy, d2) => {
        if (d2 < 1e-4) return;
        const d = Math.sqrt(d2);
        const dot = (dx * cdx + dy * cdy) / d;
        if (dot > fracDot) {
          const w = 1 / d2;
          sumDx += (dx / d) * w;
          sumDy += (dy / d) * w;
          countCandidates++;
        }
      });

      let newDir;
      if (countCandidates > 0) {
        newDir = norm2(sumDx, sumDy);
      } else {
        const drift = rng.sym(0.35);
        newDir = [
          cdx * Math.cos(drift) - cdy * Math.sin(drift),
          cdx * Math.sin(drift) + cdy * Math.cos(drift)
        ];
      }

      const nx = cx + newDir[0] * fracStp;
      const ny = cy + newDir[1] * fracStp;

      if (!field.isInsideInclusion(nx, ny) || nx < pad || nx > W - pad || ny < pad || ny > H - pad) {
        crack.alive = false;
        activeCracks.splice(cIdx, 1);
        completedPaths.push(crack);
        continue;
      }

      if (avoidText && !field.isClearOfText(nx, ny)) {
        crack.alive = false;
        activeCracks.splice(cIdx, 1);
        completedPaths.push(crack);
        continue;
      }

      // Relative Neighborhood & T-Junction Collision Arrest
      let hitNode = null;
      const colDist = fracStp * 0.92;
      crackGrid.queryRadius(nx, ny, colDist, (item) => {
        if (item.data.crackId === crack.id && item.data.step > crack.stepCount - 4) return;
        hitNode = item;
        return false;
      });

      const nextAt = J.clamp(crack.birthAt + (crack.stepCount / maxSteps) * (1 - crack.birthAt), 0, 1);

      if (hitNode) {
        crack.points.push({ x: hitNode.x, y: hitNode.y, at: nextAt });
        crack.alive = false;
        junctions.push({ x: hitNode.x, y: hitNode.y, at: nextAt, size: crack.width });
        activeCracks.splice(cIdx, 1);
        completedPaths.push(crack);
        continue;
      }

      crack.points.push({ x: nx, y: ny, at: nextAt });
      crack.dir = newDir;
      crackGrid.insert(nx, ny, { crackId: crack.id, step: crack.stepCount });

      if (crack.spd < 0.12 || crack.stepCount >= maxSteps) {
        crack.alive = false;
        activeCracks.splice(cIdx, 1);
        completedPaths.push(crack);
        continue;
      }

      // Side Branch Spawning (Orthogonal Fracture)
      if (crack.depth < 3 && rng.chance(spawnChance * crack.spd)) {
        const sideSign = rng.chance(0.5) ? 1 : -1;
        const branchAng = (sideSign * Math.PI * 0.5) + rng.sym(0.22);
        const bdx = newDir[0] * Math.cos(branchAng) - newDir[1] * Math.sin(branchAng);
        const bdy = newDir[0] * Math.sin(branchAng) + newDir[1] * Math.cos(branchAng);
        const childSpd = crack.spd * spawnDiminish;

        const childCrack = {
          id: ++crackCounter,
          points: [{ x: nx, y: ny, at: nextAt }],
          dir: norm2(bdx, bdy),
          spd: childSpd,
          width: Math.max(1 * u, crack.width * 0.65),
          depth: crack.depth + 1,
          birthAt: nextAt,
          stepCount: 0,
          alive: true
        };
        activeCracks.push(childCrack);
      }
    }
  }

  for (const c of activeCracks) completedPaths.push(c);

  // 5. Pack into 3 Tapered Line Buckets for 60FPS Draw Calls
  const bucketTrunk = { width: Math.max(2.8, 3.8 * u), cap: 'round', segments: [] };
  const bucketBranch = { width: Math.max(1.8, 2.2 * u), cap: 'round', segments: [] };
  const bucketHairline = { width: Math.max(0.9, 1.2 * u), cap: 'round', segments: [] };

  for (const path of completedPaths) {
    if (path.points.length < 2) continue;
    let targetBucket;
    if (path.depth === 0) targetBucket = bucketTrunk;
    else if (path.depth === 1) targetBucket = bucketBranch;
    else targetBucket = bucketHairline;

    for (let i = 0; i < path.points.length - 1; i++) {
      const p0 = path.points[i], p1 = path.points[i + 1];
      targetBucket.segments.push({
        x0: p0.x, y0: p0.y,
        x1: p1.x, y1: p1.y,
        at: p0.at,
        atEnd: p1.at,
        head: true
      });
    }
  }

  return {
    buckets: [bucketTrunk, bucketBranch, bucketHairline],
    junctions,
    roots: initialRoots,
    totalCracks: completedPaths.length
  };
}

/* ============================================================
   2. Master Fracture Variations (Burst / Crevasse / Craquelure)
   ============================================================ */
const FRACTURE_CONFIGS = {
  // 2.1 Epicenter Radial Burst
  burst: {
    roots(env, bb0, P, field, rng, u) {
      const { W, H } = env;
      let ox = bb0 ? bb0.cx : W * 0.5;
      let oy = bb0 ? bb0.cy : H * 0.5;
      if (P.anchor || P.origin || P.root) {
        const r = field.getRootAndTarget();
        ox = r.rootX; oy = r.rootY;
      }
      const nRoots = Math.round(rng.int(5, 8) * (P.density ?? 1));
      const roots = [];
      const baseAngle = rng.u() * TAU;
      for (let i = 0; i < nRoots; i++) {
        const ang = baseAngle + (i / nRoots) * TAU + rng.sym(0.3);
        roots.push({
          x: ox + Math.cos(ang) * 15 * u,
          y: oy + Math.sin(ang) * 15 * u,
          dx: Math.cos(ang),
          dy: Math.sin(ang),
          spd: 1.0,
          width: 3.8 * u,
          depth: 0,
          at: 0.0
        });
      }
      return roots;
    },
    simOpts: {
      numSeeds: 750, fracDst: 60, fracDot: 0.70, fracStp: 11,
      diminish: 0.992, spawnChance: 0.25, spawnDiminish: 0.80, avoidText: false
    },
    growthSpeed: 0.75,
    ease: E.outExpo,
    render(ctx, skel, pGrowth, pAlpha, env, P, ramp) {
      const { sc } = env;
      const mainCol = P.accent ? sc.accent : sc.fg;
      const glowCol = sc.accent || mainCol;
      ctx.save();
      ctx.shadowColor = glowCol;
      ctx.shadowBlur = Math.min(18, 12 * pGrowth);
      renderTaperedBuckets(ctx, skel.buckets, pGrowth, { color: mainCol });
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = pAlpha * 0.6;
      renderTaperedBuckets(ctx, [skel.buckets[0]], pGrowth, { color: glowCol });
      ctx.globalCompositeOperation = 'source-over';
      for (const j of skel.junctions) {
        if (pGrowth < j.at) continue;
        const prog = J.clamp((pGrowth - j.at) / 0.15);
        if (prog >= 1.0) continue;
        const r = j.size * (1 + prog * 1.8);
        const alpha = (1 - prog) * 0.85;
        ctx.beginPath();
        ctx.arc(j.x, j.y, r, 0, TAU);
        ctx.fillStyle = J.rgba(glowCol, alpha);
        ctx.fill();
      }
      ctx.restore();
    }
  },

  // 2.2 Tectonic Crevasse Rift
  crevasse: {
    roots(env, bb0, P, field, rng, u) {
      const { W, H } = env;
      const fromLeft = rng.chance(0.5);
      const startX = fromLeft ? field.pad * 1.2 : W - field.pad * 1.2;
      const startY = rng.range(H * 0.2, H * 0.4);
      const targetX = fromLeft ? W - field.pad * 1.2 : field.pad * 1.2;
      const targetY = rng.range(H * 0.65, H * 0.85);
      const [ndx, ndy] = norm2(targetX - startX, targetY - startY);
      return [{
        x: startX, y: startY, dx: ndx, dy: ndy, spd: 1.0, width: 4.5 * u, depth: 0, at: 0.0
      }];
    },
    simOpts: {
      numSeeds: 850, fracDst: 75, fracDot: 0.76, fracStp: 12,
      diminish: 0.995, spawnChance: 0.32, spawnDiminish: 0.85
    },
    growthSpeed: 0.85,
    ease: E.outCubic,
    render(ctx, skel, pGrowth, pAlpha, env, P, ramp) {
      const { sc } = env;
      const mainCol = P.accent ? sc.accent : sc.fg;
      ctx.save();
      renderTaperedBuckets(ctx, skel.buckets, pGrowth, { color: mainCol });
      ctx.lineWidth = 1;
      ctx.strokeStyle = J.rgba(mainCol, 0.4);
      ctx.stroke();
      ctx.restore();
    }
  },

  // 2.3 Antique Porcelain Craquelure
  craquelure: {
    roots(env, bb0, P, field, rng, u) {
      const { W, H } = env;
      const roots = [];
      const nCores = Math.round(rng.int(3, 5) * (P.density ?? 1));
      for (let k = 0; k < nCores; k++) {
        const cx = rng.range(W * 0.2, W * 0.8);
        const cy = rng.range(H * 0.2, H * 0.8);
        const angleCount = rng.int(3, 4);
        const baseA = rng.u() * TAU;
        for (let a = 0; a < angleCount; a++) {
          const ang = baseA + (a / angleCount) * TAU + rng.sym(0.25);
          roots.push({
            x: cx, y: cy, dx: Math.cos(ang), dy: Math.sin(ang), spd: 0.9, width: 2.0 * u, depth: 0, at: rng.range(0.0, 0.2)
          });
        }
      }
      return roots;
    },
    simOpts: {
      numSeeds: 650, fracDst: 45, fracDot: 0.65, fracStp: 8,
      diminish: 0.99, spawnChance: 0.35, spawnDiminish: 0.78
    },
    growthSpeed: 0.90,
    ease: E.outQuad,
    render(ctx, skel, pGrowth, pAlpha, env, P, ramp) {
      const { sc } = env;
      const baseCol = P.accent ? sc.accent : sc.fg;
      const goldGlaze = P.gold ? '#d4af37' : baseCol;
      ctx.save();
      renderTaperedBuckets(ctx, skel.buckets, pGrowth, { color: J.rgba(goldGlaze, 0.75) });
      ctx.restore();
    }
  },

  // 2.4 Spiderweb Radial Glass Shatter (硝子の破砕・蜘蛛網裂紋)
  glass: {
    roots(env, bb0, P, field, rng, u) {
      const { W, H } = env;
      let ox = bb0 ? bb0.cx : W * 0.5;
      let oy = bb0 ? bb0.cy : H * 0.5;
      if (P.anchor || P.origin || P.root) {
        const r = field.getRootAndTarget();
        ox = r.rootX; oy = r.rootY;
      }
      const roots = [];
      // 1. Radial spokes
      const nSpokes = Math.round(rng.int(10, 16) * (P.density ?? 1));
      const baseAngle = rng.u() * TAU;
      for (let i = 0; i < nSpokes; i++) {
        const ang = baseAngle + (i / nSpokes) * TAU + rng.sym(0.18);
        roots.push({
          x: ox + Math.cos(ang) * 12 * u,
          y: oy + Math.sin(ang) * 12 * u,
          dx: Math.cos(ang),
          dy: Math.sin(ang),
          spd: 1.2,
          width: 2.2 * u,
          depth: 0,
          at: 0.0
        });
      }
      // 2. Concentric Tension Rings
      const nRings = Math.round(rng.int(3, 5) * (P.rings ?? 1));
      for (let r = 1; r <= nRings; r++) {
        const radius = (r / (nRings + 1)) * Math.min(W, H) * 0.38;
        const ringSegs = Math.round(12 + r * 6);
        for (let s = 0; s < ringSegs; s++) {
          const a = (s / ringSegs) * TAU;
          const rx = ox + Math.cos(a) * radius + rng.sym(4 * u);
          const ry = oy + Math.sin(a) * radius + rng.sym(4 * u);
          roots.push({
            x: rx, y: ry,
            dx: -Math.sin(a),
            dy: Math.cos(a),
            spd: 0.65,
            width: 1.4 * u,
            depth: 1,
            at: (r / nRings) * 0.35
          });
        }
      }
      return roots;
    },
    simOpts: {
      numSeeds: 900, fracDst: 45, fracDot: 0.82, fracStp: 8,
      diminish: 0.994, spawnChance: 0.18, spawnDiminish: 0.85
    },
    growthSpeed: 0.70,
    ease: E.outExpo,
    render(ctx, skel, pGrowth, pAlpha, env, P, ramp) {
      const { sc, W, H } = env;
      const u = Math.min(W, H) / 1080;
      const glassCol = '#e6f7ff';
      const edgeCol = P.accent ? sc.accent : '#b3e0ff';

      ctx.save();
      ctx.shadowColor = edgeCol;
      ctx.shadowBlur = Math.min(10, 8 * pGrowth);
      renderTaperedBuckets(ctx, skel.buckets, pGrowth, { color: glassCol });
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      for (const j of skel.junctions) {
        if (pGrowth < j.at) continue;
        const prog = J.clamp((pGrowth - j.at) / 0.12);
        if (prog >= 1.0) continue;
        ctx.beginPath();
        ctx.arc(j.x, j.y, 2.0 * u * (1 - prog), 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }
};

/* Unified Runner Builder for Fracture Decor */
function makeFractureRunner(mode, name, tags, defaultParams = {}, presets = {}) {
  const cfg = FRACTURE_CONFIGS[mode];
  return createRunner({
    name,
    tags,
    themeMode: 'fracture_' + mode,
    params: Object.assign({ density: 1.0, preset: 'default', mode }, defaultParams),
    presets: Object.assign({
      default: { density: 1.0 },
      dense: { density: 1.6 },
      sparse: { density: 0.5 },
      fast: { speed: 0.6 },
      slow: { speed: 1.0 }
    }, presets),
    build(env, bb0, P, field, rng) {
      const activeCfg = FRACTURE_CONFIGS[P.mode || mode] || cfg;
      const u = U(env);
      const roots = activeCfg.roots(env, bb0, P, field, rng, u);
      const opts = Object.assign({}, activeCfg.simOpts, {
        roots,
        avoidText: field.avoidText && activeCfg.simOpts.avoidText !== false
      });
      return simulateFracture(env, bb0, P, field, rng, opts);
    },
    render(ctx, skel, pGrowth, pAlpha, env, P, ramp) {
      const activeCfg = FRACTURE_CONFIGS[P.mode || mode] || cfg;
      activeCfg.render(ctx, skel, pGrowth, pAlpha, env, P, ramp);
    }
  }, { growthSpeed: cfg.growthSpeed, ease: cfg.ease });
}

/* ============================================================
   3. Registration into JIZURA (3 Distinct UI Cards)
   ============================================================ */
const DEF = {};

/* 3.1 【地裂・衝撃破砕】(Shock Fracture Burst) */
DEF.fracture_burst = makeFractureRunner('burst', '地裂・衝撃破砕', ['生长', 'horror', 'glitch', 'kinetic', 'editorial', 'dark'], {}, {
  default: { density: 1.0 },
  supernova: { density: 1.8, speed: 0.60 },
  micro: { density: 0.5 },
  corner_bl: { anchor: 'bottom-left' },
  corner_br: { anchor: 'bottom-right' },
  center: { anchor: 'center' },
  fast: { speed: 0.55 },
  slow: { speed: 1.0 }
});

/* 3.2 【地裂・断層地塹】(Fault Crevasse Rift) */
DEF.fracture_crevasse = makeFractureRunner('crevasse', '地裂・断層地塹', ['生长', 'dark', 'kinetic', 'horror'], {}, {
  default: { density: 1.0 },
  chasm: { density: 1.6 },
  shear: { density: 0.8 },
  diagonal: { anchor: 'top-left' },
  corner_bl: { anchor: 'bottom-left' },
  fast: { speed: 0.65 },
  slow: { speed: 1.1 }
});

/* 3.3 【陶磁・貫入開片】(Celadon Craquelure / Ice Crack Network) */
DEF.fracture_craquelure = makeFractureRunner('craquelure', '陶磁・貫入開片', ['生长', 'calm', 'editorial', 'paper'], {}, {
  default: { density: 1.0 },
  kintsugi: { density: 1.2, gold: true },
  ice_crack: { density: 0.7 },
  fish_roe: { density: 1.8 },
  corner_bl: { anchor: 'bottom-left' },
  corner_br: { anchor: 'bottom-right' }
});

/* 3.4 【硝子・蜘蛛網裂紋】(Spiderweb Radial Glass Shatter) */
DEF.fracture_glass = makeFractureRunner('glass', '硝子の破砕・蜘蛛網裂紋', ['生长', 'glass', 'shatter', 'horror', 'kinetic', 'glitch', 'editorial'], {}, {
  default: { density: 1.0 },
  bullet_impact: { density: 1.8, rings: 5, speed: 0.60 },
  stress_crack: { density: 0.6, rings: 2 },
  corner_strike: { anchor: 'bottom-left' },
  center: { anchor: 'center' }
});

for (const k of Object.keys(DEF)) {
  DEF[k].grow = true;
  DEF[k].set = 'grow';
  if (!DEF[k].vibes) DEF[k].vibes = [];
  if (!DEF[k].vibes.includes('grow')) DEF[k].vibes.push('grow');
  if (!DEF[k].tags) DEF[k].tags = [];
  if (!DEF[k].tags.includes('生长')) DEF[k].tags.unshift('生长');
  else DEF[k].tags = ['生长', ...DEF[k].tags.filter(t => t !== '生长')];
  J.register('decor', k, DEF[k], PK);
}

})();
