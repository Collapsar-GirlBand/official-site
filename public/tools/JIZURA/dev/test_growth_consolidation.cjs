const { engine } = require('./engine_fixture.cjs');

const box = engine();
const { J } = box;

console.log('--- Testing J.DECOR registrations ---');
const expectedKeys = [
  'grow_flora', 'grow_geometric', 'grow_cyber', 'grow_frost', 'grow_tendril',
  'grow_hyphae', 'grow_lightning', 'grow_coral', 'grow_neural', 'grow_physarum',
  'fracture_burst', 'fracture_crevasse', 'fracture_craquelure', 'fracture_glass',
  'grow_fidenza', 'grow_fidenza_line', 'grow_aurora'
];

let allOk = true;
for (const k of expectedKeys) {
  const def = J.DECOR[k];
  if (!def) {
    console.error(`FAIL: Missing ${k} in J.DECOR!`);
    allOk = false;
  } else {
    console.log(`PASS: ${k} registered: "${def.name}" (tags: ${def.tags.join(', ')})`);
  }
}

console.log(`\n--- Testing Draw on all ${expectedKeys.length} components ---`);
const mockCtx = new Proxy({}, { get: () => () => {}, set: () => true });
const env = {
  pass: 'main',
  ctx: mockCtx,
  sc: { ink: '#000000', fg: '#ffffff', accent: '#ff4400', accent2: '#00ccff', bg: '#101010' },
  W: 1920,
  H: 1080,
  lt: 1.5,
  pOut: 0,
  cut: { dur: 3.0, seed: 12345 }
};

const bb0 = { x0: 400, y0: 300, x1: 1520, y1: 780, cx: 960, cy: 540 };

for (const k of expectedKeys) {
  const def = J.DECOR[k];
  try {
    def.draw(env, bb0, { seed: 999 });
    console.log(`PASS: Draw ${k} succeeded.`);
  } catch (e) {
    console.error(`FAIL: Draw ${k} threw:`, e);
    allOk = false;
  }
}

console.log('\n--- Testing Parameter Overrides & Presets across all Generative Families ---');
try {
  // 1. Vine / Florilegium family
  J.DECOR['grow_flora'].draw(env, bb0, { seed: 111, preset: 'bloom' });
  J.DECOR['grow_flora'].draw(env, bb0, { seed: 111, preset: 'withered' });
  J.DECOR['grow_geometric'].draw(env, bb0, { seed: 112, preset: 'crystal' });
  J.DECOR['grow_cyber'].draw(env, bb0, { seed: 113, preset: 'pcb_dense' });
  J.DECOR['grow_frost'].draw(env, bb0, { seed: 114, preset: 'snowflake' });
  console.log('PASS: Vine family presets (bloom, withered, crystal, pcb_dense, snowflake) drew cleanly.');

  // 2. Tendril & Physarum
  J.DECOR['grow_tendril'].draw(env, bb0, { seed: 221, preset: 'fern' });
  J.DECOR['grow_tendril'].draw(env, bb0, { seed: 222, preset: 'wild' });
  J.DECOR['grow_physarum'].draw(env, bb0, { seed: 223, preset: 'angio' });
  J.DECOR['grow_physarum'].draw(env, bb0, { seed: 224, preset: 'biolum' });
  console.log('PASS: Tendril & Physarum presets (fern, wild, angio, biolum) drew cleanly.');

  // 3. Hyphae family
  J.DECOR['grow_hyphae'].draw(env, bb0, { seed: 331, preset: 'dense' });
  J.DECOR['grow_lightning'].draw(env, bb0, { seed: 332, preset: 'overcharge' });
  J.DECOR['grow_coral'].draw(env, bb0, { seed: 333, preset: 'anemone' });
  J.DECOR['grow_neural'].draw(env, bb0, { seed: 334, preset: 'cortex' });
  console.log('PASS: Hyphae family presets (dense, overcharge, anemone, cortex) drew cleanly.');

  // 4. Fracture family
  J.DECOR['fracture_burst'].draw(env, bb0, { seed: 441, preset: 'supernova' });
  J.DECOR['fracture_crevasse'].draw(env, bb0, { seed: 442, preset: 'chasm' });
  J.DECOR['fracture_craquelure'].draw(env, bb0, { seed: 443, preset: 'kintsugi' });
  J.DECOR['fracture_glass'].draw(env, bb0, { seed: 444, preset: 'bullet_impact' });
  console.log('PASS: Fracture family presets (supernova, chasm, kintsugi, bullet_impact) drew cleanly.');

  // 5. Fidenza & Aurora family
  J.DECOR['grow_fidenza'].draw(env, bb0, { seed: 551, preset: 'turbulent' });
  J.DECOR['grow_fidenza_line'].draw(env, bb0, { seed: 552, preset: 'hairline' });
  J.DECOR['grow_aurora'].draw(env, bb0, { seed: 553, preset: 'violet_storm' });
  console.log('PASS: Fidenza & Aurora presets (turbulent, hairline, violet_storm) drew cleanly.');
} catch (e) {
  console.error('FAIL during parameter overrides test:', e);
  allOk = false;
}

console.log('\n--- Testing 08_planner decor slot parsing ---');
try {
  const p = J.defaultProject();
  p.text = '0:01 Test line';
  p.overrides = {
    0: {
      cutTech: {
        0: {
          decor: ['grow_frost', { id: 'fracture_glass', preset: 'bullet_impact', density: 1.5 }],
          decorParams: { avoidText: false }
        }
      }
    }
  };
  const plan = J.plan(p);
  const testCut = plan.cuts.find(c => c.line === 0);
  if (!testCut) {
    console.error('FAIL: No cut found for line 0');
    allOk = false;
  } else {
    console.log('Plan cut.decor count:', testCut.decor.length);
    const d0 = testCut.decor[0];
    const d1 = testCut.decor[1];
    console.log('d0:', d0.id, 'avoidText:', d0.avoidText);
    console.log('d1:', d1.id, 'preset:', d1.preset, 'density:', d1.density, 'avoidText:', d1.avoidText);
    if (d0.id === 'grow_frost' && d1.id === 'fracture_glass' && d1.preset === 'bullet_impact' && d1.density === 1.5) {
      console.log('PASS: Planner correctly preserved parameter objects and merged decorParams!');
    } else {
      console.error('FAIL: Planner did not properly merge decor parameters!');
      allOk = false;
    }
  }
} catch (e) {
  console.error('FAIL during planner test:', e);
  allOk = false;
}

if (allOk) {
  console.log(`\n=== ALL ${expectedKeys.length} GROWTH DECOR ITEMS AND PRESET CHECKS PASSED ===`);
  process.exit(0);
} else {
  console.error(`\n=== SOME CHECKS FAILED ===`);
  process.exit(1);
}
