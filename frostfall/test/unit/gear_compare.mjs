// The pack's gear comparison (src/ui/gearCompare.js): rows, colours (direction), the overall verdict and the list marks.
//   node test/unit/gear_compare.mjs
import assert from 'node:assert/strict';
import { S, resetState } from '../../src/systems/state.js';
import { ITEMS } from '../../src/data/items.js';
import '../../src/data/items4.js';
import { compareGear, gearMark, statsOf } from '../../src/ui/gearCompare.js';
import { TUNE } from '../../src/data/tuning.js';

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('  ok   ' + name); };
const fresh = () => { resetState(); S.inv = {}; for (const k of Object.keys(S.equip)) S.equip[k] = null; };
const give = (...ids) => { for (const id of ids) S.inv[id] = (S.inv[id] || 0) + 1; };
const row = (c, k) => c.rows.find((r) => r.key === k);
const reg = (id, def) => { ITEMS[id] = def; };

t('a stronger, faster weapon is BETTER, with green damage and speed rows and the right deltas', () => {
  fresh(); give('iron_sword', 'ember_dagger'); S.equip.weapon = 'iron_sword';
  const c = compareGear('ember_dagger'), d = row(c, 'dmg');
  assert.equal(c.badge, 'BETTER'); assert.equal(c.vs, ITEMS.iron_sword.name);
  assert.equal(d.dir, 1); assert.equal(d.dText, '▲' + (ITEMS.ember_dagger.dmg - ITEMS.iron_sword.dmg));
  assert.equal(row(c, 'speed').dir, 1);
  assert.equal(row(c, 'elem').aText, 'FIRE'); assert.equal(row(c, 'elem').dir, 1);
  assert.equal(gearMark('ember_dagger'), 1);
});
t('a weaker weapon is WORSE; the worn one says EQUIPPED with its own numbers only', () => {
  fresh(); give('iron_sword', 'rusty_sword'); S.equip.weapon = 'iron_sword';
  const c = compareGear('rusty_sword');
  assert.equal(c.badge, 'WORSE'); assert.equal(row(c, 'dmg').dir, -1); assert.ok(row(c, 'dmg').dText.startsWith('▼'));
  assert.equal(gearMark('rusty_sword'), -1);
  const w = compareGear('iron_sword');
  assert.equal(w.badge, 'EQUIPPED'); assert.equal(w.worn, 'weapon'); assert.ok(w.rows.every((r) => r.bText == null && r.dir === 0));
});
t('an empty slot compares against bare hands / no armour', () => {
  fresh(); give('iron_sword', 'verdant_mail');
  const c = compareGear('iron_sword');
  assert.equal(c.vs, 'BARE HANDS'); assert.ok(row(c, 'dmg').b > 0, 'bare hands still hit'); assert.equal(c.badge, 'BETTER');
  const a = compareGear('verdant_mail');
  assert.equal(a.vs, 'NO ARMOUR'); assert.equal(row(a, 'armor').bText, '-'); assert.equal(row(a, 'armor').dir, 1); assert.equal(a.badge, 'BETTER');
});
t('the same item twice is SAME, grey rows, no mark', () => {
  fresh(); give('iron_sword', 'iron_sword'); reg('__twin', { ...ITEMS.iron_sword }); give('__twin'); S.equip.weapon = 'iron_sword';
  const c = compareGear('__twin');
  assert.equal(c.badge, 'SAME'); assert.ok(c.rows.every((r) => r.dir === 0)); assert.equal(gearMark('__twin'), 0);
});
t('better at one thing and worse at another, close overall: MIXED (and the mark says so)', () => {
  fresh();
  reg('__a', { name: 'A', type: 'weapon', dmg: 20, value: 1, desc: '' }); reg('__b', { name: 'B', type: 'weapon', dmg: 18, crit: 0.05, value: 1, desc: '' });
  give('__a', '__b'); S.equip.weapon = '__a';
  const c = compareGear('__b');
  assert.equal(row(c, 'dmg').dir, -1); assert.equal(row(c, 'crit').dir, 1);
  assert.equal(c.badge, 'MIXED', JSON.stringify({ s: c.score })); assert.equal(gearMark('__b'), 2);
});
t('a big gain outweighs a small loss: BETTER even with a red row', () => {
  fresh();
  reg('__c', { name: 'C', type: 'weapon', dmg: 10, crit: 0.05, value: 1, desc: '' }); reg('__d', { name: 'D', type: 'weapon', dmg: 20, value: 1, desc: '' });
  give('__c', '__d'); S.equip.weapon = '__c';
  const c = compareGear('__d');
  assert.equal(row(c, 'crit').dir, -1); assert.equal(c.badge, 'BETTER');
});
t('the build matters: a staff with more spell power but less damage is BETTER for a caster, not for a fighter', () => {
  fresh();
  reg('__s1', { name: 'S1', type: 'weapon', style: 'staff', dmg: 8, spellMul: 1.1, value: 1, desc: '' }); reg('__s2', { name: 'S2', type: 'weapon', style: 'staff', dmg: 5, spellMul: 1.3, value: 1, desc: '' });
  give('__s1', '__s2'); S.equip.weapon = '__s1';
  S.skills.destruction.lvl = 20; S.skills.oneHanded.lvl = 1;
  const mage = compareGear('__s2');
  S.skills.destruction.lvl = 1; S.skills.oneHanded.lvl = 20;
  const fighter = compareGear('__s2');
  assert.ok(mage.score > fighter.score, `${mage.score} > ${fighter.score}`);
  assert.equal(mage.badge, 'BETTER');
});
t('a two-handed weapon warns that the shield comes off; a set piece says how far the set gets', () => {
  fresh(); give('iron_sword', 'glyph_shield'); S.equip.weapon = 'iron_sword'; S.equip.offhand = 'glyph_shield';
  const two = Object.keys(ITEMS).find((k) => ITEMS[k].type === 'weapon2h' && !ITEMS[k].gen); give(two);
  assert.ok(compareGear(two).notes.some((x) => /BOTH HANDS: SHIELD OFF/.test(x.text) && x.dir < 0));
  give('ember_mail', 'ember_helm'); S.equip.armor = 'ember_mail';
  assert.ok(compareGear('ember_helm').notes.some((x) => /EMBERFORGED SET 2\/7/.test(x.text) && x.dir > 0));
});
t('a shield compares block against the worn shield; stats a type does not have are not shown', () => {
  fresh(); const sh = Object.keys(ITEMS).filter((k) => ITEMS[k].type === 'shield' && !ITEMS[k].gen).sort((a, b) => ITEMS[a].block - ITEMS[b].block);
  give(sh[0], sh[sh.length - 1]); S.equip.offhand = sh[0];
  const c = compareGear(sh[sh.length - 1]);
  assert.ok(row(c, 'block').dir > 0); assert.ok(!row(c, 'dmg') && !row(c, 'speed'));
});
t('every equippable item compares without errors, and every row has text and a known direction', () => {
  fresh(); S.equip.weapon = 'iron_sword'; S.equip.armor = 'verdant_mail';
  for (const id of Object.keys(ITEMS)) {
    const c = compareGear(id);
    if (!c) continue;
    for (const r of c.rows) { assert.ok(typeof r.aText === 'string' && r.aText.length, id + ' ' + r.key); assert.ok([1, 0, -1].includes(r.dir)); }
    assert.ok(['BETTER', 'WORSE', 'MIXED', 'SAME', 'EQUIPPED'].includes(c.badge));
    statsOf(id, c.slot);
  }
});
t('the verdict weights live in TUNE.hud.compare', () => { assert.ok(TUNE.hud.compare.w.dmg > 0 && TUNE.hud.compare.mixedBand > 0); });
console.log(`GEAR COMPARE PASSED (${n} tests)`);
