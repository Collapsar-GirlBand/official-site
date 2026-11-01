const { test } = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('./engine_fixture.cjs');
const entries = J => J.GROUP_KEYS.flatMap(g => J.order(g).filter(k => J.registry(g)[k].pack === 'xxt2').map(k => [g, k, J.registry(g)[k]]));

test('twelve new parts belong exclusively to 星宿叹 and retain AE fallbacks', () => {
  const { J } = engine(), p = J.defaultProject(), parts = entries(J);
  assert.equal(parts.length, 12);
  for (const [g, k, def] of parts) {
    assert.equal(J.matchesVibe(p, 'xxt', g, k), true);
    assert.equal(J.matchesVibe(p, 'general', g, k), false);
    assert.equal(J.matchesVibe(p, 'collapsar', g, k), false);
    p.vibeGeneration = { id: 'xxt' };
    assert.equal(J.randomOk(p, g, k), true);
    if (['layout', 'enter', 'exit', 'hold', 'decor'].includes(g)) assert.ok(def.ae);
    if (def.plan) {
      const cut = { text: '星河不问归期', n: 6, W: 1920, H: 1080, dur: 3 };
      assert.equal(JSON.stringify(def.plan(J.rng(31), cut, J.resolveStyle(p))), JSON.stringify(def.plan(J.rng(31), cut, J.resolveStyle(p))));
    }
  }
});

test('letter motions settle exactly, disappear completely, and honor reduced motion', () => {
  const { J } = engine(), env = { fx: { motion: 0 }, lt: 1.2, ltb: 1.2 };
  const item = () => ({ size: 80, y: 400, alpha: 1, charFns: [] });
  for (const n of [1, 5, 30]) {
    const it = item(); J.ENTER.xxtDewLetters.apply(env, it, 1);
    for (let i = 0; i < n; i++) {
      const v = it.charFns[0](i, {}, n); assert.equal(v.a, 1); assert.equal(v.dy, 0); assert.equal(v.s, 1);
    }
    const out = item(); J.EXIT.xxtUnsentSigh.apply(env, out, 1);
    for (let i = 0; i < n; i++) assert.equal(out.charFns[0](i, {}, n).a, 0);
  }
  const it = item(); J.HOLD.xxtSiderealBreath.apply(env, it, 1);
  assert.equal(it.y, 400); assert.equal(it.alpha, 1);
  const camera = J.CAMERA.xxtLongWatch.get({ ...env, W: 1920, H: 1080, cut: { dur: 3 } });
  assert.equal(camera.s, 1); assert.equal(Math.abs(camera.x), 0); assert.equal(Math.abs(camera.y), 0);
});

test('eclipse transition endpoints show the original frames and preserve canvas state', () => {
  const { J } = engine(), A = {}, B = {}, calls = [], ctx = { drawImage: v => calls.push(v) };
  J.TRANS.xxtEclipseVeil.draw(ctx, A, B, 0, { cw: 1920, ch: 1080 });
  assert.deepEqual(calls, [A]); calls.length = 0;
  J.TRANS.xxtEclipseVeil.draw(ctx, A, B, 1, { cw: 1920, ch: 1080 });
  assert.deepEqual(calls, [B]);
});

test('new layouts plan across short, long, Latin and portrait lyrics without altering manual choices', () => {
  const { J } = engine();
  for (const [g, k] of entries(J).filter(([g]) => g === 'layout')) {
    for (const aspect of ['16:9', '9:16', '1:1', '21:9']) for (const text of ['星', '参商两不见', 'Across the silent sky', '星河不问归期而我仍在长夜里等待你的回音']) {
      if (!J.registry(g)[k].fits(J.glyphCount(text))) continue;
      const p = J.defaultProject(); p.lyrics = text; p.aspect = aspect;
      p.overrides = { 0: { layout: k, single: true, enter: 'xxtDewLetters', exit: 'xxtUnsentSigh', hold: 'xxtSiderealBreath', decor: ['xxtStarLot'], bg: 'xxtSilentAtlas', cam: 'xxtLongWatch' } };
      const plan = J.plan(p, null), cut = plan.cuts.find(c => c.line === 0);
      assert.equal(cut.layout, k); assert.ok(Number.isFinite(cut.dur));
      assert.equal(cut.enter, 'xxtDewLetters'); assert.ok(cut.params.font);
    }
  }
});
