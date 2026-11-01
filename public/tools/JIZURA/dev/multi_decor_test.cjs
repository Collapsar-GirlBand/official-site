const { test } = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('./engine_fixture.cjs');

test('multi-decor: planner handles array of decor IDs and generates multiple decor items', () => {
  const box = engine();
  const project = box.J.defaultProject();
  project.overrides = {
    0: {
      cutTech: {
        0: { decor: ['collapsar_singularity', 'collapsar_tech_bracket'] }
      }
    }
  };
  const plan = box.J.plan(project, null);
  const cut0 = plan.cuts.find(c => c.line === 0);
  assert.ok(cut0, 'Cut 0 should exist');
  assert.equal(cut0.decor.length, 2, 'Cut 0 should have 2 decor items');
  assert.equal(cut0.decor[0].id, 'collapsar_singularity');
  assert.equal(cut0.decor[1].id, 'collapsar_tech_bracket');
  assert.ok(cut0.decor[0].seed, 'decor 0 should have seed');
  assert.ok(cut0.decor[1].seed, 'decor 1 should have seed');
});

test('multi-decor: backward compatibility with legacy single string and comma-separated string', () => {
  const box = engine();
  const project = box.J.defaultProject();
  project.overrides = {
    0: {
      cutTech: {
        0: { decor: 'collapsar_singularity' },
        1: { decor: 'collapsar_singularity, collapsar_diffraction_flare' }
      }
    }
  };
  const plan = box.J.plan(project, null);
  const cut0 = plan.cuts.find(c => c.line === 0 && c.index === 0);
  assert.equal(cut0.decor.length, 1);
  assert.equal(cut0.decor[0].id, 'collapsar_singularity');

  const cut1 = plan.cuts.find(c => c.line === 0 && c.index === 1);
  if (cut1) {
    assert.equal(cut1.decor.length, 2);
    assert.equal(cut1.decor[0].id, 'collapsar_singularity');
    assert.equal(cut1.decor[1].id, 'collapsar_diffraction_flare');
  }
});

test('multi-decor: tech.decor none or empty array produces empty decor list', () => {
  const box = engine();
  const project = box.J.defaultProject();
  project.overrides = {
    0: {
      cutTech: {
        0: { decor: 'none' }
      }
    }
  };
  const plan = box.J.plan(project, null);
  const cut0 = plan.cuts.find(c => c.line === 0);
  assert.equal(cut0.decor.length, 0);
});

test('multi-decor: renderer renders back and front decor cleanly', () => {
  const box = engine();
  const project = box.J.defaultProject();
  project.overrides = {
    0: {
      cutTech: {
        0: { decor: ['collapsar_singularity', 'collapsar_tech_bracket', 'collapsar_diffraction_flare'] }
      }
    }
  };
  const plan = box.J.plan(project, null);
  const cut0 = plan.cuts.find(c => c.line === 0);
  assert.equal(cut0.decor.length, 3);

  // Mock canvas context
  const mockCtx = {
    save() {}, restore() {}, beginPath() {}, closePath() {}, stroke() {}, fill() {},
    arc() {}, rect() {}, clip() {}, moveTo() {}, lineTo() {}, bezierCurveTo() {}, fillText() {}, measureText() { return { width: 100 }; },
    createRadialGradient() { return { addColorStop() {} }; },
    createLinearGradient() { return { addColorStop() {} }; },
    createPattern() { return {}; },
    setLineDash() {}, fillRect() {}, clearRect() {}, strokeRect() {},
    translate() {}, rotate() {}, scale() {}, transform() {}, setTransform() {},
    resetTransform() {}, drawImage() {}
  };

  const renderer = new box.J.Renderer();
  const env = renderer.makeEnv(mockCtx, plan, cut0, plan.style.schemes[0], {
    t: cut0.start + 0.2,
    lt: 0.2,
    pass: 'main',
    step: 0,
    scale: 1,
    W: 1920,
    H: 1080
  });

  // Render decor
  assert.doesNotThrow(() => {
    renderer.drawCut(env);
  });
});
