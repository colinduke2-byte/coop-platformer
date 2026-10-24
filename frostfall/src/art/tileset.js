// Which tileset a map is drawn with, and the free variety its ground gets (VX-01, VX-07).
//
// The game draws one tile layer, so a tree or a rock tile carries its own ground. The base set ('tiles') puts snow under the
// props; a map whose ground is not snow gets its own set ('tset_<ground>') in which the same props stand on that ground and the
// roofs are slate, thatch or clay. The set is chosen from the map's most common walkable tile, once per built map, and built
// once per ground (a strip of TILE_COUNT 16px tiles, a few ms).
//
// Ground cells are also mirrored by a hash of their position, so large fields of one tile stop reading as wallpaper. That is
// a property of each Tile object, set once when the layer is made: it costs nothing per frame.
//
// Where two grounds meet (snow and a road, meadow and a path), the lower ground's cell is drawn with a ragged fringe of the
// higher one (VX-21). Those are extra tiles appended to the map's tileset, so the map keeps one layer; the grid keeps its ids.
import { TILE, SOLID_TILES, TILE_COUNT } from '../config.js';
import { buildTileset, PROP_TILES } from './sprites.js';

const SNOWY = new Set([TILE.SNOW, TILE.SNOW2, TILE.SNOW3, TILE.SNOW4, TILE.SNOWDRIFT, TILE.ICESHELF, TILE.CFLOOR, TILE.CFLOOR2, TILE.WOODFLOOR, TILE.RUG]);
const SOLID = new Set(SOLID_TILES);
// ground tiles that may be mirrored: both ways (pure speckle) or only left-right (things that grow upward, ripples with a lit side)
const FLIP_XY = new Set([TILE.SNOW, TILE.SNOW2, TILE.SNOW3, TILE.PATH, TILE.PATH2, TILE.ASH, TILE.SHINGLE, TILE.MOSS, TILE.BOG, TILE.SLATE,
  TILE.GLASSMOSS, TILE.GLADEPATH, TILE.DEEPSTONE, TILE.SAND, TILE.ICE, TILE.ICE2, TILE.PACKICE, TILE.ICESHELF]);
const FLIP_X = new Set([TILE.SNOW4, TILE.MEADOW, TILE.FLOWERS, TILE.HEATH, TILE.DUNE, TILE.SNOWDRIFT, TILE.EMBERBLOOM, TILE.LILYPAD, TILE.GLASSBLOOM,
  TILE.SPORES, TILE.TUFT]);

// VX-16: trees and rocks that repeat in straight rows get look-alike variants (same solidity; the map grid keeps the original
// id) and are mirrored, both by a hash of the cell, so a forest edge stops reading as a wall of one stamp.
const ALIAS = {
  [TILE.PINE]: [TILE.PINE, TILE.PINE, TILE.PINE_B, TILE.PINE_C], [TILE.BIRCH]: [TILE.BIRCH, TILE.BIRCH, TILE.BIRCH_B], [TILE.DEADTREE]: [TILE.DEADTREE, TILE.DEADTREE_B],
  [TILE.BOGTREE]: [TILE.BOGTREE, TILE.BOGTREE_B], [TILE.CRYSTAL]: [TILE.CRYSTAL, TILE.CRYSTAL_B], [TILE.CACTUS]: [TILE.CACTUS, TILE.CACTUS, TILE.CACTUS_B],
  [TILE.ROCK]: [TILE.ROCK, TILE.ROCK, TILE.ROCK_B], [TILE.GLOWCAP]: [TILE.GLOWCAP, TILE.GLOWCAP_B],
};
const MIRROR = new Set([TILE.PINE, TILE.PINE_B, TILE.PINE_C, TILE.BIRCH, TILE.BIRCH_B, TILE.DEADTREE, TILE.DEADTREE_B, TILE.BOGTREE, TILE.BOGTREE_B,
  TILE.CRYSTAL, TILE.CRYSTAL_B, TILE.ROCK, TILE.ROCK_B, TILE.BOULDER, TILE.STUMP, TILE.HEATHROCK, TILE.GLOWCAP, TILE.GLOWCAP_B, TILE.BOGREED]);

