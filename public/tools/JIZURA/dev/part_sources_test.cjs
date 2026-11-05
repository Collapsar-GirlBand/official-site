const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { engine } = require('./engine_fixture.cjs');
const fs = require('node:fs');

test('only CL is confirmed added; curation never changes the existing isolation split', () => {
  const { J } = engine(), p = J.defaultProject();
  const cl = J.order('decor').filter(k => J.DECOR[k].cl);
  assert.equal(cl.length, 12);
  p.vibeGeneration.hideOriginal = true;
  for (const k of cl) {
    assert.equal(J.partSource('decor', k), 'custom');
    assert.equal(J.matchesVibe(p, 'all', 'decor', k), true);
    assert.equal(J.randomOk(p, 'decor', k), true); // extra remains off
  }
  J.setVibePart(p, 'xxt', 'layout', 'center', 'exclusive');
  assert.equal(J.partSource('layout', 'center'), 'existing');
  assert.equal(J.matchesVibe(p, 'xxt', 'layout', 'center'), false);
  J.register('decor', 'futurePack', { name: 'Future' }, 'future');
  assert.equal(J.partSource('decor', 'futurePack'), 'custom');
  assert.equal(J.partVisible(p, 'decor', 'futurePack'), true);
  assert.equal(J.partSource('layout', 'xxtStarLedger'), 'retained');
  J.DECOR.futurePack.source = 'retained';
  assert.equal(J.partSource('decor', 'futurePack'), 'retained');
  assert.equal(J.partVisible(p, 'decor', 'futurePack'), true);
});

test('new IDs in existing files/packs and default registrations are automatically later additions', () => {
  const { J } = engine(), p = J.defaultProject();
  p.vibeGeneration.hideOriginal = true;
  for (const [key, pack] of [['laterCore', undefined], ['laterDecor', 'decor'], ['laterLayouts', 'layoutsA']]) {
    J.register('decor', key, { name: key }, pack);
    assert.equal(J.partSource('decor', key), 'custom');
    assert.equal(J.sourceOfDefinition(J.DECOR[key]), 'custom');
    assert.equal(J.partVisible(p, 'decor', key), true);
    assert.equal(J.randomOk(p, 'decor', key), true);
  }
  J.STYLES.laterStyle = { name: 'Later style' };
  assert.equal(J.partSource('style', 'laterStyle'), 'custom');
  assert.equal(J.partVisible(p, 'style', 'laterStyle'), true);
  // Replacing an existing ID keeps its group rather than claiming a newly added component.
  const original = J.DECOR.crosshair;
  J.register('decor', 'crosshair', { name: 'Edited existing' }, original.pack);
  assert.equal(J.partSource('decor', 'crosshair'), 'existing');
});

test('hidden originals never re-enter random pools, even for empty custom categories', () => {
  const { J } = engine(), p = J.defaultProject();
  p.vibeGeneration = { id: 'collapsar', hideOriginal: true, includeGeneral: true };
  for (const g of J.GROUP_KEYS) for (const k of J.order(g)) {
    if (J.partSource(g, k) === 'existing') {
      assert.equal(J.randomOk(p, g, k), false, g + ':' + k);
      assert.equal(J.matchesVibe(p, 'all', g, k), false, g + ':' + k);
    }
  }
  assert.equal(J.partVisible(p, 'font', 'mincho'), true);
  assert.equal(J.partVisible(p, 'scheme', 0), true);
  assert.equal(J.partVisible(p, 'style', 'noir'), false);
  assert.equal(J.partVisible(p, 'style', 'xxmd'), true);
  assert.equal(J.partVisible(p, 'enter', 'cut'), true);
});

