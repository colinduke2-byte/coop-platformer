// The power curve: levels never make you overpowered, gear and preparation matter most, and each difficulty has its own promise.
import assert from 'node:assert/strict';
import { EXPECTED, GEAR, costFor, playerOf, fightCost, dangerFromCost, readyTier } from '../../src/systems/powercurve.js';
let n = 0, failed = 0;
const t = (name, fn) => { try { fn(); n++; console.log('  ok   ' + name); } catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message.split('\n')[0]); } };

// Ordinary enemies grow with region and story (systems/enemyscale.js), so later regions demand more even from the gear the game expects there.
const BAND = [[0.25, 0.42], [0.3, 0.55], [0.4, 0.68], [0.5, 0.8]];
t('on Normal, the expected gear and level costs a fair share of your health, more in later regions', () => {
  for (let tier = 0; tier <= 3; tier++) { const c = costFor(tier); assert.ok(c > BAND[tier][0] && c < BAND[tier][1], `tier ${tier}: ${c}`); }
});
t('Easy is gentle and Hard is demanding at the expected strength', () => {
  for (let tier = 0; tier <= 3; tier++) { const e = costFor(tier, { diff: 'easy' }), n2 = costFor(tier), h = costFor(tier, { diff: 'hard' }); assert.ok(e < 0.4 && e < n2 * 0.6, `easy ${tier} ${e}`); assert.ok(h > 0.5 && h > n2 * 1.5, `hard ${tier} ${h}`); }
});
t('five levels above the expected level is comfortable but never trivial', () => {
  for (let tier = 0; tier <= 3; tier++) { const c = costFor(tier, { dLevel: 5 }); assert.ok(c > 0.18 && c < costFor(tier) * 0.85, `tier ${tier}: ${c}`); }
});
t('five levels below is dangerous', () => {
  for (let tier = 0; tier <= 3; tier++) { const c = costFor(tier, { dLevel: -5 }); assert.ok(c > costFor(tier) * 1.2, `tier ${tier}: ${c}`); }
});
t('one tier of gear matters more than five levels', () => {
  for (let tier = 0; tier <= 2; tier++) assert.ok(costFor(tier, { dGear: 1 }) < costFor(tier, { dLevel: 5 }), `tier ${tier}`);
});
t('a maximum level character in starter gear still struggles in later regions', () => {
  const p = playerOf({ level: 20, gear: 0 });
  assert.ok(fightCost(p, 2) > 1.2 && fightCost(p, 3) > 2, 'late regions are deadly');
  assert.ok(fightCost(p, 1) > 0.55, 'mid regions are dangerous');
});
t('a well-geared low-level character can still win', () => {
  const p = playerOf({ level: 1, gear: 5, upg: 3 });
  assert.ok(fightCost(p, 2) < 1.0, 'a level 1 in the best gear survives a mid-late fight');
});
t('levels add a modest amount of power: level 20 is less than double level 1 damage', () => {
  assert.ok(playerOf({ level: 20, gear: 2 }).dmg < 2.3 * playerOf({ level: 1, gear: 2 }).dmg);
});
t('danger bands and the ready tier make sense', () => {
  assert.equal(dangerFromCost(0.05), 1); assert.equal(dangerFromCost(0.2), 2); assert.equal(dangerFromCost(0.4), 3); assert.equal(dangerFromCost(0.7), 4); assert.equal(dangerFromCost(1.5), 5);
  EXPECTED.forEach((e, tier) => assert.equal(readyTier(playerOf({ level: e.level, gear: e.gear, upg: e.upg })), tier));
});
console.log(failed ? 'POWER FAILED' : `POWER PASSED (${n} tests)`);
process.exit(failed ? 1 : 0);
