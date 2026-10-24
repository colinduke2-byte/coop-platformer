// Perk forks, respec and mastery (PR-18, PR-20): pure logic.   node test/unit/perks.mjs
import assert from 'node:assert/strict';
import { S, resetState } from '../../src/systems/state.js';
import { PERKS, perkById, forkMate, MASTERY } from '../../src/data/perks.js';
import { perkState, buyPerk, respec, respecCost, bonus, mastery, nextMastery } from '../../src/systems/skills.js';
import { TUNE } from '../../src/data/tuning.js';
let n = 0, failed = 0;
const t = (name, fn) => { try { fn(); n++; console.log('  ok   ' + name); } catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message.split('\n')[0]); } };

t('every skill has a starting perk, two forks of two (at 5 and 8) and a capstone', () => {
  for (const sk of ['oneHanded', 'archery', 'destruction', 'restoration', 'sneak']) {
    const mine = PERKS.filter((p) => p.skill === sk);
    assert.deepEqual(mine.map((p) => p.lvl), [2, 5, 5, 8, 8, 12], sk);
    for (const p of mine.filter((q) => q.lvl === 5 || q.lvl === 8)) assert.ok(forkMate(p.id), p.id);
    for (const p of mine) for (const r of [].concat(p.req || [])) assert.ok(perkById[r], `${p.id} needs ${r}`);
  }
});
t('a fork is one or the other; either branch leads on to the next fork and the capstone', () => {
  resetState(); S.skills.oneHanded.lvl = 12; S.perkPoints = 10;
  assert.ok(buyPerk('keenedge'));
  assert.ok(buyPerk('guardian'));
  assert.equal(perkState('duelist'), 'taken'); assert.ok(!buyPerk('duelist'));
  assert.ok(buyPerk('rending'), 'the old A branch at 8 follows the new B branch at 5');
  assert.equal(perkState('cleave'), 'taken');
  assert.ok(buyPerk('unbroken'));
});
t('old saves keep what they bought: the old straight chains are the first branches', () => {
  resetState(); S.skills.sneak.lvl = 12; S.perkPoints = 0;
  S.perks = { shadowstep: true, ghost: true, backstab: true, assassin: true };
  for (const id of Object.keys(S.perks)) assert.equal(perkState(id), 'owned');
  assert.equal(perkState('hunter'), 'taken'); assert.equal(perkState('nightblade'), 'taken');
});
t('respec at a shrine: gold for every perk point back', () => {
  resetState(); S.perks = { keenedge: true, duelist: true, rending: true }; S.perkPoints = 1; S.gold = 1000;
  const cost = respecCost();
  assert.equal(cost, TUNE.economy.respec.base + 3 * TUNE.economy.respec.perPerk);
  assert.ok(respec()); assert.equal(S.perkPoints, 4); assert.deepEqual(S.perks, {}); assert.equal(S.gold, 1000 - cost);
  S.gold = 0; S.perks = { keenedge: true }; assert.ok(!respec(), 'no gold, no respec'); assert.ok(S.perks.keenedge);
  S.perks = {}; assert.equal(respecCost(), 0);
});
t('mastery at 15 and 20 changes the numbers, and the next milestone is known', () => {
  resetState();
  const m14 = bonus.melee(); S.skills.oneHanded.lvl = 20; assert.ok(Math.abs(bonus.melee() / (1 + 0.05 * 19) - 1.1) < 1e-9);
  assert.ok(m14 < bonus.melee()); assert.equal(nextMastery('oneHanded'), null);
  S.skills.archery.lvl = 15; assert.equal(mastery('bowCrit'), 0); S.skills.archery.lvl = 20; assert.equal(mastery('bowCrit'), 0.1);
  S.skills.sneak.lvl = 14; assert.equal(nextMastery('sneak').lvl, 15);
  for (const list of Object.values(MASTERY)) assert.deepEqual(list.map((m) => m.lvl), [15, 20]);
});
console.log(failed ? 'PERKS FAILED' : `PERKS PASSED (${n} tests)`);
process.exit(failed ? 1 : 0);
