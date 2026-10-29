// Run: node --test public/tools/JIZURA/dev/palette_test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const noop = () => {};
const { engine } = require('./engine_fixture.cjs');
test('strict palette catches arbitrary effect RGB, preserves all palette roles and alpha', () => {
  const { J } = engine();
  const sc = { bg: '#101010', fg: '#111111', sub: '#ABCD12', accent: '#FEDCBA',
    accent2: '#123456', ink: '#654321', dim: '#020202', ghostA: '#F0E0D0', ghostB: '#00ABCD', grad: ['#112233', '#334455'] };
  const palette = new Set(J.paletteColors(sc));
  const data = new Uint8ClampedArray(4096 * 4);
  for (let i = 0; i < data.length; i++) data[i] = (i * 137 + (i >> 3)) % 256;
  const alpha = data.filter((_, i) => i % 4 === 3);
  J.strictPalettePixels(data, sc);
  for (let i = 0; i < data.length; i += 4) {
    assert.equal(data[i + 3], alpha[i / 4]);
    if (data[i + 3]) assert.ok(palette.has(J.toHex(...data.slice(i, i + 3))));
  }
  for (const color of palette) {
    const pixel = new Uint8ClampedArray([...J.hex(color), 255]);
    J.strictPalettePixels(pixel, sc);
    assert.equal(J.toHex(...pixel.slice(0, 3)), color);
  }
  const changed = { bg: '#FFFFFF', fg: '#000000' };
  J.strictPalettePixels(data, changed);
  for (let i = 0; i < data.length; i += 4) if (data[i + 3]) {
    assert.ok(['#FFFFFF', '#000000'].includes(J.toHex(...data.slice(i, i + 3))));
  }
});
test('strict mode is opt-in for old custom projects and disabled for presets', () => {
  const { J } = engine();
  const p = J.defaultProject(); p.style = 'custom';
  assert.equal(J.resolveStyle(p).strictPalette, true);
  delete p.customStyle.strictPalette;
  assert.equal(J.resolveStyle(p).strictPalette, false);
  p.style = 'noir'; p.customStyle.strictPalette = true;
  assert.equal(J.resolveStyle(p).strictPalette, false);
});
test('finished-frame constraint runs after post effects for preview and transparent export', () => {
  const { J } = engine();
  const p = J.defaultProject(); p.style = 'custom';
  const plan = { W: 1, H: 1, fps: 30, cuts: [], events: [], fx: p.fx,
    style: J.resolveStyle(p), hud: false };
  const renderer = new J.Renderer();
  let pixel, writes = 0;
  const context = new Proxy({ canvas: { width: 1, height: 1 },
    getImageData: () => ({ data: pixel }), putImageData: () => writes++,
    createRadialGradient: () => ({ addColorStop: noop }),
  }, { get: (target, k) => target[k] || noop });
  renderer.post = () => { pixel = new Uint8ClampedArray([255, 48, 32, 127]); };
  const palette = new Set(J.paletteColors(plan.style.schemes[0]));
  for (const opt of [{}, { transparent: true }, { transparent: true, layer: 'front' }]) {
    renderer.frame(context, plan, 0, opt);
    assert.ok(palette.has(J.toHex(...pixel.slice(0, 3))));
    assert.equal(pixel[3], 127);
  }
  assert.equal(writes, 3);
  plan.style.strictPalette = false;
  renderer.frame(context, plan, 0);
  assert.equal(J.toHex(...pixel.slice(0, 3)), '#FF3020');
  assert.equal(writes, 3);
});
class Element {
  constructor() { this.children = []; this.events = {}; this.nodes = {}; this.style = {}; this.classList = { add: noop, remove: noop }; }
  set innerHTML(_) { this.children = []; }
  appendChild(el) { this.children.push(el); }
  querySelector(key) { return this.nodes[key] ||= new Element(); }
  addEventListener(name, fn) { this.events[name] = fn; }
}
test('colour gestures, hex edits and strict-mode toggle undo and redo using real editor history', () => {
  const box = engine(), ui = fs.readFileSync(path.join(ROOT, 'src/12_ui.js'), 'utf8');
  const nodes = { schemeTabs: new Element(), schemeEditor: new Element(), custStrictPalette: new Element() };
  Object.assign(box, { $: id => nodes[id] || null, S: { project: box.J.defaultProject(), t: 0 },
    commit: noop, remember: noop, autosave: noop, flushSave: noop, updateEditBtns: noop,
    updateHist: noop, syncUI: noop, replan: noop, replanSoon: noop, drawStyleGrid: noop,
    drawSwatch: noop, toast: noop, seek: noop, updateCustSwatch: noop, fontKey: '',
    toColorInput: v => v,
  });
  box.document.createElement = () => new Element();
  const slice = (start, end) => ui.slice(ui.indexOf(start), ui.indexOf(end));
  vm.runInContext(slice('function mergeProject(', 'const SET_UI')
    + slice('const ED =', '// LRC を読み込む:')
    + 'let custActiveScheme = 0;\n'
    + slice('function touchCustomStyle(', 'function copyPresetToCustom(')
    + slice('function renderCustSchemes(', 'function updateCustSwatch(')
    + slice('function renderCustSwitches(', 'function bindCustomStyleEvents('), box);
  box.S.project.style = 'custom';
  const original = box.S.project.customStyle.schemes[0].bg;
  box.renderCustSchemes(box.S.project.customStyle);
  const input = nodes.schemeEditor.children[0].querySelector('input[type=color]');
  for (const value of ['#123456', '#ABCDEF']) input.events.input({ target: { value } });
  input.events.change({ target: { value: '#ABCDEF' } });
  assert.equal(vm.runInContext('ED.undo.length', box), 1);
  box.edGo(-1); assert.equal(box.S.project.customStyle.schemes[0].bg, original);
  box.edGo(1); assert.equal(box.S.project.customStyle.schemes[0].bg, '#ABCDEF');
  box.renderCustSchemes(box.S.project.customStyle);
  const hex = nodes.schemeEditor.children[8].querySelector('input[type=text]');
  hex.events.change({ target: { value: 'bad input' } });
  assert.equal(vm.runInContext('ED.undo.length', box), 1);
  const oldGrad = box.S.project.customStyle.schemes[0].grad[0];
  hex.events.change({ target: { value: '#445566' } });
  box.edGo(-1); assert.equal(box.S.project.customStyle.schemes[0].grad[0], oldGrad);
  box.edGo(1); assert.equal(box.S.project.customStyle.schemes[0].grad[0], '#445566');
  box.renderCustSwitches(box.S.project.customStyle);
  nodes.custStrictPalette.onchange({ target: { checked: false } });
  assert.equal(box.S.project.customStyle.strictPalette, false);
  box.edGo(-1); assert.equal(box.S.project.customStyle.strictPalette, true);
  box.edGo(1); assert.equal(box.S.project.customStyle.strictPalette, false);
});
