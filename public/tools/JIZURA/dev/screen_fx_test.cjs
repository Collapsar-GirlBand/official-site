const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/12_ui.js', 'utf8');
function fn(name, next) { return source.slice(source.indexOf('function ' + name + '('), source.indexOf(next, source.indexOf('function ' + name + '('))); }
const elements = new Map();
function el(id) {
  if (!elements.has(id)) elements.set(id, { width: 640, hidden: false, attrs: {}, classes: {}, getContext() { return { id }; }, setAttribute(k,v) { this.attrs[k]=v; }, classList: { toggle(k,v) { el(id).classes[k]=v; } } });
  return elements.get(id);
}
const calls = [];
const state = { plan: {W:1280, H:720}, project: {events:[{type:'flash',t:1}]}, t:1.1, playing:true, slow:false, renderer:{frame(ctx, plan, t, opt) {calls.push({ctx,plan,t,opt});}} };
const context = vm.createContext({S:state, $:el, document:{querySelector:()=>({})}, performance:{now:()=>1}, pause(){}, selectFxEvent(){}, renderFxLibrary(){}, renderScreenFxEvents(){}, drawCenterGuide(){}, updateTimeUI(){}, drawTimeline(){}, updateCutInfo(){}, closeCutPick(){}, hideEventInspector(){}, syncFxModeUI(){}, sizeViewport(){}});
el('fxGlobalControls').appendChild = () => {};
state.project.timing = {snap:true}; state.fxCompare = true;
vm.runInContext(fn('draw', 'function tick(') + '\n' + fn('setScreenFxMode', 'let screenFxListSignature'),context);
context.draw(); assert.equal(calls.length,1);
const projectBefore = JSON.stringify(state.project);
context.setScreenFxMode(true); calls.length=0; context.draw();
assert.equal(calls.length,2); assert.equal(calls[0].t,calls[1].t); assert.equal(calls[0].plan,calls[1].plan);
assert.equal(calls[1].opt.noEvents,true); assert.equal(calls[0].opt.noEvents,false);
assert.equal(calls[0].opt.fast,calls[1].opt.fast); assert.equal(el('app').classes['screen-fx-mode'],true);
context.setScreenFxMode(false); calls.length=0; context.draw(); assert.equal(calls.length,1);
assert.equal(JSON.stringify(state.project),projectBefore);
state.exporting=true; context.setScreenFxMode(true); assert.equal(state.screenFxMode,false);
const html = fs.readFileSync('app/body.html','utf8');
assert.match(html,/screen-fx-panel fx-only/); assert.match(html,/compare-base compare-only/);
const css = fs.readFileSync('app/style.css','utf8');
assert.match(css,/\.screen-fx-mode #cutInfo, \.screen-fx-mode #cutPick \{ display: none !important/);
const renderer = fs.readFileSync('src/09_render.js','utf8');
assert.match(renderer,/const events = opt.noEvents \? \[\] : plan.events/);
assert.match(renderer,/const active = \(opt.noEvents \? \[\] : plan.events\)/);
assert.match(renderer,/noEvents: opt.noEvents/);
console.log('PASS: shared preview clock, event-only baseline, mode visibility, project preservation, export guard');
