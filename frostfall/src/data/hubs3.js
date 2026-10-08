// Round 6 (leftovers): three more hubs. Lantern Glade (Glasswood), Lanternfall (the Underdeep) and Saltmarket (the Frozen Coast's harbour city).
import { TILE } from '../config.js';
import { Grid } from './mapkit.js';

const hut = (g, x, y, w, door, roof = TILE.ROOF, wall = TILE.WOODWALL) => {
  g.rect(x, y, w, 2, roof); g.rect(x, y + 2, w, 2, wall);
  g.set(door, y + 3, TILE.DOOR); g.set(x + 1, y + 2, TILE.WINDOW);
  g.reserve(x - 1, y - 1, w + 2, 7);
};
const lamps = (g, pts, col) => { for (const [x, y] of pts) { g.set(x, y, TILE.BRAZIER); g.add({ t: 'glow', x, y, r: 36, col }); } };
const people = (g, list) => { for (const [id, x, y] of list) g.add({ t: 'npc', id, x, y }); };
// anything standing on a wall, tree or water tile gets a floor to stand on
const groundFix = (g, floor) => {
  for (const e of g.entities) if (['npc', 'pot', 'sign', 'prop', 'lore'].includes(e.t) && g.t[e.y]?.[e.x] !== undefined && [TILE.ROCK, TILE.FENCE, TILE.ROOF, TILE.WOODWALL, TILE.CRYSTAL, TILE.GLOWCAP, TILE.BLACKWATER, TILE.CAVERNPOOL, TILE.PINE, TILE.STONE, TILE.WRECK, TILE.PACKICE].includes(g.t[e.y][e.x])) g.t[e.y][e.x] = floor;
};

// ---------------------------------------------------------------------------------- Lantern Glade (Glasswood)
export function buildLanternGlade() {
  const W = 72, H = 52, g = new Grid(W, H, TILE.GLASSMOSS);
  g.noise(TILE.MOSS, 0.12, 321, TILE.GLASSMOSS);
  g.border(TILE.CRYSTAL, 4);
  for (let i = 0; i < 60; i++) g.set(4 + Math.floor((i * 37) % 64), 4 + Math.floor((i * 53) % 44), i % 3 ? TILE.PINE : TILE.CRYSTAL);
  g.rect(3, 25, 18, 3, TILE.GLADEPATH);
  g.rect(20, 14, 32, 24, TILE.GLADEPATH);
  g.rect(35, 5, 3, 10, TILE.GLADEPATH); g.rect(35, 38, 3, 9, TILE.GLADEPATH); g.rect(52, 24, 14, 3, TILE.GLADEPATH);
  for (const [x, y, w] of [[22, 8, 8], [42, 8, 8], [22, 40, 8], [42, 40, 8], [56, 14, 8], [56, 34, 8]]) hut(g, x, y, w, x + (w >> 1), TILE.ROOF, TILE.WOODWALL);
  lamps(g, [[20, 18], [20, 34], [51, 18], [51, 34], [10, 26], [18, 26], [60, 25], [36, 8], [36, 44]], 15);
  g.set(36, 22, TILE.FIRE); g.add({ t: 'fire', x: 36, y: 22, rest: true, id: 'gladefire' }); g.add({ t: 'glow', x: 36, y: 22, r: 70, col: 15 });
  g.add({ t: 'spawn', name: 'entry', x: 6, y: 26 });
  g.add({ t: 'exit', x: 3, y: 25, w: 1, h: 3, to: 'glasswood', spawn: 'lanternglade', fx: 'door' });
  g.add({ t: 'sign', x: 8, y: 24, text: ['LANTERN GLADE.', 'THE TREES HERE SING IN THE WIND. DO NOT SING BACK; THEY ARE VERY SENSITIVE.'] });
  people(g, [['glade_warden', 36, 19], ['glade_trader', 30, 28], ['glade_smith', 44, 28], ['glade_hunter', 24, 33], ['glade_herbalist', 48, 20], ['glade_child', 33, 31], ['glade_watch', 12, 26], ['glade_tailor', 40, 34], ['glade_inn', 26, 13], ['glade_map', 46, 12], ['glade_sage', 40, 22]]);
  for (const [x, y, skin] of [[24, 20, 'barrel'], [46, 22, 'pot'], [40, 33, 'barrel'], [30, 20, 'pot'], [54, 30, 'barrel']]) g.add({ t: 'pot', x, y, skin });
  g.add({ t: 'prop', tex: 'anvil', x: 46, y: 31 });
  g.add({ t: 'lore', id: 'glade', tex: 'book', x: 34, y: 31 });
  for (let y = 5; y < H - 5; y++) for (let x = 5; x < W - 5; x++) g.res[y][x] = true;
  groundFix(g, TILE.GLADEPATH);
  return g.out();
}

