// Wave 0 guard rails (no browser needed):   node test/unit/foundation.mjs
//  - CH9   GameScene's registries: unique names, a free order per ticker
//  - CH10  mixins never replace a method (helper + a scan of the real mixin objects)
//  - CH11  content ids are defined once; tile ids are unique and inside their reserved block
//  - CH13  listen() removes its bus listener when the scene shuts down
//  - CH2   ui holds
//  - AU02  every sound / music / ambience name used in src/ exists in src/audio
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { bus, listen } from '../../src/systems/bus.js';
import { ui } from '../../src/systems/ui.js';
import { mixin } from '../../src/util.js';
import { registerSpawner, registerTicker, registerListener, SPAWNERS, TICKERS, LISTENERS, tickerOrder } from '../../src/scenes/gameHooks.js';
import { TILE, TILE_BLOCKS, SOLID_TILES, TILE_COUNT } from '../../src/config.js';

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('  ok   ' + name); };
const SRC = new URL('../../src/', import.meta.url).pathname;
const read = (rel) => fs.readFileSync(SRC + rel, 'utf8');

const TABLES = ['ITEMS', 'ENEMIES', 'MAPS', 'NPC_DEFS', 'SCRIPTS', 'QUESTS', 'TARGETS'];

function srcFiles(root) {
  const out = [];
  (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith('.js')) out.push(p); } })(root);
  return out;
}

