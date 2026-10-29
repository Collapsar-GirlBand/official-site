/* ============================================================
   JIZURA — registries for the newer expression groups + a single
   registration helper used by every expression pack (src/11p_*.js)

   group    registry      order array          picked per
   layout   J.LAYOUTS     J.LAYOUT_ORDER       cut
   enter    J.ENTER       J.ENTER_ORDER        cut
   hold     J.HOLD        J.HOLD_ORDER         cut
   exit     J.EXIT        J.EXIT_ORDER         cut
   decor    J.DECOR       J.DECOR_ORDER        cut (0..n)
   treat    J.TREAT       J.TREAT_ORDER        cut   text treatment (outline, extrude, marker…)
   bg       J.BG          J.BG_ORDER           line  full-screen background graphic
   cam      J.CAMERA      J.CAMERA_ORDER       cut   camera move over the cut
   fx       J.FXE         J.FXE_ORDER          event post-processing / transition effect
   trans    J.TRANS       J.TRANS_ORDER        cut   how this cut takes over from the previous one (both frames composited)

   Common optional fields on every entry:
     name  (Japanese label, required)   tags  (mood keys it suits: glitch calm pop graphic editorial emotional)
     w     (base pick weight, default 1)  pack (set by J.register)
   ============================================================ */
(() => {
'use strict';

J.TREAT = { none: { name: 'なし', apply() {} } };
J.TREAT_ORDER = ['none'];
J.BG = { none: { name: '無地', draw() {} } };
J.BG_ORDER = ['none'];
J.CAMERA = {
  push: { name: 'ゆっくり寄る', tags: ['calm', 'editorial', 'emotional', 'graphic', 'pop', 'glitch'], w: 5,
    get: (env) => ({ s: 1 + 0.03 * (env.fx.motion ?? 0.7) * J.clamp(env.lt / Math.max(0.3, env.cut.dur)) }) },
};
J.CAMERA_ORDER = ['push'];
// post / transition effects. Entries without draw() are handled by the renderer's built-in branch.
J.FXE = {
  glitch: { name: 'グリッチ（複合）', builtin: true },
  slice:  { name: 'スライスグリッチ', builtin: true },
  block:  { name: 'ブロックグリッチ', builtin: true },
  invert: { name: '反転', builtin: true },
  flash:  { name: 'フラッシュ', builtin: true },
  zoom:   { name: 'ズームブラー', builtin: true },
  mosaic: { name: 'モザイク', builtin: true },
  shake:  { name: '揺れ', builtin: true },
  chroma: { name: '色ズレの跳ね', builtin: true },
};
J.FXE_ORDER = ['glitch', 'chroma', 'shake', 'slice', 'block', 'invert', 'flash', 'zoom', 'mosaic'];
// cut-to-cut transitions: draw(ctx, A, B, p, info) composites the previous cut (A) and this cut (B) in device pixels
J.TRANS = {};
J.TRANS_ORDER = [];

const GROUPS = {
  layout: ['LAYOUTS', 'LAYOUT_ORDER'], enter: ['ENTER', 'ENTER_ORDER'], hold: ['HOLD', 'HOLD_ORDER'], exit: ['EXIT', 'EXIT_ORDER'],
  decor: ['DECOR', 'DECOR_ORDER'], treat: ['TREAT', 'TREAT_ORDER'], bg: ['BG', 'BG_ORDER'], cam: ['CAMERA', 'CAMERA_ORDER'], fx: ['FXE', 'FXE_ORDER'], trans: ['TRANS', 'TRANS_ORDER'],
};
J.GROUP_KEYS = Object.keys(GROUPS);
J.registry = g => J[GROUPS[g][0]];
J.order = g => J[GROUPS[g][1]];

/* J.register('layout', 'myKey', { name: '…', … }, 'packName') */
J.register = (group, key, def, pack) => {
  const G = GROUPS[group];
  if (!G) throw new Error('unknown group ' + group);
  if (!def || !def.name) throw new Error(`${group}.${key}: name is required`);
  const reg = J[G[0]], order = J[G[1]];
  if (reg[key] && reg[key].pack !== pack) console.warn(`JIZURA: ${group}.${key} is being replaced`);
  def.pack = pack || def.pack || 'core';
  reg[key] = def;
  if (!def.special && !order.includes(key)) order.push(key);
  if (J.CODE_MAP && GROUP_CODE_PREFIX[group]) {
    const pfx = GROUP_CODE_PREFIX[group];
    if (!def.code) {
      const items = order.filter(k => reg[k] && !reg[k].special);
      def.code = pfx + items.length;
    }
    J.CODE_MAP[def.code.toUpperCase()] = { group, key, def };
  }
  return def;
};
J.registerAll = (group, defs, pack) => { for (const k of Object.keys(defs)) J.register(group, k, defs[k], pack); };

/* items whose tags include a mood key (used by おまかせ) */
J.taggedWith = (group, mood) => J.order(group).filter(k => { const d = J.registry(group)[k]; return d && d.tags && d.tags.includes(mood); });

/* Effect code prefixes & quick search utilities */
const GROUP_CODE_PREFIX = {
  layout: 'A',
  enter: 'B',
  hold: 'C',
  exit: 'D',
  decor: 'E',
  treat: 'F',
  bg: 'G',
  cam: 'H',
  fx: 'I',
  trans: 'J',
};
J.GROUP_CODE_PREFIX = GROUP_CODE_PREFIX;

J.initEffectCodes = () => {
  J.CODE_MAP = {};
  for (const g of J.GROUP_KEYS) {
    const prefix = J.GROUP_CODE_PREFIX[g];
    if (!prefix) continue;
    const reg = J.registry(g);
    const order = J.order(g);
    if (!reg || !order) continue;
    const items = order.filter(k => reg[k] && !reg[k].special);
    items.forEach((k, idx) => {
      const code = reg[k].code || (prefix + (idx + 1));
      reg[k].code = code;
      J.CODE_MAP[code.toUpperCase()] = { group: g, key: k, def: reg[k] };
    });
  }
};

J.codeOf = (g, key) => {
  if (!key) return '';
  const reg = J.registry(g);
  if (!reg || !reg[key]) return '';
  if (!reg[key].code) J.initEffectCodes();
  return reg[key].code || '';
};

J.findByCode = (code) => {
  if (!code) return null;
  if (!J.CODE_MAP) J.initEffectCodes();
  const c = String(code).trim().toUpperCase();
  if (J.CODE_MAP[c]) return J.CODE_MAP[c];
  const norm = c.replace(/^([A-Z]+)0+([1-9]\d*)$/, '$1$2');
  if (J.CODE_MAP[norm]) return J.CODE_MAP[norm];
  return null;
};

J.matchEffect = (g, k, query) => {
  if (!query) return true;
  const q = String(query).trim().toLowerCase();
  if (!q) return true;
  const reg = J.registry(g);
  const def = reg && reg[k];
  if (!def) return false;
  const code = (def.code || J.codeOf(g, k) || '').toLowerCase();
  const name = (def.name || '').toLowerCase();
  const key = String(k).toLowerCase();

  // Match code directly: exact or startsWith
  if (code) {
    if (code === q || code.startsWith(q)) return true;
    const normQ = q.replace(/\s+/g, '').replace(/^([a-z]+)0+([1-9]\d*)$/i, '$1$2');
    if (code === normQ || code.startsWith(normQ)) return true;
    const numPart = code.replace(/^[a-z]+/i, '');
    if (/^\d+$/.test(q) && (numPart === q || numPart.startsWith(q))) return true;
  }

  // Match name
  if (name.includes(q)) return true;

  // Match key
  if (key.includes(q)) return true;

  // Match tags
  if (def.tags && Array.isArray(def.tags)) {
    if (def.tags.some(t => String(t).toLowerCase().includes(q))) return true;
  }
  return false;
};

J.effectScore = (g, k, query) => {
  if (!query) return 0;
  const q = String(query).trim().toLowerCase();
  if (!q) return 0;
  const reg = J.registry(g);
  const def = reg && reg[k];
  if (!def) return 999;
  const code = (def.code || J.codeOf(g, k) || '').toLowerCase();
  const name = (def.name || '').toLowerCase();
  const key = String(k).toLowerCase();
  const normQ = q.replace(/\s+/g, '').replace(/^([a-z]+)0+([1-9]\d*)$/i, '$1$2');

  // Exact code match: highest priority
  if (code && (code === q || code === normQ)) return 1;

  // Exact name or key match
  if (name === q || key === q) return 2;

  // Code starts with query (e.g. "b" -> b1, b2... or "b2" -> b20...)
  if (code && (code.startsWith(q) || code.startsWith(normQ))) {
    return 10 + code.length;
  }

  // Number match: exact number
  const numPart = code.replace(/^[a-z]+/i, '');
  if (/^\d+$/.test(q) && numPart === q) return 15;

  // Name or key starts with query
  if (name.startsWith(q) || key.startsWith(q)) return 20;

  // Number starts with query
  if (/^\d+$/.test(q) && numPart.startsWith(q)) return 25 + numPart.length;

  // Name contains query
  if (name.includes(q)) return 30;

  // Key contains query
  if (key.includes(q)) return 40;

  // Tag match
  if (def.tags && Array.isArray(def.tags) && def.tags.some(t => String(t).toLowerCase().includes(q))) return 50;

  return 100;
};

J.searchAllEffects = (query) => {
  if (!query) return [];
  const q = String(query).trim().toLowerCase();
  if (!q) return [];
  const results = [];
  for (const g of J.GROUP_KEYS) {
    const reg = J.registry(g);
    const items = J.order(g).filter(k => reg[k] && !reg[k].special);
    for (const k of items) {
      if (J.matchEffect(g, k, q)) {
        results.push({ group: g, key: k, code: reg[k].code, name: reg[k].name, def: reg[k] });
      }
    }
  }
  results.sort((a, b) => J.effectScore(a.group, a.key, q) - J.effectScore(b.group, b.key, q));
  return results;
};
})();