test('generated shots and automatic events exclude upstream motifs; manual and locked shots survive', () => {
  const { J } = engine(), p = J.defaultProject();
  p.vibeGeneration.hideOriginal = true;
  p.title = 'Test'; p.unify = true;
  p.lyrics = '夜明けの色を/覚えてる\n*透明*なままじゃ終われない!\n[interlude 8]\nhello world';
  for (const seed of [1, 5, 42, 20261030]) {
    p.seed = seed;
    const plan = J.plan(p, null);
    for (const cut of plan.cuts) {
      for (const g of ['layout', 'enter', 'exit', 'hold', 'treat', 'bg', 'cam', 'trans', 'fx']) {
        const k = cut[g];
        // Plain centred text is the functional fallback when no layout fits.
        if (g === 'layout' && k === 'center' || !k || k === 'none') continue;
        assert.notEqual(J.partSource(g, k), 'existing', `${seed} ${g}:${k}`);
      }
      for (const d of cut.decor) assert.notEqual(J.partSource('decor', d.id), 'existing');
    }
    assert.ok(plan.events.every(e => J.partSource('fx', e.type) !== 'existing'));
  }
  p.overrides[0] = { layout: 'huge', enter: 'spin', decor: ['crosshair'] };
  const manual = J.plan(p, null).cuts.find(c => c.line === 0);
  assert.equal(manual.layout, 'huge'); assert.equal(manual.enter, 'spin');
  p.overrides[0] = { lock: true, lockedCuts: [manual], cuts: 1 };
  // Saving/loading must retain the hidden flag and original explicit choices.
  const restored = J.normalizeProject(JSON.parse(JSON.stringify(p)));
  assert.equal(restored.vibeGeneration.hideOriginal, true);
  assert.equal(restored.overrides[0].lockedCuts[0].layout, 'huge');
  assert.equal(J.defaultProject().vibeGeneration.hideOriginal, false);
});

test('one-click toggle filters the library, saves, restores and respects export guard', () => {
  const box = engine(), nodes = new Map();
  const el = id => {
    if (!nodes.has(id)) nodes.set(id, { hidden: true, setAttribute() {} });
    return nodes.get(id);
  };
  box.$ = el; box.S = { project: box.J.defaultProject(), exporting: false, tap: null };
  const ui = fs.readFileSync('src/12_ui.js', 'utf8');
  vm.runInContext(ui.slice(ui.indexOf('function syncPartSourceUI()'), ui.indexOf('function syncUI()'))
    + ui.match(/function techItems\(g\) \{[^\n]+/)[0], box);
  let saves = 0;
  for (const name of ['pushEdit', 'remember', 'renderTech', 'drawStyleGrid', 'renderCustomStyle',
    'renderFxLibrary', 'fillCutPick', 'replan', 'commit']) box[name] = () => {};
  box.flushSave = () => saves++;
  vm.runInContext('S.project = J.defaultProject(); S.exporting = false; S.tap = null;', box);
  box.toggleOriginalParts();
  assert.equal(vm.runInContext('S.project.vibeGeneration.hideOriginal', box), true);
  assert.equal(nodes.get('btnHideOriginal').textContent, '恢复显示原有部件');
  assert.ok(!Array.from(box.techItems('layout')).includes('center'));
  box.toggleOriginalParts();
  assert.equal(vm.runInContext('S.project.vibeGeneration.hideOriginal', box), false);
  assert.ok(Array.from(box.techItems('layout')).includes('center'));
  assert.equal(saves, 2);
  vm.runInContext('S.exporting = true;', box); box.toggleOriginalParts();
  assert.equal(saves, 2);
});

test('source visibility survives actual project loading and undo/redo', () => {
  const box = engine(), ui = fs.readFileSync('src/12_ui.js', 'utf8');
  const slice = (a, b) => ui.slice(ui.indexOf(a), ui.indexOf(b, ui.indexOf(a)));
  const noop = () => {};
  Object.assign(box, { S: { project: box.J.defaultProject(), t: 0 }, $: () => null,
    autosave: noop, updateEditBtns: noop, updateHist: noop, syncUI: noop,
    replan: noop, flushSave: noop, seek: noop, toast: noop, fontKey: '' });
  vm.runInContext(slice('function mergeProject(', 'const SET_UI')
    + slice('const ED =', '// LRC を読み込む:'), box);
  box.pushEdit(); box.S.project.vibeGeneration.hideOriginal = true;
  box.edGo(-1); assert.equal(box.S.project.vibeGeneration.hideOriginal, false);
  box.edGo(1); assert.equal(box.S.project.vibeGeneration.hideOriginal, true);
  const restored = box.mergeProject(JSON.parse(JSON.stringify(box.S.project)));
  assert.equal(restored.vibeGeneration.hideOriginal, true);
});
