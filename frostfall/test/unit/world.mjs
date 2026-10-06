// Open world + procedural dungeon generation: every seed must give a playable map. node test/unit/world.mjs
import assert from 'node:assert/strict';
import { S } from '../../src/systems/state.js';
import { getReach, MAPS } from '../../src/data/maps.js';
import { SOLID_TILES } from '../../src/config.js';
import { genItem, RARITY } from '../../src/systems/genloot.js';
import { rng } from '../../src/world/worldgen.js';

const solidSet = new Set(SOLID_TILES);
const flood = (grid, w, h, sx, sy) => {
  const seen = new Uint8Array(w * h), q = [[sx, sy]]; seen[sy * w + sx] = 1;
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen[ny * w + nx] || solidSet.has(grid[ny][nx])) continue;
      seen[ny * w + nx] = 1; q.push([nx, ny]);
    }
  }
  return seen;
};
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('  ok   ' + name); };

t('25 seeds: everything outside the old forest is reachable and stands on open ground', () => {
  for (let k = 1; k <= 25; k++) {
    S.seed = k * 7919;
    const r = getReach();
    const seen = flood(r.grid, r.w, r.h, 4, 15);
    for (const e of r.entities) {
      if (!['enemy', 'chest', 'shrine', 'node', 'dig', 'herb', 'deer'].includes(e.t) || (e.x < 56 && e.y < 32)) continue;
      assert.ok(!solidSet.has(r.grid[e.y][e.x]), `seed ${S.seed}: ${e.t}@${e.x},${e.y} on a solid tile`);
      assert.ok(seen[e.y * r.w + e.x], `seed ${S.seed}: ${e.t}@${e.x},${e.y} unreachable`);
    }
    assert.ok(r.pois.length >= 25, 'enough points of interest: ' + r.pois.length);
  }
});
t('the layout depends on the seed', () => {
  S.seed = 11; const a = getReach().pois.map((p) => p.kind + p.x + p.y).join();
  S.seed = 12; const b = getReach().pois.map((p) => p.kind + p.x + p.y).join();
  assert.notEqual(a, b);
});
t('the same seed always gives the same world', () => {
  S.seed = 99; const a = JSON.stringify(getReach().pois);
  S.seed = 5; getReach(); S.seed = 99;
  assert.equal(JSON.stringify(getReach().pois), a);
});
t('barrows: every enemy and chest is reachable from the entrance', () => {
  for (let k = 1; k <= 25; k++) {
    S.seed = k * 104729;
    for (let i = 0; i < 3; i++) {
      const b = MAPS['barrow' + i].build();
      const sp = b.entities.find((e) => e.t === 'spawn');
      const seen = flood(b.grid, b.w, b.h, sp.x, sp.y);
      for (const e of b.entities) {
        if (e.t === 'enemy' || (e.t === 'chest' && !String(e.id).match(/^bt\d_\d$/))) assert.ok(seen[e.y * b.w + e.x], `seed ${S.seed} barrow ${i}: ${e.t}@${e.x},${e.y} unreachable`);
      }
      assert.ok(b.entities.some((e) => e.t === 'enemy' && e.champion), 'has a boss');
    }
  }
});
t('generated gear: rarity decides affix count, higher tiers are stronger', () => {
  const R = rng(5);
  for (let i = 0; i < 200; i++) {
    const it = genItem(1, R);
    const want = RARITY.find((r) => r.id === it.rarity).affixes;
    assert.ok(it.affixLines.length <= want, `${it.name}: ${it.affixLines.length} > ${want}`);
    assert.ok(it.name && it.desc && it.icon);
  }
  const avg = (tier) => { let s = 0, c = 0; const R2 = rng(7); for (let i = 0; i < 300; i++) { const it = genItem(tier, R2); if (it.dmg) { s += it.dmg; c++; } } return s / c; };
  assert.ok(avg(3) > avg(0) * 1.4, 'tier scaling');
});
import { startNgPlus, resetState } from '../../src/systems/state.js';
t('startNgPlus: character carries over, quests and kills reset', () => {
  resetState();
  S.charLevel = 7; S.gold = 321; S.skills.archery.lvl = 9; S.perks.keenedge = true; S.inv.iron_sword = 2; S.flags.ending = 'give'; S.flags.bossDead = true;
  S.killed = { 'forest:3': -1 }; S.bounty = { camp0: true }; S.quests.wolves.status = 'done'; const oldSeed = S.seed;
  startNgPlus();
  assert.equal(S.ngPlus, 1);
  assert.equal(S.charLevel, 7); assert.equal(S.gold, 321); assert.equal(S.skills.archery.lvl, 9); assert.ok(S.perks.keenedge); assert.equal(S.inv.iron_sword, 2);
  assert.equal(S.flags.ending, undefined); assert.equal(S.flags.bossDead, undefined);
  assert.deepEqual(S.killed, {}); assert.deepEqual(S.bounty, {}); assert.equal(S.quests.wolves.status, 'inactive');
  assert.notEqual(S.seed, oldSeed);
  startNgPlus(); assert.equal(S.ngPlus, 2);
});
t('every seed places all five dungeon entrances, and each dungeon is fully reachable', () => {
  for (let k = 1; k <= 25; k++) {
    S.seed = k * 7919;
    const ids = getReach().pois.map((p) => p.id);
    for (const id of ['maw0', 'fort0', 'temple0', 'rootvault0', 'throne0']) assert.ok(ids.includes(id), `${id} missing for seed ${S.seed}`);
    // every entrance is walkable from the start and its exit tile survived pruning
    const r = getReach();
    const seen = flood(r.grid, r.w, r.h, 4, 15);
    for (const to of ['maw', 'keep', 'chapel', 'rootvault', 'throne']) {
      const ex = r.entities.find((e) => e.t === 'exit' && e.to === to);
      assert.ok(ex, `exit to ${to} missing for seed ${S.seed}`);
      assert.ok(seen[ex.y * r.w + ex.x] || seen[(ex.y + 1) * r.w + ex.x], `exit to ${to} unreachable for seed ${S.seed}`);
    }
  }
  const bosses = { maw: 'wyrm', keep: 'warlord', chapel: 'tide', rootvault: 'root', throne: 'winter' };
  for (const [map, boss] of Object.entries(bosses)) {
    const b = MAPS[map].build();
    const sp = b.entities.find((e) => e.t === 'spawn' && e.name === 'entry');
    const seen = flood(b.grid, b.w, b.h, sp.x, sp.y);
    for (const e of b.entities) if (['enemy', 'boss', 'pot'].includes(e.t) || (e.t === 'chest' && !['chapel1'].includes(e.id))) assert.ok(seen[e.y * b.w + e.x], `${map}: ${e.t}@${e.x},${e.y} unreachable`);
    assert.ok(b.entities.some((e) => e.t === 'boss' && e.kind === boss), map + ' has its boss');
    // exits lead back to the open world and the spawn exists there
    const ex = b.entities.find((e) => e.t === 'exit');
    assert.equal(ex.to, 'forest');
  }
});
console.log(`${n} world tests passed`);
