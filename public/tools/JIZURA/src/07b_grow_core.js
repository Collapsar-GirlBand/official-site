/* ============================================================
   JIZURA — Growth Decoration Core Engine (J.GROW)
   Decoupled reusable infrastructure for organic & generative growth
   decorations (Florilegium, Hyphae, Lightning, Ivy, Circuits, etc.)
   ============================================================ */
(() => {
'use strict';

const DEG = J.DEG, TAU = J.TAU;
const E = J.E;

const GROW = {};
J.GROW = GROW;

/* ============================================================
   1. Math & Deterministic PRNG Utilities
   ============================================================ */
/**
 * Mulberry32 PRNG (deterministic seeded random generator)
 */
function makeRng(seed) {
  let s = (seed | 0) >>> 0;
  return {
    u() {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range(a, b) { return a + (b - a) * this.u(); },
    sym(a) { return a * (2 * this.u() - 1); },
    int(a, b) { return a + Math.floor((b - a + 1) * this.u()); },
    chance(p) { return this.u() < p; },
    pick(arr) { return arr[Math.floor(this.u() * arr.length)]; },
    fork() { return makeRng(Math.floor(this.u() * 4294967295)); }
  };
}
GROW.makeRng = makeRng;

function norm2(x, y) {
  const l = Math.hypot(x, y);
  return l < 1e-9 ? [0, 1] : [x / l, y / l];
}
GROW.norm2 = norm2;

function makeFbm1(rng, oct = 2) {
  const grads = [];
  for (let k = 0; k < oct; k++) {
    const g = new Float32Array(256);
    for (let i = 0; i < 256; i++) g[i] = rng.sym(1);
    grads.push(g);
  }
  return function(x) {
    let v = 0, a = 1, f = 1;
    for (let k = 0; k < oct; k++) {
      const g = grads[k];
      const pos = x * f + 17 * (k + 1);
      const i = Math.floor(pos);
      const frac = pos - i;
      const u = frac * frac * (3 - 2 * frac);
      const ga = g[i & 255] * frac;
      const gb = g[(i + 1) & 255] * (frac - 1);
      v += a * 2 * (ga + (gb - ga) * u);
      a *= 0.5;
      f *= 2;
    }
    return v;
  };
}
GROW.makeFbm1 = makeFbm1;

/* de Casteljau: prefix [0..t] of a cubic Bézier */
function bezierHead(p0, p1, p2, p3, t) {
  t = J.clamp(t);
  const ax = J.lerp(p0[0], p1[0], t), ay = J.lerp(p0[1], p1[1], t);
  const bx = J.lerp(p1[0], p2[0], t), by = J.lerp(p1[1], p2[1], t);
  const cx = J.lerp(p2[0], p3[0], t), cy = J.lerp(p2[1], p3[1], t);
  const dx = J.lerp(ax, bx, t), dy = J.lerp(ay, by, t);
  const ex = J.lerp(bx, cx, t), ey = J.lerp(by, cy, t);
  return [p0, [ax, ay], [dx, dy], [J.lerp(dx, ex, t), J.lerp(dy, ey, t)]];
}
GROW.bezierHead = bezierHead;

/* sample cubic bezier into points */
function sampleBezier(p0, p1, p2, p3, steps = 16) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, mt = 1 - t;
    const x = mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0];
    const y = mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1];
    pts.push([x, y]);
  }
  return pts;
}
GROW.sampleBezier = sampleBezier;

/* branch_path: connects parent stem (sx,sy) tangent (tx,ty) to motif (bx,by) axis (ax,ay) */
function branchPath(rng, sx, sy, tx, ty, bx, by, ax, ay) {
  const dx = bx - sx, dy = by - sy;
  const d = Math.hypot(dx, dy);
  if (tx * dx + ty * dy < -0.3 * d) { tx = -tx; ty = -ty; }
  const turn = (tx * dy - ty * dx > 0 ? 1 : -1) * rng.range(28, 48) * DEG;
  const ox = tx * Math.cos(turn) - ty * Math.sin(turn);
  const oy = tx * Math.sin(turn) + ty * Math.cos(turn);
  return [
    [sx, sy],
    [sx + ox * d * 0.45, sy + oy * d * 0.45],
    [bx - ax * d * 0.40, by - ay * d * 0.40],
    [bx, by]
  ];
}
GROW.branchPath = branchPath;

