// Core constants: resolution, tile size, the 16-colour snowy palette.
export const W = 320;
export const H = 180;
export const T = 16;
export const VERSION = 'V1.0';
// build id stamped by vite.config.js (git hash + date), 'dev' while developing
export const BUILD = typeof __BUILD__ !== 'undefined' ? __BUILD__ : 'dev'; // eslint-disable-line no-undef

// 16-colour palette. Every pixel in the game comes from here.
export const PAL = [
  '#0b0e1a', // 0  night
  '#1c2338', // 1  deep navy
  '#2e3a5c', // 2  slate
  '#4a5c86', // 3  steel
  '#7b8fb5', // 4  frost
  '#b4c7e0', // 5  pale ice (snow)
  '#eaf2f8', // 6  snow white
  '#2a4a3a', // 7  pine dark
  '#3f7050', // 8  pine
  '#6a4a38', // 9  wood
  '#a07850', // 10 tan / light wood
  '#c8383c', // 11 blood red
  '#f08a30', // 12 fire orange
  '#f4d460', // 13 gold
  '#8a5aa8', // 14 arcane purple
  '#5cc8d8', // 15 frost cyan
];
export const C = PAL.map((h) => parseInt(h.slice(1), 16));

// Tile ids in the generated tileset (see art/sprites.js). CH11: ids are never reused and never renumbered (worlds and
// saves store them). 0-74 are the core tiles. Every later id comes from its agent's reserved block in TILE_BLOCKS: add your
// tiles on your own block's line below, take the next free id of your block, and add its picture to drawTile.
// test/unit/foundation.mjs checks that ids are unique, inside a block, < 256, and that SOLID_TILES only names real tiles.
export const TILE_BLOCKS = {
  core: [0, 74],
  spare_low: [75, 99],        // unassigned: ask the integrator
  A_art: [100, 119],
  W_world: [120, 139],
  C_combat: [140, 149],
  H_hud: [150, 154],
  E_economy: [155, 159],
  S_story: [160, 164],
  spare: [165, 255],          // unassigned: ask the integrator
};
export const TILE = {
  SNOW: 0, SNOW2: 1, ICE: 2, STONE: 3, PINE: 4, PATH: 5, WOODFLOOR: 6,
  WOODWALL: 7, ROOF: 8, CFLOOR: 9, CWALL: 10, ROCK: 11, PILLAR: 12,
  BRAZIER: 13, STAIRS: 14, FENCE: 15, RUG: 16, DOOR: 17, FIRE: 18,
  WINDOW: 19, GRAVE: 20, SARCO: 21,
  SNOW3: 22, SNOW4: 23, PATH2: 24, CFLOOR2: 25, CWALL2: 26, DEADTREE: 27, STUMP: 28, ICE2: 29, TUFT: 30,
  ASH: 31, BASALT: 32, LAVA: 33, ICESHELF: 34, PACKICE: 35, SHINGLE: 36, WRECK: 37, MARBLE: 38, RUINWALL: 39, MOSS: 40,
  BOG: 41, BLACKWATER: 42, BOARDWALK: 43, HEATH: 44, SLATE: 45, BOGTREE: 46, BOGREED: 47, HEATHROCK: 48,
  GLASSMOSS: 49, CRYSTAL: 50, GLADEPATH: 51, DEEPSTONE: 52, GLOWCAP: 53, CAVERNPOOL: 54,
  // the Embergreen Vale (green, warm) and the Sunscorch Reach (sand and red stone)
  MEADOW: 55, FLOWERS: 56, BIRCH: 57, POND: 58, HEARTROOT: 59,
  SAND: 60, DUNE: 61, SANDSTONE: 62, CACTUS: 63, OASIS: 64, GLYPH: 65, SANDRUIN: 66,
  // scatter terrain for the older regions: patches of snowdrift and frostbloom, boulders, ember blooms, lily pads, mossy marble, glass flowers, spores
  SNOWDRIFT: 67, FROSTBLOOM: 68, BOULDER: 69, EMBERBLOOM: 70, LILYPAD: 71, MARBLEMOSS: 72, GLASSBLOOM: 73, SPORES: 74,

  // A (art) 100-119: look-alike variants of trees and rocks (art/tileset.js swaps some cells to them when a map is drawn, so
  // forest edges stop repeating; the map grid keeps the original id), then scatter props for the world to place (VX-16, VX-22)
  PINE_B: 100, PINE_C: 101, BIRCH_B: 102, DEADTREE_B: 103, BOGTREE_B: 104, CRYSTAL_B: 105, CACTUS_B: 106, ROCK_B: 107, GLOWCAP_B: 108,
  BONES: 109, POTS: 110, PALM: 111, STEAMVENT: 112, OBSIDIAN: 113, SNAG: 114, LANTERNPOST: 115, STATUE: 116, STALAGMITE: 117, BEEHIVE: 118, LOG: 119,

  // W (world) 120-139:

  // C (combat) 140-149:

  // H (hud) 150-154:

  // E (economy) 155-159:

  // S (story) 160-164:

};
export const SOLID_TILES = [
  TILE.STONE, TILE.PINE, TILE.WOODWALL, TILE.ROOF, TILE.CWALL, TILE.ROCK,
  TILE.PILLAR, TILE.BRAZIER, TILE.FENCE, TILE.DOOR, TILE.FIRE, TILE.WINDOW,
  TILE.GRAVE, TILE.SARCO, TILE.CWALL2, TILE.DEADTREE, TILE.STUMP,
  TILE.BASALT, TILE.LAVA, TILE.PACKICE, TILE.WRECK, TILE.RUINWALL, TILE.BLACKWATER, TILE.BOGTREE, TILE.BOGREED, TILE.HEATHROCK, TILE.CRYSTAL, TILE.GLOWCAP, TILE.CAVERNPOOL,
  TILE.BOULDER, TILE.BIRCH, TILE.POND, TILE.HEARTROOT, TILE.SANDSTONE, TILE.CACTUS, TILE.OASIS, TILE.SANDRUIN,
  // solid tiles of the reserved blocks, each agent on its own line:
  // A:
  TILE.PINE_B, TILE.PINE_C, TILE.BIRCH_B, TILE.DEADTREE_B, TILE.BOGTREE_B, TILE.CRYSTAL_B, TILE.CACTUS_B, TILE.ROCK_B, TILE.GLOWCAP_B,
  TILE.POTS, TILE.PALM, TILE.OBSIDIAN, TILE.SNAG, TILE.LANTERNPOST, TILE.STATUE, TILE.STALAGMITE, TILE.BEEHIVE, TILE.LOG,

  // W:

  // C:

  // H:

  // E:

  // S:

];
// one past the highest id (unused ids inside a block draw as plain dark tiles)
export const TILE_COUNT = Math.max(...Object.values(TILE)) + 1;

// Keyboard actions -> KeyboardEvent.code
export const BINDINGS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  roll: ['Space'],
  sword: ['KeyJ', 'Mouse0'],
  bow: ['KeyK', 'Mouse2'],
  spell: ['KeyL', 'Mouse1'],
  swap: ['KeyQ', 'Tab', 'WheelUp', 'WheelDown'],
  shout: ['KeyR'],
  shoutswap: ['KeyG'],
  lockon: ['KeyT'],
  ammo: ['KeyV'],
  heavy: ['KeyU'],
  block: ['KeyF'],
  sneak: ['KeyC', 'ShiftLeft'],
  interact: ['KeyE', 'Enter'],
  spell1: ['Digit4'],
  spell2: ['Digit5'],
  spell3: ['Digit6'],
  spell4: ['Digit7'],
  spell5: ['Digit8'],
  spell6: ['Digit9'],
  spell7: ['Digit0'],
  spell8: ['Minus'],
  potion1: ['Digit1'],
  potion2: ['Digit2'],
  potion3: ['Digit3'],
  inventory: ['KeyI'],
  journal: ['KeyO'],
  map: ['KeyM'],
  pause: ['Escape', 'KeyP'],
};
