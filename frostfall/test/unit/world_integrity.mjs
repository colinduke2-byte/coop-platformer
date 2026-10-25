// World integrity: every hand-built map and every generated overworld, dungeon and delve on several seeds comes out
// whole. Buildings are intact (a roof is a rectangle with full wall rows under it, a door sits in its wall), doors,
// exits, people, chests, signs and quest places stand on open ground you can walk to, nothing solid blocks a road or a
// door step, every tile id exists, and nothing sits outside its map.
//   node test/unit/world_integrity.mjs            (SEEDS=1,2,3 to choose seeds, ONLY=forest,coast for some maps, VERBOSE=1 to list every fault)
import { S } from '../../src/systems/state.js';
import { MAPS } from '../../src/data/maps.js';
import { TILE, SOLID_TILES } from '../../src/config.js';

const SOLID = new Set(SOLID_TILES);
const KNOWN = new Set(Object.values(TILE));
const ROOF = TILE.ROOF;
const WALL = new Set([TILE.WOODWALL, TILE.WINDOW, TILE.DOOR, TILE.STONE, TILE.SANDRUIN, TILE.CWALL, TILE.CWALL2]);
const HOUSE = new Set([TILE.ROOF, TILE.WOODWALL, TILE.WINDOW, TILE.DOOR]);
const ROAD = new Set([TILE.PATH, TILE.PATH2]);
// entities that someone walks up to (or that must be reached to finish something)
const VISIT = new Set(['npc', 'chest', 'sign', 'shrine', 'lore', 'board', 'fire', 'boss', 'cairn', 'snare', 'spring', 'lmsecret', 'pickup', 'node', 'herb', 'dig', 'bed', 'cauldron', 'furnisher', 'arenamaster', 'plate', 'brazier']);
const SEEDS = (process.env.SEEDS || '1,7,1337,424242,99999,31337').split(',').map(Number);

// flood fill over walkable tiles from every spawn (a map may have several entrances)
// (cells of gates, cracked walls and vault walls count as open: they open in play)
function reach(b, starts, open = new Set()) {
  const { w, h, grid } = b, seen = new Uint8Array(w * h), q = [];
  const SOLID_ = { has: (t) => SOLID.has(t) }, blocked = (x, y) => SOLID_.has(grid[y][x]) && !open.has(y * w + x);
  for (const s of starts) if (s.x >= 0 && s.y >= 0 && s.x < w && s.y < h && !blocked(s.x, s.y) && !seen[s.y * w + s.x]) { seen[s.y * w + s.x] = 1; q.push([s.x, s.y]); }
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || seen[ny * w + nx] || blocked(nx, ny)) continue;
      seen[ny * w + nx] = 1; q.push([nx, ny]);
    }
  }
  return seen;
}

