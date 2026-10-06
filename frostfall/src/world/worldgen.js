// The Hollow Reach: a big seamless overworld grown around the original pine forest.
// The forest keeps its old coordinates in the north-west corner (quests and exits point there);
// everything else is generated from the run seed, so each new game has a different map of camps,
// ruins, dens and dungeon entrances.
import { Grid } from '../data/mapkit.js';
import { TILE, SOLID_TILES } from '../config.js';
const SOLID_SET = new Set(SOLID_TILES);
import { hash } from '../util.js';
import { buildLoop, trackSpots } from './roamers.js';

export const REACH_W = 200;
export const REACH_H = 144;
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
export const TIER_MOBS = [
  { melee: ['bandit', 'draugr'], ranged: ['archer'], wild: ['wolf', 'boar', 'boar', 'imp'] },
  { melee: ['bandit', 'draugr', 'fencer', 'warden', 'imp'], ranged: ['archer', 'wight', 'necro'], wild: ['wolf', 'boar', 'lynx', 'bear', 'imp'] },
  { melee: ['reaver', 'warden', 'fencer', 'draugr', 'golem'], ranged: ['wight', 'conjurer', 'archer', 'necro', 'wisp'], wild: ['wolf', 'alpha', 'bear', 'lynx', 'wyvern', 'boar'] },
  { melee: ['reaver', 'knight', 'warden', 'golem', 'imp'], ranged: ['conjurer', 'wight', 'necro', 'wisp'], wild: ['alpha', 'bear', 'bear', 'wyvern', 'frostworm', 'lynx'] },
];

