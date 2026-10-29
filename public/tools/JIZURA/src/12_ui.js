/* ============================================================
   JIZURA — editor UI
   ============================================================ */
(() => {
'use strict';
if (!document.getElementById('app')) return;          // engine-only pages (tests)
if (J.initEffectCodes) J.initEffectCodes();
const $ = id => document.getElementById(id);
// Editor appearance is independent of project colours and exported frames.
const uiThemeMedia = window.matchMedia('(prefers-color-scheme: dark)');
let uiThemeSaved = null;
try { uiThemeSaved = localStorage.getItem('jizura.uiTheme.v1'); } catch (_) {}
if (!['light', 'dark'].includes(uiThemeSaved)) uiThemeSaved = null;
function applyUiTheme(theme) {
  document.documentElement.dataset.uiTheme = theme;
  const button = $('btnUiTheme');
  if (!button) return;
  const lang = document.documentElement.lang;
  const words = lang.startsWith('zh') ? ['日间', '黑夜'] : lang === 'ja' ? ['昼間', '夜間'] : ['Day', 'Night'];
  button.textContent = words.join(' / ');
  button.setAttribute('aria-pressed', String(theme === 'dark'));
  button.title = `${words[theme === 'dark' ? 1 : 0]} → ${words[theme === 'dark' ? 0 : 1]}`;
}
applyUiTheme(uiThemeSaved || (uiThemeMedia.matches ? 'dark' : 'light'));
$('btnUiTheme')?.addEventListener('click', () => {
  uiThemeSaved = document.documentElement.dataset.uiTheme === 'dark' ? 'light' : 'dark';
  applyUiTheme(uiThemeSaved);
  try { localStorage.setItem('jizura.uiTheme.v1', uiThemeSaved); } catch (_) {}
});
uiThemeMedia.addEventListener('change', event => {
  if (!uiThemeSaved) applyUiTheme(event.matches ? 'dark' : 'light');
});
const LS_KEY = 'jizura.project.v1';
const LS_HIST_KEY = 'jizura.undoHistory.v1';
const PERSIST_UNDO_MAX = 10;
const HUD_CHARS = '0123456789:./-_()【】・No.LYRICRECUNTITLEDXYlinebpminterlude—─／ ';
const ICON = {
  dice: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="2" width="12" height="12" rx="2"/><circle cx="5.5" cy="5.5" r="1" fill="currentColor"/><circle cx="10.5" cy="10.5" r="1" fill="currentColor"/><circle cx="10.5" cy="5.5" r="1" fill="currentColor"/><circle cx="5.5" cy="10.5" r="1" fill="currentColor"/></svg>',
  lock: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg>',
  pen: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 13l1-3.5L11 2.5l2.5 2.5L6.5 12z"/><path d="M9.5 4l2.5 2.5"/></svg>',
  tap: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="2.2" fill="currentColor"/><circle cx="8" cy="8" r="5.5"/></svg>',
  range: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 3v10M13 3v10"/><path d="M5.5 8h5M8.5 5.5L11 8l-2.5 2.5"/></svg>',
};

const S = { project: null, plan: null, audio: null, renderer: new J.Renderer(), playing: false, t: 0, t0: 0, loop: 'all', loopHold: null, need: true, exporting: null, tap: null, slow: false, lineEls: [], curLine: -2, selectedEvent: null };
const LOOP_CYCLE = ['all', 'line', 'cut', false];
const LOOP_COPY = {
  all:  { ja: 'ループ', en: 'Loop', titleJa: '全体を繰り返し', titleEn: 'Loop the whole piece' },
  line: { ja: '行ループ', en: 'Line loop', titleJa: 'この行を繰り返し', titleEn: 'Loop this line' },
  cut:  { ja: 'カットループ', en: 'Cut loop', titleJa: 'このカットを繰り返し', titleEn: 'Loop this cut' },
  off:  { ja: 'ループ', en: 'Loop', titleJa: '繰り返しなし', titleEn: 'No loop' },
};
const isEn = () => document.documentElement.lang === 'en';
function cutAround(t) {
  const c = J.cutAt(S.plan, t);
  if (c) return c;
  const cs = S.plan.cuts;
  let ans = null;
  for (let i = 0; i < cs.length; i++) { if (cs[i].start <= t) ans = cs[i]; else break; }
  return ans;
}
function loopRange(t) {
  const T = t != null ? t : S.t;
  const endAll = S.plan.duration;
  if (S.loop === 'cut') {
    const cut = cutAround(T);
    return cut ? { start: cut.start, end: cut.end } : { start: 0, end: endAll };
  }
  if (S.loop === 'line') {
    const cut = cutAround(T);
    if (!cut || cut.line < 0) return cut ? { start: cut.start, end: cut.end } : { start: 0, end: endAll };
    const same = S.plan.cuts.filter(c => c.line === cut.line && c.layout !== 'interlude' && c.layout !== 'title');
    if (!same.length) return { start: cut.start, end: cut.end };
    return { start: same[0].start, end: same[same.length - 1].end };
  }
  return { start: 0, end: endAll };
}
function refreshLoopHold(t) {
  S.loopHold = (S.loop === 'line' || S.loop === 'cut') ? loopRange(t != null ? t : S.t) : null;
}
function activeLoopRange() {
  if (S.fxLoop && S.selectedEvent) return { start: Math.max(0, S.selectedEvent.t - 0.3), end: Math.min(S.plan.duration, S.selectedEvent.t + S.selectedEvent.dur + 0.4) };
  if ((S.loop === 'line' || S.loop === 'cut') && S.loopHold) return S.loopHold;
  return loopRange(S.t);
}
function syncLoopBtn() {
  const b = $('btnLoop'); if (!b) return;
  const key = S.loop || 'off';
  const copy = LOOP_COPY[key] || LOOP_COPY.off;
  const en = isEn();
  b.textContent = en ? copy.en : copy.ja;
  b.title = en ? copy.titleEn : copy.titleJa;
  b.setAttribute('aria-pressed', String(!!S.loop));
  b.dataset.mode = key;
  refreshLoopHold();
}

/* WebAudio player (works inside sandboxed pages where blob media may be blocked) */
const AP = {
  ctx: null, src: null, startAt: 0, base: 0, rate: 1, gain: null, vol: 0.8, muted: false,
  play(buffer, offset, rate = 1) {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.stop();
    if (!this.gain) { this.gain = this.ctx.createGain(); this.gain.connect(this.ctx.destination); this.applyVol(); }
    const s = this.ctx.createBufferSource(); s.buffer = buffer; s.connect(this.gain);
    const off = Math.max(0, Math.min(offset, buffer.duration - 0.01));
    this.rate = rate > 0 ? rate : 1; s.playbackRate.value = this.rate;
    s.start(0, off); this.src = s; this.startAt = this.ctx.currentTime; this.base = off;
  },
  stop() { if (this.src) { try { this.src.stop(); } catch (e) {} try { this.src.disconnect(); } catch (e) {} this.src = null; } },
  time() { return this.ctx ? this.base + (this.ctx.currentTime - this.startAt) * this.rate : 0; },
  /* preview volume only (exports keep the original level) */
  setVol(v, muted) { if (v != null) this.vol = Math.max(0, Math.min(1, v)); if (muted != null) this.muted = !!muted; this.applyVol(); },
  applyVol() { if (!this.gain) return; const v = this.muted ? 0 : this.vol * this.vol; try { this.gain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.015); } catch (e) { this.gain.gain.value = v; } },
};
/* プレビュー音量: remembered per browser */
function initVolume() {
  const el = $('vol'), mb = $('btnMute'); if (!el || !mb) return;
  let v = 0.8, m = false;
  try { const o = JSON.parse(localStorage.getItem('jizura.previewVolume') || 'null'); if (o) { v = +o.v; m = !!o.m; } } catch (e) {}
  if (!(v >= 0 && v <= 1)) v = 0.8;
  const show = () => {
    el.value = Math.round(AP.vol * 100);
    mb.innerHTML = AP.muted || AP.vol === 0
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3z"/><path d="m16 9 5 6m0-6-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3z"/><path d="M16 9a5 5 0 0 1 0 6m2-9a9 9 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    mb.setAttribute('aria-pressed', String(AP.muted || AP.vol === 0));
    mb.setAttribute('aria-label', mb.title);
    el.title = '音量 ' + Math.round(AP.vol * 100) + '%';
  };
  const save = () => { try { localStorage.setItem('jizura.previewVolume', JSON.stringify({ v: AP.vol, m: AP.muted })); } catch (e) {} };
  AP.setVol(v, m); show();
  el.addEventListener('input', () => { AP.setVol(el.value / 100, false); show(); save(); });
  mb.addEventListener('click', () => { AP.setVol(null, !AP.muted); show(); save(); });
}

/* ---------------- project persistence ---------------- */
function mergeProject(p) {
  const d = J.defaultProject();
  const o = Object.assign(d, p || {});
  o.fx = Object.assign(J.defaultProject().fx, (p && p.fx) || {});
  o.timing = Object.assign(J.defaultProject().timing, (p && p.timing) || {});
  const en = J.defaultProject().enabled;
  for (const g of Object.keys(en)) en[g] = Object.assign(en[g], ((p && p.enabled) || {})[g] || {});
  o.enabled = en;
  o.overrides = (p && p.overrides) || {};
  o.eventMode = (p && p.eventMode === 'manual') ? 'manual' : 'auto';
  o.events = Array.isArray(p && p.events) ? p.events.filter(e => e && typeof e.t === 'number').map(e => ({
    id: e.id || ('ev_' + Math.random().toString(36).slice(2, 9)),
    t: +e.t,
    type: e.type || 'glitch',
    amp: e.amp != null ? +e.amp : 1,
    dur: e.dur != null ? +e.dur : 0.15,
    manual: true, disabled: !!e.disabled
  })) : [];
  o.eventOverrides = {};
  for (const [id, e] of Object.entries((p && p.eventOverrides) || {})) {
    if (!id.startsWith('auto:') || !e || typeof e !== 'object') continue;
    const patch = { deleted: !!e.deleted, disabled: !!e.disabled };
    for (const k of ['t', 'amp', 'dur']) if (Number.isFinite(e[k])) patch[k] = Math.max(0, e[k]);
    if (J.FXE[e.type]) patch.type = e.type;
    o.eventOverrides[id] = patch;
  }
  o.locks = { tech: {}, params: {} };
  // project files are untrusted: only plain keys may be locked, and only on (never a value we did not write)
  for (const [g, on] of Object.entries((p && p.locks && p.locks.tech) || {})) if (on === true && /^[\w-]+$/.test(g)) o.locks.tech[g] = true;
  for (const [k, on] of Object.entries((p && p.locks && p.locks.params) || {})) if (on === true && /^[\w-]+$/.test(k)) o.locks.params[k] = true;
  delete o.appVersion;
  // project files are untrusted: colours must be colours, font keys plain keys (they end up in the page's HTML / CSS)
  o.colors = { enabled: !!(p && p.colors && p.colors.enabled) };
  for (const [k, v] of Object.entries((p && p.colors) || {})) {
    if (k === 'enabled') continue;
    if (typeof v === 'boolean') o.colors[k] = v;
    else if (typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v)) o.colors[k] = v;
  }
  o.userFonts = (Array.isArray(p && p.userFonts) ? p.userFonts : []).filter(uf => uf && J.SAFE_FONT_KEY.test(uf.key))
    .map(uf => ({ key: uf.key, label: String(uf.label || uf.key).slice(0, 80), family: J.safeFamily(uf.family || uf.key.slice(5)), weight: J.clamp(parseInt(uf.weight, 10) || 400, 100, 900) }));
  for (const uf of o.userFonts) if (!J.FONTS[uf.key]) J.addUserFont(uf.key, uf.label, uf.family, uf.weight);
  migrateOrder(o, p);
  o.themeId = p && typeof p.themeId === 'string' && J.THEMES && J.THEMES[p.themeId] ? p.themeId : null;
  o.fonts = {};
  for (const [role, k] of Object.entries((p && p.fonts) || {})) {
    if (!/^[\w-]+$/.test(role)) continue;
    if (typeof k === 'string' && J.FONTS[k]) o.fonts[role] = k;
    else if (Array.isArray(k)) o.fonts[role] = k.filter(x => typeof x === 'string' && J.FONTS[x]);
  }
  if (p && p.customStyle) {
    try { o.customStyle = JSON.parse(JSON.stringify(p.customStyle)); } catch (e) { o.customStyle = J.defaultCustomStyle ? J.defaultCustomStyle() : null; }
  } else {
    o.customStyle = J.defaultCustomStyle ? J.defaultCustomStyle() : null;
  }
  return o;
}
/* v0.10: untagged lines of an LRC text now stay where they are written — move per-line settings of older projects along */
function migrateOrder(o, p) {
  const was = p && p.timingOrder; o.timingOrder = 2;
  if (!p || was === 2) return;
  const map = J.parseOrderV1(o.lyrics || ''); if (!map) return;
  const mv = obj => { const r = {}; for (const [k, v] of Object.entries(obj || {})) { const i = +k; r[Number.isInteger(i) && map[i] != null ? map[i] : k] = v; } return r; };
  o.timing.lineTimes = mv(o.timing.lineTimes); o.overrides = mv(o.overrides);
  const R = o.exportRange;
  if (R && Number.isInteger(R.from) && Number.isInteger(R.to)) {
    const idx = []; for (let i = R.from; i <= R.to && i < map.length; i++) idx.push(map[i]);
    o.exportRange = idx.length ? { from: Math.min(...idx), to: Math.max(...idx) } : null;
  }
}
const SET_UI = { horror: { name: 'ホラー', badge: 'ホ' }, typo: { name: '文字PV系', badge: '文' }, kinetic: { name: 'キネティック', badge: 'キ' } };
function setBadges(d) {
  return (d && d.extra ? '<span class="set-badge ex" title="最初の公開版のあとに追加">追加</span>' : '') + (d && d.wa ? '<span class="set-badge" title="和風の演出">和</span>' : '')
    + (d && d.set && SET_UI[d.set] ? `<span class="set-badge set-${d.set}" title="${SET_UI[d.set].name}">${SET_UI[d.set].badge}</span>` : '');
}
function loadLocal() { try { const s = localStorage.getItem(LS_KEY); if (s) return mergeProject(JSON.parse(s)); } catch (e) {} return mergeProject(null); }
let saveTimer = 0;
function autosave() { clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, 700); }
function flushSave() {
  clearTimeout(saveTimer);
  try { if (S.project) localStorage.setItem(LS_KEY, JSON.stringify(S.project)); } catch (e) {}
  saveUndoHistory();
}
window.addEventListener('pagehide', () => { if (S.project) flushSave(); });
window.addEventListener('beforeunload', () => { if (S.project) flushSave(); });

/* ---------------- planning ---------------- */
function audioLike() {
  const T = S.project.timing;
  if (S.audio) {
    const a = Object.assign({}, S.audio);
    if (T.bpm > 0) a.beats = J.beatGrid(T.bpm, T.beatOffset || 0, S.audio.duration);
    return a;
  }
  if (T.bpm > 0) return { beats: J.beatGrid(T.bpm, T.beatOffset || 0, 600) };
  return null;
}
/* 自動判定のとき、判定結果を言語欄の横に出す */
function langNote() {
  if (langNote.last !== undefined && langNote.last !== J.lang) { try { renderFontRoles(); } catch (e) {} }   // font menus show the language's faces
  langNote.last = J.lang;
}
function replan() {
  S.plan = J.plan(S.project, audioLike());
  if (S.selectedEvent) {
    S.selectedEvent = S.plan.events.find(e => e.id === S.selectedEvent.id) || null;
    if (S.selectedEvent) updateEventInspector(S.selectedEvent); else hideEventInspector();
  }
  // lines locked in older projects (seed only): take a snapshot now, so from here on they stay exactly as they are
  for (const [i, o] of Object.entries(S.project.overrides || {})) if (o && o.lock && !Array.isArray(o.lockedCuts)) { const snap = J.lineSnapshot(S.plan, +i); if (snap) o.lockedCuts = snap; }
  langNote();
  if (S.t > S.plan.duration) S.t = 0;
  refreshLoopHold();
  renderLines(); sizeViewport(); drawTimeline(); updateTimeUI();
  lastCutIdx = -2;
  if (typeof cutPick !== 'undefined' && cutPick.g) fillCutPick();
  S.need = true; autosave(); ensureFonts(); drawSwatch(); showNow();
  clearTimeout(warmTimer); warmTimer = setTimeout(warm, 450);
}
/* pre-decompose glyphs used by piece animations while the editor is idle, so playback does not hitch */
let warmTimer = 0, warmJob = 0;
function warm() {
  const job = ++warmJob;
  const cuts = S.plan.cuts.filter(c => c.enter === 'assemble' || ['explode', 'fall', 'drift'].includes(c.exit));
  const src = $('view');
  const cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height;
  const ctx = cv.getContext('2d');
  let i = 0;
  const idle = window.requestIdleCallback ? (f) => window.requestIdleCallback(f, { timeout: 400 }) : (f) => setTimeout(() => f(null), 40);
  const step = (deadline) => {
    if (job !== warmJob || S.exporting) return;
    do {
      const c = cuts[i++]; if (!c) break;
      const ts = [];
      if (c.enter === 'assemble') ts.push(c.start + Math.min(c.inDur * 0.3, c.dur * 0.2));
      if (c.outDur > 0) ts.push(c.end - c.outDur * 0.5);
      for (const t of ts) { try { S.renderer.frame(ctx, S.plan, t, { scale: cv.width / S.plan.W, fast: true, noHud: true, noGhost: true }); } catch (e) {} }
    } while (i < cuts.length && deadline && deadline.timeRemaining() > 10);
    if (i < cuts.length) idle(step);
  };
  idle(step);
}
let replanTimer = 0;
const replanSoon = (ms = 220) => { clearTimeout(replanTimer); replanTimer = setTimeout(replan, ms); };
let fontKey = '';
let thumbFonts = null;
async function ensureFonts() {
  const txt = S.project.lyrics + (S.project.title || '') + (S.project.artist || '') + HUD_CHARS;
  const keys = J.fontsOfPlan(S.plan);                       // only the faces this plan draws with
  const key = txt + '|' + keys.join(',') + '|' + Object.keys(J.FONTS).length + '|' + J.lang;   // the lyric language changes the faces
  if (key === fontKey) return;
  fontKey = key;
  showMsg('フォントを読み込み中…');
  try { await J.ensureFonts(txt, keys); } catch (e) {}
  showMsg(null); S.need = true; drawStyleGrid(); loadThumbFonts();
}
// style thumbnails need two glyphs of every style's display face — fetched only once the style grid is actually shown
function loadThumbFonts() {
  if (thumbFonts || !$('styleGrid').offsetParent) return;
  thumbFonts = J.ensureFonts('字面', [...new Set(J.STYLE_ORDER.map(k => J.STYLES[k].fonts.display[0]))]).then(() => drawStyleGrid()).catch(() => {});
}
function showMsg(m) { const el = $('viewMsg'); if (!m) { el.hidden = true; return; } el.textContent = m; el.hidden = false; }

/* ---------------- viewport & drawing ---------------- */
// 固定表示: on wide & tall windows the page itself doesn't scroll (see style.css html.fixed-ok)
const FIXED_MQ = window.matchMedia ? window.matchMedia('(min-width: 1181px) and (min-height: 620px)') : null;
document.documentElement.classList.add('fixed-ok');
function fixedLayout() { return !!(FIXED_MQ && FIXED_MQ.matches) && document.documentElement.classList.contains('fixed-ok'); }
function sizeViewport() {
  const vp = $('viewport'), c = $('view');
  const ar = S.plan.W / S.plan.H;
  let cssW = S.screenFxMode && S.fxCompare ? Math.max(1, (vp.clientWidth - 10) / 2) : (vp.clientWidth || 800), cssH = cssW / ar;
  // fixed workspace: the viewport gets whatever height is left under the header / above the transport and timeline
  const maxH = fixedLayout() ? Math.max(160, vp.clientHeight - 2) : Math.max(220, window.innerHeight * 0.68);
  if (cssH > maxH) { cssH = maxH; cssW = cssH * ar; }
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const pw = Math.round(Math.min(S.plan.W, cssW * dpr)), ph = Math.round(pw / ar);
  if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
  c.style.width = cssW + 'px'; c.style.height = cssH + 'px';
  const base = $('viewNoFx');
  if (base && S.screenFxMode && S.fxCompare) { base.width = pw; base.height = ph; base.style.width = cssW + 'px'; base.style.height = cssH + 'px'; }
  S.need = true;
}
// preview only: dotted outline of the centre that 中央を空ける keeps free (never in exports)
function drawCenterGuide(ctx, k) {
  const P = S.plan, z = P.zones; if (!z) return;
  const r = z[0].side === 'left' ? [z[0].w, 0, P.W - z[0].w - z[1].w, P.H] : [0, z[0].h, P.W, P.H - z[0].h - z[1].h];
  ctx.save(); ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.setLineDash([14, 10]); ctx.lineWidth = 2 / k * 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.strokeRect(r[0] + 4, r[1] + 4, r[2] - 8, r[3] - 8);
  ctx.setLineDash([]); ctx.restore();
}
function draw() {
  const c = $('view'), ctx = c.getContext('2d');
  const t0 = performance.now();
  S.renderer.frame(ctx, S.plan, S.t, { scale: c.width / S.plan.W, fast: S.playing && S.slow, noEvents: !!(S.screenFxMode && S.fxBypass) });
  if (S.screenFxMode && S.fxCompare) {
    const b = $('viewNoFx'), bx = b.getContext('2d');
    // Same renderer and clock preserve cached textures and all non-event styling.
    S.renderer.frame(bx, S.plan, S.t, { scale: b.width / S.plan.W, fast: S.playing && S.slow, noEvents: true });
    if (S.plan.centerFree) drawCenterGuide(bx, b.width / S.plan.W);
  }
  if (S.screenFxMode) renderScreenFxEvents();
  if (S.plan.centerFree) drawCenterGuide(ctx, c.width / S.plan.W);
  const dt = performance.now() - t0;
  S.slow = S.playing ? (dt > 30 ? true : dt < 14 ? false : S.slow) : false;
  updateTimeUI(); drawTimeline(); updateCutInfo();
}
function tick(now) {
  requestAnimationFrame(tick);
  if (S.exporting) return;
  if (S.playing) {
    // rAF timestamps can precede the moment play()/seek() stamped t0 → clamp so t never goes negative
    let t = Math.max(0, S.audio ? AP.time() : (now - S.t0) / 1000 * playRate());
    const range = activeLoopRange();
    if (t >= range.end - 1e-3) {
      if ((S.fxLoop || S.loop) && !S.tap) { seek(range.start); t = range.start; }
      else { pause(); t = Math.min(t, S.plan.duration - 1e-3); if (S.tap) stopTap(); }
    }
    S.t = t; S.need = true;
    followTlPlayhead();
  }
  if (S.need) { S.need = false; draw(); }
}
function updateTimeUI() {
  $('timeNow').textContent = Math.max(0, S.t).toFixed(2);
  $('timeDur').textContent = Math.max(0, S.plan.duration).toFixed(2);
  if (!S.scrubbing) $('scrub').value = String(Math.round(S.t / Math.max(0.001, S.plan.duration) * 10000));
}
// タップ同期の速さ (0.5× / 0.75×): only while tapping — the song's own time is what gets stored
const playRate = () => (S.tap && S.tap.rate > 0 ? S.tap.rate : 1);
function play() {
  refreshLoopHold();
  if (S.audio) AP.play(S.audio.buffer, S.t, playRate());
  else {
    S.t0 = performance.now() - S.t * 1000 / playRate();
    if (S.project && S.project.audioName) {
      const l = (document.documentElement.lang || '').toLowerCase();
      const msg = l.startsWith('zh-hant') ? `⚠️ 尚未載入音訊【${S.project.audioName}】，目前為無聲預覽`
        : l.startsWith('zh') ? `⚠️ 尚未载入音频【${S.project.audioName}】，当前为无声预览`
        : l.startsWith('en') ? `⚠️ Audio [${S.project.audioName}] not loaded (silent preview)`
        : `⚠️ 楽曲「${S.project.audioName}」が読み込まれていません（無音プレビュー）`;
      toast(msg, null, 3000);
    }
  }
  S.playing = true; $('btnPlay').textContent = '❚❚'; $('btnPlay').setAttribute('aria-label', '一時停止');
}
function pause() {
  S.fxLoop = false;
  if ($('evPreview')) $('evPreview').setAttribute('aria-pressed', 'false');
  S.playing = false; AP.stop();
  $('btnPlay').textContent = '▶'; $('btnPlay').setAttribute('aria-label', '再生'); S.need = true;
}
function seek(t) {
  S.t = J.clamp(t, 0, Math.max(0, S.plan.duration - 1e-3));
  if (S.audio) { if (S.playing) AP.play(S.audio.buffer, S.t, playRate()); }
  else S.t0 = performance.now() - S.t * 1000 / playRate();
  refreshLoopHold();
  S.need = true;
}

/* ---------------- timeline ---------------- */
// zoomable view: [TL.off, TL.off + D / TL.z] seconds; line starts are draggable handles in the top band
const TL = { z: 1, off: 0, hover: -1, drag: -1, dragEvent: null, hoverEvent: null };
function tlView() {
  const D = Math.max(0.001, S.plan.duration), vd = D / TL.z;
  TL.off = J.clamp(TL.off, 0, Math.max(0, D - vd));
  return { D, vd, off: TL.off };
}
function tlZoom(f, tc) {
  const { D, vd } = tlView();
  const z = J.clamp(TL.z * f, 1, Math.max(1, D / 2));
  const c = tc == null ? S.t : tc, frac = (c - TL.off) / vd;
  TL.z = z; TL.off = c - frac * (D / z); tlView(); drawTimeline();
}
// while playing zoomed in: redraw (which scrolls the view) once the playhead leaves the visible part
function followTlPlayhead() {
  if (!(TL.z > 1) || TL.drag >= 0 || TL.dragEvent) return;
  const { vd, off } = tlView();
  if (S.t < off || S.t > off + vd * 0.92) drawTimeline();
}
function drawTimeline() {
  const c = $('timeline'), dpr = Math.min(2, window.devicePixelRatio || 1);
  const fxRects = S.screenFxMode ? fxTimelineRects(c.clientWidth) : [];
  c.style.height = S.screenFxMode ? (76 + Math.max(1, ...fxRects.map(r => r.lane + 1)) * 26) + 'px' : '';
  const w = Math.max(10, Math.round(c.clientWidth * dpr)), h = Math.max(10, Math.round(c.clientHeight * dpr));
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  let { D, vd, off } = tlView();
  // follow the playhead while playing (zoomed in)
  if (TL.z > 1 && S.playing && TL.drag < 0 && !TL.dragEvent && (S.t < off || S.t > off + vd * 0.92)) { TL.off = S.t - vd * 0.1; ({ D, vd, off } = tlView()); }
  const x = c.getContext('2d'), X = t => (t - off) / vd * w, T = px => off + px / w * vd;
  x.fillStyle = '#131316'; x.fillRect(0, 0, w, h);
  if (S.audio && S.audio.peaks) {
    const pk = S.audio.peaks, n = pk.length, sd = S.audio.duration;
    x.fillStyle = '#262630';
    for (let i = 0; i < w; i += 2) { const t = T(i); if (t > sd) break; if (t < 0) continue; const v = pk[Math.min(n - 1, Math.floor(t / sd * n))]; const hh = v * h * 0.7; x.fillRect(i, h * 0.65 - hh / 2, 1.5, hh); }
  }
  const beats = S.plan.beats || [];
  x.fillStyle = '#3a3a44';
  for (const b of beats) { if (b < off) continue; if (b > off + vd) break; x.fillRect(Math.round(X(b)), h - 6 * dpr, 1, 6 * dpr); }

  const yLines = 19 * dpr;
  const top = 21 * dpr, bot = S.screenFxMode ? 48 * dpr : h - 8 * dpr;

  const R = exportRange();
  if (R) { x.fillStyle = 'rgba(245,165,12,0.10)'; x.fillRect(X(R.t0), 0, X(R.t1) - X(R.t0), h); }

  // ---------- Cuts track ----------
  for (const cut of S.plan.cuts) {
    const x0 = X(cut.start), x1 = X(cut.end);
    if (x1 < 0 || x0 > w) continue;
    const bg = (cut.line % 2 === 0) ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)';
    x.fillStyle = bg; x.fillRect(x0, top, Math.max(1, x1 - x0 - 1), bot - top);
    x.fillStyle = 'rgba(245,165,12,0.65)'; x.fillRect(x0, top, Math.max(1, 2 * dpr), bot - top);
    if (x1 - x0 > 34 * dpr) {
      x.fillStyle = 'rgba(236,231,225,0.85)'; x.font = `${10 * dpr}px ${getComputedStyle(document.body).getPropertyValue('--mono') || 'monospace'}`;
      x.save(); x.beginPath(); x.rect(x0, top, x1 - x0 - 3, bot - top); x.clip();
      x.fillText(TL.z > 3 && cut.text ? cut.text : ((J.LAYOUTS[cut.layout] || {}).name || cut.layout), x0 + 5 * dpr, top + 13 * dpr); x.restore();
    }
  }

  if (S.screenFxMode) {
    x.font = `${10 * dpr}px sans-serif`; x.fillStyle = '#8e8a94';
    x.fillText('画面动效 · 拖动移动 / 右边缘调时长', 6 * dpr, 61 * dpr);
    for (const r of fxRects) {
      const selected = S.selectedEvent && S.selectedEvent.id === r.ev.id;
      x.fillStyle = r.ev.disabled ? '#303039' : selected ? '#b98016' : r.ev.manual ? '#235a58' : '#393453';
      x.fillRect(r.x * dpr, r.y * dpr, r.w * dpr, 22 * dpr);
      x.strokeStyle = selected ? '#f5a50c' : '#777281';
      x.strokeRect(r.x * dpr, r.y * dpr, r.w * dpr, 22 * dpr);
      x.save(); x.beginPath(); x.rect(r.x * dpr, r.y * dpr, r.w * dpr, 22 * dpr); x.clip();
      x.fillStyle = '#ece7e1';
      x.fillText((r.ev.disabled ? '○ ' : '') + fxName(r.ev.type), (r.x + 4) * dpr, (r.y + 15) * dpr);
      x.restore(); x.fillStyle = selected ? '#f5a50c' : '#8e8a94';
      x.fillRect((r.x + r.w - 3) * dpr, (r.y + 5) * dpr, 2 * dpr, 12 * dpr);
    }
  }

  // ---------- Line handles ----------
  x.font = `${10 * dpr}px monospace`;
  const LT = S.project.timing.lineTimes || {};
  for (const ln of S.plan.lines) {
    const lx = X(ln.start);
    if (lx < -20 * dpr || lx > w + 2) continue;
    const on = ln.index === TL.drag || ln.index === TL.hover, man = LT[ln.index] != null;
    x.fillStyle = on ? '#f5a50c' : man ? '#6fb7c8' : '#5d5a63'; x.fillRect(lx - (on ? dpr : 0), 0, on ? 2 * dpr : 1, yLines);
    // handle
    x.beginPath(); x.moveTo(lx - 5 * dpr, 0); x.lineTo(lx + 5 * dpr, 0); x.lineTo(lx, 7 * dpr); x.closePath(); x.fill();
    x.fillStyle = on ? '#f5a50c' : '#8e8a94'; x.fillText(String(ln.index + 1).padStart(2, '0') + (ln.interlude ? ' 間奏' : ''), lx + 4 * dpr, 14 * dpr);
  }

  // overview & loop & playhead
  if (TL.z > 1) {
    x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(0, h - 2 * dpr, w, 2 * dpr);
    x.fillStyle = '#f5a50c'; x.fillRect(off / D * w, h - 2 * dpr, Math.max(4, vd / D * w), 2 * dpr);
  }
  if (S.loop === 'line' || S.loop === 'cut') {
    const r = activeLoopRange();
    x.fillStyle = 'rgba(245,165,12,0.16)';
    x.fillRect(X(r.start), 0, Math.max(2 * dpr, X(r.end) - X(r.start)), h);
  }
  const px = X(S.t);
  x.fillStyle = '#f5a50c'; x.fillRect(Math.round(px) - dpr, 0, 2 * dpr, h);
}
function tlTime(ev) {
  const r = $('timeline').getBoundingClientRect(), { vd, off } = tlView();
  return off + J.clamp((ev.clientX - r.left) / r.width, 0, 1) * vd;
}
function timelineSeek(ev) { if (S.fxLoop) pause(); seek(tlTime(ev)); }
/* the line whose start handle is under the pointer (top band, <= 20px) */
function tlHandleAt(ev) {
  const c = $('timeline'), r = c.getBoundingClientRect(), { vd, off } = tlView();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const my = (ev.clientY - r.top) * dpr;
  if (my > 20 * dpr) return -1;
  let best = -1, bd = 8;
  for (const ln of S.plan.lines) { const d = Math.abs((ln.start - off) / vd * r.width - (ev.clientX - r.left)); if (d < bd) { bd = d; best = ln.index; } }
  return best;
}
function tlDragTo(i, ev) {
  let t = tlTime(ev);
  if (!ev.shiftKey && S.plan.beats && S.plan.beats.length) {       // snap to the nearest beat (Shift: free)
    let bt = null, bd = 0.12; for (const b of S.plan.beats) { const d = Math.abs(b - t); if (d < bd) { bd = d; bt = b; } if (b > t + 0.2) break; }
    if (bt != null) t = bt;
  }
  const L = S.plan.lines, lo = i > 0 ? L[i - 1].start + 0.2 : 0, hi = i < L.length - 1 ? L[i + 1].start - 0.2 : S.plan.duration - 0.2;
  t = +J.clamp(t, lo, Math.max(lo, hi)).toFixed(3);
  if (!S.project.timing.lineTimes) S.project.timing.lineTimes = {};
  // pin the neighbours too, so moving one boundary never shifts the lines after it
  L.forEach(ln => { if (S.project.timing.lineTimes[ln.index] == null) S.project.timing.lineTimes[ln.index] = +ln.start.toFixed(3); });
  S.project.timing.lineTimes[i] = t;
  replan(); seek(t + 0.001);
}

