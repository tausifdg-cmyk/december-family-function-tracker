'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const root = new URL('../', `file://${__filename}`);
const read = (name) => fs.readFileSync(new URL(name, root), 'utf8');

class ClassList {
  constructor(initial = []) { this.values = new Set(initial); }
  add(name) { this.values.add(name); }
  remove(name) { this.values.delete(name); }
  contains(name) { return this.values.has(name); }
  toggle(name, force) {
    const enabled = force === undefined ? !this.contains(name) : Boolean(force);
    if (enabled) this.add(name); else this.remove(name);
    return enabled;
  }
}

function verifyMarkup() {
  const html = read('index-production.html');
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'HTML must not contain duplicate IDs');
  for (const id of ['today', 'workout', 'food', 'progress', 'settings', 'pullRefresh', 'todayDetailsTitle', 'workoutHistory', 'foodHistory', 'progressList']) {
    assert.ok(ids.includes(id), `Missing required element #${id}`);
  }
  assert.doesNotMatch(html, /(?:todayDetails|workoutHistorySheet|foodHistorySheet|progressHistorySheet)" class="sheet-backdrop/);
  assert.match(html, /42 original demonstrations that work offline/);
}

function verifyNavigation() {
  const ids = ['today', 'workout', 'food', 'progress', 'settings'];
  const attributes = new WeakMap();
  const element = (id, isTab = false) => ({
    id: isTab ? `${id}-tab` : id,
    dataset: isTab ? { tab: id } : {},
    classList: new ClassList(id === 'today' ? ['active'] : []),
    hidden: id !== 'today',
    tabIndex: 0,
    setAttribute(name, value) {
      const map = attributes.get(this) || {};
      map[name] = String(value);
      attributes.set(this, map);
    },
    focus() {}
  });
  const tabs = ids.map((id) => element(id, true));
  const panels = ids.map((id) => element(id));
  const nav = { dataset: {}, setAttribute() {}, addEventListener() {} };
  const storage = new Map();
  const location = { hash: '' };
  const context = {
    console,
    location,
    history: { replaceState(_a, _b, hash) { location.hash = hash; } },
    sessionStorage: { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
    document: {
      readyState: 'complete',
      getElementById: (id) => panels.find((panel) => panel.id === id) || null,
      querySelector: (selector) => selector === '.tabs' ? nav : null,
      querySelectorAll: (selector) => selector.includes('.tab') ? tabs : selector === '.panel' ? panels : [],
      addEventListener() {}
    },
    addEventListener() {},
    dispatchEvent() {},
    scrollTo() {}
  };
  context.window = context;
  vm.runInNewContext(read('navigation-fix.js'), context, { filename: 'navigation-fix.js' });
  for (const id of ids) {
    context.MyBodyNavigation.select(id, { updateHash: false, scroll: false });
    assert.equal(panels.filter((panel) => !panel.hidden).length, 1, 'Exactly one tab panel must be visible');
    assert.equal(panels.find((panel) => panel.id === id).hidden, false, `${id} panel should be visible`);
    assert.equal(tabs.find((tab) => tab.dataset.tab === id).classList.contains('active'), true, `${id} tab should be active`);
  }
}

function verifyExerciseAliases() {
  const context = { window: {} };
  vm.runInNewContext(read('exercise-library.js'), context, { filename: 'exercise-library.js' });
  const library = context.window.MyBodyExerciseLibrary;
  assert.equal(library.exercises.length, 42, 'Offline catalog size should remain stable');
  assert.equal(library.find('Lever Pec Deck Fly').id, 'dumbbell-chest-fly', 'ExerciseDB sample name should resolve offline');
}

async function runBuildHarness(remoteBuild) {
  const buildBadge = { textContent: '' };
  const label = { textContent: '' };
  const pull = {
    classList: new ClassList(),
    style: { values: {}, setProperty(name, value) { this.values[name] = value; } },
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    querySelector: (selector) => selector === 'span' ? label : null
  };
  const listeners = new Map();
  let replacedWith = '';
  let requestOptions;
  const location = { href: 'https://example.test/app/#today', replace(value) { replacedWith = value; } };
  const context = {
    console,
    URL,
    location,
    navigator: {},
    scrollY: 0,
    fetch: async (_url, options) => {
      requestOptions = options;
      return { ok: true, json: async () => ({ build: String(remoteBuild) }) };
    },
    document: {
      readyState: 'complete',
      body: { classList: new ClassList() },
      documentElement: { dataset: {} },
      querySelector: (selector) => selector === 'meta[name="app-build"]' ? { content: '172' } : null,
      getElementById: (id) => id === 'buildBadge' ? buildBadge : id === 'pullRefresh' ? pull : null,
      addEventListener: (type, handler, options) => listeners.set(type, { handler, options })
    },
    clearTimeout() {},
    setTimeout(callback, delay) { if (delay <= 300) callback(); return 1; }
  };
  context.window = context;
  vm.runInNewContext(read('build-live.js'), context, { filename: 'build-live.js' });
  assert.equal(buildBadge.textContent, 'Build #172', 'Badge must report the running shell build');
  assert.equal(listeners.get('touchmove').options.passive, false, 'Pull gesture must be able to suppress iOS bounce');
  await context.MyBodyBuild.check();
  assert.equal(requestOptions.cache, 'no-store', 'Build check must bypass HTTP caches');
  return { label: label.textContent, replacedWith };
}

async function main() {
  verifyMarkup();
  verifyNavigation();
  verifyExerciseAliases();
  const current = await runBuildHarness(172);
  assert.match(current.label, /Up to date/);
  assert.equal(current.replacedWith, '');
  const newer = await runBuildHarness(173);
  assert.match(newer.label, /Build #173 found/);
  assert.match(newer.replacedWith, /build=173/);
  console.log('Production UI smoke checks passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
