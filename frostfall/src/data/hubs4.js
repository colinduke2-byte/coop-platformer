// The hubs of the Embergreen Vale (Greenhollow) and the Sunscorch Reach (Amberwell). Same layout recipe as hubs3.js.
import { TILE } from '../config.js';
import { Grid } from './mapkit.js';

const hut = (g, x, y, w, door, roof, wall) => {
  g.rect(x, y, w, 2, roof); g.rect(x, y + 2, w, 2, wall);
  g.set(door, y + 3, TILE.DOOR); g.set(x + 1, y + 2, TILE.WINDOW);
  g.reserve(x - 1, y - 1, w + 2, 7);
};
const lamps = (g, pts, col) => { for (const [x, y] of pts) { g.set(x, y, TILE.BRAZIER); g.add({ t: 'glow', x, y, r: 36, col }); } };
const people = (g, list) => { for (const [id, x, y] of list) g.add({ t: 'npc', id, x, y }); };
const BLOCK = [TILE.ROCK, TILE.FENCE, TILE.ROOF, TILE.WOODWALL, TILE.CRYSTAL, TILE.GLOWCAP, TILE.BIRCH, TILE.POND, TILE.HEARTROOT, TILE.SANDSTONE, TILE.CACTUS, TILE.OASIS, TILE.SANDRUIN, TILE.BRAZIER, TILE.PINE];
const groundFix = (g, floor) => {
  for (const e of g.entities) if (['npc', 'pot', 'sign', 'prop', 'lore'].includes(e.t) && g.t[e.y]?.[e.x] !== undefined && BLOCK.includes(g.t[e.y][e.x])) g.t[e.y][e.x] = floor;
};

// ---------------------------------------------------------------------------------- Greenhollow (the Embergreen Vale)
export function buildGreenhollow() {
  const W = 72, H = 52, g = new Grid(W, H, TILE.MEADOW);
  g.noise(TILE.FLOWERS, 0.14, 351, TILE.MEADOW);
  g.border(TILE.BIRCH, 4);
  for (let i = 0; i < 60; i++) g.set(4 + Math.floor((i * 37) % 64), 4 + Math.floor((i * 53) % 44), TILE.BIRCH);
  g.rect(62, 30, 6, 5, TILE.POND);
  g.rect(3, 25, 18, 3, TILE.PATH);
  g.rect(20, 14, 32, 24, TILE.PATH);
  g.rect(35, 5, 3, 10, TILE.PATH); g.rect(35, 38, 3, 9, TILE.PATH); g.rect(52, 24, 14, 3, TILE.PATH);
  for (const [x, y, w] of [[22, 8, 8], [42, 8, 8], [22, 40, 8], [42, 40, 8], [56, 14, 8], [56, 34, 6]]) hut(g, x, y, w, x + (w >> 1), TILE.ROOF, TILE.WOODWALL);
  lamps(g, [[20, 18], [20, 34], [51, 18], [51, 34], [10, 26], [18, 26], [60, 25], [36, 8], [36, 44]], 13);
  g.set(36, 22, TILE.FIRE); g.add({ t: 'fire', x: 36, y: 22, rest: true, id: 'hollowfire' }); g.add({ t: 'glow', x: 36, y: 22, r: 70, col: 13 });
  g.set(36, 27, TILE.HEARTROOT); g.add({ t: 'glow', x: 36, y: 27, r: 40, col: 13 });
  g.add({ t: 'spawn', name: 'entry', x: 6, y: 26 });
  g.add({ t: 'exit', x: 3, y: 25, w: 1, h: 3, to: 'vale', spawn: 'greenhollow', fx: 'door' });
  g.add({ t: 'sign', x: 8, y: 24, text: ['GREENHOLLOW.', 'PLEASE WIPE YOUR BOOTS. THE GRASS HAS FEELINGS.'] });
  people(g, [['vale_elder', 36, 19], ['vale_trader', 30, 28], ['vale_smith', 44, 28], ['vale_hunter', 24, 33], ['vale_herbalist', 48, 20], ['vale_child', 33, 31], ['vale_watch', 12, 26], ['vale_inn', 28, 19], ['vale_map', 44, 19], ['vale_beekeeper', 26, 26], ['vale_bard', 40, 31], ['vale_gardener', 50, 28]]);
  for (const [x, y, skin] of [[24, 20, 'barrel'], [46, 22, 'pot'], [40, 34, 'barrel'], [30, 20, 'pot'], [54, 30, 'barrel']]) g.add({ t: 'pot', x, y, skin });
  g.add({ t: 'prop', tex: 'anvil', x: 46, y: 31 });
  g.add({ t: 'lore', id: 'greenhollow', tex: 'book', x: 34, y: 31 });
  for (let y = 5; y < H - 5; y++) for (let x = 5; x < W - 5; x++) g.res[y][x] = true;
  groundFix(g, TILE.PATH);
  return g.out();
}