/* ---------------- FX events timeline management ---------------- */
function updateEventInspector(ev) {
  const p = $('eventInspector');
  if (!p || !ev) return;
  p.hidden = false;
  $('fxSelectionHint').hidden = true;
  $('evSource').textContent = ev.manual ? '手动事件 · 仅编辑这一条' : (S.project.eventOverrides || {})[ev.id] ? '自动事件 · 已局部修改' : '自动事件 · 原始生成值';
  $('evReset').hidden = !!ev.manual;
  $('evReset').disabled = !(S.project.eventOverrides || {})[ev.id];
  $('evDisable').textContent = ev.disabled ? '启用' : '禁用';
  const typeSel = $('evInspType');
  if (typeSel) typeSel.value = ev.type || 'glitch';
  const badge = $('evInspBadge');
  if (badge) {
    let icon = '⚡', label = 'Glitch 故障';
    if (ev.type === 'flash' || ev.type === 'bloomFlash') { icon = '✦'; label = 'Flash 白闪'; }
    else if (ev.type === 'shake') { icon = '〰'; label = 'Shake 震动'; }
    else if (ev.type === 'chroma' || ev.type === 'radialChroma') { icon = '◈'; label = 'Chroma 色散'; }
    else if (ev.type === 'zoom') { icon = '◎'; label = 'Zoom 变焦'; }
    else if (ev.type === 'invert') { icon = '◐'; label = 'Invert 反转'; }
    else if (ev.type === 'mosaic') { icon = '☷'; label = 'Mosaic 马赛克'; }
    else { icon = '★'; label = (J.FXE[ev.type] && J.FXE[ev.type].name) || ev.type; }
    badge.textContent = `${icon} ${fxName(ev.type)}`;
  }
  const timeInput = $('evTimeInput');
  if (timeInput && document.activeElement !== timeInput) timeInput.value = ev.t.toFixed(3);
  const timeVal = $('evTimeVal');
  if (timeVal) timeVal.textContent = ev.t.toFixed(2) + 's';
  const amp = $('evAmp'), ampVal = $('evAmpVal');
  const a = ev.amp != null ? ev.amp : 1.0;
  if (amp) amp.value = a;
  if (ampVal) ampVal.textContent = a.toFixed(2) + '×';
  const dur = $('evDur'), durVal = $('evDurVal');
  const d = ev.dur != null ? ev.dur : 0.15;
  if (dur) { dur.min = 1 / S.plan.fps; dur.step = 1 / S.plan.fps; dur.max = Math.max(5, d); dur.value = d; }
  if (durVal) durVal.textContent = d.toFixed(2) + 's · ' + Math.round(d * S.plan.fps) + ' 帧';
}

function hideEventInspector() {
  const p = $('eventInspector');
  if (p) p.hidden = true;
  S.fxLoop = false;
  if ($('evPreview')) $('evPreview').setAttribute('aria-pressed', 'false');
  if ($('fxSelectionHint')) $('fxSelectionHint').hidden = false;
}

function fxName(type) {
  const names = { glitch: '复合故障', slice: '切片故障', block: '块状故障', invert: '反相', flash: '短闪', zoom: '缩放模糊', mosaic: '马赛克', shake: '轻震', chroma: '色散' };
  return names[type] || (J.FXE[type] || {}).name || type;
}
function fxDefaultDuration(type) {
  return type === 'flash' ? 3 / 24 : type === 'shake' ? 0.35 : ((J.FXE[type] || {}).dur || 6) / 24;
}
function snapFxTime(t, free, allowEnd = false) {
  if (!free && S.project.timing.snap) {
    let distance = 0.12, best = t;
    for (const b of S.plan.beats || []) if (Math.abs(b - t) < distance) { distance = Math.abs(b - t); best = b; }
    t = best;
  }
  return +J.clamp(t, 0, Math.max(0, S.plan.duration - (allowEnd ? 0 : 1 / S.plan.fps))).toFixed(6);
}
function selectFxEvent(ev) {
  pause(); S.selectedEvent = ev;
  if (ev) { updateEventInspector(ev); seek(Math.min(S.plan.duration - 0.001, ev.t + ev.dur * 0.25)); }
  else hideEventInspector();
  S.need = true; drawTimeline(); renderScreenFxEvents();
}
function editableFxEvent() {
  const ev = S.selectedEvent;
  if (!ev) return null;
  if (ev.manual) return (S.project.events || []).find(e => e.id === ev.id);
  const patches = S.project.eventOverrides || (S.project.eventOverrides = {});
  return patches[ev.id] || (patches[ev.id] = { t: ev.t, type: ev.type, amp: ev.amp, dur: ev.dur, disabled: !!ev.disabled });
}
function changeFxEvent(values) {
  if (S.exporting || S.tap || !S.selectedEvent) return;
  Object.assign(editableFxEvent(), values);
  Object.assign(S.selectedEvent, values);
}
function finishFxEdit() {
  clearTimeout(replanTimer); replan(); commit(); flushSave();
}
function addManualTimelineEvent(type, at = S.t, free = false) {
  if (S.exporting || S.tap || !J.FXE[type]) return;
  pushEdit(); remember(); pause();
  const t = snapFxTime(at, free);
  const ev = { id: 'ev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6), t, type, amp: 1, dur: Math.min(fxDefaultDuration(type), S.plan.duration - t), manual: true };
  (S.project.events || (S.project.events = [])).push(ev);
  S.selectedEvent = ev; finishFxEdit(); selectFxEvent(S.selectedEvent);
  toast('已添加 ' + fxName(type) + ' · ' + t.toFixed(2) + 's');
}
function deleteSelectedEvent() {
  if (S.exporting || S.tap || !S.selectedEvent) return;
  pushEdit(); remember();
  const ev = S.selectedEvent;
  if (ev.manual) S.project.events = (S.project.events || []).filter(e => e.id !== ev.id);
  else (S.project.eventOverrides || (S.project.eventOverrides = {}))[ev.id] = { deleted: true };
  selectFxEvent(null); finishFxEdit();
}
function nudgeSelectedEventTime(delta) {
  if (S.exporting || S.tap || !S.selectedEvent) return;
  pushEdit(); remember();
  const t = snapFxTime(S.selectedEvent.t + delta, true);
  changeFxEvent({ t, dur: Math.min(S.selectedEvent.dur, S.plan.duration - t) });
  finishFxEdit(); seek(t);
}
function fxTimelineRects(width) {
  const { vd, off } = tlView(), lanes = [];
  return (S.plan.events || []).map(ev => {
    const x = (ev.t - off) / vd * width, w = Math.max(12, ev.dur / vd * width);
    let lane = lanes.findIndex(end => end + 3 <= x);
    if (lane < 0) lane = lanes.length;
    lanes[lane] = x + w;
    return { ev, x, w, lane, y: 68 + lane * 26 };
  }).filter(r => r.x + r.w >= 0 && r.x <= width);
}
function fxEventAt(e) {
  if (!S.screenFxMode) return null;
  const bounds = $('timeline').getBoundingClientRect(), px = e.clientX - bounds.left, py = e.clientY - bounds.top;
  const r = fxTimelineRects(bounds.width).find(r => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + 22);
  return r ? { ev: r.ev, edge: px >= r.x + r.w - 6 ? 'right' : 'move' } : null;
}
function renderFxLibrary() {
  const grid = $('fxLibraryGrid'); grid.replaceChildren();
  const query = $('fxSearch').value.trim().toLowerCase(), category = $('fxCategory').value;
  const categoryOf = k => /glitch|slice|block|chroma|mosaic|noise|rgb|scan/i.test(k) ? 'glitch' : /flash|shake|zoom|impact|pulse/i.test(k) ? 'impact' : 'light';
  for (const type of J.FXE_ORDER) {
    if (!J.FXE[type] || category !== 'all' && categoryOf(type) !== category || query && !(fxName(type) + ' ' + type).toLowerCase().includes(query)) continue;
    const card = document.createElement('button'); card.type = 'button'; card.className = 'fx-card'; card.draggable = true;
    card.title = '预览 ' + fxName(type) + '；点击添加到播放头';
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 144;
    const label = document.createElement('span'); label.textContent = fxName(type);
    const hint = document.createElement('small'); hint.textContent = '＋ 添加 · ' + type;
    card.append(cv, label, hint); grid.append(card);
    paintTechCanvas(cv, 'fx', type, 0.1);
    let frame = 0, started = 0;
    const stop = () => { cancelAnimationFrame(frame); frame = 0; };
    const start = () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || frame) return;
      started = performance.now();
      const animate = now => {
        if (!S.screenFxMode || !cv.isConnected || document.hidden || S.exporting) { stop(); return; }
        paintTechCanvas(cv, 'fx', type, ((now - started) / 1000) % 1.05); frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
    };
    card.addEventListener('pointerenter', start); card.addEventListener('pointerleave', stop);
    card.addEventListener('focus', start); card.addEventListener('blur', stop);
    card.addEventListener('click', () => addManualTimelineEvent(type));
    card.addEventListener('dragstart', e => { stop(); e.dataTransfer.setData('application/x-jizura-fx', type); e.dataTransfer.effectAllowed = 'copy'; });
  }
  if (!grid.childElementCount) grid.textContent = '没有匹配的动效，试试其他分类或关键词。';
}

function bakeAutoEvents() {
  if (S.exporting || S.tap) return;
  pushEdit();
  remember();
  J.bakeEvents(S.project, S.plan);
  replan();
  commit();
  flushSave();
  syncFxModeUI();
  drawTimeline();
  const l = (document.documentElement.lang || '').toLowerCase();
  const isZh = l.startsWith('zh');
  toast(isZh ? '已将所有自动动效固化为时间轴手动事件，已关闭随机黑盒生成' : '全自動効果をタイムラインに固定しました（ランダム生成オフ）');
}

function clearAllEvents() {
  if (S.exporting || S.tap) return;
  pushEdit();
  remember();
  J.clearEvents(S.project);
  S.project.eventMode = 'manual';
  S.selectedEvent = null;
  hideEventInspector();
  replan();
  commit();
  flushSave();
  syncFxModeUI();
  drawTimeline();
  const l = (document.documentElement.lang || '').toLowerCase();
  const isZh = l.startsWith('zh');
  toast(isZh ? '已清空时间轴动效，已切换为纯手动模式' : 'タイムラインの効果をクリアし、手動モードに切り替えました');
}

function toggleFxEventMode() {
  if (S.exporting || S.tap) return;
  pushEdit();
  remember();
  S.project.eventMode = S.project.eventMode === 'manual' ? 'auto' : 'manual';
  replan();
  commit();
  flushSave();
  syncFxModeUI();
  drawTimeline();
  const isMan = S.project.eventMode === 'manual';
  const l = (document.documentElement.lang || '').toLowerCase();
  const isZh = l.startsWith('zh');
  if (isMan) {
    toast(isZh ? '已切换为纯手动掌控（已关闭随机黑盒）' : '純手動モードに切り替えました（ランダム生成オフ）');
  } else {
    toast(isZh ? '已切换为混合模式（自动生成+手动）' : '混合モードに切り替えました（自動生成＋手動）');
  }
}

function syncFxModeUI() {
  const btn = $('btnFxModeToggle');
  if (!btn) return;
  const isMan = S.project && S.project.eventMode === 'manual';
  const l = (document.documentElement.lang || '').toLowerCase();
  const isZh = l.startsWith('zh');
  btn.textContent = isMan
    ? (isZh ? '模式: 纯手动掌控' : 'モード: 手動のみ')
    : (isZh ? '模式: 混合(自动+手动)' : 'モード: 混合');
  btn.classList.toggle('accent', isMan);
}

/* Screen FX mode is UI state only; toggling never changes the project. */
function setScreenFxMode(on) {
  if (S.exporting || S.tap) return;
  pause(); S.screenFxMode = on; S.fxBypass = false;
  $('app').classList.toggle('screen-fx-mode', on);
  $('app').classList.toggle('fx-compare', !!(on && S.fxCompare));
  $('btnShotMode').setAttribute('aria-pressed', String(!on));
  $('btnScreenFxMode').setAttribute('aria-pressed', String(on));
  $('btnFxBypass').setAttribute('aria-pressed', 'false');
  $('btnFxBypass').textContent = '旁路动效';
  $('btnShotMode').classList.toggle('accent', !on);
  $('btnScreenFxMode').classList.toggle('accent', on);
  closeCutPick(); selectFxEvent(null);
  if (on) {
    const pane = document.querySelector('[data-pane="fx"]');
    $('fxGlobalControls').appendChild(pane); pane.hidden = false;
    $('fxSnap').checked = !!S.project.timing.snap;
    renderFxLibrary();
  }
  syncFxModeUI(); sizeViewport(); drawTimeline(); S.need = true;
}
let screenFxListSignature = '';
function renderScreenFxEvents() {
  const box = $('fxEventList'); if (!box || !S.screenFxMode) return;
  const events = S.plan.events || [];
  const signature = JSON.stringify(events) + '|' + (S.selectedEvent && S.selectedEvent.id);
  if (signature === screenFxListSignature) return;
  screenFxListSignature = signature; box.replaceChildren();
  if (!events.length) { box.textContent = '暂无动效，从左侧效果库添加，或在全片设置中开启自动生成。'; return; }
  events.forEach(ev => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'ghost';
    b.textContent = ev.t.toFixed(2) + 's · ' + fxName(ev.type) + ' · ' + (ev.disabled ? '已禁用' : ev.manual ? '手动' : (S.project.eventOverrides || {})[ev.id] ? '已修改' : '自动');
    b.setAttribute('aria-pressed', String(!!S.selectedEvent && S.selectedEvent.id === ev.id));
    b.addEventListener('click', () => { if (!S.exporting && !S.tap) selectFxEvent(ev); });
    box.appendChild(b);
  });
}