/* Point-in-polygon ray-casting test (even-odd rule) */
function pointInPoly(x, y, poly) {
  if (!poly || poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
GROW.pointInPoly = pointInPoly;

/* Fast 2D Spatial Hash Grid for high-performance proximity queries and collision detection */
function makeSpatialGrid(cellSize) {
  cellSize = Math.max(4, cellSize || 32);
  const cells = new Map();
  const key = (ix, iy) => `${ix},${iy}`;
  return {
    insert(x, y, data) {
      const ix = Math.floor(x / cellSize), iy = Math.floor(y / cellSize);
      const k = key(ix, iy);
      let list = cells.get(k);
      if (!list) { list = []; cells.set(k, list); }
      const entry = { x, y, data };
      list.push(entry);
      return entry;
    },
    queryRadius(qx, qy, r, fn) {
      const r2 = r * r;
      const minX = Math.floor((qx - r) / cellSize), maxX = Math.floor((qx + r) / cellSize);
      const minY = Math.floor((qy - r) / cellSize), maxY = Math.floor((qy + r) / cellSize);
      for (let ix = minX; ix <= maxX; ix++) {
        for (let iy = minY; iy <= maxY; iy++) {
          const list = cells.get(key(ix, iy));
          if (!list) continue;
          for (let i = 0; i < list.length; i++) {
            const p = list[i];
            const dx = p.x - qx, dy = p.y - qy;
            const d2 = dx * dx + dy * dy;
            if (d2 <= r2) {
              if (fn(p, dx, dy, d2) === false) return;
            }
          }
        }
      }
    },
    clear() { cells.clear(); }
  };
}
GROW.makeSpatialGrid = makeSpatialGrid;

/* ============================================================
   2. OKLCH Perceptual Color Palette (Björn Ottosson, 2020)
   ============================================================ */
const srgbDec = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const srgbEnc = c => c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
const cbrt = x => x < 0 ? -Math.pow(-x, 1 / 3) : Math.pow(x, 1 / 3);

function rgbToOklch(r, g, b) {
  r = srgbDec(r / 255); g = srgbDec(g / 255); b = srgbDec(b / 255);
  const l = cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return { L, C: Math.hypot(A, B), h: Math.atan2(B, A) * (180 / Math.PI) };
}
GROW.rgbToOklch = rgbToOklch;

function oklchToRgb(L, C, h) {
  const rad = h * Math.PI / 180;
  const A = C * Math.cos(rad), B = C * Math.sin(rad);
  const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
  const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
  const s = Math.pow(L - 0.0894841775 * A - 1.2914855480 * B, 3);
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  const cl = x => Math.min(255, Math.max(0, Math.round(srgbEnc(Math.min(1, Math.max(0, x))) * 255)));
  return [cl(r), cl(g), cl(b)];
}
GROW.oklchToRgb = oklchToRgb;

function makeToneRamp(baseHex, opts = {}) {
  const [r, g, b] = J.hex(baseHex || '#2b4c7e');
  const oklch = rgbToOklch(r, g, b);
  const minL = opts.minL ?? 0.20;
  const maxL = opts.maxL ?? 0.96;
  return function(t) {
    const L = minL + (maxL - minL) * J.clamp(t);
    const C = oklch.C * (1 - (opts.chromaDecay ?? 0.32) * J.clamp(t));
    const [cr, cg, cb] = oklchToRgb(L, C, oklch.h);
    return `rgb(${cr},${cg},${cb})`;
  };
}
GROW.makeToneRamp = makeToneRamp;

/* ============================================================
   3. User Growth Region & Selection Mask Registry
   ============================================================ */
const USER_GROWTH_REGIONS = new Map();

/**
 * Configure user-customized growth zones and erasure masks.
 * Can be called by Cut editor, UI, scripting, or per-cut config.
 * @param {number|Object} cutIndexOrRef - cut index or cut object
 * @param {Object} config - {
 *   preset: 'left'|'right'|'top'|'bottom'|'corners'|'surround'|'center'|'all',
 *   bounds: [x0, y0, x1, y1], // normalized (0..1) or pixel coords
 *   regions: [[x0, y0, x1, y1], ...],
 *   polygon: [[x0, y0], [x1, y1], ...],
 *   mask: (x, y) => boolean,
 *   erase: [{ cx, cy, r }, { x0, y0, x1, y1 }, [cx, cy, r], ...],
 *   root: [x, y], // starting root coordinate (0..1 normalized or absolute)
 *   anchor: 'bottom-left'|'bottom-right'|'bottom-center'|'top-center'|...,
 *   avoidText: boolean // default true
 * }
 */
J.setGrowthRegion = function(cutIndexOrRef, config) {
  USER_GROWTH_REGIONS.set(cutIndexOrRef, config);
};
J.getGrowthRegion = function(cutIndexOrRef) {
  return USER_GROWTH_REGIONS.get(cutIndexOrRef) || null;
};
J.clearGrowthRegions = function() {
  USER_GROWTH_REGIONS.clear();
};
GROW.setGrowthRegion = J.setGrowthRegion;
GROW.getGrowthRegion = J.getGrowthRegion;
GROW.clearGrowthRegions = J.clearGrowthRegions;

/* Convert normalized (0..1) or absolute rectangle to absolute [x0, y0, x1, y1] */
function toAbsRect(r, W, H) {
  let [x0, y0, x1, y1] = r;
  if (x0 <= 1 && x1 <= 1 && y0 <= 1 && y1 <= 1) {
    x0 *= W; x1 *= W; y0 *= H; y1 *= H;
  }
  return [Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)];
}
GROW.toAbsRect = toAbsRect;

/* ============================================================
   4. GrowthField: Decoupled Space & Text Avoidance Canvas
   ============================================================ */
/**
 * Create a GrowthField representing safe space, text bounds, user regions,
 * and adaptive lattice distance field for collision/space-filling.
 */
GROW.createField = function(env, bb0, P = {}, opts = {}) {
  const { W, H } = env;
  const pad = opts.pad ?? Math.min(W, H) * 0.05;
  const textPad = opts.textPad ?? 25;

  // Safe fallback for text bounding box if bb0 is null/undefined
  const bb = bb0 || {
    x0: W * 0.25, x1: W * 0.75,
    y0: H * 0.35, y1: H * 0.65,
    cx: W / 2, cy: H / 2
  };
  const safeBB = {
    x0: bb.x0 - textPad,
    x1: bb.x1 + textPad,
    y0: bb.y0 - textPad,
    y1: bb.y1 + textPad,
  };

  const cutIdx = env.cut ? env.cut.index : null;
  const userConfig = P.growthRegion || P.region || (cutIdx != null ? J.getGrowthRegion(cutIdx) : null) || (env.cut ? J.getGrowthRegion(env.cut) : null) || {};

  // 1. Resolve active inclusion zones (选区)
  const activeRects = [];
  const preset = typeof userConfig === 'string' ? userConfig : (userConfig.preset || P.preset || P.anchorPreset);
  if (preset === 'left') activeRects.push([pad, pad, W * 0.38, H - pad]);
  else if (preset === 'right') activeRects.push([W * 0.62, pad, W - pad, H - pad]);
  else if (preset === 'top') activeRects.push([pad, pad, W - pad, H * 0.38]);
  else if (preset === 'bottom') activeRects.push([pad, H * 0.62, W - pad, H - pad]);
  else if (preset === 'center') activeRects.push([W * 0.2, H * 0.2, W * 0.8, H * 0.8]);
  else if (preset === 'corners') {
    activeRects.push([pad, pad, W * 0.32, H * 0.32]);
    activeRects.push([W * 0.68, pad, W - pad, H * 0.32]);
    activeRects.push([pad, H * 0.68, W * 0.32, H - pad]);
    activeRects.push([W * 0.68, H * 0.68, W - pad, H - pad]);
  } else if (preset === 'surround') {
    const span = Math.min(W, H) * 0.16;
    activeRects.push([Math.max(pad, safeBB.x0 - span), Math.max(pad, safeBB.y0 - span), Math.min(W - pad, safeBB.x1 + span), Math.min(H - pad, safeBB.y1 + span)]);
  }

  // Bounds & user regions
  if (userConfig.bounds && Array.isArray(userConfig.bounds)) {
    activeRects.push(toAbsRect(userConfig.bounds, W, H));
  }
  if (userConfig.regions && Array.isArray(userConfig.regions)) {
    for (const r of userConfig.regions) if (Array.isArray(r)) activeRects.push(toAbsRect(r, W, H));
  }
  if (P.bounds && Array.isArray(P.bounds)) {
    activeRects.push(toAbsRect(P.bounds, W, H));
  }
  if (P.zone) {
    if (Array.isArray(P.zone)) activeRects.push(toAbsRect(P.zone, W, H));
    else if (P.zone.x0 != null) activeRects.push(toAbsRect([P.zone.x0, P.zone.y0, P.zone.x1, P.zone.y1], W, H));
  }

  const userPolygon = userConfig.polygon || P.polygon || null;
  const userMaskFn = typeof userConfig.mask === 'function' ? userConfig.mask : (typeof P.mask === 'function' ? P.mask : null);
  const avoidText = userConfig.avoidText !== false && P.avoidText !== false && !P.ignoreText;

  // 2. Build Lattice Grid
  const gridStep = opts.gridStep ?? Math.max(26, Math.round(Math.min(W, H) * 0.035));
  const gx = [], gy = [], free = [];
  const key = (ix, iy) => `${ix}_${iy}`;
  const lat = new Map();

  const isClearOfText = (x, y) => !(x > safeBB.x0 && x < safeBB.x1 && y > safeBB.y0 && y < safeBB.y1);

  const isInsideInclusion = (x, y) => {
    if (userMaskFn && !userMaskFn(x, y)) return false;
    if (userPolygon && !pointInPoly(x, y, userPolygon)) return false;
    if (activeRects.length > 0) {
      let inAny = false;
      for (const r of activeRects) {
        if (x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]) { inAny = true; break; }
      }
      if (!inAny) return false;
    }
    return true;
  };

  const getDistToBoundary = (x, y) => {
    let d = Math.min(x - pad, W - pad - x, y - pad, H - pad - y);
    if (activeRects.length > 0) {
      let maxDistInRects = -1e9;
      for (const r of activeRects) {
        if (x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3]) {
          const dToR = Math.min(x - r[0], r[2] - x, y - r[1], r[3] - y);
          if (dToR > maxDistInRects) maxDistInRects = dToR;
        }
      }
      d = Math.max(0, maxDistInRects);
    }
    if (avoidText) {
      if (x < safeBB.x0) d = Math.min(d, safeBB.x0 - x);
      else if (x > safeBB.x1) d = Math.min(d, x - safeBB.x1);
      if (y < safeBB.y0) d = Math.min(d, safeBB.y0 - y);
      else if (y > safeBB.y1) d = Math.min(d, y - safeBB.y1);
    }
    return d;
  };

  for (let x = pad; x <= W - pad; x += gridStep) {
    for (let y = pad; y <= H - pad; y += gridStep) {
      if (avoidText && !isClearOfText(x, y)) continue;
      if (!isInsideInclusion(x, y)) continue;

      const d = getDistToBoundary(x, y);
      if (d > 8) {
        const idx = gx.length;
        gx.push(x); gy.push(y); free.push(d);
        lat.set(key(Math.floor(x / gridStep), Math.floor(y / gridStep)), idx);
      }
    }
  }

  // 3. Dynamic Erasure Operations
  const eraseDisc = (cx, cy, radius, k = 0.85) => {
    const R = radius * k;
    for (let i = 0; i < gx.length; i++) {
      const d = Math.hypot(gx[i] - cx, gy[i] - cy) - R;
      if (d < free[i]) free[i] = Math.max(0, d);
    }
  };

  const eraseRect = (x0, y0, x1, y1) => {
    const minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1), maxY = Math.max(y0, y1);
    for (let i = 0; i < gx.length; i++) {
      if (gx[i] >= minX && gx[i] <= maxX && gy[i] >= minY && gy[i] <= maxY) {
        free[i] = 0;
      }
    }
  };

  // Apply user-defined exclusion / erasure zones
  const eraseZones = userConfig.erase || userConfig.eraseZones || userConfig.exclude || P.erase || null;
  if (eraseZones && Array.isArray(eraseZones)) {
    for (const ez of eraseZones) {
      if (ez.r != null || ez.radius != null) {
        eraseDisc(ez.cx ?? ez.x ?? 0, ez.cy ?? ez.y ?? 0, ez.r ?? ez.radius ?? 50, 1.0);
      } else if (ez.x0 != null && ez.x1 != null) {
        eraseRect(ez.x0, ez.y0, ez.x1, ez.y1);
      } else if (Array.isArray(ez) && ez.length === 4) {
        eraseRect(ez[0], ez[1], ez[2], ez[3]);
      } else if (Array.isArray(ez) && ez.length === 3) {
        eraseDisc(ez[0], ez[1], ez[2], 1.0);
      }
    }
  }

  // 4. Find maximum available hole in free distance field
  const findMaxHole = (minDist = 20) => {
    let bestDist = -1, bestIdx = -1;
    for (let i = 0; i < gx.length; i++) {
      if (free[i] > bestDist) {
        bestDist = free[i];
        bestIdx = i;
      }
    }
    if (bestIdx < 0 || bestDist < minDist) return null;
    return { x: gx[bestIdx], y: gy[bestIdx], dist: bestDist, idx: bestIdx };
  };

  // 5. Resolve Starting Root and Target Vector
  const getRootAndTarget = () => {
    const rightSide = Boolean(P.right);
    const bottomSide = Boolean(P.low);

    // Explicit user root coordinate [x, y]
    const rootCoord = userConfig.root || P.root || P.origin;
    if (rootCoord && Array.isArray(rootCoord) && rootCoord.length >= 2) {
      let rx = rootCoord[0] <= 1 ? rootCoord[0] * W : rootCoord[0];
      let ry = rootCoord[1] <= 1 ? rootCoord[1] * H : rootCoord[1];
      let ty = userConfig.targetY ?? (ry < H / 2 ? H - pad * 2 : pad * 2);
      let tx = userConfig.targetX ?? (rx < W / 2 ? W - pad * 2 : pad * 2);
      return { rootX: rx, rootY: ry, targetX: tx, targetY: ty, sideX: rx > W / 2 ? 1 : -1, sideY: ry > H / 2 ? 1 : -1 };
    }

    // Named anchor preset
    const anchor = P.anchor || userConfig.anchor;
    if (anchor === 'bottom-center') return { rootX: W * 0.5, rootY: H - pad * 1.5, targetX: W * 0.5, targetY: pad * 2, sideX: 0, sideY: 1 };
    if (anchor === 'top-center')    return { rootX: W * 0.5, rootY: pad * 1.5, targetX: W * 0.5, targetY: H - pad * 2, sideX: 0, sideY: -1 };
    if (anchor === 'left')          return { rootX: pad * 1.5, rootY: H * 0.5, targetX: W - pad * 2, targetY: H * 0.5, sideX: -1, sideY: 0 };
    if (anchor === 'right')         return { rootX: W - pad * 1.5, rootY: H * 0.5, targetX: pad * 2, targetY: H * 0.5, sideX: 1, sideY: 0 };
    if (anchor === 'center')        return { rootX: W * 0.5, rootY: H * 0.5, targetX: W * 0.5, targetY: pad * 1.5, sideX: 0, sideY: 0 };
    if (anchor === 'top-left')      return { rootX: pad * 1.5, rootY: pad * 1.5, targetX: W - pad * 2, targetY: H - pad * 2, sideX: -1, sideY: -1 };
    if (anchor === 'top-right')     return { rootX: W - pad * 1.5, rootY: pad * 1.5, targetX: pad * 2, targetY: H - pad * 2, sideX: 1, sideY: -1 };
    if (anchor === 'bottom-left')   return { rootX: pad * 1.5, rootY: H - pad * 1.5, targetX: W - pad * 2, targetY: pad * 2, sideX: -1, sideY: 1 };
    if (anchor === 'bottom-right')  return { rootX: W - pad * 1.5, rootY: H - pad * 1.5, targetX: pad * 2, targetY: pad * 2, sideX: 1, sideY: 1 };

    // Active rect boundary default
    if (activeRects.length > 0) {
      const r0 = activeRects[0];
      const rx = rightSide ? r0[2] - 20 : r0[0] + 20;
      const ry = bottomSide ? r0[3] - 20 : r0[1] + 20;
      const ty = bottomSide ? r0[1] + 20 : r0[3] - 20;
      const tx = rightSide ? r0[0] + 20 : r0[2] - 20;
      return { rootX: rx, rootY: ry, targetX: tx, targetY: ty, sideX: rightSide ? 1 : -1, sideY: bottomSide ? 1 : -1 };
    }

    // Default 4-corner right/low origin
    const rx = rightSide ? W - pad * 1.5 : pad * 1.5;
    const ry = bottomSide ? H - pad * 1.5 : pad * 1.5;
    const ty = bottomSide ? pad * 2 : H - pad * 2;
    const tx = rightSide ? pad * 2 : W - pad * 2;
    return { rootX: rx, rootY: ry, targetX: tx, targetY: ty, sideX: rightSide ? 1 : -1, sideY: bottomSide ? 1 : -1 };
  };

  // 6. Debug visualizer
  const debugDraw = (ctx, opts = {}) => {
    ctx.save();
    // Inclusion rects
    if (activeRects.length > 0) {
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      for (const r of activeRects) ctx.strokeRect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
    }
    // User polygon
    if (userPolygon && userPolygon.length > 2) {
      ctx.strokeStyle = '#00ffff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(userPolygon[0][0], userPolygon[0][1]);
      for (let i = 1; i < userPolygon.length; i++) ctx.lineTo(userPolygon[i][0], userPolygon[i][1]);
      ctx.closePath();
      ctx.stroke();
    }
    // Exclusion zones
    if (eraseZones && Array.isArray(eraseZones)) {
      ctx.strokeStyle = '#ff3366';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      for (const ez of eraseZones) {
        const cx = ez.cx ?? ez.x, cy = ez.cy ?? ez.y, r = ez.r ?? ez.radius;
        if (r) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke(); }
      }
    }
    ctx.restore();
  };

  return {
    W, H, pad, textPad, safeBB, avoidText,
    userConfig, activeRects, userPolygon, eraseZones,
    gridStep, gx, gy, free, lat,
    isClearOfText, isInsideInclusion, getDistToBoundary,
    eraseDisc, eraseRect, findMaxHole, getRootAndTarget,
    debugDraw
  };
};

