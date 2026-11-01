// Run against an isolated headless Chromium profile; never touches saved browser data.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const browserCache = path.join(os.homedir(), 'AppData/Local/ms-playwright');
const browserDir = fs.existsSync(browserCache) && fs.readdirSync(browserCache).filter(n => n.startsWith('chromium_headless_shell-')).sort().at(-1);
const chrome = process.env.CHROME_PATH || (browserDir && path.join(browserCache, browserDir, 'chrome-headless-shell-win64/chrome-headless-shell.exe'));
if (!chrome) throw new Error('Set CHROME_PATH to a headless Chromium executable.');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'jizura-preview-'));
const child = spawn(chrome, ['--headless', '--no-sandbox', '--remote-debugging-port=0', '--user-data-dir=' + profile, '--window-size=1440,1000', 'about:blank']);
let ws, next = 0;
const pending = new Map(), errors = [];
const delay = ms => new Promise(r => setTimeout(r, ms));
function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++next; pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
}
(async () => {
  const url = await new Promise((resolve, reject) => { let out = ''; const timer = setTimeout(() => reject(new Error('Chromium startup timed out: ' + out)), 15000); child.on('error', reject); child.on('exit', code => reject(new Error('Chromium exited ' + code + ': ' + out))); child.stderr.on('data', data => { out += data; const m = out.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(timer); resolve(m[1]); } }); });
  ws = new WebSocket(url);
  await new Promise(resolve => ws.addEventListener('open', resolve));
  ws.addEventListener('message', event => {
    const m = JSON.parse(event.data);
    if (m.id) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(m.error) : p.resolve(m.result); }
    if (m.method === 'Runtime.exceptionThrown') { errors.push(m.params.exceptionDetails); console.log('PAGE ERROR', JSON.stringify(m.params.exceptionDetails)); }
  });
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const call = (method, params) => send(method, params, sessionId);
  await call('Runtime.enable'); await call('Page.enable');
  await call('Page.navigate', { url: 'file:///' + path.join(root, process.argv[2] || 'index.html').replaceAll('\\', '/') });
  await delay(3500);
  const evaluate = async expression => (await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result;
  const state = async () => (await evaluate(`(() => {
    const c = document.getElementById('view'), d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let visible = 0; for(let i=0;i<d.length;i+=4) if(d[i+3] && d[i]+d[i+1]+d[i+2]>60) visible++;
    return {plan:!!J.ui?.plan,t:J.ui?.t,playing:J.ui?.playing,visible};
  })()`)).value;
  async function checkPlayback(label) {
    const before = await state();
    assert.ok(before.plan && before.visible > 100, label + ': preview must contain visible content');
    await evaluate(`document.getElementById('btnPlay').click()`);
    await delay(1200);
    const after = await state();
    assert.ok(after.playing && after.t > before.t + 0.2, label + ': playback clock must advance');
    assert.ok(after.visible > 100, label + ': playing frame must contain visible content');
    await evaluate(`J.uiApi.pause()`);
    console.log('PASS', label, JSON.stringify({before,after}));
  }
  await checkPlayback('initial preview');
  const imported = await evaluate(`J.uiApi.importProjectFile(JSON.stringify(J.defaultProject()))`);
  assert.equal(imported.value, true, 'sample project import succeeds');
  await evaluate(`J.uiApi.seek(J.ui.plan.cuts.find(c=>c.line>=0).start+0.5)`);
  await delay(500);
  await checkPlayback('imported sample');
  assert.equal(errors.length, 0, 'no browser runtime errors');
  process.exitCode = errors.length ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => { ws?.close(); child.kill(); });
