// The Hollow Reach: a big seamless overworld grown around the original pine forest.
// The forest keeps its old coordinates in the north-west corner (quests and exits point there);
// everything else is generated from the run seed, so each new game has a different map of camps,
// ruins, dens and dungeon entrances.
import { Grid } from '../data/mapkit.js';
import { TILE, SOLID_TILES } from '../config.js';
const SOLID_SET = new Set(SOLID_TILES);
import { hash } from '../util.js';

export const REACH_W = 176;
export const REACH_H = 128;
export const START = { x: 4, y: 15 };                 // where you enter from the village (west edge of the old forest)

// Small seeded RNG (mulberry32).
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth value noise in 0..1.
function vnoise(x, y, scale, seed) {
  const fx = x / scale, fy = y / scale, x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const h = (i, j) => hash(i, j, seed);
  const a = h(x0, y0) * (1 - sx) + h(x0 + 1, y0) * sx;
  const b = h(x0, y0 + 1) * (1 - sx) + h(x0 + 1, y0 + 1) * sx;
  return a * (1 - sy) + b * sy;
}

// Danger tier 0..3 grows with distance from the entrance.
export function tierAt(x, y) {
  const d = Math.hypot(x - START.x, (y - START.y) * 0.9);
  return d < 72 ? 0 : d < 108 ? 1 : d < 142 ? 2 : 3;
}
const TIER_MOBS = [
  { melee: ['bandit', 'draugr'], ranged: ['archer'], wild: ['wolf'] },
  { melee: ['bandit', 'draugr', 'fencer', 'warden'], ranged: ['archer', 'wight'], wild: ['wolf', 'wolf', 'alpha'] },
  { melee: ['reaver', 'warden', 'fencer', 'draugr'], ranged: ['wight', 'conjurer', 'archer'], wild: ['alpha', 'wolf'] },
  { melee: ['reaver', 'knight', 'warden'], ranged: ['conjurer', 'wight'], wild: ['alpha'] },
];