// ---------------------------------------------------------------------------------- Amberwell (the Sunscorch Reach)
export function buildAmberwell() {
  const W = 72, H = 52, g = new Grid(W, H, TILE.SAND);
  g.noise(TILE.DUNE, 0.16, 361, TILE.SAND);
  g.border(TILE.SANDSTONE, 4);
  for (let i = 0; i < 50; i++) g.set(4 + Math.floor((i * 37) % 64), 4 + Math.floor((i * 53) % 44), i % 3 ? TILE.CACTUS : TILE.SANDSTONE);
  g.rect(3, 25, 18, 3, TILE.GLYPH);
  g.rect(20, 14, 32, 24, TILE.GLYPH);
  g.rect(35, 5, 3, 10, TILE.GLYPH); g.rect(35, 38, 3, 9, TILE.GLYPH); g.rect(52, 24, 14, 3, TILE.GLYPH);
  g.rect(33, 27, 6, 3, TILE.OASIS);                                   // the well that never runs dry
  for (const [x, y, w] of [[22, 8, 8], [42, 8, 8], [22, 40, 8], [42, 40, 8], [56, 14, 8], [56, 34, 6]]) hut(g, x, y, w, x + (w >> 1), TILE.ROOF, TILE.SANDRUIN);
  lamps(g, [[20, 18], [20, 34], [51, 18], [51, 34], [10, 26], [18, 26], [60, 25], [36, 8], [36, 44]], 12);
  g.set(36, 22, TILE.FIRE); g.add({ t: 'fire', x: 36, y: 22, rest: true, id: 'amberfire' }); g.add({ t: 'glow', x: 36, y: 22, r: 70, col: 12 });
  g.add({ t: 'glow', x: 36, y: 28, r: 40, col: 15 });
  g.add({ t: 'spawn', name: 'entry', x: 6, y: 26 });
  g.add({ t: 'exit', x: 3, y: 25, w: 1, h: 3, to: 'sunscorch', spawn: 'amberwell', fx: 'door' });
  g.add({ t: 'sign', x: 8, y: 24, text: ['AMBERWELL.', 'THE WELL IS FREE TO ALL. THE WATER-SELLERS HAVE LEARNED TO LIVE WITH THIS.'] });
  people(g, [['dune_sheikh', 36, 19], ['dune_trader', 30, 25], ['dune_smith', 44, 28], ['dune_hunter', 24, 33], ['dune_scholar', 48, 20], ['dune_child', 40, 31], ['dune_guard', 12, 26], ['dune_inn', 28, 19], ['dune_map', 44, 19], ['dune_thief', 26, 29], ['dune_bard', 33, 32], ['dune_caravan', 50, 28]]);
  for (const [x, y, skin] of [[24, 20, 'barrel'], [46, 22, 'pot'], [40, 35, 'barrel'], [30, 20, 'pot'], [54, 30, 'barrel']]) g.add({ t: 'pot', x, y, skin });
  g.add({ t: 'prop', tex: 'anvil', x: 46, y: 31 });
  g.add({ t: 'lore', id: 'amberwell', tex: 'book', x: 34, y: 34 });
  for (let y = 5; y < H - 5; y++) for (let x = 5; x < W - 5; x++) g.res[y][x] = true;
  groundFix(g, TILE.GLYPH);
  return g.out();
}
