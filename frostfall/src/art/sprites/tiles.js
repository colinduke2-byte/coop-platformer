// Tiles, props and the region tilesets (split out of art/sprites.js, CH16).
import { PAL, T, TILE, TILE_COUNT } from '../../config.js';
import { hash } from '../../util.js';
import { R, canvas } from './base.js';

// --------------------------------------------------------------------- tiles
function speckle(ctx, ox, oy, seed, cols, count) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(hash(i, seed, 1) * T), y = Math.floor(hash(i, seed, 2) * T);
    R(ctx, cols[Math.floor(hash(i, seed, 3) * cols.length)], ox + x, oy + y, 1, 1);
  }
}

// Scenery props (trees, rocks, braziers...) are drawn over a ground. In the base tileset that ground is snow (or slate floor
// for the dungeon props); a region's own tileset (art/tileset.js) passes its ground tile as `bg`, so the same prop stands on
// ash, sand or moss there instead of in a white square (VX-01). `bg` also picks the roof material.
export const PROP_TILES = [TILE.PINE, TILE.ROCK, TILE.FENCE, TILE.GRAVE, TILE.DEADTREE, TILE.STUMP, TILE.TUFT, TILE.FROSTBLOOM, TILE.BOULDER, TILE.FIRE, TILE.PILLAR, TILE.BRAZIER, TILE.SARCO, TILE.ROOF,
  TILE.PINE_B, TILE.PINE_C, TILE.DEADTREE_B, TILE.ROCK_B, TILE.BONES, TILE.POTS, TILE.PALM, TILE.STEAMVENT, TILE.OBSIDIAN, TILE.SNAG, TILE.LANTERNPOST, TILE.STATUE, TILE.STALAGMITE, TILE.BEEHIVE, TILE.LOG];
const GREEN = [TILE.MEADOW, TILE.FLOWERS, TILE.MOSS, TILE.HEATH, TILE.BOG, TILE.BOARDWALK, TILE.GLADEPATH];
const DARK = [TILE.ASH, TILE.BASALT, TILE.SLATE, TILE.DEEPSTONE, TILE.CFLOOR, TILE.CFLOOR2, TILE.STONE];
const SANDY = [TILE.SAND, TILE.DUNE, TILE.GLYPH, TILE.SANDRUIN];
const ROOF_OF = (bg) => (bg == null ? 'snow' : GREEN.includes(bg) || bg === TILE.GLASSMOSS ? 'thatch' : SANDY.includes(bg) ? 'clay' : DARK.includes(bg) ? 'slate' : 'snow');
// what the snow on a prop (the white cap on a stump, the lit side of a pine, a rock's top) becomes on a snowless ground:
// [colour for 6, colour for 5]
const CAP_OF = (bg) => (bg === TILE.GLASSMOSS || bg === TILE.CRYSTAL ? [15, 4] : GREEN.includes(bg) ? [8, 4] : SANDY.includes(bg) ? [13, 10]
  : DARK.includes(bg) ? [4, 3] : [6, 5]);
