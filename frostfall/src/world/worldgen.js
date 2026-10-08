// The Hollow Reach: a big seamless overworld grown around the original pine forest.
// The forest keeps its old coordinates in the north-west corner (quests and exits point there);
// everything else is generated from the run seed, so each new game has a different map of camps,
// ruins, dens and dungeon entrances.
import { Grid } from '../data/mapkit.js';
import { TILE, SOLID_TILES } from '../config.js';
const SOLID_SET = new Set(SOLID_TILES);
import { hash } from '../util.js';
import { buildLoop, trackSpots } from './roamers.js';

export const REACH_W = 540;
export const REACH_H = 378;
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
export function vnoise(x, y, scale, seed) {
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
  return d < 182 ? 0 : d < 273 ? 1 : d < 360 ? 2 : 3;      // 1.7x the old bands: the world is bigger, the tiers are as wide as before in walking time
}
export const TIER_MOBS = [
  { melee: ['bandit', 'draugr'], ranged: ['archer'], wild: ['wolf', 'boar', 'boar', 'imp'] },
  { melee: ['bandit', 'draugr', 'fencer', 'warden', 'imp'], ranged: ['archer', 'wight', 'necro'], wild: ['wolf', 'boar', 'lynx', 'bear', 'imp'] },
  { melee: ['reaver', 'warden', 'fencer', 'draugr', 'golem'], ranged: ['wight', 'conjurer', 'archer', 'necro', 'wisp'], wild: ['wolf', 'alpha', 'bear', 'lynx', 'wyvern', 'boar'] },
  { melee: ['reaver', 'knight', 'warden', 'golem', 'imp'], ranged: ['conjurer', 'wight', 'necro', 'wisp'], wild: ['alpha', 'bear', 'bear', 'wyvern', 'frostworm', 'lynx'] },
];

// Builds one overworld region from a definition (see REACH below for the fields). `region` is an optional hand-made
// grid + entities stamped into the north-west corner (the old forest); new regions pass null.
export const MAJOR = new Set(['fort', 'temple', 'rootvault', 'throne', 'nest', 'maw', 'city', 'forge', 'peakroad', 'coastroad', 'kingroad', 'tidebreak', 'sepulchre', 'fenroad', 'stormroad', 'reedwick', 'mirebarrow', 'skarnhold', 'stormspire']);
export const EXTRA_KIND_NAME = {};
const KIND_NAME = { camp: 'A BANDIT CAMP', den: 'A WOLF DEN', ruin: 'OLD RUINS', tower: 'A WATCHTOWER', grove: 'A QUIET GROVE', hamlet: 'A SMALL HAMLET', standing: 'A CIRCLE OF STANDING STONES', barrow: 'A BARROW', champion: 'A MONSTER\'S LAIR', beardn: 'A BEAR DEN',
  cave: 'A CAVE', foundry: 'AN OLD FOUNDRY', wreck: 'A WRECKED SHIP', lighthouse: 'A LIGHTHOUSE', courtyard: 'A BROKEN COURTYARD', fort: 'A GREAT KEEP', temple: 'A DROWNED CHAPEL', rootvault: 'A VAULT UNDER THE ROOTS', throne: 'THE WINTER THRONE', maw: 'THE GLACIAL MAW', nest: 'A DRAGON\'S NEST',
  city: 'A FORGE-CITY', forge: 'A FURNACE OF THE FIRST FIRE', peakroad: 'THE ROAD TO THE ASHEN PEAKS', coastroad: 'THE ROAD TO THE FROZEN COAST', kingroad: 'THE OLD KINGS\' ROAD', tidebreak: 'A SEA CAVERN', sepulchre: 'A SEPULCHRE',
  fenroad: 'THE ROAD TO THE WEEPING FENS', stormroad: 'THE ROAD TO THE STORMCROWN', reedwick: 'A STILT VILLAGE', mirebarrow: 'A SUNKEN BARROW', skarnhold: 'A NOMAD HOLD', stormspire: 'A STORM-STRUCK SPIRE' };