/* ---------------- keep the playing line in view (the list scrolls inside its column) ---------------- */
let listTouched = 0;
function followLine(li) {
  if (!S.playing || li < 0 || !fixedLayout()) return;
  if (performance.now() - listTouched < 2500) return;                       // the user is scrolling the list
  const el = S.lineEls[li], col = el && el.closest('.col-left');
  if (!el || !col || col.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  const tp = $('tapPanel'), pad = tp && !tp.hidden ? tp.offsetHeight + 12 : 8;   // 固定表示中のタップboxの下に隠れないように
  const r = el.getBoundingClientRect(), c = col.getBoundingClientRect();
  if (r.top >= c.top + pad && r.bottom <= c.bottom - 8) return;
  col.scrollTo({ top: col.scrollTop + (r.top - c.top) - Math.max(c.height * 0.3, pad + 24), behavior: 'smooth' });
}
function bindFollow() {
  const col = document.querySelector('.col-left'); if (!col) return;
  const touch = () => { listTouched = performance.now(); };
  col.addEventListener('wheel', touch, { passive: true }); col.addEventListener('touchmove', touch, { passive: true }); col.addEventListener('pointerdown', touch);
}

/* ---------------- cut info ---------------- */
const CHIP_GROUPS = [
  ['layout', 'l', 'レイアウト'], ['font', 'fn', 'フォント'], ['scheme', 's', '配色'], ['enter', 'e', '登場'], ['hold', 'h', '保持'], ['exit', 'x', '退場'],
  ['decor', '', '装飾'], ['treat', 't', '加工'], ['bg', 'b', '背景'], ['cam', 'c', 'カメラ'],
  ['fx', 'f', '画面効果'], ['trans', 'c', 'つなぎ'],
];
const cutPick = { g: null, line: -1, k: -1 };
let lastCutIdx = -2;

function lyricCutK(cut) {
  if (!cut || cut.line < 0) return -1;
  let k = 0;
  for (const c of S.plan.cuts) {
    if (c.line !== cut.line) continue;
    if (!J.LAYOUTS[c.layout] || (J.LAYOUTS[c.layout].special && c.layout !== 'interlude')) continue;
    if (c.index === cut.index) return k;
    k++;
  }
  return -1;
}
function cutQuietSlot(line, k) {
  const o = (S.project.overrides || {})[line] || {};
  return (o.cutQuiet && (o.cutQuiet[k] || o.cutQuiet[String(k)])) || {};
}
function markCutQuiet(i, k, groups, on) {
  if (i == null || i < 0 || k == null || k < 0) return;
  const cur = Object.assign({}, S.project.overrides[i] || {});
  const cutQuiet = Object.assign({}, cur.cutQuiet || {});
  const q = Object.assign({}, cutQuiet[k] || cutQuiet[String(k)] || {});
  delete cutQuiet[String(k)];
  groups.forEach(g => { if (on) q[g] = true; else delete q[g]; });
  if (Object.keys(q).length) cutQuiet[k] = q; else delete cutQuiet[k];
  if (Object.keys(cutQuiet).length) cur.cutQuiet = cutQuiet; else delete cur.cutQuiet;
  if (Object.keys(cur).length) S.project.overrides[i] = cur; else delete S.project.overrides[i];
}
function cutTechSlot(line, k) {
  const o = (S.project.overrides || {})[line] || {};
  const t = (o.cutTech && (o.cutTech[k] || o.cutTech[String(k)])) || {};
  const lay = o.cutLayouts && (o.cutLayouts[k] || o.cutLayouts[String(k)]);
  const sch = o.cutSchemes && (o.cutSchemes[k] != null ? o.cutSchemes[k] : o.cutSchemes[String(k)]);
  const f = o.cutFonts && (o.cutFonts[k] || o.cutFonts[String(k)]);
  let res = t;
  if (lay && res.layout == null) res = Object.assign({ layout: lay }, res);
  if (sch != null && res.scheme == null) res = Object.assign({ scheme: sch }, res);
  if (f && res.font == null) res = Object.assign({ font: f }, res);
  return res;
}
function cutGroupVal(cut, g) {
  if (g === 'scheme') return cut ? ((cut.scheme != null) ? cut.scheme : 0) : 0;
  if (g === 'layout') return cut ? (cut.layout || '') : '';
  if (g === 'font') return (cut && (cut.font || (cut.params && cut.params.font))) || '';
  if (g === 'enter') return cut ? (cut.enter || '') : '';
  if (g === 'hold') return cut ? (cut.hold || '') : '';
  if (g === 'exit') return cut ? (cut.exit || '') : '';
  if (g === 'treat') return cut ? (cut.treat || 'none') : 'none';
  if (g === 'bg') return cut ? (cut.bg || 'none') : 'none';
  if (g === 'cam') return cut ? (cut.cam || 'push') : 'push';
  if (g === 'trans') return cut ? (cut.trans || '') : '';
  if (g === 'decor') return (cut && cut.decor && cut.decor[0] && cut.decor[0].id) || '';
  if (g === 'fx') return cut ? (cut.fx || '') : '';
  return '';
}
function groupName(g, k) {
  if (g === 'scheme') {
    const s = +k;
    return isFinite(s) ? `配色 ${s + 1}` : '自動';
  }
  if (g === 'font') {
    if (!k) return '自動';
    const def = J.FONTS && J.FONTS[k];
    return (def && (def.label || def.name)) || k;
  }
  if (!k) return 'なし';
  if (k === 'none') return (g === 'bg' && J.BG.none ? J.BG.none.name : 'なし');
  const tbl = J.registry(g);
  return (tbl && tbl[k] && tbl[k].name) || k;
}
function groupCode(g, k) {
  if (!k || k === 'none' || g === 'scheme' || g === 'font') return '';
  return J.codeOf(g, k) || '';
}
function pickEnabledTech(g, opts) {
  opts = opts || {};
  if (g === 'scheme') {
    const st = (S.plan && S.plan.style) || J.resolveStyle(S.project);
    const n = (st && st.schemes && st.schemes.length) || 1;
    if (n <= 1) return '0';
    let cands = [];
    for (let s = 0; s < n; s++) {
      if (opts.avoid == null || String(s) !== String(opts.avoid)) cands.push(String(s));
    }
    if (!cands.length) cands = ['0'];
    return cands[(Math.random() * cands.length) | 0];
  }
  const tbl = J.registry(g) || {};
  const en = (S.project.enabled || {})[g] || {};
  let keys = J.order(g).filter(key => {
    const def = tbl[key];
    if (!def || def.special) return false;
    if (en[key] === false) return false;
    return !J.randomOk || J.randomOk(S.project, g, key);
  });
  if (!keys.length) keys = J.order(g).filter(key => tbl[key] && !tbl[key].special && en[key] !== false);
  if (g === 'layout' && opts.n != null) {
    const fit = keys.filter(key => !J.LAYOUTS[key].fits || J.LAYOUTS[key].fits(opts.n));
    if (fit.length) keys = fit;
  }
  if (opts.allowNone && !keys.includes('none')) keys = ['none'].concat(keys);
  if (opts.avoid && keys.length > 1) keys = keys.filter(key => key !== opts.avoid);
  if (!keys.length) return '';
  return keys[(Math.random() * keys.length) | 0];
}
function rerollCurrentCut(kind) {
  if (S.exporting || S.tap) return;
  const cut = J.cutAt(S.plan, S.t);
  const k = lyricCutK(cut);
  if (!cut || k < 0) { toast('この位置のカットは抽選できません'); return; }
  pushEdit();
  if (typeof preserveOtherLines === 'function') preserveOtherLines(cut.line);
  if (S.project.overrides && S.project.overrides[cut.line]) {
    delete S.project.overrides[cut.line].savedCuts;
  }
  ED.batching = true;
  try {
    remember();
    const n = [...String(cut.text || '').replace(/\s+/g, '')].length;
    const isInter = cut.layout === 'interlude';
    const groups = isInter
      ? ['bg', 'decor', 'cam', 'fx', 'enter', 'exit', 'trans', 'scheme']
      : (kind === 'omakase' ? CHIP_GROUPS.map(x => x[0]).filter(g => g !== 'font' && (g !== 'layout' || !isInter)) : ['layout', 'scheme', 'enter', 'hold', 'exit', 'cam', 'trans', 'fx']);
    const t0 = S.t;
    groups.forEach(g => {
      const allowNone = g === 'decor' || g === 'trans' || g === 'fx';
      const key = pickEnabledTech(g, { avoid: kind === 'omakase' ? cutGroupVal(cut, g) : null, allowNone, n });
      if (key) setCutTech(cut.line, k, g, key);
    });
    markCutQuiet(cut.line, k, groups, true);
    closeCutPick();
    replan();
    commit();
    seek(t0);
    toast(kind === 'omakase' ? 'このカットをおまかせ' : 'このカットをシャッフル');
  } finally {
    ED.batching = false;
  }
}

/* ---------------- cut copy / paste / sync ---------------- */
let copiedCutTech = null;
try {
  const saved = localStorage.getItem('jizura.copiedCutTech.v1');
  if (saved) copiedCutTech = JSON.parse(saved);
} catch (e) {}

function getCutStyleSnapshot(cut) {
  if (!cut) return null;
  const k = lyricCutK(cut);
  const slot = (cut.line >= 0 && k >= 0) ? cutTechSlot(cut.line, k) : {};
  const isInter = cut.layout === 'interlude';
  const st = (S.plan && S.plan.style) || J.resolveStyle(S.project);
  const nSchemes = (st && st.schemes && st.schemes.length) || 1;
  const curSch = slot.scheme != null ? slot.scheme : ((cut.scheme != null ? cut.scheme : 0) % nSchemes);
  const cutFont = slot.font || cut.font || (cut.params && cut.params.font) || '';

  return {
    layout: slot.layout || cut.layout || '',
    font: isInter ? '' : cutFont,
    scheme: curSch,
    enter: slot.enter || cut.enter || 'blur',
    hold: isInter ? 'still' : (slot.hold || cut.hold || 'still'),
    exit: slot.exit || cut.exit || 'blur',
    decor: slot.decor !== undefined ? slot.decor : ((cut.decor && cut.decor[0] && cut.decor[0].id) || 'none'),
    treat: isInter ? 'none' : (slot.treat || cut.treat || 'none'),
    bg: slot.bg || cut.bg || 'none',
    cam: slot.cam || cut.cam || 'push',
    fx: slot.fx || cut.fx || 'none',
    trans: slot.trans || cut.trans || 'none'
  };
}

function applyStyleToCutSlot(i, k, style, opts = {}) {
  if (i == null || i < 0 || k == null || k < 0 || !style) return;
  const isInter = S.plan.cuts.some(c => c.line === i && c.index === k && c.layout === 'interlude');

  const cur = Object.assign({}, S.project.overrides[i] || {});
  const cutTech = Object.assign({}, cur.cutTech || {});
  const slot = Object.assign({}, cutTech[k] || cutTech[String(k)] || {});
  delete cutTech[String(k)];

  const groups = ['scheme', 'font', 'enter', 'hold', 'exit', 'decor', 'treat', 'bg', 'cam', 'fx', 'trans'];
  if (!opts.skipLayout && !isInter && style.layout) {
    groups.unshift('layout');
  }

  for (const g of groups) {
    if (isInter && (g === 'layout' || g === 'font' || g === 'hold' || g === 'treat')) continue;
    if (opts.only && !opts.only.includes(g)) continue;
    const val = style[g];
    if (val === undefined || val === '') {
      delete slot[g];
    } else {
      slot[g] = g === 'scheme' ? +val : val;
    }
  }

  if (Object.keys(slot).length) cutTech[k] = slot;
  else delete cutTech[k];
  if (Object.keys(cutTech).length) cur.cutTech = cutTech; else delete cur.cutTech;

  const cutQuiet = Object.assign({}, cur.cutQuiet || {});
  const q = Object.assign({}, cutQuiet[k] || cutQuiet[String(k)] || {});
  delete cutQuiet[String(k)];
  for (const g of groups) delete q[g];
  if (Object.keys(q).length) cutQuiet[k] = q; else delete cutQuiet[k];
  if (Object.keys(cutQuiet).length) cur.cutQuiet = cutQuiet; else delete cur.cutQuiet;

  if (slot.layout) {
    const cutLayouts = Object.assign({}, cur.cutLayouts || {});
    cutLayouts[k] = slot.layout;
    cur.cutLayouts = cutLayouts;
  }
  if (slot.font) {
    const cutFonts = Object.assign({}, cur.cutFonts || {});
    cutFonts[k] = slot.font;
    cur.cutFonts = cutFonts;
  }
  if (slot.scheme != null) {
    const cutSchemes = Object.assign({}, cur.cutSchemes || {});
    cutSchemes[k] = +slot.scheme;
    cur.cutSchemes = cutSchemes;
  }

  if (Object.keys(cur).length) S.project.overrides[i] = cur; else delete S.project.overrides[i];
}

function copyCurrentCutStyle() {
  const cut = J.cutAt(S.plan, S.t);
  if (!cut) { toast('コピーするカットがありません'); return; }
  copiedCutTech = getCutStyleSnapshot(cut);
  try {
    localStorage.setItem('jizura.copiedCutTech.v1', JSON.stringify(copiedCutTech));
  } catch (e) {}
  updateCutInfo();
  toast(`カット #${String(cut.index + 1).padStart(2, '0')} のパラメータをコピーしました`);
}

function pasteCutStyleToCurrent(skipLayout = false) {
  const cut = J.cutAt(S.plan, S.t);
  const k = lyricCutK(cut);
  if (!cut || k < 0) { toast('貼り付け先のカットがありません'); return; }
  if (!copiedCutTech) { toast('コピーされたパラメータがありません'); return; }

  pushEdit();
  ED.batching = true;
  try {
    remember();
    applyStyleToCutSlot(cut.line, k, copiedCutTech, { skipLayout });
    replan();
    commit();
    seek(cut.start + Math.min(cut.dur * 0.5, cut.inDur + 0.05));
    toast('このカットにパラメータを貼り付けました');
  } finally {
    ED.batching = false;
  }
}

function applyCutStyleToLine(includeLayout = false) {
  const cut = J.cutAt(S.plan, S.t);
  if (!cut || cut.line < 0) { toast('適用先の行がありません'); return; }
  const style = copiedCutTech || getCutStyleSnapshot(cut);
  if (!style) { toast('スタイルを取得できませんでした'); return; }

  pushEdit();
  ED.batching = true;
  try {
    remember();
    const lineCuts = S.plan.cuts.filter(c => c.line === cut.line);
    lineCuts.forEach(c => {
      const kk = lyricCutK(c);
      if (kk >= 0) applyStyleToCutSlot(cut.line, kk, style, { skipLayout: !includeLayout });
    });
    replan();
    commit();
    toast('この行の全カットにスタイルを適用しました');
  } finally {
    ED.batching = false;
  }
}

function applyCutStyleToAll(includeLayout = false) {
  const cut = J.cutAt(S.plan, S.t);
  const style = copiedCutTech || (cut ? getCutStyleSnapshot(cut) : null);
  if (!style) { toast('適用するスタイルがありません'); return; }

  pushEdit();
  ED.batching = true;
  try {
    remember();
    S.plan.cuts.forEach(c => {
      if (c.line < 0) return;
      const kk = lyricCutK(c);
      if (kk >= 0) applyStyleToCutSlot(c.line, kk, style, { skipLayout: !includeLayout });
    });
    replan();
    commit();
    toast(includeLayout ? '全カットに完全なパラメータ（構図含む）を統一しました' : '全カットのスタイル（配色・動效・質感・背景等）を統一しました');
  } finally {
    ED.batching = false;
  }
}

function applyCutStyleToRange(includeLayout = false) {
  const R = exportRangeLines();
  if (!R || R.from < 0 || R.to < R.from) { toast('書き出し範囲が設定されていません'); return; }
  const cut = J.cutAt(S.plan, S.t);
  const style = copiedCutTech || (cut ? getCutStyleSnapshot(cut) : null);
  if (!style) { toast('適用するスタイルがありません'); return; }

  pushEdit();
  ED.batching = true;
  try {
    remember();
    S.plan.cuts.forEach(c => {
      if (c.line < R.from || c.line > R.to) return;
      const kk = lyricCutK(c);
      if (kk >= 0) applyStyleToCutSlot(c.line, kk, style, { skipLayout: !includeLayout });
    });
    replan();
    commit();
    toast(`範囲内（${R.from + 1}〜${R.to + 1}行目）のカットにスタイルを適用しました`);
  } finally {
    ED.batching = false;
  }
}

function clearCurrentCutTech() {
  const cut = J.cutAt(S.plan, S.t);
  const k = lyricCutK(cut);
  if (!cut || k < 0) { toast('解除するカットがありません'); return; }

  pushEdit();
  ED.batching = true;
  try {
    remember();
    const cur = Object.assign({}, S.project.overrides[cut.line] || {});
    if (cur.cutTech) {
      delete cur.cutTech[k]; delete cur.cutTech[String(k)];
      if (!Object.keys(cur.cutTech).length) delete cur.cutTech;
    }
    if (cur.cutQuiet) {
      delete cur.cutQuiet[k]; delete cur.cutQuiet[String(k)];
      if (!Object.keys(cur.cutQuiet).length) delete cur.cutQuiet;
    }
    if (cur.cutLayouts) {
      delete cur.cutLayouts[k]; delete cur.cutLayouts[String(k)];
      if (!Object.keys(cur.cutLayouts).length) delete cur.cutLayouts;
    }
    if (cur.cutFonts) {
      delete cur.cutFonts[k]; delete cur.cutFonts[String(k)];
      if (!Object.keys(cur.cutFonts).length) delete cur.cutFonts;
    }
    if (cur.cutSchemes) {
      delete cur.cutSchemes[k]; delete cur.cutSchemes[String(k)];
      if (!Object.keys(cur.cutSchemes).length) delete cur.cutSchemes;
    }
    if (Object.keys(cur).length) S.project.overrides[cut.line] = cur;
    else delete S.project.overrides[cut.line];

    replan();
    commit();
    toast('このカットの固定を解除し、自動に戻しました');
  } finally {
    ED.batching = false;
  }
}

/* 単独随机某个附属/首镜头 (不影响该行其他镜头及全局随机流) */
function rollCutSlot(lineIdx, k) {
  if (S.exporting || S.tap) return;
  pushEdit();
  ED.batching = true;
  try {
    remember();
    const cutsInLine = S.plan.cuts.filter(c => c.line === lineIdx && J.LAYOUTS[c.layout] && !J.LAYOUTS[c.layout].special);
    const cut = cutsInLine[k];
    const n = cut ? [...String(cut.text || '').replace(/\s+/g, '')].length : 4;
    const isInter = cut && cut.layout === 'interlude';
    const groups = isInter
      ? ['bg', 'decor', 'cam', 'fx', 'enter', 'exit', 'trans', 'scheme']
      : ['layout', 'scheme', 'enter', 'hold', 'exit', 'cam', 'trans', 'fx'];
    groups.forEach(g => {
      const allowNone = g === 'decor' || g === 'trans' || g === 'fx';
      const key = pickEnabledTech(g, { avoid: cut ? cutGroupVal(cut, g) : null, allowNone, n });
      if (key) setCutTech(lineIdx, k, g, key);
    });
    markCutQuiet(lineIdx, k, groups, true);
    replan();
    commit();
    const updated = S.plan.cuts.filter(c => c.line === lineIdx && J.LAYOUTS[c.layout] && !J.LAYOUTS[c.layout].special)[k];
    if (updated) seek(updated.start + Math.min(updated.dur * 0.5, updated.inDur + 0.05));
    const l = (document.documentElement.lang || '').toLowerCase();
    const isZh = l.startsWith('zh');
    toast(isZh ? `已单独随机第 ${lineIdx + 1} 行第 ${k + 1} 个镜头` : `${lineIdx + 1}行目 カット${k + 1} を再抽選しました`);
  } finally {
    ED.batching = false;
  }
}

/* 微调当前播放头镜头的打轴时间 (delta 秒，如 -0.05 或 +0.05) */
function nudgeCurrentCutTime(delta = 0.05) {
  if (S.exporting || S.tap) return;
  const cut = J.cutAt(S.plan, S.t);
  if (!cut || cut.line < 0) return;
  const li = cut.line, ln = S.plan.lines[li];
  if (!ln) return;
  const k = lyricCutK(cut);
  pushEdit();
  remember();

  const l = (document.documentElement.lang || '').toLowerCase();
  const isZh = l.startsWith('zh');
  let newT = cut.start + delta;

  if (k > 0) {
    // 附属镜头微调：保持在行内 [ln.start + 0.05 * k, ln.visEnd - 0.05]
    const minT = ln.start + 0.05 * k;
    const maxT = Math.max(minT, ln.visEnd - 0.05);
    newT = J.clamp(newT, minT, maxT);
    const ct = Object.assign({}, (S.project.overrides[li] || {}).cutTime || {});
    ct[k] = +Math.max(0, newT - ln.start).toFixed(3);
    setOv(li, { cutTime: ct });
  } else {
    // 首镜头微调 (即调整整行起始时间)
    if (!S.project.timing.lineTimes) S.project.timing.lineTimes = {};
    const lt = S.project.timing.lineTimes, L = S.plan.lines;
    const fix = j => (lt[j] != null && isFinite(+lt[j])) ? +lt[j] : (L[j] && L[j].lrc != null ? L[j].lrc : null);
    let lo = 0, hi = Infinity;
    for (let j = li - 1; j >= 0; j--) { const f = fix(j); if (f != null) { lo = f + 0.05; break; } }
    for (let j = li + 1; j < L.length; j++) { const f = fix(j); if (f != null) { hi = f - 0.05; break; } }
    newT = J.clamp(newT, lo, hi);
    lt[li] = +newT.toFixed(3);
  }
  replan();
  commit();
  seek(Math.max(0, newT) + 0.001);
  const sign = delta > 0 ? '+' : '';
  const cutLabel = k > 0 ? (isZh ? `第 ${li + 1} 行 镜头 ${k + 1}` : `${li + 1}行目 カット${k + 1}`) : (isZh ? `第 ${li + 1} 行首镜头` : `${li + 1}行目の開始時刻`);
  toast(isZh ? `微调 ${cutLabel} 打轴：${newT.toFixed(2)}s (${sign}${delta.toFixed(2)}s)` : `${cutLabel} を微調整：${newT.toFixed(2)}秒 (${sign}${delta.toFixed(2)}秒)`);
}

function buildCutActionButtons(cut, k) {
  const R = exportRangeLines();
  const hasRange = R && R.from >= 0 && R.to >= R.from;
  const isTitle = cut && cut.layout === 'title';
  const isInter = cut && cut.layout === 'interlude';
  const isCutValid = cut && (k >= 0 || isInter || isTitle);
  const pasteDisabled = !isCutValid || !copiedCutTech;
  const l = (document.documentElement.lang || '').toLowerCase();
  const isZh = l.startsWith('zh');
  let cardDeleteBtn = '';
  if (isTitle) {
    cardDeleteBtn = `<button type="button" class="ghost small cut-action-btn danger btn-del-card" id="btnDeleteCard" title="${isZh ? '一键删除标题卡（消除片头卡片）' : 'タイトルカードを削除'}">🗑️ ${isZh ? '删除卡片' : 'カード削除'}</button>`;
  } else if (isInter) {
    cardDeleteBtn = `<button type="button" class="ghost small cut-action-btn danger btn-del-card" id="btnDeleteCard" title="${isZh ? '一键删除间奏卡（无缝平滑衔接）' : '間奏カットを削除'}">🗑️ ${isZh ? '删除卡片' : 'カード削除'}</button>`;
  }
  return `
    ${cardDeleteBtn}
    <span class="cut-actions-sep"></span>
    <button type="button" class="ghost small cut-action-btn" id="btnNudgeBack" ${isCutValid ? '' : 'disabled'} title="${isZh ? '微调打轴：提前 0.05s (快捷键 [ )' : '打鍵微調整：0.05秒戻す (ショートカット [ )'}">◀ -0.05s</button>
    <button type="button" class="ghost small cut-action-btn" id="btnNudgeFwd" ${isCutValid ? '' : 'disabled'} title="${isZh ? '微调打轴：推后 0.05s (快捷键 ] )' : '打鍵微調整：0.05秒進める (ショートカット ] )'}">+0.05s ▶</button>
    <span class="cut-actions-sep"></span>
    <button type="button" class="ghost small cut-action-btn cut-copy" id="btnCutCopy" ${isCutValid ? '' : 'disabled'} title="このカットのパラメータをコピー (Alt+C)">パラメータコピー</button>
    <button type="button" class="ghost small cut-action-btn cut-paste" id="btnCutPaste" ${pasteDisabled ? 'disabled' : ''} title="コピーしたパラメータをこのカットに貼り付け (Alt+V)">貼り付け</button>
    <div class="cut-sync-menu-wrap">
      <button type="button" class="ghost small cut-action-btn cut-sync-btn" id="btnCutSync" ${isCutValid || copiedCutTech ? '' : 'disabled'} title="スタイルの一括適用・共有">スタイル共有 ▾</button>
      <div class="cut-sync-menu" id="cutSyncMenu" hidden>
        <button type="button" class="cut-sync-item" data-action="line">この行の全カットに適用</button>
        <button type="button" class="cut-sync-item" data-action="all-style">全カットのスタイルを統一（構図は維持）</button>
        <button type="button" class="cut-sync-item" data-action="all-full">全カットを完全一致（構図も統一）</button>
        ${hasRange ? '<button type="button" class="cut-sync-item" data-action="range">書き出し範囲に適用</button>' : ''}
        <div class="cut-sync-divider"></div>
        <button type="button" class="cut-sync-item danger" data-action="reset">このカットを自動に戻す</button>
      </div>
    </div>
  `;
}

function bindCutActions(el) {
  const btnDeleteCard = el.querySelector('#btnDeleteCard');
  if (btnDeleteCard) {
    btnDeleteCard.addEventListener('click', () => {
      const currentCut = J.cutAt(S.plan, S.t);
      if (!currentCut) return;
      pushEdit();
      if (!S.project.deletedCards) S.project.deletedCards = { title: false, gaps: {}, lines: {} };
      const l = (document.documentElement.lang || '').toLowerCase();
      const isZh = l.startsWith('zh');
      if (currentCut.layout === 'title') {
        S.project.deletedCards.title = true;
        S.project.titleCard = false;
        replan();
        flushSave();
        toast(isZh ? '已删除标题卡（消除片头卡片）' : 'タイトルカードを削除しました');
      } else if (currentCut.layout === 'interlude') {
        if (!S.project.deletedCards.gaps) S.project.deletedCards.gaps = {};
        if (currentCut.line >= 0) {
          S.project.deletedCards.gaps[currentCut.line] = true;
          if (S.plan.lines[currentCut.line] && S.plan.lines[currentCut.line].interlude) {
            if (!S.project.deletedCards.lines) S.project.deletedCards.lines = {};
            S.project.deletedCards.lines[currentCut.line] = true;
          }
        }
        replan();
        flushSave();
        toast(isZh ? '已删除间奏卡（无缝平滑衔接）' : '間奏カットを削除しました');
      }
    });
  }

  const btnNudgeBack = el.querySelector('#btnNudgeBack');
  if (btnNudgeBack) btnNudgeBack.addEventListener('click', () => nudgeCurrentCutTime(-0.05));

  const btnNudgeFwd = el.querySelector('#btnNudgeFwd');
  if (btnNudgeFwd) btnNudgeFwd.addEventListener('click', () => nudgeCurrentCutTime(0.05));

  const btnCopy = el.querySelector('#btnCutCopy');
  if (btnCopy) btnCopy.addEventListener('click', () => copyCurrentCutStyle());

  const btnPaste = el.querySelector('#btnCutPaste');
  if (btnPaste) btnPaste.addEventListener('click', () => pasteCutStyleToCurrent(false));

  const btnSync = el.querySelector('#btnCutSync');
  const syncMenu = el.querySelector('#cutSyncMenu');
  if (btnSync && syncMenu) {
    btnSync.addEventListener('click', e => {
      e.stopPropagation();
      syncMenu.hidden = !syncMenu.hidden;
    });
    syncMenu.querySelectorAll('.cut-sync-item').forEach(item => {
      item.addEventListener('click', e => {
        e.stopPropagation();
        syncMenu.hidden = true;
        const act = item.dataset.action;
        if (act === 'line') applyCutStyleToLine(false);
        else if (act === 'all-style') applyCutStyleToAll(false);
        else if (act === 'all-full') applyCutStyleToAll(true);
        else if (act === 'range') applyCutStyleToRange(false);
        else if (act === 'reset') clearCurrentCutTech();
      });
    });
  }
}

function updateCutInfo() {
  const cut = J.cutAt(S.plan, S.t);
  const idx = cut ? cut.index : -1;
  const li = cut ? cut.line : -1;
  if (li !== S.curLine) { S.lineEls.forEach((el, i) => el.classList.toggle('cur', i === li)); S.curLine = li; followLine(li); }
  if (idx === lastCutIdx) return;
  lastCutIdx = idx;
  // the cut playing now is marked in the line list
  document.querySelectorAll('.cut-lay.playing, .cut-sch.playing, .cut-font.playing, .cut-pair.playing').forEach(x => x.classList.remove('playing'));
  if (cut && S.lineEls[li]) {
    const kk = lyricCutK(cut);
    if (kk >= 0) {
      const cs = S.lineEls[li].querySelector(`.cut-lay[data-k="${kk}"]`);
      if (cs) cs.classList.add('playing');
      const csf = S.lineEls[li].querySelector(`.cut-font[data-k="${kk}"]`);
      if (csf) csf.classList.add('playing');
      const csc = S.lineEls[li].querySelector(`.cut-sch[data-k="${kk}"]`);
      if (csc) csc.classList.add('playing');
      const cp = S.lineEls[li].querySelector(`.cut-pair[data-k="${kk}"]`);
      if (cp) cp.classList.add('playing');
    }
  }
  const el = $('cutInfo');
  if (!cut) { el.innerHTML = '<span class="hint">この位置にカットはありません</span>'; closeCutPick(); return; }
  const st = (S.plan && S.plan.style) || J.resolveStyle(S.project);
  const nSchemes = (st && st.schemes && st.schemes.length) || 1;
  const curSchIdx = (cut.scheme != null ? cut.scheme : 0) % nSchemes;
  const curSch = (st && st.schemes && st.schemes[curSchIdx]) || {};
  const schDot = curSch.bg ? `<i class="sch-dot" style="background:${curSch.bg};border:1px solid ${curSch.accent || curSch.fg || '#fff'}"></i>` : '';
  const isInter = cut.layout === 'interlude';
  const k = lyricCutK(cut);
  if (S.mode !== 'pro') {          // かんたん／スマホは本家と同じ静的なチップ表示
    closeCutPick();
    const chip = (cls, k, v, code) => `<span class="chip ${cls}"><b>${k}</b>${code ? `<span class="chip-code">${code}</span>` : ''}${v}</span>`;
    const n = (tbl, k) => (tbl[k] ? tbl[k].name : k);
    const fnName = k => (J.FONTS && J.FONTS[k] ? (J.FONTS[k].label || J.FONTS[k].name) : k);
    const cutFont = cut.font || (cut.params && cut.params.font);
    el.innerHTML = [
      `<span class="chip mono">#${String(cut.index + 1).padStart(2, '0')}</span>`,
      chip('l', 'レイアウト', n(J.LAYOUTS, cut.layout), groupCode('layout', cut.layout)),
      !isInter && cutFont ? chip('fn', 'フォント', fnName(cutFont), '') : '',
      chip('s', '配色', `${schDot}配色 ${curSchIdx + 1}`, ''),
      chip('e', '登場', n(J.ENTER, cut.enter), groupCode('enter', cut.enter)),
      chip('h', '保持', n(J.HOLD, cut.hold), groupCode('hold', cut.hold)),
      chip('x', '退場', n(J.EXIT, cut.exit), groupCode('exit', cut.exit)),
      cut.decor && cut.decor.length ? chip('', '装飾', cut.decor.map(d => (groupCode('decor', d.id) ? `[${groupCode('decor', d.id)}] ` : '') + n(J.DECOR, d.id)).join('・'), '') : '',
      cut.treat && cut.treat !== 'none' ? chip('t', '加工', n(J.TREAT, cut.treat), groupCode('treat', cut.treat)) : '',
      cut.bg && cut.bg !== 'none' ? chip('b', '背景', n(J.BG, cut.bg), groupCode('bg', cut.bg)) : '',
      cut.cam && cut.cam !== 'push' ? chip('c', 'カメラ', n(J.CAMERA, cut.cam), groupCode('cam', cut.cam)) : '',
      cut.fx && cut.fx !== 'none' ? chip('f', '画面効果', n(J.FXE, cut.fx), groupCode('fx', cut.fx)) : '',
      cut.trans ? chip('c', 'つなぎ', n(J.TRANS, cut.trans), groupCode('trans', cut.trans)) : '',
      buildCutActionButtons(cut, k)
    ].join('');
    bindCutActions(el);
    return;
  }
  const slot = k >= 0 ? cutTechSlot(cut.line, k) : {};
  const quiet = k >= 0 ? cutQuietSlot(cut.line, k) : {};
  const bits = [`<span class="chip mono">#${String(cut.index + 1).padStart(2, '0')}</span>`];
  CHIP_GROUPS.forEach(([g, cls, label]) => {
    if (isInter && (g === 'hold' || g === 'treat' || g === 'font')) return;
    if (cut.layout === 'title' && (g === 'hold' || g === 'treat' || g === 'font')) return;
    if ((isInter || cut.layout === 'title') && g === 'layout') {
      const valKey = cutGroupVal(cut, g);
      const cCode = groupCode(g, valKey);
      const codeBadge = cCode ? `<span class="chip-code">${cCode}</span>` : '';
      bits.push(`<button type="button" class="chip l" disabled><b>${label}</b>${codeBadge}${escapeHtml(groupName(g, valKey))}</button>`);
      return;
    }
    const forced = slot[g] != null && slot[g] !== '' && !quiet[g];
    const valKey = cutGroupVal(cut, g);
    const cCode = groupCode(g, valKey);
    const codeBadge = cCode ? `<span class="chip-code">${cCode}</span>` : '';
    let valLabel = escapeHtml(groupName(g, valKey));
    if (g === 'scheme' && schDot) valLabel = schDot + valLabel;
    bits.push(`<button type="button" class="chip ${cls}${forced ? ' is-forced' : ''}" data-g="${g}" aria-pressed="${cutPick.g === g ? 'true' : 'false'}" ${k < 0 ? 'disabled' : ''}><b>${label}</b>${codeBadge}${valLabel}</button>`);
  });
  bits.push(`<button type="button" class="ghost small cut-roll" data-roll="shuffle" ${k < 0 ? 'disabled' : ''} title="このカットだけ構成を再抽選">シャッフル</button>`);
  bits.push(`<button type="button" class="ghost small cut-roll accent" data-roll="omakase" ${k < 0 ? 'disabled' : ''} title="このカットだけ手法をランダムに">おまかせ</button>`);
  bits.push(buildCutActionButtons(cut, k));
  el.innerHTML = bits.join('');
  if (k >= 0) {
    el.querySelectorAll('button.chip[data-g]').forEach(b => b.addEventListener('click', () => toggleCutPick(b.dataset.g, cut, k)));
    el.querySelectorAll('button.cut-roll').forEach(b => b.addEventListener('click', () => rerollCurrentCut(b.dataset.roll)));
  }
  bindCutActions(el);
  followCutPick(cut, k);
}
function followCutPick(cut, k) {
  if (S.mode !== 'pro' || !cutPick.g) return;
  const p = $('cutPick');
  if (!cut || k < 0) {
    cutPick.g = null; cutPick.line = -1; cutPick.k = -1;
    if (p) p.hidden = true;
    return;
  }
  cutPick.line = cut.line;
  cutPick.k = k;
  if (p) p.hidden = false;
  fillCutPick();
}
function closeCutPick() {
  cutPick.g = null; cutPick.line = -1; cutPick.k = -1;
  const p = $('cutPick'); if (p) p.hidden = true;
  const f = $('cutPickFilter'); if (f) f.value = '';
  const c = $('cutPickFilterClear'); if (c) c.hidden = true;
  lastCutIdx = -2;
}
function toggleCutPick(g, cut, k) {
  if (S.mode !== 'pro') return;
  if (cutPick.g === g && cutPick.line === cut.line && cutPick.k === k) { closeCutPick(); updateCutInfo(); return; }
  cutPick.g = g; cutPick.line = cut.line; cutPick.k = k;
  $('cutPick').hidden = false;
  fillCutPick();
  lastCutIdx = -2; updateCutInfo();
  setTimeout(() => { const f = $('cutPickFilter'); if (f) f.focus(); }, 30);
}
function fillCutPick() {
  const g = cutPick.g, grid = $('cutPickGrid');
  if (!g || !grid) return;
  const meta = CHIP_GROUPS.find(x => x[0] === g);
  const cut = J.cutAt(S.plan, S.t);
  const prefix = J.GROUP_CODE_PREFIX ? (J.GROUP_CODE_PREFIX[g] || '') : '';
  const prefixStr = prefix ? ` [${prefix}]` : '';
  $('cutPickTitle').textContent = (meta ? meta[2] : g) + prefixStr + (cut ? ' · #' + String(cut.index + 1).padStart(2, '0') : '');
  const cur = cut ? cutGroupVal(cut, g) : '';
  const forced = cutTechSlot(cutPick.line, cutPick.k)[g];
  const onKey = forced || cur;
  grid.innerHTML = '';

  const filterWrap = $('cutPickSearchWrap');
  const filterInput = $('cutPickFilter');
  const clearBtn = $('cutPickFilterClear');
  if (filterWrap) filterWrap.hidden = (g === 'scheme');
  const q = (filterInput && !filterWrap.hidden ? filterInput.value || '' : '').trim();
  if (clearBtn) clearBtn.hidden = !q;

  if (g === 'scheme') {
    const st = (S.plan && S.plan.style) || J.resolveStyle(S.project);
    const schemes = (st && st.schemes) || [];
    const nSchemes = schemes.length || 1;
    const curIdx = cut ? ((cut.scheme != null ? cut.scheme : 0) % nSchemes) : 0;
    const forcedSch = cutTechSlot(cutPick.line, cutPick.k).scheme;
    const isForced = forcedSch != null && forcedSch !== '';

    schemes.forEach((sc, idx) => {
      const b = document.createElement('button');
      b.type = 'button';
      const isSelected = isForced ? (+forcedSch === idx) : (curIdx === idx);
      b.className = 'tcard' + (isSelected ? ' is-on' : '');
      b.title = `配色 ${idx + 1}`;

      const [W, H] = J.designSize(S.project.aspect || '16:9');
      const th = 80, tw = Math.max(72, Math.round(th * W / H));
      const cv = document.createElement('canvas');
      cv.width = tw; cv.height = th;
      const x = cv.getContext('2d');
      x.fillStyle = sc.bg || '#060607';
      x.fillRect(0, 0, tw, th);

      const gLift = x.createRadialGradient(tw / 2, th * 0.45, 0, tw / 2, th / 2, Math.hypot(tw, th) * 0.6);
      const lift = J.lum(sc.bg || '#000') < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.14)';
      gLift.addColorStop(0, lift);
      gLift.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gLift;
      x.fillRect(0, 0, tw, th);

      const f = (st.fonts && st.fonts.display && st.fonts.display[0]) || 'gothic_black';
      x.font = J.fontCSS ? J.fontCSS(f, Math.round(th * 0.38)) : 'bold 28px sans-serif';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      const cx = tw / 2, cy = th / 2;
      if (sc.ghostB) { x.fillStyle = sc.ghostB; x.fillText('字面', cx - 2, cy - 1); }
      if (sc.ghostA) { x.fillStyle = sc.ghostA; x.fillText('字面', cx + 2, cy + 1); }
      x.fillStyle = sc.fg || '#FFFFFF';
      x.fillText('字面', cx, cy);

      if (sc.accent) {
        x.fillStyle = sc.accent;
        x.fillRect(Math.round(tw * 0.1), Math.round(th * 0.84), Math.round(tw * 0.28), Math.max(2, Math.round(th * 0.04)));
      }
      if (sc.accent2) {
        x.fillStyle = sc.accent2;
        x.fillRect(Math.round(tw * 0.42), Math.round(th * 0.84), Math.round(tw * 0.14), Math.max(2, Math.round(th * 0.04)));
      }

      b.appendChild(cv);

      const span = document.createElement('span');
      span.className = 'tcard-name';
      span.innerHTML = `<span>配色 ${idx + 1}</span><span style="display:inline-flex;gap:3px;align-items:center;margin-left:auto"><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${sc.bg};border:1px solid rgba(255,255,255,0.3)"></i><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${sc.fg}"></i><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${sc.accent}"></i></span>`;
      b.appendChild(span);

      b.addEventListener('click', () => {
        pushEdit(); remember();
        setCutScheme(cutPick.line, cutPick.k, idx);
        replan(); commit();
        if (cut) seek(cut.start + Math.min(cut.dur * 0.5, cut.inDur + 0.05));
      });
      grid.appendChild(b);
    });
    return;
  }
  if (g === 'font') {
    const forcedFont = cutTechSlot(cutPick.line, cutPick.k).font;
    const isForced = forcedFont != null && forcedFont !== '';
    const curFont = cut ? (cut.font || (cut.params && cut.params.font) || '') : '';

    if (!q) {
      const autoBtn = document.createElement('button');
      autoBtn.type = 'button';
      autoBtn.className = 'tcard' + (!isForced ? ' is-on' : '');
      autoBtn.title = 'フォント 自動';
      autoBtn.innerHTML = '<span class="tcard-name" style="padding:16px 6px"><span>自動</span></span>';
      autoBtn.addEventListener('click', () => {
        pushEdit(); remember();
        setCutFont(cutPick.line, cutPick.k, '');
        replan(); commit();
        if (cut) seek(cut.start + Math.min(cut.dur * 0.5, cut.inDur + 0.05));
      });
      grid.appendChild(autoBtn);
    }

    const allFontKeys = Object.keys(J.FONTS || {});
    const fontKeys = q ? allFontKeys.filter(fk => {
      const fDef = J.FONTS[fk];
      if (!fDef) return false;
      const lbl = (fDef.label || fDef.name || fk).toLowerCase();
      return lbl.includes(q.toLowerCase()) || fk.toLowerCase().includes(q.toLowerCase());
    }) : allFontKeys;

    const [W, H] = J.designSize(S.project.aspect || '16:9');
    const th = 80, tw = Math.max(72, Math.round(th * W / H));

    fontKeys.forEach(fKey => {
      const fDef = J.FONTS[fKey];
      if (!fDef) return;
      const b = document.createElement('button');
      b.type = 'button';
      const isSelected = isForced ? (forcedFont === fKey) : (curFont === fKey);
      b.className = 'tcard' + (isSelected ? ' is-on' : '');
      b.title = fDef.label || fDef.name || fKey;

      const cv = document.createElement('canvas');
      cv.width = tw; cv.height = th;
      const x = cv.getContext('2d');
      x.fillStyle = '#060607';
      x.fillRect(0, 0, tw, th);

      const sampleText = (cut && cut.text && cut.text.trim()) ? cut.text.trim().slice(0, 4) : '字面';
      x.fillStyle = '#FFFFFF';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.font = J.fontCSS ? J.fontCSS(fKey, Math.round(th * 0.36)) : 'bold 26px sans-serif';
      x.fillText(sampleText, tw / 2, th / 2);

      b.appendChild(cv);

      const span = document.createElement('span');
      span.className = 'tcard-name';
      span.innerHTML = `<span>${escapeHtml(fDef.label || fDef.name || fKey)}</span>`;
      b.appendChild(span);

      b.addEventListener('click', () => {
        pushEdit(); remember();
        setCutFont(cutPick.line, cutPick.k, fKey);
        replan(); commit();
        if (cut) seek(cut.start + Math.min(cut.dur * 0.5, cut.inDur + 0.05));
      });
      grid.appendChild(b);
    });
    return;
  }
  if (!q && (g === 'decor' || g === 'trans' || g === 'fx')) {
    const none = document.createElement('button');
    none.type = 'button';
    none.className = 'tcard' + (forced === 'none' ? ' is-on' : '');
    none.innerHTML = '<span class="tcard-name" style="padding:16px 6px"><span>なし</span></span>';
    none.addEventListener('click', () => {
      pushEdit(); remember();
      setCutTech(cutPick.line, cutPick.k, g, 'none');
      replan(); commit();
    });
    grid.appendChild(none);
  }
  const [W, H] = J.designSize(S.project.aspect || '16:9');
  const th = 80, tw = Math.max(72, Math.round(th * W / H));
  const allItems = J.order(g).filter(key => J.registry(g)[key] && !J.registry(g)[key].special);
  const items = q ? allItems.filter(key => J.matchEffect(g, key, q)).sort((a, b) => J.effectScore(g, a, q) - J.effectScore(g, b, q)) : allItems;

  if (q && !items.length) {
    const otherMatches = J.searchAllEffects(q);
    const empty = document.createElement('div');
    empty.className = 'cut-pick-empty';
    const gName = meta ? meta[2] : g;
    empty.innerHTML = `<p class="muted">現在の分類「${escapeHtml(gName)}」に「${escapeHtml(q)}」の一致はありません</p>`;
    if (otherMatches.length) {
      const hint = document.createElement('div');
      hint.className = 'cut-pick-other-hint';
      hint.innerHTML = `<span>他の分類に <b>${otherMatches.length}</b> 件の一致が見つかりました（クリックで切替・適用）:</span>`;
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;';
      otherMatches.slice(0, 10).forEach(m => {
        const om = CHIP_GROUPS.find(x => x[0] === m.group);
        const omLabel = om ? om[2] : m.group;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cut-pick-switch-btn';
        btn.innerHTML = `<span class="muted">[${escapeHtml(omLabel)}]</span> <b>${m.code || ''}</b> <span>${escapeHtml(m.name)}</span>`;
        btn.addEventListener('click', () => {
          pushEdit(); remember();
          setCutTech(cutPick.line, cutPick.k, m.group, m.key);
          replan(); commit();
          toggleCutPick(m.group, cut, cutPick.k);
        });
        row.appendChild(btn);
      });
      hint.appendChild(row);
      empty.appendChild(hint);
    }
    grid.appendChild(empty);
    return;
  }

  items.forEach(key => {
    const def = J.registry(g)[key];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tcard' + (key === onKey ? ' is-on' : '');
    b.title = (def.code ? `[${def.code}] ` : '') + `${def.name} (${key})`;
    const codeTag = def.code ? `<span class="tcard-code">${def.code}</span>` : '';
    b.innerHTML = `<canvas width="${tw}" height="${th}" data-g="${g}" data-k="${key}"></canvas><span class="tcard-name">${codeTag}<span>${escapeHtml(def.name)}</span>${setBadges(def)}</span>`;
    b.addEventListener('click', () => {
      pushEdit(); remember();
      setCutTech(cutPick.line, cutPick.k, g, key);
      replan(); commit();
    });
    grid.appendChild(b);
  });
  queueThumbs(grid);
}

