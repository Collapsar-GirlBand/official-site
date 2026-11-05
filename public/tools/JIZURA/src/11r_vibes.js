/* Vibe collections reference existing parts; membership is saved with the project. */
(() => {
'use strict';
J.VIBES = {
  xxt: { name: '星宿叹', custom: true },
  collapsar: { name: '坍缩星', custom: true },
  xxmd: { name: '向晓昧旦', custom: true },
  zzjm: { name: '庄重静谧', custom: true },
  audio_vis: { name: '音频可视化', custom: true },
  grow: { name: '生长', tag: '生长' },
  glitch: { name: '故障', tag: 'glitch' }, calm: { name: '静谧', tag: 'calm' },
  pop: { name: '流行', tag: 'pop' }, graphic: { name: '图形', tag: 'graphic' },
  editorial: { name: '编辑排版', tag: 'editorial' }, emotional: { name: '情绪', tag: 'emotional' },
  horror: { name: '惊悚', tag: 'horror' },
};
const normVibe = v =>
  v === 'xingxutan' ? 'xxt' :
  (v === 'collapse' || v === 'tsx') ? 'collapsar' :
  (v === 'audiovis' || v === 'audio' || v === 'audio_vis') ? 'audio_vis' :
  (v === 'xxmd' || v === 'xiangxiaomeidan' || v === 'xiangxiao' || v === 'meidan') ? 'xxmd' :
  (v === 'zzjm' || v === 'zhuangzhongjingmi' || v === 'zhuangzhong' || v === 'solemn') ? 'zzjm' :
  (v === 'growth' || v === 'shengzhang') ? 'grow' : v;

const definition = (g, k) => g === 'style' ? J.STYLES[k] : g === 'font' ? J.FONTS[k]
  : J.GROUP_KEYS.includes(g) ? J.registry(g)?.[k] : null;
J.vibeKey = (project, g, k) => g === 'scheme' ? project.style + ':' + k : String(k);
J.vibeRole = (project, vibe, g, k) => {
  const v = normVibe(vibe);
  const d = definition(g, k), key = J.vibeKey(project, g, k);
  const isXxt = v === 'xxt';
  const isCollapsar = v === 'collapsar';
  const isXxmd = v === 'xxmd';
  const isZzjm = v === 'zzjm';
  const isAudioVis = v === 'audio_vis';
  const saved = project.vibeLibrary?.[v]?.[g]?.[key]
    ?? (isXxt ? project.vibeLibrary?.xingxutan?.[g]?.[key] : undefined)
    ?? (isCollapsar ? (project.vibeLibrary?.collapse?.[g]?.[key] ?? project.vibeLibrary?.tsx?.[g]?.[key]) : undefined)
    ?? (isXxmd ? (project.vibeLibrary?.xiangxiaomeidan?.[g]?.[key] ?? project.vibeLibrary?.xxmd?.[g]?.[key]) : undefined)
    ?? (isZzjm ? (project.vibeLibrary?.zhuangzhongjingmi?.[g]?.[key] ?? project.vibeLibrary?.zzjm?.[g]?.[key]) : undefined)
    ?? (isAudioVis ? (project.vibeLibrary?.audiovis?.[g]?.[key] ?? project.vibeLibrary?.audio?.[g]?.[key]) : undefined);
  if (saved === 'exclusive' || saved === 'companion') return saved;
  if (d?.vibes?.includes(v)
    || (isXxt && d?.vibes?.includes('xingxutan'))
    || (isCollapsar && (d?.vibes?.includes('collapse') || d?.vibes?.includes('tsx')))
    || (isXxmd && (d?.vibes?.includes('xiangxiaomeidan') || d?.vibes?.includes('xxmd') || d?.vibes?.includes('zzjm')))
    || (isZzjm && (d?.vibes?.includes('zhuangzhongjingmi') || d?.vibes?.includes('zzjm') || d?.vibes?.includes('xxmd')))
    || (isAudioVis && (d?.vibes?.includes('audiovis') || d?.vibes?.includes('audio')))) {
    return d.vibeExclusive ? 'exclusive' : 'companion';
  }
  const tag = J.VIBES[v]?.tag;
  if (tag && (d?.tags?.includes(tag) || (tag === '生长' && (d?.grow || d?.set === 'grow' || d?.tags?.includes('grow'))))) return 'companion';
  if (isCollapsar && (d?.tags?.includes('collapsar') || d?.tags?.includes('collapse') || d?.tags?.includes('tsx'))) return 'companion';
  if (isXxmd && (d?.tags?.includes('xxmd') || d?.tags?.includes('xiangxiaomeidan'))) return 'companion';
  if (isZzjm && (d?.tags?.includes('zzjm') || d?.tags?.includes('zhuangzhongjingmi'))) return 'companion';
  return '';
};
J.isGeneralPart = (project, g, k) => !Object.keys(J.VIBES).some(v => J.vibeRole(project, v, g, k) === 'exclusive');
J.matchesVibe = (project, vibe, g, k, subset = 'all') => {
  const v = normVibe(vibe);
  if (!v || v === 'all') return true;
  if (v === 'general') return J.isGeneralPart(project, g, k);
  const role = J.vibeRole(project, v, g, k);
  return !!role && (subset === 'all' || role === subset);
};
J.setVibePart = (project, vibe, g, k, role) => {
  const v = normVibe(vibe);
  if (!J.VIBES[v]?.custom || !['exclusive', 'companion', ''].includes(role)) return;
  const lib = project.vibeLibrary || (project.vibeLibrary = {});
  const pack = lib[v] || (lib[v] = {}), group = pack[g] || (pack[g] = {});
  const key = J.vibeKey(project, g, k);
  if (role) group[key] = role; else delete group[key];
};
const baseRandomOk = J.randomOk;
J.vibeCandidates = (project, g, keys) => {
  const selected = normVibe(project?.vibeGeneration?.id);
  if (!selected || selected === 'all' || selected !== 'general' && !J.VIBES[selected]) return keys;
  const matches = keys.filter(k => J.matchesVibe(project, selected, g, k));
  if (!matches.length && selected !== 'general') return keys;
  return keys.filter(k => matches.includes(k) || !!project.vibeGeneration.includeGeneral && J.isGeneralPart(project, g, k));
};
J.applyVibeFonts = (project, st) => {
  const keys = Object.keys(J.FONTS).filter(k => baseRandomOk(project, 'font', k));
  const selected = J.vibeCandidates(project, 'font', keys);
  if (selected.length === keys.length || !selected.length) return;
  for (const role of Object.keys(st.fonts)) {
    const filtered = st.fonts[role].filter(k => selected.includes(k));
    st.fonts[role] = filtered.length ? filtered : selected.slice();
  }
};
J.randomOk = (project, g, k) => {
  const selected = normVibe(project?.vibeGeneration?.id);
  const d = definition(g, k);
  const isBespoke = selected && (
    d?.vibes?.includes(selected)
    || (selected === 'xxt' && d?.vibes?.includes('xingxutan'))
    || (selected === 'collapsar' && (d?.vibes?.includes('collapse') || d?.vibes?.includes('tsx')))
    || (selected === 'xxmd' && (d?.vibes?.includes('xiangxiaomeidan') || d?.vibes?.includes('xxmd') || d?.vibes?.includes('zzjm')))
    || (selected === 'zzjm' && (d?.vibes?.includes('zhuangzhongjingmi') || d?.vibes?.includes('zzjm') || d?.vibes?.includes('xxmd')))
    || (selected === 'audio_vis' && (d?.vibes?.includes('audiovis') || d?.vibes?.includes('audio')))
  );
  if (!isBespoke && !baseRandomOk(project, g, k)) return false;
  if (g === 'style' || g === 'font') return true;
  if (!selected || selected === 'all') return true;
  if (selected === 'general') return J.isGeneralPart(project, g, k);
  if (!J.VIBES[selected]) return true;
  // An unfinished collection keeps ordinary candidates for its empty categories.
  const hasParts = J.order(g).some(key => J.matchesVibe(project, selected, g, key));
  return !hasParts || J.matchesVibe(project, selected, g, k) ||
    !!project.vibeGeneration.includeGeneral && J.isGeneralPart(project, g, k);
};
})();
