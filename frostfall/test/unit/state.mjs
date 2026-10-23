// The save schema (CH5): every field of S used anywhere in src/ is declared in newState(), optional fields are
// type-checked on load, and New Game+ keeps exactly its table.   node test/unit/state.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { S, newState, loadInto, resetState, startNgPlus, OPTIONAL_KINDS, NG_KEEP } from '../../src/systems/state.js';

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('  ok   ' + name); };
const src = new URL('../../src/', import.meta.url).pathname;
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p); } })(src);

t('every S.field used in src/ is declared in newState()', () => {
  const declared = new Set(Object.keys(newState()));
  const missing = {};
  for (const f of files) {
    const s = fs.readFileSync(f, 'utf8');
    // `S.` as the game-state object only: not `sS.x`, `obj.S.x`, or a local named S in art code (art/gear.js uses S for a spec)
    if (f.includes('/art/')) continue;
    for (const m of s.matchAll(/(?<![\w.$])S\.([a-zA-Z_]\w*)\b/g)) if (!declared.has(m[1])) (missing[m[1]] ||= new Set()).add(path.relative(src, f));
  }
  assert.deepEqual(Object.fromEntries(Object.entries(missing).map(([k, v]) => [k, [...v]])), {}, 'declare these in systems/state.js newState() or OPTIONAL_KINDS');
});
t('optional fields start null and are type-checked on load', () => {
  resetState();
  for (const k of Object.keys(OPTIONAL_KINDS)) assert.equal(S[k], null, k);
  loadInto({ ...newState(), stash: [1, 2], buyback: { bad: 1 }, cloak: 'red', dur: { iron_sword: 40 }, pet: 'cub', nemesis: null });
  assert.equal(S.stash, null); assert.equal(S.buyback, null); assert.equal(S.cloak, null);
  assert.deepEqual(S.dur, { iron_sword: 40 }); assert.equal(S.pet, 'cub'); assert.equal(S.nemesis, null);
});
t('an old save without the new fields loads them as null', () => {
  const old = newState(); for (const k of Object.keys(OPTIONAL_KINDS)) delete old[k];
  loadInto(JSON.parse(JSON.stringify(old)));
  for (const k of Object.keys(OPTIONAL_KINDS)) assert.equal(S[k], null, k);
});
t('New Game+ keeps exactly NG_KEEP (and starts the rest fresh)', () => {
  resetState();
  S.gold = 999; S.stash = { iron_ingot: 3 }; S.cloak = 15; S.arena = { best: 7 }; S.fish = { caught: 2 }; S.shout = 'storm'; S.flags.houseBought = true; S.flags.bossDead = true;
  startNgPlus();
  assert.equal(S.gold, 999); assert.deepEqual(S.stash, { iron_ingot: 3 }); assert.equal(S.cloak, 15); assert.equal(S.ngPlus, 1);
  assert.equal(S.arena, null); assert.equal(S.fish, null); assert.equal(S.shout, null);
  assert.equal(S.flags.houseBought, true); assert.equal(S.flags.bossDead, undefined); assert.equal(S.flags.introDone, true);
  for (const k of NG_KEEP) assert.ok(k in newState(), `NG_KEEP names an undeclared field: ${k}`);
});
resetState();
console.log(`STATE PASSED (${n} tests)`);