// Keys at depth 1 of the object literal whose `{` is at s[open]. Skips strings, template literals and comments.
function literalKeys(s, open) {
  const keys = [];
  let depth = 0, i = open, expectKey = true;
  while (i < s.length) {
    const c = s[i];
    if (c === '/' && s[i + 1] === '/') { i = s.indexOf('\n', i); if (i < 0) break; continue; }
    if (c === '/' && s[i + 1] === '*') { i = s.indexOf('*/', i) + 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; let j = i + 1;
      while (j < s.length && s[j] !== q) { if (s[j] === '\\') j++; j++; }
      if (depth === 1 && expectKey && q !== '`' && /^\s*:/.test(s.slice(j + 1, j + 40))) keys.push(s.slice(i + 1, j));
      i = j + 1; expectKey = false; continue;
    }
    if (c === '{' || c === '[' || c === '(') { depth++; i++; expectKey = depth === 1; continue; }
    if (c === '}' || c === ']' || c === ')') { depth--; i++; if (depth === 0) break; continue; }
    if (depth === 1 && c === ',') { expectKey = true; i++; continue; }
    if (depth === 1 && expectKey && /[A-Za-z_$]/.test(c)) {
      const m = s.slice(i).match(/^([A-Za-z_$][\w$]*)\s*(:|\(|,|\})/);
      if (m) { if (m[2] === ':' || m[2] === '(') keys.push(m[1]); i += m[1].length; expectKey = false; continue; }
      // `async foo()`, `get foo()`, `...spread`
      const m2 = s.slice(i).match(/^(?:async|get|set)\s+([A-Za-z_$][\w$]*)\s*\(/);
      if (m2) { keys.push(m2[1]); i += m2[0].length - 1; expectKey = false; continue; }
    }
    if (depth === 1 && !/\s/.test(c)) expectKey = false;
    i++;
  }
  return keys;
}

// Every place an id is put into one of TABLES: { table: { id: ['file:line', ...] } }
function registrySites(root) {
  const sites = Object.fromEntries(TABLES.map((t) => [t, {}]));
  const add = (t, id, where) => { (sites[t][id] ||= []).push(where); };
  for (const f of srcFiles(root)) {
    const s = fs.readFileSync(f, 'utf8'), rel = path.relative(root, f);
    const lineOf = (i) => rel + ':' + (s.slice(0, i).split('\n').length);
    for (const t of TABLES) {
      for (const m of s.matchAll(new RegExp(`export const ${t}\\s*=\\s*\\{|Object\\.assign\\(${t},\\s*\\{`, 'g'))) {
        const open = m.index + m[0].length - 1;
        for (const k of literalKeys(s, open)) add(t, k, lineOf(m.index));
      }
      for (const m of s.matchAll(new RegExp(`(?<![\\w.$])${t}(?:\\.([A-Za-z_$][\\w$]*)|\\[['"]([^'"]+)['"]\\])\\s*=(?![=>])`, 'g'))) add(t, m[1] || m[2], lineOf(m.index));
    }
  }
  return sites;
}

// ---------------------------------------------------------------- CH9
t('registries: spawner, ticker and listener names are unique; ticker orders are free', () => {
  registerSpawner('__test_type', () => 1);
  assert.throws(() => registerSpawner('__test_type', () => 2), /already has a spawner/);
  registerTicker('__a', () => {}, 1e9); registerTicker('__b', () => {}, 1e9 - 1);
  assert.throws(() => registerTicker('__a', () => {}, 5e8), /already registered/);
  assert.throws(() => registerTicker('__c', () => {}, 1e9), /order 1000000000 is taken by '__a'/);
  assert.throws(() => registerTicker('__d', () => {}), /order must be a number/);
  assert.deepEqual(tickerOrder().slice(-2), ['999999999:__b', '1000000000:__a']);
  registerListener('__ev', () => {});
  assert.equal(LISTENERS.at(-1).ev, '__ev');
  SPAWNERS.delete('__test_type'); TICKERS.splice(-2); LISTENERS.pop();
});
t('the core update order is pinned (gameTickers.js)', () => {
  const src = read('scenes/gameTickers.js');
  const names = [...src.slice(src.indexOf('const CORE = ['), src.indexOf('export const CORE_ORDER')).matchAll(/^  \['([A-Za-z]+)', /gm)].map((m) => m[1]);
  assert.deepEqual(names, ['player', 'tutorial', 'worldEvents', 'foodElixir', 'quests', 'ambientLife', 'ambientSounds', 'interactables', 'trophies', 'stream', 'rested', 'plates', 'setPieces', 'checkpoints', 'fog', 'flames', 'clock', 'npcSchedule', 'lights', 'npcs', 'follower', 'hound', 'arena', 'quickRun', 'pony', 'spiritWolf', 'pickups', 'interact', 'autosave', 'statPrompt', 'ending', 'menuKeys', 'exits', 'enemies', 'shots', 'enemyShots', 'bossTrigger', 'zones', 'music', 'fx', 'snow', 'lighting', 'bars', 'death']);
});

// ---------------------------------------------------------------- CH10
t('mixin() refuses a name that is already taken', () => {
  class Base { foo() { return 1; } }
  class K extends Base { bar() { return 2; } }
  assert.throws(() => mixin(K.prototype, { a: { baz() {} }, b: { baz() {} } }), /"baz" is defined by both a and b/);
  assert.throws(() => mixin(class extends Base {}.prototype, { a: { foo() {} } }), /would replace/);
  const memory = { v: 1 };
  const P = class {}.prototype;
  mixin(P, { a: { get v() { return memory.v; }, set v(x) { memory.v = x; } } });
  const o = Object.create(P); o.v = 5;
  assert.equal(memory.v, 5); assert.ok(!Object.keys(o).includes('v'));
});
// methods of a class body and its mixin objects, read from the source (the real ones import Phaser, so not importable here)
function topKeysOfExport(rel, name) {
  const s = read(rel), i = s.indexOf(`export const ${name}`);
  assert.ok(i >= 0, `${rel} exports ${name}`);
  return literalKeys(s, s.indexOf('{', i));
}
function classMethods(rel) {
  return [...read(rel).matchAll(/^ {2}(?:async\s+|get\s+|set\s+|static\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/gm)].map((m) => m[1]).filter((x) => !['if', 'for', 'while', 'switch', 'catch', 'constructor'].includes(x));
}
function mixinCall(rel) {
  const m = read(rel).match(/mixin\(\w+\.prototype, \{([^}]*)\}\)/);
  assert.ok(m, `${rel} calls mixin()`);
  const names = m[1].split(',').map((x) => x.trim()).filter(Boolean);
  const imports = {};
  for (const im of read(rel).matchAll(/import \{([^}]*)\} from '([^']+)'/g)) for (const x of im[1].split(',')) imports[x.trim()] = path.normalize(path.join(path.dirname(rel), im[2]));
  return names.map((nm) => [imports[nm], nm]);
}
t('GameScene and Player mixins do not collide with each other or with the class', () => {
  for (const cls of ['scenes/GameScene.js', 'entities/Player.js']) {
    const owner = new Map(classMethods(cls).map((m) => [m, cls]));
    let total = owner.size;
    for (const [file, name] of mixinCall(cls)) {          // (a Set: a getter and its setter are one name)
      for (const k of new Set(topKeysOfExport(file, name))) { assert.ok(!owner.has(k), `${name}.${k} collides with ${owner.get(k)}`); owner.set(k, name); total++; }
    }
    assert.ok(total > 40, `${cls}: only ${total} methods found, the scan is broken`);
  }
});

// ---------------------------------------------------------------- CH11
t('content registries: every id is defined in one place only', () => {
  const sites = registrySites(SRC);
  const dups = [];
  for (const [table, ids] of Object.entries(sites)) for (const [id, where] of Object.entries(ids)) if (where.length > 1) dups.push(`${table}.${id}: ${where.join(', ')}`);
  assert.deepEqual(dups, [], 'an id is defined twice; the later one silently replaces the earlier');
  assert.ok(Object.keys(sites.ITEMS).length > 250 && Object.keys(sites.NPC_DEFS).length > 50 && Object.keys(sites.SCRIPTS).length > 80, 'the scan found too few ids');
});
t('tile ids: unique, inside a reserved block, < 256; SOLID_TILES names real tiles; TILE_COUNT follows', () => {
  const ids = Object.entries(TILE);
  const seen = new Map();
  for (const [name, id] of ids) {
    assert.ok(Number.isInteger(id) && id >= 0 && id < 256, `${name} = ${id}`);
    assert.ok(!seen.has(id), `tile id ${id} is used by both ${seen.get(id)} and ${name}`);
    seen.set(id, name);
    assert.ok(Object.values(TILE_BLOCKS).some(([a, b]) => id >= a && id <= b), `${name} = ${id} is outside every reserved block (config.js TILE_BLOCKS)`);
  }
  for (let i = 0; i <= 74; i++) assert.ok(seen.has(i), `core tile id ${i} is missing (ids are never renumbered)`);
  const blocks = Object.entries(TILE_BLOCKS).sort((a, b) => a[1][0] - b[1][0]);
  for (let i = 1; i < blocks.length; i++) assert.ok(blocks[i][1][0] > blocks[i - 1][1][1], `blocks ${blocks[i - 1][0]} and ${blocks[i][0]} overlap`);
  const values = new Set(Object.values(TILE));
  for (const s of SOLID_TILES) assert.ok(values.has(s), `SOLID_TILES has ${s}, which is no tile`);
  assert.equal(new Set(SOLID_TILES).size, SOLID_TILES.length, 'SOLID_TILES lists a tile twice');
  assert.equal(TILE_COUNT, Math.max(...values) + 1);
});

// ---------------------------------------------------------------- CH13 + CH2
t('listen() removes its bus listener when the scene shuts down', () => {
  const handlers = {};
  const events = { once(ev, fn) { (handlers[ev] ||= []).push(fn); }, off(ev, fn) { handlers[ev] = (handlers[ev] || []).filter((f) => f !== fn); } };
  let hits = 0;
  listen({ events }, '__l', () => hits++);
  bus.emit('__l'); handlers.shutdown.slice().forEach((f) => f()); bus.emit('__l');
  assert.equal(hits, 1);
  assert.equal((handlers.destroy || []).length, 0, 'the other teardown hook was removed too');
});
t('ui holds: modal while any hold is out; release only drops its own', () => {
  ui.releaseAll();
  const a = ui.hold('a'), b = ui.hold('b');
  a(); assert.equal(ui.modal, true); a();
  b(); assert.equal(ui.modal, false);
  ui.hold('x'); ui.hold('x'); ui.release('x'); assert.equal(ui.modal, false);
  ui.hold('y'); ui.modal = false; assert.equal(ui.modal, false);   // the old setter (tests): false drops every hold
});

// ---------------------------------------------------------------- AU02
// AU01: Repair and Reforge play 'upgrade', which src/audio does not define yet. The audio agent (U) adds the sound and
// removes it from this list; nothing else may be added here.
const KNOWN_GAPS = new Set(['upgrade']);
t('every sound, song and ambience name used in src/ exists in src/audio (AU02)', () => {
  const audio = read('audio/sfx.js');
  const sounds = new Set(literalKeys(audio, audio.indexOf('{', audio.indexOf('const SOUNDS = {'))));
  const songs = new Set(literalKeys(audio, audio.indexOf('{', audio.indexOf('const SONGS = {'))));
  for (const m of audio.matchAll(/^SOUNDS\.(\w+)\s*=/gm)) sounds.add(m[1]);
  for (const m of audio.matchAll(/^SONGS\.(\w+)\s*=/gm)) songs.add(m[1]);
  const amb = new Set([...audio.slice(audio.indexOf('export const ambience')).matchAll(/kind === '(\w+)'/g)].map((m) => m[1]));
  assert.ok(sounds.size > 40 && songs.size > 15 && amb.size >= 2, 'the audio scan found too few names');
  const missing = [];
  const need = (set, kind, name, where) => { if (!set.has(name) && !KNOWN_GAPS.has(name)) missing.push(`${kind} '${name}' (${where})`); };
  for (const f of srcFiles(SRC)) {
    if (f.endsWith('audio/sfx.js')) continue;
    const s = fs.readFileSync(f, 'utf8'), rel = path.relative(SRC, f);
    // sfx.play('x'), and both names of sfx.play(cond ? 'a' : 'b')
    for (const m of s.matchAll(/\b(sfx|music|ambience)\.play\(([^()]*)\)/g)) {
      const [, who, args] = m;
      if (/[+`]/.test(args)) continue;                                  // built at run time ('bark_' + kind): not checkable here
      const names = args.includes('?') ? args.matchAll(/[?:|]\s*'([a-z_0-9]+)'/g) : args.matchAll(/'([a-z_0-9]+)'/g);   // a ? 'x' : 'y' plays x or y, never a
      for (const q of names) need(who === 'sfx' ? sounds : who === 'music' ? songs : amb, who, q[1], rel);
    }
    // map definitions name their music, boss music and ambience
    for (const m of s.matchAll(/\b(music|bossMusic): '([a-z_0-9]+)'/g)) need(songs, m[1], m[2], rel);
    for (const m of s.matchAll(/\bambience: '([a-z_0-9]+)'/g)) need(amb, 'ambience', m[1], rel);
  }
  assert.deepEqual(missing, []);
  for (const g of KNOWN_GAPS) assert.ok(!sounds.has(g), `'${g}' exists now: remove it from KNOWN_GAPS`);
});

console.log(`FOUNDATION PASSED (${n} tests)`);