/* ---------------- line list ---------------- */
function renderLines() {
  const ol = $('lineList'); ol.innerHTML = ''; S.lineEls = []; S.curLine = -2;
  const btnRestore = $('btnRestoreCards');
  if (btnRestore) {
    const dc = S.project.deletedCards;
    const hasDeleted = !!(dc && (dc.title || (dc.gaps && Object.keys(dc.gaps).length > 0) || (dc.lines && Object.keys(dc.lines).length > 0)));
    btnRestore.hidden = !hasDeleted;
    const l = (document.documentElement.lang || '').toLowerCase();
    const isZh = l.startsWith('zh');
    btnRestore.textContent = isZh ? '恢复卡片' : (l.startsWith('en') ? 'Restore Cards' : 'カード復元');
    if (!btnRestore.dataset.bound) {
      btnRestore.dataset.bound = '1';
      btnRestore.addEventListener('click', () => {
        pushEdit();
        S.project.deletedCards = { title: false, gaps: {}, lines: {} };
        S.project.titleCard = true;
        S.project.autoInterlude = true;
        replan();
        flushSave();
        toast(isZh ? '已恢复所有被删除的标题卡与间奏卡' : 'すべてのカードを復元しました');
      });
    }
  }
  const ov = S.project.overrides, R = exportRangeLines();
  S.plan.lines.forEach((ln, i) => {
    const o = ov[i] || {};
    const li = document.createElement('li'); li.className = 'ln' + (ln.interlude ? ' is-inter' : '') + (R && i >= R.from && i <= R.to ? ' in-range' : '');
    const manual = S.project.timing.lineTimes && S.project.timing.lineTimes[i] != null;
    const label = ln.interlude ? `〔間奏${ln.secs ? ' ' + ln.secs + '秒' : ''}〕` : ln.text;
    li.innerHTML = `<span class="no">${String(i + 1).padStart(2, '0')}</span>
      <input class="time cut-time mono" type="number" step="0.01" min="0" value="${ln.start.toFixed(2)}" title="開始（秒）${manual ? '・手動' : '・自動'}" aria-label="${i + 1}行目の開始秒" style="${manual ? 'border-color:var(--cyan)' : ''}">
      <span class="txt" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
      <div class="meta"><span class="cuts"></span>
      <span class="tools">
        
        <button class="icon ghost tapfrom" title="この行からタップで同期し直す" aria-label="${i + 1}行目からタップ">${ICON.tap}</button>
        <button class="icon ghost rng" title="書き出す範囲にする（Shift+クリックで範囲を広げる）" aria-pressed="${R && i >= R.from && i <= R.to ? 'true' : 'false'}" aria-label="${i + 1}行目を書き出す範囲に">${ICON.range}</button>
        <button class="icon ghost dice" title="この行を再抽選">${ICON.dice}</button>
        <button class="icon ghost lock" title="この行の構成をロック" aria-pressed="${o.lock ? 'true' : 'false'}">${ICON.lock}</button>
      </span></div>`;
    const q = sel => li.querySelector(sel);
    q('.time').addEventListener('wheel', e => {
      e.preventDefault();
      const step = e.shiftKey ? 0.1 : 0.05;
      const cur = parseFloat(q('.time').value) || ln.start;
      const next = Math.max(0, +(cur + (e.deltaY < 0 ? step : -step)).toFixed(2));
      q('.time').value = next.toFixed(2);
      q('.time').dispatchEvent(new Event('change'));
    }, { passive: false });
    q('.time').addEventListener('keydown', e => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const step = e.shiftKey ? 0.1 : 0.05;
        const cur = parseFloat(q('.time').value) || ln.start;
        const next = Math.max(0, +(cur + (e.key === 'ArrowUp' ? step : -step)).toFixed(2));
        q('.time').value = next.toFixed(2);
        q('.time').dispatchEvent(new Event('change'));
      }
    });
    q('.time').addEventListener('change', e => {
      const v = parseFloat(e.target.value);
      pushEdit();
      if (!S.project.timing.lineTimes) S.project.timing.lineTimes = {};
      if (isFinite(v)) {
        // keep the order: a typed time stays between the fixed times (typed or LRC) of the lines around it
        const lt = S.project.timing.lineTimes, L = S.plan.lines;
        const fix = j => (lt[j] != null && isFinite(+lt[j])) ? +lt[j] : (L[j] && L[j].lrc != null ? L[j].lrc : null);
        let lo = 0, hi = Infinity;
        for (let j = i - 1; j >= 0; j--) { const f = fix(j); if (f != null) { lo = f + 0.05; break; } }
        for (let j = i + 1; j < L.length; j++) { const f = fix(j); if (f != null) { hi = f - 0.05; break; } }
        let w = Math.max(0, v);
        if (hi >= lo && (w < lo || w > hi)) { w = J.clamp(w, lo, hi); toast(`前後の行と順番が入れ替わらないよう ${w.toFixed(2)} 秒にしました`); }
        lt[i] = +w.toFixed(3);
      } else delete S.project.timing.lineTimes[i];
      replan();
    });
    q('.txt').addEventListener('dblclick', () => editLine(li, ln));
    q('.tapfrom').addEventListener('click', () => startTap(i));
    q('.rng').addEventListener('click', e => setExportRange(i, e.shiftKey));
    if (q('.dice')) q('.dice').addEventListener('click', () => {
      pushEdit(); remember();
      preserveOtherLines(i);
      const cur = ov[i] || {};
      setOv(i, { seed: (cur.seed | 0) + 1, lock: false, lockedSeed: undefined, lockedCuts: undefined, savedCuts: undefined, cutTech: undefined, cutQuiet: undefined });
      replan(); commit(); seek(ln.start + 0.001);
    });
    if (q('.lock')) q('.lock').addEventListener('click', () => {
      pushEdit(); remember();
      const cur = ov[i] || {};
      if (cur.lock) setOv(i, { lock: false, lockedSeed: undefined, lockedCuts: undefined, savedCuts: undefined });
      else setOv(i, { lock: true, lockedSeed: ln.seed, lockedCuts: J.lineSnapshot(S.plan, i) || undefined, savedCuts: undefined });
      replan(); commit();
    });
    const cutsEl = q('.cuts');
    if (ln.interlude) {
      const interCut = S.plan.cuts.find(c => c.line === i);
      if (interCut) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'cut-lay is-inter-cut pro-only';
        b.dataset.k = '0';
        b.textContent = '間奏';
        b.title = '間奏カット';
        b.setAttribute('aria-label', `${i + 1}行目 間奏カット`);
        b.addEventListener('click', () => seek(interCut.start + 0.001));

        const st = (S.plan && S.plan.style) || J.resolveStyle(S.project);
        const schemes = (st && st.schemes) || [];
        const nSchemes = schemes.length || 1;
        const curSchIdx = (interCut.scheme != null ? interCut.scheme : 0) % nSchemes;
        const curSch = schemes[curSchIdx] || schemes[0] || {};
        const forcedSch = (o.cutSchemes && o.cutSchemes[0] != null)
          ? o.cutSchemes[0]
          : ((o.cutTech && o.cutTech[0] && o.cutTech[0].scheme != null) ? o.cutTech[0].scheme : null);
        const isSchForced = forcedSch != null && forcedSch !== '';

        const schTitle = groupName('scheme', curSchIdx);

        const swatch = document.createElement('button');
        swatch.type = 'button';
        swatch.setAttribute('aria-label', schTitle + ' →');
        swatch.className = 'cut-sch-swatch pro-only' + (isSchForced ? ' is-forced' : '');
        swatch.title = schTitle;
        swatch.style.background = curSch.bg || '#000';
        swatch.style.borderColor = curSch.accent || curSch.fg || 'rgba(255,255,255,0.4)';
        swatch.innerHTML = `<i style="background:${curSch.fg || '#fff'}"></i><i style="background:${curSch.accent || curSch.fg || '#fff'}"></i>`;
        swatch.addEventListener('click', () => {
          seek(interCut.start + 0.001);
          remember();
          setCutScheme(i, 0, String((curSchIdx + 1) % nSchemes));
          replan();
          commit();
          seek(interCut.start + 0.001);
        });

        const pair = document.createElement('div');
        pair.className = 'cut-pair' + (isSchForced ? ' is-forced' : '');
        pair.dataset.k = '0';
        pair.append(q('.time'), b, swatch);
        cutsEl.appendChild(pair);
      }
    } else {
      S.plan.cuts.filter(c => c.line === i && J.LAYOUTS[c.layout] && !J.LAYOUTS[c.layout].special).forEach((c, k) => {
        const forced = o.cutLayouts && o.cutLayouts[k];
        const sel = document.createElement('span');
        sel.className = 'cut-lay pro-only' + (forced ? ' is-forced' : '');
        sel.textContent = J.LAYOUTS[c.layout].name;
        sel.title = `${c.text}｜${J.ENTER[c.enter].name} → ${J.EXIT[c.exit].name}`;
        sel.dataset.k = String(k);

        const st = (S.plan && S.plan.style) || J.resolveStyle(S.project);
        const schemes = (st && st.schemes) || [];
        const nSchemes = schemes.length || 1;
        const curSchIdx = (c.scheme != null ? c.scheme : 0) % nSchemes;
        const curSch = schemes[curSchIdx] || schemes[0] || {};
        const forcedSch = (o.cutSchemes && o.cutSchemes[k] != null)
          ? o.cutSchemes[k]
          : ((o.cutTech && o.cutTech[k] && o.cutTech[k].scheme != null) ? o.cutTech[k].scheme : null);
        const isSchForced = forcedSch != null && forcedSch !== '';

        const schTitle = groupName('scheme', curSchIdx);

        const swatch = document.createElement('button');
        swatch.type = 'button';
        swatch.setAttribute('aria-label', schTitle + ' →');
        swatch.className = 'cut-sch-swatch pro-only' + (isSchForced ? ' is-forced' : '');
        swatch.title = schTitle;
        swatch.style.background = curSch.bg || '#000';
        swatch.style.borderColor = curSch.accent || curSch.fg || 'rgba(255,255,255,0.4)';
        swatch.innerHTML = `<i style="background:${curSch.fg || '#fff'}"></i><i style="background:${curSch.accent || curSch.fg || '#fff'}"></i>`;
        swatch.addEventListener('click', () => {
          seek(c.start + Math.min(c.dur * 0.5, c.inDur + 0.05));
          remember();
          setCutScheme(i, k, String((curSchIdx + 1) % nSchemes));
          replan();
          commit();
          seek(c.start + Math.min(c.dur * 0.5, c.inDur + 0.05));
        });

        const pair = document.createElement('div');
        pair.className = 'cut-pair' + (forced || isSchForced ? ' is-forced' : '');
        pair.dataset.k = String(k);

        // カットの開始時刻 (詳細モード): the first cut starts with the line; the others can be typed (empty = automatic)
        if (k === 0) {
          pair.append(q('.time'));
        } else {
          const tIn = document.createElement('input');
          const own = o.cutTime && o.cutTime[k] != null;
          tIn.type = 'number'; tIn.step = '0.01'; tIn.min = '0'; tIn.className = 'cut-time pro-only mono' + (own ? ' is-forced' : '');
          tIn.value = c.start.toFixed(2);
          tIn.title = own ? 'このカットの開始時刻（手動・マウスホイールや↑↓で微調整）。空にすると自動に戻ります' : 'このカットの開始時刻（自動・マウスホイールや↑↓で微調整）。数値を入れると固定します';
          tIn.setAttribute('aria-label', `${i + 1}行目 カット${k + 1}の開始時刻`);
          const applyCutTime = v => {
            pushEdit();
            const ct = Object.assign({}, (S.project.overrides[i] || {}).cutTime || {});
            if (isFinite(v) && v !== '') ct[k] = +Math.max(0, v - ln.start).toFixed(3); else delete ct[k];
            setOv(i, { cutTime: Object.keys(ct).length ? ct : undefined }); replan(); seek(Math.max(0, (isFinite(v) ? v : c.start)) + 0.001);
          };
          tIn.addEventListener('change', e => {
            applyCutTime(parseFloat(e.target.value));
          });
          tIn.addEventListener('wheel', e => {
            e.preventDefault();
            const step = e.shiftKey ? 0.1 : 0.05;
            const curVal = parseFloat(tIn.value) || c.start;
            const nextVal = Math.max(ln.start, +(curVal + (e.deltaY < 0 ? step : -step)).toFixed(2));
            tIn.value = nextVal.toFixed(2);
            applyCutTime(nextVal);
          }, { passive: false });
          tIn.addEventListener('keydown', e => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault();
              const step = e.shiftKey ? 0.1 : 0.05;
              const curVal = parseFloat(tIn.value) || c.start;
              const nextVal = Math.max(ln.start, +(curVal + (e.key === 'ArrowUp' ? step : -step)).toFixed(2));
              tIn.value = nextVal.toFixed(2);
              applyCutTime(nextVal);
            }
          });
          pair.append(tIn);
        }

        const rollBtn = document.createElement('button');
        rollBtn.type = 'button';
        rollBtn.className = 'icon ghost cut-roll-btn pro-only';
        rollBtn.title = 'このカットだけ構成を再抽選（単独ランダム・他のカットに影響しません）';
        rollBtn.setAttribute('aria-label', `${i + 1}行目 カット${k + 1} を単独再抽選`);
        rollBtn.innerHTML = ICON.dice;
        rollBtn.addEventListener('click', e => {
          e.stopPropagation();
          rollCutSlot(i, k);
        });

        pair.append(sel, swatch, rollBtn);
        cutsEl.appendChild(pair);
      });
    }
    // Select from the whole card; embedded controls keep their own actions.
    if (S.openLine === i) li.classList.add('open');
    li.addEventListener('click', e => {
      if (e.target.closest('button, select, input, textarea, a')) return;
      const pair = e.target.closest('.cut-pair');
      const cut = pair && S.plan.cuts.filter(c => c.line === i && J.LAYOUTS[c.layout] && !J.LAYOUTS[c.layout].special)[+pair.dataset.k];
      seek((cut ? cut.start : ln.start) + 0.001);
      if (S.mode !== 'mobile' || pair) return;
      const was = li.classList.contains('open');
      S.lineEls.forEach(x => x.classList.remove('open'));
      if (!was) { li.classList.add('open'); S.openLine = i; } else S.openLine = -1;
    });
    ol.appendChild(li); S.lineEls.push(li);
  });
  $('linesInfo').textContent = `${S.plan.lines.length}行 / ${S.plan.cuts.length}カット`;
  syncRangeUI();
}

/* ---------------- 行から歌詞を直す ---------------- */
// the lyrics text is the source: a plan line knows the row it came from (ln.src); LRC time tags on that row are kept
const LRC_PREFIX = /^\s*(?:\[\d+:\d+(?:[.:]\d+)?\])*/;
function editLine(li, ln) {
  if (ln.src == null || li.querySelector('.txt-edit')) return;
  const rows = S.project.lyrics.replace(/\r/g, '').split('\n'), row = rows[ln.src] || '';
  const pre = (row.match(LRC_PREFIX) || [''])[0], body = row.slice(pre.length).trim();
  const txt = li.querySelector('.txt'), inp = document.createElement('input');
  inp.type = 'text'; inp.className = 'txt-edit'; inp.value = body; inp.setAttribute('aria-label', `${ln.index + 1}行目の歌詞`);
  inp.title = '記法（/ 区切り・*強調*・行末の ! ・| 注釈・[間奏 8]）もそのまま使えます。Enter で確定、Esc で取り消し';
  txt.replaceWith(inp); inp.focus(); inp.select();
  let done = false;
  const finish = ok => {
    if (done) return; done = true;
    const v = inp.value.trim();
    if (ok && v && v !== body) {
      pushEdit();
      rows[ln.src] = pre + v;
      S.project.lyrics = rows.join('\n'); $('lyrics').value = S.project.lyrics;
      replan(); flushSave(); toast(`${ln.index + 1}行目の歌詞を直しました`);
    } else renderLines();
  };
  inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); finish(true); } else if (e.key === 'Escape') { e.preventDefault(); finish(false); } });
  inp.addEventListener('blur', () => finish(true));
}

/* ---------------- 編集の取り消し・やり直し（Ctrl+Z / Ctrl+Y） ---------------- */
const ED = { undo: [], redo: [], max: 100, batching: false };

function saveUndoHistory() {
  try {
    if (!ED.undo || !ED.undo.length) {
      localStorage.removeItem(LS_HIST_KEY);
      return;
    }
    const recent = ED.undo.slice(-PERSIST_UNDO_MAX);
    localStorage.setItem(LS_HIST_KEY, JSON.stringify(recent));
  } catch (e) {}
}

function loadUndoHistory() {
  try {
    const s = localStorage.getItem(LS_HIST_KEY);
    if (!s) return [];
    const arr = JSON.parse(s);
    if (Array.isArray(arr)) {
      return arr.filter(x => typeof x === 'string' && x.length > 0).slice(-PERSIST_UNDO_MAX);
    }
  } catch (e) {}
  return [];
}

function edSnap() {
  if (!S.project) return '';
  return JSON.stringify({
    project: S.project,
    t: +(S.t || 0).toFixed(3)
  });
}

function pushEdit() {
  if (ED.batching || !S.project) return;
  const s = edSnap();
  if (!s) return;
  if (!ED.undo.length || ED.undo[ED.undo.length - 1] !== s) {
    ED.undo.push(s);
    if (ED.undo.length > ED.max) ED.undo.shift();
  }
  ED.redo = [];
  updateEditBtns();
  autosave();
}

function prepareEdit() {
  pushEdit();
}

function applySnap(snapStr) {
  const o = typeof snapStr === 'string' ? JSON.parse(snapStr) : snapStr;
  const proj = o.project || (o.lyrics !== undefined ? (o.style ? o : Object.assign({}, S.project, o)) : o);
  if (S.selectedEvent) { pause(); S.selectedEvent = null; hideEventInspector(); }
  S.project = mergeProject(proj);

  fontKey = '';
  syncUI();
  replan();
  updateHist();
  updateEditBtns();
  flushSave();

  if (o.t != null && isFinite(o.t)) seek(o.t);
  else S.need = true;

  if (typeof updateCutInfo === 'function') updateCutInfo();
  if (typeof cutPick !== 'undefined' && cutPick.g && typeof fillCutPick === 'function') fillCutPick();
  if (typeof checkAndRestoreAssets === 'function') checkAndRestoreAssets();
}

function edGo(d) {
  if (S.exporting) return;
  const from = d < 0 ? ED.undo : ED.redo, to = d < 0 ? ED.redo : ED.undo;
  if (!from.length) return;

  const curSnap = edSnap();
  let snapStr = from.pop();

  // If top of stack is identical in project content, pop again
  while (snapStr && from.length) {
    try {
      const p1 = JSON.parse(snapStr).project || JSON.parse(snapStr);
      const p2 = S.project;
      if (JSON.stringify(p1) === JSON.stringify(p2)) snapStr = from.pop();
      else break;
    } catch (e) {
      break;
    }
  }
  if (!snapStr) { updateEditBtns(); return; }

  to.push(curSnap);
  applySnap(snapStr);
  toast(d < 0 ? '元に戻しました' : 'やり直しました');
}

// LRC を読み込む: replaces the lyrics (and everything tied to line numbers, like 歌詞を消す); undoable
function loadLrc(text) {
  if (S.tap || S.exporting) return;
  pushEdit();
  pause();
  const P = S.project;
  P.lyrics = String(text).replace(/^\ufeff/, '').replace(/\r\n?/g, '\n').trim(); P.timing.lineTimes = {}; P.overrides = {}; P.exportRange = null;
  $('lyrics').value = P.lyrics;
  replan(); flushSave(); updateEditBtns(); seek(0);
  const n = J.parseLyrics(P.lyrics).lines.filter(l => l.lrc != null).length;
  toast(`LRC を読み込みました（時刻付き ${n} 行・「元に戻す」で戻せます）`);
}
function saveLrc() {
  const R = exportRangeLines(), r = exportRange();
  const txt = J.lrcText(S.project, S.plan.lines, R ? { from: R.from, to: R.to, t0: r.t0 } : null);
  J.saveFile(baseName() + rangeSuffix() + '.lrc', new Blob([txt], { type: 'text/plain;charset=utf-8' }));
}
// 歌詞を消す: lyrics + everything tied to line numbers (times, per-line settings, export range); undoable
function clearLyrics() {
  if (S.tap || S.exporting) return;
  const P = S.project;
  if (!P.lyrics.trim() && !Object.keys(P.timing.lineTimes || {}).length) { $('lyrics').focus(); return; }
  pushEdit();
  pause();
  P.lyrics = ''; P.timing.lineTimes = {}; P.overrides = {}; P.exportRange = null; $('lyrics').value = '';
  replan(); flushSave(); updateEditBtns(); seek(0);
  toast('歌詞を消しました（「元に戻す」か Ctrl+Z で戻せます）');
}
// 初期化: back to a blank project — song (also the copy kept in this browser), settings and both histories go
let audioNameDefault = '';
async function resetAll() {
  if (S.exporting) return;
  if (S.tap) stopTap();
  pause();
  audioSeq++;                                  // a song still being analysed must not come back after the reset
  const prevSnap = edSnap();
  ED.undo = prevSnap ? [prevSnap] : [];
  ED.redo = []; H.list = []; H.i = -1;
  S.project = mergeProject(null); S.project.lyrics = '';
  S.audio = null; if ($('audioFile')) $('audioFile').value = '';
  if (J.forgetSong) await J.forgetSong();
  if ($('audioName')) $('audioName').textContent = audioNameDefault;
  TL.z = 1; TL.off = 0;
  $('lyrics').value = ''; fontKey = '';
  syncUI(); replan(); commit(); updateEditBtns(); flushSave(); seek(0);
  toast('初期化しました（Ctrl+Z で戻せます）');
}
function updateEditBtns() {
  const u = $('btnUndoEdit'); if (u) u.disabled = !ED.undo.length;
  const r = $('btnRedoEdit'); if (r) r.disabled = !ED.redo.length;
}