const CAP_RGB = PAL.map((h) => parseInt(h.slice(1), 16));
function drawTile(ctx, id, ox, bg = null) {
  if (bg != null && bg !== -1 && PROP_TILES.includes(id) && id !== TILE.ROOF) { propOver(ctx, id, ox, bg); return; }
  const o = (c, x, y, w = 1, h = 1) => R(ctx, c, ox + x, y, w, h);
  const snow = () => { if (bg === -1) return; o(5, 0, 0, 16, 16); speckle(ctx, ox, 0, id + 1, [6, 6, 4], 7); };
  const cfloor = () => { if (bg === -1) return; o(2, 0, 0, 16, 16); o(1, 0, 15, 16, 1); o(1, 15, 0, 1, 16); speckle(ctx, ox, 0, id + 7, [3, 1], 6); };
  switch (id) {
    case TILE.SNOW: snow(); break;
    case TILE.SNOW2: o(5, 0, 0, 16, 16); speckle(ctx, ox, 0, 99, [6, 6, 6, 4, 3], 14); break;
    case TILE.ICE:
      o(4, 0, 0, 16, 16); o(5, 2, 3, 6, 1); o(6, 3, 2, 3, 1); o(5, 9, 10, 5, 1); o(3, 0, 8, 16, 1);
      o(6, 11, 4, 1, 1); o(5, 4, 12, 2, 1); break;
    case TILE.STONE:
      o(3, 0, 0, 16, 16); o(2, 0, 5, 16, 1); o(2, 0, 10, 16, 1); o(2, 8, 0, 1, 5); o(2, 4, 6, 1, 4); o(2, 12, 6, 1, 4); o(2, 8, 11, 1, 5);
      o(6, 0, 0, 16, 2); o(5, 0, 2, 16, 1); break;
    case TILE.PINE: {
      snow();
      o(0, 3, 13, 10, 1); // shadow-ish base
      o(9, 7, 12, 2, 3);
      for (let t = 0; t < 3; t++) {
        const top = 0 + t * 4;
        for (let r = 0; r < 5; r++) {
          const w = Math.min(2 + r * 2 + t, 12); const x = 8 - w / 2;
          o(r < 2 ? 8 : 7, x, top + r, w, 1);
          if (r < 2) o(6, x, top + r, Math.max(1, w / 2 - 1), 1);
          o(0, x + w - 1, top + r, 1, 1);
        }
      }
      break;
    }
    case TILE.PATH: o(10, 0, 0, 16, 16); speckle(ctx, ox, 0, 55, [9, 9, 5, 5, 4], 16); break;
    case TILE.WOODFLOOR: o(10, 0, 0, 16, 16); for (let y = 3; y < 16; y += 4) o(9, 0, y, 16, 1); o(9, 5, 0, 1, 3); o(9, 11, 4, 1, 4); break;
    case TILE.WOODWALL: o(9, 0, 0, 16, 16); for (let x = 3; x < 16; x += 4) o(10, x, 0, 1, 15); o(1, 0, 14, 16, 2); break;
    case TILE.ROOF: {
      // snow-laden shingles in the north; slate in the ash country, thatch in the green lands, clay tiles in the desert
      const [base, lo, hi] = { snow: [5, 4, 6], slate: [2, 1, 3], thatch: [10, 9, 13], clay: [10, 9, 12] }[ROOF_OF(bg)];
      o(base, 0, 0, 16, 16); for (let y = 0; y < 16; y += 4) { o(lo, 0, y + 3, 16, 1); o(hi, 0, y, 16, 1); }
      for (let y = 0; y < 16; y += 4) for (let x = (y / 4) % 2 ? 4 : 0; x < 16; x += 8) o(lo, x, y, 1, 3);
      if (ROOF_OF(bg) === 'thatch') for (let y = 1; y < 16; y += 4) for (let x = 1 + (y & 2); x < 16; x += 5) o(9, x, y, 1, 2);
      break;
    }
    case TILE.CFLOOR: cfloor(); break;
    case TILE.CWALL:
      o(1, 0, 0, 16, 16); o(2, 0, 0, 16, 1); o(0, 0, 7, 16, 1); o(0, 0, 15, 16, 1);
      o(0, 7, 0, 1, 7); o(0, 3, 8, 1, 7); o(0, 11, 8, 1, 7); o(3, 1, 1, 5, 1); o(3, 9, 9, 5, 1); break;
    case TILE.ROCK:
      snow(); o(3, 2, 5, 12, 9); o(3, 4, 3, 8, 2); o(4, 3, 6, 6, 4); o(6, 4, 3, 6, 2); o(2, 2, 13, 12, 1); o(5, 5, 6, 3, 1); break;
    case TILE.PILLAR:
      cfloor(); o(0, 3, 14, 10, 2); o(4, 4, 2, 8, 12); o(5, 5, 2, 2, 11); o(3, 10, 2, 2, 12); o(6, 4, 1, 8, 1); o(2, 4, 13, 8, 1); break;
    case TILE.BRAZIER:
      cfloor(); o(0, 4, 14, 8, 2); o(3, 5, 8, 6, 5); o(2, 5, 13, 6, 1); o(9, 7, 11, 2, 3); o(1, 5, 8, 6, 1); break;
    case TILE.STAIRS:
      o(1, 0, 0, 16, 16); o(0, 2, 0, 12, 16); for (let i = 0; i < 4; i++) o(2, 3 + i, 2 + i * 3, 10 - i * 2, 1);
      o(3, 0, 0, 2, 16); o(3, 14, 0, 2, 16); break;
    case TILE.FENCE:
      snow(); o(9, 1, 6, 14, 2); o(10, 1, 6, 14, 1); o(9, 1, 11, 14, 2); o(9, 2, 4, 2, 10); o(9, 12, 4, 2, 10); o(6, 2, 3, 2, 1); o(6, 12, 3, 2, 1); break;
    case TILE.RUG: o(11, 0, 0, 16, 16); o(1, 0, 0, 2, 16); o(1, 14, 0, 2, 16); o(13, 3, 0, 1, 16); o(13, 12, 0, 1, 16); speckle(ctx, ox, 0, 71, [0, 9], 5); break;
    case TILE.DOOR:
      o(9, 0, 0, 16, 16); o(1, 3, 0, 10, 16); o(9, 4, 1, 8, 14); o(10, 5, 2, 1, 12); o(10, 8, 2, 1, 12); o(10, 10, 2, 1, 12); o(13, 10, 8, 2, 2); o(6, 2, 0, 12, 1); break;
    case TILE.FIRE:
      if (bg !== -1) o(5, 0, 0, 16, 16); o(3, 2, 6, 12, 8); o(2, 2, 12, 12, 2); o(0, 4, 5, 8, 2); o(1, 4, 5, 8, 6); o(0, 5, 7, 6, 3); o(9, 3, 9, 10, 1); o(10, 4, 9, 8, 1); break;
    case TILE.WINDOW:
      o(9, 0, 0, 16, 16); for (let x = 3; x < 16; x += 4) o(10, x, 0, 1, 15); o(1, 0, 14, 16, 2);
      o(1, 3, 3, 10, 8); o(13, 4, 4, 8, 6); o(12, 4, 8, 8, 2); o(9, 7, 4, 2, 6); o(9, 4, 6, 8, 1); break;
    case TILE.GRAVE:
      snow(); o(0, 4, 13, 8, 2); o(3, 4, 4, 8, 10); o(4, 5, 3, 6, 1); o(4, 5, 5, 1, 8); o(2, 10, 5, 1, 8); o(2, 7, 7, 2, 4); o(6, 4, 4, 8, 1); break;
    case TILE.SARCO:
      cfloor(); o(0, 1, 13, 14, 2); o(4, 1, 3, 14, 10); o(3, 1, 11, 14, 2); o(5, 2, 4, 12, 1); o(2, 6, 6, 4, 1); o(2, 7, 5, 2, 6); break;
    case TILE.SNOW3: o(5, 0, 0, 16, 16); speckle(ctx, ox, 0, 31, [6, 4], 8); o(4, 3, 10, 3, 2); o(3, 3, 12, 3, 1); o(6, 3, 10, 2, 1); o(4, 11, 4, 2, 2); o(6, 11, 4, 1, 1); o(3, 10, 6, 3, 1); break;
    case TILE.SNOW4: o(5, 0, 0, 16, 16); speckle(ctx, ox, 0, 41, [6, 6, 4], 9); for (const [x, y] of [[3, 4], [9, 9], [12, 3]]) { o(8, x, y + 1, 1, 2); o(8, x + 2, y, 1, 3); o(7, x + 1, y + 1, 1, 2); } break;
    case TILE.PATH2: o(10, 0, 0, 16, 16); speckle(ctx, ox, 0, 61, [9, 9, 4, 5, 3], 20); o(9, 2, 7, 3, 1); o(9, 3, 8, 1, 1); o(9, 10, 12, 2, 1); o(4, 11, 11, 1, 1); o(5, 8, 3, 2, 1); break;
    case TILE.CFLOOR2: cfloor(); o(1, 4, 3, 1, 5); o(1, 5, 7, 3, 1); o(1, 8, 8, 1, 4); o(1, 9, 11, 3, 1); o(3, 10, 4, 2, 1); break;
    case TILE.CWALL2:
      o(1, 0, 0, 16, 16); o(2, 0, 0, 16, 1); o(0, 0, 7, 16, 1); o(0, 0, 15, 16, 1); o(0, 7, 0, 1, 7); o(0, 3, 8, 1, 7); o(0, 11, 8, 1, 7);
      o(7, 1, 1, 5, 2); o(8, 2, 3, 3, 1); o(7, 9, 9, 4, 2); o(8, 10, 11, 2, 1); o(8, 12, 2, 2, 1); break;
    case TILE.DEADTREE:
      snow(); o(0, 4, 14, 8, 1); o(9, 7, 6, 2, 8); o(9, 4, 5, 3, 1); o(9, 3, 3, 1, 3); o(9, 9, 7, 4, 1); o(9, 12, 4, 1, 4); o(10, 7, 6, 1, 8); o(9, 7, 2, 1, 4); o(6, 3, 3, 1, 1); o(6, 12, 4, 1, 1); o(6, 7, 2, 2, 1); break;
    case TILE.STUMP:
      snow(); o(0, 3, 13, 10, 2); o(9, 3, 6, 10, 7); o(10, 4, 5, 8, 2); o(9, 5, 7, 6, 1); o(10, 6, 7, 4, 1); o(6, 3, 5, 10, 1); o(6, 4, 4, 8, 1); o(9, 7, 6, 2, 1); break;
    case TILE.ASH: o(1, 0, 0, 16, 16); speckle(ctx, ox, 0, 131, [2, 2, 0, 3], 14); speckle(ctx, ox, 0, 132, [11, 12], 2); break;
    case TILE.BASALT: o(0, 0, 0, 16, 16); o(1, 1, 1, 14, 14); o(2, 2, 2, 5, 4); o(2, 8, 7, 6, 5); o(0, 7, 2, 1, 6); o(11, 4, 9, 1, 3); o(12, 5, 11, 2, 1); o(3, 3, 3, 2, 1); break;
    case TILE.LAVA: o(11, 0, 0, 16, 16); o(12, 1, 3, 6, 2); o(12, 8, 9, 7, 2); o(13, 3, 4, 2, 1); o(13, 10, 10, 2, 1); o(0, 0, 7, 5, 1); o(0, 11, 2, 4, 1); o(12, 5, 13, 5, 1); break;
    case TILE.ICESHELF: o(5, 0, 0, 16, 16); o(6, 1, 2, 7, 1); o(4, 0, 8, 16, 1); o(6, 9, 11, 5, 1); o(4, 4, 5, 1, 3); o(15, 11, 4, 2, 1); speckle(ctx, ox, 0, 141, [6, 4], 6); break;
    case TILE.PACKICE: o(3, 0, 0, 16, 16); o(4, 1, 1, 6, 6); o(5, 2, 2, 3, 2); o(6, 2, 2, 1, 1); o(4, 8, 6, 7, 8); o(5, 9, 7, 3, 2); o(2, 0, 7, 8, 1); o(2, 7, 0, 1, 7); o(0, 0, 15, 16, 1); o(15, 11, 9, 1, 1); break;
    case TILE.SHINGLE: o(3, 0, 0, 16, 16); speckle(ctx, ox, 0, 151, [4, 2, 5, 9], 26); o(4, 3, 4, 2, 1); o(4, 10, 11, 3, 1); break;
    case TILE.WRECK: o(9, 0, 0, 16, 16); for (let y = 2; y < 16; y += 4) o(10, 0, y, 16, 1); for (let y = 0; y < 16; y += 4) o(0, 0, y + 3, 16, 1); o(0, 4, 0, 1, 16); o(0, 11, 0, 1, 16); o(1, 0, 14, 16, 2); o(5, 2, 1, 2, 1); break;
    case TILE.MARBLE: o(5, 0, 0, 16, 16); o(6, 0, 0, 15, 1); o(6, 0, 0, 1, 15); o(4, 15, 0, 1, 16); o(4, 0, 15, 16, 1); o(4, 3, 5, 5, 1); o(4, 7, 6, 1, 4); o(6, 10, 10, 4, 1); break;
    case TILE.RUINWALL: o(3, 0, 0, 16, 16); o(4, 0, 0, 16, 1); o(2, 0, 5, 16, 1); o(2, 0, 10, 16, 1); o(2, 6, 0, 1, 5); o(2, 11, 5, 1, 5); o(2, 3, 10, 1, 6); o(8, 1, 1, 4, 3); o(7, 9, 11, 5, 3); o(8, 10, 12, 2, 1); o(0, 0, 15, 16, 1); break;
    case TILE.MOSS: o(7, 0, 0, 16, 16); speckle(ctx, ox, 0, 161, [8, 8, 2, 13], 14); o(8, 2, 3, 3, 2); o(8, 9, 10, 4, 2); break;
    case TILE.BOG: o(7, 0, 0, 16, 16); speckle(ctx, ox, 0, 171, [1, 9, 8, 1], 22); o(1, 2, 4, 5, 2); o(8, 9, 10, 3, 1); o(9, 11, 3, 2, 1); o(1, 4, 12, 6, 1); break;
    case TILE.BLACKWATER: o(0, 0, 0, 16, 16); o(1, 1, 3, 6, 1); o(1, 8, 9, 7, 1); o(2, 3, 6, 4, 1); o(2, 9, 12, 5, 1); o(3, 10, 4, 2, 1); o(8, 12, 14, 2, 1); break;
    case TILE.BOARDWALK: o(9, 0, 0, 16, 16); for (let x = 0; x < 16; x += 4) { o(10, x, 0, 3, 16); o(1, x + 3, 0, 1, 16); } o(0, 0, 3, 16, 1); o(0, 0, 11, 16, 1); o(9, 1, 3, 1, 1); o(9, 9, 11, 1, 1); break;
    case TILE.HEATH: o(7, 0, 0, 16, 16); speckle(ctx, ox, 0, 181, [8, 9, 8, 10], 26); for (const [x, y] of [[3, 4], [10, 8], [6, 12]]) { o(14, x, y, 2, 1); o(14, x + 1, y - 1, 1, 1); o(8, x, y + 1, 1, 2); } break;
    case TILE.SLATE: o(2, 0, 0, 16, 16); speckle(ctx, ox, 0, 191, [3, 1, 2, 4], 22); o(1, 0, 8, 16, 1); o(3, 5, 0, 1, 8); o(1, 11, 9, 1, 7); break;
    case TILE.BOGTREE: o(7, 0, 0, 16, 16); speckle(ctx, ox, 0, 171, [1, 9, 8, 1], 22); o(0, 4, 14, 8, 1); o(9, 7, 6, 2, 8); o(9, 4, 5, 3, 1); o(9, 3, 3, 1, 3); o(9, 9, 7, 4, 1); o(9, 12, 4, 1, 4); o(10, 7, 6, 1, 8); o(8, 5, 4, 2, 1); o(8, 11, 3, 2, 1); o(8, 6, 11, 4, 1); break;
    case TILE.BOGREED: o(7, 0, 0, 16, 16); speckle(ctx, ox, 0, 171, [1, 9, 8, 1], 22); for (const [x, h] of [[3, 9], [6, 12], [9, 8], [12, 10]]) { o(8, x, 14 - h, 1, h); o(10, x, 14 - h, 1, 2); o(9, x - 1, 14 - h + 1, 3, 2); } o(0, 2, 14, 12, 1); break;
    case TILE.GLASSMOSS: o(7, 0, 0, 16, 16); speckle(ctx, ox, 0, 251, [8, 15, 8, 6], 26); for (const [x, y] of [[3, 5], [10, 9], [6, 12]]) { o(15, x, y, 1, 2); o(6, x + 1, y + 1, 1, 1); } break;
    case TILE.CRYSTAL: o(7, 0, 0, 16, 16); speckle(ctx, ox, 0, 251, [8, 15, 8, 6], 26); o(0, 3, 14, 10, 1); o(4, 6, 3, 4, 11); o(5, 7, 2, 2, 12); o(15, 7, 1, 1, 8); o(6, 2, 7, 4, 7); o(15, 3, 6, 1, 4); o(5, 10, 6, 4, 8); o(15, 11, 5, 1, 5); o(4, 3, 10, 3, 4); break;
    case TILE.GLADEPATH: o(5, 0, 0, 16, 16); speckle(ctx, ox, 0, 261, [6, 15, 4, 5], 22); o(6, 1, 4, 5, 1); o(4, 9, 11, 5, 1); o(15, 12, 3, 1, 1); break;
    case TILE.DEEPSTONE: o(1, 0, 0, 16, 16); speckle(ctx, ox, 0, 271, [2, 3, 0, 2], 30); o(0, 2, 5, 5, 1); o(2, 9, 10, 4, 1); o(0, 4, 13, 7, 1); break;
    case TILE.GLOWCAP: o(1, 0, 0, 16, 16); speckle(ctx, ox, 0, 271, [2, 3, 0, 2], 30); o(0, 3, 14, 10, 1); o(5, 7, 8, 2, 6); o(8, 3, 4, 10, 4); o(15, 4, 5, 3, 1); o(8, 4, 3, 8, 1); o(15, 9, 5, 1, 1); o(8, 11, 7, 2, 3); o(5, 12, 9, 1, 1); break;
    case TILE.CAVERNPOOL: o(0, 0, 0, 16, 16); o(1, 1, 3, 6, 1); o(4, 8, 9, 7, 1); o(15, 3, 6, 4, 1); o(4, 9, 12, 5, 1); o(15, 10, 4, 2, 1); o(1, 12, 14, 2, 1); break;
    case TILE.HEATHROCK: o(7, 0, 0, 16, 16); speckle(ctx, ox, 0, 181, [8, 9, 8, 10], 26); o(3, 2, 5, 12, 9); o(3, 4, 3, 8, 2); o(4, 3, 6, 6, 4); o(6, 4, 3, 6, 2); o(2, 2, 13, 12, 1); o(5, 5, 6, 3, 1); o(14, 11, 10, 2, 1); break;
    case TILE.ICE2: o(4, 0, 0, 16, 16); o(5, 2, 3, 6, 1); o(3, 0, 8, 16, 1); o(2, 3, 2, 1, 4); o(2, 4, 5, 3, 1); o(2, 7, 6, 1, 5); o(2, 8, 10, 4, 1); o(6, 11, 3, 2, 1); break;
    case TILE.TUFT: snow(); for (const [x, y] of [[4, 8], [8, 6], [11, 9]]) { o(8, x, y, 1, 3); o(7, x + 1, y + 1, 1, 2); o(8, x - 1, y + 1, 1, 2); } o(6, 4, 7, 1, 1); break;
    // ---- the Embergreen Vale
    case TILE.MEADOW: o(8, 0, 0, 16, 16); speckle(ctx, ox, 0, 301, [7, 7, 8, 10], 22); for (const [x, y] of [[3, 4], [11, 3], [7, 11]]) { o(7, x, y, 1, 2); o(7, x + 1, y + 1, 1, 1); } break;
    case TILE.FLOWERS: o(8, 0, 0, 16, 16); speckle(ctx, ox, 0, 302, [7, 7, 8], 18); for (const [x, y, c] of [[2, 3, 13], [7, 2, 6], [12, 4, 14], [4, 9, 11], [10, 10, 13], [13, 13, 6], [6, 13, 14]]) { o(c, x, y, 1, 1); o(c, x + 1, y + 1, 1, 1); o(7, x, y + 2, 1, 2); } break;
    case TILE.BIRCH: o(8, 0, 0, 16, 16); speckle(ctx, ox, 0, 301, [7, 7, 8, 10], 22); o(0, 4, 14, 8, 1); o(6, 7, 8, 2, 7); o(5, 8, 8, 1, 7); for (const y of [10, 13]) o(0, 7, y, 2, 1); o(0, 2, 0, 12, 9); o(0, 1, 2, 14, 5); o(7, 3, 1, 10, 7); o(7, 2, 3, 12, 3); o(8, 4, 2, 8, 3); o(8, 3, 6, 4, 1); o(13, 5, 3, 1, 1); o(13, 10, 2, 1, 1); o(13, 8, 5, 1, 1); o(13, 3, 4, 1, 1); o(7, 4, 7, 8, 1); break;
    case TILE.POND: o(15, 0, 0, 16, 16); o(5, 2, 3, 5, 1); o(6, 3, 2, 2, 1); o(5, 9, 9, 5, 1); o(3, 0, 6, 16, 1); o(4, 4, 12, 4, 1); o(3, 10, 3, 3, 1); o(8, 0, 0, 16, 1); o(8, 0, 15, 16, 1); o(7, 1, 1, 1, 3); o(7, 14, 12, 1, 3); break;
    case TILE.HEARTROOT: o(8, 0, 0, 16, 16); speckle(ctx, ox, 0, 301, [7, 7, 8, 10], 22); o(0, 1, 14, 14, 1); o(9, 5, 7, 6, 8); o(10, 6, 7, 2, 8); o(1, 9, 8, 1, 7); o(9, 2, 12, 4, 3); o(9, 11, 12, 4, 3); o(0, 0, 0, 16, 9); o(7, 1, 1, 14, 7); o(8, 2, 2, 12, 5); o(13, 3, 3, 1, 1); o(13, 8, 2, 1, 1); o(13, 12, 4, 1, 1); o(13, 6, 5, 1, 1); o(12, 10, 3, 1, 1); o(7, 3, 6, 10, 1); break;
    // ---- the Sunscorch Reach
    case TILE.SAND: o(10, 0, 0, 16, 16); speckle(ctx, ox, 0, 311, [10, 10, 13, 9], 20); o(13, 3, 5, 1, 1); o(9, 9, 10, 2, 1); break;
    case TILE.DUNE: o(10, 0, 0, 16, 16); speckle(ctx, ox, 0, 312, [10, 13, 9], 14); for (let x = 0; x < 16; x++) { o(9, x, 9 + ((x >> 2) & 1) - (x > 8 ? 1 : 0), 1, 1); o(13, x, 5 + ((x >> 2) & 1), 1, 1); } break;
    case TILE.SANDSTONE: o(9, 0, 0, 16, 16); o(10, 0, 0, 16, 3); o(12, 0, 3, 16, 1); o(10, 0, 6, 16, 2); o(1, 0, 8, 16, 1); o(10, 0, 10, 16, 2); o(12, 3, 12, 6, 1); o(1, 0, 14, 16, 2); o(13, 2, 1, 3, 1); o(1, 7, 4, 1, 2); o(1, 12, 9, 1, 1); break;
    case TILE.CACTUS: o(10, 0, 0, 16, 16); speckle(ctx, ox, 0, 311, [10, 10, 13, 9], 20); o(9, 3, 14, 10, 1); o(7, 6, 3, 4, 12); o(8, 7, 3, 2, 12); o(7, 2, 7, 3, 2); o(7, 2, 4, 2, 4); o(8, 3, 4, 1, 4); o(7, 11, 5, 3, 2); o(7, 12, 3, 2, 3); o(8, 12, 3, 1, 3); o(13, 8, 2, 1, 1); o(6, 8, 6, 1, 1); break;
    case TILE.OASIS: o(15, 0, 0, 16, 16); o(5, 2, 3, 5, 1); o(6, 3, 2, 2, 1); o(5, 9, 9, 5, 1); o(3, 0, 12, 16, 1); o(4, 4, 6, 4, 1); o(10, 0, 0, 16, 1); o(10, 0, 15, 16, 1); o(13, 1, 1, 1, 1); o(13, 14, 14, 1, 1); break;
    case TILE.GLYPH: o(10, 0, 0, 16, 16); o(9, 0, 0, 16, 1); o(9, 0, 0, 1, 16); o(13, 3, 3, 10, 1); o(13, 3, 12, 10, 1); o(13, 3, 3, 1, 10); o(13, 12, 3, 1, 10); o(12, 6, 6, 4, 4); o(13, 7, 7, 2, 2); speckle(ctx, ox, 0, 313, [9, 10, 10], 8); break;
    case TILE.SANDRUIN: o(10, 0, 0, 16, 16); o(9, 0, 5, 16, 1); o(9, 0, 10, 16, 1); o(9, 8, 0, 1, 5); o(9, 4, 6, 1, 4); o(9, 12, 6, 1, 4); o(9, 8, 11, 1, 5); o(13, 2, 1, 3, 1); o(12, 10, 7, 2, 1); o(1, 0, 15, 16, 1); o(4, 0, 0, 16, 1); break;
    // ---- scatter terrain for the older regions
    case TILE.SNOWDRIFT: o(5, 0, 0, 16, 16); speckle(ctx, ox, 0, 321, [6, 6, 4, 5], 12); for (const [x, y, w] of [[1, 4, 7], [6, 7, 9], [2, 11, 8]]) { o(6, x, y, w, 1); o(4, x + 1, y + 1, w - 1, 1); } break;
    case TILE.FROSTBLOOM: snow(); for (const [x, y, c] of [[3, 4, 15], [9, 3, 6], [12, 9, 15], [5, 11, 6], [8, 8, 15]]) { o(c, x, y, 1, 1); o(c, x - 1, y + 1, 1, 1); o(c, x + 1, y + 1, 1, 1); o(8, x, y + 1, 1, 2); } break;
    case TILE.BOULDER: snow(); o(0, 2, 14, 12, 1); o(3, 2, 7, 12, 7); o(4, 3, 6, 10, 2); o(5, 4, 5, 6, 1); o(2, 3, 11, 10, 3); o(6, 4, 5, 5, 1); o(0, 2, 7, 1, 7); o(0, 13, 7, 1, 7); o(2, 7, 9, 1, 3); o(6, 5, 4, 3, 1); break;
    case TILE.EMBERBLOOM: o(1, 0, 0, 16, 16); speckle(ctx, ox, 0, 131, [2, 2, 0, 3], 14); for (const [x, y, c] of [[3, 5, 12], [9, 3, 11], [12, 10, 12], [5, 11, 13]]) { o(c, x, y, 2, 1); o(c, x, y - 1, 1, 1); o(c, x + 1, y - 1, 1, 1); o(9, x, y + 1, 1, 2); } break;
    case TILE.LILYPAD: o(7, 0, 0, 16, 16); speckle(ctx, ox, 0, 171, [1, 9, 8, 1], 22); for (const [x, y] of [[2, 3], [9, 6], [5, 11], [12, 12]]) { o(8, x, y, 4, 2); o(7, x + 1, y + 1, 2, 1); o(0, x + 1, y, 1, 1); } o(14, 10, 5, 1, 1); o(13, 10, 4, 1, 1); o(6, 6, 10, 1, 1); break;
    case TILE.MARBLEMOSS: o(5, 0, 0, 16, 16); o(6, 0, 0, 15, 1); o(6, 0, 0, 1, 15); o(4, 15, 0, 1, 16); o(4, 0, 15, 16, 1); o(8, 2, 3, 5, 3); o(7, 3, 5, 3, 2); o(8, 9, 9, 5, 4); o(7, 10, 11, 3, 2); o(13, 4, 8, 1, 1); o(13, 12, 3, 1, 1); o(6, 8, 6, 1, 1); break;
    case TILE.GLASSBLOOM: o(7, 0, 0, 16, 16); speckle(ctx, ox, 0, 251, [8, 15, 8, 6], 26); for (const [x, y, c] of [[3, 5, 15], [9, 4, 6], [12, 10, 15], [5, 11, 6]]) { o(c, x, y, 1, 3); o(c, x - 1, y + 1, 3, 1); o(8, x, y + 3, 1, 2); } break;
    case TILE.SPORES: o(1, 0, 0, 16, 16); speckle(ctx, ox, 0, 271, [2, 3, 0, 2], 30); for (const [x, y, c] of [[3, 6, 15], [9, 4, 14], [12, 10, 8], [5, 12, 14]]) { o(c, x - 1, y, 3, 1); o(c, x, y - 1, 1, 1); o(4, x, y + 1, 1, 2); } break;
    // ---- A block (VX-16, VX-22): tree and rock variants, then scatter props. All stand on snow() so a region's tileset
    // composites them onto its own ground.
    case TILE.PINE_B: case TILE.PINE_C: {           // a tall narrow pine; a squat one heavy with snow
      snow();
      const tall = id === TILE.PINE_B, tiers = tall ? 4 : 3, step = tall ? 3 : 4, maxW = tall ? 9 : 14;
      o(0, 4, 14, 8, 1); o(9, 7, 13, 2, 3);
      for (let t = 0; t < tiers; t++) for (let r = 0; r < 4; r++) {
        const w = Math.min(2 + r * 2 + t, maxW), x = 8 - w / 2, y = t * step + r;
        o(r < (tall ? 1 : 2) ? 8 : 7, x, y, w, 1);
        if (r < (tall ? 1 : 3)) o(6, x, y, Math.max(1, Math.round(w * (tall ? 0.3 : 0.6))), 1);
        o(0, x + w - 1, y, 1, 1);
      }
      break;
    }
    case TILE.BIRCH_B:                             // a birch leaning the other way under a rounder crown
      o(8, 0, 0, 16, 16); speckle(ctx, ox, 0, 303, [7, 7, 8, 10], 22); o(0, 3, 14, 8, 1);
      o(6, 6, 9, 2, 6); o(5, 6, 9, 1, 6); o(6, 5, 7, 2, 2); for (const y of [10, 12]) o(0, 6, y, 2, 1);
      o(0, 1, 1, 12, 8); o(0, 0, 3, 14, 4); o(7, 2, 2, 10, 6); o(7, 1, 3, 12, 3); o(8, 3, 2, 7, 3); o(8, 2, 5, 4, 1);
      o(13, 4, 3, 1, 1); o(13, 9, 2, 1, 1); o(13, 7, 5, 1, 1); break;
    case TILE.DEADTREE_B:                          // a split, wind-bent snag
      snow(); o(0, 5, 14, 7, 1); o(9, 7, 7, 2, 8); o(10, 7, 7, 1, 8); o(9, 5, 4, 2, 4); o(9, 4, 2, 1, 3); o(9, 9, 5, 1, 3); o(9, 10, 3, 3, 1); o(9, 12, 2, 1, 2); o(6, 4, 2, 1, 1); o(6, 12, 2, 1, 1); break;
    case TILE.BOGTREE_B:                           // a drowned stump with hanging moss
      o(7, 0, 0, 16, 16); speckle(ctx, ox, 0, 172, [1, 9, 8, 1], 22); o(0, 3, 14, 10, 1); o(9, 5, 6, 6, 8); o(10, 6, 6, 1, 8); o(1, 7, 9, 2, 2);
      o(9, 3, 4, 3, 2); o(9, 11, 3, 3, 2); for (const x of [4, 6, 11, 13]) o(8, x, 5, 1, 3 + (x % 3)); break;
    case TILE.CRYSTAL_B:                           // three thin glass spires
      o(7, 0, 0, 16, 16); speckle(ctx, ox, 0, 252, [8, 15, 8, 6], 26); o(0, 2, 14, 12, 1);
      for (const [x, h] of [[4, 8], [8, 12], [11, 6]]) { o(4, x, 14 - h, 2, h); o(15, x, 14 - h, 1, h - 1); o(6, x, 14 - h, 1, 1); } break;
    case TILE.CACTUS_B:                            // a barrel cactus in flower
      o(10, 0, 0, 16, 16); speckle(ctx, ox, 0, 314, [10, 10, 13, 9], 20); o(9, 3, 14, 10, 1); o(7, 4, 7, 8, 7); o(8, 5, 7, 6, 6); o(7, 7, 7, 1, 6); o(7, 10, 7, 1, 6);
      for (const x of [5, 8, 11]) o(6, x, 9, 1, 1); o(11, 7, 5, 2, 2); o(12, 8, 5, 1, 1); break;
    case TILE.ROCK_B:                              // two stones leaning together
      snow(); o(2, 2, 13, 12, 1); o(3, 2, 7, 6, 6); o(4, 3, 7, 4, 2); o(6, 3, 6, 4, 1); o(3, 8, 5, 6, 8); o(4, 9, 5, 4, 3); o(6, 9, 4, 4, 1); o(2, 8, 12, 6, 1); break;
    case TILE.GLOWCAP_B:                           // a ring of three small glowing caps
      o(1, 0, 0, 16, 16); speckle(ctx, ox, 0, 272, [2, 3, 0, 2], 30); o(0, 2, 14, 12, 1);
      for (const [x, y] of [[3, 9], [8, 6], [11, 10]]) { o(5, x + 1, y + 2, 1, 3); o(15, x, y, 3, 2); o(6, x, y, 1, 1); } break;
    case TILE.BONES:                               // a bleached ribcage half sunk in the ground (walkable)
      snow(); for (let i = 0; i < 4; i++) { o(6, 4 + i * 2, 6, 1, 5); o(5, 4 + i * 2, 10, 1, 1); } o(6, 3, 6, 9, 1); o(6, 11, 4, 3, 2); o(0, 12, 5, 1, 1); break;
    case TILE.POTS:                                // two clay jars
      snow(); o(0, 2, 14, 12, 1); o(12, 2, 6, 6, 8); o(9, 2, 12, 6, 2); o(13, 3, 7, 2, 1); o(9, 3, 4, 4, 2); o(12, 9, 8, 5, 6); o(9, 9, 12, 5, 2); o(13, 10, 9, 1, 1); o(9, 10, 6, 3, 2); break;
    case TILE.PALM:                                // a palm: a ringed trunk and drooping fronds
      snow(); o(0, 6, 14, 6, 1); for (let y = 6; y < 15; y++) o(y % 2 ? 9 : 10, 7 + (y < 9 ? 1 : 0), y, 2, 1);
      for (const [x, y, w] of [[2, 3, 6], [9, 3, 6], [1, 5, 4], [11, 5, 4], [5, 1, 6]]) { o(8, x, y, w, 2); o(7, x, y + 1, w, 1); } o(9, 7, 4, 3, 2); break;
    case TILE.STEAMVENT:                           // a cracked vent breathing steam (walkable)
      snow(); o(1, 4, 8, 8, 4); o(0, 5, 9, 6, 2); o(12, 6, 10, 4, 1); o(11, 7, 10, 2, 1); o(2, 3, 9, 1, 2); o(2, 12, 9, 1, 2); for (const [x, y] of [[6, 5], [8, 3], [7, 1]]) o(5, x, y, 2, 1); break;
    case TILE.OBSIDIAN:                            // a black glass shard
      snow(); o(0, 3, 14, 10, 1); o(1, 4, 5, 8, 9); o(0, 5, 3, 3, 2); o(2, 9, 7, 2, 7); o(14, 6, 6, 1, 6); o(4, 5, 4, 1, 2); break;
    case TILE.SNAG:                                // a mossy dead snag in the bog
      snow(); o(0, 4, 14, 8, 1); o(9, 6, 3, 4, 11); o(10, 7, 3, 1, 11); o(9, 3, 2, 3, 2); o(9, 10, 5, 3, 2); o(8, 5, 3, 2, 3); o(8, 9, 6, 2, 2); o(7, 6, 10, 1, 3); break;
    case TILE.LANTERNPOST:                         // a post with a hanging lantern
      snow(); o(0, 5, 14, 5, 1); o(9, 6, 2, 2, 13); o(9, 6, 2, 6, 1); o(1, 10, 3, 1, 2); o(0, 9, 5, 3, 4); o(13, 10, 6, 1, 2); o(12, 10, 7, 1, 1); break;
    case TILE.STATUE:                              // a weathered statue of a cloaked king
      snow(); o(2, 3, 13, 10, 3); o(3, 4, 12, 8, 1); o(3, 5, 5, 6, 7); o(4, 6, 5, 3, 7); o(3, 6, 1, 4, 4); o(4, 7, 2, 2, 1); o(8, 4, 8, 2, 3); o(13, 6, 1, 4, 1); break;
    case TILE.STALAGMITE:                          // a pale cone of dripstone
      snow(); o(0, 4, 14, 8, 1); o(3, 5, 8, 6, 6); o(3, 6, 4, 4, 4); o(4, 7, 1, 2, 3); o(4, 5, 9, 2, 5); o(15, 7, 2, 1, 1); o(3, 10, 11, 3, 3); break;
    case TILE.BEEHIVE:                             // a straw skep on a stump
      snow(); o(0, 4, 14, 8, 1); o(9, 5, 11, 6, 3); o(10, 4, 4, 8, 7); o(13, 5, 3, 6, 1); for (const y of [6, 8]) o(9, 4, y, 8, 1); o(0, 7, 9, 2, 1); o(13, 12, 3, 1, 1); o(13, 2, 6, 1, 1); break;
    case TILE.LOG:                                 // a fallen log
      snow(); o(0, 1, 12, 14, 1); o(9, 1, 7, 13, 5); o(10, 1, 7, 13, 1); o(10, 13, 7, 2, 5); o(9, 14, 8, 1, 3); o(8, 4, 6, 3, 1); o(1, 6, 9, 4, 1); break;
    default: o(0, 0, 0, 16, 16);
  }
}

