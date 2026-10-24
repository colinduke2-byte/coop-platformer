// World audit fixes and upgrades (WQ items) that are pure logic: node test/unit/world_wq.mjs
import assert from 'node:assert/strict';
import { S } from '../../src/systems/state.js';
import { getRegion } from '../../src/data/maps.js';
import { tierIn, tierAt } from '../../src/world/worldgen.js';
import { TILE } from '../../src/config.js';

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('  ok   ' + name); };

t('WQ1: every region rolls its events at its own tier (the Sunscorch trader is tier 2 or more)', () => {
  S.seed = 1000;
  const sun = getRegion('sunscorch');
  for (let y = 8; y < sun.h - 8; y += 9) for (let x = 8; x < sun.w - 8; x += 9) assert.ok(tierIn('sunscorch', x, y) >= 2, `sunscorch ${x},${y}`);
  let deepHigh = 0, deep = 0;
  for (let y = 8; y < 170; y += 9) for (let x = 8; x < 230; x += 9) { deep++; if (tierIn('underdeep', x, y) >= 2) deepHigh++; }
  assert.equal(deepHigh, deep, 'the Underdeep is tier 2+ everywhere');
  assert.equal(tierIn('reach', 300, 200), tierAt(300, 200), 'the Reach keeps its own formula');
});

t('WQ9: hidden places in warm regions are not dressed in snow and pines', () => {
  for (const rid of ['sunscorch', 'vale', 'fens', 'ashen', 'underdeep', 'glasswood']) for (const seed of [1000, 8919]) {
    S.seed = seed;
    const r = getRegion(rid);
    for (const p of r.pois.filter((q) => ['cache', 'hermit', 'ancient', 'spring'].includes(q.kind))) {
      let bad = 0;
      for (let y = p.y - 5; y <= p.y + 5; y++) for (let x = p.x - 6; x <= p.x + 6; x++) if ([TILE.SNOW, TILE.SNOW2].includes(r.grid[y]?.[x])) bad++;
      assert.equal(bad, 0, `${rid} ${seed} ${p.id}: ${bad} snow tiles`);
      if (p.kind === 'ancient') assert.notEqual(r.grid[p.y][p.x + 5], TILE.PINE, `${rid} ancient tree ringed by pines`);
    }
  }
});

console.log(`${n} world WQ tests passed`);
