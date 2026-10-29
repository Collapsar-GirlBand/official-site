const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { engine } = require('./engine_fixture.cjs');
const source = fs.readFileSync('src/12_ui.js', 'utf8');
const slice = (from, to) => source.slice(source.indexOf(from), source.indexOf(to, source.indexOf(from)));
const plain = value => JSON.parse(JSON.stringify(value));
function fixture() {
  const box = engine(), nodes = new Map();
  const el = id => {
    if (!nodes.has(id)) nodes.set(id, { id, width: 640, value: '', hidden: false, attrs: {}, classes: {},
      getContext() { return { id }; }, setAttribute(k, v) { this.attrs[k] = v; },
      appendChild() {}, classList: { toggle(k, v) { el(id).classes[k] = v; } } });
    return nodes.get(id);
  };
  const project = box.J.defaultProject(), plan = box.J.plan(project, null), frames = [];
  Object.assign(box, { S: { project, plan, t: 1, playing: false, renderer: { frame(...args) { frames.push(args); } } },
    $: el, performance: { now: () => 1 }, replanTimer: 0,
    updateTimeUI() {}, drawTimeline() {}, updateCutInfo() {}, closeCutPick() {}, renderFxLibrary() {}, sizeViewport() {},
    renderScreenFxEvents() {}, drawCenterGuide() {}, syncFxModeUI() {}, seek(t) { box.S.t = t; },
    pause() { box.S.playing = false; box.S.fxLoop = false; },
  });
  box.document.querySelector = () => el('pane');
  vm.runInContext(slice('function updateEventInspector(', 'function bakeAutoEvents(')
    + slice('function setScreenFxMode(', 'let screenFxListSignature')
    + slice('function draw() {', 'function tick('), box);
  box.renderFxLibrary = () => {};
  return { box, el, frames };
}
test('one automatic override preserves other events, mode, cut composition and stable IDs', () => {
  const { J } = engine(), project = J.defaultProject(), baseline = J.plan(project, null);
  assert.ok(baseline.events.length > 1);
  assert.equal(new Set(baseline.events.map(e => e.id)).size, baseline.events.length);
  assert.deepEqual(plain(J.plan(project, null).events), plain(baseline.events));
  const target = baseline.events[0];
  project.eventOverrides[target.id] = { t: target.t + 0.02, amp: 0.25, dur: 0.4 };
  const edited = J.plan(project, null);
  assert.equal(project.eventMode, 'auto'); assert.equal(project.events.length, 0);
  assert.equal(edited.events.find(e => e.id === target.id).amp, 0.25);
  assert.deepEqual(plain(edited.events.filter(e => e.id !== target.id)), plain(baseline.events.filter(e => e.id !== target.id)));
  assert.deepEqual(plain(edited.cuts), plain(baseline.cuts));
});
test('automatic delete survives project round-trip; restore recovers the original', () => {
  const { J } = engine(), project = J.defaultProject(), baseline = J.plan(project, null), target = baseline.events[0];
  project.eventOverrides[target.id] = { deleted: true };
  const saved = plain(project);
  assert.ok(!J.plan(saved, null).events.some(e => e.id === target.id));
  delete saved.eventOverrides[target.id]; assert.deepEqual(plain(J.plan(saved, null).events), plain(baseline.events));
});
test('baking keeps local edits and disabled status without duplicating events', () => {
  const { J } = engine(), project = J.defaultProject(), first = J.plan(project, null);
  project.eventOverrides[first.events[0].id] = { amp: 0.3, disabled: true };
  const edited = J.plan(project, null); J.bakeEvents(project, edited);
  const baked = J.plan(project, null);
  assert.equal(project.eventMode, 'manual'); assert.equal(Object.keys(project.eventOverrides).length, 0);
  assert.equal(baked.events.length, edited.events.length); assert.ok(baked.events.some(e => e.disabled && e.amp === 0.3));
  assert.ok(baked.events.every(e => !e.id.startsWith('auto:')));
  J.clearEvents(project); assert.equal(J.plan(project, null).events.length, 0);
});
test('selection never mutates the project; editing creates only one local patch', () => {
  const { box } = fixture(), before = JSON.stringify(box.S.project), event = box.S.plan.events[0];
  box.selectFxEvent(event); assert.equal(JSON.stringify(box.S.project), before);
  box.changeFxEvent({ amp: 0.4 }); assert.equal(box.S.project.eventMode, 'auto'); assert.equal(box.S.project.events.length, 0);
  assert.equal(Object.keys(box.S.project.eventOverrides).length, 1); assert.equal(box.S.project.eventOverrides[event.id].amp, 0.4);
});
test('single preview by default; optional comparison shares clock; bypass never alters project', () => {
  const { box, el, frames } = fixture(), before = JSON.stringify(box.S.project);
  box.setScreenFxMode(true); box.draw(); assert.equal(frames.length, 1);
  box.S.fxCompare = true; frames.length = 0; box.draw();
  assert.equal(frames.length, 2); assert.equal(frames[0][1], frames[1][1]); assert.equal(frames[0][2], frames[1][2]);
  assert.equal(frames[1][3].noEvents, true);
  box.S.fxBypass = true; frames.length = 0; box.draw(); assert.equal(frames[0][3].noEvents, true);
  box.setScreenFxMode(false); frames.length = 0; box.draw(); assert.equal(frames.length, 1);
  assert.equal(frames[0][3].noEvents, false); assert.equal(JSON.stringify(box.S.project), before);
  box.S.exporting = true; box.setScreenFxMode(true); assert.equal(box.S.screenFxMode, false);
  assert.equal(el('app').classes['screen-fx-mode'], false);
});
test('snapping obeys the checkbox and temporary free modifier; times stay bounded', () => {
  const { box } = fixture(); box.S.plan.beats = [1, 2];
  assert.equal(box.snapFxTime(1.06, false), 1); assert.equal(box.snapFxTime(1.06, true), 1.06);
  box.S.plan.beats = [1, 1.08]; assert.equal(box.snapFxTime(1.06, false), 1.08);
  box.S.project.timing.snap = false; assert.equal(box.snapFxTime(1.06, false), 1.06);
  assert.equal(box.snapFxTime(-5, true), 0); assert.ok(box.snapFxTime(999, true) < box.S.plan.duration);
  assert.ok(Math.abs(box.snapFxTime(999, true, true) - box.S.plan.duration) < 1e-6);
});
test('old projects and overrides round-trip through the real loader', () => {
  const { box } = fixture(); vm.runInContext(slice('function mergeProject(', 'const SET_UI'), box);
  const p = box.J.defaultProject();
  p.eventOverrides['auto:1:2:shake:0'] = { amp: 0.5, disabled: true, deleted: false };
  p.events = [{ id: 'manual', t: 1, type: 'shake', dur: 0.3, amp: 0, disabled: true }];
  const loaded = box.mergeProject(plain(p));
  assert.equal(loaded.events[0].disabled, true); assert.equal(loaded.events[0].amp, 0);
  assert.equal(loaded.eventOverrides['auto:1:2:shake:0'].amp, 0.5);
  assert.equal(Object.keys(box.mergeProject({ lyrics: 'hello' }).eventOverrides).length, 0);
});