// Checks one built map; returns a list of faults as strings.
export function checkMap(id, b, opts = {}) {
  const out = [], { w, h, grid } = b, at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h ? grid[y][x] : -1);
  const fault = (kind, msg) => out.push(`${id}: ${kind}: ${msg}`);
  // tile ids
  const unknown = new Map();
  for (let y = 0; y < h; y++) {
    if (grid[y].length !== w) fault('grid', `row ${y} is ${grid[y].length} wide, not ${w}`);
    for (let x = 0; x < w; x++) if (!KNOWN.has(grid[y][x])) unknown.set(grid[y][x], `${x},${y}`);
  }
  for (const [t, p] of unknown) fault('tile', `undefined tile id ${t} (first at ${p})`);
  // buildings: each roof block is a rectangle with full wall rows under it and nothing loose beside it
  const seenRoof = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (grid[y][x] !== ROOF || seenRoof[y * w + x]) continue;
    const cells = [], q = [[x, y]]; seenRoof[y * w + x] = 1;
    for (let i = 0; i < q.length; i++) {
      const [cx, cy] = q[i]; cells.push(q[i]);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (at(nx, ny) === ROOF && !seenRoof[ny * w + nx]) { seenRoof[ny * w + nx] = 1; q.push([nx, ny]); } }
    }
    const x0 = Math.min(...cells.map((c) => c[0])), x1 = Math.max(...cells.map((c) => c[0])), y0 = Math.min(...cells.map((c) => c[1])), y1 = Math.max(...cells.map((c) => c[1]));
    const where = `roof ${x0},${y0} ${x1 - x0 + 1}x${y1 - y0 + 1}`;
    if (cells.length !== (x1 - x0 + 1) * (y1 - y0 + 1)) { fault('building', `${where} is not a rectangle (holes or a loose chunk)`); continue; }
    let rows = 0;
    for (let yy = y1 + 1; yy < h; yy++) { let full = true; for (let xx = x0; xx <= x1; xx++) if (!WALL.has(at(xx, yy))) full = false; if (!full) break; rows++; }
    if (!rows) { fault('building', `${where} has no full wall row under it`); continue; }
    { const yy = y1 + rows + 1, n = [...Array(x1 - x0 + 1).keys()].filter((i) => [TILE.WOODWALL, TILE.WINDOW, TILE.DOOR, TILE.SANDRUIN, TILE.CWALL].includes(at(x0 + i, yy))).length;
      if (n && rows < 3) fault('building', `${where}: wall row ${yy} has a hole in it`); }
    for (let yy = y1 + 1; yy <= y1 + rows; yy++) for (const xx of [x0 - 1, x1 + 1]) if ([TILE.WOODWALL, TILE.WINDOW].includes(at(xx, yy)) && at(xx, y1) !== ROOF) fault('building', `${where}: wall row ${yy} runs past its roof at ${xx}`);
  }
  // a house's doors and windows have a roof over them (up through at most three wall rows). Gate fronts, palisades and
  // interiors have no doors or windows in a wall, or no roofs at all.
  if (opts.outdoor) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (grid[y][x] !== TILE.DOOR && grid[y][x] !== TILE.WINDOW) continue;
    let yy = y - 1; while (yy > y - 4 && WALL.has(at(x, yy))) yy--;
    if (at(x, yy) !== ROOF) fault('building', `${grid[y][x] === TILE.DOOR ? 'door' : 'window'} at ${x},${y} has no roof over it`);
  }
  // doors sit in a wall and open onto walkable ground
  const doorTiles = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (grid[y][x] !== TILE.DOOR) continue;
    if (!WALL.has(at(x - 1, y)) && !WALL.has(at(x + 1, y)) && !HOUSE.has(at(x, y - 1))) fault('door', `door tile ${x},${y} is not set in a wall`);
    if (SOLID.has(at(x, y + 1))) fault('door', `door tile ${x},${y} is blocked below by tile ${at(x, y + 1)}`);
    if (opts.outdoor) doorTiles.push(`${x},${y + 1}`);
  }
  // entities
  const ents = b.entities || [];
  const spawns = ents.filter((e) => e.t === 'spawn');
  const starts = opts.start ? [opts.start, ...spawns] : spawns;
  const gates = new Set();
  for (const e of ents) {
    if (['keygate', 'bossgate'].includes(e.t)) for (let i = 0; i < (e.w ?? 1); i++) gates.add(e.y * w + e.x + i);
    if (['crackwall', 'vaultwall'].includes(e.t)) gates.add(e.y * w + e.x);
    if (e.t === 'brazierorder' && e.wx != null) gates.add(e.wy * w + e.wx);
  }
  const seen = reach(b, starts, gates);
  const reachable = (x, y) => x >= 0 && y >= 0 && x < w && y < h && seen[y * w + x];
  const nearReach = (e, r = 1) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) + Math.abs(dy) <= r && reachable(e.x + dx, e.y + dy)) return true; return false; };
  const doorSteps = new Set(doorTiles);
  for (const e of ents) {
    if (e.x == null || e.y == null) continue;
    const ew = e.w ?? 1, eh = e.h ?? 1;
    if (e.x < 0 || e.y < 0 || e.x + ew > w || e.y + eh > h) { fault('outside', `${e.t}${e.id ? ' ' + e.id : ''} at ${e.x},${e.y} is outside the ${w}x${h} map`); continue; }
    if (!starts.length) continue;
    const tag = `${e.t}${e.id ? ' ' + e.id : e.kind ? ' ' + e.kind : ''} at ${e.x},${e.y}`;
    if (e.t === 'door') {
      doorSteps.add(`${e.x},${e.y + 1}`);
      if (grid[e.y][e.x] !== TILE.DOOR && grid[e.y][e.x] !== TILE.STAIRS) fault('door', `${tag} (to ${e.to}) is not on a door tile (tile ${grid[e.y][e.x]})`);
      if (!nearReach(e)) fault('reach', `${tag} cannot be walked to`);
    } else if (e.t === 'exit') {
      let ok = false;
      for (let yy = e.y - 1; yy <= e.y + eh && !ok; yy++) for (let xx = e.x - 1; xx <= e.x + ew && !ok; xx++) if (reachable(xx, yy)) ok = true;
      if (!ok && !e.hidden) fault('reach', `${tag} (to ${e.to}) cannot be walked to`);
    } else if (VISIT.has(e.t)) {
      const t = grid[e.y][e.x], solidOk = ['fire', 'brazier', 'board', 'node', 'shrine', 'spring', 'lmsecret', 'cauldron', 'bed', 'furnisher'].includes(e.t);
      if (SOLID.has(t) && !solidOk && !(e.t === 'chest' && e.sealed)) fault('ground', `${tag} stands on solid tile ${t}`);
      if (!nearReach(e) && !opts.skipReach?.(e)) fault('reach', `${tag} cannot be walked to`);
    }
  }
  // the step in front of every door is open and free of props
  for (const k of doorSteps) {
    const [x, y] = k.split(',').map(Number);
    if (SOLID.has(at(x, y))) fault('door', `door step ${x},${y} is blocked by tile ${at(x, y)}`);
    const by = ents.find((e) => e.x === x && e.y === y && ['pot', 'prop', 'sign', 'chest', 'npc'].includes(e.t));
    if (by) fault('door', `door step ${x},${y} is blocked by a ${by.t}`);
  }
  // nothing solid stands in a road: a solid tile with road on two opposite sides
  if (opts.roads) for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const t = grid[y][x];
    if (!SOLID.has(t) || HOUSE.has(t) || t === TILE.FIRE) continue;
    if ((ROAD.has(grid[y][x - 1]) && ROAD.has(grid[y][x + 1]) && ROAD.has(grid[y - 1][x]) && ROAD.has(grid[y + 1][x]))) fault('road', `solid tile ${t} at ${x},${y} stands in a road`);
  }
  for (const e of ents) if (e.t === 'prop' && e.x != null && ROAD.has(at(e.x, e.y)) && ROAD.has(at(e.x - 1, e.y)) && ROAD.has(at(e.x + 1, e.y)) && ROAD.has(at(e.x, e.y - 1)) && ROAD.has(at(e.x, e.y + 1)) && opts.roads) fault('road', `${e.t} at ${e.x},${e.y} stands in a road`);
  return out;
}

// every map, built for one seed
export function checkAll(seed, only = null) {
  S.seed = seed;
  const faults = [];
  for (const id of Object.keys(MAPS)) {
    if (only && !only.includes(id)) continue;
    const m = MAPS[id], b = m.build();
    const outdoor = !!(m.stream || m.outdoors || m.snow) && !m.interior;
    faults.push(...checkMap(id, b, { outdoor, roads: !!m.stream, start: m.stream ? b.start || null : null }));
  }
  return faults;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  let all = [];
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  for (const seed of SEEDS) { const f = checkAll(seed, only); all.push(...f.map((s) => `seed ${seed} ${s}`)); }
  const byKind = {};
  for (const s of all) { const k = s.split(': ')[0].replace(/^seed \d+ /, '') + ': ' + s.split(': ')[1]; byKind[k] = (byKind[k] || 0) + 1; }
  if (process.env.VERBOSE) console.log(all.join('\n'));
  else for (const s of all.slice(0, 60)) console.log('  ' + s);
  if (all.length) { console.log(byKind); console.log(`WORLD INTEGRITY FAILED: ${all.length} faults`); process.exit(1); }
  console.log(`  ok   ${SEEDS.length} seeds, every map whole`);
}