/* ============================================================
   5. Reusable Growth Decor Lifecycle Runner & Cache Manager
   ============================================================ */
const SHARED_GROWTH_CACHE = new WeakMap();
GROW.CACHE = SHARED_GROWTH_CACHE;

/**
 * Creates a standard JIZURA decor definition with automatic caching,
 * scrubbing time progression, and pass guards.
 *
 * @param {Object} def - {
 *   name: string,
 *   tags: string[],
 *   layer: 'back'|'front',
 *   themeMode: string,
 *   build(env, bb0, P, field, rng): Object, // Returns skeleton
 *   render(ctx, skel, pGrowth, pAlpha, env, P, ramp): void
 * }
 * @param {Object} opts - { growthSpeed: 0.85, ease: Function }
 */
GROW.createRunner = function(def, opts = {}) {
  const speed = opts.growthSpeed ?? 0.85;
  const easeFn = opts.ease ?? E.outCubic;
  const themeMode = def.themeMode || def.name;
  const tags = Array.isArray(def.tags)
    ? (def.tags.includes('生长') ? ['生长', ...def.tags.filter(t => t !== '生长')] : ['生长', ...def.tags])
    : ['生长'];
  const vibes = Array.isArray(def.vibes)
    ? (def.vibes.includes('grow') ? def.vibes : ['grow', ...def.vibes])
    : ['grow'];

  const runner = {
    name: def.name,
    tags,
    vibes,
    set: def.set || 'grow',
    layer: def.layer || 'back',
    w: def.w || 2,
    grow: true,
    params: Object.assign({ density: 1.0, preset: 'default', speed: speed }, def.params || {}),
    presets: Object.assign({
      default: { density: 1.0 },
      dense: { density: 1.5 },
      sparse: { density: 0.5 },
      corner_bl: { anchor: 'bottom-left' },
      corner_br: { anchor: 'bottom-right' },
      center: { anchor: 'center' }
    }, def.presets || {}),
    draw(env, bb0, P = {}) {
      if (env.pass !== 'main') return;
      const { ctx, sc, W, H } = env;

      // 1. Resolve merged parameters with presets & user overrides
      const actP = Object.assign({}, runner.params);
      if (P.preset && runner.presets && runner.presets[P.preset]) {
        Object.assign(actP, runner.presets[P.preset]);
      }
      Object.assign(actP, P);

      const dur = env.cut ? env.cut.dur : 3.0;
      const effSpeed = actP.growthSpeed ?? actP.speed ?? speed;
      const pGrowth = easeFn(J.clamp(env.lt / (dur * effSpeed)));
      const pAlpha = (1 - E.inCubic(env.pOut));
      if (pGrowth <= 0.001 || pAlpha <= 0.001) return;

      const seedVal = actP.seed ?? env.cut?.seed ?? 42;

      // 2. High-performance multi-decor composite cache per cut
      let cutCache = env.cut ? SHARED_GROWTH_CACHE.get(env.cut) : null;
      if (!cutCache || typeof cutCache.get !== 'function') {
        cutCache = new Map();
        if (env.cut) SHARED_GROWTH_CACHE.set(env.cut, cutCache);
      }

      const actPreset = actP.preset || '';
      const actDensity = actP.density ?? 1;
      const actAnchor = actP.anchor || '';
      const actAvoidText = actP.avoidText !== false && !actP.ignoreText ? 1 : 0;
      const boundsKey = actP.bounds ? JSON.stringify(actP.bounds) : (actP.growthRegion && actP.growthRegion.bounds ? JSON.stringify(actP.growthRegion.bounds) : '');
      const rootKey = actP.root ? JSON.stringify(actP.root) : '';
      const zoneKey = actP.zone ? JSON.stringify(actP.zone) : '';
      const cacheKey = `${themeMode}:${seedVal}:${actPreset}:${actDensity}:${actAnchor}:${actAvoidText}:${boundsKey}:${rootKey}:${zoneKey}:${W}x${H}`;

      let skel = cutCache.get(cacheKey);
      if (!skel) {
        const rng = makeRng(seedVal);
        const field = GROW.createField(env, bb0, actP, opts);
        skel = def.build(env, bb0, actP, field, rng);
        skel._themeMode = themeMode;
        skel._seed = seedVal;
        skel._cacheKey = cacheKey;
        cutCache.set(cacheKey, skel);
      }

      const baseCol = actP.accent ? sc.accent : (sc.ink || sc.fg);
      const ramp = def.ramp ? def.ramp(baseCol, actP) : makeToneRamp(baseCol);

      ctx.save();
      ctx.globalAlpha = pAlpha;
      def.render(ctx, skel, pGrowth, pAlpha, env, actP, ramp);
      ctx.restore();
    }
  };

  return runner;
};