// Builds one overworld region from a definition (see REACH below for the fields). `region` is an optional hand-made
// grid + entities stamped into the north-west corner (the old forest); new regions pass null.
export function buildRegion(def, region, seed) {
  const W = def.w, H = def.h, START = def.start, tierAt = def.tierAt, TIER_MOBS = def.mobs, FL = def.flora, ORE = def.ores;
  const R = rng(seed ^ 0x9e3779b9);
  const g = new Grid(W, H, def.ground);
  g.noise(def.ground2, 0.2, 9, def.ground);

  // ---- biomes --------------------------------------------------------------------------------
  const biome = def.biome(seed, W, H);
  const bio = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => biome(x, y)));
  def.paint(g, bio, W, H);
  // mountain wall around the world
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const e = Math.min(x, y, W - 1 - x, H - 1 - y);
    if (e < 3 && (e < 1 || hash(x, y, 74) < 0.85)) { g.t[y][x] = e < 2 ? TILE.ROCK : TILE.STONE; g.res[y][x] = true; }
  }

  // ---- stamp the hand-made region (the original forest) in the north-west corner ------------------
  const rw = region ? region.w : 0, rh = region ? region.h : 0;
  if (region) {
    for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) { g.t[y][x] = region.grid[y][x]; g.res[y][x] = true; }
    // open the east and south edges of the old forest into the new world
    for (let y = 2; y < rh - 2; y++) for (let x = rw - 3; x < rw; x++) if (region.grid[y][x] === TILE.PINE) g.t[y][x] = TILE.SNOW2;
    for (let x = 2; x < rw - 2; x++) for (let y = rh - 3; y < rh; y++) if (region.grid[y][x] === TILE.PINE) g.t[y][x] = TILE.SNOW2;
  }
  const entities = region ? region.entities.map((e) => ({ ...e })) : [];
  const add = (e) => { entities.push(e); };

  // ---- points of interest -----------------------------------------------------------------------
  const nodes = def.nodes.map((n) => ({ ...n }));            // road ends already in place
  const pois = [];
  const taken = def.taken.map((t) => ({ ...t }));            // areas that are already spoken for
  const okSpot = (x, y, r) => {
    if (x < 8 + r || y < 8 + r || x > W - 8 - r || y > H - 8 - r) return false;
    if (taken.some((t) => Math.hypot(t.x - x, t.y - y) < (t.r + r) * 0.8)) return false;
    const b = bio[y][x];
    return b !== 'lake' && b !== 'mountain';
  };
  const place = (kind, count, r, near = null, minTier = 0, biomeWant = null) => {
    let made = 0;
    for (let tries = 0; tries < 1800 && made < count; tries++) {
      const x = 12 + Math.floor(R() * (W - 24)), y = 8 + Math.floor(R() * (H - 16));
      if (near && Math.hypot(x - near.x, y - near.y) > near.r) continue;
      if (!okSpot(x, y, r) || tierAt(x, y) < minTier) continue;
      if (biomeWant && tries < 1200 && bio[y][x] !== biomeWant) continue;       // prefer the right biome, fall back to anywhere
      taken.push({ x, y, r }); pois.push({ kind, x, y, r, tier: tierAt(x, y), id: `${kind}${made}` }); made++;
    }
  };
  const mustHave = (kind, r, tier, biome = null) => { place(kind, 1, r, null, tier, biome); if (!pois.some((p) => p.kind === kind)) place(kind, 1, r - 3, null, Math.max(0, tier - 1)); };
  def.plan(place, mustHave);

  // roads: connect each poi to its nearest connected node (nearest-first)
  const connect = (a, b) => g.path([[a.x, a.y], [Math.round((a.x + b.x) / 2), a.y], [Math.round((a.x + b.x) / 2), b.y], [b.x, b.y]], 2, TILE.PATH);
  const remaining = [...pois].sort((p, q) => Math.hypot(p.x - def.nodes[0].x, p.y - def.nodes[0].y) - Math.hypot(q.x - def.nodes[0].x, q.y - def.nodes[0].y));
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
  const chest = (p, dx, dy, tier, lock) => add({ t: 'chest', id: `${p.id}_c${dx}${dy}`, x: p.x + dx, y: p.y + dy, lock, tier, mimic: tier >= 1 && R() < 0.1, loot: [{ gen: tier }, { gold: 20 + tier * 25 }, ...(R() < 0.6 ? [{ item: 'hp_potion', n: 1 + tier }] : [])] });
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
      for (let i = 0; i < 3; i++) add({ t: 'herb', item: R() < 0.5 ? FL[0] : FL[1], x: p.x + Math.round((R() - 0.5) * 12), y: p.y + 6 + Math.round(R() * 2) });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'den' });
    } else if (p.kind === 'beardn') {
      clearing(p, 11, 9);
      enemy('bear', p.x, p.y - 1, p.tier, { camp: p.id, mother: true });
      for (const dx of [-2, 2]) enemy('bearcub', p.x + dx, p.y + 1, p.tier, { camp: p.id, cub: true });
      chest(p, 0, -4, p.tier, 'med');
      add({ t: 'sign', x: p.x - 6, y: p.y + 2, text: ['A BEAR DEN. CLAW MARKS ON EVERY TREE.', 'THE MOTHER DOES NOT FORGIVE ANYONE WHO HURTS HER CUBS.'] });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'beardn' });
    } else if (p.kind === 'spring') {
      clearing(p, 9, 7, TILE.SNOW2);
      add({ t: 'spring', x: p.x, y: p.y }); add({ t: 'glow', x: p.x, y: p.y, r: 40, col: 15 });
      add({ t: 'sign', x: p.x - 4, y: p.y + 2, text: ['A HOT SPRING. SOAK TO HEAL, CLEAR YOUR WOUNDS AND WARM UP.'] });
      for (let i = 0; i < 2; i++) add({ t: 'deer', x: p.x + (i ? 4 : -4), y: p.y + 3, kind: 'fox' });
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
    } else if (p.kind === 'maw') {
      clearing(p, 13, 8);
      g.rect(p.x - 5, p.y - 4, 11, 3, TILE.STONE);
      g.set(p.x, p.y - 2, TILE.STAIRS); g.set(p.x + 1, p.y - 2, TILE.STAIRS);
      for (const dx of [-4, -2, 3, 5]) g.set(p.x + dx, p.y - 1, TILE.PILLAR);
      for (const dx of [-3, 4]) g.set(p.x + dx, p.y + 2, TILE.ROCK);
      add({ t: 'exit', x: p.x, y: p.y - 2, w: 2, h: 1, to: 'maw', spawn: 'entry', fx: 'door' });
      add({ t: 'spawn', name: 'maw', x: p.x, y: p.y });
      add({ t: 'glow', x: p.x, y: p.y - 2, r: 44, col: 15 }); add({ t: 'glow', x: p.x - 4, y: p.y - 1, r: 22, col: 15 }); add({ t: 'glow', x: p.x + 5, y: p.y - 1, r: 22, col: 15 });
      add({ t: 'fire', x: p.x + 4, y: p.y + 3, rest: true, id: 'mawfire' });
      add({ t: 'sign', x: p.x - 2, y: p.y + 1, text: ['THE GLACIAL MAW.', 'HERE THE HOLLOW KINGS SEALED THE SECOND HEART UNDER THE ICE.', 'WHAT COILS BELOW HAS WAITED A VERY LONG TIME.'] });
    } else if (['fort', 'temple', 'rootvault', 'throne', 'nest'].includes(p.kind)) {
      const D = {
        fort: { to: 'keep', col: 12, stone: TILE.STONE, text: ['IRONWATCH KEEP.', 'A GATEHOUSE OF BLACKENED STONE. THE BANNERS ARE STILL UP.'] },
        temple: { to: 'chapel', col: 15, stone: TILE.STONE, text: ['THE DROWNED CHAPEL.', 'A DOORWAY SINKS INTO THE ICE. SOMETHING BELOW IS SINGING.'] },
        rootvault: { to: 'rootvault', col: 8, stone: TILE.ROCK, text: ['THE ROOTVAULT.', 'THE TREES HERE LEAN TOWARD THE DOOR, AND AWAY FROM YOU.'] },
        nest: { to: 'nest', col: 12, stone: TILE.ROCK, text: ['THE EMBER NEST.', 'THE SNOW HAS MELTED FOR A HUNDRED PACES. THE AIR SHIMMERS.'] },
        throne: { to: 'throne', col: 15, stone: TILE.STONE, text: ['THE WINTER THRONE.', 'THE LAST DOOR IN THE REACH. FOUR HEARTS MUST BE YOURS TO OPEN IT.'] },
      }[p.kind];
      clearing(p, 13, 8);
      g.rect(p.x - 5, p.y - 4, 11, 3, D.stone);
      g.set(p.x, p.y - 2, TILE.STAIRS); g.set(p.x + 1, p.y - 2, TILE.STAIRS);
      for (const dx of [-4, -2, 3, 5]) g.set(p.x + dx, p.y - 1, TILE.PILLAR);
      add({ t: 'exit', x: p.x, y: p.y - 2, w: 2, h: 1, to: D.to, spawn: 'entry', fx: 'door', needs: p.kind === 'throne' ? 'hearts4' : null });
      add({ t: 'spawn', name: p.kind === 'fort' ? 'keep' : p.kind === 'temple' ? 'chapel' : p.kind === 'rootvault' ? 'rootvault' : p.kind === 'nest' ? 'nest' : 'throne', x: p.x, y: p.y });
      add({ t: 'glow', x: p.x, y: p.y - 2, r: 44, col: D.col }); add({ t: 'glow', x: p.x - 4, y: p.y - 1, r: 22, col: D.col }); add({ t: 'glow', x: p.x + 5, y: p.y - 1, r: 22, col: D.col });
      add({ t: 'fire', x: p.x + 4, y: p.y + 3, rest: true, id: p.kind + 'fire' });
      add({ t: 'sign', x: p.x - 2, y: p.y + 1, text: D.text });
      for (let i = 0; i < 2; i++) enemy(pickOf(mobs(p.tier).melee), p.x + (i ? 5 : -5), p.y + 3, p.tier, { roam: true });
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
      for (let i = 0; i < 9; i++) add({ t: 'herb', item: i % 3 === 0 ? FL[1] : FL[0], x: p.x + Math.round((R() - 0.5) * 12), y: p.y + Math.round((R() - 0.5) * 8) });
      add({ t: 'node', x: p.x + 5, y: p.y - 3, ore: ORE[0] });
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
  for (let i = 0; i < 120; i++) {
    const x = 6 + Math.floor(R() * (W - 12)), y = 6 + Math.floor(R() * (H - 12));
    if (taken.some((t) => Math.hypot(t.x - x, t.y - y) < t.r - 2) || bio[y][x] === 'lake' || bio[y][x] === 'mountain' || g.t[y][x] === TILE.PATH) continue;
    const tier = tierAt(x, y), roll = R();
    if (roll < 0.34) add({ t: 'herb', item: R() < 0.6 ? FL[0] : FL[1], x, y });
    else if (roll < 0.56) { const q = R(); add({ t: 'deer', x, y, kind: q < 0.4 ? 'deer' : q < 0.72 ? 'hare' : 'fox' }); }
    else if (roll < 0.66 && bio[y][x] !== 'tundra') add({ t: 'node', x, y, ore: R() < 0.8 ? ORE[0] : ORE[1] });
    else if (roll < 0.78) add({ t: 'dig', x, y, id: `dig${i}` });
    else {
      let kind = pickOf(mobs(tier).wild);
      if (bio[y][x] === 'blight' && R() < 0.45) kind = 'shroom';
      else if (bio[y][x] === 'tundra' && tier >= 1 && R() < 0.2) kind = 'frostworm';
      enemy(kind, x, y, tier, { roam: true });
    }
  }

  def.extras?.({ g, R, W, H, START, add, pois, bio, entities });

  // keep every placed thing on open ground
  const PLACED = new Set(['enemy', 'chest', 'shrine', 'node', 'dig', 'herb', 'deer', 'fish', 'hound', 'spring', 'pot', 'sign', 'spawn']);
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
  def.scenery(g, bio, W, H);
  for (const d of def.dress) g.dress(d);

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
  return { grid: g.t, entities: keep, w: W, h: H, pois, bio, region: def.id };
}