const groundOf = new WeakMap();
// The most common walkable tile of a built map (its ground). Cached on the built object's identity.
export function mapGround(built) {
  if (groundOf.has(built)) return groundOf.get(built);
  const n = new Map();
  const g = built.grid;
  for (let y = 0; y < g.length; y += 2) {               // every other row and column is plenty for a majority
    const row = g[y];
    for (let x = 0; x < row.length; x += 2) { const t = row[x]; if (!SOLID.has(t)) n.set(t, (n.get(t) || 0) + 1); }
  }
  let best = TILE.SNOW, bn = -1;
  for (const [t, c] of n) if (c > bn) { best = t; bn = c; }
  groundOf.set(built, best);
  return best;
}

// VX-21: which grounds spill over which: a ground of higher rank throws a ragged fringe onto a walkable neighbour of lower rank.
const RANK = new Int8Array(256).fill(-1);
for (const [t, r] of [[TILE.SNOW, 5], [TILE.SNOW2, 5], [TILE.SNOW3, 5], [TILE.SNOW4, 5], [TILE.SNOWDRIFT, 5],
  [TILE.MEADOW, 4], [TILE.FLOWERS, 4], [TILE.HEATH, 4], [TILE.GLASSMOSS, 4], [TILE.MOSS, 4], [TILE.BOG, 4], [TILE.SAND, 4], [TILE.DUNE, 4], [TILE.ASH, 4],
  [TILE.SHINGLE, 3], [TILE.ICESHELF, 3], [TILE.DEEPSTONE, 2], [TILE.ICE, 2], [TILE.ICE2, 2],
  [TILE.PATH, 1], [TILE.PATH2, 1], [TILE.GLADEPATH, 1], [TILE.MARBLE, 1], [TILE.GLYPH, 1], [TILE.SLATE, 1], [TILE.BOARDWALK, 1], [TILE.MARBLEMOSS, 1]]) RANK[t] = r;
// the ground that gives the fringe for a family (all snows fringe as SNOW, flowers as MEADOW, dunes as SAND)
const FRINGE = Int16Array.from({ length: 256 }, (_, i) => i);
for (const [f, t] of [[TILE.SNOW2, TILE.SNOW], [TILE.SNOW3, TILE.SNOW], [TILE.SNOW4, TILE.SNOW], [TILE.SNOWDRIFT, TILE.SNOW], [TILE.FLOWERS, TILE.MEADOW], [TILE.DUNE, TILE.SAND]]) FRINGE[f] = t;
const edgesOf = new WeakMap();
const madeFor = new Map();            // 'tsetm_<map>' -> the built map it was drawn for
// For a built map: { combos: [{ b, a, mask }], cells: Int32Array of [cellIndex, combo] pairs }. Cached per built map.
const PROP = new Set(PROP_TILES.filter((t) => t !== TILE.ROOF));
const FLOOR_PROPS = new Set([TILE.PILLAR, TILE.BRAZIER, TILE.SARCO]);
const SNOWS = new Set([TILE.SNOW, TILE.SNOW2, TILE.SNOW3, TILE.SNOW4, TILE.SNOWDRIFT]);
// bg: the map's own prop ground (null = the snowy base). A prop whose neighbours stand on another walkable ground (a brazier on a
// road, a tree at the edge of a path) is drawn on that ground instead.
export function mapEdges(built, bg = null) {
  if (edgesOf.has(built)) return edgesOf.get(built);
  const grid = built.grid, h = grid.length, w = grid[0].length, keys = new Map(), combos = [], cells = [];
  for (let y = 0; y < h; y++) {
    const row = grid[y], up = grid[y - 1], dn = grid[y + 1];
    for (let x = 0; x < w; x++) {
      if (PROP.has(row[x])) {
        const n = new Map();
        for (const t of [up?.[x], row[x + 1], dn?.[x], row[x - 1]]) if (t !== undefined && !SOLID.has(t)) n.set(t, (n.get(t) || 0) + 1);
        let g = -1, gn = 0; for (const [t, c] of n) if (c > gn) { g = t; gn = c; }
        const home = bg != null ? g === bg : FLOOR_PROPS.has(row[x]) ? g === TILE.CFLOOR || g === TILE.CFLOOR2 : SNOWS.has(g);
        if (g < 0 || home || g >= TILE_COUNT) continue;
        const k = 0x40000000 | (row[x] << 12) | g;
        let c = keys.get(k);
        if (c === undefined) { c = combos.length; keys.set(k, c); combos.push({ prop: row[x], b: g }); }
        cells.push(y * w + x, c);
        continue;
      }
      const me = RANK[row[x]];
      if (me < 1) continue;
      let best = me, a = -1, mask = 0;
      const look = (t, bit) => { const r = RANK[t]; if (r > me) { const g = FRINGE[t]; if (r > best) { best = r; a = g; mask = 0; } if (g === a) mask |= bit; } };
      if (up) look(up[x], 1);
      if (x + 1 < w) look(row[x + 1], 2);
      if (dn) look(dn[x], 4);
      if (x > 0) look(row[x - 1], 8);
      if (!mask) continue;
      const k = (row[x] << 16) | (a << 4) | mask;
      let c = keys.get(k);
      if (c === undefined) { c = combos.length; keys.set(k, c); combos.push({ b: row[x], a, mask }); }
      cells.push(y * w + x, c);
    }
  }
  const r = { combos, cells: Int32Array.from(cells) };
  edgesOf.set(built, r);
  return r;
}