/* ---------------- 書き出す範囲（選んだ行だけ） ---------------- */
function exportRangeLines() {
  const r = S.project.exportRange, n = S.plan ? S.plan.lines.length : 0;
  if (!r || !n || !(r.from >= 0)) return null;
  const from = Math.min(n - 1, r.from | 0), to = Math.min(n - 1, Math.max(from, r.to | 0));
  return { from, to };
}
function exportRange() {
  const R = exportRangeLines(); if (!R) return null;
  const L = S.plan.lines, a = L[R.from], b = L[R.to], last = R.to === L.length - 1;
  const t0 = Math.max(0, a.start - 0.25);
  const t1 = last ? S.plan.duration : Math.min(L[R.to + 1].start, (b.interlude ? b.end : b.visEnd) + 0.35);
  return { t0, t1 };
}
function rangeSuffix() { const R = exportRangeLines(); if (!R) return ''; const f = n => String(n + 1).padStart(2, '0'); return '_L' + f(R.from) + (R.to > R.from ? '-' + f(R.to) : ''); }
function setExportRange(i, extend) {
  pushEdit();
  const R = exportRangeLines();
  if (extend && R) S.project.exportRange = { from: Math.min(R.from, i), to: Math.max(R.to, i) };
  else if (R && R.from === i && R.to === i) S.project.exportRange = null;          // click again: back to the whole song
  else S.project.exportRange = { from: i, to: i };
  flushSave(); renderLines();
  const R2 = exportRangeLines();
  toast(R2 ? `書き出す範囲：${R2.from + 1}${R2.to > R2.from ? '〜' + (R2.to + 1) : ''}行目` : '書き出す範囲：全体');
}
function syncRangeUI() {
  const R = exportRangeLines(), n = S.plan.lines.length;
  const opts = (sel, first) => `<option value="-1">${first}</option>` + S.plan.lines.map((ln, i) => `<option value="${i}">${String(i + 1).padStart(2, '0')} ${escapeHtml((ln.interlude ? '〔間奏〕' : ln.text).slice(0, 14))}</option>`).join('');
  document.querySelectorAll('.rngFrom').forEach(el => { el.innerHTML = opts(el, '全体'); el.value = R ? String(R.from) : '-1'; });
  document.querySelectorAll('.rngTo').forEach(el => { el.innerHTML = opts(el, '—'); el.value = R ? String(R.to) : '-1'; el.disabled = !R; });
  const r = exportRange();
  document.querySelectorAll('.rngInfo').forEach(el => { el.textContent = r ? `${J.fmtTime(r.t0)} 〜 ${J.fmtTime(r.t1)}（${(r.t1 - r.t0).toFixed(1)}秒）` : `全体（${S.plan.duration.toFixed(1)}秒）`; });
}
function bindRangeUI() {
  document.querySelectorAll('.rngFrom').forEach(el => el.addEventListener('change', () => {
    pushEdit();
    const v = +el.value, R = exportRangeLines();
    S.project.exportRange = v < 0 ? null : { from: v, to: R ? Math.max(v, R.to) : v };
    flushSave(); renderLines();
  }));
  document.querySelectorAll('.rngTo').forEach(el => el.addEventListener('change', () => {
    pushEdit();
    const v = +el.value, R = exportRangeLines(); if (!R) return;
    S.project.exportRange = v < 0 ? { from: R.from, to: R.from } : { from: Math.min(R.from, v), to: Math.max(R.from, v) };
    flushSave(); renderLines();
  }));
}
function clearSavedCuts() {
  if (!S.project || !S.project.overrides) return;
  for (const o of Object.values(S.project.overrides)) {
    if (o && !o.lock && o.savedCuts) delete o.savedCuts;
  }
}
function preserveOtherLines(exceptIndex) {
  if (!S.plan || !Array.isArray(S.plan.lines)) return;
  if (!S.project.overrides) S.project.overrides = {};
  S.plan.lines.forEach((otherLn, j) => {
    if (j !== exceptIndex) {
      const otherOv = S.project.overrides[j] || {};
      if (!otherOv.lock && !otherOv.savedCuts) {
        const snap = J.lineSnapshot(S.plan, j);
        if (snap) S.project.overrides[j] = Object.assign({}, otherOv, { savedCuts: snap });
      }
    }
  });
}
function setOv(i, patch) {
  pushEdit();
  const cur = Object.assign({}, S.project.overrides[i] || {}, patch);
  for (const k of Object.keys(cur)) if (cur[k] === undefined || cur[k] === false || cur[k] === '') delete cur[k];
  if (Object.keys(cur).length) S.project.overrides[i] = cur; else delete S.project.overrides[i];
}
function setCutLayout(i, k, layout) { setCutTech(i, k, 'layout', layout); }
function setCutFont(i, k, font) { setCutTech(i, k, 'font', font || ''); }
function setCutScheme(i, k, scheme) { setCutTech(i, k, 'scheme', scheme === '' || scheme == null ? '' : +scheme); }
function setCutTech(i, k, group, key) {
  if (i == null || i < 0 || k == null || k < 0) return;
  pushEdit();
  preserveOtherLines(i);
  const cur = Object.assign({}, S.project.overrides[i] || {});
  delete cur.savedCuts;
  const cutTech = Object.assign({}, cur.cutTech || {});
  const slot = Object.assign({}, cutTech[k] || cutTech[String(k)] || {});
  delete cutTech[String(k)];
  if (key === '' || key == null) delete slot[group];
  else slot[group] = group === 'scheme' ? +key : key;
  if (Object.keys(slot).length) cutTech[k] = slot;
  else delete cutTech[k];
  if (Object.keys(cutTech).length) cur.cutTech = cutTech; else delete cur.cutTech;
  const cutQuiet = Object.assign({}, cur.cutQuiet || {});
  const q = Object.assign({}, cutQuiet[k] || cutQuiet[String(k)] || {});
  delete cutQuiet[String(k)];
  delete q[group];
  if (Object.keys(q).length) cutQuiet[k] = q; else delete cutQuiet[k];
  if (Object.keys(cutQuiet).length) cur.cutQuiet = cutQuiet; else delete cur.cutQuiet;
  if (group === 'layout') {
    const cutLayouts = Object.assign({}, cur.cutLayouts || {});
    if (!key) delete cutLayouts[k]; else cutLayouts[k] = key;
    if (Object.keys(cutLayouts).length) cur.cutLayouts = cutLayouts; else delete cur.cutLayouts;
  }
  if (group === 'font') {
    const cutFonts = Object.assign({}, cur.cutFonts || {});
    if (!key) delete cutFonts[k]; else cutFonts[k] = key;
    if (Object.keys(cutFonts).length) cur.cutFonts = cutFonts; else delete cur.cutFonts;
  }
  if (group === 'scheme') {
    const cutSchemes = Object.assign({}, cur.cutSchemes || {});
    if (key === '' || key == null) delete cutSchemes[k]; else cutSchemes[k] = +key;
    if (Object.keys(cutSchemes).length) cur.cutSchemes = cutSchemes; else delete cur.cutSchemes;
  }
  if (Object.keys(cur).length) S.project.overrides[i] = cur; else delete S.project.overrides[i];
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* ---------------- style tab ---------------- */
function drawStyleGrid() {
  const g = $('styleGrid');
  if (!g.children.length) {
    J.STYLE_ORDER.filter(k => k !== 'custom').forEach(k => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'stile'; b.dataset.k = k;
      b.title = J.STYLES[k].desc;
      b.innerHTML = `<canvas width="192" height="108"></canvas><span>${J.STYLES[k].name}</span><span class="badges">${setBadges(J.STYLES[k])}</span>`;
      b.addEventListener('click', () => {
        copyPresetToCustom(k);
        $('styleTemplates').hidden = true;
        $('btnStyleTemplates').setAttribute('aria-expanded', 'false');
      });
      g.appendChild(b);
    });
  }
  [...g.children].forEach(b => {
    const k = b.dataset.k;
    const st = (k === 'custom' && S.project.customStyle) ? S.project.customStyle : J.STYLES[k];
    const sc = (st && st.schemes && st.schemes[0]) || { bg: '#08080A', fg: '#FFFFFF', sub: '#A8A8B4', ghostA: '#FF3366', ghostB: '#00E5FF', accent: '#FF3366' };
    const cv = b.querySelector('canvas'), x = cv.getContext('2d');
    b.setAttribute('aria-pressed', S.project.style === k ? 'true' : 'false');
    const off = k !== 'custom' && !J.randomOk(S.project, 'style', k);
    b.classList.toggle('set-off', off);
    b.title = (st.desc || '') + (off ? (st.extra && S.project.extra !== true ? '（追加分がオフのため、おまかせでは選ばれません）' : st.set && !J.setOn(S.project, st.set) ? '（このセットがオフのため、おまかせでは選ばれません）' : '（和風の演出がオフのため、おまかせでは選ばれません）') : '');
    x.fillStyle = sc.bg; x.fillRect(0, 0, 192, 108);
    if (st.schemes && st.schemes.length > 1) {
      st.schemes.slice(1, 4).forEach((s2, i) => { x.fillStyle = s2.bg; x.fillRect(192 - 14 * (i + 1), 0, 14, 10); });
    }
    const f = (st.fonts && st.fonts.display && st.fonts.display[0]) || 'gothic_black';
    x.font = J.fontCSS(f, 46); x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = sc.ghostB || sc.sub; x.fillText('字面', 96 - 3, 54 - 1);
    x.fillStyle = sc.ghostA || sc.accent; x.fillText('字面', 96 + 3, 54 + 2);
    x.fillStyle = sc.fg; x.fillText('字面', 96, 54);
    x.fillStyle = sc.accent; x.fillRect(12, 90, 30, 4);
    x.font = J.fontCSS('mono', 9); x.textAlign = 'left'; x.fillStyle = sc.sub; x.fillText(k.toUpperCase(), 48, 93);
  });
}
function fontSelectOptions(sel) {
  return '<option value="">スタイルの既定</option>' + Object.entries(J.FONTS).map(([k, f]) => {
    const g = J.faceOf ? J.faceOf(k) : f, alt = g.label && g.label !== f.label ? ' → ' + g.label : '';   // the face actually used for the lyric language
    return `<option value="${escapeHtml(k)}" ${sel === k ? 'selected' : ''}>${escapeHtml(f.label + alt)}</option>`;
  }).join('');
}
function renderFontRoles() {
  const box = $('fontRoles'); box.innerHTML = '';
  [['display', '見出し'], ['serif', '明朝枠'], ['body', '小さな文字']].forEach(([role, label]) => {
    const row = document.createElement('div'); row.className = 'font-row';
    row.innerHTML = `<span class="muted">${label}</span><select aria-label="${label}のフォント">${fontSelectOptions(S.project.fonts[role])}</select>`;
    row.querySelector('select').addEventListener('change', e => {
      pushEdit();
      if (e.target.value) S.project.fonts[role] = e.target.value; else delete S.project.fonts[role]; fontKey = ''; replan();
    });
    box.appendChild(row);
  });
}
const BASE_KEYS = [['bg', '背景'], ['fg', '文字'], ['sub', '補助']];
const ACCENT_KEYS = [['accent', 'アクセント'], ['ghostA', 'ズレ色A'], ['ghostB', 'ズレ色B']];
function renderColors() {
  const st = J.STYLES[S.project.style] || J.STYLES.noir, sc = st.schemes[0];
  const c = S.project.colors;
  $('colorOn').checked = !!c.enabled;
  $('accentOn').checked = !!c.accentOn;
  const fill = (rowId, keys, flag) => {
    const row = $(rowId); row.innerHTML = '';
    keys.forEach(([k, label]) => {
      const l = document.createElement('label');
      const v = (c[flag] && c[k]) || c[k] || sc[k];
      l.innerHTML = `${label}<input type="color" value="${toColorInput(v)}">`;
      const inp = l.querySelector('input');
      inp.addEventListener('pointerdown', prepareEdit);
      inp.addEventListener('focus', prepareEdit);
      inp.addEventListener('input', e => {
        c[k] = e.target.value.toUpperCase();
        if (!c[flag]) { c[flag] = true; $(flag === 'enabled' ? 'colorOn' : 'accentOn').checked = true; }
        replanSoon(60); drawSwatch();
      });
      inp.addEventListener('change', () => flushSave());
      row.appendChild(l);
    });
  };
  fill('colorRow', BASE_KEYS, 'enabled');
  fill('colorRowAccent', ACCENT_KEYS, 'accentOn');
  drawSwatch();
}
const toColorInput = v => { const h = String(v || '#000000'); return /^#[0-9a-f]{6}$/i.test(h) ? h.toLowerCase() : J.toHex(...J.hex(h)).toLowerCase(); };
function swatchHTML(cols) { return cols.filter(c => /^#[0-9a-f]{3,8}$/i.test(String(c))).map(c => `<i style="background:${c}" title="${c}"></i>`).join(''); }
function drawSwatch() {
  const sc = S.plan ? S.plan.style.schemes[0] : null; if (!sc) return;
  $('paletteSwatch').innerHTML = swatchHTML([sc.accent, sc.ghostA, sc.ghostB]);
}
function randomPalette() {
  pushEdit();
  remember();
  const c = S.project.colors;
  const sc0 = J.STYLES[S.project.style].schemes[0];
  const bg = c.enabled && c.bg ? c.bg : sc0.bg;
  let p, guard = 0;
  do { p = J.randomPalette(bg); } while (guard++ < 6 && p.ghostA === c.ghostA && p.ghostB === c.ghostB);
  Object.assign(c, { accent: p.accent, ghostA: p.ghostA, ghostB: p.ghostB, accentOn: true });
  renderColors(); replan(); commit();
  toast('配色：アクセント・ズレ色A/Bを変更', [p.accent, p.ghostA, p.ghostB]);
}

/* ---------------- custom style panel ---------------- */
let custActiveTab = 'palette';
let custActiveScheme = 0;

function ensureCustomStyle() {
  if (!S.project.customStyle) S.project.customStyle = J.defaultCustomStyle();
  const cs = S.project.customStyle;
  if (!Array.isArray(cs.schemes) || !cs.schemes.length) {
    cs.schemes = J.defaultCustomStyle().schemes;
  }
  if (!cs.fonts) cs.fonts = J.defaultCustomStyle().fonts;
  if (!Array.isArray(cs.fonts.display) || !cs.fonts.display.length) cs.fonts.display = ['gothic_black', 'dela'];
  if (!Array.isArray(cs.fonts.serif) || !cs.fonts.serif.length) cs.fonts.serif = ['mincho_bold', 'mincho'];
  if (!Array.isArray(cs.fonts.body) || !cs.fonts.body.length) cs.fonts.body = ['gothic_med', 'sansui'];
  if (!Array.isArray(cs.fonts.mono) || !cs.fonts.mono.length) cs.fonts.mono = ['mono'];
  if (!cs.texture) cs.texture = J.defaultCustomStyle().texture;
  if (!cs.bias) cs.bias = J.defaultCustomStyle().bias;
  if (!cs.bias.layout) cs.bias.layout = {};
  if (!cs.bias.enter) cs.bias.enter = {};
  if (!cs.bias.exit) cs.bias.exit = {};
  if (!cs.decor) cs.decor = J.defaultCustomStyle().decor;
  if (cs.ghost == null) cs.ghost = 1.0;
  if (cs.glow == null) cs.glow = 1.0;
  if (cs.glitchBoost == null) cs.glitchBoost = 1.0;
  if (cs.hud == null) cs.hud = true;
  if (cs.useGrad == null) cs.useGrad = true;
  return cs;
}

function touchCustomStyle() {
  if (S.project.style !== 'custom') {
    S.project.style = 'custom';
    const b = $('btnApplyCustom');
    if (b) { b.textContent = '使用中'; b.classList.add('accent'); b.classList.remove('primary'); }
  }
  replanSoon(60);
  drawStyleGrid();
  drawSwatch();
}

function copyPresetToCustom(key) {
  if (!key || !J.STYLES[key]) return;
  pushEdit();
  remember();
  const src = J.STYLES[key];
  const c = JSON.parse(JSON.stringify(src));
  S.project.customStyle = {
    name: '自定：' + src.name,
    strictPalette: true,
    desc: '基于「' + src.name + '」定制的自定风格',
    schemes: c.schemes.map(s => Object.assign({
      bg: '#000000', fg: '#FFFFFF', sub: '#A0A0A0', accent: '#FF3366', accent2: '#00E5FF',
      ink: '#FFFFFF', dim: '#202020', ghostA: '#FF3366', ghostB: '#00E5FF',
      grad: s.grad || ['#FF3366', '#00E5FF'], paper: !!s.paper
    }, s)),
    fonts: {
      display: Array.isArray(c.fonts.display) ? c.fonts.display.slice() : ['gothic_black'],
      serif: Array.isArray(c.fonts.serif) ? c.fonts.serif.slice() : ['mincho'],
      body: Array.isArray(c.fonts.body) ? c.fonts.body.slice() : ['gothic_med'],
      mono: Array.isArray(c.fonts.mono) ? c.fonts.mono.slice() : ['mono'],
    },
    texture: Object.assign({ grain: 0.5, paper: 0, scan: 0 }, c.texture || {}),
    ghost: c.ghost != null ? c.ghost : 1.0,
    glow: c.glow != null ? c.glow : 0.8,
    glitchBoost: c.glitchBoost != null ? c.glitchBoost : 1.0,
    bias: {
      layout: Object.assign({}, (c.bias && c.bias.layout) || {}),
      enter: Object.assign({}, (c.bias && c.bias.enter) || {}),
      exit: Object.assign({}, (c.bias && c.bias.exit) || {}),
    },
    decor: Object.assign({}, c.decor || {}),
    hud: c.hud != null ? !!c.hud : false,
    useGrad: c.useGrad != null ? !!c.useGrad : false,
  };
  S.project.style = 'custom';
  custActiveScheme = 0;
  syncUI();
  replan();
  commit();
  toast('已载入「' + src.name + '」为自定义风格模板');
}

function renderCustomStyle() {
  const cs = ensureCustomStyle();
  const isCust = S.project.style === 'custom';

  const btnApp = $('btnApplyCustom');
  if (btnApp) {
    btnApp.textContent = isCust ? '使用中' : '应用自定';
    btnApp.classList.toggle('accent', isCust);
    btnApp.classList.toggle('primary', !isCust);
  }

  const selPreset = $('presetToCustom');
  if (selPreset && selPreset.options.length <= 1) {
    J.STYLE_ORDER.filter(k => k !== 'custom').forEach(k => {
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = (J.STYLES[k] && J.STYLES[k].name) || k;
      selPreset.appendChild(opt);
    });
  }

  document.querySelectorAll('.cust-tab-btn').forEach(btn => {
    const t = btn.dataset.custTab;
    btn.classList.toggle('active', t === custActiveTab);
  });
  document.querySelectorAll('.cust-pane').forEach(pane => {
    pane.hidden = pane.dataset.custPane !== custActiveTab;
  });

  renderCustSchemes(cs);
  renderCustFonts(cs);
  renderCustSliders(cs);
  renderCustLayoutBias(cs);
  renderCustAnimBias(cs);
  renderCustDecorBias(cs);
  renderCustSwitches(cs);
}

function renderCustSchemes(cs) {
  const tabs = $('schemeTabs'); if (!tabs) return;
  tabs.innerHTML = '';
  custActiveScheme = J.clamp(custActiveScheme, 0, cs.schemes.length - 1);

  cs.schemes.forEach((s, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'scheme-tab-btn' + (idx === custActiveScheme ? ' active' : '');
    btn.innerHTML = `<span class="scheme-dot" style="background:${s.accent}; border-color:${s.bg}"></span>`
      + `<span>方案 ${idx + 1}</span>`
      + (cs.schemes.length > 1 ? `<span class="scheme-del" data-del="${idx}" title="删除此配色方案">×</span>` : '');
    btn.addEventListener('click', e => {
      if (e.target.dataset.del != null) {
        e.stopPropagation();
        pushEdit(); remember();
        cs.schemes.splice(+e.target.dataset.del, 1);
        custActiveScheme = Math.min(custActiveScheme, cs.schemes.length - 1);
        touchCustomStyle();
        renderCustSchemes(cs);
        return;
      }
      custActiveScheme = idx;
      renderCustSchemes(cs);
    });
    tabs.appendChild(btn);
  });

  const cur = cs.schemes[custActiveScheme];
  const grid = $('schemeEditor'); if (!grid) return;
  grid.innerHTML = '';

  const SCHEME_FIELDS = [
    { k: 'bg', label: '背景色' },
    { k: 'fg', label: '主文字' },
    { k: 'sub', label: '辅助文字' },
    { k: 'accent', label: '强调色' },
    { k: 'accent2', label: '装饰色' },
    { k: 'ink', label: '贴纸底色' },
    { k: 'ghostA', label: '错位色 A' },
    { k: 'ghostB', label: '错位色 B' },
    { k: 'grad0', label: '渐变起始' },
    { k: 'grad1', label: '渐变结束' },
    { k: 'dim', label: '弱背景字' },
  ];

  SCHEME_FIELDS.forEach(f => {
    const wrap = document.createElement('div');
    wrap.className = 'color-field';
    let val = '';
    if (f.k === 'grad0') val = (cur.grad && cur.grad[0]) || cur.accent;
    else if (f.k === 'grad1') val = (cur.grad && cur.grad[1]) || cur.sub;
    else val = cur[f.k] || (f.k === 'accent2' ? cur.accent : f.k === 'ink' ? cur.fg : '#888888');

    const hexVal = toColorInput(val);
    wrap.innerHTML = `<span class="muted">${f.label}</span>`
      + `<div class="color-field-in">`
      + `<input type="color" value="${hexVal}">`
      + `<input type="text" value="${hexVal.toUpperCase()}">`
      + `</div>`;

    const cInp = wrap.querySelector('input[type=color]');
    const tInp = wrap.querySelector('input[type=text]');
    let editing = false;
    const finishColorEdit = () => {
      if (!editing) return;
      editing = false;
      commit(); flushSave(); updateEditBtns();
    };

    const onVal = (newHex) => {
      if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(newHex)) return;
      newHex = toColorInput(newHex).toUpperCase();
      const oldHex = f.k === 'grad0' ? cur.grad && cur.grad[0] : f.k === 'grad1' ? cur.grad && cur.grad[1] : cur[f.k];
      if (newHex === String(oldHex || '').toUpperCase()) return;
      if (!editing) { pushEdit(); remember(); editing = true; }
      if (f.k === 'grad0') { if (!cur.grad) cur.grad = [newHex, cur.sub]; else cur.grad[0] = newHex; }
      else if (f.k === 'grad1') { if (!cur.grad) cur.grad = [cur.accent, newHex]; else cur.grad[1] = newHex; }
      else cur[f.k] = newHex;

      cInp.value = newHex.toLowerCase();
      tInp.value = newHex;
      touchCustomStyle();
      updateCustSwatch(cur);
    };

    cInp.addEventListener('input', e => onVal(e.target.value));
    cInp.addEventListener('change', e => { onVal(e.target.value); finishColorEdit(); });
    cInp.addEventListener('blur', finishColorEdit);
    tInp.addEventListener('change', e => { onVal(e.target.value.trim()); finishColorEdit(); });
    grid.appendChild(wrap);
  });

  const pWrap = document.createElement('label');
  pWrap.className = 'check';
  pWrap.style.gridColumn = '1 / -1';
  pWrap.style.marginTop = '4px';
  pWrap.innerHTML = `<input type="checkbox" ${cur.paper ? 'checked' : ''}><span>此方案附加纸纹 (Paper texture)</span>`;
  pWrap.querySelector('input').addEventListener('change', e => {
    pushEdit(); remember();
    cur.paper = e.target.checked;
    touchCustomStyle();
    commit(); flushSave();
  });
  grid.appendChild(pWrap);

  updateCustSwatch(cur);
}

function updateCustSwatch(cur) {
  const sw = $('custSchemeSwatch');
  if (sw) {
    const cols = [cur.bg, cur.fg, cur.sub, cur.accent, cur.accent2 || cur.accent, (cur.grad && cur.grad[0]) || cur.accent, (cur.grad && cur.grad[1]) || cur.sub, cur.ghostA || cur.accent, cur.ghostB || cur.sub];
    sw.innerHTML = cols.map(c => `<i style="background:${toColorInput(c)}" title="${c}"></i>`).join('');
  }
}

const FONT_ROLES = [
  { role: 'display', label: '标题 (Display)', desc: '用于醒目大字、主标题与强视觉词句' },
  { role: 'body', label: '正文 (Body)', desc: '用于较长唱词、常规排版与注解小字' },
  { role: 'serif', label: '衬线 (Serif)', desc: '用于古典、诗意、宋体/明朝风格词句' },
  { role: 'mono', label: '数字与等宽 (Mono)', desc: '用于时间戳、音轨序号、HUD数据流' },
];

function renderCustFonts(cs) {
  const box = $('custFontRoles'); if (!box) return;
  box.innerHTML = '';

  FONT_ROLES.forEach(r => {
    const card = document.createElement('div');
    card.className = 'font-cand-card';
    const cands = cs.fonts[r.role] || [];

    card.innerHTML = `<div class="font-cand-head">`
      + `<div><strong>${r.label}</strong> <span class="muted" style="font-size:11px">${r.desc}</span></div>`
      + `</div>`
      + `<div class="font-cand-chips"></div>`
      + `<div class="row" style="margin-top:4px">`
      + `<select class="small add-font-sel" style="flex:1">`
      + `<option value="">+ 添加候选字体...</option>`
      + Object.entries(J.FONTS).map(([fk, f]) => {
          const g = J.faceOf ? J.faceOf(fk) : f;
          return `<option value="${escapeHtml(fk)}">${escapeHtml(g.label || f.label)}</option>`;
        }).join('')
      + `</select>`
      + `</div>`;

    const chipsBox = card.querySelector('.font-cand-chips');
    cands.forEach((fk, i) => {
      const f = J.FONTS[fk] || { label: fk };
      const g = J.faceOf ? J.faceOf(fk) : f;
      const chip = document.createElement('span');
      chip.className = 'font-chip';
      chip.innerHTML = `<span>${escapeHtml(g.label || f.label)}</span>`
        + (cands.length > 1 ? `<button type="button" title="移除候选">×</button>` : '');
      const btn = chip.querySelector('button');
      if (btn) {
        btn.addEventListener('click', () => {
          pushEdit(); remember();
          cs.fonts[r.role].splice(i, 1);
          touchCustomStyle();
          renderCustFonts(cs);
        });
      }
      chipsBox.appendChild(chip);
    });

    card.querySelector('select').addEventListener('change', e => {
      const val = e.target.value;
      if (!val) return;
      if (!cs.fonts[r.role].includes(val)) {
        pushEdit(); remember();
        cs.fonts[r.role].push(val);
        touchCustomStyle();
        renderCustFonts(cs);
      }
      e.target.value = '';
    });

    box.appendChild(card);
  });
}

const CUST_SLIDERS = [
  { k: 'grain', label: '颗粒感强度 (Grain)', group: 'texture', min: 0, max: 1, step: 0.01, unit: '%' },
  { k: 'paper', label: '纸张质感 (Paper)', group: 'texture', min: 0, max: 1, step: 0.01, unit: '%' },
  { k: 'scan', label: '扫描线强度 (Scanlines)', group: 'texture', min: 0, max: 1, step: 0.01, unit: '%' },
  { k: 'ghost', label: '错位效果倍率 (Aberration)', min: 0, max: 2.5, step: 0.05, unit: 'x' },
  { k: 'glow', label: '发光效果增强 (Glow)', min: 0, max: 2.5, step: 0.05, unit: 'x' },
  { k: 'glitchBoost', label: '故障效果增强 (Glitch)', min: 0.5, max: 2.5, step: 0.05, unit: 'x' },
];

function renderCustSliders(cs) {
  const box = $('custSliders'); if (!box) return;
  box.innerHTML = '';

  CUST_SLIDERS.forEach(s => {
    const val = s.group === 'texture' ? (cs.texture[s.k] ?? (s.k === 'grain' ? 0.6 : 0)) : (cs[s.k] ?? 1.0);
    const row = document.createElement('div');
    row.className = 'slider';
    row.innerHTML = `<label>${s.label}</label>`
      + `<input type="range" min="${s.min}" max="${s.max}" step="${s.step}" value="${val}">`
      + `<output>${s.unit === '%' ? Math.round(val * 100) + '%' : (+val).toFixed(2) + 'x'}</output>`
      + `<span></span>`;

    const inp = row.querySelector('input');
    const out = row.querySelector('output');
    inp.addEventListener('input', () => {
      const v = +inp.value;
      if (s.group === 'texture') cs.texture[s.k] = v;
      else cs[s.k] = v;
      out.textContent = s.unit === '%' ? Math.round(v * 100) + '%' : v.toFixed(2) + 'x';
      touchCustomStyle();
    });
    box.appendChild(row);
  });
}

const CORE_LAYOUTS = [
  'huge', 'center', 'vcols', 'condensed', 'stack', 'tile', 'marquee',
  'scatter', 'circle', 'ring', 'labels', 'wave', 'gloss', 'diag', 'mixed'
];

function renderCustLayoutBias(cs) {
  const box = $('layoutBiasChips'); if (!box) return;
  box.innerHTML = '';

  CORE_LAYOUTS.forEach(k => {
    const w = cs.bias.layout[k] != null ? cs.bias.layout[k] : 1;
    const name = (J.LAYOUTS[k] && J.LAYOUTS[k].name) || k;
    const code = J.codeOf('layout', k);
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'bias-chip';
    const tagW = w >= 3 ? '3' : w >= 2 ? '2' : w <= 0 ? '0' : '1';
    chip.dataset.w = tagW;
    const badgeTxt = w >= 3 ? '3x 极高' : w >= 2 ? '2x 偏好' : w <= 0 ? '✕ 禁用' : '1x';
    const codeTag = code ? `<b class="bias-code">${code}</b> ` : '';
    chip.innerHTML = `<span>${codeTag}${escapeHtml(name)}</span><span class="bias-badge">${badgeTxt}</span>`;

    chip.addEventListener('click', () => {
      pushEdit(); remember();
      const nextW = w === 1 ? 2 : w === 2 ? 3 : w >= 3 ? 0 : 1;
      if (nextW === 1) delete cs.bias.layout[k];
      else cs.bias.layout[k] = nextW;
      touchCustomStyle();
      renderCustLayoutBias(cs);
    });
    box.appendChild(chip);
  });
}

const CORE_ENTERS = [
  'assemble', 'slice', 'type', 'pop', 'stretch', 'scramble', 'zoom', 'spin', 'wipe', 'drop', 'blur', 'flicker', 'cut'
];
const CORE_EXITS = [
  'glitch', 'explode', 'scatter', 'drift', 'slice', 'shrink', 'fall', 'wipe', 'blur', 'cut'
];

function renderCustAnimBias(cs) {
  const eBox = $('enterBiasChips');
  if (eBox) {
    eBox.innerHTML = '';
    CORE_ENTERS.forEach(k => {
      const w = cs.bias.enter[k] != null ? cs.bias.enter[k] : 1;
      const name = (J.ENTER[k] && J.ENTER[k].name) || k;
      const code = J.codeOf('enter', k);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'bias-chip';
      const tagW = w >= 3 ? '3' : w >= 2 ? '2' : w <= 0 ? '0' : '1';
      chip.dataset.w = tagW;
      const badgeTxt = w >= 3 ? '3x 极高' : w >= 2 ? '2x 偏好' : w <= 0 ? '✕ 禁用' : '1x';
      const codeTag = code ? `<b class="bias-code">${code}</b> ` : '';
      chip.innerHTML = `<span>${codeTag}${escapeHtml(name)}</span><span class="bias-badge">${badgeTxt}</span>`;

      chip.addEventListener('click', () => {
        pushEdit(); remember();
        const nextW = w === 1 ? 2 : w === 2 ? 3 : w >= 3 ? 0 : 1;
        if (nextW === 1) delete cs.bias.enter[k];
        else cs.bias.enter[k] = nextW;
        touchCustomStyle();
        renderCustAnimBias(cs);
      });
      eBox.appendChild(chip);
    });
  }

  const xBox = $('exitBiasChips');
  if (xBox) {
    xBox.innerHTML = '';
    CORE_EXITS.forEach(k => {
      const w = cs.bias.exit[k] != null ? cs.bias.exit[k] : 1;
      const name = (J.EXIT[k] && J.EXIT[k].name) || k;
      const code = J.codeOf('exit', k);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'bias-chip';
      const tagW = w >= 3 ? '3' : w >= 2 ? '2' : w <= 0 ? '0' : '1';
      chip.dataset.w = tagW;
      const badgeTxt = w >= 3 ? '3x 极高' : w >= 2 ? '2x 偏好' : w <= 0 ? '✕ 禁用' : '1x';
      const codeTag = code ? `<b class="bias-code">${code}</b> ` : '';
      chip.innerHTML = `<span>${codeTag}${escapeHtml(name)}</span><span class="bias-badge">${badgeTxt}</span>`;

      chip.addEventListener('click', () => {
        pushEdit(); remember();
        const nextW = w === 1 ? 2 : w === 2 ? 3 : w >= 3 ? 0 : 1;
        if (nextW === 1) delete cs.bias.exit[k];
        else cs.bias.exit[k] = nextW;
        touchCustomStyle();
        renderCustAnimBias(cs);
      });
      xBox.appendChild(chip);
    });
  }
}

const CORE_DECORS = [
  'rings', 'arrows', 'grid', 'slash', 'bars', 'stripes', 'dots',
  'shapes', 'sparks', 'leaders', 'counter', 'barcode', 'hud', 'blobs', 'waveform'
];

function renderCustDecorBias(cs) {
  const box = $('decorBiasChips'); if (!box) return;
  box.innerHTML = '';

  CORE_DECORS.forEach(k => {
    const w = cs.decor[k] != null ? cs.decor[k] : 1;
    const name = (J.DECOR[k] && J.DECOR[k].name) || k;
    const code = J.codeOf('decor', k);
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'bias-chip';
    const tagW = w >= 3 ? '3' : w >= 2 ? '2' : w <= 0 ? '0' : '1';
    chip.dataset.w = tagW;
    const badgeTxt = w >= 3 ? '3x 极高' : w >= 2 ? '2x 偏好' : w <= 0 ? '✕ 禁用' : '1x';
    const codeTag = code ? `<b class="bias-code">${code}</b> ` : '';
    chip.innerHTML = `<span>${codeTag}${escapeHtml(name)}</span><span class="bias-badge">${badgeTxt}</span>`;

    chip.addEventListener('click', () => {
      pushEdit(); remember();
      const nextW = w === 1 ? 2 : w === 2 ? 3 : w >= 3 ? 0 : 1;
      if (nextW === 1) delete cs.decor[k];
      else cs.decor[k] = nextW;
      touchCustomStyle();
      renderCustDecorBias(cs);
    });
    box.appendChild(chip);
  });
}

function renderCustSwitches(cs) {
  const sStrict = $('custStrictPalette');
  if (sStrict) {
    sStrict.checked = cs.strictPalette === true;
    sStrict.onchange = e => {
      pushEdit(); remember();
      cs.strictPalette = e.target.checked;
      touchCustomStyle(); commit(); flushSave();
    };
  }
  const sHud = $('custSwitchHud');
  if (sHud) {
    sHud.checked = !!cs.hud;
    sHud.onchange = e => { cs.hud = e.target.checked; touchCustomStyle(); };
  }
  const sGrad = $('custSwitchGrad');
  if (sGrad) {
    sGrad.checked = !!cs.useGrad;
    sGrad.onchange = e => { cs.useGrad = e.target.checked; touchCustomStyle(); };
  }
  const sPaper = $('custSwitchPaper');
  if (sPaper) {
    sPaper.checked = !!cs.allPaper;
    sPaper.onchange = e => { cs.allPaper = e.target.checked; touchCustomStyle(); };
  }
}

function bindCustomStyleEvents() {
  $('btnStyleTemplates').addEventListener('click', () => {
    const panel = $('styleTemplates');
    panel.hidden = !panel.hidden;
    $('btnStyleTemplates').setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) { drawStyleGrid(); loadThumbFonts(); }
  });
  document.querySelectorAll('.cust-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      custActiveTab = btn.dataset.custTab;
      renderCustomStyle();
    });
  });

  const bApply = $('btnApplyCustom');
  if (bApply) {
    bApply.addEventListener('click', () => {
      pushEdit(); remember();
      clearSavedCuts();
      S.project.style = 'custom';
      syncUI(); replan(); commit();
      toast('已应用自定义风格');
    });
  }

  const bReset = $('btnResetCustom');
  if (bReset) {
    bReset.addEventListener('click', () => {
      pushEdit(); remember();
      S.project.customStyle = J.defaultCustomStyle();
      custActiveScheme = 0;
      syncUI(); replan(); commit();
      toast('自定义风格已重置');
    });
  }

  const selPreset = $('presetToCustom');
  if (selPreset) {
    selPreset.addEventListener('change', e => {
      if (e.target.value) {
        copyPresetToCustom(e.target.value);
        e.target.value = '';
      }
    });
  }

  const bAddSch = $('btnAddScheme');
  if (bAddSch) {
    bAddSch.addEventListener('click', () => {
      const cs = ensureCustomStyle();
      pushEdit(); remember();
      const cur = cs.schemes[custActiveScheme] || cs.schemes[0];
      const newS = JSON.parse(JSON.stringify(cur));
      newS.bg = cur.fg; newS.fg = cur.bg;
      newS.dim = J.mix(newS.bg, newS.fg, 0.15);
      newS.sub = J.mix(newS.bg, newS.fg, 0.45);
      cs.schemes.push(newS);
      custActiveScheme = cs.schemes.length - 1;
      touchCustomStyle();
      renderCustomStyle();
    });
  }

  const bInvSch = $('btnInvertScheme');
  if (bInvSch) {
    bInvSch.addEventListener('click', () => {
      const cs = ensureCustomStyle();
      pushEdit(); remember();
      const cur = cs.schemes[custActiveScheme];
      if (!cur) return;
      const tmp = cur.bg; cur.bg = cur.fg; cur.fg = tmp;
      cur.dim = J.mix(cur.bg, cur.fg, 0.15);
      cur.sub = J.mix(cur.bg, cur.fg, 0.45);
      touchCustomStyle();
      renderCustomStyle();
    });
  }

  const bRandSch = $('btnRandScheme');
  if (bRandSch) {
    bRandSch.addEventListener('click', () => {
      const cs = ensureCustomStyle();
      pushEdit(); remember();
      const cur = cs.schemes[custActiveScheme];
      if (!cur) return;
      const p = J.randomPalette(cur.bg);
      cur.accent = p.accent;
      cur.ghostA = p.ghostA;
      cur.ghostB = p.ghostB;
      cur.grad = [p.accent, p.ghostB];
      touchCustomStyle();
      renderCustomStyle();
    });
  }

  const bResetL = $('btnResetLayoutBias');
  if (bResetL) {
    bResetL.addEventListener('click', () => {
      const cs = ensureCustomStyle();
      pushEdit(); remember();
      cs.bias.layout = {};
      touchCustomStyle();
      renderCustLayoutBias(cs);
    });
  }

  const bResetE = $('btnResetEnterBias');
  if (bResetE) {
    bResetE.addEventListener('click', () => {
      const cs = ensureCustomStyle();
      pushEdit(); remember();
      cs.bias.enter = {};
      touchCustomStyle();
      renderCustAnimBias(cs);
    });
  }

  const bResetX = $('btnResetExitBias');
  if (bResetX) {
    bResetX.addEventListener('click', () => {
      const cs = ensureCustomStyle();
      pushEdit(); remember();
      cs.bias.exit = {};
      touchCustomStyle();
      renderCustAnimBias(cs);
    });
  }

  const bResetD = $('btnResetDecorBias');
  if (bResetD) {
    bResetD.addEventListener('click', () => {
      const cs = ensureCustomStyle();
      pushEdit(); remember();
      cs.decor = {};
      touchCustomStyle();
      renderCustDecorBias(cs);
    });
  }
}

