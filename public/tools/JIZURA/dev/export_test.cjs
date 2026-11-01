/* Regression checks for export quality selection; no browser or device access. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const configs = [];
const J = {
  keyMode: p => p.keyBg === 'green' || p.keyBg === 'black' ? p.keyBg : null,
  outputSize: p => [p.width || 1920, p.height || 1080],
};
const context = {
  J, Map, Uint32Array, TextEncoder,
  VideoEncoder: { isConfigSupported: async cfg => {
    configs.push(cfg);
    return { supported: true };
  } },
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/11_export.js'), 'utf8'), context);
const plan = {
  fps: 30, duration: 60, cuts: [{}],
  style: { texture: { grain: 1, scan: 0, paper: 0 } }, fx: { texture: 1 },
};

async function main() {
  const grain = J.analyzeComplexity({ quality: 'smart' }, plan);
  assert.equal(grain.grainVal, 1);
  assert.equal(grain.category, 'high_grain');
  for (const keyBg of ['green', 'black']) {
    assert.equal(J.analyzeComplexity({ quality: 'smart', keyBg }, plan).grainVal, 0);
  }
  assert.equal(J.videoBitrate(1920, 1080, 30), J.rawVideoBitrate(1920, 1080, 30, 'high'));
  assert.equal(J.analyzeComplexity({}, plan).targetBitrate, J.rawVideoBitrate(1920, 1080, 30, 'high'));
  for (const [width, height] of [[1280, 720], [1920, 1080], [2560, 1440], [3840, 2160]]) {
    for (const fps of [24, 30, 60]) {
      for (const quality of ['compact', 'smart', 'standard', 'high', 'max']) {
        const project = { width, height, quality, fps };
        const currentPlan = { ...plan, fps };
        const analysis = J.analyzeComplexity(project, currentPlan);
        const bitrate = J.videoBitrate(width, height, fps, quality, project, currentPlan);
        assert.equal(analysis.targetBitrate, bitrate, `${width}x${height}/${fps}/${quality}`);
        const part = J.analyzeComplexity(project, currentPlan, { t0: 10, t1: 25 });
        assert.equal(part.optSizeMB, analysis.optSizeMB / 4);
      }
    }
  }
  // Explicit smart requests must not inherit a different project's selected quality.
  assert.equal(J.videoBitrate(1920, 1080, 30, 'smart', { quality: 'high' }, plan), grain.targetBitrate);
  const bitrate = 17418240;
  const attempts = await J.videoAttempts(1920, 1080, 30, bitrate, true);
  assert.equal(attempts.length, 5);
  assert.ok(attempts.some(a => a.hw === 'prefer-software'));
  assert.ok(attempts.some(a => a.mux === 'vp9'));
  assert.ok(attempts.every(a => a.cfg.bitrate === bitrate));
  assert.ok(configs.every(c => c.bitrate === bitrate));
  context.VideoEncoder.isConfigSupported = async cfg => ({ supported: !cfg.bitrateMode });
  const fallback = await J.videoAttempts(1920, 1080, 30, bitrate, true);
  assert.ok(fallback.length > 0);
  assert.ok(fallback.every(a => a.cfg.bitrate === bitrate && !a.cfg.bitrateMode));
  // Check the public export entry point before any browser rendering is needed.
  const stop = new Error('configuration captured');
  J.videoAttempts = async (w, h, fps, br) => { assert.equal(br, bitrate); throw stop; };
  await assert.rejects(J.exportMP4({ plan, project: {} }), e => e === stop);
  console.log('Export quality regression checks passed (60 size/fps/quality combinations).');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
