// Run alongside palette_test.cjs with node --test.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('./engine_fixture.cjs');
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
function project(J, gap) {
  const p = J.defaultProject();
  p.lyrics = '红砖墙藤蔓失控生长\n默许这世界秩序崩塌';
  p.style = 'ocean'; p.typeset = false; p.unify = false; p.eventMode = 'manual';
  p.fx.chroma = 0;
  p.timing = { ...p.timing, snap: false, lineTimes: { 0: 1, 1: 6.7 + gap } };
  p.overrides = {
    0: { cuts: 1, layout: 'center', exit: 'blur', hold: 'breathe',
      cutTech: { 0: { scheme: 3, bg: 'noiseField', cam: 'handheld' } } },
    1: { cuts: 1, cutTech: { 0: { trans: 'sliceShift' } } },
  };
  return p;
}
test('all short gaps extend the same shot without changing its style or creating interludes', () => {
  const { J } = engine();
  for (const gap of [0.0005, 0.209, 0.279, 0.35, 0.8, 1.5]) {
    for (const autoInterlude of [true, false]) {
      const p = project(J, gap); p.autoInterlude = autoInterlude;
      const plan = J.plan(p, null);
      const a = plan.cuts.find(c => c.line === 0), b = plan.cuts.find(c => c.line === 1);
      assert.equal(plan.cuts.filter(c => c.line === 0).length, 1);
      assert.equal(a.layout, 'center'); assert.equal(a.scheme, 3);
      assert.equal(a.bg, 'noiseField'); assert.equal(a.cam, 'handheld');
      assert.equal(a.hold, 'breathe');
      near(a.textEnd, 6.7); near(a.end, b.start); near(a.dur, a.end - a.start);
      assert.equal(a.textExit, 'blur'); assert.ok(a.textOutDur > 0);
      assert.equal(b.trans, 'sliceShift');
    }
  }
});
test('explicit interludes and long-gap interludes retain their separate shots', () => {
  const { J } = engine();
  const p = project(J, 2);
  assert.ok(J.plan(p, null).cuts.some(c => c.line === 0 && c.layout === 'interlude'));
  p.lyrics = '红砖墙藤蔓失控生长\n[间奏 1]\n默许这世界秩序崩塌';
  p.timing.lineTimes = { 0: 1, 1: 7.5, 2: 8.5 };
  p.overrides = { 0: p.overrides[0] };
  const plan = J.plan(p, null);
  assert.equal(plan.cuts.filter(c => c.line === 0).length, 1);
  assert.ok(plan.cuts.some(c => c.line === 1 && c.layout === 'interlude'));
});
test('renderer exits text on its own clock and leaves the background clock untouched', () => {
  const { J } = engine();
  const plan = J.plan(project(J, 0.8), null);
  const cut = plan.cuts.find(c => c.line === 0);
  const renderer = new J.Renderer();
  const shotEnd = cut.end, shotDur = cut.dur, shotExit = cut.exit;
  const seen = [];
  J.LAYOUTS.probe = { render: env => {
    seen.push({ end: env.cut.end, dur: env.cut.dur, exit: env.cut.exit, out: env.pOut });
  } };
  const probe = { ...cut, layout: 'probe', decor: [] };
  for (const t of [cut.textEnd - cut.textOutDur / 2, cut.textEnd, cut.textEnd + 0.4]) {
    const env = renderer.makeEnv({}, plan, probe, plan.style.schemes[3], { t, lt: t - cut.start, pass: 'main' });
    renderer.drawCut(env);
    assert.equal(env.cut, probe);
    near(env.cut.end, shotEnd); near(env.cut.dur, shotDur);
  }
  assert.equal(seen.length, 1);
  near(seen[0].end, cut.textEnd); near(seen[0].dur, cut.textEnd - cut.start);
  assert.equal(seen[0].exit, 'blur'); near(seen[0].out, 0.5);
  assert.equal(cut.exit, shotExit);
  const midGap = J.cutAt(plan, cut.textEnd + 0.4);
  assert.equal(midGap, cut); assert.equal(midGap.scheme, 3);
  const snapshot = J.lineSnapshot(plan, 0)[0];
  assert.equal(snapshot.exit, 'blur'); near(snapshot.outDur, cut.textOutDur);
});
test('side-band companion text and background lifetimes stay in sync', () => {
  const { J } = engine();
  const p = project(J, 0.8); p.centerFree = true;
  const plan = J.plan(p, null), cut = plan.cuts.find(c => c.line === 0);
  assert.ok(cut.companion);
  near(cut.companion.end, cut.end); near(cut.companion.textEnd, cut.textEnd);
  near(cut.companion.dur, cut.companion.end - cut.companion.start);
});
test('old saved gap cards do not reappear as extra lyric shots', () => {
  const { J } = engine(), p = project(J, 0.8);
  const snapshot = J.lineSnapshot(J.plan(p, null), 0);
  snapshot.push({ ...snapshot[0], layout: 'interlude', utext: '' });
  p.overrides[0].savedCuts = snapshot;
  const shots = J.plan(p, null).cuts.filter(c => c.line === 0);
  assert.equal(shots.length, 1); assert.equal(shots[0].layout, 'center');
  near(shots[0].textEnd, 6.7); near(shots[0].end, 7.5);
});
test('range exports shift text and background endpoints together', () => {
  const { J } = engine(), p = project(J, 0.8), plan = J.plan(p, null);
  const clean = J.planForAE(plan, p, { t0: 1, t1: 9 });
  const shot = clean.cuts.find(c => c.line === 0);
  near(shot.start, 0); near(shot.textEnd, 5.7); near(shot.end, 6.5);
});
