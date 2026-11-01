const { test } = require('node:test');
const assert = require('node:assert/strict');
const { uiFixture } = require('./ui_fixture.cjs');
const { engine } = require('./engine_fixture.cjs');

test('style collections resolve styles through the style table rather than the animation registry', () => {
  const { J } = engine(), p = J.defaultProject(); p.extra = true;
  for (const vibe of ['all', 'general', 'xxt', 'collapsar']) {
    p.vibeGeneration.id = vibe;
    for (const style of J.STYLE_ORDER) assert.doesNotThrow(() => J.randomOk(p, 'style', style));
  }
  assert.equal(J.randomOk(p, 'style', 'ocean'), true);
  p.extra = false; assert.equal(J.randomOk(p, 'style', 'ocean'), false);
});

test('real editor sync renders an old ocean project including the style grid and custom controls', () => {
  const { box, nodes } = uiFixture(), { J } = box;
  J.ui.project = J.uiApi.mergeProject({ version: 1, timingOrder: 2, lyrics: '旧歌词\n第二行',
    style: 'ocean', extra: true, colors: { enabled: true, bg: '#111C55' } });
  J.ui.plan = J.plan(J.defaultProject(), null);
  assert.doesNotThrow(() => J.uiApi.syncUI());
  assert.ok(nodes.get('styleGrid').children.some(b => b.dataset.k === 'ocean'));
  assert.equal(J.ui.project.style, 'ocean');
});

test('real UI exceptions identify the failed section without guessing that the file is incompatible', () => {
  const { box } = uiFixture(), { J } = box;
  J.ui.project = J.uiApi.mergeProject({ lyrics: '旧歌词', style: 'ocean' });
  J.ui.plan = J.plan(J.defaultProject(), null);
  delete J.STYLES.ocean.schemes;
  assert.throws(() => J.uiApi.syncUI(), e => e.projectSection === '项目配色' && /reading '0'/.test(e.message));
});

test('legacy ocean project completes the real import, UI refresh, replanning and history path', async () => {
  const { box } = uiFixture(), { J } = box;
  J.ui.project = J.uiApi.mergeProject({ lyrics: '原项目', timingOrder: 2 });
  J.ui.plan = J.plan(J.ui.project, null);
  const raw = { version: 1, timingOrder: 2, lyrics: '旧歌词\n第二行', style: 'ocean', extra: true,
    timing: { lineTimes: { 0: 1, 1: 4 } }, colors: { enabled: true, bg: '#111C55' },
    overrides: { 0: { lock: true, lockedCuts: [{ utext: '旧歌词', layout: 'center', enter: 'blur',
      exit: 'blur', hold: 'still', inDur: 0.3, outDur: 0.2, seed: 42, scheme: 0,
      params: { font: 'gothic_light', fontB: 'mincho' }, decor: [], treat: 'none', cam: 'push' }] } } };
  assert.equal(await J.uiApi.importProjectFile({ text: async () => JSON.stringify(raw) }), true);
  assert.equal(J.ui.project.style, 'ocean');
  assert.equal(J.ui.project.timing.lineTimes[1], 4);
  assert.equal(J.ui.project.colors.bg, '#111C55');
  assert.deepEqual(JSON.parse(JSON.stringify(J.ui.project.overrides)), raw.overrides);
  assert.ok(J.ui.plan.cuts.length);
});
