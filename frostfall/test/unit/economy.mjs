// Economy and loot checks (PR-02, PR-03, PR-22 ...): pure node, no browser.   node test/unit/economy.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { genItem, RARITY } from '../../src/systems/genloot.js';
import { ITEMS } from '../../src/data/items.js';
import '../../src/data/items4.js';
import { sellPrice, unitBuyFloor } from '../../src/systems/prices.js';
import { POOLS } from '../../src/data/stock.js';
const SRC = new URL('../../src/', import.meta.url).pathname;
const srcFiles = (d = SRC) => fs.readdirSync(d).flatMap((f) => { const p = path.join(d, f); return fs.statSync(p).isDirectory() ? srcFiles(p) : p.endsWith('.js') ? [p] : []; });
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
  for (let i = 0; i < 2000; i++) { const it = genItem(3, R, 3, { slot: 'weapon' }); assert.ok(it.affixLines.filter((l) => /^HITS AS (FIRE|FROST|SHOCK) /.test(l)).length <= 1, it.name); }
});

// PR-03: every ware list in the game (literal { id, price, n } rows in any source file, and the daily rotation pools) is
// checked: the cheapest a unit can cost (Easy prices) must be at least what a shop pays for it.
t('PR-03: nothing in any shop can be bought and sold back at a profit, on any difficulty', () => {
  const bad = [], re = /\{ id: '([a-z_0-9]+)', price: (\d+)(?:, n: (\d+))?/g;
  let rows = 0;
  for (const f of srcFiles()) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(re)) {
      if (!ITEMS[m[1]]) continue;
      rows++;
      const w = { id: m[1], price: +m[2], n: +m[3] || 1 };
      if (unitBuyFloor(w) < sellPrice(w.id)) bad.push(`${path.basename(f)} ${w.id}: ${unitBuyFloor(w).toFixed(1)} < ${sellPrice(w.id)}`);
    }
  }
  for (const [who, pool] of Object.entries(POOLS)) for (const [id, mul, qty] of pool) {
    const price = Math.round(ITEMS[id].value * mul), w = qty ? { id, price: Math.round(price * qty * 0.8), n: qty } : { id, price };
    if (unitBuyFloor(w) < sellPrice(id)) bad.push(`${who} rotation ${id}`);
  }
  assert.ok(rows > 60, `only ${rows} ware rows found: did the scan break?`);
  assert.deepEqual(bad, []);
});

const SP = await import('../../src/systems/spellpower.js');
t('PR-04: Emberforged Staff boosts Meteor and Ember Nova, the Long Winter boosts Glacier Spear; per-spell costs win', () => {
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  assert.ok(near(SP.spellGear('meteor', ITEMS.ember_staff), 1.3 * 1.3) && near(SP.spellGear('embernova', ITEMS.ember_staff), 1.69) && near(SP.spellGear('frost', ITEMS.ember_staff), 1.3));
  assert.ok(near(SP.spellGear('glacier', ITEMS.winter_staff), ITEMS.winter_staff.spellMul * 1.1));
  assert.ok(near(SP.spellCostGear('glacier', ITEMS.frostbirch_staff), 0.85) && near(SP.spellCostGear('embernova', ITEMS.cinder_staff), 0.85) && near(SP.spellCostGear('meteor', ITEMS.cinder_staff), 0.9) && near(SP.spellCostGear('sunbeam', ITEMS.cinder_staff), 0.85));
});

t('PR-10: rarity raises armour and block; staves grow with tier; affixes keep growing to tier 3; Legendaries carry a signature', () => {
  const R = rng(5), avg = (f, n = 200) => { let a = 0; for (let i = 0; i < n; i++) a += f(); return a / n; };
  const plate = (r) => avg(() => genItem(3, R, r, { slot: 'armor', baseName: 'Plate' }).armor);
  assert.ok(plate(3) > plate(0) * 1.15, `plate ${plate(0)} -> ${plate(3)}`);
  const shield = (r) => genItem(3, R, r, { slot: 'shield', baseName: 'Buckler' });
  assert.ok(shield(2).block > shield(0).block);
  const staff = (tier, r) => genItem(tier, R, r, { slot: 'weapon', baseName: 'Staff' }).spellMul;
  assert.ok(staff(0, 0) < staff(2, 0) && staff(2, 0) < staff(3, 3) && staff(3, 3) <= 1.6, [staff(0, 0), staff(2, 0), staff(3, 3)].join());
  for (let i = 0; i < 200; i++) {
    const it = genItem(4, R, 3, { slot: ['weapon', 'bow', 'armor', 'shield', 'helmet', 'charm'][i % 6] });
    assert.ok(it.signature, it.name);
    if (it.keen) assert.ok(it.affixLines.includes(`+${Math.round(it.keen * 100)}% DAMAGE`) && it.keen > 0.2, it.affixLines.join());
  }
});

console.log(failed ? 'ECONOMY FAILED' : `ECONOMY PASSED (${n} tests)`);
process.exit(failed ? 1 : 0);
