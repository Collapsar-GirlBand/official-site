const { test } = require('node:test');
const assert = require('node:assert/strict');
const { engine } = require('./engine_fixture.cjs');
function setup() {
  const { J } = engine();
  J.glyphSupport = () => true;
  const combo = { main: 'site_0', fallback: 'site_1', mainCal: { size: 1 }, fallbackCal: { size: 0.9 }, rules: [
    { chars: '01😀', font: 'site_2', cal: { size: 1.2, baseline: 0.1, width: 0.8, advance: 1.1, tracking: 0.05, weight: 100, stroke: -1 } },
    { chars: '1。', font: 'site_4', cal: { size: 0.8, baseline: -0.1, width: 1.1, advance: 0.9, tracking: 0.02, weight: -100, stroke: 2 } },
  ] };
  return { J, combo };
}
test('explicit character rules precede missing-glyph fallback and first match wins', () => {
  const { J, combo } = setup(); J.configureFontCombos({ display: combo });
  assert.equal(J.resolveGlyph('combo_display', '1'), 'combo_display_rule_0');
  assert.equal(J.resolveGlyph('combo_display', '😀'), 'combo_display_rule_0');
  assert.equal(J.resolveGlyph('combo_display', '。'), 'combo_display_rule_1');
  assert.equal(J.resolveGlyph('combo_display', '字'), 'combo_display');
  J.glyphSupport = () => false;
  assert.equal(J.resolveGlyph('combo_display', '字'), 'combo_display_fallback');
  assert.equal(J.resolveGlyph('combo_display', '1'), 'combo_display_rule_0');
});
test('independent rule calibration survives project serialization and is used by layout', () => {
  const { J, combo } = setup();
  J.configureFontCombos(JSON.parse(JSON.stringify({ display: combo, body: { ...combo, rules: [] } })));
  assert.equal(J.fontCalibration('combo_display_rule_0').size, 1.2);
  assert.equal(J.fontCalibration('combo_display_rule_1').size, 0.8);
  assert.equal(J.resolveGlyph('combo_body', '1'), 'combo_body');
  const lay = J.layoutText({ text: '1。字', font: 'combo_display', size: 100 });
  assert.equal(lay[0].font, 'combo_display_rule_0');
  assert.equal(lay[0].cal.stroke, -1);
  assert.equal(lay[1].cal.stroke, 2);
  assert.equal(lay[0].y, 10);
  assert.equal(lay[1].y, -10);
});
test('legacy forced fallback and invalid rules remain safe', () => {
  const { J, combo } = setup();
  J.configureFontCombos({ display: { ...combo, fallbackChars: 'A', rules: [null, { chars: 'A', font: 'missing' }] } });
  assert.equal(J.resolveGlyph('combo_display', 'A'), 'combo_display_fallback');
  assert.equal(J.resolveGlyph('combo_display', 'B'), 'combo_display');
});
test('font loading includes all rule sources, even when absent from the sample', async () => {
  const { J, combo } = setup(), loaded = [];
  J.configureFontCombos({ display: combo });
  J.loadSiteFont = async key => { loaded.push(key); };
  await J.ensureFonts('字', ['combo_display']);
  assert.deepEqual(loaded.sort(), ['site_0', 'site_1', 'site_2', 'site_4']);
});