export const SMALL_GAP = { rest: 24, spring: 30, cache: 30, hermit: 36, ancient: 36 };
export const HIDDEN_KINDS = new Set(['cache', 'hermit', 'ancient']);   // no road leads to these: you find them by looking
const BLOCKED = new Set(['lake', 'mountain', 'lava', 'pack', 'wall', 'pool', 'cliff']);   // biomes nothing is placed in (solid or open water)
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
    return !BLOCKED.has(bio[y][x]);
  };
  // Spacing is a promise about travel time (walk speed is 4.5 tiles a second): places keep at least `gap` tiles apart,
  // major places (dungeon entrances, cities, region gates) keep `majorGap`. Small campfires and springs may sit closer.
  // If the map is too full the gap relaxes in steps rather than dropping a place.
  const gap = def.gap ?? 40, majorGap = def.majorGap ?? 90;
  const gapOf = (a, b) => { const small = SMALL_GAP[a] ?? SMALL_GAP[b]; return small ?? (MAJOR.has(a) && MAJOR.has(b) ? majorGap : gap); };
  const spaced = (x, y, kind, relax) => !pois.some((q) => Math.hypot(q.x - x, q.y - y) < gapOf(kind, q.kind) * relax);
  const place = (kind, count, r, near = null, minTier = 0, biomeWant = null) => {
    let made = 0;
    for (let tries = 0; tries < 2600 && made < count; tries++) {
      const x = 12 + Math.floor(R() * (W - 24)), y = 8 + Math.floor(R() * (H - 16));
      if (near && Math.hypot(x - near.x, y - near.y) > near.r) continue;
      if (!okSpot(x, y, r) || tierAt(x, y) < minTier) continue;
      if (!spaced(x, y, kind, tries < 1400 ? 1 : tries < 2000 ? 0.75 : 0.55)) continue;
      if (biomeWant && tries < 1200 && bio[y][x] !== biomeWant) continue;       // prefer the right biome, fall back to anywhere
      taken.push({ x, y, r }); pois.push({ kind, x, y, r, tier: tierAt(x, y), id: `${def.id === 'reach' ? '' : def.id + '_'}${kind}${made}` }); made++;
    }
  };
  const mustHave = (kind, r, tier, biome = null, near = null) => { place(kind, 1, r, near, tier, biome); if (!pois.some((p) => p.kind === kind)) place(kind, 1, r, null, tier, biome); if (!pois.some((p) => p.kind === kind)) place(kind, 1, r - 3, null, Math.max(0, tier - 1)); };
  def.plan(place, mustHave);

  // roads: connect each poi to its nearest connected node (nearest-first)
  const connect = (a, b) => g.path([[a.x, a.y], [Math.round((a.x + b.x) / 2), a.y], [Math.round((a.x + b.x) / 2), b.y], [b.x, b.y]], 2, TILE.PATH);
  const edges = [];
  const remaining = pois.filter((p) => !HIDDEN_KINDS.has(p.kind)).sort((p, q) => Math.hypot(p.x - def.nodes[0].x, p.y - def.nodes[0].y) - Math.hypot(q.x - def.nodes[0].x, q.y - def.nodes[0].y));
  const FACADE = new Set(['fort', 'temple', 'rootvault', 'throne', 'nest', 'maw', 'city', 'tower', 'peakroad', 'forge', 'coastroad', 'kingroad', 'tidebreak', 'sepulchre', 'fenroad', 'stormroad', 'reedwick', 'mirebarrow', 'skarnhold', 'stormspire']);   // a stone front sits north of the door: roads end below it
  for (const p of remaining) {
    const tgt = FACADE.has(p.kind) ? { x: p.x, y: p.y + (p.kind === 'tower' ? 4 : 3) } : p;
    let best = nodes[0], bd = 1e9;
    for (const n of nodes) { const d = Math.hypot(n.x - tgt.x, n.y - tgt.y); if (d < bd) { bd = d; best = n; } }
    if (FACADE.has(p.kind)) {              // come in from beside and below, never through the stone front
      const sx = p.x + (best.x >= p.x ? 8 : -8);
      g.path([[best.x, best.y], [sx, best.y], [sx, tgt.y], [tgt.x, tgt.y]], 2, TILE.PATH);
    } else connect(best, tgt);
    nodes.push({ x: tgt.x, y: tgt.y });
    if (Math.hypot(best.x - tgt.x, best.y - tgt.y) > 36 && !SMALL_GAP[p.kind]) edges.push({ a: best, p });
  }
  // waystones: a sign beside the long roads says what lies ahead and how far, so a journey always tells you something
  for (const { a, p } of edges) {
    const f = 0.35 + 0.3 * R(), cx = a.x + (p.x - a.x) * f, cy = a.y + (p.y - a.y) * f;
    let spot = null;
    for (let r = 0; r <= 10 && !spot; r++) for (let dy = -r; dy <= r && !spot; dy++) for (let dx = -r; dx <= r && !spot; dx++) {
      const x = Math.round(cx) + dx, y = Math.round(cy) + dy;
      if (x < 4 || y < 4 || x >= W - 4 || y >= H - 4 || g.t[y][x] !== TILE.PATH) continue;
      for (const [ox, oy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) { const sx = x + ox, sy = y + oy; if (!SOLID_SET.has(g.t[sy][sx]) && g.t[sy][sx] !== TILE.PATH && !BLOCKED.has(bio[sy][sx])) { spot = { x: sx, y: sy }; break; } }
    }
    if (!spot) continue;
    const ang = Math.atan2(p.y - spot.y, p.x - spot.x), DIRS = ['EAST', 'SOUTH-EAST', 'SOUTH', 'SOUTH-WEST', 'WEST', 'NORTH-WEST', 'NORTH', 'NORTH-EAST'];
    const dir = DIRS[(Math.round(ang / (Math.PI / 4)) + 8) % 8], paces = Math.round(Math.hypot(p.x - spot.x, p.y - spot.y) / 5) * 5;
    add({ t: 'sign', x: spot.x, y: spot.y, text: ['A WAYSTONE ON THE ROAD.', `${dir}: ${KIND_NAME[p.kind] || EXTRA_KIND_NAME[p.kind] || 'A PLACE OF NOTE'}, ABOUT ${paces} PACES.`] });
  }
  // keep forest/lake/mountain from covering roads
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g.t[y][x] === TILE.PATH) g.res[y][x] = true;

  const pickOf = (list) => list[Math.floor(R() * list.length)];
  const mobs = (tier) => TIER_MOBS[Math.min(3, tier)];
  const enemy = (kind, x, y, tier, extra = {}) => add({ t: 'enemy', kind, x, y, tier, ...extra });
  const clearing = (p, w, h, tile = def.clear ?? TILE.SNOW2) => g.rect(p.x - (w >> 1), p.y - (h >> 1), w, h, tile);
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
    } else if (['fort', 'temple', 'rootvault', 'throne', 'nest', 'city', 'peakroad', 'forge', 'coastroad', 'kingroad', 'tidebreak', 'sepulchre', 'fenroad', 'stormroad', 'reedwick', 'mirebarrow', 'skarnhold', 'stormspire'].includes(p.kind)) {
      const D = {
        fort: { to: 'keep', col: 12, stone: TILE.STONE, text: ['IRONWATCH KEEP.', 'A GATEHOUSE OF BLACKENED STONE. THE BANNERS ARE STILL UP.'] },
        temple: { to: 'chapel', col: 15, stone: TILE.STONE, text: ['THE DROWNED CHAPEL.', 'A DOORWAY SINKS INTO THE ICE. SOMETHING BELOW IS SINGING.'] },
        rootvault: { to: 'rootvault', col: 8, stone: TILE.ROCK, text: ['THE ROOTVAULT.', 'THE TREES HERE LEAN TOWARD THE DOOR, AND AWAY FROM YOU.'] },
        nest: { to: 'nest', col: 12, stone: TILE.ROCK, text: ['THE EMBER NEST.', 'THE SNOW HAS MELTED FOR A HUNDRED PACES. THE AIR SHIMMERS.'] },
        peakroad: { to: 'ashen', col: 12, stone: TILE.STONE, text: ['THE PEAK ROAD.', 'THE PASS IS DRIFTED SHUT. SOMETHING HOT SLEEPS BEYOND IT.'] },
        forge: { to: 'forge', col: 12, stone: TILE.ROCK, text: ['THE FORGE OF THE FIRST FIRE.', 'THREE SEALS, ONE FROM EACH HOUSE OF EMBERHOLD. THEN THE DOOR WILL OPEN.'] },
        city: { to: 'emberhold', col: 12, stone: TILE.STONE, text: ['EMBERHOLD, THE FORGE-CITY.', 'THE GREAT GATE STANDS OPEN. SMOKE CLIMBS FROM A THOUSAND CHIMNEYS.'] },
        throne: { to: 'throne', col: 15, stone: TILE.STONE, text: ['THE WINTER THRONE.', 'THE LAST DOOR IN THE REACH. FOUR HEARTS MUST BE YOURS TO OPEN IT.'] },
        coastroad: { to: 'coast', col: 15, stone: TILE.STONE, text: ['THE COAST ROAD.', 'THE ICE-SHELF BEYOND THE PASS CREAKS LIKE A SHIP AT ANCHOR.'] },
        kingroad: { to: 'kingdom', col: 14, stone: TILE.RUINWALL, text: ['THE OLD ROAD.', 'THE HOLLOW KINGS\' HIGHWAY, BARRED BY FIRE UNTIL THE FIRE IS ANSWERED.'] },
        tidebreak: { to: 'tidebreak', col: 15, stone: TILE.PACKICE, text: ['TIDEBREAK CAVERN.', 'A SHIP\'S BELL RINGS UNDER THE ICE. NOBODY IS RINGING IT.'] },
        fenroad: { to: 'fens', col: 8, stone: TILE.ROCK, text: ['THE FEN ROAD.', 'THE ROAD ENDS IN A BANK OF FOG. SOMETHING BEYOND IT IS RINGING A BELL.'] },
        stormroad: { to: 'highlands', col: 15, stone: TILE.STONE, text: ['THE STORMCROWN PASS.', 'THE WIND HERE HAS A VOICE. THE CLOUDS ABOVE THE PASS NEVER LEAVE.'] },
        reedwick: { to: 'reedwick', col: 12, stone: TILE.WOODWALL, text: ['REEDWICK, THE STILT VILLAGE.', 'LANTERNS ON LONG POLES. KEEP TO THE BOARDS AND DO NOT ANSWER ANYTHING THAT CALLS YOUR NAME.'] },
        mirebarrow: { to: 'mirebarrow', col: 8, stone: TILE.ROCK, text: ['THE SUNKEN BARROW.', 'THE MOUND HAS SETTLED INTO THE PEAT. SOMETHING BELOW STILL BREATHES.'] },
        skarnhold: { to: 'skarnhold', col: 12, stone: TILE.STONE, text: ['SKARN HOLD.', 'A RING OF HEARTH-FIRES AND WIND-BLEACHED TENTS. THE CLANS WILL HEAR YOU OUT.'] },
        stormspire: { to: 'stormspire', col: 15, stone: TILE.STONE, text: ['THE STORMSPIRE.', 'LIGHTNING WALKS UP THIS TOWER, NOT DOWN. A GIANT SITS AT THE TOP, WAITING FOR THE CLOUDS.'] },
        sepulchre: { to: 'sepulchre', col: 14, stone: TILE.RUINWALL, text: ['THE HOLLOW SEPULCHRE.', 'THE LAST OF THE KINGS WAITS BELOW. HE HAS BEEN WAITING A LONG TIME TO BE REMEMBERED.'] },
      }[p.kind];
      clearing(p, 13, 8);
      g.rect(p.x - 5, p.y - 4, 11, 3, D.stone);
      g.set(p.x, p.y - 2, TILE.STAIRS); g.set(p.x + 1, p.y - 2, TILE.STAIRS);
      for (const dx of [-4, -2, 3, 5]) g.set(p.x + dx, p.y - 1, TILE.PILLAR);
      add({ t: 'exit', x: p.x, y: p.y - 2, w: 2, h: 1, to: D.to, spawn: p.kind === 'city' ? 'gate' : 'entry', fx: 'door', needs: { throne: 'hearts4', peakroad: 'chapter3', coastroad: 'chapter3', forge: 'forgeOpen', kingroad: 'sovereignDead' }[p.kind] || null });
      add({ t: 'spawn', name: { fort: 'keep', temple: 'chapel', rootvault: 'rootvault', nest: 'nest', city: 'emberhold', peakroad: 'peakroad', forge: 'forge', coastroad: 'coastroad', kingroad: 'kingroad', tidebreak: 'tidebreak', sepulchre: 'sepulchre', fenroad: 'fenroad', stormroad: 'stormroad', reedwick: 'reedwick', mirebarrow: 'mirebarrow', skarnhold: 'skarnhold', stormspire: 'stormspire' }[p.kind] || 'throne', x: p.x, y: p.y });
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
    } else if (p.kind === 'cave') {          // a mouth in the rock leading to a small generated delve (map id = the point's id)
      clearing(p, 8, 6);
      g.set(p.x, p.y - 1, TILE.STAIRS);
      for (const dx of [-3, 3]) g.set(p.x + dx, p.y - 1, def.pillar ?? TILE.PILLAR);
      add({ t: 'exit', x: p.x, y: p.y - 1, w: 1, h: 1, to: p.id, spawn: 'entry', fx: 'door', sign: true });
      add({ t: 'spawn', name: p.id, x: p.x, y: p.y + 1 });
      add({ t: 'glow', x: p.x, y: p.y, r: 34, col: 15 });
      add({ t: 'sign', x: p.x + 2, y: p.y + 1, text: [def.caveSign || 'A CAVE MOUTH. COLD AIR BREATHES FROM THE DARK.', 'WHAT SLEEPS BELOW CHANGES WITH EVERY NEW WORLD.'] });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'barrow' });
    } else if (p.kind === 'foundry') {       // a derelict forge: golems and imps among the cold anvils
      clearing(p, 15, 11);
      g.rect(p.x - 6, p.y - 5, 13, 1, TILE.BASALT); g.rect(p.x - 6, p.y - 5, 1, 7, TILE.BASALT); g.rect(p.x + 6, p.y - 5, 1, 7, TILE.BASALT);
      g.set(p.x, p.y - 5, TILE.ASH);
      for (const dx of [-3, 3]) g.set(p.x + dx, p.y - 2, TILE.BRAZIER);
      add({ t: 'prop', tex: 'anvil', x: p.x, y: p.y - 1 });
      for (let i = 0; i < 2 + p.tier; i++) enemy(pickOf(m.melee), p.x + Math.round((R() - 0.5) * 9), p.y + Math.round(R() * 4), p.tier, { camp: p.id });
      for (let i = 0; i < 2; i++) enemy(pickOf(m.ranged), p.x + (i ? 4 : -4), p.y - 3, p.tier, { camp: p.id });
      for (let i = 0; i < 3; i++) add({ t: 'node', x: p.x - 4 + i * 4, y: p.y + 3, ore: R() < 0.3 ? 'ember_ore' : 'ash_iron' });
      chest(p, 0, -3, p.tier + 1, 'hard');
      add({ t: 'lore', id: 'foundry', tex: 'book', x: p.x + 3, y: p.y - 1 });
      add({ t: 'glow', x: p.x, y: p.y - 1, r: 44, col: 12 });
      add({ t: 'sign', x: p.x - 6, y: p.y + 3, text: ['A DERELICT FOUNDRY.', 'THE ANVILS STILL RING WHEN THE WIND CATCHES THEM.'] });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'ruin' });
    } else if (p.kind === 'wreck') {         // a ship locked in the ice, its crew still aboard
      clearing(p, 14, 8);
      g.rect(p.x - 5, p.y - 2, 11, 4, TILE.WRECK); g.rect(p.x - 4, p.y - 1, 9, 2, TILE.ICESHELF); g.set(p.x - 5, p.y, TILE.ICESHELF);
      g.set(p.x + 1, p.y - 3, TILE.WRECK); g.set(p.x + 1, p.y - 4, TILE.WRECK);
      for (let i = 0; i < 3 + (p.tier > 1 ? 1 : 0); i++) enemy(pickOf(['draugr', 'warden', 'wight'].concat(m.melee)), p.x - 3 + i * 3, p.y, p.tier, { camp: p.id });
      chest(p, 1, 0, p.tier + 1, 'med'); chest(p, -2, 1, p.tier, 'med');
      add({ t: 'lore', id: 'wreck' + (Number((p.id.match(/\d+$/) || ['0'])[0]) % 3), tex: 'book', x: p.x + 3, y: p.y });
      add({ t: 'sign', x: p.x - 7, y: p.y + 2, text: ['A WRECK IN THE ICE.', 'THE FIGUREHEAD STILL FACES THE HORIZON. THE CREW HAS STOPPED LOOKING.'] });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'ruin' });
    } else if (p.kind === 'lighthouse') {    // a lamp that never went out, and the keeper who tends it
      clearing(p, 11, 10);
      g.rect(p.x - 1, p.y - 4, 3, 3, TILE.RUINWALL); g.set(p.x, p.y - 4, TILE.BRAZIER);
      add({ t: 'npc', id: 'keeper', x: p.x, y: p.y });
      add({ t: 'fire', x: p.x + 3, y: p.y + 1, rest: true, id: p.id }); g.set(p.x + 3, p.y + 1, TILE.FIRE);
      add({ t: 'glow', x: p.x, y: p.y - 4, r: 70, col: 15 });
      chest(p, -3, 2, p.tier, 'med');
      add({ t: 'sign', x: p.x - 3, y: p.y + 3, text: ['THE LAST LIGHT.', 'NO SHIP HAS ANSWERED IT IN A HUNDRED YEARS. THE KEEPER KEEPS IT ANYWAY.'] });
    } else if (p.kind === 'courtyard') {     // a marble court of the Hollow Kings, haunted
      clearing(p, 15, 12, TILE.MARBLE);
      for (const [dx, dy] of [[-6, -5], [6, -5], [-6, 5], [6, 5], [-6, 0], [6, 0]]) g.set(p.x + dx, p.y + dy, TILE.PILLAR);
      g.rect(p.x - 7, p.y - 6, 4, 1, TILE.RUINWALL); g.rect(p.x + 4, p.y - 6, 4, 1, TILE.RUINWALL);
      add({ t: 'shrine', id: p.id, x: p.x, y: p.y - 1 });
      add({ t: 'glow', x: p.x, y: p.y - 1, r: 46, col: 14 });
      for (let i = 0; i < 3 + p.tier; i++) enemy(pickOf([...m.melee, ...m.ranged]), p.x + Math.round((R() - 0.5) * 11), p.y + 2 + Math.round(R() * 3), p.tier, { camp: p.id });
      for (const dx of [-3, 3]) enemy('sentinel', p.x + dx, p.y + 5, p.tier, { camp: p.id });
      chest(p, 0, 4, p.tier + 1, 'hard');
      if (Number((p.id.match(/\d+$/) || ['0'])[0]) === 0) add({ t: 'npc', id: 'scribe', x: p.x - 4, y: p.y + 4 });
      add({ t: 'lore', id: 'court' + (Number((p.id.match(/\d+$/) || ['0'])[0]) % 3), tex: 'book', x: p.x + 2, y: p.y - 1 });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'ruin' });
    } else if (p.kind === 'hamlet') {
      const who = ['trapper', 'fisher', 'prospector'][Number((p.id.match(/\d+$/) || ['0'])[0]) % 3];
      clearing(p, 18, 12);
      for (const dx of [-7, 3]) { g.rect(p.x + dx, p.y - 5, 5, 2, TILE.ROOF); g.rect(p.x + dx, p.y - 3, 5, 2, TILE.WOODWALL); g.set(p.x + dx + 2, p.y - 3, TILE.WINDOW); g.set(p.x + dx + 2, p.y - 2, TILE.DOOR); }
      g.set(p.x, p.y + 1, TILE.FIRE);
      add({ t: 'fire', x: p.x, y: p.y + 1, rest: true, id: p.id }); add({ t: 'glow', x: p.x, y: p.y + 1, r: 56, col: 12 });
      add({ t: 'npc', id: who, x: p.x + 2, y: p.y + 3 });
      add({ t: 'sign', x: p.x - 3, y: p.y + 3, text: [{ trapper: "A TRAPPER'S HAMLET. FURS ON EVERY FENCE.", fisher: "A FISHERS' HAMLET. NETS DRY IN THE WIND.", prospector: "A PROSPECTORS' CAMP. THE ORE COMES UP COLD." }[who], 'TRAVELLERS WELCOME. KEEP YOUR SWORD SHEATHED.'] });
      chest(p, 5, 4, p.tier, 'med');
      potsAround(p, 4, 6, 'barrel');
    } else if (p.kind === 'standing') {
      clearing(p, 11, 9);
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.set(p.x + Math.round(Math.cos(a) * 4.4), p.y + Math.round(Math.sin(a) * 3.4), TILE.PILLAR); }
      add({ t: 'shrine', id: p.id, x: p.x, y: p.y });
      add({ t: 'glow', x: p.x, y: p.y, r: 46, col: 14 });
      add({ t: 'lore', id: 'stone' + (p.id.slice(-1) % 3), tex: 'book', x: p.x + 2, y: p.y + 1 });
      add({ t: 'sign', x: p.x - 5, y: p.y + 1, text: ['A CIRCLE OF STANDING STONES.', 'THE AIR HUMS. SOMETHING OLD BLESSES THOSE WHO PAUSE HERE.'] });
    } else if (p.kind === 'cache') {
      // a hollow in the rock or a collapsed lean-to: a locked chest, a note, one or two sleepers
      clearing(p, 7, 6, TILE.SNOW2);
      g.set(p.x - 4, p.y - 1, TILE.ROCK); g.set(p.x + 4, p.y - 1, TILE.ROCK); g.set(p.x - 3, p.y - 2, TILE.ROCK); g.set(p.x + 3, p.y - 2, TILE.ROCK);
      chest(p, 0, -1, p.tier + 1, 'hard');
      add({ t: 'sign', x: p.x - 2, y: p.y + 2, text: ['A SCRAWLED NOTE.', pickOf(['SOMEONE HID THEIR SAVINGS HERE. THEY NEVER CAME BACK.', 'IF YOU FOUND THIS, IT IS YOURS. DO NOT WAKE THE WATCHMAN.', 'THE LAST OF THE WINTER STORES. TAKE ONE AND LEAVE THE REST.'])] });
      for (let i = 0; i < 1 + (p.tier > 1 ? 1 : 0); i++) enemy(pickOf(m.melee), p.x + (i ? 3 : -3), p.y + 2, p.tier, { camp: p.id });
    } else if (p.kind === 'hermit') {
      clearing(p, 9, 7, TILE.SNOW2);
      g.set(p.x, p.y + 1, TILE.FIRE);
      add({ t: 'fire', x: p.x, y: p.y + 1, rest: true, id: p.id }); add({ t: 'glow', x: p.x, y: p.y + 1, r: 50, col: 12 });
      add({ t: 'npc', id: 'hermit', x: p.x + 2, y: p.y + 2 });
      add({ t: 'sign', x: p.x - 3, y: p.y + 2, text: ['A HERMIT\'S HOLLOW.', 'HE HAS WALKED EVERY ROAD, AND REMEMBERS ALL OF THEM.'] });
      potsAround(p, 3, 4, 'barrel');
    } else if (p.kind === 'ancient') {
      // a huge old tree ringed by smaller ones, with a blessing at its roots
      clearing(p, 11, 9, TILE.SNOW2);
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; g.set(p.x + Math.round(Math.cos(a) * 5), p.y + Math.round(Math.sin(a) * 4), TILE.PINE); }
      g.set(p.x, p.y - 1, TILE.DEADTREE);
      add({ t: 'shrine', id: p.id, x: p.x, y: p.y + 1 }); add({ t: 'glow', x: p.x, y: p.y, r: 52, col: 14 });
      add({ t: 'lore', id: 'stone' + ((p.id.length + p.x) % 3), tex: 'book', x: p.x + 2, y: p.y + 2 });
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
    } else if (def.dressers?.[p.kind]) {
      def.dressers[p.kind]({ p, g, add, enemy, chest, clearing, potsAround, pickOf, R, m, bio, FL, ORE });
    }
  }

  // ---- wild creatures, nodes and herbs along the roads and in the wilds --------------------------
  for (let i = 0; i < (def.wild || 120); i++) {
    const x = 6 + Math.floor(R() * (W - 12)), y = 6 + Math.floor(R() * (H - 12));
    if (taken.some((t) => Math.hypot(t.x - x, t.y - y) < t.r - 2) || BLOCKED.has(bio[y][x]) || g.t[y][x] === TILE.PATH) continue;
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
      if (x > 2 && y > 2 && x < W - 3 && y < H - 3 && SOLID_SET.has(g.t[y][x]) && g.t[y][x] !== TILE.PILLAR && g.t[y][x] !== TILE.GRAVE && g.t[y][x] !== TILE.BRAZIER && g.t[y][x] !== TILE.FIRE) g.t[y][x] = def.clear ?? TILE.SNOW2;
    }
    g.res[e.y][e.x] = true;
  }

  // ---- scenery ---------------------------------------------------------------------------------
  def.scenery(g, bio, W, H);
  for (const d of def.dress) g.dress(d);
  def.finish?.(g, bio, W, H);

  // ---- repair: every place must be walkable from the entrance. Carve a road through whatever sealed one in
  {
    const flood = () => {
      const seen = new Uint8Array(W * H), q = [[START.x, START.y]]; seen[START.y * W + START.x] = 1;
      for (let i = 0; i < q.length; i++) {
        const [x, y] = q[i];
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || SOLID_SET.has(g.t[ny][nx])) continue;
          seen[ny * W + nx] = 1; q.push([nx, ny]);
        }
      }
      return seen;
    };
    let seen = flood();
    const reached = (p) => { for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const x = p.x + dx, y = p.y + dy; if (x >= 0 && y >= 0 && x < W && y < H && seen[y * W + x]) return true; } return false; };
    for (const p of pois) {
      if (reached(p)) continue;
      // cheapest way out (open ground costs 1, rock 5, the world's wall 60), found with a small Dijkstra
      const dist = new Float32Array(W * H).fill(Infinity), prev = new Int32Array(W * H).fill(-1), heap = [];
      const push = (d, i) => { heap.push([d, i]); let k = heap.length - 1; while (k > 0) { const par = (k - 1) >> 1; if (heap[par][0] <= heap[k][0]) break; [heap[par], heap[k]] = [heap[k], heap[par]]; k = par; } };
      const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { let l = 2 * k + 1, r = l + 1, m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
      const start = p.y * W + p.x; dist[start] = 0; push(0, start);
      let goal = -1;
      while (heap.length) {
        const [d, i] = pop();
        if (d > dist[i]) continue;
        if (seen[i]) { goal = i; break; }
        const x = i % W, y = (i / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 1 || ny < 1 || nx >= W - 1 || ny >= H - 1) continue;
          const cost = Math.min(nx, ny, W - 1 - nx, H - 1 - ny) < 3 ? 60 : SOLID_SET.has(g.t[ny][nx]) ? 5 : 1, ni = ny * W + nx;
          if (d + cost < dist[ni]) { dist[ni] = d + cost; prev[ni] = i; push(d + cost, ni); }
        }
      }
      for (let i = goal; i >= 0; i = prev[i]) {
        const x = i % W, y = (i / W) | 0;
        for (const [ox, oy] of [[0, 0], [1, 0]]) { const tx = x + ox, ty = y + oy; if (tx > 2 && ty > 2 && tx < W - 3 && ty < H - 3 && (SOLID_SET.has(g.t[ty][tx]) && g.t[ty][tx] !== TILE.FIRE && g.t[ty][tx] !== TILE.BRAZIER)) { g.t[ty][tx] = TILE.PATH; g.res[ty][tx] = true; } }
        if (i === start) break;
      }
      seen = flood();
    }
  }

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
  // pots and signs dressed over a house wall or a tree (a hamlet near the old forest) would sit inside it: drop those
  const buried = (e) => (e.t === 'pot' || e.t === 'sign') && e.x != null && solidAt(e.x, e.y);
  const keep = entities.filter((e) => !buried(e) && (e.x == null || !PLACED.has(e.t) && e.t !== 'exit' || e.x < rw && e.y < rh || seen[e.y * W + e.x]));
  // ---- entrance: the old forest's west exit stays where it was ---------------------------------
  // (exits to the village, the pass and the crypt already live in the stamped entities)
  return { grid: g.t, entities: keep, w: W, h: H, pois, bio, region: def.id };
}