export function buildReach(region, seed) {
  const W = REACH_W, H = REACH_H, R = rng(seed ^ 0x9e3779b9);
  const g = new Grid(W, H, TILE.SNOW);
  g.noise(TILE.SNOW2, 0.2, 9, TILE.SNOW);

  // ---- biomes --------------------------------------------------------------------------------
  const lakeSeed = seed % 997, mtnSeed = (seed >> 3) % 991, blightSeed = (seed >> 5) % 983, woodSeed = (seed >> 7) % 977;
  const biome = (x, y) => {
    const lake = vnoise(x, y, 22, lakeSeed), mtn = vnoise(x, y, 17, mtnSeed), blight = vnoise(x, y, 26, blightSeed);
    const east = x / W, south = y / H;
    if (lake > 0.66 && east > 0.3 && south > 0.18) return 'lake';
    if (mtn > 0.68 && (east > 0.25 || south > 0.35)) return 'mountain';
    if (blight > 0.62 && east > 0.45 && south > 0.4) return 'blight';
    return vnoise(x, y, 14, woodSeed) > 0.5 ? 'forest' : 'tundra';
  };
  const bio = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => biome(x, y)));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const b = bio[y][x];
    if (b === 'lake') g.t[y][x] = hash(x, y, 71) < 0.3 ? TILE.ICE2 : TILE.ICE;
    else if (b === 'mountain') g.t[y][x] = hash(x, y, 72) < 0.55 ? TILE.ROCK : (hash(x, y, 73) < 0.4 ? TILE.STONE : TILE.SNOW2);
  }
  // mountain wall around the world
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const e = Math.min(x, y, W - 1 - x, H - 1 - y);
    if (e < 3 && (e < 1 || hash(x, y, 74) < 0.85)) { g.t[y][x] = e < 2 ? TILE.ROCK : TILE.STONE; g.res[y][x] = true; }
  }

  // ---- stamp the original forest in the north-west corner ---------------------------------------
  const rw = region.w, rh = region.h;
  for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) { g.t[y][x] = region.grid[y][x]; g.res[y][x] = true; }
  // open the east and south edges of the old forest into the new world
  for (let y = 2; y < rh - 2; y++) for (let x = rw - 3; x < rw; x++) if (region.grid[y][x] === TILE.PINE) g.t[y][x] = TILE.SNOW2;
  for (let x = 2; x < rw - 2; x++) for (let y = rh - 3; y < rh; y++) if (region.grid[y][x] === TILE.PINE) g.t[y][x] = TILE.SNOW2;
  const entities = region.entities.map((e) => ({ ...e }));
  const add = (e) => { entities.push(e); };

  // ---- points of interest -----------------------------------------------------------------------
  const nodes = [{ x: 52, y: 22 }, { x: 40, y: 30 }];       // road ends already in the forest
  const pois = [];
  const taken = [{ x: 28, y: 16, r: 34 }];                   // the old forest region
  const okSpot = (x, y, r) => {
    if (x < 8 + r || y < 8 + r || x > W - 8 - r || y > H - 8 - r) return false;
    if (taken.some((t) => Math.hypot(t.x - x, t.y - y) < t.r + r)) return false;
    const b = bio[y][x];
    return b !== 'lake' && b !== 'mountain';
  };
  const place = (kind, count, r, near = null) => {
    let made = 0;
    for (let tries = 0; tries < 900 && made < count; tries++) {
      const x = 12 + Math.floor(R() * (W - 24)), y = 8 + Math.floor(R() * (H - 16));
      if (near && Math.hypot(x - near.x, y - near.y) > near.r) continue;
      if (!okSpot(x, y, r)) continue;
      taken.push({ x, y, r }); pois.push({ kind, x, y, r, tier: tierAt(x, y), id: `${kind}${made}` }); made++;
    }
  };
  place('camp', 5, 11);
  place('den', 5, 9);
  place('ruin', 4, 10);
  place('barrow', 3, 6);
  place('tower', 3, 7);
  place('grove', 3, 8);
  place('rest', 6, 4);
  place('champion', 4, 8);
  // make sure there is something gentle near the entrance
  place('den', 1, 9, { x: 70, y: 20, r: 22 });
  place('rest', 1, 4, { x: 70, y: 36, r: 18 });

  // roads: connect each poi to its nearest connected node (nearest-first)
  const connect = (a, b) => g.path([[a.x, a.y], [Math.round((a.x + b.x) / 2), a.y], [Math.round((a.x + b.x) / 2), b.y], [b.x, b.y]], 2, TILE.PATH);
  const remaining = [...pois].sort((p, q) => Math.hypot(p.x - 52, p.y - 22) - Math.hypot(q.x - 52, q.y - 22));
  for (const p of remaining) {
    let best = nodes[0], bd = 1e9;
    for (const n of nodes) { const d = Math.hypot(n.x - p.x, n.y - p.y); if (d < bd) { bd = d; best = n; } }
    connect(best, p);
    nodes.push({ x: p.x, y: p.y });
  }
  // keep forest/lake/mountain from covering roads
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g.t[y][x] === TILE.PATH) g.res[y][x] = true;

  const pickOf = (list) => list[Math.floor(R() * list.length)];
  const mobs = (tier) => TIER_MOBS[Math.min(3, tier)];
  const enemy = (kind, x, y, tier, extra = {}) => add({ t: 'enemy', kind, x, y, tier, ...extra });
  const clearing = (p, w, h, tile = TILE.SNOW2) => g.rect(p.x - (w >> 1), p.y - (h >> 1), w, h, tile);
  const chest = (p, dx, dy, tier, lock) => add({ t: 'chest', id: `${p.id}_c${dx}${dy}`, x: p.x + dx, y: p.y + dy, lock, loot: [{ gen: tier }, { gold: 20 + tier * 25 }, ...(R() < 0.6 ? [{ item: 'hp_potion', n: 1 + tier }] : [])] });
  const potsAround = (p, n, rad, skin = 'pot') => { for (let i = 0; i < n; i++) add({ t: 'pot', x: p.x + Math.round((R() - 0.5) * rad * 2), y: p.y + Math.round((R() - 0.5) * rad * 2), skin }); };

  for (const p of pois) {
    const m = mobs(p.tier);
    { const q = Math.round(p.r * 0.62); g.reserve(p.x - q, p.y - q, q * 2, q * 2); }
    if (p.kind === 'camp') {
      clearing(p, 12, 9);
      g.set(p.x, p.y, TILE.FIRE); add({ t: 'fire', x: p.x, y: p.y }); add({ t: 'glow', x: p.x, y: p.y, r: 46, col: 12 });
      const n = 3 + p.tier;
      for (let i = 0; i < n; i++) enemy(pickOf(m.melee), p.x + Math.round((R() - 0.5) * 8), p.y + Math.round((R() - 0.5) * 6), p.tier, { camp: p.id });
      for (let i = 0; i < 1 + (p.tier > 0 ? 1 : 0); i++) enemy(pickOf(m.ranged), p.x + Math.round((R() - 0.5) * 10), p.y - 3 - Math.round(R() * 2), p.tier, { camp: p.id });
      if (p.tier >= 1) enemy('chief', p.x + 2, p.y + 3, p.tier, { camp: p.id });
      chest(p, 3, 2, p.tier, p.tier >= 2 ? 'hard' : 'med');
      potsAround(p, 4, 5, 'barrel');
      add({ t: 'sign', x: p.x - 7, y: p.y, text: ['BANDIT CAMP.', 'TAKE THE CHIEF AND THE CAMP IS YOURS.'] });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'camp' });
    } else if (p.kind === 'den') {
      clearing(p, 10, 8);
      const n = 3 + Math.min(3, p.tier);
      for (let i = 0; i < n; i++) enemy('wolf', p.x + Math.round((R() - 0.5) * 8), p.y + Math.round((R() - 0.5) * 6), p.tier, { camp: p.id });
      if (p.tier >= 1) enemy('alpha', p.x, p.y, p.tier, { camp: p.id });
      for (let i = 0; i < 3; i++) add({ t: 'herb', item: R() < 0.5 ? 'snowberry' : 'frost_lily', x: p.x + Math.round((R() - 0.5) * 12), y: p.y + 6 + Math.round(R() * 2) });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'den' });
    } else if (p.kind === 'ruin') {
      clearing(p, 13, 11, TILE.CFLOOR);
      for (const [dx, dy] of [[-5, -4], [5, -4], [-5, 4], [5, 4], [0, -5]]) g.set(p.x + dx, p.y + dy, TILE.PILLAR);
      g.set(p.x - 3, p.y - 1, TILE.GRAVE); g.set(p.x + 3, p.y - 1, TILE.GRAVE);
      add({ t: 'shrine', id: p.id, x: p.x, y: p.y - 1 });
      add({ t: 'glow', x: p.x, y: p.y - 1, r: 40, col: 15 });
      const n = 3 + p.tier;
      for (let i = 0; i < n; i++) enemy(pickOf([...m.melee, ...m.ranged]), p.x + Math.round((R() - 0.5) * 10), p.y + 2 + Math.round(R() * 3), p.tier, { camp: p.id });
      chest(p, 0, 4, p.tier, 'med');
      add({ t: 'lore', id: 'ruin' + (p.id.slice(-1) % 3), tex: 'book', x: p.x + 2, y: p.y - 1 });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'ruin' });
    } else if (p.kind === 'barrow') {
      clearing(p, 8, 6);
      g.set(p.x, p.y - 1, TILE.STAIRS);
      for (const dx of [-3, 3]) g.set(p.x + dx, p.y - 1, TILE.GRAVE);
      add({ t: 'exit', x: p.x, y: p.y - 1, w: 1, h: 1, to: 'barrow' + p.id.slice(-1), spawn: 'entry', fx: 'door', sign: true });
      add({ t: 'spawn', name: 'barrow' + p.id.slice(-1), x: p.x, y: p.y + 1 });
      add({ t: 'glow', x: p.x, y: p.y, r: 34, col: 15 });
      add({ t: 'sign', x: p.x + 2, y: p.y + 1, text: ['A BARROW MOUND. COLD AIR BREATHES FROM THE STAIRS.', 'WHAT SLEEPS BELOW CHANGES EVERY WINTER.'] });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'barrow' });
    } else if (p.kind === 'tower') {
      clearing(p, 7, 7, TILE.STONE);
      g.rect(p.x - 2, p.y - 2, 5, 5, TILE.CFLOOR);
      for (const [dx, dy] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) g.set(p.x + dx, p.y + dy, TILE.PILLAR);
      g.set(p.x, p.y + 3, TILE.CFLOOR);
      for (let i = 0; i < 2 + (p.tier > 1 ? 1 : 0); i++) enemy(pickOf(m.ranged), p.x - 1 + i * 2, p.y - 1, p.tier, { camp: p.id });
      add({ t: 'fire', x: p.x, y: p.y, rest: true, id: p.id });
      g.set(p.x, p.y, TILE.BRAZIER);
      add({ t: 'glow', x: p.x, y: p.y, r: 44, col: 12 });
      chest(p, 1, 1, p.tier + 1, 'hard');
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'tower' });
    } else if (p.kind === 'grove') {
      clearing(p, 12, 10);
      for (let i = 0; i < 9; i++) add({ t: 'herb', item: i % 3 === 0 ? 'frost_lily' : 'snowberry', x: p.x + Math.round((R() - 0.5) * 12), y: p.y + Math.round((R() - 0.5) * 8) });
      add({ t: 'node', x: p.x + 5, y: p.y - 3, ore: 'iron_ingot' });
      for (let i = 0; i < 2; i++) add({ t: 'deer', x: p.x + Math.round((R() - 0.5) * 8), y: p.y + Math.round((R() - 0.5) * 6) });
      add({ t: 'sign', x: p.x - 6, y: p.y, text: ['A QUIET GROVE. GOOD FORAGING AND GOOD HUNTING.'] });
    } else if (p.kind === 'rest') {
      clearing(p, 5, 5);
      g.set(p.x, p.y, TILE.FIRE);
      add({ t: 'fire', x: p.x, y: p.y, rest: true, id: p.id }); add({ t: 'glow', x: p.x, y: p.y, r: 52, col: 12 });
      add({ t: 'sign', x: p.x + 2, y: p.y + 1, text: ['A TRAVELLERS\' FIRE. REST HERE TO HEAL, SAVE AND FAST TRAVEL.'] });
    } else if (p.kind === 'champion') {
      clearing(p, 9, 7);
      add({ t: 'enemy', kind: pickOf(m.melee), x: p.x, y: p.y, tier: p.tier + 1, elite: true, camp: p.id, champion: true });
      for (let i = 0; i < 2; i++) enemy(pickOf(m.melee), p.x + (i ? 3 : -3), p.y + 2, p.tier, { camp: p.id });
      chest(p, 0, -3, p.tier + 1, 'med');
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'champion' });
    }
  }

  // ---- wild creatures, nodes and herbs along the roads and in the wilds --------------------------
  for (let i = 0; i < 70; i++) {
    const x = 6 + Math.floor(R() * (W - 12)), y = 6 + Math.floor(R() * (H - 12));
    if (taken.some((t) => Math.hypot(t.x - x, t.y - y) < t.r - 2) || bio[y][x] === 'lake' || bio[y][x] === 'mountain' || g.t[y][x] === TILE.PATH) continue;
    const tier = tierAt(x, y), roll = R();
    if (roll < 0.34) add({ t: 'herb', item: R() < 0.6 ? 'snowberry' : 'frost_lily', x, y });
    else if (roll < 0.5) add({ t: 'deer', x, y });
    else if (roll < 0.62 && bio[y][x] !== 'tundra') add({ t: 'node', x, y, ore: R() < 0.8 ? 'iron_ingot' : 'bone_dust' });
    else if (roll < 0.78) add({ t: 'dig', x, y, id: `dig${i}` });
    else enemy(pickOf(mobs(tier).wild), x, y, tier, { roam: true });
  }

  // keep every placed thing on open ground
  const PLACED = new Set(['enemy', 'chest', 'shrine', 'node', 'dig', 'herb', 'deer', 'pot', 'sign', 'spawn']);
  for (const e of entities) {
    if (!PLACED.has(e.t) || e.x < rw && e.y < rh) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (Math.abs(dx) + Math.abs(dy) > 1 && e.t !== 'enemy') continue;
      const x = e.x + dx, y = e.y + dy;
      if (x > 2 && y > 2 && x < W - 3 && y < H - 3 && SOLID_SET.has(g.t[y][x]) && g.t[y][x] !== TILE.PILLAR && g.t[y][x] !== TILE.GRAVE && g.t[y][x] !== TILE.BRAZIER && g.t[y][x] !== TILE.FIRE) g.t[y][x] = TILE.SNOW2;
    }
    g.res[e.y][e.x] = true;
  }

  // ---- scenery ---------------------------------------------------------------------------------
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (g.res[y][x] || g.t[y][x] === TILE.PATH) continue;
    const b = bio[y][x], r = hash(x, y, 81);
    if (g.t[y][x] !== TILE.SNOW && g.t[y][x] !== TILE.SNOW2) continue;
    if (b === 'forest' && r < 0.27) g.t[y][x] = TILE.PINE;
    else if (b === 'tundra' && r < 0.06) g.t[y][x] = r < 0.02 ? TILE.ROCK : (r < 0.03 ? TILE.STUMP : TILE.PINE);
    else if (b === 'blight' && r < 0.17) g.t[y][x] = r < 0.07 ? TILE.DEADTREE : TILE.STUMP;
  }
  g.dress('snow');
  g.dress('late');

  // drop anything that ended up sealed off from the entrance (mountain pockets, tree knots)
  const seen = new Uint8Array(W * H), q = [[START.x, START.y]];
  seen[START.y * W + START.x] = 1;
  const solidAt = (x, y) => SOLID_SET.has(g.t[y][x]);
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || solidAt(nx, ny)) continue;
      seen[ny * W + nx] = 1; q.push([nx, ny]);
    }
  }
  const keep = entities.filter((e) => e.x == null || !PLACED.has(e.t) && e.t !== 'exit' || e.x < rw && e.y < rh || seen[e.y * W + e.x]);
  // ---- entrance: the old forest's west exit stays where it was ---------------------------------
  // (exits to the village, the pass and the crypt already live in the stamped entities)
  return { grid: g.t, entities: keep, w: W, h: H, pois, bio };
}