// The Hollow Reach: the first overworld. Fields every region definition provides:
//   id, w, h, start, ground/ground2 (base tiles), flora/ores (item ids), mobs (per-tier tables), tierAt(x, y),
//   biome(seed, w, h) -> (x, y) => name, paint(g, bio, w, h), nodes (road ends), taken (reserved discs),
//   plan(place, mustHave) (which points of interest to scatter), extras(ctx), scenery(g, bio, w, h), dress (tile dressing passes).
export const REACH = {
  id: 'reach', w: REACH_W, h: REACH_H, start: START,
  ground: TILE.SNOW, ground2: TILE.SNOW2, flora: ['snowberry', 'frost_lily'], ores: ['iron_ingot', 'bone_dust'],
  mobs: TIER_MOBS, tierAt,
  biome(seed, W, H) {
    const lakeSeed = seed % 997, mtnSeed = (seed >> 3) % 991, blightSeed = (seed >> 5) % 983, woodSeed = (seed >> 7) % 977;
    return (x, y) => {
      const lake = vnoise(x, y, 22, lakeSeed), mtn = vnoise(x, y, 17, mtnSeed), blight = vnoise(x, y, 26, blightSeed);
      const east = x / W, south = y / H;
      if (lake > 0.66 && east > 0.3 && south > 0.18) return 'lake';
      if (mtn > 0.68 && (east > 0.25 || south > 0.35)) return 'mountain';
      if (blight > 0.62 && east > 0.45 && south > 0.4) return 'blight';
      return vnoise(x, y, 14, woodSeed) > 0.5 ? 'forest' : 'tundra';
    };
  },
  paint(g, bio, W, H) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const b = bio[y][x];
      if (b === 'lake') g.t[y][x] = hash(x, y, 71) < 0.3 ? TILE.ICE2 : TILE.ICE;
      else if (b === 'mountain') g.t[y][x] = hash(x, y, 72) < 0.55 ? TILE.ROCK : (hash(x, y, 73) < 0.4 ? TILE.STONE : TILE.SNOW2);
    }
  },
  nodes: [{ x: 52, y: 22 }, { x: 40, y: 30 }],            // road ends already in the forest
  taken: [{ x: 28, y: 16, r: 34 }],                          // the old forest region
  plan(place, mustHave) {
  mustHave('fort', 11, 2); mustHave('temple', 10, 2); mustHave('rootvault', 10, 2, 'blight'); mustHave('throne', 12, 3); mustHave('maw', 10, 1); mustHave('nest', 12, 3);                 // the Glacial Maw: dungeon of the second Heart
  place('champion', 4, 8);                // placed early: later it finds no room on a map crowded with dungeons
  place('ruin', 4, 10);
  place('beardn', 2, 9, null, 1);          // a mother bear and her cubs
  place('spring', 2, 6);                   // hot springs: heal, cure, warm
  place('camp', 5, 11);
  place('den', 5, 9);
  place('barrow', 3, 6);
  place('tower', 3, 7);
  place('grove', 3, 8);
  place('rest', 6, 4);
  // make sure there is something gentle near the entrance
  place('den', 1, 9, { x: 70, y: 20, r: 22 });
  place('rest', 1, 4, { x: 70, y: 36, r: 18 });
  },
  extras({ g, R, W, H, START, add, pois, bio, entities }) {
  add({ t: 'hound', x: START.x + 12, y: START.y + 4 });

  // ---- roaming world bosses: a winter elk and a bridge troll walk loops between points of interest, leaving tracks
  {
    const stops = pois.filter((q) => ['camp', 'den', 'ruin', 'tower', 'grove', 'rest', 'beardn', 'spring', 'champion'].includes(q.kind));
    const pickLoop = (n, minTier, salt) => {
      const cand = stops.filter((q) => q.tier >= minTier);
      const pool = (cand.length >= n ? cand : stops).slice();
      const way = [];
      let a = pool[Math.floor(R() * pool.length)];
      for (let i = 0; i < n && pool.length; i++) { pool.splice(pool.indexOf(a), 1); way.push({ x: a.x, y: a.y + 3 }); a = pool.sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))[Math.min(pool.length - 1, 1 + Math.floor(R() * 3))] || a; }
      return buildLoop(way);
    };
    for (const [id, kind, tier, minTier] of [['elk', 'elk', 1, 1], ['troll', 'troll', 2, 2]]) {
      const loop = pickLoop(4, minTier);
      add({ t: 'roamboss', id, kind, tier, route: loop, phase: Math.floor(R() * 900) });
      for (const s of trackSpots(loop, 120)) add({ t: 'track', x: s.x, y: s.y, who: id });
    }
  }

  // small wildlife scattered everywhere, even between the points of interest: hares and foxes bolt when you come near
  for (let i = 0, n = 0; i < 400 && n < 18; i++) {
    const x = 6 + Math.floor(R() * (W - 12)), y = 6 + Math.floor(R() * (H - 12)), b = bio[y][x];
    if (b === 'lake' || b === 'mountain' || g.t[y][x] === TILE.PATH || g.res[y][x]) continue;
    add({ t: 'deer', x, y, kind: R() < 0.55 ? 'hare' : 'fox' }); n++;
  }

  // ice-fishing holes out on the frozen lakes
  for (let i = 0, n = 0; i < 600 && n < 14; i++) {
    const x = 6 + Math.floor(R() * (W - 12)), y = 6 + Math.floor(R() * (H - 12));
    if (bio[y][x] !== 'lake' || [[2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => bio[y + dy]?.[x + dx] !== 'lake')) continue;
    if (entities.some((e) => e.t === 'fish' && Math.hypot(e.x - x, e.y - y) < 14)) continue;
    add({ t: 'fish', x, y }); n++;
  }
  },
  scenery(g, bio, W, H) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (g.res[y][x] || g.t[y][x] === TILE.PATH) continue;
    const b = bio[y][x], r = hash(x, y, 81);
    if (g.t[y][x] !== TILE.SNOW && g.t[y][x] !== TILE.SNOW2) continue;
    if (b === 'forest' && r < 0.27) g.t[y][x] = TILE.PINE;
    else if (b === 'tundra' && r < 0.06) g.t[y][x] = r < 0.02 ? TILE.ROCK : (r < 0.03 ? TILE.STUMP : TILE.PINE);
    else if (b === 'blight' && r < 0.17) g.t[y][x] = r < 0.07 ? TILE.DEADTREE : TILE.STUMP;
  }
  },
  dress: ['snow', 'late'],
};

export const buildReach = (region, seed) => buildRegion(REACH, region, seed);