/* ============================================================
   6. Reusable Material Passes & Shaders
   ============================================================ */
/**
 * Decoupled Watercolor Pass (pigment wash + pooling mottle + lifted streaks)
 */
GROW.watercolorPass = function(ctx, renderShape, opts = {}) {
  const rng = opts.rng || makeRng(opts.seed || 12345);
  const tone = opts.tone || (t => `rgba(27, 59, 111, ${0.3 + 0.7 * (1 - t)})`);
  const bbox = opts.bbox || { x: 0, y: 0, w: 200, h: 200 };

  ctx.save();
  ctx.beginPath();
  renderShape(ctx);
  ctx.clip();

  // base wash
  ctx.fillStyle = tone(opts.baseTone ?? 0.35);
  ctx.globalAlpha = opts.baseAlpha ?? 0.85;
  ctx.fillRect(bbox.x, bbox.y, bbox.w, bbox.h);

  // mottle: pigment pooling blobs
  const nBlobs = opts.nBlobs ?? 8;
  const dark = opts.dark ?? 0.15;
  const light = opts.light ?? 0.55;
  for (let i = 0; i < nBlobs; i++) {
    const bx = rng.range(bbox.x, bbox.x + bbox.w);
    const by = rng.range(bbox.y, bbox.y + bbox.h);
    const br = rng.range(bbox.w * 0.1, bbox.w * 0.35);
    ctx.beginPath();
    const segs = 7;
    for (let k = 0; k < segs; k++) {
      const a = k / segs * TAU;
      const r = br * rng.range(0.6, 1.3);
      const px = bx + Math.cos(a) * r, py = by + Math.sin(a) * r;
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = rng.chance(0.6) ? tone(dark) : tone(light);
    ctx.globalAlpha = rng.range(0.12, 0.24);
    ctx.fill();
  }

  // lifted streaks (veins / highlight cuts)
  if (opts.streaks) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = opts.streakWidth ?? 1.5;
    for (const [p0, p1, p2, p3] of opts.streaks) {
      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1]);
      ctx.bezierCurveTo(p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]);
      ctx.stroke();
    }
  }

  ctx.restore();
};
// Backward compatibility alias
J.growWatercolorPass = GROW.watercolorPass;

