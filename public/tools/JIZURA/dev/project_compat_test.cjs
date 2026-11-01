const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { engine } = require('./engine_fixture.cjs');
const source = fs.readFileSync('src/12_ui.js', 'utf8');
const slice = (a, b) => source.slice(source.indexOf(a), source.indexOf(b, source.indexOf(a)));
const plain = x => JSON.parse(JSON.stringify(x));
function fixture() {
  const box = engine(), writes = [], messages = [], notices = [];
  box.console = { error() {}, warn() {} };
  box.window.addEventListener = () => {};
  box.$ = () => null;
  box.localStorage.setItem = (key, value) => writes.push([key, value]);
  vm.runInContext(slice('function mergeProject(', 'const SET_UI')
    + slice('function loadLocal(', '/* ---------------- planning')
    + slice('const audioExt = ', '/* ---------------- wiring'), box);
  const project = box.mergeProject({ lyrics: '原有歌词', timingOrder: 2 });
  Object.assign(box, {
    S: { project, plan: box.J.plan(project, null), t: 2, playing: false },
    ED: { undo: ['old undo'], redo: ['old redo'] }, H: { list: ['old look'], i: 0 },
    fontKey: 'old font', LS_KEY: 'project',
    audioLike: () => null, edSnap: () => JSON.stringify({ project: box.S.project, t: box.S.t }),
    pause() { box.S.playing = false; }, stopTap() {}, syncUI() {},
    replan() { box.S.plan = box.J.plan(box.S.project, null); box.autosave(); box.flushSave(); },
    commit() { box.H.list = ['new look']; box.H.i = 0; },
    updateHist() {}, updateEditBtns() {}, saveUndoHistory() {}, restoreFonts: async () => {},
    showMsg: m => messages.push(m), showProjectImportError: m => messages.push(m), toast: m => notices.push(m),
    loadAudioFile: async f => { box.audioLoaded = f.name; return true; },
  });
  return { box, writes, messages, notices };
}
const file = value => ({ text: async () => typeof value === 'string' ? value : JSON.stringify(value) });

test('legacy files, BOM and history wrappers open; arbitrary JSON and future formats are rejected', () => {
  const { box } = fixture();
  assert.equal(box.J.parseProjectFile('\uFEFF{"lyrics":"旧歌词"}').lyrics, '旧歌词');
  assert.equal(box.J.parseProjectFile('{"project":{"lyrics":"旧歌词"}}').lyrics, '旧歌词');
  for (const text of ['null', '[]', '{}', '{', '{"lyrics":"x","version":2}']) {
    assert.throws(() => box.J.parseProjectFile(text));
  }
});

test('missing nested settings are restored without mutating input or losing manual work', () => {
  const { box } = fixture(), notices = [];
  const input = { lyrics: '旧歌词', timingOrder: 2, style: 'ocean', aspect: '4:3', quality: 'smart',
    timing: { lineTimes: { 0: '1.25' } }, deletedCards: { gaps: null },
    colors: { enabled: true, bg: '#111C55' }, overrides: { 0: { lock: true, lockedCuts: [
      { utext: '旧歌词', layout: 'center', enter: 'blur', exit: 'blur', hold: 'still' }
    ] } } };
  const before = JSON.stringify(input), p = box.mergeProject(input, notices);
  assert.equal(p.style, 'ocean'); assert.equal(p.aspect, '4:3'); assert.equal(p.quality, 'smart');
  assert.equal(p.timing.lineTimes[0], 1.25); assert.equal(p.colors.bg, '#111C55');
  assert.deepEqual(plain(p.deletedCards.gaps), {});
  assert.deepEqual(plain(p.overrides), input.overrides);
  assert.equal(JSON.stringify(input), before);
  assert.ok(box.J.plan(p, null).cuts.length);
});

test('unavailable styles and effects fall back, retaining original references for recovery', () => {
  const { box } = fixture(), notices = [];
  const p = box.mergeProject({ lyrics: '旧歌词', style: 'removed_style',
    overrides: { 0: { layout: 'removed_layout', enter: 'removed_enter',
      decor: ['removed_decor'], lockedCuts: [{ layout: 'removed_layout' }] } } }, notices);
  assert.equal(p.style, 'noir'); assert.equal(p.compatibility.originalStyle, 'removed_style');
  assert.equal(p.overrides[0].layout, 'center');
  assert.equal(p.compatibility.unsupported['overrides.0.enter'], 'removed_enter');
  assert.ok(notices.length >= 3); assert.ok(box.J.plan(p, null).cuts.length);
  const again = box.mergeProject(plain(p));
  assert.deepEqual(plain(again.compatibility), plain(p.compatibility));
});

test('old LRC order migrates times, overrides and export range together exactly once', () => {
  const { box } = fixture();
  const p = box.mergeProject({ lyrics: '[00:01]甲\n无时间歌词\n[00:03]乙',
    timing: { lineTimes: { 1: 3, 2: 2 } }, overrides: { 2: { lock: true } }, exportRange: { from: 2, to: 2 } });
  assert.equal(p.timing.lineTimes[1], 2); assert.equal(p.timing.lineTimes[2], 3);
  assert.equal(p.overrides[1].lock, true); assert.equal(p.exportRange.from, 1);
  assert.deepEqual(plain(box.mergeProject(plain(p))), plain(p));
});

test('legacy custom palette behaviour and comma-separated decorations retain their meaning', () => {
  const { box } = fixture();
  const custom = plain(box.J.defaultCustomStyle()); delete custom.strictPalette;
  const decor = box.J.order('decor').slice(0, 2).join(',');
  const p = box.mergeProject({ lyrics: '旧歌词', style: 'custom', customStyle: custom,
    overrides: { 0: { decor, params: { layout: 'effect-specific-value' } } } });
  assert.equal(p.customStyle.strictPalette, false);
  assert.equal(box.J.resolveStyle(p).strictPalette, false);
  assert.equal(p.overrides[0].decor, decor);
  assert.equal(p.overrides[0].params.layout, 'effect-specific-value');
});