// The Hollow Reach: the first overworld. Fields every region definition provides:
//   id, w, h, start, ground/ground2 (base tiles), flora/ores (item ids), mobs (per-tier tables), tierAt(x, y),
//   biome(seed, w, h) -> (x, y) => name, paint(g, bio, w, h), nodes (road ends), taken (reserved discs),
//   plan(place, mustHave) (which points of interest to scatter), extras(ctx), scenery(g, bio, w, h), dress (tile dressing passes).
export const REACH = {
  id: 'reach', w: REACH_W, h: REACH_H, start: START, wild: 600, gap: 44, majorGap: 100,
  ground: TILE.SNOW, ground2: TILE.SNOW2, flora: ['snowberry', 'frost_lily'], ores: ['iron_ingot', 'bone_dust'],
  mobs: TIER_MOBS, tierAt,
  biome(seed, W, H) {
    const lakeSeed = seed % 997, mtnSeed = (seed >> 3) % 991, blightSeed = (seed >> 5) % 983, woodSeed = (seed >> 7) % 977;
    return (x, y) => {
      const lake = vnoise(x, y, 32, lakeSeed), mtn = vnoise(x, y, 24, mtnSeed), blight = vnoise(x, y, 38, blightSeed);
      const east = x / W, south = y / H;
      if (lake > 0.66 && east > 0.3 && south > 0.18) return 'lake';
      if (mtn > 0.68 && (east > 0.25 || south > 0.35)) return 'mountain';
      if (blight > 0.62 && east > 0.45 && south > 0.4) return 'blight';
      return vnoise(x, y, 18, woodSeed) > 0.5 ? 'forest' : 'tundra';
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
    mustHave('fort', 11, 2); mustHave('temple', 10, 2); mustHave('rootvault', 10, 2, 'blight'); mustHave('throne', 12, 3); mustHave('maw', 10, 1); mustHave('nest', 12, 3);
    mustHave('peakroad', 10, 2, null, { x: 490, y: 76, r: 90 });     // the road to the Ashen Peaks (opens in Chapter 3)
    mustHave('coastroad', 10, 2, null, { x: 482, y: 320, r: 90 });   // the road to the Frozen Coast (opens in Chapter 3)
    mustHave('fenroad', 10, 2, null, { x: 150, y: 330, r: 80 });     // the road into the Weeping Fens (open from the start: you can walk there, it is not wise)
    mustHave('stormroad', 10, 2, null, { x: 250, y: 40, r: 80 });    // the pass up to the Stormcrown Highlands
    place('champion', 6, 8);                 // placed early: later it finds no room on a map crowded with dungeons
    place('ruin', 6, 10);
    place('beardn', 4, 9, null, 1);          // a mother bear and her cubs
    place('spring', 4, 6);                   // hot springs: heal, cure, warm
    place('camp', 8, 11);
    place('den', 8, 9);
    place('barrow', 6, 6);
    place('tower', 4, 7);
    place('grove', 4, 8);
    place('hamlet', 3, 9);                   // small settlements: a fire, a trader, a story
    place('standing', 4, 8);                 // stone circles with a blessing
    place('rest', 12, 4);
    // make sure there is something gentle near the entrance
    place('den', 1, 9, { x: 105, y: 30, r: 32 });
    place('rest', 1, 4, { x: 105, y: 54, r: 27 });
    place('hamlet', 1, 9, { x: 80, y: 50, r: 34 });
    place('cache', 8, 5); place('hermit', 4, 7); place('ancient', 5, 7);          // hidden places, found by looking
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
      const loop = pickLoop(6, minTier);
      add({ t: 'roamboss', id, kind, tier, route: loop, phase: Math.floor(R() * 900) });
      for (const s of trackSpots(loop, 120)) add({ t: 'track', x: s.x, y: s.y, who: id });
    }
  }

  // small wildlife scattered everywhere, even between the points of interest: hares and foxes bolt when you come near
  for (let i = 0, n = 0; i < 1000 && n < 45; i++) {
    const x = 6 + Math.floor(R() * (W - 12)), y = 6 + Math.floor(R() * (H - 12)), b = bio[y][x];
    if (b === 'lake' || b === 'mountain' || g.t[y][x] === TILE.PATH || g.res[y][x]) continue;
    add({ t: 'deer', x, y, kind: R() < 0.55 ? 'hare' : 'fox' }); n++;
  }

  // ice-fishing holes out on the frozen lakes
  for (let i = 0, n = 0; i < 1500 && n < 34; i++) {
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

// ---------------------------------------------------------------------------------------- the regions beyond the Reach
// Shared setup for a region's west entrance, its wild creatures and roaming bosses.
//   o: { start, exitTo, exitSpawn, sign, fireId, mobs, tierAt, clear, nWild, roamers: [[id, kind, tier, minTier, stops]], fish }
export function regionExtras(o) {
  return ({ g, R, W, H, START, add, pois, bio }) => {
    const C = o.clear;
    g.rect(START.x - 3, START.y - 5, 8, 11, C);
    for (let y = START.y - 5; y <= START.y + 5; y++) for (let x = START.x - 3; x <= START.x + 4; x++) g.res[y][x] = true;
    add({ t: 'spawn', name: 'entry', x: START.x + 2, y: START.y });
    add({ t: 'exit', x: 3, y: START.y - 3, w: 1, h: 7, to: o.exitTo, spawn: o.exitSpawn, fx: 'door' });
    add({ t: 'fire', x: START.x + 4, y: START.y + 2, rest: true, id: o.fireId }); add({ t: 'glow', x: START.x + 4, y: START.y + 2, r: 52, col: 12 });
    add({ t: 'sign', x: START.x + 1, y: START.y - 3, text: o.sign });
    for (let i = 0, n = 0; i < 900 && n < (o.nWild || 50); i++) {
      const x = 8 + Math.floor(R() * (W - 16)), y = 8 + Math.floor(R() * (H - 16));
      if (BLOCKED.has(bio[y][x]) || g.res[y][x] || g.t[y][x] === TILE.PATH) continue;
      const tier = o.tierAt(x, y), roll = R(), mm = o.mobs[Math.min(3, tier)];
      if (roll < 0.28) add({ t: 'node', x, y, ore: R() < 0.8 ? 'iron_ingot' : 'bone_dust' });
      else if (roll < 0.38) add({ t: 'dig', x, y, id: `${o.fireId}dig${i}` });
      else add({ t: 'enemy', kind: mm.wild[Math.floor(R() * mm.wild.length)], x, y, tier, roam: true });
      n++;
    }
    for (let i = 0, n = 0; i < 500 && n < 12; i++) {
      const x = 6 + Math.floor(R() * (W - 12)), y = 6 + Math.floor(R() * (H - 12));
      if (BLOCKED.has(bio[y][x]) || g.t[y][x] === TILE.PATH || g.res[y][x]) continue;
      add({ t: 'deer', x, y, kind: R() < 0.55 ? 'hare' : 'fox' }); n++;
    }
    if (o.fish) for (let i = 0, n = 0; i < 1200 && n < o.fish; i++) {
      const x = 12 + Math.floor(R() * (W - 24)), y = 8 + Math.floor(R() * (H - 16));
      if (g.t[y][x] !== TILE.ICESHELF || g.res[y][x] || [[2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => g.t[y + dy]?.[x + dx] !== TILE.ICESHELF)) continue;
      add({ t: 'fish', x, y }); n++;
    }
    const stops = pois.filter((q) => ['camp', 'foundry', 'ruin', 'tower', 'rest', 'champion', 'wreck', 'lighthouse', 'courtyard', 'spring', 'hamlet'].includes(q.kind));
    for (const [id, kind, tier, minTier, n] of o.roamers || []) {
      const cand = stops.filter((q) => q.tier >= minTier), pool = (cand.length >= n ? cand : stops).slice(), way = [];
      let a = pool[Math.floor(R() * pool.length)];
      for (let i = 0; i < n && pool.length; i++) { pool.splice(pool.indexOf(a), 1); way.push({ x: a.x, y: a.y + 3 }); a = pool.sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))[Math.min(pool.length - 1, 1 + Math.floor(R() * 3))] || a; }
      if (way.length < 3) continue;
      const loop = buildLoop(way);
      add({ t: 'roamboss', id, kind, tier, route: loop, phase: Math.floor(R() * 900) });
      for (const sp of trackSpots(loop, 120)) add({ t: 'track', x: sp.x, y: sp.y, who: id });
    }
  };
}
export const tierFrom = (st, a, b, c) => (x, y) => { const d = Math.hypot(x - st.x, (y - st.y) * 0.9); return d < a ? 0 : d < b ? 1 : d < c ? 2 : 3; };

// The Ashen Peaks: volcanic uplands around the forge-city. Lava is solid and impassable; the roads thread between the pools.
const ASH_START = { x: 6, y: 60 };
export const ASHEN = {
  id: 'ashen', w: 240, h: 180, start: ASH_START, salt: 0x51ed, gap: 34, majorGap: 70,
  ground: TILE.ASH, ground2: TILE.CFLOOR2, clear: TILE.CFLOOR2, caveSign: 'A CINDER WARREN. THE ROCK IS WARM TO THE TOUCH.', flora: ['snowberry', 'frost_lily'], ores: ['iron_ingot', 'bone_dust'],
  mobs: [
    { melee: ['bandit', 'imp', 'magmaslime'], ranged: ['archer'], wild: ['boar', 'imp', 'ashhound', 'ashhound'] },
    { melee: ['imp', 'golem', 'bandit', 'cindersmith', 'magmaslime'], ranged: ['archer', 'conjurer', 'lavawraith'], wild: ['boar', 'bear', 'imp', 'wyvern', 'ashhound'] },
    { melee: ['golem', 'cindersmith', 'knight', 'imp', 'magmaslime'], ranged: ['conjurer', 'necro', 'lavawraith', 'wisp'], wild: ['bear', 'wyvern', 'ashhound'] },
    { melee: ['golem', 'knight', 'cindersmith', 'reaver'], ranged: ['conjurer', 'necro', 'lavawraith', 'wisp'], wild: ['wyvern', 'bear', 'ashhound', 'alpha'] },
  ],
  tierAt: tierFrom(ASH_START, 75, 120, 165),
  biome(seed) {
    const crag = (seed >> 2) % 989, scorch = (seed >> 6) % 971, lava = (seed >> 9) % 967;
    return (x, y) => (vnoise(x, y, 14, lava) > 0.71 && x > 26 ? 'lava' : vnoise(x, y, 16, crag) > 0.67 && x > 22 ? 'crag' : vnoise(x, y, 13, scorch) > 0.56 ? 'scorch' : 'ash');
  },
  paint(g, bio, W, H) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const b = bio[y][x];
      if (b === 'crag') g.t[y][x] = hash(x, y, 91) < 0.6 ? TILE.BASALT : (hash(x, y, 92) < 0.5 ? TILE.ROCK : TILE.STONE);
      else if (b === 'lava') g.t[y][x] = hash(x, y, 94) < 0.82 ? TILE.LAVA : TILE.BASALT;
    }
  },
  nodes: [{ x: ASH_START.x + 8, y: ASH_START.y }],
  taken: [{ x: ASH_START.x, y: ASH_START.y, r: 14 }],
  plan(place, mustHave) {
    mustHave('city', 12, 1);
    mustHave('forge', 12, 3);
    mustHave('kingroad', 10, 2, null, { x: 210, y: 90, r: 60 });      // the old road to the Hollow Kings' realm (opens when the First Fire is answered)
    place('foundry', 3, 11); place('cave', 3, 7);
    place('champion', 3, 8); place('ruin', 3, 10); place('camp', 5, 11); place('tower', 3, 7);
    place('spring', 2, 6); place('standing', 2, 8); place('hamlet', 2, 9); place('rest', 8, 4);
    place('rest', 1, 4, { x: ASH_START.x + 22, y: ASH_START.y, r: 14 });
    place('cache', 3, 5); place('hermit', 1, 7); place('ancient', 1, 7);
  },
  extras: null,
  scenery(g, bio, W, H) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (g.res[y][x] || g.t[y][x] === TILE.PATH) continue;
      if (g.t[y][x] !== TILE.ASH && g.t[y][x] !== TILE.CFLOOR2) continue;
      const b = bio[y][x], r = hash(x, y, 93);
      if (b === 'scorch' && r < 0.14) g.t[y][x] = r < 0.06 ? TILE.DEADTREE : TILE.STUMP;
      else if (b === 'ash' && r < 0.045) g.t[y][x] = r < 0.02 ? TILE.BASALT : TILE.STUMP;
    }
  },
  dress: [],
};
ASHEN.extras = regionExtras({ start: ASH_START, exitTo: 'forest', exitSpawn: 'peakroad', fireId: 'ashenfire', clear: TILE.CFLOOR2, mobs: ASHEN.mobs, tierAt: ASHEN.tierAt, nWild: 62,
  sign: ['THE ASHEN PEAKS.', 'THE ROAD WEST RETURNS TO THE HOLLOW REACH. THE LAVA IS NOT A METAPHOR.'], roamers: [['cinder', 'golem', 3, 2, 5]] });