/**
 * Tapered Line Bucket Batch Renderer
 * For multi-level lineWidth networks (Hyphae, lightning, tree capillaries)
 * Grouped into buckets to achieve 60FPS with minimal Draw Calls.
 */
GROW.renderTaperedBuckets = function(ctx, buckets, pGrowth, opts = {}) {
  for (let b = 0; b < buckets.length; b++) {
    const bucket = buckets[b];
    if (!bucket.segments || bucket.segments.length === 0) continue;

    ctx.beginPath();
    let hasLine = false;
    for (let i = 0; i < bucket.segments.length; i++) {
      const seg = bucket.segments[i];
      if (pGrowth < seg.at) continue;

      hasLine = true;
      if (seg.head && pGrowth < seg.atEnd) {
        // partial interpolation on leading tip
        const t = (pGrowth - seg.at) / (seg.atEnd - seg.at);
        ctx.moveTo(seg.x0, seg.y0);
        ctx.lineTo(J.lerp(seg.x0, seg.x1, t), J.lerp(seg.y0, seg.y1, t));
      } else {
        ctx.moveTo(seg.x0, seg.y0);
        ctx.lineTo(seg.x1, seg.y1);
      }
    }

    if (hasLine) {
      ctx.strokeStyle = bucket.color || opts.color || '#fff';
      ctx.lineWidth = bucket.width || 1;
      if (bucket.cap) ctx.lineCap = bucket.cap;
      ctx.stroke();
    }
  }
};

