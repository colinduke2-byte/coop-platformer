// The Hearts quest points at the easiest remaining Heart (lowest danger tier of its site), after the Rime Heart.
// node test/unit/hearts_order.mjs
import assert from 'node:assert/strict';
import { S } from '../../src/systems/state.js';
import { getReach } from '../../src/data/maps.js';
import { HEART_ORDER, HEART_SITE } from '../../src/data/hearts.js';
import { nextHeart } from '../../src/data/quests.js';

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('  ok   ' + name); };
const tierOf = (k) => getReach().pois.find((p) => p.id === HEART_SITE[k].poi)?.tier;

t('the Rime Heart comes first, whatever the tiers', () => {
  for (let k = 1; k <= 6; k++) { S.seed = k * 7919; S.hearts = {}; assert.equal(nextHeart(), 'rime'); }
});
t('after the Rime Heart, the marker picks the lowest-tier remaining site (ties in story order)', () => {
  let picked = 0;
  for (let k = 1; k <= 24; k++) {
    S.seed = k * 7919;
    for (const held of [['rime'], ['rime', 'iron'], ['rime', 'tide'], ['rime', 'root'], ['rime', 'iron', 'tide']]) {
      S.hearts = Object.fromEntries(held.map((h) => [h, true]));
      const left = HEART_ORDER.filter((h) => !S.hearts[h]);
      const best = Math.min(...left.map(tierOf));
      const want = left.find((h) => tierOf(h) === best);
      assert.equal(nextHeart(), want, `seed ${S.seed}, holding ${held}: ${left.map((h) => h + ' t' + tierOf(h))}`);
      picked++;
    }
  }
  assert.ok(picked > 0);
});
t('with all four Hearts there is nothing left to point at', () => {
  S.hearts = { rime: true, iron: true, tide: true, root: true };
  assert.equal(nextHeart(), undefined);
});
console.log(`${n} hearts-order tests passed`);
