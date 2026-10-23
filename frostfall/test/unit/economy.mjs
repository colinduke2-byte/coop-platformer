// Economy and loot checks (PR-02, PR-03, PR-22 ...): pure node, no browser.   node test/unit/economy.mjs
import assert from 'node:assert/strict';
import { genItem, RARITY } from '../../src/systems/genloot.js';
let n = 0, failed = 0;
const t = (name, fn) => { try { fn(); n++; console.log('  ok   ' + name); } catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message.split('\n')[0]); } };
// a small seeded random so a failure can be reproduced
const rng = (seed) => () => { seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };

t('PR-02: every generated item gets the full affix count of its rarity (1,000 rolls per rarity and slot)', () => {
  const R = rng(7);
  for (let ri = 0; ri < RARITY.length; ri++) for (const slot of ['weapon', 'bow', 'shield', 'armor', 'helmet', 'charm']) for (let i = 0; i < 1000; i++) {
    const it = genItem(i % 6, R, ri, { slot });
    assert.equal(it.affixLines.length, RARITY[ri].affixes, `${RARITY[ri].id} ${slot}: ${it.name} has ${it.affixLines.length}`);
  }
});
t('PR-02: a weapon never carries two elements', () => {
  const R = rng(11);
  for (let i = 0; i < 2000; i++) { const it = genItem(3, R, 3, { slot: 'weapon' }); assert.ok(it.affixLines.filter((l) => /^(FIRE|FROST|SHOCK) /.test(l)).length <= 1, it.name); }
});

console.log(failed ? 'ECONOMY FAILED' : `ECONOMY PASSED (${n} tests)`);
process.exit(failed ? 1 : 0);
