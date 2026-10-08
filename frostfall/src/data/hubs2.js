// The two hubs of Round 6: Reedwick (stilt village over black water) and Skarn Hold (a clan ring under the storm).
import { TILE } from '../config.js';
import { Grid } from './mapkit.js';

export const REEDWICK = { gate: { x: 5, y: 26 } };
export const SKARN = { gate: { x: 5, y: 26 } };

const hut = (g, x, y, w, door) => {          // a stilt hut: roof, wall, a door facing the boards
  g.rect(x, y, w, 2, TILE.ROOF); g.rect(x, y + 2, w, 2, TILE.WOODWALL);
  g.set(door, y + 3, TILE.DOOR); g.set(x + 1, y + 2, TILE.WINDOW);
  g.reserve(x - 1, y - 1, w + 2, 7);
};

export function buildReedwick() {
  const W = 72, H = 52, g = new Grid(W, H, TILE.BLACKWATER);
  g.noise(TILE.BOG, 0.04, 301, TILE.BLACKWATER);
  // boards: the gate causeway, the plaza, spurs to each hut and a long jetty
  g.rect(3, 25, 18, 3, TILE.BOARDWALK);
  g.rect(20, 14, 32, 24, TILE.BOARDWALK);
  g.rect(35, 5, 3, 10, TILE.BOARDWALK); g.rect(35, 38, 3, 9, TILE.BOARDWALK);
  g.rect(52, 24, 16, 3, TILE.BOARDWALK); g.rect(8, 30, 3, 12, TILE.BOARDWALK); g.rect(8, 40, 12, 3, TILE.BOARDWALK);
  // huts around the plaza
  hut(g, 22, 8, 9, 26); hut(g, 42, 8, 9, 46); hut(g, 24, 41, 9, 28); hut(g, 44, 41, 9, 48); hut(g, 56, 14, 8, 59); hut(g, 56, 33, 8, 59);
  g.rect(26, 12, 2, 3, TILE.BOARDWALK); g.rect(46, 12, 2, 3, TILE.BOARDWALK); g.rect(28, 40, 2, 2, TILE.BOARDWALK); g.rect(48, 40, 2, 2, TILE.BOARDWALK);
  g.rect(59, 18, 2, 8, TILE.BOARDWALK); g.rect(59, 27, 2, 7, TILE.BOARDWALK);
  // the well and a few crates; lantern poles along the boards
  g.set(36, 26, TILE.BRAZIER); g.set(37, 26, TILE.BRAZIER);
  for (const [x, y] of [[20, 18], [20, 34], [51, 18], [51, 34], [10, 26], [18, 26], [60, 25], [66, 25], [36, 8], [36, 44]]) { g.set(x, y, TILE.BRAZIER); g.add({ t: 'glow', x, y, r: 36, col: 8 }); }
  g.add({ t: 'fire', x: 36, y: 22, rest: true, id: 'reedfire' }); g.set(36, 22, TILE.FIRE); g.add({ t: 'glow', x: 36, y: 22, r: 66, col: 12 });
  g.add({ t: 'spawn', name: 'entry', x: 6, y: 26 });
  g.add({ t: 'exit', x: 3, y: 25, w: 1, h: 3, to: 'fens', spawn: 'reedwick', fx: 'door' });
  g.add({ t: 'sign', x: 8, y: 25, text: ['REEDWICK.', 'KEEP TO THE BOARDS. WEAPONS SHEATHED AFTER DUSK. THE WATER LISTENS.'] });
  g.add({ t: 'sign', x: 64, y: 26, text: ['THE LONG JETTY.', 'THE FERRYMAN SAYS HE WILL TAKE YOU ACROSS THE FEN FOR A PRICE. HE HAS NOT BEEN SEEN SINCE THE FLOOD.'] });
  // the people of Reedwick
  for (const [id, x, y] of [['wick_elder', 36, 20], ['wick_trader', 30, 28], ['wick_smith', 44, 28], ['wick_hunter', 24, 33], ['wick_herbalist', 48, 20], ['wick_fisher', 63, 25], ['wick_child', 32, 33], ['wick_watch', 12, 26], ['wick_inn', 26, 13], ['wick_map', 46, 13]]) g.add({ t: 'npc', id, x, y });
  for (const [x, y, skin] of [[24, 20, 'barrel'], [46, 22, 'pot'], [40, 33, 'barrel'], [30, 20, 'pot'], [54, 25, 'barrel']]) g.add({ t: 'pot', x, y, skin });
  g.add({ t: 'prop', tex: 'anvil', x: 46, y: 31 });
  g.add({ t: 'lore', id: 'reedwick', tex: 'book', x: 34, y: 30 });
  for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) g.res[y][x] = true;
  return g.out();
}