/* ---------------- history of looks (◀ ▶) ---------------- */
// only the "look" is tracked — lyrics, timing and output settings are never rolled back
const HKEYS = ['style', 'mood', 'seed', 'fx', 'enabled', 'fonts', 'colors', 'overrides', 'locks', 'customStyle'];
const H = { list: [], i: -1 };
const lookSnap = () => JSON.stringify(Object.fromEntries(HKEYS.map(k => [k, S.project[k] ?? null])));
function remember() {            // call before changing the look: makes sure the current look is on the stack
  const s = lookSnap();
  if (H.i >= 0 && H.list[H.i] === s) return;
  H.list = H.list.slice(0, H.i + 1); H.list.push(s); H.i = H.list.length - 1;
}
function commit() {              // call after changing the look
  const s = lookSnap();
  if (H.list[H.i] !== s) { H.list = H.list.slice(0, H.i + 1); H.list.push(s); H.i = H.list.length - 1; }
  if (H.list.length > 80) { H.list.splice(0, H.list.length - 80); H.i = H.list.length - 1; }
  updateHist();
}
function histGo(d) {
  if (S.exporting) return;
  pushEdit();
  remember();                    // hand edits made since the last step become a stop of their own
  const j = H.i + d; if (j < 0 || j >= H.list.length) return;
  H.i = j;
  Object.assign(S.project, JSON.parse(H.list[j]));
  fontKey = ''; syncUI(); replan(); updateHist();
  toast(`${j + 1} / ${H.list.length} 案目`);
  restartPreview();
}
function updateHist() {
  const canB = H.i > 0, canF = H.i < H.list.length - 1;
  ['btnPrev', 'btnPrev2'].forEach(id => { const b = $(id); if (b) b.disabled = !canB; });
  ['btnNext', 'btnNext2'].forEach(id => { const b = $(id); if (b) b.disabled = !canF; });
  $('histPos').textContent = H.list.length > 1 ? `${H.i + 1} / ${H.list.length}` : '';
}

/* ---------------- locks (what Randomize / Shuffle must not touch) ----------------
   project.locks = { tech: { group: true }, params: { key: true } }
   tech:   freezes that group's ON/OFF selection, i.e. the candidate count the panel shows (120/140, 28/28).
           Randomize re-picks which techniques are candidates, so freezing the pool is what keeps the count —
           this does not pin one technique in place.
   params: freezes the current value of the effects sliders, on-twos and flash.
   Neither goes into J.plan: they only bracket the places that rewrite the look (Randomize, mood reroll). */
const LOCK_TITLE_ON = 'おまかせ／シャッフルで変えないようにロック';
const TECH_LOCK_ON = 'おまかせでON／OFFを変えないようにロック';
const LOCK_TITLE_OFF = 'ロック中。クリックで解除';
function locksOf() {
  const P = S.project;
  if (!P.locks) P.locks = { tech: {}, params: {} };
  if (!P.locks.tech) P.locks.tech = {};
  if (!P.locks.params) P.locks.params = {};
  return P.locks;
}
function lockOn(k) { return !!locksOf().params[k]; }
function lockName(k) {
  const f = FX.find(x => x[0] === k);
  return f ? f[1] : k;
}
function groupLabel(g) { const m = GROUPS.find(x => x[0] === g); return m ? m[1] : g; }
function toggleTechLock(g) {
  pushEdit();
  const L = locksOf();
  remember();
  if (L.tech[g]) { delete L.tech[g]; toast('ロック解除：' + groupLabel(g)); }
  else { L.tech[g] = true; toast('ロック：' + groupLabel(g)); }
  commit(); autosave(); renderTech();
}
function toggleParamLock(k) {
  pushEdit();
  const L = locksOf();
  remember();
  if (L.params[k]) { delete L.params[k]; toast('ロック解除：' + lockName(k)); }
  else { L.params[k] = true; toast('ロック：' + lockName(k)); }
  commit(); autosave(); renderFx();
}
function lockedEnabled() {                        // ON/OFF selection of every locked group, as it is now
  const P = S.project, out = {};
  for (const g of Object.keys(locksOf().tech)) if (P.enabled && P.enabled[g]) out[g] = Object.assign({}, P.enabled[g]);
  return out;
}
function restoreEnabled(keep) {                   // put the locked groups back after Randomize
  const P = S.project;
  for (const g of Object.keys(keep || {})) { P.enabled = P.enabled || {}; P.enabled[g] = keep[g]; }
}
function lockedParams() {                         // current value of every locked effect / set switch
  const out = {}, L = locksOf(), F = S.project.fx;
  for (const k of Object.keys(L.params)) {
    if (!L.params[k]) continue;
    if (k === 'koma') out[k] = J.komaOf(F);                      // on-twos: freeze the effective value even when unset
    else if (k === 'flash') out[k] = !!F.flash;
    else if (F[k] != null) out[k] = F[k];
  }
  return out;
}
function restoreParams(keep) {
  const P = S.project;
  for (const k of Object.keys(keep || {})) P.fx[k] = keep[k];
}
function lockBtn(k, anchor) {                     // lock button for effects that are not sliders (on-twos, flash)
  const p = anchor.parentElement;
  let b = p.querySelector(':scope > .lk[data-lk="' + k + '"]');
  if (!b) {
    b = document.createElement('button');
    b.type = 'button'; b.className = 'icon ghost lk pro-only'; b.dataset.lk = k;
    b.innerHTML = ICON.lock;
    b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); toggleParamLock(k); });
    anchor.insertAdjacentElement('afterend', b);
  }
  const on = !!locksOf().params[k];
  b.setAttribute('aria-pressed', String(on));
  b.title = on ? LOCK_TITLE_OFF : LOCK_TITLE_ON;
  return b;
}

/* ---------------- おまかせ ---------------- */
function restartPreview() { seek(0); if (!S.playing && S.mode !== 'pro') play(); }
const themeName = th => { const o = document.querySelector(`.themeSel option[value="${th}"]`); return o ? o.textContent : th; };
function omakase() {
  if (S.exporting || S.tap) return;
  pushEdit();
  remember();
  const keepE = lockedEnabled(), keepP = lockedParams();
  const th = J.THEMES[S.project.themeId] ? S.project.themeId : null;
  const r = th ? J.omakase(S.project, Math.random, th) : J.omakase(S.project);
  Object.assign(S.project, r);
  restoreEnabled(keepE); restoreParams(keepP);
  fontKey = ''; syncUI(); replan(); commit();
  toast((th ? `おまかせ（${themeName(th)}）：` : 'おまかせ：') + `${J.STYLES[r.style].name} × ${J.MOODS[r.mood].name}`, r.colors.accentOn ? [r.colors.accent, r.colors.ghostA, r.colors.ghostB] : null);
  restartPreview();
}
// change just one aspect of the current look
function rerollPart(part) {
  if (S.exporting || S.tap) return;
  pushEdit();
  remember();
  clearSavedCuts();
  const P = S.project;
  let msg = '';
  if (part === 'style') {
    let pool = J.STYLE_ORDER.filter(k => k !== P.style && J.randomOk(P, 'style', k));
    if (!pool.length) pool = J.STYLE_ORDER.filter(k => k !== P.style);
    P.style = pool[Math.floor(Math.random() * pool.length)];
    P.colors.enabled = false;
    msg = `スタイル：${J.STYLES[P.style].name}`;
  } else if (part === 'mood') {
    const keepE = lockedEnabled(), keepP = lockedParams();
    const th = J.THEMES[P.themeId] ? P.themeId : null;
    const r = th ? J.omakase(P, Math.random, th) : J.omakase(P);
    Object.assign(P, { mood: r.mood, fx: r.fx, enabled: r.enabled });
    for (const k of ['wa', 'extra', ...J.SET_ORDER]) if (r[k] === true) P[k] = true;     // switches the theme needs
    restoreEnabled(keepE); restoreParams(keepP);
    msg = `雰囲気：${J.MOODS[r.mood].name}`;
  } else if (part === 'cut') {
    P.seed = (Math.random() * 1e9) | 0;
    msg = '構成：レイアウトと動きを再抽選';
  }
  fontKey = ''; syncUI(); replan(); commit();
  toast(msg);
  restartPreview();
}
function showNow() {
  const el = $('easyNow'); if (!el || !S.plan || el.closest('[hidden]')) return;
  const P = S.project, sc = S.plan.style.schemes[0];
  const moodName = P.mood && J.MOODS[P.mood] ? J.MOODS[P.mood].name : 'カスタム';
  const fk = S.plan.style.fonts.display[0];
  const fontName = J.FONTS[fk] ? (J.faceOf ? J.faceOf(fk) : J.FONTS[fk]).label : fk;   // the face actually drawn for the lyric language
  const cuts = S.plan.cuts.filter(c => c.line >= 0 && c.layout !== 'interlude');
  const kinds = new Set(cuts.map(c => c.layout)).size;
  const row = (k, v) => `<div class="now-row"><span class="k">${k}</span><span class="v">${v}</span></div>`;
  el.innerHTML = row('スタイル', `<b>${escapeHtml(J.STYLES[P.style].name)}</b>`)
    + row('雰囲気', escapeHtml(moodName))
    + row('配色', `<span class="swatches">${swatchHTML([sc.bg, sc.fg, sc.accent, sc.ghostA, sc.ghostB])}</span>${P.colors.accentOn ? '<span class="tagl">ランダム</span>' : ''}`)
    + row('見出し書体', escapeHtml(fontName))
    + row('構成', `${cuts.length} カット・レイアウト ${kinds} 種`)
    + row('演出', `加工 ${cuts.filter(c => c.treat && c.treat !== 'none').length}・背景 ${new Set(cuts.map(c => c.bg).filter(b => b && b !== 'none')).size}種・カメラ ${cuts.filter(c => c.cam && c.cam !== 'push').length}`);
}
let toastTimer = 0;
function toast(m, cols, duration) {
  const el = $('toast'); if (!el) return;
  el.innerHTML = escapeHtml(m) + (cols ? `<span class="swatches">${swatchHTML(cols)}</span>` : '');
  el.hidden = false; el.classList.remove('out'); void el.offsetWidth; el.classList.add('in');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('in'); el.classList.add('out'); toastTimer = setTimeout(() => { el.hidden = true; }, 260); }, duration || 1700);
}

/* ---------------- かんたん / 詳細 ---------------- */
function setMode(m) {
  S.mode = m === 'easy' ? 'easy' : m === 'mobile' ? 'mobile' : 'pro';
  const mobile = S.mode === 'mobile', easy = S.mode === 'easy' || mobile;   // スマホ = the かんたん panel, laid out for a phone
  $('app').classList.toggle('is-easy', easy);
  $('app').classList.toggle('is-mobile', mobile);
  $('app').classList.remove('menu-open'); $('btnMenu').setAttribute('aria-expanded', 'false');
  document.documentElement.classList.toggle('fixed-ok', !mobile);           // one scrolling page on a phone
  $('easyPanel').hidden = !easy;
  $('modeMobile').setAttribute('aria-pressed', String(mobile));
  $('modeEasy').setAttribute('aria-pressed', String(S.mode === 'easy'));
  $('modePro').setAttribute('aria-pressed', String(S.mode === 'pro'));
  try { localStorage.setItem('jizura.mode', S.mode); } catch (e) {}
  if (mobile) mobileInit();
    if (easy) { showNow(); syncOut(); codecNoteSoon(); }
    if (easy) closeCutPick();
    if (S.plan && S.lineEls && S.lineEls.length) { lastCutIdx = -2; updateCutInfo(); }
  sizeViewport(); drawTimeline(); loadThumbFonts();
}

/* スマホ: the preview sticks right under the header; the first time, a phone-friendly size and the line list folded */
function mobileBar() { const b = document.querySelector('.bar'); if (b) document.documentElement.style.setProperty('--mbar', b.offsetHeight + 'px'); }
function mobileInit() {
  mobileBar();
  let first = true; try { first = localStorage.getItem('jizura.mobileInit') !== '1'; localStorage.setItem('jizura.mobileInit', '1'); } catch (e) {}
  if (first) {
    if ((S.project.res || 1080) > 720) { S.project.res = 720; syncOut(); autosave(); }
    const sec = $('lineList') && $('lineList').closest('.sec'); if (sec) sec.classList.add('fold');
  }
}

/* ---------------- fx tab ---------------- */
const FX = [['motion', '動きの強さ'], ['glitch', 'グリッチ'], ['chroma', '色ズレ'], ['decor', '装飾の量'], ['density', 'カットの細かさ'], ['texture', '質感'], ['bgSwitch', '背景の切替']];
function renderFx() {
  const box = $('fxSliders'); box.innerHTML = '';
  FX.forEach(([k, label]) => {
    const row = document.createElement('div'); row.className = 'slider';
    const v = S.project.fx[k] ?? 0.5;
    const lk = lockOn(k);
    row.innerHTML = `<label for="fx_${k}">${label}</label><input id="fx_${k}" type="range" min="0" max="1" step="0.01" value="${v}"><output>${Math.round(v * 100)}</output>`
      + `<button type="button" class="icon ghost lk pro-only" data-lk="${k}" aria-pressed="${lk}" title="${lk ? LOCK_TITLE_OFF : LOCK_TITLE_ON}">${ICON.lock}</button>`;
    const inp = row.querySelector('input'), out = row.querySelector('output');
    row.querySelector('.lk').addEventListener('click', () => toggleParamLock(k));
    inp.addEventListener('pointerdown', prepareEdit);
    inp.addEventListener('focus', prepareEdit);
    inp.addEventListener('input', () => { S.project.fx[k] = +inp.value; S.project.mood = null; out.textContent = Math.round(inp.value * 100); replanSoon(120); });
    inp.addEventListener('change', () => { flushSave(); updateEditBtns(); });
    box.appendChild(row);
  });
  lockBtn('flash', $('fxFlash').closest('label'));
  lockBtn('koma', $('fxKoma').closest('label'));
  $('fxFlash').checked = !!S.project.fx.flash;
  $('fxKoma').value = String(J.komaOf(S.project.fx));
  $('fxHud').value = S.project.fx.hud || 'auto';
  $('fxHideNo').checked = !!S.project.fx.hideNo; $('fxHideTime').checked = !!S.project.fx.hideTime;
  $('seed').value = S.project.seed;
}

/* ---------------- technique tab ---------------- */
const GROUPS = [['layout', 'レイアウト'], ['enter', '登場'], ['hold', '保持'], ['exit', '退場'], ['decor', '装飾'], ['treat', '文字の加工'], ['bg', '背景'], ['cam', 'カメラ'], ['fx', '画面効果'], ['trans', 'カット間のつなぎ']];
const openGroups = new Set();
function techItems(g) { return J.order(g).filter(k => J.registry(g)[k] && !J.registry(g)[k].special); }

const previewR = new J.Renderer();
const previewPlans = new Map();
const previewLive = new Set();
let previewObs = null, previewRaf = 0, previewLast = 0;
function previewCacheKey(g, k) {
  const p = S.project;
  return [p.style, p.aspect, g, k, p.colors && p.colors.enabled ? JSON.stringify(p.colors) : '', JSON.stringify(p.fonts || {}), p.style === 'custom' && p.customStyle ? JSON.stringify(p.customStyle) : ''].join('|');
}
function getPreviewPlan(g, k) {
  const id = previewCacheKey(g, k);
  let plan = previewPlans.get(id);
  if (plan) return plan;
  plan = J.previewPlan(S.project, g, k);
  previewPlans.set(id, plan);
  if (previewPlans.size > 500) previewPlans.delete(previewPlans.keys().next().value);
  return plan;
}
function previewTime(plan, g, now) {
  const c = plan.cuts[plan.cuts.length - 1];
  const u = now / 1000;
  if (g === 'enter') return c.start + ((u % 1.5) / 1.5) * Math.max(0.3, c.inDur);
  if (g === 'exit') { const od = Math.max(0.3, c.outDur || 0.5); return c.end - od + ((u % 1.5) / 1.5) * od; }
  if (g === 'trans') return c.start + ((u % 1.7) / 1.7) * (c.transDur || 0.35);
  if (g === 'fx') return (u % 1.05);
  const span = Math.max(1.6, c.dur * 0.96);
  return c.start + ((u % span) / span) * (c.dur * 0.96);
}
function paintTechCanvas(cv, g, k, t) {
  const plan = getPreviewPlan(g, k);
  const ctx = cv.getContext('2d');
  try {
    previewR.frame(ctx, plan, t, { scale: cv.width / plan.W, fast: true, noHud: true, noGhost: g !== 'fx' });
  } catch (e) {
    ctx.fillStyle = '#131316'; ctx.fillRect(0, 0, cv.width, cv.height);
  }
  cv.dataset.ready = '1';
}
function techPaneOpen() {
  const pane = $('techLists') && $('techLists').closest('.tabpane');
  const pick = $('cutPick');
  return (pane && !pane.hidden) || (pick && !pick.hidden);
}
function ensurePreviewObs() {
  if (previewObs) return previewObs;
  previewObs = new IntersectionObserver((ents) => {
    const now = performance.now();
    ents.forEach(e => {
      const cv = e.target;
      if (e.isIntersecting && e.intersectionRatio > 0) {
        previewLive.add(cv);
        if (!cv.dataset.ready && cv.dataset.g && cv.dataset.k) paintTechCanvas(cv, cv.dataset.g, cv.dataset.k, previewTime(getPreviewPlan(cv.dataset.g, cv.dataset.k), cv.dataset.g, now));
      } else previewLive.delete(cv);
    });
    kickPreviewLoop();
  }, { root: null, rootMargin: '40px 0px', threshold: [0, 0.12, 0.4] });
  return previewObs;
}
function resetPreviewWatch() {
  previewLive.clear();
  if (previewObs) { previewObs.disconnect(); previewObs = null; }
}
function watchThumb(cv) { ensurePreviewObs().observe(cv); }
function kickPreviewLoop() {
  if (previewRaf) return;
  const tick = (now) => {
    previewRaf = 0;
    if (document.hidden || S.exporting || !techPaneOpen() || !previewLive.size) return;
    if (now - previewLast >= 70) {
      previewLast = now;
      for (const cv of previewLive) {
        if (!cv.isConnected) { previewLive.delete(cv); continue; }
        const g = cv.dataset.g, k = cv.dataset.k;
        if (!g || !k) continue;
        paintTechCanvas(cv, g, k, previewTime(getPreviewPlan(g, k), g, now));
      }
    }
    previewRaf = requestAnimationFrame(tick);
  };
  previewRaf = requestAnimationFrame(tick);
}
// only the thumbnails on screen are drawn (the observer adds them to the live set when they scroll in)
function queueThumbs(list) {
  [...list.querySelectorAll('canvas[data-g]')].forEach(cv => watchThumb(cv));
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) kickPreviewLoop(); });

function renderTech() {
  resetPreviewWatch();
  const box = $('techLists'); box.innerHTML = '';
  const q = ($('techFilter').value || '').trim();
  let total = 0, onAll = 0;
  GROUPS.forEach(([g, label]) => {
    const tbl = J.registry(g), items = techItems(g), en = S.project.enabled[g] || (S.project.enabled[g] = {});
    const shown = q ? items.filter(k => J.matchEffect(g, k, q)).sort((a, b) => J.effectScore(g, a, q) - J.effectScore(g, b, q)) : items;
    const onN = items.filter(k => en[k] !== false).length;
    total += items.length; onAll += onN;
    if (q && !shown.length) return;
    const d = document.createElement('details'); d.className = 'tgroup';
    d.open = !!q || openGroups.has(g);
    const list = document.createElement('div'); list.className = 'checks tech-grid';
    let built = false;
    const build = () => { if (built) return; built = true; fillCards(); };
    d.addEventListener('toggle', () => { if (d.open) { openGroups.add(g); build(); queueThumbs(list); } else openGroups.delete(g); });
    const lked = !!locksOf().tech[g];
    const prefix = J.GROUP_CODE_PREFIX ? (J.GROUP_CODE_PREFIX[g] || '') : '';
    const prefixTag = prefix ? ` <b class="tg-code-tag">${prefix}</b>` : '';
    d.innerHTML = `<summary><span class="tg-name">${label}${prefixTag}</span><span class="tg-cnt mono">${onN}/${items.length}</span>`
      + `<button type="button" class="icon ghost lk pro-only" data-lk="${g}" aria-pressed="${lked}" title="${lked ? LOCK_TITLE_OFF : TECH_LOCK_ON}">${ICON.lock}</button></summary><div class="tg-tools"><button class="ghost small" data-a="on">すべてON</button><button class="ghost small" data-a="off">すべてOFF</button><button class="ghost small" data-a="flip">反転</button></div>`;
    const [tw, th] = (() => {
      const [W, H] = J.designSize(S.project.aspect || '16:9');
      const h = 90; return [Math.max(80, Math.round(h * W / H)), h];
    })();
    // the cards of a closed group are made when it is first opened (860 cards with canvases made every syncUI slow)
    const fillCards = () => shown.forEach(k => {
      const l = document.createElement('label');
      l.className = 'tcard';
      const def = tbl[k];
      const codeTag = def && def.code ? `<span class="tcard-code">${def.code}</span>` : '';
      l.title = (def && def.code ? `[${def.code}] ` : '') + k + (def && def.tags && def.tags.length ? '（' + def.tags.map(t => (J.MOODS[t] ? J.MOODS[t].name : t)).join('・') + '）' : '');
      if (!J.randomOk(S.project, g, k)) { l.classList.add('set-off'); l.title += def && def.extra && S.project.extra !== true ? '（追加分がオフのため、自動では選ばれません）' : def && def.set && !J.setOn(S.project, def.set) ? '（このセットがオフのため、自動では選ばれません）' : '（和風の演出がオフのため、自動では選ばれません）'; }
      l.innerHTML = `<canvas width="${tw}" height="${th}" data-g="${g}" data-k="${k}"></canvas><span class="tcard-name"><input type="checkbox" ${en[k] !== false ? 'checked' : ''}> ${codeTag}<span>${escapeHtml(def ? def.name : k)}</span>${setBadges(def)}</span>`;
      const cv = l.querySelector('canvas');
      l.querySelector('input').addEventListener('change', e => { pushEdit(); en[k] = e.target.checked; S.project.mood = null; d.querySelector('.tg-cnt').textContent = `${items.filter(x => en[x] !== false).length}/${items.length}`; replanSoon(60); });
      list.appendChild(l);
    });
    d.querySelector('summary .lk').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); toggleTechLock(g); });
    d.querySelectorAll('.tg-tools button').forEach(b => b.addEventListener('click', () => {
      pushEdit();
      const a = b.dataset.a;
      shown.forEach(k => { en[k] = a === 'on' ? true : a === 'off' ? false : en[k] === false; });
      if (g === 'layout' && !items.some(k => en[k] !== false)) en.center = true;
      if (g === 'enter') en.cut = true; if (g === 'exit') en.cut = true; if (g === 'hold') en.still = true;
      if (g === 'treat') en.none = true; if (g === 'bg') en.none = true; if (g === 'cam') en.push = true;
      S.project.mood = null; openGroups.add(g); renderTech(); replan();
    }));
    d.appendChild(list);
    box.appendChild(d);
    if (d.open) { build(); queueThumbs(list); }
  });
  $('techTotal').textContent = `${onAll}/${total}`;
}

