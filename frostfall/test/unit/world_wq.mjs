// World audit fixes and upgrades (WQ items) that are pure logic: node test/unit/world_wq.mjs
import assert from 'node:assert/strict';
import { S } from '../../src/systems/state.js';
import { getRegion } from '../../src/data/maps.js';
import { tierIn, tierAt } from '../../src/world/worldgen.js';
import { TILE } from '../../src/config.js';
import { buildBarrow } from '../../src/world/barrowgen.js';

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

t('WQ14: the rune order is carved in an earlier room, not printed beside the plates', () => {
  let n14 = 0;
  for (let seed = 1; seed < 400 && n14 < 12; seed++) for (let idx = 0; idx < 3; idx++) {
    const b = buildBarrow(seed * 31, idx, 1);
    const po = b.entities.find((e) => e.t === 'plateorder'); if (!po) continue;
    const plate = b.entities.find((e) => e.t === 'plate'), carv = b.entities.find((e) => e.t === 'sign' && e.text[0] === 'A CARVING ON THE WALL:');
    assert.ok(carv && carv.y > plate.y + 3, 'the carving is in the room before the plates');
    assert.ok(!b.entities.some((e) => e.t === 'sign' && /MOON \(BLUE\)/.test(e.text.join(' '))), 'no sign prints the answer');
    const at = (k) => carv.text[1].indexOf({ moon: 'MOON', crown: 'CROWN', wolf: 'WOLF' }[k]);
    assert.ok(at(po.order[0]) < at(po.order[1]) && at(po.order[1]) < at(po.order[2]), 'the carving tells the order');
    n14++;
  }
  assert.ok(n14 >= 5, 'enough trap rooms checked: ' + n14);
});
t('WQ7: Amberwell, Lanternfall and Greenhollow sit near their gate, nearer than the boss dungeon', () => {
  for (const [rid, hub, boss] of [['sunscorch', 'amberwell', 'sealedvault'], ['underdeep', 'lanternfall', 'lodenest'], ['vale', 'greenhollow', 'thornroot']]) for (const seed of [1000, 8919, 16838]) {
    S.seed = seed; const r = getRegion(rid), h = r.pois.find((p) => p.kind === hub), b = r.pois.find((p) => p.kind === boss), st = { x: 6, y: 64 };
    const dh = Math.hypot(h.x - st.x, h.y - st.y), db = Math.hypot(b.x - st.x, b.y - st.y);
    assert.ok(dh < 80 && dh < db / 2, `${rid} ${seed}: hub ${dh} boss ${db}`);
  }
});

t('WQ16: roads meet at crossroads stones that name each way', () => {
  for (const rid of ['reach', 'fens', 'ashen']) { S.seed = 8919; const c = getRegion(rid).entities.filter((e) => e.t === 'sign' && e.text[0] === 'A CROSSROADS STONE.'); assert.ok(c.length >= 4 && c.every((e) => e.text.length >= 4), `${rid}: ${c.length}`); }
});

console.log(`${n} world WQ tests passed`);
