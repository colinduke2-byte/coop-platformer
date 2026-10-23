// Which tileset a map is drawn with, and the free variety its ground gets (VX-01, VX-07).
//
// The game draws one tile layer, so a tree or a rock tile carries its own ground. The base set ('tiles') puts snow under the
// props; a map whose ground is not snow gets its own set ('tset_<ground>') in which the same props stand on that ground and the
// roofs are slate, thatch or clay. The set is chosen from the map's most common walkable tile, once per built map, and built
// once per ground (a strip of TILE_COUNT 16px tiles, a few ms).
//
// Ground cells are also mirrored by a hash of their position, so large fields of one tile stop reading as wallpaper. That is
// a property of each Tile object, set once when the layer is made: it costs nothing per frame.
import { TILE, SOLID_TILES } from '../config.js';
import { buildTileset } from './sprites.js';

const SNOWY = new Set([TILE.SNOW, TILE.SNOW2, TILE.SNOW3, TILE.SNOW4, TILE.SNOWDRIFT, TILE.ICESHELF, TILE.CFLOOR, TILE.CFLOOR2, TILE.WOODFLOOR, TILE.RUG]);
const SOLID = new Set(SOLID_TILES);
// ground tiles that may be mirrored: both ways (pure speckle) or only left-right (things that grow upward, ripples with a lit side)
const FLIP_XY = new Set([TILE.SNOW, TILE.SNOW2, TILE.SNOW3, TILE.PATH, TILE.PATH2, TILE.ASH, TILE.SHINGLE, TILE.MOSS, TILE.BOG, TILE.SLATE,
  TILE.GLASSMOSS, TILE.GLADEPATH, TILE.DEEPSTONE, TILE.SAND, TILE.ICE, TILE.ICE2, TILE.PACKICE, TILE.ICESHELF]);
const FLIP_X = new Set([TILE.SNOW4, TILE.MEADOW, TILE.FLOWERS, TILE.HEATH, TILE.DUNE, TILE.SNOWDRIFT, TILE.EMBERBLOOM, TILE.LILYPAD, TILE.GLASSBLOOM,
  TILE.SPORES, TILE.TUFT]);

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

// The tileset texture key for a built map (builds the set the first time a ground is seen).
export function tilesetFor(scene, built) {
  let g = mapGround(built);
  const def = scene.def || {};
  // an outdoor town paved in slate (Emberhold): its props and roofs belong to the ash country, not to the snow
  if ((g === TILE.CFLOOR || g === TILE.CFLOOR2) && def.outdoors && !def.snow) g = TILE.CFLOOR;
  else if (SNOWY.has(g)) return 'tiles';
  const key = 'tset_' + g;
  if (!scene.textures.exists(key)) buildTileset(scene, key, g);
  return key;
}

// Mirror ground cells by a hash of their position (deterministic: the same map always looks the same).
export function varyGround(layer) {
  const data = layer.layer.data;
  for (let y = 0; y < data.length; y++) {
    const row = data[y];
    for (let x = 0; x < row.length; x++) {
      const t = row[x], i = t.index;
      if (FLIP_XY.has(i) || FLIP_X.has(i)) {
        const h = Math.imul(x * 73856093 ^ y * 19349663, 0x27d4eb2d) >>> 29;
        t.flipX = (h & 1) === 1;
        if (FLIP_XY.has(i)) t.flipY = (h & 2) === 2;
      }
    }
  }
}