/* ---------------- output tab ---------------- */
function syncOut() {
  $('outAspect').value = S.project.aspect; $('outRes').value = String(S.project.res); $('outFps').value = String(S.project.fps);
  $('eAspect').value = S.project.aspect; $('eRes').value = String(S.project.res); $('eFps').value = String(S.project.fps);
  $('outQuality').value = S.project.quality || 'high'; $('outAudio').checked = S.project.includeAudio !== false;
  const k = J.keyMode(S.project) || 'off';
  $('outKey').value = k; $('eKey').value = k;
  $('outCenter').checked = $('eCenter').checked = !!S.project.centerFree;
  const tall = J.designSize(S.project.aspect)[1] > J.designSize(S.project.aspect)[0] * 1.1;
  document.querySelectorAll('.center-dir').forEach(el => { el.hidden = !(S.project.centerFree && tall); });
  document.querySelectorAll('.centerDirSel').forEach(el => { el.value = S.project.centerDir === 'lr' ? 'lr' : 'tb'; });
  const kb = $('keyBadge');
  kb.hidden = k === 'off';
  if (k !== 'off') kb.innerHTML = `<i style="background:${J.KEY_BG[k]}"></i>${k === 'green' ? 'グリーンバック' : 'ブラックバック'}`;
}
// the codec check is slow in some browsers: at start-up, let the first preview frames paint before asking
function codecNoteSoon() { (window.requestIdleCallback || (f => setTimeout(f, 400)))(() => codecNote(), { timeout: 1500 }); }
async function codecNote() {
  const [w, h] = J.outputSize(S.project);
  const vc = await J.pickVideoCodec(w, h, S.project.fps, 12e6);
  $('codecNote').textContent = vc ? `このブラウザでは ${vc.label} で書き出します（${w}×${h} / ${S.project.fps}fps）。書き出し中はタブを開いたままにしてください。` : 'このブラウザは動画エンコード（WebCodecs）に対応していません。Chrome / Edge の最新版で開くか、連番PNGを使ってください。';
  $('btnMP4').disabled = !vc; $('eMP4').disabled = !vc;
  ['btnMP4File', 'eMP4File'].forEach(id => { $(id).hidden = !vc || !canPickFile(); });
  if (!vc) $('eMP4').title = 'このブラウザは MP4 書き出しに対応していません（Chrome / Edge 推奨）';
}
const EXP_BTNS = ['btnMP4', 'btnPNG', 'btnPNGA', 'btnPNGL', 'eMP4', 'btnMP4File', 'eMP4File', 'ePNG', 'ePNGA', 'ePNGL'];
function baseName() {
  const k = J.keyMode(S.project);
  return ((S.project.title || 'jizura').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 60) || 'jizura') + (k ? (k === 'green' ? '_greenback' : '_blackback') : '');
}
const canPickFile = () => typeof window.showSaveFilePicker === 'function' && !document.documentElement.classList.contains('cep') && typeof VideoEncoder !== 'undefined';
async function runExport(kind) {
  if (S.exporting) return;
  // 大きな動画用: the save dialog must open straight from the click (before anything is awaited)
  let file = null, fileName = '';
  if (kind === 'mp4file') {
    try {
      const hnd = await window.showSaveFilePicker({ suggestedName: baseName() + rangeSuffix() + '.mp4', types: [{ description: 'MP4', accept: { 'video/mp4': ['.mp4'] } }] });
      file = await hnd.createWritable(); fileName = hnd.name;
    } catch (e) { if (e && e.name === 'AbortError') return; toast('保存先を開けませんでした: ' + (e && e.message ? e.message : e)); return; }
  }
  pause();
  const ac = new AbortController(); S.exporting = ac;
  const boxes = [...document.querySelectorAll('.exp-box')];
  const setText = m => boxes.forEach(b => { b.querySelector('.exp-text').textContent = m; });
  const txt = { set textContent(m) { setText(m); }, get textContent() { return boxes[0].querySelector('.exp-text').textContent; } };
  boxes.forEach(b => { b.hidden = false; b.querySelector('.exp-bar').style.width = '0%'; });
  setText('準備中…');
  EXP_BTNS.forEach(id => { $(id).disabled = true; });
  const onProgress = (p, m) => { boxes.forEach(b => { b.querySelector('.exp-bar').style.width = (p * 100).toFixed(1) + '%'; }); setText(m); };
  const t0 = performance.now();
  boxes.forEach(b => { const sh = b.querySelector('.exp-share'); if (sh) sh.hidden = true; });
  // keep the phone's screen on while exporting (a sleeping screen stops the encoder)
  let wake = null; try { if (navigator.wakeLock) wake = await navigator.wakeLock.request('screen'); } catch (e) { wake = null; }
  // スマホ: at most 1080p (phones run out of memory / encoder time at 1440p and 4K)
  const proj = S.mode === 'mobile' && (S.project.res || 1080) > 1080 ? Object.assign({}, S.project, { res: 1080 }) : S.project;
  if (proj !== S.project) toast('スマホの画面では 1080p で書き出します');
  try {
    await J.ensureFonts(S.project.lyrics + (S.project.title || '') + (S.project.artist || '') + HUD_CHARS, J.fontsOfPlan(S.plan));
    const lost = J.missingUserFonts(J.fontsOfPlan(S.plan).concat(Object.values(S.project.fonts || {})));
    if (lost.length) throw new Error(`読み込んだ書体（${[...new Set(lost)].join('・')}）がこのブラウザにないため、書き出しを止めました。「フォント」から同じファイルを読み込み直すか、別の書体を選んでください`);
    if (kind === 'mp4' || kind === 'mp4file') {
      const plan = S.plan, range = exportRange(), span = J.exportSpan(plan, range);
      const r = await J.exportMP4({ plan, project: proj, audio: S.project.includeAudio !== false ? S.audio : null, quality: S.project.quality || 'high', onProgress, signal: ac.signal, range, file });
      file = null;
      txt.textContent = `完成 ${r.blob ? (r.blob.size / 1048576).toFixed(1) + 'MB・' : ''}${r.codec}${r.audio ? ' + ' + r.audio.toUpperCase() : ''}・${((performance.now() - t0) / 1000).toFixed(0)}秒`;
      if (r.blob) {
        const name = baseName() + rangeSuffix() + '.mp4';
        const res = await J.saveFile(name, r.blob);
        if (res === 'declined') txt.textContent += '（保存はキャンセルされました）';
        offerShare(boxes, r.blob, name);
      } else txt.textContent += `・「${fileName}」に保存しました`;
      if (r.tried && r.tried.length) txt.textContent += '（最初の方法では失敗したため、別のエンコーダーで書き出しました）';
      // audio that some players cannot play (Opus), or none at all: save the soundtrack as WAV next to it
      if (r.audioWanted && r.audio !== 'aac') {
        await J.saveFile(baseName() + rangeSuffix() + '_audio.wav', J.audioWav(S.audio.buffer, span.dur, span.t0));
        txt.textContent += r.audio ? '。このブラウザでは音声が Opus になり、iPhone・QuickTime などでは音が出ないことがあるため、音声を WAV でも保存しました' : '。このブラウザは音声を書き出せないため、音声を WAV で別に保存しました（動画編集ソフトで重ねてください）';
      } else if (S.project.includeAudio !== false && !S.audio && S.project.audioName) txt.textContent += '。曲が読み込まれていないため音声なしです（「曲を読み込む」から読み込み直してください）';
    } else {
      const blob = await J.exportPNGZip({ plan: S.plan, project: proj, transparent: kind === 'pnga', layers: kind === 'pngl', onProgress, signal: ac.signal, range: exportRange() });
      txt.textContent = `完成 ${(blob.size / 1048576).toFixed(1)}MB`;
      await J.saveFile(baseName() + rangeSuffix() + (kind === 'pnga' ? '_alpha' : kind === 'pngl' ? '_layers' : '') + '_png.zip', blob);
    }
  } catch (e) {
    txt.textContent = 'エラー: ' + (e && e.message ? e.message : e);
    console.error(e);
    if (file) { try { await file.abort(); } catch (e2) {} }
  } finally {
    S.exporting = null; S.need = true;
    EXP_BTNS.forEach(id => { $(id).disabled = false; });
    try { if (wake) await wake.release(); } catch (e) {}
    codecNote();
  }
}
/* phones: the share sheet is the reliable way to put a video into Photos / Files (a download link often isn't) */
function offerShare(boxes, blob, name) {
  let f = null;
  try { f = new File([blob], name, { type: blob.type || 'video/mp4' }); } catch (e) { return; }
  if (!navigator.canShare || !navigator.share || !navigator.canShare({ files: [f] })) return;
  boxes.forEach(b => {
    const sh = b.querySelector('.exp-share'); if (!sh) return;
    sh.hidden = false;
    sh.onclick = async () => { try { await navigator.share({ files: [f], title: name }); } catch (e) {} };
  });
}

/* ---------------- tap sync ---------------- */
// start from any line: playback begins a little before that line, earlier lines keep their times
function startTap(from = 0) {
  if (!S.plan.lines.length) return;
  from = J.clamp(from | 0, 0, S.plan.lines.length - 1);
  pushEdit();
  const opt = tapOpts();
  S.tap = { i: from, from, done: [], rate: opt.rate };
  if (!S.project.timing.lineTimes) S.project.timing.lineTimes = {};
  $('tapPanel').hidden = false; $('btnTap').setAttribute('aria-pressed', 'true');
  $('tapPanel').classList.remove('compact');
  $('tapRate').value = String(opt.rate); $('tapCount').checked = opt.count;
  const prev = from > 0 ? S.plan.lines[from - 1] : null, cur = S.plan.lines[from];
  const t0 = from === 0 ? 0 : Math.max(0, prev.start + 0.01, cur.start - 2.5);      // a little before the line, never before the previous one
  pause(); seek(t0); updateTap();
  $('tapBtn').focus();
  if (from > 0) toast(`${from + 1}行目からタップで同期します（${J.fmtTime(t0)} から再生）`);
  // カウントダウン: 3, 2, 1 — then the song starts
  const tap = S.tap;
  if (opt.count) {
    const el = $('tapCountNum'); let n = 3; tap.counting = true;
    const step = () => {
      if (S.tap !== tap) { el.hidden = true; return; }
      if (n === 0) { el.hidden = true; tap.counting = false; play(); return; }
      el.hidden = false; el.textContent = String(n--); tap.cd = setTimeout(step, 700);
    };
    step();
  } else play();
}
/* タップ同期の速さ・カウントダウン: remembered in this browser */
function tapOpts() {
  let o = null; try { o = JSON.parse(localStorage.getItem('jizura.tapOpts') || 'null'); } catch (e) {}
  const rate = o && [1, 0.75, 0.5].includes(+o.rate) ? +o.rate : 1;
  return { rate, count: !!(o && o.count) };
}
function saveTapOpts() {
  try { localStorage.setItem('jizura.tapOpts', JSON.stringify({ rate: +$('tapRate').value || 1, count: $('tapCount').checked })); } catch (e) {}
}
function tapNow() {
  if (!S.tap || S.tap.counting) return;         // not during the countdown
  const LT = S.project.timing.lineTimes, i = S.tap.i, t = +S.t.toFixed(3);
  S.tap.done.push({ i, had: LT[i] });
  LT[i] = t;
  // later lines tapped earlier (a previous pass) must not come before this one
  for (const k of Object.keys(LT)) if (+k > i && LT[k] <= t + 0.2) delete LT[k];
  S.tap.i++; S.tap.cl = i; S.tap.ck = 1;
  replan();
  if (S.tap.i >= S.plan.lines.length) stopTap(); else updateTap();
}
/* Tab during tap sync: the next cut of the line just tapped starts now (a line with several cuts) */
function tapCut() {
  if (!S.tap || S.tap.counting || S.tap.cl == null) return;
  const li = S.tap.cl, k = S.tap.ck | 0, ln = S.plan.lines[li];
  const n = S.plan.cuts.filter(c => c.line === li && J.LAYOUTS[c.layout] && !J.LAYOUTS[c.layout].special).length;
  if (!ln || k < 1 || k >= n) { toast('この行にはこれ以上カットがありません'); return; }
  const cur = S.project.overrides[li] || {}, ct = Object.assign({}, cur.cutTime || {});
  S.tap.done.push({ cut: true, li, k, had: ct[k] });
  ct[k] = +Math.max(0, S.t - ln.start).toFixed(3);
  setOv(li, { cutTime: ct });
  S.tap.ck = k + 1;
  replan(); updateTap();
}
function tapBack() {                    // 1つ戻る: undo the last tap and jump back a little
  if (!S.tap || !S.tap.done.length) return;
  const d = S.tap.done.pop(), LT = S.project.timing.lineTimes;
  if (d.cut) {
    const ct = Object.assign({}, (S.project.overrides[d.li] || {}).cutTime || {});
    if (d.had != null) ct[d.k] = d.had; else delete ct[d.k];
    setOv(d.li, { cutTime: Object.keys(ct).length ? ct : undefined });
    S.tap.cl = d.li; S.tap.ck = d.k;
  } else {
    if (d.had != null) LT[d.i] = d.had; else delete LT[d.i];
    S.tap.i = d.i;
    const prev = [...S.tap.done].reverse().find(x => !x.cut);   // cut taps go on after the line tapped before
    S.tap.cl = prev ? prev.i : null; S.tap.ck = 1 + S.tap.done.filter(x => x.cut && prev && x.li === prev.i).length;
  }
  replan(); updateTap();
  seek(Math.max(0, S.t - 3)); if (!S.playing) play();
}
function stopTap() {
  const slow = S.tap && S.tap.rate !== 1;
  if (S.tap && S.tap.cd) clearTimeout(S.tap.cd); $('tapCountNum').hidden = true; S.tap = null;
  if (slow && S.playing) seek(S.t);             // back to normal speed
  $('tapPanel').hidden = true; $('btnTap').setAttribute('aria-pressed', 'false'); replan(); flushSave(); }
function updateTap() {
  const ln = S.plan.lines[S.tap.i];
  $('tapLine').textContent = ln ? `${S.tap.i + 1}. ${ln.interlude ? '〔間奏〕' : ln.text}` : '—';
  const bb = $('tapBack'); if (bb) bb.disabled = !S.tap.done.length;
  $('tapPanel').classList.toggle('compact', S.tap.done.length >= 3);  // 最初の数回が終わったら説明を畳んで、固定しても邪魔にならないように
}

/* ---------------- sync all inputs from project ---------------- */
function syncUI() {
  $('songTitle').value = S.project.title || ''; $('songArtist').value = S.project.artist || '';
  $('lyrics').value = S.project.lyrics;
  $('snap').checked = !!S.project.timing.snap;
  document.querySelectorAll('.wa-toggle').forEach(el => { el.checked = S.project.wa !== false; });
  document.querySelectorAll('.extra-toggle').forEach(el => { el.checked = S.project.extra === true; });
  for (const set of J.SET_ORDER) document.querySelectorAll('.' + set + '-toggle').forEach(el => { el.checked = J.setOn(S.project, set); });
  document.querySelectorAll('.unify-toggle').forEach(el => { el.checked = S.project.unify === true; });
  document.querySelectorAll('.typeset-toggle').forEach(el => { el.checked = S.project.typeset === true; });
  langNote();
  document.querySelectorAll('.themeSel').forEach(el => { el.value = J.THEMES[S.project.themeId] ? S.project.themeId : ''; });
  renderFontRoles(); renderColors(); renderFx(); renderTech(); syncOut(); drawStyleGrid(); renderCustomStyle(); syncFxModeUI();
}

