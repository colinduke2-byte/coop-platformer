// Reachability fuzz: for many seeds and every overworld region, flood-fill on foot from the region's entrance and check that
// every place, chest, lore page, NPC, shrine, spring and exit can be reached, that nothing interactive sits on a solid tile,
// that place ids are unique, and that the same seed builds the same region twice.
//   node test/unit/reach.mjs [seeds=24]
import { S } from '../../src/systems/state.js';
import { getRegion } from '../../src/data/maps.js';
import { REGION_DEFS } from '../../src/world/worldgen.js';
import { SOLID_TILES, TILE } from '../../src/config.js';
import '../../src/world/landmarks.js';

const N = +process.argv[2] || 24;
const SOL = new Set(SOLID_TILES), TN = Object.fromEntries(Object.entries(TILE).map(([k, v]) => [v, k]));
const problems = {};
const bump = (k, ex) => { (problems[k] ||= []).push(ex); };
let regions = 0;
for (let s = 0; s < N; s++) {
  S.seed = 1000 + s * 7919;
  for (const [id, def] of Object.entries(REGION_DEFS)) {
    const b = getRegion(id), W = b.w, H = b.h, g = b.grid;
    regions++;
    const st = id === 'reach' ? { x: 4, y: 15 } : def.start;
    const seen = new Uint8Array(W * H), q = [[st.x, st.y]]; seen[st.y * W + st.x] = 1;
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || SOL.has(g[ny][nx])) continue;
        seen[ny * W + nx] = 1; q.push([nx, ny]);
      }
    }
    const near = (x, y) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen[(y + dy) * W + x + dx]);
    // places that quests need must exist on every seed
    const NEED = { vale: ['hive', 'heartgrove', 'thornpatch', 'thornroot', 'greenhollow'], sunscorch: ['oasis', 'raidercamp', 'burrowpit', 'tombmouth', 'thiefden', 'sealedvault', 'amberwell'], reach: ['valegate', 'dunegate'] };
    for (const k of NEED[id] || []) if (!b.pois.some((p) => p.kind === k)) bump(`${id}: quest place ${k} missing`, S.seed);
    const ids = {};
    for (const p of b.pois) ids[p.id] = (ids[p.id] || 0) + 1;
    for (const [k, v] of Object.entries(ids)) if (v > 1) bump(`${id}: duplicate place id`, `${S.seed}:${k}`);
    for (const p of b.pois) { let ok = false; for (let dy = -3; dy <= 3 && !ok; dy++) for (let dx = -3; dx <= 3 && !ok; dx++) if (seen[(p.y + dy) * W + p.x + dx]) ok = true; if (!ok) bump(`${id}: place unreachable`, `${S.seed}:${p.id}`); }
    for (const e of b.entities) {
      if (e.x == null || e.y == null) continue;
      const x = Math.floor(e.x), y = Math.floor(e.y);
      if (['chest', 'lore', 'npc', 'shrine', 'spring', 'herb'].includes(e.t)) {
        if (!near(x, y)) bump(`${id}: ${e.t} unreachable`, `${S.seed}:${e.id || e.item || ''}@${x},${y}:${TN[g[y]?.[x]]}`);
      }
      if (['chest', 'npc', 'enemy'].includes(e.t) && SOL.has(g[y]?.[x])) bump(`${id}: ${e.t} on a solid tile`, `${S.seed}:${e.id || e.kind}:${TN[g[y][x]]}`);
      if (e.t === 'exit') { let ok = false; for (let j = 0; j < (e.h || 1); j++) for (let i = 0; i < (e.w || 1); i++) if (near(x + i, y + j)) ok = true; if (!ok) bump(`${id}: exit unreachable`, `${S.seed}:${e.to}`); }
    }
  }
}
// generated dungeons: from the entrance, every enemy, boss, chest and exit can be reached (locked gates count as open: their keys are tested elsewhere)
const M = await import('../../src/data/maps.js');
const DUNGEONS = ['thornroot', 'sealedvault', 'hartspire', 'lodenest', 'smugglercove', 'mirebarrow', 'stormspire', 'tidebreak', 'sepulchre'];
for (let s = 0; s < Math.min(N, 12); s++) {
  S.seed = 3000 + s * 104729;
  for (const id of DUNGEONS) {
    if (!M.MAPS[id]) { bump(`${id}: no such map`, ''); continue; }
    const b = M.MAPS[id].build(), W = b.w, H = b.h, g = b.grid;
    const sp = b.entities.find((e) => e.t === 'spawn' && (e.name === 'entry' || e.name === id)) || b.entities.find((e) => e.t === 'spawn');
    const gates = new Set(b.entities.filter((e) => ['gate', 'door', 'lockdoor', 'keydoor', 'keygate', 'bossgate', 'vaultwall'].includes(e.t)).flatMap((e) => { const o = []; for (let j = 0; j < (e.h || 1); j++) for (let i = 0; i < (e.w || 1); i++) o.push((e.y + j) * W + e.x + i); return o; }));
    const seen = new Uint8Array(W * H), q = [[sp.x, sp.y]]; seen[sp.y * W + sp.x] = 1;
    for (let i = 0; i < q.length; i++) { const [x, y] = q[i]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || (SOL.has(g[ny][nx]) && !gates.has(ny * W + nx))) continue; seen[ny * W + nx] = 1; q.push([nx, ny]); } }
    const near = (x, y) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen[(y + dy) * W + x + dx]);
    for (const e of b.entities) {
      if (!['enemy', 'boss', 'chest', 'exit', 'lore', 'key', 'plate', 'fire'].includes(e.t) || e.x == null) continue;
      if (!near(Math.floor(e.x), Math.floor(e.y))) bump(`${id}: ${e.t} unreachable`, `${S.seed}:${e.id || e.kind || e.to || ''}@${e.x},${e.y}`);
    }
    if (!b.entities.some((e) => e.t === 'boss')) bump(`${id}: no boss`, S.seed);
  }
}
// determinism: the same seed twice gives the same region
S.seed = 4242; const a = JSON.stringify(getRegion('vale').pois); S.seed = 4243; getRegion('vale'); S.seed = 4242; const b2 = JSON.stringify(getRegion('vale').pois);
if (a !== b2) bump('determinism', 'vale differs between two builds of seed 4242');

const keys = Object.keys(problems);
for (const k of keys.sort()) console.log(`  FAIL ${k}: ${problems[k].length} (${problems[k].slice(0, 4).join(' ')})`);
console.log(keys.length ? 'REACH FUZZ FAILED' : `REACH FUZZ PASSED (${regions} region builds, ${N} seeds)`);
process.exit(keys.length ? 1 : 0);
