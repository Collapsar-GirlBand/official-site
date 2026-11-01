const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { engine } = require('./engine_fixture.cjs');
const ui = fs.readFileSync('src/12_ui.js', 'utf8');
const slice = (a, b) => ui.slice(ui.indexOf(a), ui.indexOf(b, ui.indexOf(a)));
function fixture() {
  const box = engine(), nodes = new Map(), classes = new Set(), source = { open: true };
  const el = id => {
    if (!nodes.has(id)) nodes.set(id, { hidden: true, value: '', classList: { add: c => classes.add(c), remove: c => classes.delete(c) } });
    return nodes.get(id);
  };
  const project = box.J.defaultProject();
  Object.assign(box, { S: { project, plan: box.J.plan(project, null), t: 0, mode: 'easy', playing: true }, $: el,
    pause() { box.S.playing = false; }, seek(t) { box.S.t = t; }, updateCutInfo() {}, fillCutPick() {},
    setScreenFxMode(on) { box.S.screenFxMode = on; box.closeCutPick(); } });
  box.document.querySelector = () => source;
  vm.runInContext(slice('const CHIP_GROUPS =', 'function cutQuietSlot(')
    + slice('function closeCutPick(', 'function fillCutPick('), box);
  return { box, el, classes, source };
}
test('selecting a shot opens the full-row editor in easy mode without changing project data', () => {
  const { box, el, classes, source } = fixture(), before = JSON.stringify(box.S.project);
  const shot = box.S.plan.cuts.find(c => box.lyricCutK(c) >= 0);
  box.selectShot(shot);
  assert.equal(box.S.playing, false); assert.equal(el('shotEditor').hidden, false);
  assert.equal(el('cutPick').hidden, false); assert.ok(classes.has('shot-editing')); assert.equal(source.open, false);
  assert.equal(box.editingCut().index, shot.index); assert.equal(JSON.stringify(box.S.project), before);
});
test('editing remains pinned when playback moves and resolves the new cut object after replanning', () => {
  const { box } = fixture(), shots = box.S.plan.cuts.filter(c => box.lyricCutK(c) >= 0);
  box.selectShot(shots[0]); box.S.t = shots.at(-1).start + 0.1;
  assert.equal(box.editingCut().index, shots[0].index);
  const old = box.editingCut(); box.S.plan = box.J.plan(box.S.project, null);
  assert.notEqual(box.editingCut(), old); assert.equal(box.editingCut().index, old.index);
});
test('changing shots keeps the chosen category and resets search; repeat category clicks keep the panel open', () => {
  const { box, el } = fixture(), shots = box.S.plan.cuts.filter(c => box.lyricCutK(c) >= 0);
  box.selectShot(shots[0]); box.toggleCutPick('decor', shots[0], box.lyricCutK(shots[0]));
  el('cutPickFilter').value = 'old search'; box.selectShot(shots[1]);
  assert.equal(vm.runInContext('cutPick.g', box), 'decor'); assert.equal(el('cutPickFilter').value, '');
  box.toggleCutPick('decor', shots[1], box.lyricCutK(shots[1])); assert.equal(el('shotEditor').hidden, false);
});
test('closing releases the pinned target and export/tap guards prevent opening or seeking', () => {
  const { box, el, classes } = fixture(), shot = box.S.plan.cuts.find(c => box.lyricCutK(c) >= 0);
  box.selectShot(shot); box.closeCutPick(); assert.equal(el('shotEditor').hidden, true); assert.ok(!classes.has('shot-editing'));
  const t = box.S.t; box.S.exporting = true; box.selectShot(shot); assert.equal(el('shotEditor').hidden, true); assert.equal(box.S.t, t);
  box.S.exporting = false; box.S.tap = true; box.selectShot(shot); assert.equal(el('shotEditor').hidden, true);
});
test('selecting a shot from the effects workspace returns to shot editing', () => {
  const { box, el } = fixture(), shot = box.S.plan.cuts.find(c => box.lyricCutK(c) >= 0);
  box.S.screenFxMode = true; box.selectShot(shot);
  assert.equal(box.S.screenFxMode, false); assert.equal(el('shotEditor').hidden, false);
});
test('generated title cards remain selectable for card actions', () => {
  const { box, el } = fixture(); box.S.project.title = 'Title'; box.S.project.timing.offset = 2;
  box.S.plan = box.J.plan(box.S.project, null);
  const title = box.S.plan.cuts.find(c => c.layout === 'title'); assert.ok(title);
  box.selectShot(title); assert.equal(el('shotEditor').hidden, false); assert.equal(box.editingCut().layout, 'title');
});