/* ---------------- wiring ---------------- */
function bind() {
  $('lyrics').addEventListener('focus', prepareEdit);
  $('lyrics').addEventListener('input', e => { S.project.lyrics = e.target.value; replanSoon(260); });
  $('lyrics').addEventListener('blur', () => { flushSave(); updateEditBtns(); });
  $('songTitle').addEventListener('focus', prepareEdit);
  $('songTitle').addEventListener('input', e => { S.project.title = e.target.value; replanSoon(300); });
  $('songTitle').addEventListener('blur', () => { flushSave(); updateEditBtns(); });
  $('songArtist').addEventListener('focus', prepareEdit);
  $('songArtist').addEventListener('input', e => { S.project.artist = e.target.value; replanSoon(300); });
  $('songArtist').addEventListener('blur', () => { flushSave(); updateEditBtns(); });
  $('btnSyntax').addEventListener('click', e => { const s = $('syntax'); s.hidden = !s.hidden; e.target.setAttribute('aria-expanded', String(!s.hidden)); });
  $('snap').addEventListener('change', e => { pushEdit(); S.project.timing.snap = e.target.checked; replan(); });
  /* 全画面ドラッグ＆ドロップ（音声ファイルなど） */
  const dropOverlay = $('dropOverlay');
  let dragDepth = 0, dropHideTimer = 0;
  const isFilesDrag = e => {
    const dt = e.dataTransfer;
    if (!dt || !dt.types) return false;
    return Array.from(dt.types).indexOf('Files') !== -1 || (dt.types.contains && dt.types.contains('Files'));
  };
  const setDropActive = active => {
    if (!dropOverlay) return;
    clearTimeout(dropHideTimer);
    if (active) {
      dropOverlay.hidden = false;
      void dropOverlay.offsetWidth;
      dropOverlay.classList.add('active');
    } else {
      dropOverlay.classList.remove('active');
      dropHideTimer = setTimeout(() => {
        if (!dropOverlay.classList.contains('active')) dropOverlay.hidden = true;
      }, 200);
    }
  };

  window.addEventListener('dragenter', e => {
    if (!isFilesDrag(e)) return;
    e.preventDefault();
    dragDepth++;
    setDropActive(true);
  });

  window.addEventListener('dragover', e => {
    if (!isFilesDrag(e)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  });

  window.addEventListener('dragleave', e => {
    if (!isFilesDrag(e)) return;
    e.preventDefault();
    dragDepth--;
    if (dragDepth <= 0 || !e.relatedTarget || (e.clientX <= 0 && e.clientY <= 0)) {
      dragDepth = 0;
      setDropActive(false);
    }
  });

  window.addEventListener('dragend', () => {
    dragDepth = 0;
    setDropActive(false);
  });

  window.addEventListener('drop', e => {
    dragDepth = 0;
    setDropActive(false);
    if (!isFilesDrag(e)) return;
    e.preventDefault();
    const files = e.dataTransfer && e.dataTransfer.files;
    if (!files || !files.length) return;

    const audioExt = /\.(mp3|wav|m4a|aac|ogg|flac|opus|aiff|alac|wma|weba)$/i;
    let audio = null;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if ((f.type && f.type.startsWith('audio/')) || audioExt.test(f.name)) {
        audio = f;
        break;
      }
    }

    if (audio) {
      if ($('audioFile')) $('audioFile').value = '';
      loadAudioFile(audio).then(ok => {
        if (ok) toast('音楽を読み込みました: ' + audio.name);
      });
      return;
    }

    // 他の対応ファイル（プロジェクト、LRC、フォント）のフォールバック
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.name.endsWith('.json')) {
        (async () => {
          try {
            const np = mergeProject(JSON.parse(await f.text()));
            if (S.tap) stopTap();
            pause();
            const prevSnap = edSnap();
            ED.undo = prevSnap ? [prevSnap] : [];
            ED.redo = []; H.list = []; H.i = -1;
            S.project = np;
            syncUI(); replan(); restoreFonts(); commit(); updateEditBtns(); flushSave();
            toast('プロジェクトを読み込みました');
          } catch (err) {
            showMsg('プロジェクトを読み込めませんでした');
            setTimeout(() => showMsg(null), 2500);
          }
        })();
        return;
      }
      if (f.name.endsWith('.lrc')) {
        (async () => {
          if (f.size > 2e6) { toast('LRC ファイルが大きすぎます'); return; }
          let text = '';
          try {
            const buf = await f.arrayBuffer();
            try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); }
            catch (e2) { text = new TextDecoder('shift_jis').decode(buf); }
          } catch (err) { toast('LRC を読み込めませんでした'); return; }
          if (S.project.lyrics.trim() && !window.confirm('今の歌詞を LRC の内容に置き換えます（行ごとの時刻・指定・書き出す範囲も消えます。「元に戻す」で戻せます）。よろしいですか？')) return;
          loadLrc(text);
        })();
        return;
      }
      if (/\.(ttf|otf|woff|woff2)$/i.test(f.name)) {
        (async () => {
          try {
            const uf = await J.loadFontFile(f);
            pushEdit();
            S.project.userFonts = (S.project.userFonts || []).filter(x => x.key !== uf.key).concat([uf]);
            S.project.fonts.display = uf.key; fontKey = ''; renderFontRoles(); replan(); flushSave();
          } catch (err) {
            showMsg('フォントを読み込めませんでした');
            setTimeout(() => showMsg(null), 2500);
          }
        })();
        return;
      }
    }

    toast('音楽ファイル（mp3 / wav / m4a など）をドロップしてください');
  });
  $('btnTap').addEventListener('click', () => (S.tap ? stopTap() : startTap()));
  $('tapBtn').addEventListener('click', tapNow);
  $('tapRate').addEventListener('change', () => {
    saveTapOpts();
    if (!S.tap) return;
    S.tap.rate = +$('tapRate').value || 1;
    if (S.playing) seek(S.t);                 // restart at the new speed from where it is
    $('tapBtn').focus();
  });
  $('tapCount').addEventListener('change', () => { saveTapOpts(); $('tapBtn').focus(); });
  $('tapStop').addEventListener('click', () => { pause(); stopTap(); });
  $('btnPlay').addEventListener('click', () => (S.playing ? pause() : play()));
  const cutPickAuto = $('cutPickAuto'), cutPickClose = $('cutPickClose');
  if (cutPickClose) cutPickClose.addEventListener('click', () => { closeCutPick(); updateCutInfo(); });
  if (cutPickAuto) cutPickAuto.addEventListener('click', () => {
    if (!cutPick.g) return;
    pushEdit(); remember();
    setCutTech(cutPick.line, cutPick.k, cutPick.g, '');
    replan(); commit();
  });
  const cutPickFilter = $('cutPickFilter'), cutPickFilterClear = $('cutPickFilterClear');
  if (cutPickFilter) {
    cutPickFilter.addEventListener('input', () => fillCutPick());
    cutPickFilter.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const firstCard = $('cutPickGrid').querySelector('button.tcard');
        if (firstCard) {
          firstCard.click();
          toast(firstCard.title || '適用しました');
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (cutPickFilter.value) {
          cutPickFilter.value = '';
          fillCutPick();
        } else {
          closeCutPick(); updateCutInfo();
        }
      }
    });
  }
  if (cutPickFilterClear) {
    cutPickFilterClear.addEventListener('click', () => {
      if (cutPickFilter) cutPickFilter.value = '';
      fillCutPick();
      if (cutPickFilter) cutPickFilter.focus();
    });
  }
  const sc = $('scrub');
  sc.addEventListener('input', () => { if (S.fxLoop) pause(); S.scrubbing = true; seek(sc.value / 10000 * S.plan.duration); });
  sc.addEventListener('change', () => { S.scrubbing = false; });
  const tl = $('timeline');
  let drag = false, raf = 0;
  tl.addEventListener('pointerdown', e => {
    tl.setPointerCapture(e.pointerId);
    if (S.tap || S.exporting) return;
    const evHit = fxEventAt(e);
    if (evHit) {
      selectFxEvent(evHit.ev);
      TL.dragEvent = { ev: evHit.ev, edge: evHit.edge, origT: evHit.ev.t, origDur: evHit.ev.dur, startX: e.clientX, changed: false };
      return;
    }
    const h = tlHandleAt(e);
    if (h >= 0) { pushEdit(); TL.drag = h; pause(); tl.style.cursor = 'ew-resize'; return; }
    const r = tl.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    const my = (e.clientY - r.top) * dpr;
    if (my >= 20 * dpr) {
      S.selectedEvent = null;
      hideEventInspector();
      drawTimeline();
    }
    drag = true; timelineSeek(e);
  });
  tl.addEventListener('pointermove', e => {
    if (TL.dragEvent) {
      if (S.exporting || S.tap) return;
      const dragEv = TL.dragEvent, r = tl.getBoundingClientRect(), { vd } = tlView();
      if (!dragEv.changed && Math.abs(e.clientX - dragEv.startX) < 3) return;
      if (!dragEv.changed) { pushEdit(); remember(); dragEv.changed = true; }
      const dt = (e.clientX - dragEv.startX) / r.width * vd;
      if (dragEv.edge === 'right') {
        const end = snapFxTime(dragEv.origT + dragEv.origDur + dt, e.shiftKey, true);
        changeFxEvent({ dur: J.clamp(end - dragEv.origT, 1 / S.plan.fps, S.plan.duration - dragEv.origT) });
      } else {
        const t = Math.min(snapFxTime(dragEv.origT + dt, e.shiftKey), Math.max(0, S.plan.duration - dragEv.origDur));
        changeFxEvent({ t }); seek(t);
      }
      updateEventInspector(S.selectedEvent); drawTimeline(); S.need = true;
      return;
    }
    if (TL.drag >= 0) { const ev = { clientX: e.clientX, clientY: e.clientY, shiftKey: e.shiftKey }; cancelAnimationFrame(raf); raf = requestAnimationFrame(() => tlDragTo(TL.drag, ev)); return; }
    if (drag) { timelineSeek(e); return; }
    const evHit = fxEventAt(e);
    if (evHit) {
      TL.hoverEvent = evHit.ev;
      TL.hover = -1;
      tl.style.cursor = evHit.edge === 'right' ? 'ew-resize' : 'grab';
      drawTimeline();
      return;
    } else if (TL.hoverEvent) {
      TL.hoverEvent = null;
      drawTimeline();
    }
    const hv = tlHandleAt(e); if (hv !== TL.hover) { TL.hover = hv; tl.style.cursor = hv >= 0 ? 'ew-resize' : 'pointer'; drawTimeline(); }
  });
  const endDrag = () => {
    if (TL.dragEvent) {
      const changed = TL.dragEvent.changed; TL.dragEvent = null;
      if (changed) finishFxEdit();
      drawTimeline();
    }
    if (TL.drag >= 0) { TL.drag = -1; flushSave(); renderLines(); drawTimeline(); }
    drag = false;
  };
  tl.addEventListener('pointerup', endDrag); tl.addEventListener('pointercancel', endDrag);
  tl.addEventListener('pointerleave', () => {
    if (TL.dragEvent) return;
    if (TL.hoverEvent) { TL.hoverEvent = null; drawTimeline(); }
    if (TL.hover >= 0 && TL.drag < 0) { TL.hover = -1; drawTimeline(); }
  });
  tl.addEventListener('wheel', e => {
    e.preventDefault();
    const { vd } = tlView();
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) { TL.off += (e.shiftKey ? e.deltaY : e.deltaX) / tl.clientWidth * vd; tlView(); drawTimeline(); }
    else tlZoom(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0025)), tlTime(e));
  }, { passive: false });
  $('tlIn').addEventListener('click', () => tlZoom(1.6));
  $('tlOut').addEventListener('click', () => tlZoom(1 / 1.6));
  $('tlFit').addEventListener('click', () => { TL.z = 1; TL.off = 0; drawTimeline(); });
  $('btnUndoEdit').addEventListener('click', () => edGo(-1));
  const btnRedo = $('btnRedoEdit');
  if (btnRedo) btnRedo.addEventListener('click', () => edGo(1));
  $('tapBack').addEventListener('click', tapBack);
  bindRangeUI();

  $('btnShotMode').addEventListener('click', () => setScreenFxMode(false));
  $('btnScreenFxMode').addEventListener('click', () => setScreenFxMode(true));
  for (const type of J.FXE_ORDER) {
    const option = document.createElement('option'); option.value = type; option.textContent = fxName(type); $('evInspType').appendChild(option);
  }
  $('fxSearch').addEventListener('input', renderFxLibrary);
  $('fxCategory').addEventListener('change', renderFxLibrary);
  $('btnFxCompare').addEventListener('click', () => {
    S.fxCompare = !S.fxCompare; $('app').classList.toggle('fx-compare', S.fxCompare);
    $('btnFxCompare').setAttribute('aria-pressed', String(S.fxCompare)); sizeViewport(); S.need = true;
  });
  $('btnFxBypass').addEventListener('click', () => {
    S.fxBypass = !S.fxBypass; $('btnFxBypass').setAttribute('aria-pressed', String(S.fxBypass));
    $('btnFxBypass').textContent = S.fxBypass ? '动效已旁路 · 点击恢复' : '旁路动效'; S.need = true;
  });
  $('fxSnap').addEventListener('change', e => {
    pushEdit(); S.project.timing.snap = e.target.checked; $('snap').checked = e.target.checked; replan(); flushSave();
  });
  tl.addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('application/x-jizura-fx') && S.screenFxMode) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } });
  tl.addEventListener('drop', e => {
    const type = e.dataTransfer.getData('application/x-jizura-fx');
    if (S.screenFxMode && J.FXE[type]) { e.preventDefault(); addManualTimelineEvent(type, tlTime(e), e.shiftKey); }
  });
  $('btnFxModeToggle').addEventListener('click', toggleFxEventMode);
  $('btnBakeFx').addEventListener('click', bakeAutoEvents);
  $('btnClearFx').addEventListener('click', clearAllEvents);
  $('evTimeInput').addEventListener('change', e => { if (S.selectedEvent && Number.isFinite(e.target.valueAsNumber)) nudgeSelectedEventTime(e.target.valueAsNumber - S.selectedEvent.t); });
  $('evInspType').addEventListener('change', e => {
    if (!S.selectedEvent || S.exporting || S.tap) return;
    pushEdit(); remember(); changeFxEvent({ type: e.target.value, amp: 1, dur: Math.min(fxDefaultDuration(e.target.value), S.plan.duration - S.selectedEvent.t) }); finishFxEdit();
  });
  for (const [id, key] of [['evAmp', 'amp'], ['evDur', 'dur']]) {
    const input = $(id); let editing = false;
    input.addEventListener('input', () => {
      if (!S.selectedEvent || S.exporting || S.tap) return;
      if (!editing) { pushEdit(); remember(); editing = true; }
      const val = key === 'dur' ? J.clamp(+input.value, 1 / S.plan.fps, S.plan.duration - S.selectedEvent.t) : +input.value;
      changeFxEvent({ [key]: val }); updateEventInspector(S.selectedEvent); S.need = true;
    });
    input.addEventListener('change', () => { if (editing) { editing = false; finishFxEdit(); } });
  }
  $('evNudgeBack').addEventListener('click', () => nudgeSelectedEventTime(-1 / S.plan.fps));
  $('evNudgeFwd').addEventListener('click', () => nudgeSelectedEventTime(1 / S.plan.fps));
  $('evDelete').addEventListener('click', deleteSelectedEvent);
  $('evClose').addEventListener('click', () => selectFxEvent(null));
  $('evDisable').addEventListener('click', () => { if (S.selectedEvent && !S.exporting && !S.tap) { pushEdit(); remember(); changeFxEvent({ disabled: !S.selectedEvent.disabled }); finishFxEdit(); } });
  $('evReset').addEventListener('click', () => {
    if (!S.selectedEvent || S.selectedEvent.manual || S.exporting || S.tap) return;
    pushEdit(); remember(); delete S.project.eventOverrides[S.selectedEvent.id]; finishFxEdit();
  });
  $('evDuplicate').addEventListener('click', () => {
    if (!S.selectedEvent || S.exporting || S.tap) return;
    const original = { ...S.selectedEvent }; addManualTimelineEvent(original.type);
    changeFxEvent({ amp: original.amp, dur: Math.min(original.dur, S.plan.duration - S.selectedEvent.t), disabled: !!original.disabled }); finishFxEdit();
  });
  $('evPreview').addEventListener('click', () => {
    if (!S.selectedEvent || S.exporting || S.tap) return;
    if (S.fxLoop) pause();
    else { S.fxLoop = true; seek(activeLoopRange().start); play(); $('evPreview').setAttribute('aria-pressed', 'true'); }
  });


  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    document.querySelectorAll('.tabpane').forEach(p => { p.hidden = p.dataset.pane !== b.dataset.tab; });
    if (b.dataset.tab === 'out') codecNote();
    if (b.dataset.tab === 'tech') kickPreviewLoop();
    loadThumbFonts();
  }));
  $('fxFlash').addEventListener('change', e => { pushEdit(); S.project.fx.flash = e.target.checked; replan(); });
  $('techFilter').addEventListener('input', () => renderTech());
  const setSwitch = (cls, key, on, msgOn, msgOff) => document.querySelectorAll('.' + cls).forEach(el => el.addEventListener('change', e => {
    pushEdit();
    remember();
    S.project[key] = e.target.checked;
    document.querySelectorAll('.' + cls).forEach(x => { x.checked = e.target.checked; });
    renderTech(); drawStyleGrid(); replan(); commit(); flushSave();
    toast(e.target.checked ? msgOn : msgOff);
  }));
  setSwitch('extra-toggle', 'extra', true, '追加分の演出：使う', '追加分の演出：使わない（最初の公開版の演出だけ）');
  setSwitch('wa-toggle', 'wa', true, '和風の演出：使う', '和風の演出：使わない（おまかせ・シャッフルで選ばれません）');
  setSwitch('typo-toggle', 'typo', true, '文字PV系の部品：使う', '文字PV系の部品：使わない（おまかせ・シャッフルで選ばれません）');
  setSwitch('kinetic-toggle', 'kinetic', true, 'キネティックの部品：使う', 'キネティックの部品：使わない（おまかせ・シャッフルで選ばれません）');
  setSwitch('horror-toggle', 'horror', true, 'ホラーの演出：使う（おまかせの雰囲気に「ホラー」が加わります）', 'ホラーの演出：使わない');
  setSwitch('unify-toggle', 'unify', true, '統一感：オン（パートごとにそろえ、キメ・モーフ・太さも使います）', '統一感：オフ');
  setSwitch('typeset-toggle', 'typeset', true, '文字整列：オン（字間・助詞・英字・0.2秒先・効果控えめ）', '文字整列：オフ');
  $('fxKoma').addEventListener('change', e => { pushEdit(); const k = +e.target.value; S.project.fx.koma = k; S.project.fx.onTwos = k > 0; S.project.mood = null; replan(); });
  $('fxHud').addEventListener('change', e => { pushEdit(); S.project.fx.hud = e.target.value; replan(); });
  $('fxHideNo').addEventListener('change', e => { pushEdit(); remember(); S.project.fx.hideNo = e.target.checked; replan(); commit(); });
  $('fxHideTime').addEventListener('change', e => { pushEdit(); remember(); S.project.fx.hideTime = e.target.checked; replan(); commit(); });
  $('seed').addEventListener('change', e => { pushEdit(); clearSavedCuts(); S.project.seed = parseInt(e.target.value, 10) || 0; replan(); });
  $('btnSeed').addEventListener('click', () => { pushEdit(); remember(); clearSavedCuts(); S.project.seed = (Math.random() * 1e9) | 0; $('seed').value = S.project.seed; replan(); commit(); });
  const colorToggle = (flag, keys) => e => {
    pushEdit();
    remember();
    const c = S.project.colors; c[flag] = e.target.checked;
    if (c[flag]) { const sc0 = J.STYLES[S.project.style].schemes[0]; keys.forEach(([k]) => { if (!c[k]) c[k] = sc0[k]; }); }
    renderColors(); replan(); commit();
  };
  $('colorOn').addEventListener('change', colorToggle('enabled', BASE_KEYS));
  $('accentOn').addEventListener('change', colorToggle('accentOn', ACCENT_KEYS));
  $('btnRandPalette').addEventListener('click', randomPalette);
  $('btnAddFont').addEventListener('click', () => {
    const name = $('localFont').value.trim(); if (!name) return;
    pushEdit();
    const key = 'local_' + name.replace(/\s+/g, '_');
    const weight = /bold|太|black|heavy|w[6-9]|[6-9]00/i.test(name) ? 700 : 400;
    J.addUserFont(key, name + '（PC）', name, weight);
    S.project.userFonts = (S.project.userFonts || []).filter(u => u.key !== key).concat([{ key, label: name + '（PC）', family: name, weight }]);
    S.project.fonts.display = key; $('localFont').value = '';
    fontKey = ''; renderFontRoles(); replan();
  });
  $('fontFile').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    try {
      const uf = await J.loadFontFile(f);
      pushEdit();
      S.project.userFonts = (S.project.userFonts || []).filter(x => x.key !== uf.key).concat([uf]);
      S.project.fonts.display = uf.key; fontKey = ''; renderFontRoles(); replan(); flushSave();
    }
    catch (err) { showMsg('フォントを読み込めませんでした'); setTimeout(() => showMsg(null), 2500); }
  });
  ['outAspect', 'eAspect'].forEach(id => $(id).addEventListener('change', e => { pushEdit(); S.project.aspect = e.target.value; syncOut(); replan(); codecNote(); }));
  ['outRes', 'eRes'].forEach(id => $(id).addEventListener('change', e => { pushEdit(); S.project.res = +e.target.value; syncOut(); autosave(); codecNote(); }));
  ['outFps', 'eFps'].forEach(id => $(id).addEventListener('change', e => { pushEdit(); S.project.fps = +e.target.value; syncOut(); replan(); codecNote(); }));
  $('outQuality').addEventListener('change', e => { pushEdit(); S.project.quality = e.target.value; autosave(); });
  ['outKey', 'eKey'].forEach(id => $(id).addEventListener('change', e => {
    pushEdit();
    S.project.keyBg = e.target.value; syncOut(); replan(); flushSave();
    const k = J.keyMode(S.project);
    toast(k ? `背景：${k === 'green' ? 'グリーンバック' : 'ブラックバック'}（白い文字と演出だけ）` : '背景：通常（スタイルの配色）');
  }));
  $('outAudio').addEventListener('change', e => { pushEdit(); S.project.includeAudio = e.target.checked; autosave(); });
  document.querySelectorAll('.centerDirSel').forEach(el => el.addEventListener('change', e => {
    pushEdit();
    S.project.centerDir = e.target.value; syncOut(); replan(); flushSave();
    toast(e.target.value === 'lr' ? '縦長の画面：左右に分けます' : '縦長の画面：上下に分けます');
  }));
  ['outCenter', 'eCenter'].forEach(id => $(id).addEventListener('change', e => {
    pushEdit();
    S.project.centerFree = e.target.checked; syncOut(); replan(); flushSave();
    const tall = S.plan.H > S.plan.W * 1.1 && S.project.centerDir !== 'lr';
    toast(e.target.checked ? `中央を空けました：文字と演出を${tall ? '上下' : '左右'}に置きます` : '中央を空けるのをやめました');
  }));
  $('btnMP4').addEventListener('click', () => runExport('mp4'));
  ['btnMP4File', 'eMP4File'].forEach(id => $(id).addEventListener('click', () => runExport('mp4file')));
  $('btnPNG').addEventListener('click', () => runExport('png'));
  $('btnPNGA').addEventListener('click', () => runExport('pnga'));
  $('btnPNGL').addEventListener('click', () => runExport('pngl'));
  $('ePNG').addEventListener('click', () => runExport('png'));
  $('ePNGA').addEventListener('click', () => runExport('pnga'));
  $('ePNGL').addEventListener('click', () => runExport('pngl'));
  document.querySelectorAll('.exp-cancel').forEach(b => b.addEventListener('click', () => { if (S.exporting) S.exporting.abort(); }));
  $('eMP4').addEventListener('click', () => runExport('mp4'));
  // かんたんモード
  $('modeEasy').addEventListener('click', () => setMode('easy'));
  $('modeMobile').addEventListener('click', () => setMode('mobile'));
  $('btnOmakaseTop').addEventListener('click', omakase);
  $('btnMenu').addEventListener('click', () => { const on = !$('app').classList.contains('menu-open'); $('app').classList.toggle('menu-open', on); $('btnMenu').setAttribute('aria-expanded', String(on)); mobileBar(); });
  document.querySelectorAll('.sec > .sec-h h2').forEach(h => h.addEventListener('click', () => { if (S.mode === 'mobile') h.closest('.sec').classList.toggle('fold'); }));
  if (window.ResizeObserver) new ResizeObserver(mobileBar).observe(document.querySelector('.bar'));
  $('modePro').addEventListener('click', () => setMode('pro'));
  $('btnOmakase').addEventListener('click', omakase);
  $('btnOmakaseBig').addEventListener('click', omakase);
  ['btnPrev', 'btnPrev2'].forEach(id => { const b = $(id); if (b) b.addEventListener('click', () => histGo(-1)); });
  ['btnNext', 'btnNext2'].forEach(id => { const b = $(id); if (b) b.addEventListener('click', () => histGo(1)); });
  $('eStyle').addEventListener('click', () => rerollPart('style'));
  $('eMood').addEventListener('click', () => rerollPart('mood'));
  $('eCut').addEventListener('click', () => rerollPart('cut'));
  $('ePalette').addEventListener('click', () => { randomPalette(); restartPreview(); });
  // 利用について（出力物の権利・ライセンス）
  const dlg = $('termsDlg');
  const openTerms = () => { if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', ''); };
  document.querySelectorAll('.terms-open').forEach(b => b.addEventListener('click', openTerms));
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close ? dlg.close() : dlg.removeAttribute('open'); });   // click on the backdrop
  $('btnSave').addEventListener('click', () => J.saveFile(baseName() + '.jizura.json', JSON.stringify(Object.assign({}, S.project, { appVersion: '@VERSION@' }), null, 1)));
  $('btnAE').addEventListener('click', () => J.saveFile(baseName() + rangeSuffix() + '_ae.json', JSON.stringify(J.planForAE(S.plan, S.project, exportRange()), null, 1)));
  audioNameDefault = $('audioName')?.textContent || '';
  document.querySelectorAll('.themeSel').forEach(el => el.addEventListener('change', () => {
    pushEdit();
    S.project.themeId = J.THEMES[el.value] ? el.value : null;
    document.querySelectorAll('.themeSel').forEach(x => { x.value = el.value; });
    flushSave();
  }));
  ['btnLRC', 'eLRC'].forEach(id => $(id).addEventListener('click', saveLrc));
  $('btnReset').addEventListener('click', () => {
    const dlg = $('resetDlg');
    if (!dlg || typeof dlg.showModal !== 'function') { if (window.confirm('歌詞・曲・設定・履歴をすべて消して、最初の状態に戻します。元に戻すことはできません。')) resetAll(); return; }
    dlg.returnValue = ''; dlg.showModal();
  });
  $('resetDlg').addEventListener('close', () => { if ($('resetDlg').returnValue === 'reset') resetAll(); });
  $('fileProject').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    try {
      const np = mergeProject(JSON.parse(await f.text()));
      if (S.tap) stopTap();
      pause();
      const prevSnap = edSnap();
      ED.undo = prevSnap ? [prevSnap] : [];
      ED.redo = []; H.list = []; H.i = -1;
      S.project = np;
      syncUI(); replan(); restoreFonts(); commit(); updateEditBtns(); flushSave();
    }
    catch (err) { showMsg('プロジェクトを読み込めませんでした'); setTimeout(() => showMsg(null), 2500); }
    e.target.value = '';
  });
  document.addEventListener('keydown', e => {
    const tag = (e.target && e.target.tagName) || '';
    const typing = /INPUT|TEXTAREA/.test(tag) && (e.target.type === 'text' || tag === 'TEXTAREA');
    if (S.tap && (e.code === 'Space' || e.code === 'Enter') && !typing) { e.preventDefault(); tapNow(); return; }
    if (S.tap && e.code === 'Escape') { pause(); stopTap(); return; }
    if (S.tap && e.code === 'Backspace' && !typing) { e.preventDefault(); tapBack(); return; }
    if (S.tap && e.code === 'Tab' && !typing) { e.preventDefault(); tapCut(); return; }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !typing && !S.tap) { e.preventDefault(); edGo(e.shiftKey ? 1 : -1); return; }
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY' && !typing && !S.tap) { e.preventDefault(); edGo(1); return; }
    if (e.code === 'Escape' && $('cutPick') && !$('cutPick').hidden) { e.preventDefault(); closeCutPick(); updateCutInfo(); return; }
    if (e.code === 'Escape') {
      const drop = $('fxDropdownMenu');
      if (drop && !drop.hidden) { e.preventDefault(); drop.hidden = true; return; }
      if (S.selectedEvent) { e.preventDefault(); S.selectedEvent = null; hideEventInspector(); drawTimeline(); return; }
      const sm = $('cutSyncMenu'); if (sm && !sm.hidden) { e.preventDefault(); sm.hidden = true; return; }
    }
    if (typing || $('termsDlg').open || $('resetDlg').open) return;
    if ((e.code === 'Delete' || e.code === 'Backspace') && S.selectedEvent && !S.tap) {
      e.preventDefault();
      deleteSelectedEvent();
      return;
    }
    if (e.code === 'Space') { e.preventDefault(); S.playing ? pause() : play(); }
    else if (e.code === 'ArrowRight') seek(S.t + (e.shiftKey ? 1 : 1 / S.plan.fps));
    else if (e.code === 'ArrowLeft') seek(S.t - (e.shiftKey ? 1 : 1 / S.plan.fps));
    else if (e.code === 'KeyR' && !e.metaKey && !e.ctrlKey && !e.altKey && !S.exporting) { e.preventDefault(); omakase(); }
    else if (e.altKey && e.code === 'KeyC') { e.preventDefault(); copyCurrentCutStyle(); }
    else if (e.altKey && e.code === 'KeyV') { e.preventDefault(); pasteCutStyleToCurrent(false); }
    else if ((e.code === 'BracketLeft' || e.code === 'BracketRight') && !e.ctrlKey && !e.metaKey && !typing && !S.tap) {
      e.preventDefault();
      const step = S.selectedEvent ? (e.shiftKey ? 10 : 1) / S.plan.fps : e.shiftKey ? 0.1 : 0.05;
      if (S.selectedEvent) {
        nudgeSelectedEventTime(e.code === 'BracketRight' ? step : -step);
      } else {
        nudgeCurrentCutTime(e.code === 'BracketRight' ? step : -step);
      }
    }
  });
  window.addEventListener('click', () => { const sm = $('cutSyncMenu'); if (sm) sm.hidden = true; });
  window.addEventListener('resize', () => { sizeViewport(); drawTimeline(); });
  if (window.ResizeObserver) new ResizeObserver(() => { sizeViewport(); drawTimeline(); }).observe($('viewport'));
  bindFollow();
  bindCustomStyleEvents();
}

/* song file -> beat analysis (file input, or a host such as the After Effects panel) */
let audioSeq = 0;
async function loadAudioFile(f, restored) {
  const my = ++audioSeq;                      // only the latest choice may win (an earlier, slower analysis is dropped)
  if ($('audioName')) $('audioName').textContent = '解析中…';
  try {
    pause();
    const a = await J.analyzeAudio(f);
    if (my !== audioSeq) return false;
    S.audio = a;
    if ($('audioName')) $('audioName').textContent = `${f.name}（${J.fmtTime(S.audio.duration)}・約${S.audio.bpm}BPM）` + (restored ? '・前回の曲' : '');
    S.project.audioName = f.name;
    if (!restored && J.saveSong) J.saveSong(f);             // kept in this browser: a reload does not drop the song from exports
    S.project.timing.snap = true;
    syncUI(); replan();
    return true;
  } catch (err) { if (my !== audioSeq) return false; if ($('audioName')) $('audioName').textContent = '読み込めませんでした: ' + err.message; S.audio = null; return false; }
}

/* ---------------- かんたんモードの案内ツアー ---------------- */
const TOUR = [
  { t: () => $('lyrics'), title: '1. 歌詞を入れる', text: '1行が1フレーズになります。空行で少し間が空き、[間奏 8] と書くと8秒の間奏（背景と装飾だけ）になります。' },
  { t: () => $('btnTap'), title: '2. 曲を読み込む', text: 'mp3 などを読み込むと拍を検出して、カットの切り替わりを合わせます。曲がなくても作れます。「タップで同期」で行の頭を合わせることもできます。' },
  { t: () => $('btnOmakaseBig'), title: '3. おまかせで作る', text: 'スタイル・雰囲気・動き・配色・構成をまるごと決めます。押すたびに別の案になり、「◀ 前の案」で戻れます。' },
  { t: () => $('btnPlay'), title: '4. 再生して確認する', text: '再生して見てみましょう。下のタイムラインでは、行の区切りをドラッグして動かせます（＋−で拡大）。' },
  { t: () => $('lineList'), title: '5. 気になる行だけ直す', text: '行ごとに、歌詞をダブルクリックして直す、この行からタップし直す（◎）、この行だけ作り直す（サイコロ）ができます。' },
  { t: () => $('eMP4').closest('.easy-sec') || $('eMP4'), title: '6. 書き出す', text: '画面比（縦長 9:16 など）と解像度を選んで MP4 を書き出します。「書き出す範囲」で選んだ行だけを書き出すこともできます。' },
];
const TR = { i: -1 };
function tourShow(i) {
  const el = $('tour'), n = TOUR.length;
  if (i < 0 || i >= n) return tourEnd();
  TR.i = i;
  const st = TOUR[i], tg = st.t();
  el.hidden = false;
  el.querySelector('.tour-step').textContent = `${i + 1} / ${n}`;
  el.querySelector('.tour-title').textContent = st.title;
  el.querySelector('.tour-text').textContent = st.text;
  el.querySelector('.tour-prev').disabled = i === 0;
  el.querySelector('.tour-next').textContent = i === n - 1 ? 'はじめる' : '次へ';
  if (tg && tg.scrollIntoView) tg.scrollIntoView({ block: 'center', behavior: 'auto' });
  requestAnimationFrame(() => tourPlace(tg));
  el.querySelector('.tour-next').focus();
}
function tourPlace(tg) {
  const el = $('tour'), spot = el.querySelector('.tour-spot'), bub = el.querySelector('.tour-bub');
  const vw = window.innerWidth, vh = window.innerHeight, pad = 6;
  const r = tg ? tg.getBoundingClientRect() : { left: vw / 2, top: vh / 2, width: 0, height: 0, right: vw / 2, bottom: vh / 2 };
  const x0 = Math.max(4, r.left - pad), y0 = Math.max(4, r.top - pad), x1 = Math.min(vw - 4, r.right + pad), y1 = Math.min(vh - 4, r.bottom + pad);
  Object.assign(spot.style, { left: x0 + 'px', top: y0 + 'px', width: Math.max(0, x1 - x0) + 'px', height: Math.max(0, y1 - y0) + 'px' });
  const bw = bub.offsetWidth, bh = bub.offsetHeight, gap = 12;
  let top = y1 + gap <= vh - bh - 8 ? y1 + gap : y0 - gap - bh >= 8 ? y0 - gap - bh : Math.max(8, vh - bh - 8);
  let left = J.clamp(x0 + (x1 - x0) / 2 - bw / 2, 8, vw - bw - 8);
  Object.assign(bub.style, { top: top + 'px', left: left + 'px' });
}
function tourStart() {
  if (S.exporting || S.tap) return;
  if (S.mode !== 'easy') setMode('easy');
  pause(); tourShow(0);
}
function tourEnd() {
  $('tour').hidden = true; TR.i = -1;
  try { localStorage.setItem('jizura.tourDone', '1'); } catch (e) {}
}
function bindTour() {
  const el = $('tour');
  el.querySelector('.tour-next').addEventListener('click', () => tourShow(TR.i + 1));
  el.querySelector('.tour-prev').addEventListener('click', () => tourShow(TR.i - 1));
  el.querySelector('.tour-skip').addEventListener('click', tourEnd);
  $('btnTour').addEventListener('click', tourStart);
  document.addEventListener('keydown', e => {
    if (TR.i < 0) return;
    if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); tourShow(TR.i + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); tourShow(TR.i - 1); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); tourEnd(); }
    else if (e.key !== 'Tab') { e.stopImmediatePropagation(); }
  }, true);
  window.addEventListener('resize', () => { if (TR.i >= 0) tourPlace(TOUR[TR.i].t()); });
  window.addEventListener('scroll', () => { if (TR.i >= 0) tourPlace(TOUR[TR.i].t()); }, true);
}

/* 检查并恢复工程资源（音频与用户字体），若有缺失则提示具体文件名 */
async function checkAndRestoreAssets() {
  const missingAudios = [];
  const missingFonts = [];

  // 1. 字体检测与恢复
  const fontList = S.project.userFonts || [];
  if (fontList.length) {
    try {
      const missing = await J.restoreUserFonts(fontList);
      fontKey = ''; renderFontRoles(); replan();
      if (missing && missing.length) missingFonts.push(...missing);
    } catch (e) {}
  }

  // 2. 音频检测与恢复
  const wantAudio = S.project.audioName;
  if (wantAudio) {
    let matched = S.audio && S.audio.name === wantAudio;
    if (!matched && J.loadSong) {
      try {
        const f = await J.loadSong();
        if (f && f.name === wantAudio) {
          await loadAudioFile(f, true);
          matched = true;
        }
      } catch (e) {}
    }
    if (!matched) {
      pause();
      S.audio = null;
      missingAudios.push(wantAudio);
      if ($('audioName')) {
        const l = (document.documentElement.lang || '').toLowerCase();
        const hint = l.startsWith('zh-hant') ? `⚠️ 缺失音訊檔案：${wantAudio}（請點選下方「載入音訊」重新選取）`
          : l.startsWith('zh') ? `⚠️ 缺失音频文件：${wantAudio}（请点击下方“载入音频”重新选择）`
          : l.startsWith('en') ? `⚠️ Missing audio: ${wantAudio} (click below to load)`
          : `⚠️ 未読み込みの楽曲: ${wantAudio}（下のボタンから再読み込みしてください）`;
        $('audioName').innerHTML = `<span style="color:#f5a50c;font-weight:600;">${escapeHtml(hint)}</span>`;
      }
    }
  } else {
    if (S.audio) {
      pause();
      S.audio = null;
    }
    if ($('audioName')) $('audioName').textContent = audioNameDefault;
  }

  // 3. 若有缺失，弹出醒目的气泡通知（停留6秒），列出具体缺失的文件名
  if (missingAudios.length || missingFonts.length) {
    const l = (document.documentElement.lang || '').toLowerCase();
    const isZhHant = l.startsWith('zh-hant') || l.startsWith('zh-tw') || l.startsWith('zh-hk');
    const isZh = l.startsWith('zh');
    const isEn = l.startsWith('en');

    const parts = [];
    if (missingAudios.length) {
      const tag = isZhHant ? '音訊' : isZh ? '音频' : isEn ? 'Audio' : '楽曲';
      parts.push(`【${tag}】${missingAudios.join('、')}`);
    }
    if (missingFonts.length) {
      const tag = isZhHant ? '字型' : isZh ? '字体' : isEn ? 'Font' : 'フォント';
      parts.push(`【${tag}】${missingFonts.join('、')}`);
    }
    const listStr = parts.join(isEn ? '; ' : '、');

    let msg = '';
    if (isZhHant) {
      msg = `⚠️ 專案缺少檔案：${listStr}，請重新選取對應檔案載入`;
    } else if (isZh) {
      msg = `⚠️ 项目缺失文件：${listStr}，请重新选择对应文件载入`;
    } else if (isEn) {
      msg = `⚠️ Project missing file(s): ${listStr}, please reselect to load`;
    } else {
      msg = `⚠️ 必要なファイルが見つかりません：${listStr}（ファイルを再読み込みしてください）`;
    }

    toast(msg, null, 6000);
  }
}

async function restoreFonts() {
  return checkAndRestoreAssets();
}

/* ---------------- boot ---------------- */
function boot() {
  S.project = loadLocal();
  ED.undo = loadUndoHistory();
  ED.redo = [];
  bind(); initVolume(); syncUI(); syncLoopBtn(); replan();
  checkAndRestoreAssets();
  updateEditBtns();
  // first visit on a phone: スマホ mode
  let mode = window.matchMedia && window.matchMedia('(max-width: 760px)').matches ? 'mobile' : 'easy';
  try { mode = localStorage.getItem('jizura.mode') || mode; } catch (e) {}
  setMode(mode); commit();
  bindTour();
  let seen = false; try { seen = localStorage.getItem('jizura.tourDone') === '1'; } catch (e) {}
  if (!seen && S.mode === 'easy' && !window.__adobe_cep__) setTimeout(tourStart, 600);   // first visit: show the tour once
  // open on a representative frame (end of the first cut's entrance)
  const c0 = S.plan.cuts.find(c => c.line >= 0);
  if (c0) seek(c0.start + Math.min(c0.dur * 0.6, c0.inDur + 0.25));
  requestAnimationFrame(tick);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
J.ui = S;
// hooks for hosts that embed the app (the After Effects CEP panel)
J.uiApi = { toast, replan, syncUI, pause, seek, flushSave, loadAudioFile, restartPreview, exportRange, exportRangeLines, edGo, pushEdit, copyCurrentCutStyle, pasteCutStyleToCurrent, applyCutStyleToLine, applyCutStyleToAll, applyCutStyleToRange, clearCurrentCutTech, rollCutSlot, nudgeCurrentCutTime, addManualTimelineEvent, deleteSelectedEvent, nudgeSelectedEventTime, bakeAutoEvents, clearAllEvents, toggleFxEventMode };
})();
