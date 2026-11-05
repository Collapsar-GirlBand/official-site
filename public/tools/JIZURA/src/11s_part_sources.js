/* Library visibility groups, not an audit of fork authorship.
   Keep the fixed baseline unchanged when adding components. */
(() => {
'use strict';
J.PART_SOURCE_LABELS = { existing: '已有', retained: '保留', custom: '后加', system: '基础' };
const aliases = { upstream: 'existing', modified: 'retained', unknown: 'retained' };
const explicit = d => Object.hasOwn(J.PART_SOURCE_LABELS, d?.source) ? d.source : aliases[d?.source];
const isCL = d => d && (d.cl || d.pack === 'decorC' || d.tags?.includes('cl'));
const classify = (g, k, d) => {
  if (!d) return 'retained';
  if (isCL(d)) return 'custom'; // confirmed by the user
  if (explicit(d)) return explicit(d);
  if (g === 'font' || g === 'scheme' || d.special || k === 'none'
    || ['enter', 'exit'].includes(g) && k === 'cut' || g === 'hold' && k === 'still') return 'system';
  // A new ID is a later addition even when inserted into an existing pack/file.
  return J.PART_BASELINE?.[g]?.[k] || 'custom';
};
J.sourceOfDefinition = d => isCL(d) ? 'custom' : explicit(d) || 'custom';
J.partSource = (g, k) => {
  if (g === 'font' || g === 'scheme') return 'system';
  const d = g === 'style' ? J.STYLES[k] : J.registry(g)?.[k];
  return classify(g, k, d);
};
J.partVisible = (project, g, k) => !project?.vibeGeneration?.hideOriginal || J.partSource(g, k) !== 'existing';
const matches = J.matchesVibe;
J.matchesVibe = (p, v, g, k, subset) => J.partVisible(p, g, k) && matches(p, v, g, k, subset);
const randomOk = J.randomOk;
J.randomOk = (p, g, k) => {
  if (!J.partVisible(p, g, k)) return false;
  const kept = ['custom', 'retained'].includes(J.partSource(g, k));
  return randomOk(p?.vibeGeneration?.hideOriginal && kept ? Object.assign({}, p, { extra: true }) : p, g, k);
};
// Covers files loaded before this module as well as later runtime registrations.
for (const g of J.GROUP_KEYS) for (const k of J.order(g)) {
  const d = J.registry(g)[k]; if (d) d.source = classify(g, k, d);
}
for (const k of J.STYLE_ORDER) J.STYLES[k].source = classify('style', k, J.STYLES[k]);
const register = J.register;
J.register = (g, k, d, pack) => {
  d.source = classify(g, k, Object.assign({}, d, { pack: pack || d.pack }));
  return register(g, k, d, pack);
};
J.register('cam', 'sourceStatic', { name: '静止', source: 'system', special: true, get: () => ({ s: 1 }) }, 'system');
})();