// The Frozen Coast: an ice shelf and shingle strand east of the Reach, wrecks locked in the pack ice, a lamp that never went out.
const COAST_START = { x: 6, y: 64 };
export const COAST = {
  id: 'coast', w: 260, h: 190, start: COAST_START, salt: 0xc0a5, gap: 34, majorGap: 70,
  ground: TILE.ICESHELF, ground2: TILE.SHINGLE, clear: TILE.ICESHELF, caveSign: 'A SEA CAVE. THE TIDE COMES IN UNDER THE ICE.', flora: ['frost_lily', 'snowberry'], ores: ['iron_ingot', 'bone_dust'],
  mobs: [
    { melee: ['bandit', 'draugr', 'wreckcrab'], ranged: ['archer', 'harpooner'], wild: ['wolf', 'boar', 'wreckcrab'] },
    { melee: ['draugr', 'warden', 'bandit', 'fencer', 'wreckcrab'], ranged: ['archer', 'wight', 'harpooner', 'barnacle'], wild: ['wolf', 'bear', 'boar', 'frostworm', 'wreckcrab'] },
    { melee: ['reaver', 'warden', 'draugr', 'knight', 'wreckcrab'], ranged: ['wight', 'conjurer', 'harpooner', 'tidehag', 'barnacle'], wild: ['alpha', 'bear', 'frostworm', 'wyvern'] },
    { melee: ['reaver', 'knight', 'warden', 'golem', 'wreckcrab'], ranged: ['conjurer', 'wight', 'tidehag', 'harpooner', 'barnacle'], wild: ['alpha', 'bear', 'frostworm', 'wyvern'] },
  ],
  tierAt: tierFrom(COAST_START, 75, 120, 165),
  biome(seed) {
    const pack = (seed >> 4) % 983, shore = (seed >> 8) % 977;
    return (x, y) => (x < 24 + vnoise(x, y, 9, shore) * 12 ? 'shingle' : vnoise(x, y, 15, pack) > 0.66 ? 'pack' : 'shelf');
  },
  paint(g, bio, W, H) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const b = bio[y][x];
      if (b === 'shingle') g.t[y][x] = hash(x, y, 101) < 0.12 ? TILE.ROCK : TILE.SHINGLE;
      else if (b === 'pack') g.t[y][x] = hash(x, y, 102) < 0.78 ? TILE.PACKICE : TILE.ICESHELF;
    }
  },
  nodes: [{ x: COAST_START.x + 8, y: COAST_START.y }],
  taken: [{ x: COAST_START.x, y: COAST_START.y, r: 14 }],
  plan(place, mustHave) {
    mustHave('tidebreak', 12, 3, null, { x: 225, y: 90, r: 65 });
    place('lighthouse', 2, 9); place('wreck', 4, 9); place('cave', 3, 7);
    place('camp', 4, 11); place('hamlet', 3, 9); place('tower', 2, 7); place('champion', 3, 8);
    place('spring', 1, 6); place('standing', 2, 8); place('den', 2, 9); place('rest', 7, 4);
    place('rest', 1, 4, { x: COAST_START.x + 22, y: COAST_START.y, r: 14 });
    place('cache', 3, 5); place('hermit', 1, 7); place('ancient', 1, 7);
  },
  extras: null,
  scenery(g, bio, W, H) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (g.res[y][x] || g.t[y][x] === TILE.PATH) continue;
      const b = bio[y][x], r = hash(x, y, 103);
      if (b === 'shingle' && g.t[y][x] === TILE.SHINGLE && r < 0.05) g.t[y][x] = r < 0.02 ? TILE.ROCK : TILE.STUMP;
      else if (b === 'shelf' && g.t[y][x] === TILE.ICESHELF && r < 0.012) g.t[y][x] = TILE.PACKICE;
      else if (b === 'shelf' && g.t[y][x] === TILE.ICESHELF && r > 0.985) g.t[y][x] = TILE.ICE2;
    }
  },
  dress: [],
};
COAST.extras = regionExtras({ start: COAST_START, exitTo: 'forest', exitSpawn: 'coastroad', fireId: 'coastfire', clear: TILE.ICESHELF, mobs: COAST.mobs, tierAt: COAST.tierAt, nWild: 54, fish: 32,
  sign: ['THE FROZEN COAST.', 'THE ROAD WEST RETURNS TO THE HOLLOW REACH. LISTEN FOR THE ICE.'], roamers: [['floe', 'troll', 3, 2, 5]] });

