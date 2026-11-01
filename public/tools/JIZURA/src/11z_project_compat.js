/* Project migrations are independent of the editor so files can be validated before replacing a session. */
(() => {
'use strict';
const record = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const clone = v => JSON.parse(JSON.stringify(v), (k, value) =>
  ['__proto__', 'constructor', 'prototype'].includes(k) ? undefined : value);

J.parseProjectFile = text => {
  let p;
  try { p = JSON.parse(String(text).replace(/^\uFEFF/, '')); }
  catch (_) { throw new Error('文件不是有效的 JSON，可能已损坏或未完整保存'); }
  // Also accept editor-history snapshots without confusing arbitrary JSON with a project.
  if (record(p) && record(p.project)) p = p.project;
  if (!record(p) || typeof p.lyrics !== 'string') throw new Error('不是可识别的 JIZURA 项目：缺少歌词字段');
  if (p.version != null && (!Number.isInteger(p.version) || p.version > 1 || p.version < 0)) {
    throw new Error('不支持的项目格式版本：' + p.version + '，请使用对应版本导出');
  }
  return p;
};

J.normalizeProject = (input, notices = []) => {
  const defaults = J.defaultProject(), p = record(input) ? clone(input) : {};
  const strictPalette = record(p.customStyle) ? p.customStyle.strictPalette === true : true;
  const note = message => { if (!notices.includes(message)) notices.push(message); };
  const fill = (target, base, path) => {
    for (const [k, v] of Object.entries(base)) {
      const at = path ? path + '.' + k : k, x = target[k];
      if (!own(target, k)) { target[k] = clone(v); note('已补齐旧项目缺少的设置'); continue; }
      if (record(v)) {
        if (!record(x)) { target[k] = clone(v); note('已修复字段：' + at); }
        else fill(x, v, at);
      } else if (v !== null && (Array.isArray(v) ? !Array.isArray(x) :
        typeof x !== typeof v || (typeof v === 'number' && !Number.isFinite(x)))) {
        target[k] = clone(v); note('已修复字段：' + at);
      }
    }
    return target;
  };
  fill(p, defaults, '');
  if (!record(p.compatibility)) p.compatibility = {};
  if (!own(J.STYLES, p.style)) {
    p.compatibility.originalStyle = p.style;
    note('旧风格 ' + p.style + ' 已不可用，改用默认风格；保留原有配色和逐行设置');
    p.style = defaults.style;
  }
  if (p.mood != null && !own(J.MOODS, p.mood)) { note('旧情绪 ' + p.mood + ' 已停用'); p.mood = null; }
  for (const [key, allowed] of Object.entries({ aspect: ['16:9', '9:16', '4:3', '3:4', '1:1', '4:5', '21:9'],
    keyBg: ['off', 'green', 'black'], centerDir: ['tb', 'lr'], quality: ['high', 'compact', 'standard', 'smart', 'max'] })) {
    if (!allowed.includes(p[key])) { p[key] = defaults[key]; note('已修复字段：' + key); }
  }
  for (const key of ['fps', 'res']) if (!(p[key] > 0 && p[key] <= (key === 'fps' ? 240 : 7680))) {
    p[key] = defaults[key]; note('已修复字段：' + key);
  }
  if (!record(p.timing.lineTimes)) { p.timing.lineTimes = {}; note('已修复逐行时间'); }
  for (const [i, t] of Object.entries(p.timing.lineTimes)) {
    if (t !== null && t !== '' && Number.isFinite(+t) && +t >= 0) p.timing.lineTimes[i] = +t;
    else { delete p.timing.lineTimes[i]; note('已跳过无效的逐行时间'); }
  }
  if (p.customStyle != null) {
    p.customStyle = fill(record(p.customStyle) ? p.customStyle : {}, J.defaultCustomStyle(), 'customStyle');
    // This option was introduced later: old custom styles must retain their original effect colours.
    p.customStyle.strictPalette = strictPalette;
    if (!p.customStyle.schemes.length) p.customStyle.schemes = clone(J.defaultCustomStyle().schemes);
    p.customStyle.schemes = p.customStyle.schemes.map(s => {
      const base = J.defaultCustomStyle().schemes[0];
      const out = fill(record(s) ? s : {}, base, 'customStyle.schemes');
      for (const k of Object.keys(base)) if (typeof base[k] === 'string' && !/^#[0-9a-f]{3,8}$/i.test(out[k])) {
        out[k] = base[k]; note('已修复自定义配色');
      }
      return out;
    });
  }
  // Preserve unavailable references in the saved file, while using safe replacements in the working project.
  const unsupported = record(p.compatibility.unsupported) ? p.compatibility.unsupported : {};
  const fallback = { layout: 'center', enter: 'blur', exit: 'blur', hold: 'still',
    treat: 'none', bg: 'none', cam: 'still', fx: 'none', trans: 'none' };
  const repairParts = (obj, path) => {
    if (!record(obj)) return;
    for (const [k, v] of Object.entries(obj)) {
      const at = path + '.' + k;
      if (['params', 'bgP', 'camP', 'transP', 'treatP', 'twinParams'].includes(k)) continue;
      // Legacy decor selections can be one ID or a comma-separated list.
      if (k === 'decor' && typeof v === 'string') {
        const ids = v.split(',').map(id => id.trim()).filter(Boolean);
        if (v !== 'none' && ids.some(id => !own(J.DECOR, id))) {
          unsupported[at] = v; obj[k] = ids.filter(id => own(J.DECOR, id));
          note('已跳过不可用装饰：' + v);
        }
        continue;
      }
      if (J.GROUP_KEYS.includes(k) && typeof v === 'string' && v && v !== 'none' && !own(J.registry(k), v)) {
        unsupported[at] = v;
        const replacement = fallback[k];
        if (replacement === 'none' || own(J.registry(k), replacement)) obj[k] = replacement;
        else delete obj[k];
        note('已替换不可用效果：' + v);
      } else if (Array.isArray(v)) {
        if (k === 'decor') obj[k] = v.filter((d, i) => {
          const id = typeof d === 'string' ? d : d && d.id;
          if (typeof id === 'string' && own(J.DECOR, id)) return true;
          unsupported[at + '.' + i] = d; note('已跳过不可用装饰：' + String(id)); return false;
        });
        else v.forEach((c, i) => repairParts(c, at + '.' + i));
      } else if (record(v)) {
        if (k === 'cutLayouts') for (const [i, layout] of Object.entries(v)) {
          if (typeof layout === 'string' && !own(J.LAYOUTS, layout)) {
            unsupported[at + '.' + i] = layout; v[i] = 'center'; note('已替换不可用效果：' + layout);
          }
        }
        else repairParts(v, at);
      }
    }
  };
  for (const [i, ov] of Object.entries(p.overrides)) {
    if (!record(ov)) { delete p.overrides[i]; note('已跳过无效的逐行设置'); }
    else repairParts(ov, 'overrides.' + i);
  }
  if (Object.keys(unsupported).length) p.compatibility.unsupported = unsupported;
  if (!Object.keys(p.compatibility).length) delete p.compatibility;
  return p;
};
})();
