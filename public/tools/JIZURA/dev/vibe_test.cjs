const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { engine } = require('./engine_fixture.cjs');
const ui = fs.readFileSync('src/12_ui.js', 'utf8');
const slice = (a, b) => ui.slice(ui.indexOf(a), ui.indexOf(b, ui.indexOf(a)));
const noop = () => {};

test('style tabs only browse, keep their selection across categories, and generation changes are separate', () => {
  const box = engine(), nodes = new Map();
  class Element {
    constructor() { this.children = []; this.events = {}; this.attrs = {}; this.parentElement = { hidden: false }; }
    set innerHTML(_) { this.children = []; this.queries = {}; }
    querySelector(q) { this.queries ||= {}; return this.queries[q] ||= new Element(); }
    appendChild(el) { this.children.push(el); }
    setAttribute(k, v) { this.attrs[k] = v; }
    addEventListener(k, fn) { this.events[k] = fn; }
  }
  const el = id => { if (!nodes.has(id)) nodes.set(id, new Element()); return nodes.get(id); };
  let saves = 0;
  Object.assign(box, { $: el, S: { project: box.J.defaultProject() },
    pushEdit: noop, remember: noop, replan: noop, commit: noop, flushSave() { saves++; } });
  box.document.createElement = () => new Element();
  vm.runInContext("let shotVibe = 'all', shotVibeSubset = 'all', shotVibeManage = false, shotVibeRole = 'companion'; const cutPick = { g: 'layout', k: 0 };\n"
    + slice('function renderShotVibes(', 'function editShotVibePart('), box);
  box.fillCutPick = box.renderShotVibes;
  box.renderShotVibes();
  const before = JSON.stringify(box.S.project);
  const tabs = el('shotVibeControls').querySelector('.shot-vibe-tabs');
  tabs.children.find(b => b.textContent === '星宿叹').events.click();
  assert.equal(JSON.stringify(box.S.project), before); assert.equal(saves, 0);
  vm.runInContext("cutPick.g = 'decor'", box); box.renderShotVibes();
  assert.equal(el('shotVibeControls').querySelector('.shot-vibe-tabs').children.find(b => b.textContent === '星宿叹').attrs['aria-selected'], 'true');
  const collapsarTab = el('shotVibeControls').querySelector('.shot-vibe-tabs').children.find(b => b.textContent === '坍缩星');
  assert.ok(collapsarTab, '坍缩星 tab should exist');
  collapsarTab.events.click();
  assert.equal(el('shotVibeControls').querySelector('.shot-vibe-tabs').children.find(b => b.textContent === '坍缩星').attrs['aria-selected'], 'true');
  box.S.project.vibeGeneration.hideOriginal = true;
  el('shotVibeGeneration').value = 'collapsar'; el('shotVibeGeneral').checked = true;
  el('shotVibeGeneration').events.change();
  assert.equal(box.S.project.vibeGeneration.id, 'collapsar');
  assert.equal(box.S.project.vibeGeneration.includeGeneral, true); assert.equal(saves, 1);
  assert.equal(box.S.project.vibeGeneration.hideOriginal, true);
});

test('old projects and empty collections keep composition, while bespoke collections select exclusive parts', () => {
  const { J } = engine(), p = J.defaultProject();
  const original = JSON.stringify(J.plan(p, null));
  delete p.vibeLibrary; delete p.vibeGeneration;
  assert.equal(JSON.stringify(J.plan(p, null)), original);
  p.vibeGeneration = { id: 'empty_custom' };
  assert.equal(JSON.stringify(J.plan(p, null)), original);
  p.vibeGeneration = { id: 'collapsar' };
  assert.ok(J.plan(p, null).cuts.some(c => c.decor.some(d => d.id.startsWith('collapsar_'))));
  p.vibeGeneration = { id: 'xxt' };
  assert.ok(J.plan(p, null).cuts.some(c => c.layout.startsWith('xxt_')));
});

test('collections reference parts, keep companions general, isolate exclusive parts and support multiple styles', () => {
  const { J } = engine(), p = J.defaultProject(), before = J.order('layout').length;
  J.setVibePart(p, 'xxt', 'layout', 'center', 'companion');
  assert.equal(J.vibeRole(p, 'xxt', 'layout', 'center'), 'companion');
  assert.equal(J.matchesVibe(p, 'general', 'layout', 'center'), true);
  J.setVibePart(p, 'xxt', 'layout', 'center', 'exclusive');
  assert.equal(J.matchesVibe(p, 'general', 'layout', 'center'), false);
  assert.equal(J.matchesVibe(p, 'xxt', 'layout', 'center', 'companion'), false);
  const d = J.LAYOUTS.center; d.tags = ['calm', 'emotional'];
  assert.equal(J.matchesVibe(p, 'calm', 'layout', 'center'), true);
  assert.equal(J.matchesVibe(p, 'emotional', 'layout', 'center'), true);
  assert.equal(J.order('layout').length, before);
  J.setVibePart(p, 'xxt', 'layout', 'center', '');
  assert.equal(J.matchesVibe(p, 'general', 'layout', 'center'), true);
});