// A prop on another ground: the ground tile, then the prop drawn on a clear cell with its snow recoloured for that ground.
let propCv = null;
function propOver(ctx, id, ox, bg) {
  drawTile(ctx, bg, ox);
  propCv ||= canvas(T, T);
  const p = propCv.getContext('2d', { willReadFrequently: true });
  p.clearRect(0, 0, T, T);
  drawTile(p, id, 0, -1);
  const [c6, c5] = CAP_OF(bg).map((c) => CAP_RGB[c]);
  const img = p.getImageData(0, 0, T, T), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const rgb = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    const to = rgb === CAP_RGB[6] ? c6 : rgb === CAP_RGB[5] && id !== TILE.PILLAR && id !== TILE.SARCO ? c5 : -1;
    if (to >= 0) { d[i] = to >> 16; d[i + 1] = (to >> 8) & 255; d[i + 2] = to & 255; }
  }
  p.putImageData(img, 0, 0);
  ctx.drawImage(propCv, ox, 0);
}

export function buildTiles(scene) {
  buildTileset(scene, 'tiles', null);
}

// One tileset texture. bg = null: the base set (snow under the props). Otherwise the props and the roof stand on tile `bg`.
// One tileset texture. bg = null: the base set (snow under the props). Otherwise the props and the roof stand on tile `bg`.
// combos (VX-21): extra tiles appended after TILE_COUNT, each a ground `b` with a ragged 2-4px fringe of ground `a` along the
// sides in `mask` (1 N, 2 E, 4 S, 8 W). They are only drawn, never stored in a map grid (art/tileset.js puts them on the layer).
export function buildTileset(scene, key, bg, combos = []) {
  const cv = canvas(T * (TILE_COUNT + combos.length), T);
  const ctx = cv.getContext('2d', { willReadFrequently: combos.length > 0 });
  for (let i = 0; i < TILE_COUNT; i++) drawTile(ctx, i, i * T, bg != null && PROP_TILES.includes(i) ? bg : null);
  if (combos.length) {
    const src = canvas(T, T), sx = src.getContext('2d', { willReadFrequently: true }), cache = new Map();
    const pix = (id) => { if (!cache.has(id)) { sx.clearRect(0, 0, T, T); drawTile(sx, id, 0); cache.set(id, sx.getImageData(0, 0, T, T).data.slice()); } return cache.get(id); };
    combos.forEach(({ b, a, mask, prop }, n) => {
      if (prop != null) { propOver(ctx, prop, (TILE_COUNT + n) * T, b); return; }       // a prop standing on this cell's own ground
      const ox = (TILE_COUNT + n) * T, pb = pix(b), pa = pix(a), out = ctx.createImageData(T, T), d = out.data;
      d.set(pb);
      const depth = (side, u) => 2 + Math.floor(hash(u, a * 4 + side, 11) * 3);
      for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
        const k = Math.max((mask & 1) ? depth(0, x) - y : -9, (mask & 2) ? depth(1, y) - (T - 1 - x) : -9, (mask & 4) ? depth(2, x) - (T - 1 - y) : -9, (mask & 8) ? depth(3, y) - x : -9);
        if (k <= 0 || (k === 1 && ((x + y) & 1))) continue;            // inside the band; its last row is dithered
        const q = (y * T + x) * 4; d[q] = pa[q]; d[q + 1] = pa[q + 1]; d[q + 2] = pa[q + 2]; d[q + 3] = 255;
      }
      ctx.putImageData(out, ox, 0);
    });
  }
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, cv);
  return key;
}

