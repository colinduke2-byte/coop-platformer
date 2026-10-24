// The power curve: levels never make you overpowered, gear and preparation matter most, and each difficulty has its own promise.
import assert from 'node:assert/strict';
import { EXPECTED, GEAR, costFor, playerOf, fightCost, dangerFromCost, readyTier, pace, costAgainst } from '../../src/systems/powercurve.js';
let n = 0, failed = 0;
const t = (name, fn) => { try { fn(); n++; console.log('  ok   ' + name); } catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message.split('\n')[0]); } };

// Ordinary enemies grow with region and story (systems/enemyscale.js), so later regions demand more even from the gear the game expects there.
// The model ignores stagger and stun chains, which a skilled player gets from a good weapon. Since CB22 late foes also attack
// faster and string follow-ups (powercurve.pace), and the balance bot went from 20/20 to about 1/4 on the tier 2 patrol, so the
// late bands are higher than before (tier 3 was 0.7-1.3).
const BAND = [[0.25, 0.42], [0.3, 0.55], [0.5, 0.95], [0.9, 1.6]];
t('on Normal, the expected gear and level costs a fair share of your health, more in later regions', () => {
  for (let tier = 0; tier <= 3; tier++) { const c = costFor(tier); assert.ok(c > BAND[tier][0] && c < BAND[tier][1], `tier ${tier}: ${c}`); }
});
t('skipping the upgrades makes ordinary fights clearly harder in every later region', () => {
  for (let tier = 1; tier <= 3; tier++) assert.ok(costFor(tier, { upg: 0 }) > costFor(tier) * 1.2, `tier ${tier}: ${costFor(tier, { upg: 0 })} vs ${costFor(tier)}`);
});
t('Easy is gentle and Hard is demanding at the expected strength', () => {
  for (let tier = 0; tier <= 3; tier++) { const e = costFor(tier, { diff: 'easy' }), n2 = costFor(tier), h = costFor(tier, { diff: 'hard' }); assert.ok(e < 0.65 && e < n2 * 0.6, `easy ${tier} ${e}`); assert.ok(h > 0.5 && h > n2 * 1.5, `hard ${tier} ${h}`); }
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
  assert.ok(fightCost(p, 2) < 1.6, 'a level 1 in the best gear survives a mid-late fight');
});
t('levels add a modest amount of power: level 20 is less than double level 1 damage', () => {
  assert.ok(playerOf({ level: 20, gear: 2 }).dmg < 2.3 * playerOf({ level: 1, gear: 2 }).dmg);
});
t('danger bands and the ready tier make sense', () => {
  assert.equal(dangerFromCost(0.05), 1); assert.equal(dangerFromCost(0.2), 2); assert.equal(dangerFromCost(0.4), 3); assert.equal(dangerFromCost(0.7), 4); assert.equal(dangerFromCost(1.5), 5);
  EXPECTED.forEach((e, tier) => { const r = readyTier(playerOf({ level: e.level, gear: e.gear, upg: e.upg })); assert.ok(r === tier || (tier === 3 && r === 2), `tier ${tier} ready ${r}`); });
});
t('CB22: late foes hit more often (shorter cooldowns, follow-up swings), and the model counts it', () => {
  assert.equal(pace(0), 1);
  assert.ok(pace(0.3) > 1 && pace(0.3) < 1.1 && pace(0.6) > pace(0.3) && pace(1) > 1.3 && pace(1) < 1.5, [0, 0.3, 0.6, 1].map(pace).join());
  const p = playerOf({ level: 12, gear: 4, upg: 6 }), mob = { hp: 300, dmg: 40 };
  assert.ok(costAgainst(p, { ...mob, f: 0.9 }) > costAgainst(p, mob) * 1.25);
});
console.log(failed ? 'POWER FAILED' : `POWER PASSED (${n} tests)`);
process.exit(failed ? 1 : 0);