test('collapsar operates on the same peer level as xxt for curation and generation', () => {
  const { J } = engine(), p = J.defaultProject();
  assert.equal(J.VIBES.collapsar.name, '坍缩星');
  assert.equal(J.VIBES.collapsar.custom, true);
  J.setVibePart(p, 'collapsar', 'layout', 'huge', 'exclusive');
  assert.equal(J.vibeRole(p, 'collapsar', 'layout', 'huge'), 'exclusive');
  assert.equal(J.matchesVibe(p, 'collapsar', 'layout', 'huge'), true);
  assert.equal(J.matchesVibe(p, 'general', 'layout', 'huge'), false);
  p.vibeGeneration = { id: 'collapsar', includeGeneral: false };
  assert.equal(J.randomOk(p, 'layout', 'huge'), true);
  assert.equal(J.randomOk(p, 'layout', 'center'), false);
  J.setVibePart(p, 'collapsar', 'layout', 'huge', '');
  assert.equal(J.matchesVibe(p, 'general', 'layout', 'huge'), true);
});

test('generation honors the chosen collection, permits optional general parts and preserves existing switches', () => {
  const { J } = engine(), p = J.defaultProject();
  J.setVibePart(p, 'collapsar', 'layout', 'center', 'exclusive');
  p.vibeGeneration = { id: 'collapsar', includeGeneral: false };
  assert.equal(J.randomOk(p, 'layout', 'center'), true);
  assert.equal(J.randomOk(p, 'layout', 'huge'), false);
  assert.equal(J.randomOk(p, 'fx', 'glitch'), true); // empty group keeps ordinary candidates
  for (const seed of [1, 2, 20261030]) {
    p.seed = seed;
    const cuts = J.plan(p, null).cuts.filter(c => c.line >= 0 && !J.LAYOUTS[c.layout].special);
    assert.ok(cuts.length); assert.ok(cuts.every(c => c.layout === 'center'));
  }
  p.vibeGeneration.includeGeneral = true;
  assert.equal(J.randomOk(p, 'layout', 'huge'), true);
  const extra = J.order('layout').find(k => J.LAYOUTS[k].extra);
  J.setVibePart(p, 'collapsar', 'layout', extra, 'companion');
  assert.equal(J.randomOk(p, 'layout', extra), false);
  p.vibeGeneration = { id: 'general' };
  assert.equal(J.randomOk(p, 'layout', 'center'), false);
});

test('font and palette membership affects generation without renumbering palettes or overriding manual choices', () => {
  const { J } = engine(), p = J.defaultProject();
  J.setVibePart(p, 'xxt', 'layout', 'center', 'companion');
  J.setVibePart(p, 'xxt', 'font', 'mincho', 'companion');
  J.setVibePart(p, 'xxt', 'scheme', 1, 'companion');
  p.vibeGeneration = { id: 'xxt' };
  const plan = J.plan(p, null), cuts = plan.cuts.filter(c => c.line >= 0 && !J.LAYOUTS[c.layout].special);
  assert.ok(cuts.every(c => c.params.font === 'mincho'));
  assert.ok(cuts.every(c => c.scheme === 1));
  assert.equal(plan.style.schemes.length, J.resolveStyle(p).schemes.length);
  p.overrides[0] = { layout: 'huge', scheme: 0, font: 'gothic_black' };
  const manual = J.plan(p, null).cuts.find(c => c.line === 0);
  assert.equal(manual.layout, 'huge'); assert.equal(manual.scheme, 0); assert.equal(manual.font, 'gothic_black');
  p.style = 'paper';
  assert.equal(J.vibeRole(p, 'xxt', 'scheme', 1), '');
});

test('collection edits do not apply a part to the selected shot and round-trip through real save loader and undo/redo', () => {
  const box = engine(), project = box.J.defaultProject(), nodes = { shotVibeRole: { value: 'exclusive' } };
  Object.assign(box, { S: { project, t: 0 }, $: id => nodes[id] || null,
    remember: noop, commit: noop, autosave: noop, flushSave: noop, updateEditBtns: noop, updateHist: noop,
    syncUI: noop, replan: noop, toast: noop, seek: noop, fontKey: '' });
  vm.runInContext(slice('function mergeProject(', 'const SET_UI') + slice('const ED =', '// LRC を読み込む:')
    + 'let shotVibeManage = true;\n' + slice('function editShotVibePart(', 'function finishShotVibeGrid('), box);
  const before = JSON.stringify(project.overrides);
  assert.equal(box.editShotVibePart('layout', 'center'), true);
  assert.equal(JSON.stringify(project.overrides), before);
  const restored = box.mergeProject(JSON.parse(JSON.stringify(project)));
  assert.equal(box.J.vibeRole(restored, 'xxt', 'layout', 'center'), 'exclusive');
  box.edGo(-1); assert.equal(box.J.vibeRole(box.S.project, 'xxt', 'layout', 'center'), '');
  box.edGo(1); assert.equal(box.J.vibeRole(box.S.project, 'xxt', 'layout', 'center'), 'exclusive');
  box.S.exporting = true; nodes.shotVibeRole.value = '';
  box.editShotVibePart('layout', 'center');
  assert.equal(box.J.vibeRole(box.S.project, 'xxt', 'layout', 'center'), 'exclusive');
});