// The Old Kingdom: the Hollow Kings' realm, overgrown marble and broken walls. Opens when the First Fire has been answered.
const KING_START = { x: 6, y: 64 };
export const KINGDOM = {
  id: 'kingdom', w: 260, h: 190, start: KING_START, salt: 0x4b1d, gap: 34, majorGap: 70,
  ground: TILE.MOSS, ground2: TILE.MARBLE, clear: TILE.MARBLE, pillar: TILE.PILLAR, caveSign: 'A CRYPT STAIR. THE KINGS DID NOT TRUST THE SURFACE WITH THEIR DEAD.', flora: ['frost_lily', 'snowberry'], ores: ['iron_ingot', 'bone_dust'],
  mobs: [
    { melee: ['draugr', 'warden', 'phantom'], ranged: ['wight', 'archer'], wild: ['wolf', 'boar', 'stalker'] },
    { melee: ['knight', 'warden', 'draugr', 'reaver', 'phantom'], ranged: ['wight', 'conjurer', 'necro', 'herald'], wild: ['bear', 'alpha', 'stalker', 'wyvern'] },
    { melee: ['knight', 'reaver', 'warden', 'golem', 'phantom'], ranged: ['necro', 'conjurer', 'wisp', 'herald'], wild: ['alpha', 'wyvern', 'stalker'] },
    { melee: ['knight', 'reaver', 'warden', 'golem', 'phantom'], ranged: ['necro', 'conjurer', 'wisp', 'herald'], wild: ['alpha', 'wyvern', 'stalker'] },
  ],
  tierAt: tierFrom(KING_START, 60, 105, 150),
  biome(seed) {
    const wall = (seed >> 3) % 991, plaza = (seed >> 7) % 977;
    return (x, y) => (vnoise(x, y, 13, wall) > 0.64 && x > 22 ? 'wall' : vnoise(x, y, 12, plaza) > 0.62 ? 'plaza' : 'moss');
  },
  paint(g, bio, W, H) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const b = bio[y][x];
      if (b === 'wall') g.t[y][x] = hash(x, y, 111) < 0.62 ? TILE.RUINWALL : TILE.MOSS;
      else if (b === 'plaza') g.t[y][x] = hash(x, y, 112) < 0.8 ? TILE.MARBLE : TILE.MOSS;
    }
  },
  nodes: [{ x: KING_START.x + 8, y: KING_START.y }],
  taken: [{ x: KING_START.x, y: KING_START.y, r: 14 }],
  plan(place, mustHave) {
    mustHave('sepulchre', 12, 3, null, { x: 225, y: 90, r: 65 });
    place('courtyard', 5, 11); place('cave', 3, 7); place('ruin', 3, 10); place('tower', 2, 7);
    place('champion', 4, 8); place('camp', 3, 11); place('standing', 2, 8); place('hamlet', 1, 9); place('rest', 7, 4);
    place('rest', 1, 4, { x: KING_START.x + 22, y: KING_START.y, r: 14 });
    place('cache', 3, 5); place('hermit', 1, 7); place('ancient', 1, 7);
  },
  extras: null,
  scenery(g, bio, W, H) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (g.res[y][x] || g.t[y][x] === TILE.PATH) continue;
      if (g.t[y][x] !== TILE.MOSS && g.t[y][x] !== TILE.MARBLE) continue;
      const r = hash(x, y, 113);
      if (g.t[y][x] === TILE.MOSS && r < 0.07) g.t[y][x] = r < 0.03 ? TILE.DEADTREE : r < 0.05 ? TILE.STUMP : TILE.PILLAR;
    }
  },
  dress: [],
};
KINGDOM.extras = regionExtras({ start: KING_START, exitTo: 'ashen', exitSpawn: 'kingroad', fireId: 'kingfire', clear: TILE.MARBLE, mobs: KINGDOM.mobs, tierAt: KINGDOM.tierAt, nWild: 58,
  sign: ['THE OLD KINGDOM.', 'THE ROAD WEST RETURNS TO THE ASHEN PEAKS. WHAT STANDS HERE WAS BUILT TO OUTLAST THE KINGS.'], roamers: [['lastknight', 'knight', 3, 2, 5]] });

export const REGION_DEFS = { reach: REACH, ashen: ASHEN, coast: COAST, kingdom: KINGDOM };