/* ============================================================
   7. Continuous Circle-Packing Hyphae Engine (inconvergent/hyphae_ani)
   High-performance zero-GC continuous space-filling growth
   ============================================================ */
GROW.buildHyphaeSkeleton = function(env, bb0, P, field, rng, opts = {}) {
  const { W, H } = env;
  const D = J.clamp(P.density ?? 1, 0.4, 2.5);
  const NMAX = Math.min(2400, Math.max(350, Math.floor((opts.maxNodes ?? 1200) * D)));

  const X = new Float32Array(NMAX);
  const Y = new Float32Array(NMAX);
  const R = new Float32Array(NMAX);
  const THE = new Float32Array(NMAX);
  const P_IDX = new Int16Array(NMAX);
  const D_IDX = new Int16Array(NMAX).fill(-1);
  const GE = new Int16Array(NMAX);
  const C = new Uint8Array(NMAX);
  const DEPTH = new Int16Array(NMAX);

  const cellSize = Math.max(26, Math.round(Math.min(W, H) / 28));
  const cols = Math.ceil(W / cellSize) + 2;
  const rows = Math.ceil(H / cellSize) + 2;
  const gridHead = new Int32Array(cols * rows).fill(-1);
  const nodeNext = new Int32Array(NMAX).fill(-1);

  const queue = new Int32Array(NMAX * 16);
  let qHead = 0, qTail = 0;
  let num = 0;

  const { rootX, rootY, targetX, targetY } = field.getRootAndTarget();
  const baseAng = Math.atan2(targetY - rootY, targetX - rootX);
  const baseRad = Math.min(W, H) * (opts.baseRadiusRatio ?? 0.024) * (opts.radMultiplier || 1);
  const minRad = Math.max(1.8, baseRad * 0.12);

  const nRoots = Math.min(4, Math.max(1, P.roots ?? (P.accent ? 3 : 2)));
  for (let i = 0; i < nRoots; i++) {
    const ang = baseAng + rng.sym(0.35) + (i - (nRoots - 1) / 2) * 0.22;
    const rx = rootX + rng.sym(14);
    const ry = rootY + rng.sym(14);
    X[num] = rx;
    Y[num] = ry;
    R[num] = baseRad * rng.range(0.85, 1.15);
    THE[num] = ang;
    P_IDX[num] = -1;
    GE[num] = 1;
    DEPTH[num] = 0;

    const ci = Math.floor(rx / cellSize) + 1;
    const cj = Math.floor(ry / cellSize) + 1;
    const cell = cj * cols + ci;
    nodeNext[num] = gridHead[cell];
    gridHead[cell] = num;
    queue[qTail++] = num++;
  }

  const CK_MAX = P.ckMax ?? (opts.ckMax ?? 10);
  const RAD_SCALE = P.radScale ?? (opts.radScale ?? 0.93);
  const SEARCH_EXP = P.searchExp ?? (opts.searchExp ?? 0.09);
  const SEARCH_MAX = (P.wildness ?? 1) * (opts.searchMax ?? (Math.PI * 1.35));
  const pad = field.pad;

  while (qHead < qTail && num < NMAX) {
    const k = queue[qHead++];
    C[k]++;
    if (C[k] > CK_MAX) continue;

    const isBranch = D_IDX[k] >= 0;
    const r = isBranch ? R[k] * RAD_SCALE : R[k];
    if (r < minRad) continue;

    const ge = isBranch ? GE[k] + 1 : GE[k];
    const angleSpread = rng.sym(1) * (isBranch ? SEARCH_MAX * 0.65 : SEARCH_MAX * 0.35);
    const the = THE[k] + (1 - 1 / Math.pow(ge + 1, SEARCH_EXP)) * angleSpread;

    const nx = X[k] + Math.cos(the) * r;
    const ny = Y[k] + Math.sin(the) * r;

    // Bounds check
    if (nx <= pad || nx >= W - pad || ny <= pad || ny >= H - pad) {
      queue[qTail++] = k;
      continue;
    }
    // Text avoidance & user region inclusion checks
    if (field.avoidText && !field.isClearOfText(nx, ny)) {
      queue[qTail++] = k;
      continue;
    }
    if (!field.isInsideInclusion(nx, ny)) {
      queue[qTail++] = k;
      continue;
    }

    const ci = Math.floor(nx / cellSize) + 1;
    const cj = Math.floor(ny / cellSize) + 1;
    let collision = false;

    checkGrid:
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        let curr = gridHead[(cj + dj) * cols + (ci + di)];
        while (curr !== -1) {
          if (curr !== k && curr !== P_IDX[k]) {
            const dx = X[curr] - nx, dy = Y[curr] - ny;
            const minD = (R[curr] + r) * 0.49;
            if (dx * dx + dy * dy < minD * minD) {
              collision = true;
              break checkGrid;
            }
          }
          curr = nodeNext[curr];
        }
      }
    }

    if (!collision) {
      X[num] = nx; Y[num] = ny; R[num] = r; THE[num] = the;
      P_IDX[num] = k; GE[num] = ge;
      DEPTH[num] = DEPTH[k] + 1;
      if (D_IDX[k] < 0) D_IDX[k] = num;

      const cell = cj * cols + ci;
      nodeNext[num] = gridHead[cell];
      gridHead[cell] = num;

      queue[qTail++] = k;
      queue[qTail++] = num;
      num++;
    } else {
      queue[qTail++] = k;
    }
  }

  let maxDepth = 1;
  for (let i = 0; i < num; i++) if (DEPTH[i] > maxDepth) maxDepth = DEPTH[i];

  const T = new Float32Array(num);
  for (let i = 0; i < num; i++) {
    T[i] = 0.65 * (DEPTH[i] / maxDepth) + 0.35 * (i / num);
  }

  // Organize into 4 line width buckets for GROW.renderTaperedBuckets
  const b0 = { width: Math.max(3.2, Math.min(W, H) * 0.0038), cap: 'round', segments: [] }; // Tier 0: Trunk (ge <= 2)
  const b1 = { width: Math.max(2.2, Math.min(W, H) * 0.0026), cap: 'round', segments: [] }; // Tier 1: Main branch (ge <= 5)
  const b2 = { width: Math.max(1.4, Math.min(W, H) * 0.0017), cap: 'round', segments: [] }; // Tier 2: Fine branch (ge <= 9)
  const b3 = { width: Math.max(0.8, Math.min(W, H) * 0.0010), cap: 'round', segments: [] }; // Tier 3: Capillaries (ge > 9)

  const spores = [];

  for (let i = 1; i < num; i++) {
    const p = P_IDX[i];
    if (p < 0) continue;
    const at = T[p];
    const atEnd = Math.max(at + 0.015, T[i]);
    const seg = { x0: X[p], y0: Y[p], x1: X[i], y1: Y[i], at, atEnd, head: true };

    if (GE[i] <= 2) b0.segments.push(seg);
    else if (GE[i] <= 5) b1.segments.push(seg);
    else if (GE[i] <= 9) b2.segments.push(seg);
    else b3.segments.push(seg);

    if (D_IDX[i] < 0 || (R[i] < baseRad * 0.3 && rng.chance(0.2))) {
      spores.push({ x: X[i], y: Y[i], r: Math.max(1.6, R[i] * 0.38), at: atEnd });
    }
  }

  return { num, buckets: [b0, b1, b2, b3], spores, field, themeMode: 'hyphae' };
};

})();
