// NODE_PATH must expose @napi-rs/canvas. Native Canvas rendering; no browser required.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { createCanvas, Path2D, GlobalFonts } = require('@napi-rs/canvas');
const noop = () => {};
const fontFile = 'C:/Windows/Fonts/simsun.ttc';
if (fs.existsSync(fontFile)) GlobalFonts.registerFromPath(fontFile, 'PreviewSerif');
const root = path.resolve(__dirname, '..'), out = path.resolve(process.argv[2] || path.join(root, 'build/xxt2-preview'));
fs.mkdirSync(out, { recursive: true });
const element = tag => tag === 'canvas' ? createCanvas(1, 1) : { style: {}, appendChild: noop, addEventListener: noop };
const box = { console, Uint8Array, Uint8ClampedArray, setTimeout: noop, clearTimeout: noop, Path2D,
  document: { createElement: element, addEventListener: noop, querySelectorAll: () => [], getElementById: () => null,
    head: { appendChild: noop }, fonts: { ready: Promise.resolve(), load: async () => [] } },
  localStorage: { getItem: () => null }, requestAnimationFrame: noop,
};
box.window = box; vm.createContext(box);
for (const name of fs.readdirSync(path.join(root, 'src')).filter(n => n.endsWith('.js') && n !== '12_ui.js').sort()) {
  vm.runInContext(fs.readFileSync(path.join(root, 'src', name), 'utf8'), box, { filename: name });
}
const { J } = box;
J.fontCSS = (key, px) => `${px.toFixed(2)}px "PreviewSerif", "SimSun", serif`;
const palette = { bg: '#0C1421', fg: '#E1E7EC', sub: '#8C9EAE', accent: '#C8BA98', accent2: '#7897B5',
  ink: '#142133', dim: '#344252', ghostA: '#8C9EAE', ghostB: '#7897B5' };
const layouts = ['xxtStarLedger', 'xxtFateLetter', 'xxtDistantTwins'];
const renderer = new J.Renderer(), sheet = createCanvas(1440, 1320), sx = sheet.getContext('2d');
sx.fillStyle = '#080E18'; sx.fillRect(0, 0, sheet.width, sheet.height);
let frames = 0;
for (let i = 0; i < layouts.length; i++) {
  for (const [j, aspect] of ['16:9', '9:16'].entries()) {
    const p = J.defaultProject(); p.lyrics = '参商两不见\n星河不问归期'; p.aspect = aspect; p.titleCard = false; p.seed = 31;
    p.timing = { ...p.timing, offset: 0, snap: false, lineTimes: { 0: 0, 1: 4 } };
    p.fx = { ...p.fx, motion: 0.3, glitch: 0, chroma: 0, texture: 0, hud: 'off', decor: 1 };
    const ov = { layout: layouts[i], single: true, enter: 'xxtDewLetters', exit: 'xxtUnsentSigh', hold: 'xxtSiderealBreath',
      decor: ['xxtStarLot', 'xxtLunarMargin', 'xxtUnfinishedThread'], bg: 'xxtSilentAtlas', cam: 'xxtLongWatch', treat: 'none', trans: 'none' };
    p.overrides = { 0: ov, 1: { ...ov } };
    const plan = J.plan(p, null); plan.events = []; plan.style.schemes = plan.style.schemes.map(() => palette);
    plan.style.texture = { grain: 0, paper: 0, scan: 0 }; plan.style.glow = 0; plan.style.ghost = 0;
    const scale = 0.4, c = createCanvas(Math.round(plan.W * scale), Math.round(plan.H * scale)), ctx = c.getContext('2d');
    for (const t of [0, 0.12, 0.4, 1, 2, 3.65, 3.99]) {
      renderer.frame(ctx, plan, t, { scale, fast: true }); frames++;
    }
    renderer.frame(ctx, plan, 1.7, { scale });
    fs.writeFileSync(path.join(out, `${layouts[i]}-${aspect.replace(':', 'x')}.png`), c.toBuffer('image/png'));
    const cellX = i * 480, cellY = j * 660, maxW = 452, maxH = 580;
    const fit = Math.min(maxW / c.width, maxH / c.height), dw = c.width * fit, dh = c.height * fit;
    sx.drawImage(c, cellX + (480 - dw) / 2, cellY + 48 + (580 - dh) / 2, dw, dh);
    sx.font = '20px "PreviewSerif", serif'; sx.fillStyle = palette.fg; sx.textAlign = 'center';
    sx.fillText(J.LAYOUTS[layouts[i]].name + ' · ' + aspect, cellX + 240, cellY + 30);
  }
}
// All three new ornaments also support a null lyric bounding box.
const p = J.defaultProject(), plan = J.plan(p, null), cut = plan.cuts[0];
const cv = createCanvas(960, 540), ctx = cv.getContext('2d');
const env = renderer.makeEnv(ctx, plan, cut, palette, { pass: 'main', lt: 1, ltb: 1, t: 1, step: 24, scale: 0.5 });
for (const key of ['xxtStarLot', 'xxtUnfinishedThread', 'xxtLunarMargin']) J.DECOR[key].draw(env, null, { right: true, low: true, r: 0.5 });
fs.writeFileSync(path.join(out, 'contact-sheet.png'), sheet.toBuffer('image/png'));
// Verify real font metrics keep every main lyric item inside the resting safe area.
const originalDraw = J.mainDraw;
let measured = 0;
J.mainDraw = (env, it) => {
  const bounds = J.itemBox(it);
  if (![bounds.x0, bounds.x1, bounds.y0, bounds.y1].every(Number.isFinite)
    || bounds.x0 < env.W * 0.045 || bounds.x1 > env.W * 0.955
    || bounds.y0 < env.H * 0.045 || bounds.y1 > env.H * 0.955) {
    throw new Error(`Unsafe lyric bounds: ${env.cut.layout} ${env.W}x${env.H} ${JSON.stringify(it.text)} ${JSON.stringify(bounds)}`);
  }
  measured++;
  return originalDraw(env, it);
};
for (const layout of layouts) for (const aspect of ['16:9', '9:16', '1:1', '21:9']) {
  for (const text of ['星', '参商两不见', 'Across the silent sky', '星河不问归期而我仍在长夜里等待你的回音', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ']) {
    if (!J.LAYOUTS[layout].fits(J.glyphCount(text))) continue;
    const p = J.defaultProject(); p.lyrics = text; p.aspect = aspect; p.titleCard = false;
    p.overrides = { 0: { layout, single: true, enter: 'cut', exit: 'cut', hold: 'still', decor: [], bg: 'none', treat: 'none', cam: 'push' } };
    const plan = J.plan(p, null), cut = plan.cuts.find(c => c.line === 0);
    const cv = createCanvas(720, 720), ctx = cv.getContext('2d');
    const env = renderer.makeEnv(ctx, plan, cut, palette, { pass: 'main', lt: cut.dur * 0.5, ltb: cut.dur * 0.5, t: cut.start + cut.dur * 0.5, step: 24, scale: 1 });
    J.LAYOUTS[layout].render(env);
  }
}
J.mainDraw = originalDraw;
console.log(`Rendered ${frames} actual Canvas frames, checked ${measured} lyric bounds, and saved six aspect previews: ${out}`);
