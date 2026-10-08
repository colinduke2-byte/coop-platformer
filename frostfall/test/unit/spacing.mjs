// World spacing: places must not sit on top of each other. Walk speed is 4.5 tiles per second (TUNE.player.speed 72 px / 16).
//   node test/unit/spacing.mjs
import assert from 'node:assert/strict';
import { S } from '../../src/systems/state.js';
import { getRegion } from '../../src/data/maps.js';
import { MAJOR } from '../../src/world/worldgen.js';
let n = 0, failed = 0;
const t = (name, fn) => { try { fn(); n++; console.log('  ok   ' + name); } catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + e.message.split('\n')[0]); } };
const LIMITS = { reach: { min: 22, p10: 30, med: 40, maj: 50, size: [540, 378] }, ashen: { min: 20, p10: 24, med: 26, maj: 40 }, coast: { min: 20, p10: 24, med: 28, maj: 40 }, kingdom: { min: 20, p10: 24, med: 28, maj: 40 }, fens: { min: 20, p10: 24, med: 28, maj: 40 }, highlands: { min: 20, p10: 24, med: 28, maj: 40 }, glasswood: { min: 20, p10: 24, med: 28, maj: 40 }, underdeep: { min: 20, p10: 24, med: 28, maj: 40 } };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
for (const [id, L] of Object.entries(LIMITS)) {
  t(`${id}: places keep their distance over many seeds (about ${Math.round(L.med / 4.5)} seconds apart)`, () => {
    for (let k = 0; k < 8; k++) {
      S.seed = 5000 + k * 104729;
      const reg = getRegion(id);
      if (L.size) assert.deepEqual([reg.w, reg.h], L.size);
      const pois = reg.pois.filter((p) => !['rest', 'spring', 'cache', 'hermit', 'ancient'].includes(p.kind));
      const nn = pois.map((p, i) => Math.min(...pois.filter((_, j) => j !== i).map((q) => dist(p, q)))).sort((a, b) => a - b);
      assert.ok(nn[0] >= L.min, `seed ${S.seed}: closest pair ${Math.round(nn[0])} < ${L.min}`);
      assert.ok(nn[Math.floor(nn.length * 0.1)] >= L.p10, `seed ${S.seed}: 10th percentile ${Math.round(nn[Math.floor(nn.length * 0.1)])} < ${L.p10}`);
      assert.ok(nn[Math.floor(nn.length / 2)] >= L.med, `seed ${S.seed}: median ${Math.round(nn[Math.floor(nn.length / 2)])} < ${L.med}`);
      const maj = reg.pois.filter((p) => MAJOR.has(p.kind));
      for (let i = 0; i < maj.length; i++) for (let j = i + 1; j < maj.length; j++) assert.ok(dist(maj[i], maj[j]) >= L.maj, `seed ${S.seed}: major places ${maj[i].kind}/${maj[j].kind} only ${Math.round(dist(maj[i], maj[j]))} apart`);
    }
  });
}
t('hidden places keep their own distance and have no road to them', () => {
  S.seed = 424242; const reg = getRegion('reach');
  const hid = reg.pois.filter((p) => ['cache', 'hermit', 'ancient'].includes(p.kind));
  assert.ok(hid.length >= 12, `only ${hid.length} hidden places`);
  for (const a of hid) for (const b of reg.pois) if (a !== b) assert.ok(dist(a, b) >= 18, `${a.id} is only ${Math.round(dist(a, b))} from ${b.id}`);
});
t('the wild is not empty: no 120x120 square of the Reach has neither a place nor a road tile', () => {
  S.seed = 424242; const reg = getRegion('reach');
  const hasRoad = (x0, y0) => { for (let y = y0; y < y0 + 120; y += 3) for (let x = x0; x < x0 + 120; x += 3) if (reg.grid[y]?.[x] === 5 || reg.grid[y]?.[x] === 24) return true; return false; };
  let empty = 0;
  for (let y = 0; y + 120 <= reg.h; y += 60) for (let x = 0; x + 120 <= reg.w; x += 60) { const near = reg.pois.some((p) => p.x >= x - 10 && p.x < x + 130 && p.y >= y - 10 && p.y < y + 130); if (!near && !hasRoad(x, y)) empty++; }
  assert.equal(empty, 0, `${empty} featureless squares`);
});
t('long roads carry waystones that name what lies ahead', () => {
  for (const [id, min] of [['reach', 12], ['ashen', 3], ['coast', 3], ['kingdom', 3]]) {
    S.seed = 424242; const reg = getRegion(id);
    const w = reg.entities.filter((e) => e.t === 'sign' && /WAYSTONE/.test(e.text[0]));
    assert.ok(w.length >= min, `${id}: ${w.length} waystones`);
    assert.ok(w.every((e) => /PACES\.$/.test(e.text[1]) && /^(NORTH|SOUTH|EAST|WEST)/.test(e.text[1])), `${id}: bad waystone text`);
  }
});
console.log(failed ? 'SPACING FAILED' : `SPACING PASSED (${n} tests)`);
process.exit(failed ? 1 : 0);
