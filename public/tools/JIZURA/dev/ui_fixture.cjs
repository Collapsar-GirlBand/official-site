// Execute real editor functions against a small DOM fixture; no user browser or stored session is touched.
const fs = require('node:fs');
const vm = require('node:vm');
const { engine } = require('./engine_fixture.cjs');
function uiFixture(edition) {
  const box = engine(), noop = () => {}, nodes = new Map();
  const ctx = new Proxy({
    measureText: () => ({ width: 100, actualBoundingBoxAscent: 80, actualBoundingBoxDescent: 20 }),
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
  }, { get: (o, k) => o[k] || noop, set: (o, k, v) => (o[k] = v, true) });
  class Element {
    constructor() {
      this.style = {}; this.dataset = {}; this.children = []; this.options = []; this.value = '';
      this.width = 640; this.height = 360; this.hidden = false;
      this.events = {}; this.open = false;
      this.classList = { add: noop, remove: noop, toggle: noop, contains: () => false };
    }
    getContext() { return ctx; }
    get parentElement() { return new Element(); }
    get parentNode() { return new Element(); }
    querySelector() { return new Element(); }
    querySelectorAll() { return []; }
    appendChild(el) { this.children.push(el); return el; }
    append() {}
    prepend() {}
    add(el) { this.options.push(el); }
    addEventListener(type, fn) { (this.events[type] ||= []).push(fn); }
    showModal() { this.open = true; }
    close() { this.open = false; }
    focus() { this.focused = true; }
    select() { this.selected = true; }
    setAttribute() {}
    getAttribute() { return null; }
    closest() { return new Element(); }
    getBoundingClientRect() { return { width: 640, height: 360, left: 0, top: 0 }; }
    replaceChildren() { this.children = []; }
    removeAttribute() {}
    remove() {}
    insertBefore() {}
  }
  box.document.getElementById = id => {
    if (!nodes.has(id)) nodes.set(id, new Element());
    return nodes.get(id);
  };
  box.document.createElement = () => new Element();
  box.document.documentElement = new Element(); box.document.documentElement.lang = 'zh-Hans';
  box.document.querySelector = () => new Element();
  box.document.body = new Element(); box.document.readyState = 'loading';
  Object.assign(box, { matchMedia: () => ({ matches: false, addEventListener: noop }),
    addEventListener: noop, performance: { now: () => 0 }, devicePixelRatio: 1,
    IntersectionObserver: class { observe() {} disconnect() {} }, ResizeObserver: class { observe() {} },
    cancelAnimationFrame: noop, Option: Element });
  let source = fs.readFileSync(edition || 'src/12_ui.js', 'utf8').replace(/\r\n/g, '\n');
  if (edition) {
    source = [...source.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].at(-1)[1];
    source = source.slice(source.indexOf('/* ============================================================\n   JIZURA — editor UI'));
  }
  // Expose private import helpers only inside the test context.
  source = source.replace('J.uiApi = {', 'J.uiApi = { importProjectFile, mergeProject,');
  vm.runInContext(source, box, { filename: edition || 'src/12_ui.js' });
  return { box, nodes };
}
module.exports = { uiFixture };
