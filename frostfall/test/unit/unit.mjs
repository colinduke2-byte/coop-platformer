// Pure-logic tests: node test/unit/unit.mjs   (no browser needed)
import assert from 'node:assert/strict';
import { meleeDamage, arrowDamage, spellDamage, elementMult, damageTaken, blockResult, sneakMult, charLevelFor } from '../../src/systems/damage.js';
import { S, resetState } from '../../src/systems/state.js';
import { addXp, xpNeeded, bonus, MAX_LVL } from '../../src/systems/skills.js';
import { bus } from '../../src/systems/bus.js';
import { TUNE } from '../../src/data/tuning.js';

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('  ok   ' + name); };

t('melee damage scales with weapon, skill and combo', () => {
  assert.equal(meleeDamage({ weapon: 10 }), 10);
  assert.equal(meleeDamage({ weapon: 10, skill: 1.5, combo: 1.7 }), 25.5);
});
t('sneak melee is 3x (+bonus)', () => {
  assert.equal(sneakMult('melee', 0), 3);
  assert.equal(sneakMult('melee', 0.4), 3.4);
  assert.equal(meleeDamage({ weapon: 10, sneak: true }), 30);
});
t('sneak bow is 2x', () => assert.equal(sneakMult('bow', 0), 2));
t('arrow damage grows with charge, clamped', () => {
  const lo = arrowDamage({ bow: 10, charge: 0 }), hi = arrowDamage({ bow: 10, charge: 1 });
  assert.ok(Math.abs(lo - 4.5) < 1e-9 && Math.abs(hi - 17) < 1e-9);
  assert.equal(arrowDamage({ bow: 10, charge: 5 }), hi);
});
t('spell damage scales', () => assert.equal(spellDamage({ base: 10, skill: 1.3 }), 13));
t('elemental weakness / resistance', () => {
  assert.equal(elementMult({ weak: { fire: 1.5 } }, 'fire'), 1.5);
  assert.equal(elementMult({ weak: { fire: 1.5 } }, 'frost'), 1);
  assert.equal(elementMult({}, 'fire'), 1);
  assert.equal(elementMult({}, null), 1);
});
t('armour reduces damage, never below 1', () => {
  assert.equal(damageTaken(100, 0.2), 80);
  assert.equal(damageTaken(1, 0.8), 1);
  assert.equal(damageTaken(100, 5), 15); // armour capped at 85%
});
t('difficulty scales damage taken', () => {
  assert.equal(damageTaken(100, 0, TUNE.difficulty.easy.dmgTaken), 70);
  assert.equal(damageTaken(100, 0, TUNE.difficulty.hard.dmgTaken), 135);
});
t('block: frontal hit reduced, parry window negates, rear hit unaffected', () => {
  const base = { dmg: 20, blocking: true, facing: { x: 1, y: 0 }, from: { x: 1, y: 0 } };
  assert.ok(Math.abs(blockResult({ ...base, blockT: 0.5 }).taken - 6) < 1e-9);
  const p = blockResult({ ...base, blockT: 0.05 });
  assert.ok(p.parried && p.taken === 0);
  assert.equal(blockResult({ ...base, blockT: 0.5, from: { x: -1, y: 0 } }).taken, 20);
  assert.equal(blockResult({ ...base, blocking: false }).taken, 20);
});
t('character level from skill ups', () => {
  assert.equal(charLevelFor(0), 1); assert.equal(charLevelFor(1), 1); assert.equal(charLevelFor(2), 2); assert.equal(charLevelFor(9), 5);
});
t('skills level up through xp and fire events', () => {
  resetState();
  let fired = 0; bus.on('levelup', () => fired++);
  addXp('archery', xpNeeded(1));
  assert.equal(S.skills.archery.lvl, 2); assert.equal(fired, 1);
  addXp('archery', xpNeeded(2) + xpNeeded(3));
  assert.equal(S.skills.archery.lvl, 4); assert.equal(fired, 3);
});
t('skills cap at max level', () => {
  resetState();
  addXp('sneak', 1e9);
  assert.equal(S.skills.sneak.lvl, MAX_LVL);
});
t('skill bonuses start neutral and grow', () => {
  resetState();
  assert.equal(bonus.melee(), 1); assert.equal(bonus.swingCost(), 1);
  S.skills.oneHanded.lvl = 6;
  assert.ok(Math.abs(bonus.melee() - 1.5) < 1e-9);
  assert.ok(bonus.swingCost() < 1 && bonus.swingCost() >= 0.5);
  S.skills.sneak.lvl = 20;
  assert.ok(bonus.detect() >= 0.35);
});
t('event bus on/off/once', () => {
  let a = 0; const f = () => a++;
  bus.on('x', f); bus.emit('x'); bus.off('x', f); bus.emit('x');
  assert.equal(a, 1);
  let b = 0; bus.once('y', () => b++); bus.emit('y'); bus.emit('y');
  assert.equal(b, 1);
});
t('tuning sanity (all player numbers positive)', () => {
  for (const k of ['speed', 'sneakSpeed', 'accel', 'regen']) assert.ok(TUNE.player[k] > 0, k);
  assert.ok(TUNE.player.roll.iframes < TUNE.player.roll.time);
});
console.log(`UNIT PASSED (${n} tests)`);