// ---------------------------------------------------------------------------------- Lanternfall (the Underdeep)
export function buildLanternfall() {
  const W = 72, H = 52, g = new Grid(W, H, TILE.DEEPSTONE);
  g.noise(TILE.CFLOOR2, 0.14, 331, TILE.DEEPSTONE);
  g.border(TILE.ROCK, 4);
  for (let i = 0; i < 50; i++) g.set(4 + Math.floor((i * 37) % 64), 4 + Math.floor((i * 53) % 44), i % 4 ? TILE.ROCK : TILE.GLOWCAP);
  // the underground lake to the south-east, with the ferry jetty
  g.rect(44, 36, 24, 11, TILE.CAVERNPOOL); g.rect(40, 34, 5, 2, TILE.BOARDWALK); g.rect(38, 30, 3, 6, TILE.BOARDWALK);
  g.rect(3, 25, 18, 3, TILE.CFLOOR2);
  g.rect(20, 14, 28, 22, TILE.CFLOOR2);
  g.rect(35, 5, 3, 10, TILE.CFLOOR2); g.rect(52, 24, 14, 3, TILE.CFLOOR2);
  for (const [x, y, w] of [[22, 8, 8], [42, 8, 8], [22, 40, 8], [56, 14, 8], [56, 34, 8]]) hut(g, x, y, w, x + (w >> 1), TILE.ROOF, TILE.STONE);
  lamps(g, [[20, 18], [20, 34], [47, 18], [47, 34], [10, 26], [18, 26], [60, 25], [36, 8]], 12);
  g.set(34, 24, TILE.FIRE); g.add({ t: 'fire', x: 34, y: 24, rest: true, id: 'fallfire' }); g.add({ t: 'glow', x: 34, y: 24, r: 70, col: 12 });
  g.add({ t: 'spawn', name: 'entry', x: 6, y: 26 });
  g.add({ t: 'exit', x: 3, y: 25, w: 1, h: 3, to: 'underdeep', spawn: 'lanternfall', fx: 'door' });
  g.add({ t: 'sign', x: 8, y: 24, text: ['LANTERNFALL.', 'THE LAST LANTERN OF THE DELVERS. IT HAS BURNED SINCE BEFORE THEY BUILT THE FIRST TUNNEL ABOVE.'] });
  g.add({ t: 'sign', x: 39, y: 29, text: ['THE UNDERGROUND FERRY.', 'ORM TAKES PASSENGERS ACROSS THE BLACK WATER AND UP THE LONG STAIR TO EMBERHOLD. TWENTY GOLD, OR A GOOD STORY.'] });
  people(g, [['fall_foreman', 36, 20], ['fall_trader', 30, 28], ['fall_smith', 44, 28], ['fall_fungalist', 24, 33], ['fall_scout', 48, 20], ['fall_child', 32, 31], ['fall_watch', 12, 26], ['fall_tailor', 30, 32], ['fall_inn', 26, 13], ['fall_map', 46, 12], ['fall_ferry', 39, 31]]);
  for (const [x, y, skin] of [[24, 20, 'barrel'], [46, 22, 'pot'], [40, 33, 'barrel'], [30, 20, 'pot'], [54, 28, 'barrel']]) g.add({ t: 'pot', x, y, skin });
  g.add({ t: 'prop', tex: 'anvil', x: 46, y: 31 });
  g.add({ t: 'lore', id: 'lanternfall', tex: 'book', x: 34, y: 31 });
  for (let y = 5; y < H - 5; y++) for (let x = 5; x < W - 5; x++) g.res[y][x] = true;
  groundFix(g, TILE.CFLOOR2);
  return g.out();
}

