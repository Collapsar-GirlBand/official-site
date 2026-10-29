const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const noop = () => {};
function engine() {
  const ctx = new Proxy({}, {
    get: (_, k) => k === 'measureText' ? () => ({ width: 100 })
      : /ImageData/.test(k) ? () => ({ data: new Uint8ClampedArray(4) })
      : /^create/.test(k) ? () => ({ addColorStop: noop }) : noop,
    set: () => true,
  });
  const el = () => ({ getContext: () => ctx, style: {}, appendChild: noop, addEventListener: noop });
  const box = { console, Uint8ClampedArray, Uint8Array, setTimeout: noop, clearTimeout: noop,
    document: { createElement: el, addEventListener: noop, querySelectorAll: () => [],
      getElementById: () => null, head: { appendChild: noop }, fonts: { ready: Promise.resolve(), load: async () => [] } },
    OffscreenCanvas: function () { return el(); }, requestAnimationFrame: noop,
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    Path2D: function () { return new Proxy({}, { get: () => noop }); },
  };
  box.window = box;
  vm.createContext(box);
  for (const name of fs.readdirSync(path.join(ROOT, 'src')).filter(n => n.endsWith('.js') && n !== '12_ui.js').sort()) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', name), 'utf8'), box, { filename: name });
  }
  return box;
}
module.exports = { engine };