test('overlapping events occupy separately selectable lanes and expose resize handles', () => {
  const { box, el } = fixture();
  box.S.screenFxMode = true;
  box.S.plan.events = [{ id: 'a', t: 1, dur: 0.5 }, { id: 'b', t: 1, dur: 0.5 }];
  box.tlView = () => ({ vd: 10, off: 0 });
  el('timeline').getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000 });
  const rects = box.fxTimelineRects(1000);
  assert.notEqual(rects[0].y, rects[1].y);
  assert.equal(box.fxEventAt({ clientX: 110, clientY: rects[0].y + 10 }).ev.id, 'a');
  const hit = box.fxEventAt({ clientX: 149, clientY: rects[1].y + 10 });
  assert.equal(hit.ev.id, 'b'); assert.equal(hit.edge, 'right');
});

test('local event edits undo and redo through actual editor history', () => {
  const { box } = fixture();
  Object.assign(box, { fontKey: '', LS_HIST_KEY: 'test', PERSIST_UNDO_MAX: 10,
    syncUI() {}, updateHist() {}, updateEditBtns() {}, autosave() {}, flushSave() {}, toast() {},
    replan() { box.S.plan = box.J.plan(box.S.project, null); } });
  vm.runInContext(slice('function mergeProject(', 'const SET_UI') + slice('const ED =', '// LRC を読み込む:'), box);
  box.S.project = box.mergeProject(plain(box.S.project)); box.replan();
  const before = plain(box.S.project), event = box.S.plan.events[0];
  box.selectFxEvent(event); box.pushEdit(); box.changeFxEvent({ amp: 0.2, t: event.t + 0.1 });
  const after = plain(box.mergeProject(plain(box.S.project)));
  box.edGo(-1); assert.deepEqual(plain(box.S.project), before); assert.equal(box.S.selectedEvent, null);
  box.edGo(1); assert.deepEqual(plain(box.S.project), after); assert.equal(box.S.project.eventMode, 'auto');
});

test('selected-event loop uses a bounded padded range independent of the general loop mode', () => {
  const { box } = fixture();
  vm.runInContext(slice('function activeLoopRange(', 'function syncLoopBtn('), box);
  box.S.fxLoop = true; box.S.selectedEvent = { t: 0.1, dur: 0.2 };
  assert.equal(box.activeLoopRange().start, 0); assert.ok(Math.abs(box.activeLoopRange().end - 0.7) < 1e-9);
  box.S.selectedEvent = { t: box.S.plan.duration - 0.1, dur: 0.1 };
  assert.equal(box.activeLoopRange().end, box.S.plan.duration);
});