// ---------------------------------------------------------------------------------- Saltmarket (the Frozen Coast)
export function buildSaltmarket() {
  const W = 84, H = 60, g = new Grid(W, H, TILE.SHINGLE);
  g.noise(TILE.STUMP, 0.0, 341, TILE.SHINGLE);
  g.border(TILE.ROCK, 4);
  // the harbour: open water to the south and east, quays out over it, and moored ships
  g.rect(4, 44, 76, 12, TILE.PACKICE); g.rect(60, 4, 20, 40, TILE.PACKICE);
  g.rect(8, 40, 8, 6, TILE.BOARDWALK); g.rect(30, 40, 8, 8, TILE.BOARDWALK); g.rect(52, 40, 8, 6, TILE.BOARDWALK); g.rect(56, 24, 8, 3, TILE.BOARDWALK);
  for (const [x, y, w, h] of [[10, 47, 4, 2], [32, 49, 5, 2], [54, 47, 4, 2], [66, 26, 2, 4], [70, 14, 2, 4]]) { g.rect(x, y, w, h, TILE.WRECK, false); }
  // streets
  g.rect(3, 25, 20, 3, TILE.PATH); g.rect(22, 12, 34, 28, TILE.PATH); g.rect(37, 5, 3, 8, TILE.PATH);
  g.rect(14, 28, 3, 12, TILE.PATH); g.rect(46, 38, 3, 4, TILE.PATH);
  // houses, guild halls and warehouses (stone below, shingle roofs)
  for (const [x, y, w] of [[24, 6, 9], [44, 6, 9], [24, 14, 0], [8, 12, 8], [8, 33, 8], [20, 33, 8], [52, 30, 6]]) if (w) hut(g, x, y, w, x + (w >> 1), TILE.ROOF, TILE.STONE);
  // the market square, a fountain of salt-stone and lanterns
  g.rect(30, 22, 8, 6, TILE.MARBLE); g.set(33, 24, TILE.PILLAR); g.set(34, 25, TILE.PILLAR);
  lamps(g, [[22, 18], [22, 34], [55, 18], [55, 34], [10, 26], [18, 26], [40, 12], [40, 36], [30, 26], [38, 26]], 13);
  g.set(37, 30, TILE.FIRE); g.add({ t: 'fire', x: 37, y: 30, rest: true, id: 'saltfire' }); g.add({ t: 'glow', x: 37, y: 30, r: 70, col: 12 });
  g.add({ t: 'spawn', name: 'entry', x: 6, y: 26 });
  g.add({ t: 'exit', x: 3, y: 25, w: 1, h: 3, to: 'coast', spawn: 'saltgate', fx: 'door' });
  g.add({ t: 'sign', x: 8, y: 24, text: ['SALTMARKET.', 'THE COAST\'S ONLY HARBOUR THAT THE ICE LETS IN. GUILDS TO THE NORTH, DOCKS TO THE SOUTH, AND WHAT THE GUARDS DO NOT SEE TO THE EAST.'] });
  g.add({ t: 'sign', x: 55, y: 28, text: ['THE SMUGGLERS\' STAIRS.', 'DOWN TO SEAWEED COVE. NOBODY LIVES THERE. A LOT OF PEOPLE WORK THERE.'] });
  people(g, [['salt_harbourmaster', 32, 18], ['salt_trader', 28, 30], ['salt_smith', 46, 28], ['salt_tailor', 18, 30], ['salt_guildmaster', 36, 14], ['salt_smuggler', 52, 27], ['salt_sailor', 34, 42], ['salt_inn', 26, 9], ['salt_map', 48, 10], ['salt_child', 40, 28], ['salt_watch', 12, 26], ['salt_bard', 38, 20]]);
  for (const [x, y, skin] of [[26, 18, 'barrel'], [50, 22, 'pot'], [42, 34, 'barrel'], [34, 12, 'pot'], [44, 40, 'barrel'], [14, 38, 'barrel']]) g.add({ t: 'pot', x, y, skin });
  g.add({ t: 'prop', tex: 'anvil', x: 47, y: 30 });
  g.add({ t: 'lore', id: 'saltmarket', tex: 'book', x: 36, y: 32 });
  for (let y = 5; y < H - 5; y++) for (let x = 5; x < W - 5; x++) g.res[y][x] = true;
  groundFix(g, TILE.PATH);
  return g.out();
}