test('invalid files preserve project, history, plan and storage', async () => {
  const { box, writes, messages } = fixture(), previous = box.S.project, plan = box.S.plan;
  assert.equal(await box.importProjectFile(file('{')), false);
  assert.equal(box.S.project, previous); assert.equal(box.S.plan, plan);
  assert.deepEqual(box.ED.undo, ['old undo']); assert.equal(writes.length, 0);
  assert.match(messages.at(-1), /解析项目.*JSON.*当前项目已保留/);
});

test('UI failure rolls back project and both histories without persisting the failed import', async () => {
  const { box, writes, messages } = fixture(), previous = box.S.project, plan = box.S.plan;
  box.syncUI = () => { if (box.S.project !== previous) throw new Error('synthetic UI failure'); };
  assert.equal(await box.importProjectFile(file({ lyrics: '新歌词' })), false);
  assert.equal(box.S.project, previous); assert.equal(box.S.plan, plan); assert.equal(box.S.t, 2);
  assert.deepEqual(box.ED.undo, ['old undo']); assert.deepEqual(box.ED.redo, ['old redo']);
  assert.deepEqual(box.H.list, ['old look']); assert.equal(box.H.i, 0);
  assert.equal(writes.length, 0); assert.match(messages.at(-1), /刷新界面.*synthetic UI failure/);
  assert.match(messages.at(-1), /不能据此判定为项目格式不兼容/);
});

test('import error text names the failing UI section when that context is available', async () => {
  const { box, messages } = fixture(), original = box.S.project;
  box.syncUI = () => {
    if (box.S.project !== original) throw Object.assign(new Error('synthetic style failure'), { projectSection: '风格列表' });
  };
  assert.equal(await box.importProjectFile(file({ lyrics: '新歌词' })), false);
  assert.match(messages.at(-1), /无法打开项目（风格列表）.*synthetic style failure/);
});

test('successful imports persist only after UI succeeds, keep undo and tolerate missing assets', async () => {
  const { box, writes, notices } = fixture();
  box.restoreFonts = async () => { throw new Error('missing font'); };
  assert.equal(await box.importProjectFile(file({ lyrics: '新歌词', style: 'removed_style' })), true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(box.S.project.lyrics, '新歌词'); assert.equal(writes.length, 1);
  assert.equal(JSON.parse(box.ED.undo[0]).project.lyrics, '原有歌词');
  assert.ok(notices.some(s => /旧风格/.test(s)));
  assert.ok(notices.some(s => /重新选择/.test(s)));
});

test('failure after replanning never autosaves a partial project or consumes previous history', async () => {
  const { box, writes } = fixture(), previous = box.S.project, plan = box.S.plan;
  box.commit = () => { box.H.list = ['partial look']; throw new Error('commit failed'); };
  assert.equal(await box.importProjectFile(file({ lyrics: '新歌词' })), false);
  assert.equal(box.S.project, previous); assert.equal(box.S.plan, plan);
  assert.deepEqual(box.H.list, ['old look']); assert.equal(writes.length, 0);
});

test('handleDroppedFiles automatically recognizes audio alone, JSON project alone, and both together', async () => {
  const { box, notices } = fixture();
  const makeFile = (name, type, content) => ({
    name, type, size: 100,
    text: async () => typeof content === 'string' ? content : JSON.stringify(content),
    slice: () => ({ text: async () => typeof content === 'string' ? content : JSON.stringify(content) })
  });

  // 1. Drop audio alone
  const audioFile = makeFile('song.mp3', 'audio/mpeg', '');
  assert.equal(await box.handleDroppedFiles([audioFile]), true);
  assert.equal(box.audioLoaded, 'song.mp3');

  // 2. Drop JSON project alone (case-insensitive extension .JSON)
  const jsonFile = makeFile('my_project.JSON', 'application/json', { lyrics: '拖入JSON新歌词' });
  assert.equal(await box.handleDroppedFiles([jsonFile]), true);
  assert.equal(box.S.project.lyrics, '拖入JSON新歌词');

  // 3. Drop BOTH audio and JSON together
  box.audioLoaded = null;
  const project2 = makeFile('project2.json', 'application/json', { lyrics: '双文件歌词' });
  const audio2 = makeFile('track.wav', 'audio/wav', '');
  assert.equal(await box.handleDroppedFiles([project2, audio2]), true);
  assert.equal(box.S.project.lyrics, '双文件歌词');
  assert.equal(box.audioLoaded, 'track.wav');
  assert.ok(notices.some(n => n.includes('project2.json') && n.includes('track.wav')));

  // 4. Drop exported AE composition plan JSON (reconstructs lyrics from lines)
  const aePlan = makeFile('comp_ae.json', 'application/json', {
    lines: [{ src: '第一行歌词' }, { src: '第二行歌词' }],
    title: 'AE曲名',
    artist: 'AE歌手'
  });
  assert.equal(await box.handleDroppedFiles([aePlan]), true);
  assert.equal(box.S.project.lyrics, '第一行歌词\n第二行歌词');
  assert.equal(box.S.project.title, 'AE曲名');

  // 5. Drop unrecognized file (e.g. random binary / zip)
  const unknownFile = makeFile('archive.zip', 'application/zip', 'binary data');
  assert.equal(await box.handleDroppedFiles([unknownFile]), false);
  assert.ok(notices.some(n => /対応ファイル|支持的文件/.test(n)));
});