export function buildSkarnhold() {
  const W = 72, H = 52, g = new Grid(W, H, TILE.HEATH);
  g.noise(TILE.SLATE, 0.18, 311, TILE.HEATH);
  g.border(TILE.ROCK, 4);
  for (let i = 0; i < 70; i++) g.set(4 + Math.floor((i * 37) % 64), 4 + Math.floor((i * 53) % 44), TILE.ROCK);   // boulders
  // the gate path and the ring of hearths
  g.rect(3, 25, 18, 3, TILE.PATH);
  g.rect(20, 14, 32, 24, TILE.SLATE);
  g.rect(35, 5, 3, 10, TILE.PATH); g.rect(35, 38, 3, 9, TILE.PATH); g.rect(52, 24, 14, 3, TILE.PATH);
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; g.set(36 + Math.round(Math.cos(a) * 9), 26 + Math.round(Math.sin(a) * 6), TILE.FENCE); }
  g.rect(35, 25, 3, 3, TILE.SLATE); g.set(36, 26, TILE.FIRE);
  // clan tents (roofs) around the ring
  for (const [x, y, w] of [[22, 8, 8], [42, 8, 8], [22, 40, 8], [42, 40, 8], [56, 14, 8], [56, 34, 8]]) { g.rect(x, y, w, 3, TILE.ROOF); g.rect(x, y + 3, w, 1, TILE.WOODWALL); g.set(x + (w >> 1), y + 3, TILE.DOOR); g.reserve(x - 1, y - 1, w + 2, 7); }
  for (const [x, y] of [[20, 18], [20, 34], [51, 18], [51, 34], [10, 26], [18, 26], [60, 25], [36, 8], [36, 44]]) { g.set(x, y, TILE.BRAZIER); g.add({ t: 'glow', x, y, r: 36, col: 12 }); }
  g.add({ t: 'fire', x: 36, y: 26, rest: true, id: 'skarnfire' }); g.add({ t: 'glow', x: 36, y: 26, r: 72, col: 12 });
  g.add({ t: 'spawn', name: 'entry', x: 6, y: 26 });
  g.add({ t: 'exit', x: 3, y: 25, w: 1, h: 3, to: 'highlands', spawn: 'skarnhold', fx: 'door' });
  g.add({ t: 'sign', x: 8, y: 24, text: ['SKARN HOLD.', 'THE CLANS TAKE NO TOLL. THE CLANS ALSO TAKE NO NONSENSE.'] });
  for (const [id, x, y] of [['skarn_chief', 36, 21], ['skarn_trader', 30, 29], ['skarn_smith', 44, 29], ['skarn_shaman', 30, 22], ['skarn_herder', 52, 28], ['skarn_scout', 12, 26], ['skarn_child', 33, 31], ['skarn_bard', 40, 22], ['skarn_inn', 26, 13], ['skarn_map', 46, 13]]) g.add({ t: 'npc', id, x, y });
  for (const [x, y, skin] of [[24, 20, 'barrel'], [46, 22, 'pot'], [40, 33, 'barrel'], [30, 20, 'pot'], [54, 30, 'barrel']]) g.add({ t: 'pot', x, y, skin });
  g.add({ t: 'prop', tex: 'anvil', x: 46, y: 31 });
  g.add({ t: 'lore', id: 'skarnhold', tex: 'book', x: 34, y: 31 });
  for (let y = 5; y < H - 5; y++) for (let x = 5; x < W - 5; x++) g.res[y][x] = true;
  for (const e of g.entities) if (['npc', 'pot', 'sign', 'prop', 'lore'].includes(e.t) && g.t[e.y]?.[e.x] !== undefined && [TILE.ROCK, TILE.FENCE, TILE.ROOF, TILE.WOODWALL].includes(g.t[e.y][e.x])) g.t[e.y][e.x] = TILE.SLATE;
  return g.out();
}
