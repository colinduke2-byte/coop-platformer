// Mages through the whole game (PR-01): spells scale with the staff, its forge level and the Destruction skill, so an ordinary
// enemy costs about as many Fireballs as a melee build needs swings (a bit more: spells hit from range and can hit several).
import assert from 'node:assert/strict';
import { fireballsFor, swingsFor } from '../../src/systems/powercurve.js';
let n = 0, failed = 0;
const t = (name, fn) => { try { fn(); n++; console.log('  ok   ' + name); } catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message.split('\n')[0]); } };
const row = (tier) => `tier ${tier}: ${fireballsFor(tier).toFixed(1)} Fireballs vs ${swingsFor(tier).toFixed(1)} swings`;
t('an ordinary enemy takes between 0.8x and 1.6x as many Fireballs as melee swings, in every tier', () => {
  for (let tier = 0; tier <= 3; tier++) { const r = fireballsFor(tier) / swingsFor(tier); assert.ok(r > 0.8 && r < 1.6, row(tier)); }
});
t('a late ordinary enemy takes at most 12 Fireballs (it took about 30 before staves scaled)', () => assert.ok(fireballsFor(3) <= 12, row(3)));
t('staff upgrades matter for a mage like weapon upgrades for a fighter', () => {
  for (let tier = 1; tier <= 3; tier++) assert.ok(fireballsFor(tier, { upg: 0 }) > fireballsFor(tier) * 1.1, row(tier));
});
for (let tier = 0; tier <= 3; tier++) console.log('       ' + row(tier));
console.log(failed ? 'MAGE FAILED' : `MAGE PASSED (${n} tests)`);
process.exit(failed ? 1 : 0);
