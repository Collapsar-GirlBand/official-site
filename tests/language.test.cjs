const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Read the actual TypeScript content without adding a second build tool.
const cache = new Map();
function load(relative) {
  const filename = path.resolve(__dirname, '..', relative);
  if (cache.has(filename)) return cache.get(filename);
  const module = { exports: {} };
  cache.set(filename, module.exports);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function('require', 'module', 'exports', code)(
    name => load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), `${name}.ts`))),
    module, module.exports,
  );
  return module.exports;
}

const { UI_TEXT } = load('content/ui.ts');
const { STORY_SCRIPTS } = load('content/stories.ts');
const { UI_EN, STORIES_EN, STORY_LINES_EN, MEMBER_NAMES } = load('content/english.ts');

test('every UI key exists in English and contains no Chinese', () => {
  for (const section of Object.keys(UI_TEXT)) {
    assert.deepEqual(Object.keys(UI_EN[section]), Object.keys(UI_TEXT[section]));
    for (const [key, value] of Object.entries(UI_EN[section])) {
      assert.equal(typeof value, 'string', `${section}.${key}`);
      assert.doesNotMatch(value, /\p{Script=Han}/u, `${section}.${key}`);
    }
  }
});

test('all story lines have English text with identical speakers, order and expressions', () => {
  assert.deepEqual(Object.keys(STORIES_EN), Object.keys(STORY_SCRIPTS));
  for (const [id, lines] of Object.entries(STORY_SCRIPTS)) {
    assert.equal(STORY_LINES_EN[id].length, lines.length, id);
    lines.forEach((line, index) => {
      const translated = STORIES_EN[id][index];
      assert.ok(translated.text?.trim(), `${id}:${index}`);
      assert.doesNotMatch(translated.text, /\p{Script=Han}/u);
      assert.deepEqual({ ...translated, text: line.text }, line);
      if (!['system', 'self'].includes(line.speakerId)) assert.ok(MEMBER_NAMES[line.speakerId]);
    });
  }
});