// The tileset texture key for a built map. Without fringes, maps share 'tiles' (snowy ground) or 'tset_<ground>'; a map with
// fringes gets its own set, 'tsetm_<map id>', rebuilt when the map is loaded (a few ms).
export function tilesetFor(scene, built) {
  const g = mapGround(built), def = scene.def || {};
  let bg = null;
  // an outdoor town paved in slate (Emberhold): its props and roofs belong to the ash country, not to the snow
  if ((g === TILE.CFLOOR || g === TILE.CFLOOR2) && def.outdoors && !def.snow) bg = TILE.CFLOOR;
  else if (!SNOWY.has(g)) bg = g;
  const { combos } = mapEdges(built, bg);
  if (combos.length) {
    const key = 'tsetm_' + (scene.mapId || 'map');
    if (madeFor.get(key) !== built || !scene.textures.exists(key)) { buildTileset(scene, key, bg, combos); madeFor.set(key, built); }   // same map again: reuse
    return key;
  }
  const key = bg == null ? 'tiles' : 'tset_' + bg;
  if (!scene.textures.exists(key)) buildTileset(scene, key, bg);
  return key;
}

// Mirror ground cells by a hash of their position (deterministic: the same map always looks the same); swap trees and rocks
// for their look-alikes; put the fringe tiles on the cells that have one.
export function varyGround(layer) {
  const data = layer.layer.data;
  for (let y = 0; y < data.length; y++) {
    const row = data[y];
    for (let x = 0; x < row.length; x++) {
      const t = row[x];
      if (ALIAS[t.index]) { const v = ALIAS[t.index]; t.index = v[(Math.imul(x * 2654435761 ^ y * 40503, 0x9e3779b1) >>> 24) % v.length]; }
      const i = t.index;
      if (MIRROR.has(i)) t.flipX = (Math.imul(x * 374761393 ^ y * 668265263, 0x5bd1e995) >>> 31) === 1;
      if (FLIP_XY.has(i) || FLIP_X.has(i)) {
        const h = Math.imul(x * 73856093 ^ y * 19349663, 0x27d4eb2d) >>> 29;
        t.flipX = (h & 1) === 1;
        if (FLIP_XY.has(i)) t.flipY = (h & 2) === 2;
      }
    }
  }
  const built = layer.scene?.built;
  if (!built || layer.tileset?.[0]?.image?.key?.startsWith('tsetm_') !== true) return;
  const { cells, combos } = mapEdges(built), w = data[0].length;
  for (let k = 0; k < cells.length; k += 2) {
    const t = data[(cells[k] / w) | 0][cells[k] % w], c = cells[k + 1];
    t.index = TILE_COUNT + c; t.flipX = t.flipY = false;
    if (combos[c].prop != null) t.setCollision(true, true, true, true, false);     // a prop stays solid on its new ground
  }
}
