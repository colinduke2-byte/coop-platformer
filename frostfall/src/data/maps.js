// Maps are built in code. Entities use tile coordinates (x, y = tile cell).
import { TILE } from '../config.js';
import { Grid } from './mapkit.js';
import { hash } from '../util.js';
import { S } from '../systems/state.js';
import { buildReach } from '../world/worldgen.js';
import { buildBarrow } from '../world/barrowgen.js';

function house(g, x, y, w, rows, doorX, winXs) {
  // roof rows then 2 wall rows; door + windows on the top wall row
  g.rect(x, y, w, rows, TILE.ROOF);
  g.rect(x, y + rows, w, 2, TILE.WOODWALL);
  for (const wx of winXs) g.set(wx, y + rows, TILE.WINDOW);
  g.set(doorX, y + rows + 1, TILE.DOOR);
  g.reserve(x - 1, y - 1, w + 2, rows + 4);
}

function buildVillage() {
  const g = new Grid(40, 26, TILE.SNOW);
  g.noise(TILE.SNOW2, 0.22, 5, TILE.SNOW);
  g.dress('snow');
  g.border(TILE.PINE, 2);
  // plaza + roads
  g.rect(15, 11, 11, 6, TILE.PATH);
  g.rect(18, 8, 3, 3, TILE.PATH);
  g.rect(26, 13, 14, 2, TILE.PATH);
  g.rect(7, 10, 8, 2, TILE.PATH);
  g.rect(30, 9, 3, 4, TILE.PATH);
  g.rect(32, 12, 2, 2, TILE.PATH);
  g.rect(24, 8, 6, 1, TILE.PATH);
  g.set(19, 13, TILE.FIRE);
  // elder's hall
  house(g, 14, 3, 11, 3, 19, [16, 22]);
  // hunter's lodge
  house(g, 4, 5, 6, 3, 7, [5, 9]);
  // cottage for sale
  house(g, 22, 17, 5, 2, 24, [23, 25]);
  // alchemist's shop and stall
  house(g, 29, 4, 7, 3, 32, [30, 34]);
  g.rect(30, 10, 2, 1, TILE.FENCE); g.rect(33, 10, 2, 1, TILE.FENCE);
  // fenced graveyard (bottom left)
  g.rect(4, 18, 9, 1, TILE.FENCE); g.rect(4, 18, 1, 5, TILE.FENCE); g.rect(12, 18, 1, 5, TILE.FENCE);
  g.rect(5, 19, 7, 4, TILE.SNOW2);
  g.set(6, 20, TILE.GRAVE); g.set(8, 20, TILE.GRAVE); g.set(10, 20, TILE.GRAVE); g.set(7, 22, TILE.GRAVE);
  g.set(8, 18, TILE.SNOW);
  // frozen pond (walkable ice)
  g.rect(27, 17, 8, 5, TILE.ICE);
  g.rect(18, 19, 4, 1, TILE.PATH);
  g.rect(36, 12, 4, 3, TILE.PATH);
  // clear reservation outside the bulk of building zones so trees scatter in the margins
  for (let y = 2; y < 24; y++) for (let x = 2; x < 38; x++) g.res[y][x] = ![TILE.SNOW, TILE.SNOW2, TILE.SNOW3, TILE.SNOW4, TILE.TUFT].includes(g.t[y][x]);
  for (let y = 9; y <= 18; y++) for (let x = 14; x <= 26; x++) g.res[y][x] = true;
  for (let x = 24; x < 38; x++) { g.res[12][x] = true; g.res[13][x] = true; g.res[14][x] = true; g.res[15][x] = true; }
  for (const [x, y] of [[36, 11], [34, 12], [24, 19], [16, 8], [22, 8], [4, 10], [10, 9], [31, 11], [34, 10], [13, 16], [26, 16], [27, 10], [24, 9], [10, 16], [11, 16], [10, 12], [13, 20], [21, 21]]) g.clear(x, y);
  g.scatter(TILE.PINE, 34, 3);
  g.scatter(TILE.STUMP, 4, 8);
  g.scatter(TILE.ROCK, 8, 4);
  g.add({ t: 'npc', id: 'sigrid', x: 20, y: 9 });
  g.add({ t: 'board', x: 25, y: 13 });
  g.res[13][25] = true; g.t[13][25] = TILE.PATH;
  g.add({ t: 'npc', id: 'bjorn', x: 7, y: 11 });
  g.add({ t: 'npc', id: 'mirra', x: 32, y: 10 });
  g.dress('late');
  g.add({ t: 'door', x: 19, y: 7, to: 'hall', spawn: 'in', label: "E: ENTER HALL" });
  g.add({ t: 'door', x: 7, y: 9, to: 'lodge', spawn: 'in', label: 'E: ENTER LODGE' });
  g.add({ t: 'door', x: 32, y: 8, to: 'shop', spawn: 'in', label: 'E: ENTER SHOP' });
  g.add({ t: 'door', x: 24, y: 20, to: 'cottage', spawn: 'in', label: 'E: ENTER COTTAGE', price: 300, flag: 'houseBought' });
  g.add({ t: 'spawn', name: 'cottage', x: 24, y: 21 });
  g.add({ t: 'spawn', name: 'hall', x: 19, y: 8 });
  g.add({ t: 'spawn', name: 'lodge', x: 7, y: 10 });
  g.add({ t: 'spawn', name: 'shop', x: 32, y: 9 });
  g.add({ t: 'spawn', name: 'start', x: 19, y: 15 });
  g.add({ t: 'spawn', name: 'east', x: 37, y: 13 });
  g.add({ t: 'fire', x: 19, y: 13, rest: true });
  g.add({ t: 'npc', id: 'guard', x: 34, y: 12 });
  g.add({ t: 'npc', id: 'hilda', x: 10, y: 16 });
  g.add({ t: 'prop', tex: 'anvil', x: 11, y: 16 });
  g.add({ t: 'npc', id: 'ragna', x: 10, y: 12 });
  g.add({ t: 'herb', item: 'snowberry', x: 13, y: 20 });
  g.add({ t: 'herb', item: 'snowberry', x: 21, y: 21 });
  g.add({ t: 'npc', id: 'child', x: 24, y: 19 });
  g.add({ t: 'sign', x: 36, y: 11, text: ['PINE FOREST, EAST.', 'WOLVES ON THE TRAIL. TRAVEL ARMED. - BJORN'] });
  for (const [x, y, skin] of [[16, 8, 'pot'], [22, 8, 'barrel'], [4, 10, 'pot'], [10, 9, 'barrel'], [31, 11, 'pot'], [34, 10, 'barrel'], [13, 16, 'pot'], [26, 16, 'pot'], [27, 10, 'barrel'], [24, 9, 'pot']]) g.add({ t: 'pot', x, y, skin });
  g.add({ t: 'exit', x: 38, y: 12, w: 2, h: 3, to: 'forest', spawn: 'west' });
  g.add({ t: 'glow', x: 19, y: 13, r: 52, col: 12 });
  g.add({ t: 'glow', x: 32, y: 8, r: 24, col: 13 });
  g.add({ t: 'glow', x: 19, y: 7, r: 24, col: 13 });
  return g.out();
}

export const MAPS = {
  village: { name: 'Hollowfrost Village', snow: true, ambience: 'wind', build: buildVillage, tint: 0, music: 'village' },
};

function buildForestRegion() {
  const g = new Grid(56, 32, TILE.SNOW);
  g.noise(TILE.SNOW2, 0.2, 9, TILE.SNOW);
  g.dress('snow');
  g.border(TILE.PINE, 2);
  g.rect(0, 14, 3, 3, TILE.PATH);
  // main trail west -> bandit camp, branch north -> crypt
  g.path([[2, 15], [9, 15], [14, 13], [24, 13], [30, 16], [40, 18], [44, 22]], 2, TILE.PATH);
  g.path([[24, 13], [27, 8], [34, 6], [44, 6], [46, 4]], 2, TILE.PATH);
  // clearings
  g.rect(9, 8, 9, 5, TILE.SNOW2);        // wolf den A
  g.rect(28, 10, 7, 5, TILE.SNOW2);      // wolf den B
  g.rect(41, 19, 12, 9, TILE.SNOW2);     // bandit camp
  g.rect(4, 4, 6, 5, TILE.SNOW2);        // hidden glade
  g.rect(18, 20, 6, 6, TILE.SNOW2);      // lone wolf
  g.path([[10, 14], [6, 9]], 1, TILE.PATH);
  // crypt gate
  g.rect(43, 1, 7, 2, TILE.STONE);
  g.set(46, 2, TILE.STAIRS);
  g.rect(44, 3, 5, 2, TILE.SNOW2);
  g.set(44, 2, TILE.GRAVE); g.set(48, 2, TILE.GRAVE);
  g.set(43, 4, TILE.GRAVE); g.set(49, 4, TILE.GRAVE); g.set(41, 5, TILE.ROCK); g.set(51, 5, TILE.ROCK);
  g.set(46, 23, TILE.FIRE);
  g.reserve(0, 0, 1, 1);
  for (const [x, y] of [[5, 13], [22, 11], [8, 17], [16, 17], [26, 17], [33, 17], [37, 12], [20, 10], [9, 6], [29, 9], [23, 16], [36, 9]]) g.clear(x, y);
  g.scatter(TILE.PINE, 250, 21);
  g.scatter(TILE.DEADTREE, 14, 24);
  g.scatter(TILE.STUMP, 10, 25);
  g.scatter(TILE.ROCK, 22, 22);
  g.dress('late');
  g.path([[31, 10], [31, 2]], 2, TILE.PATH);
  g.rect(30, 0, 3, 2, TILE.PATH);
  g.add({ t: 'spawn', name: 'north', x: 31, y: 3 });
  g.add({ t: 'exit', x: 30, y: 0, w: 3, h: 1, to: 'pass', spawn: 'south', fx: 'door' });
  g.add({ t: 'spawn', name: 'west', x: 3, y: 15 });
  g.add({ t: 'spawn', name: 'crypt', x: 46, y: 4 });
  g.add({ t: 'exit', x: 0, y: 14, w: 2, h: 3, to: 'village', spawn: 'east' });
  g.add({ t: 'exit', x: 46, y: 2, w: 1, h: 1, to: 'crypt', spawn: 'entry', fx: 'door' });
  g.add({ t: 'fire', x: 46, y: 23, rest: true });
  g.add({ t: 'sign', x: 5, y: 13, text: ['HOLLOWFROST VILLAGE, WEST.', 'O: JOURNAL.  M: MAP.  REST AT CAMPFIRES TO HEAL AND SAVE.'] });
  g.add({ t: 'sign', x: 22, y: 11, text: ['NORTH-EAST: THE STONE GATE. CRYPT OF THE HOLLOW KING.', 'EAST: BANDIT CAMP. THEY DO NOT TAKE VISITORS.'] });
  for (const [x, y, skin] of [[42, 20, 'barrel'], [51, 25, 'barrel'], [44, 27, 'pot'], [47, 20, 'pot'], [8, 5, 'pot'], [5, 8, 'pot'], [31, 8, 'pot']]) g.add({ t: 'pot', x, y, skin });
  g.add({ t: 'glow', x: 46, y: 23, r: 56, col: 12 });
  g.add({ t: 'glow', x: 45, y: 3, r: 26, col: 12 });
  g.add({ t: 'glow', x: 47, y: 3, r: 26, col: 12 });
  // wolves
  for (const [x, y] of [[11, 10], [13, 11], [15, 9], [32, 13], [20, 22]]) g.add({ t: 'enemy', kind: 'wolf', x, y, camp: 'oldden' });
  g.add({ t: 'enemy', kind: 'alpha', x: 30, y: 12, camp: 'oldden' });
  g.add({ t: 'bounty', id: 'oldden', kind: 'den', x: 12, y: 10 });
  // bandits
  for (const [x, y] of [[43, 21], [49, 22], [45, 26]]) g.add({ t: 'enemy', kind: 'bandit', x, y, camp: 'oldcamp' });
  for (const [x, y] of [[51, 20], [42, 26]]) g.add({ t: 'enemy', kind: 'archer', x, y, camp: 'oldcamp' });
  g.add({ t: 'enemy', kind: 'chief', x: 47, y: 25, camp: 'oldcamp' });
  g.add({ t: 'enemy', kind: 'fencer', x: 46, y: 22, camp: 'oldcamp' });
  g.add({ t: 'bounty', id: 'oldcamp', kind: 'camp', x: 47, y: 24 });
  // loot
  for (const [x, y, item] of [[8, 17, 'snowberry'], [16, 17, 'snowberry'], [26, 17, 'snowberry'], [33, 17, 'snowberry'], [37, 12, 'snowberry'], [20, 10, 'frost_lily'], [9, 6, 'frost_lily'], [29, 9, 'frost_lily'], [23, 16, 'frost_lily'], [36, 9, 'snowberry']]) g.add({ t: 'herb', item, x, y });
  g.add({ t: 'chest', id: 'camp', x: 50, y: 26, lock: 'med', loot: [{ item: 'silver_locket' }, { item: 'iron_cuirass' }, { item: 'iron_shield' }, { item: 'hp_potion', n: 2 }, { gold: 45 }] });
  g.add({ t: 'chest', id: 'glade', x: 6, y: 6, loot: [{ item: 'bear_charm' }, { item: 'hunting_knife' }, { item: 'lockpick', n: 4 }, { arrows: 10 }] });
  g.add({ t: 'lore', id: 'bandit', tex: 'book', x: 44, y: 21 });
  g.add({ t: 'pickup', x: 6, y: 16, spec: { type: 'arrows', n: 6 } });
  g.add({ t: 'pickup', x: 20, y: 14, spec: { type: 'item', id: 'hp_potion' } });
  g.add({ t: 'pickup', x: 36, y: 7, spec: { type: 'arrows', n: 5 } });
  return g.out();
}

// ---- The Glacial Maw: an ice cave with a boss arena at the far end
function buildMaw() {
  const g = new Grid(36, 58, TILE.ROCK);
  const F = (x, y, w, h, t = TILE.ICE) => g.rect(x, y, w, h, t);
  F(13, 50, 10, 6, TILE.SNOW2);          // entry cave (dry floor)
  F(17, 42, 2, 8);                       // corridor A
  F(6, 32, 24, 10);                      // chamber 1
  F(2, 34, 4, 4, TILE.SNOW2); F(30, 34, 4, 4, TILE.SNOW2);   // side alcoves
  F(17, 26, 2, 6);                       // corridor B
  F(4, 16, 28, 10);                      // chamber 2: the frozen lake
  F(17, 12, 2, 4);                       // corridor C (boss gate at y=12)
  F(6, 1, 24, 11);                       // boss arena
  g.rect(17, 56, 2, 1, TILE.STAIRS);
  g.noise(TILE.ICE2, 0.25, 31, TILE.ICE);
  g.noise(TILE.SNOW2, 0.06, 32, TILE.ICE);
  for (const [x, y] of [[9, 35], [9, 39], [26, 35], [26, 39], [8, 19], [8, 23], [27, 19], [27, 23], [12, 21], [23, 21], [10, 4], [25, 4], [10, 9], [25, 9]]) g.set(x, y, TILE.PILLAR);
  for (const [x, y] of [[7, 16], [28, 16], [6, 33], [29, 33]]) g.set(x, y, TILE.ROCK);
  g.add({ t: 'spawn', name: 'entry', x: 17, y: 53 });
  g.add({ t: 'exit', x: 17, y: 56, w: 2, h: 1, to: 'forest', spawn: 'maw', fx: 'door' });
  g.add({ t: 'fire', x: 14, y: 51, rest: true, id: 'mawin' }); g.set(14, 51, TILE.BRAZIER);
  g.add({ t: 'glow', x: 14, y: 51, r: 44, col: 15 });
  for (const [x, y, r] of [[17, 46, 36], [10, 36, 40], [25, 36, 40], [10, 21, 44], [25, 21, 44], [18, 6, 70], [17, 13, 40]]) g.add({ t: 'glow', x, y, r, col: 15 });
  g.add({ t: 'sign', x: 15, y: 52, text: ['THE GLACIAL MAW.', 'ICE IS SLIPPERY. ROLL TO KEEP YOUR FOOTING.'] });
  // chamber 1
  g.add({ t: 'enemy', kind: 'reaver', x: 12, y: 35, tier: 2 }); g.add({ t: 'enemy', kind: 'wight', x: 24, y: 35, tier: 2 });
  g.add({ t: 'enemy', kind: 'wight', x: 12, y: 40, tier: 2 }); g.add({ t: 'enemy', kind: 'wolf', x: 22, y: 39, tier: 2 }); g.add({ t: 'enemy', kind: 'wolf', x: 19, y: 34, tier: 2 });
  g.add({ t: 'chest', id: 'maw1', x: 3, y: 35, lock: 'med', loot: [{ gen: 2 }, { item: 'hp_potion', n: 2 }, { gold: 60 }] });
  g.add({ t: 'chest', id: 'maw2', x: 32, y: 35, loot: [{ item: 'frost_lily', n: 3 }, { arrows: 10 }, { item: 'mp_potion', n: 2 }] });
  // chamber 2
  g.add({ t: 'enemy', kind: 'fencer', x: 9, y: 20, tier: 2 }); g.add({ t: 'enemy', kind: 'fencer', x: 26, y: 20, tier: 2 });
  g.add({ t: 'enemy', kind: 'knight', x: 17, y: 22, tier: 2 }); g.add({ t: 'enemy', kind: 'conjurer', x: 17, y: 18, tier: 2 }); g.add({ t: 'enemy', kind: 'wight', x: 14, y: 24, tier: 2 });
  g.add({ t: 'pickup', x: 17, y: 28, spec: { type: 'item', id: 'hp_potion' } });
  // checkpoint brazier before the gate, then the arena
  g.set(18, 14, TILE.BRAZIER); g.add({ t: 'fire', x: 18, y: 14, auto: true });
  g.add({ t: 'boss', kind: 'wyrm', x: 18, y: 5 });
  g.add({ t: 'bossgate', x: 17, y: 12, w: 2 });
  for (const [x, y] of [[8, 3], [27, 3], [8, 10], [27, 10], [13, 8], [22, 8]]) g.add({ t: 'pot', x, y, skin: 'urn' });
  return g.out();
}
MAPS.maw = { name: 'The Glacial Maw', snow: false, ambience: 'crypt', bossTrigger: (pc, T) => pc.y < 10.6 * T && pc.x > 6 * T && pc.x < 30 * T, build: buildMaw, music: 'crypt', dim: 0.3, cave: true };


// ---- Ironwatch Keep: a ruined fortress; stone, barricades and a garrison that never left
function buildKeep() {
  const g = new Grid(40, 62, TILE.CWALL);
  const F = (x, y, w, h, t = TILE.CFLOOR) => g.rect(x, y, w, h, t);
  F(14, 54, 12, 7);                      // gatehouse
  F(19, 47, 2, 7);                       // lane
  F(5, 32, 30, 15);                      // courtyard
  F(2, 36, 3, 6); F(35, 36, 3, 6);       // wall towers (archers)
  F(19, 26, 2, 6);                       // stair
  F(6, 14, 28, 12);                      // barracks hall
  F(1, 17, 5, 5); F(34, 17, 5, 5);       // armoury and mess
  F(19, 11, 2, 3);                       // keep door
  F(7, 1, 26, 10);                       // throne room (arena)
  g.rect(19, 61, 2, 1, TILE.STAIRS);
  g.noise(TILE.CFLOOR2, 0.2, 41, TILE.CFLOOR);
  g.rect(18, 47, 4, 1, TILE.RUG); g.rect(19, 15, 2, 10, TILE.RUG); g.rect(19, 1, 2, 10, TILE.RUG);
  // barricades across the courtyard (fences), pillars in the halls
  for (const x of [8, 9, 10, 11, 28, 29, 30, 31]) g.set(x, 40, TILE.FENCE);
  for (const [x, y] of [[8, 34], [31, 34], [8, 44], [31, 44], [9, 17], [9, 22], [30, 17], [30, 22], [10, 3], [29, 3], [10, 8], [29, 8]]) g.set(x, y, TILE.PILLAR);
  g.add({ t: 'spawn', name: 'entry', x: 20, y: 58 });
  g.add({ t: 'exit', x: 19, y: 61, w: 2, h: 1, to: 'forest', spawn: 'keep', fx: 'door' });
  g.add({ t: 'fire', x: 16, y: 56, rest: true, id: 'keepin' }); g.set(16, 56, TILE.BRAZIER);
  for (const [x, y, r, col] of [[16, 56, 44, 12], [20, 50, 36, 12], [12, 36, 44, 12], [28, 36, 44, 12], [20, 40, 50, 12], [12, 19, 44, 12], [28, 19, 44, 12], [20, 5, 70, 12], [3, 38, 28, 12], [36, 38, 28, 12]]) g.add({ t: 'glow', x, y, r, col });
  g.add({ t: 'sign', x: 17, y: 55, text: ['IRONWATCH KEEP.', 'THE WARDEN HROLF SWORE TO HOLD THIS GATE UNTIL RELIEVED. NO RELIEF CAME.'] });
  // courtyard garrison
  for (const [k, x, y] of [['bandit', 12, 34], ['bandit', 26, 35], ['knight', 20, 38], ['draugr', 11, 44], ['draugr', 29, 44], ['warden', 20, 43]]) g.add({ t: 'enemy', kind: k, x, y, tier: 2 });
  for (const [x, y] of [[3, 38], [36, 38], [3, 40], [36, 40]]) g.add({ t: 'enemy', kind: 'archer', x, y, tier: 2 });
  g.add({ t: 'chest', id: 'keep1', x: 20, y: 33, lock: 'med', loot: [{ gen: 2 }, { item: 'iron_ingot', n: 3 }, { gold: 80 }] });
  // barracks
  for (const [k, x, y] of [['reaver', 12, 18], ['reaver', 28, 18], ['knight', 14, 23], ['warden', 26, 23], ['conjurer', 20, 16], ['fencer', 20, 21]]) g.add({ t: 'enemy', kind: k, x, y, tier: 2 });
  g.add({ t: 'chest', id: 'keep2', x: 2, y: 19, lock: 'hard', loot: [{ gen: 3 }, { item: 'iron_greatsword' }, { gold: 100 }] });
  g.add({ t: 'chest', id: 'keep3', x: 37, y: 19, loot: [{ item: 'hp_potion', n: 3 }, { item: 'sp_potion', n: 2 }, { arrows: 14 }] });
  g.add({ t: 'enemy', kind: 'chief', x: 8, y: 36, tier: 2 });
  g.set(21, 12, TILE.BRAZIER); g.add({ t: 'fire', x: 21, y: 12, auto: true });
  g.add({ t: 'boss', kind: 'warlord', x: 20, y: 5 });
  g.add({ t: 'bossgate', x: 19, y: 11, w: 2 });
  for (const [x, y] of [[9, 3], [30, 3], [9, 9], [30, 9]]) g.add({ t: 'pot', x, y, skin: 'urn' });
  return g.out();
}
MAPS.keep = { name: 'Ironwatch Keep', snow: false, ambience: 'crypt', bossTrigger: (pc, T) => pc.y < 9.6 * T && pc.x > 7 * T && pc.x < 33 * T, build: buildKeep, music: 'crypt', dim: 0.34, cave: true };

// ---- The Drowned Chapel: a flooded temple under the lake; black water, sunken pews, rune puzzle
function buildChapel() {
  const g = new Grid(36, 60, TILE.CWALL);
  const F = (x, y, w, h, t = TILE.ICE2) => g.rect(x, y, w, h, t);
  F(12, 52, 12, 7, TILE.CFLOOR);         // dry vestibule
  F(17, 44, 2, 8);
  F(5, 32, 26, 12);                      // nave (flooded)
  F(1, 35, 4, 5, TILE.CFLOOR); F(32, 35, 3, 5, TILE.CFLOOR);   // side chapels (the east one is sealed by a rune wall)
  F(17, 26, 2, 6);
  F(5, 14, 26, 12);                      // cloister
  F(17, 10, 2, 4);
  F(6, 1, 24, 9);                        // sanctum (arena)
  g.rect(17, 59, 2, 1, TILE.STAIRS);
  g.noise(TILE.ICE, 0.35, 51, TILE.ICE2);
  for (const [x, y] of [[8, 34], [8, 38], [8, 42], [27, 34], [27, 38], [27, 42], [9, 17], [9, 23], [26, 17], [26, 23], [10, 3], [25, 3], [10, 7], [25, 7]]) g.set(x, y, TILE.PILLAR);
  for (const [x, y] of [[12, 36], [12, 40], [23, 36], [23, 40]]) g.set(x, y, TILE.GRAVE);     // sunken pews
  g.add({ t: 'spawn', name: 'entry', x: 18, y: 56 });
  g.add({ t: 'exit', x: 17, y: 59, w: 2, h: 1, to: 'forest', spawn: 'chapel', fx: 'door' });
  g.add({ t: 'fire', x: 14, y: 54, rest: true, id: 'chapelin' }); g.set(14, 54, TILE.BRAZIER);
  for (const [x, y, r] of [[14, 54, 44], [18, 46, 34], [10, 38, 40], [26, 38, 40], [10, 20, 44], [26, 20, 44], [18, 5, 70], [3, 37, 26], [33, 37, 26]]) g.add({ t: 'glow', x, y, r, col: 15 });
  g.add({ t: 'sign', x: 16, y: 55, text: ['THE DROWNED CHAPEL.', 'WHEN THE LAKE ROSE, THE CONGREGATION STAYED TO PRAY. THEY ARE STILL PRAYING.'] });
  // nave
  for (const [k, x, y] of [['draugr', 11, 34], ['draugr', 25, 34], ['wight', 14, 40], ['wight', 22, 40], ['reaver', 18, 36], ['conjurer', 18, 42]]) g.add({ t: 'enemy', kind: k, x, y, tier: 2 });
  // rune puzzle in the west chapel opens the east chapel's treasure (order shown on the sign)
  g.add({ t: 'plateorder', order: ['wolf', 'moon', 'crown'] });
  g.add({ t: 'plate', rune: 'moon', x: 12, y: 33 }); g.add({ t: 'plate', rune: 'crown', x: 24, y: 33 }); g.add({ t: 'plate', rune: 'wolf', x: 18, y: 43 });
  g.add({ t: 'sign', x: 3, y: 36, text: ['THE CONGREGATION KNELT IN ORDER: THE WOLF FIRST, THEN THE MOON, THEN THE CROWN.', 'WOLF IS RED. MOON IS BLUE. CROWN IS GOLD.'] });
  g.add({ t: 'vaultwall', x: 31, y: 37 });
  g.add({ t: 'chest', id: 'chapel1', x: 33, y: 37, loot: [{ gen: 3 }, { gen: 2 }, { item: 'mp_potion_g', n: 2 }, { gold: 120 }] });
  // cloister
  for (const [k, x, y] of [['knight', 10, 18], ['reaver', 26, 18], ['wight', 14, 22], ['wight', 22, 22], ['conjurer', 18, 17], ['draugr', 18, 23]]) g.add({ t: 'enemy', kind: k, x, y, tier: 2 });
  g.add({ t: 'chest', id: 'chapel2', x: 2, y: 37, lock: 'med', loot: [{ gen: 2 }, { item: 'frost_lily', n: 3 }, { gold: 70 }] });
  g.set(19, 12, TILE.BRAZIER); g.add({ t: 'fire', x: 19, y: 12, auto: true });
  g.add({ t: 'boss', kind: 'tide', x: 18, y: 5 });
  g.add({ t: 'bossgate', x: 17, y: 10, w: 2 });
  for (const [x, y] of [[8, 2], [27, 2], [8, 8], [27, 8]]) g.add({ t: 'pot', x, y, skin: 'urn' });
  return g.out();
}
MAPS.chapel = { name: 'The Drowned Chapel', snow: false, ambience: 'crypt', bossTrigger: (pc, T) => pc.y < 8.6 * T && pc.x > 6 * T && pc.x < 30 * T, build: buildChapel, music: 'crypt', dim: 0.4, cave: true };

// ---- The Rootvault: twisting passages through the blight
function buildRootvault() {
  const g = new Grid(40, 62, TILE.DEADTREE);
  const F = (x, y, w, h, t = TILE.SNOW2) => g.rect(x, y, w, h, t);
  F(15, 54, 10, 7);
  F(19, 46, 2, 8, TILE.PATH);
  F(6, 36, 28, 10);                      // thicket
  F(3, 38, 3, 6); F(34, 38, 3, 6);
  F(19, 28, 2, 8, TILE.PATH);
  F(5, 17, 30, 11);                      // the wound (blight pools)
  F(19, 13, 2, 4, TILE.PATH);
  F(7, 1, 26, 12);
  g.rect(19, 61, 2, 1, TILE.STAIRS);
  g.noise(TILE.STUMP, 0.5, 61, TILE.DEADTREE);
  g.noise(TILE.ROCK, 0.1, 62, TILE.DEADTREE);
  g.noise(TILE.SNOW3, 0.1, 63, TILE.SNOW2);
  for (const [x, y] of [[10, 40], [29, 40], [12, 21], [27, 21], [12, 25], [27, 25], [10, 5], [29, 5], [10, 10], [29, 10]]) g.set(x, y, TILE.STUMP);
  g.add({ t: 'spawn', name: 'entry', x: 20, y: 58 });
  g.add({ t: 'exit', x: 19, y: 61, w: 2, h: 1, to: 'forest', spawn: 'rootvault', fx: 'door' });
  g.add({ t: 'fire', x: 17, y: 56, rest: true, id: 'rootin' }); g.set(17, 56, TILE.BRAZIER);
  for (const [x, y, r, col] of [[17, 56, 44, 12], [20, 48, 30, 8], [12, 40, 44, 8], [28, 40, 44, 8], [12, 22, 50, 8], [28, 22, 50, 8], [20, 6, 80, 8], [20, 14, 36, 12]]) g.add({ t: 'glow', x, y, r, col });
  g.add({ t: 'sign', x: 18, y: 55, text: ['THE ROOTVAULT.', 'SOMETHING BELOW IS GROWING. THE TREES HERE HAVE STOPPED BEING TREES.'] });
  for (const [k, x, y] of [['wolf', 10, 38], ['wolf', 28, 38], ['alpha', 20, 41], ['fencer', 14, 43], ['bandit', 26, 43], ['wolf', 8, 41]]) g.add({ t: 'enemy', kind: k, x, y, tier: 3 });
  g.add({ t: 'chest', id: 'root1', x: 4, y: 41, lock: 'med', loot: [{ gen: 3 }, { item: 'snowberry', n: 4 }, { gold: 80 }] });
  g.add({ t: 'chest', id: 'root2', x: 35, y: 41, loot: [{ item: 'hp_potion', n: 3 }, { item: 'frost_lily', n: 3 }, { arrows: 12 }] });
  for (const [k, x, y] of [['reaver', 10, 20], ['reaver', 29, 20], ['knight', 14, 24], ['wight', 25, 24], ['conjurer', 20, 20], ['alpha', 20, 25]]) g.add({ t: 'enemy', kind: k, x, y, tier: 3 });
  for (const [x, y] of [[9, 18], [30, 18], [20, 26], [11, 26], [28, 18]]) g.add({ t: 'herb', item: 'frost_lily', x, y });
  g.add({ t: 'chest', id: 'root3', x: 20, y: 18, lock: 'hard', loot: [{ gen: 3 }, { gen: 2 }, { gold: 110 }, { item: 'hp_potion_g', n: 2 }] });
  g.set(21, 14, TILE.BRAZIER); g.add({ t: 'fire', x: 21, y: 14, auto: true });
  g.add({ t: 'boss', kind: 'root', x: 20, y: 5 });
  g.add({ t: 'bossgate', x: 19, y: 13, w: 2 });
  return g.out();
}
MAPS.rootvault = { name: 'The Rootvault', snow: false, ambience: 'crypt', bossTrigger: (pc, T) => pc.y < 11.6 * T && pc.x > 7 * T && pc.x < 33 * T, build: buildRootvault, music: 'crypt', dim: 0.36, cave: true };

// ---- The Winter Throne: the end of the road. Opens only to someone who holds all four Hearts.
function buildThrone() {
  const g = new Grid(40, 70, TILE.ROCK);
  const F = (x, y, w, h, t = TILE.ICE) => g.rect(x, y, w, h, t);
  F(14, 62, 12, 7, TILE.SNOW2);
  F(19, 55, 2, 7);
  F(6, 42, 28, 13);                      // hall of the Kings
  F(19, 36, 2, 6);
  F(5, 24, 30, 12);                      // gallery of the Hearts
  F(19, 19, 2, 5);
  F(6, 1, 28, 18);                       // the throne
  g.rect(19, 69, 2, 1, TILE.STAIRS);
  g.noise(TILE.ICE2, 0.3, 71, TILE.ICE);
  g.rect(19, 1, 2, 18, TILE.RUG);
  for (const [x, y] of [[8, 44], [8, 52], [31, 44], [31, 52], [14, 46], [25, 46], [14, 50], [25, 50], [9, 27], [9, 33], [30, 27], [30, 33], [10, 4], [29, 4], [10, 14], [29, 14]]) g.set(x, y, TILE.PILLAR);
  for (const [x, y] of [[6, 25], [33, 25], [6, 34], [33, 34]]) g.set(x, y, TILE.BRAZIER);
  g.add({ t: 'spawn', name: 'entry', x: 20, y: 66 });
  g.add({ t: 'exit', x: 19, y: 69, w: 2, h: 1, to: 'forest', spawn: 'throne', fx: 'door' });
  g.add({ t: 'fire', x: 15, y: 64, rest: true, id: 'thronein' }); g.set(15, 64, TILE.BRAZIER);
  for (const [x, y, r, col] of [[15, 64, 44, 15], [20, 58, 34, 15], [10, 46, 44, 15], [29, 46, 44, 15], [20, 49, 60, 15], [6, 25, 36, 12], [33, 25, 36, 12], [6, 34, 36, 15], [33, 34, 36, 15], [20, 9, 90, 15]]) g.add({ t: 'glow', x, y, r, col });
  g.add({ t: 'sign', x: 17, y: 65, text: ['THE WINTER THRONE.', 'HERE THE FIVE KINGS CHAINED THE LONG WINTER. FOUR HEARTS HOLD ITS CHAINS. THE FIFTH WAS LOST TO GREED.'] });
  for (const [k, x, y] of [['knight', 11, 46], ['knight', 28, 46], ['reaver', 15, 52], ['reaver', 24, 52], ['conjurer', 20, 45], ['wight', 10, 52], ['wight', 29, 52], ['warden', 20, 50]]) g.add({ t: 'enemy', kind: k, x, y, tier: 3 });
  g.add({ t: 'chest', id: 'throne1', x: 7, y: 48, lock: 'hard', loot: [{ gen: 3, rarity: 2 }, { gold: 150 }, { item: 'hp_potion_g', n: 2 }] });
  for (const [k, x, y] of [['fencer', 10, 29], ['fencer', 29, 29], ['knight', 14, 27], ['knight', 25, 27], ['conjurer', 20, 28], ['conjurer', 20, 33], ['reaver', 12, 32], ['reaver', 27, 32]]) g.add({ t: 'enemy', kind: k, x, y, tier: 3 });
  g.add({ t: 'chest', id: 'throne2', x: 33, y: 30, loot: [{ item: 'hp_potion_g', n: 3 }, { item: 'mp_potion_g', n: 2 }, { item: 'sp_potion', n: 3 }] });
  g.set(21, 21, TILE.BRAZIER); g.add({ t: 'fire', x: 21, y: 21, auto: true });
  g.add({ t: 'boss', kind: 'winter', x: 20, y: 8 });
  g.add({ t: 'bossgate', x: 19, y: 19, w: 2 });
  return g.out();
}
MAPS.throne = { name: 'The Winter Throne', snow: false, ambience: 'crypt', bossTrigger: (pc, T) => pc.y < 17.6 * T && pc.x > 6 * T && pc.x < 34 * T, build: buildThrone, music: 'boss', dim: 0.36, cave: true };


// ---- The Ember Nest: a volcanic cave; Skaldrath's lair (optional super-boss)
function buildNest() {
  const g = new Grid(40, 62, TILE.ROCK);
  const F = (x, y, w, h, t = TILE.CFLOOR) => g.rect(x, y, w, h, t);
  F(14, 54, 12, 7); F(19, 47, 2, 7);
  F(5, 33, 30, 14);                      // first cavern
  F(2, 36, 3, 6); F(35, 36, 3, 6);
  F(19, 27, 2, 6);
  F(4, 15, 32, 12);                      // the forge cavern
  F(19, 11, 2, 4);
  F(4, 0, 32, 11);                       // the nest
  g.rect(19, 61, 2, 1, TILE.STAIRS);
  g.noise(TILE.CFLOOR2, 0.25, 81, TILE.CFLOOR);
  g.rect(19, 15, 2, 10, TILE.PATH); g.rect(19, 28, 2, 4, TILE.PATH);
  // lava pools (solid) and pillars
  for (const [x, y] of [[9, 36], [10, 36], [9, 37], [10, 37], [29, 41], [30, 41], [29, 42], [30, 42], [8, 20], [9, 20], [8, 21], [9, 21], [30, 24], [31, 24], [30, 25], [31, 25], [12, 4], [13, 4], [26, 6], [27, 6], [8, 8], [31, 8]]) g.set(x, y, TILE.FIRE);
  for (const [x, y] of [[14, 40], [25, 38], [14, 22], [26, 19], [11, 2], [28, 2]]) g.set(x, y, TILE.PILLAR);
  g.add({ t: 'spawn', name: 'entry', x: 20, y: 58 });
  g.add({ t: 'exit', x: 19, y: 61, w: 2, h: 1, to: 'forest', spawn: 'nest', fx: 'door' });
  g.add({ t: 'fire', x: 16, y: 57, rest: true, id: 'nestin' }); g.set(16, 57, TILE.BRAZIER);
  for (const [x, y, r] of [[16, 57, 44], [20, 50, 34], [9, 36, 40], [30, 41, 40], [20, 38, 60], [8, 20, 40], [30, 24, 40], [20, 20, 70], [12, 4, 50], [27, 6, 50], [20, 5, 110], [20, 13, 36]]) g.add({ t: 'glow', x, y, r, col: 12 });
  g.add({ t: 'sign', x: 17, y: 58, text: ['THE EMBER NEST.', 'THE ROCK IS WARM UNDERFOOT. SOMETHING VERY LARGE BREATHES BELOW.'] });
  for (const [k, x, y] of [['imp', 10, 40], ['imp', 14, 44], ['imp', 28, 36], ['imp', 24, 44], ['wyvern', 18, 38], ['wyvern', 26, 40], ['golem', 20, 36], ['necro', 8, 44]]) g.add({ t: 'enemy', kind: k, x, y, tier: 3 });
  g.add({ t: 'chest', id: 'nest1', x: 3, y: 38, lock: 'hard', loot: [{ gen: 3 }, { gen: 3, rarity: 1 }, { gold: 140 }] });
  g.add({ t: 'chest', id: 'nest2', x: 36, y: 38, loot: [{ item: 'hp_potion_g', n: 3 }, { item: 'mp_potion_g', n: 2 }, { arrows: 14 }] });
  for (const [k, x, y] of [['golem', 12, 18], ['golem', 28, 18], ['necro', 20, 17], ['imp', 14, 24], ['imp', 26, 22], ['wyvern', 20, 22], ['shroom', 8, 24], ['shroom', 32, 20], ['wisp', 18, 24], ['wisp', 24, 16]]) g.add({ t: 'enemy', kind: k, x, y, tier: 3 });
  g.add({ t: 'chest', id: 'nest3', x: 5, y: 17, lock: 'hard', loot: [{ gen: 3, rarity: 2 }, { gold: 160 }, { item: 'hp_potion_g', n: 2 }] });
  g.set(21, 13, TILE.BRAZIER); g.add({ t: 'fire', x: 21, y: 13, auto: true });
  g.add({ t: 'boss', kind: 'dragon', x: 20, y: 5 });
  g.add({ t: 'bossgate', x: 19, y: 11, w: 2 });
  return g.out();
}
MAPS.nest = { name: 'The Ember Nest', snow: false, ambience: 'crypt', bossTrigger: (pc, T) => pc.y < 9.6 * T && pc.x > 5 * T && pc.x < 35 * T, build: buildNest, music: 'boss', dim: 0.3, cave: true };

// The forest is now the north-west corner of the open world (same coordinates as before).
let reachCache = null;
export function getReach() {
  const seed = S.seed ?? 1337;
  if (!reachCache || reachCache.seed !== seed) reachCache = { seed, built: buildReach(buildForestRegion(), seed) };
  return reachCache.built;
}
MAPS.forest = { name: 'The Hollow Reach', snow: true, ambience: 'wind', build: () => getReach(), music: 'forest', dim: 0.12, stream: true };
for (let i = 0; i < 3; i++) {
  MAPS['barrow' + i] = {
    name: 'Barrow', snow: false, ambience: 'crypt', music: 'crypt', dim: 0.4, crypt: true, interior: false,
    build: () => {
      const poi = getReach().pois.find((p) => p.id === 'barrow' + i);
      const b = buildBarrow(S.seed ?? 1337, i, poi ? poi.tier : 0);
      MAPS['barrow' + i].name = b.title;
      return b;
    },
  };
}

function buildCrypt() {
  const g = new Grid(32, 54, TILE.CWALL);
  const F = (x, y, w, h) => g.rect(x, y, w, h, TILE.CFLOOR);
  F(11, 46, 10, 6);          // entry hall
  F(15, 37, 2, 9);           // corridor A
  F(5, 29, 22, 8);           // chamber 1: hall of the dead
  F(15, 21, 2, 8);           // corridor B
  F(4, 13, 24, 8);           // chamber 2: side crypts
  F(1, 15, 3, 3); F(28, 15, 3, 3); // alcoves
  F(15, 9, 2, 4);            // corridor C (boss gate at y=9)
  F(6, 1, 20, 8);            // boss hall
  F(1, 31, 3, 3);            // hidden vault west of chamber 1 (opens with the rune plates)
  g.rect(14, 1, 4, 8, TILE.RUG);
  g.rect(15, 52, 2, 1, TILE.STAIRS);
  g.set(15, 51, TILE.CFLOOR); g.set(16, 51, TILE.CFLOOR);
  // pillars + sarcophagi
  for (const [x, y] of [[8, 31], [8, 34], [23, 31], [23, 34], [11, 15], [11, 18], [20, 15], [20, 18], [10, 3], [21, 3], [10, 6], [21, 6]]) g.set(x, y, TILE.PILLAR);
  for (const [x, y] of [[6, 29], [25, 29], [6, 36], [25, 36], [12, 1], [19, 1], [5, 13], [26, 13]]) g.set(x, y, TILE.SARCO);
  // braziers (with flame + glow entities)
  const braziers = [[12, 47], [19, 47], [6, 30], [25, 30], [5, 14], [26, 14], [7, 2], [24, 2], [7, 7], [24, 7], [14, 38], [17, 38]];
  for (const [x, y] of braziers) {
    g.set(x, y, TILE.BRAZIER);
    g.add({ t: 'fire', x, y, rest: x === 12 && y === 47 });
    g.add({ t: 'glow', x, y, r: 46, col: 12 });
  }
  g.dress('crypt');
  g.add({ t: 'glow', x: 15, y: 10, r: 30, col: 15 });
  g.add({ t: 'sign', x: 13, y: 48, text: ['HERE LIES JARL VALDREK, WHO WOULD NOT LET GO OF WINTER.', 'LET THE DEAD KEEP THEIR COLD.'] });
  for (const [x, y] of [[6, 33], [25, 33], [9, 36], [22, 36], [5, 19], [26, 19], [13, 13], [18, 13], [12, 50], [19, 50], [7, 4], [24, 4]]) g.add({ t: 'pot', x, y, skin: 'urn' });
  g.add({ t: 'spawn', name: 'entry', x: 15, y: 50 });
  g.add({ t: 'exit', x: 15, y: 52, w: 2, h: 1, to: 'forest', spawn: 'crypt', fx: 'door' });
  // rune puzzle: Moon, then Crown, then Wolf opens the vault in the west wall of chamber 1
  g.add({ t: 'vaultorder', order: ['moon', 'crown', 'wolf'] });
  g.add({ t: 'plate', rune: 'moon', x: 11, y: 32 }); g.add({ t: 'plate', rune: 'crown', x: 20, y: 32 }); g.add({ t: 'plate', rune: 'wolf', x: 15, y: 35 });
  g.add({ t: 'vaultwall', x: 4, y: 32 });
  g.add({ t: 'sign', x: 17, y: 36, text: ['THREE RUNES SLEEP IN THE FLOOR. THE MOON RISES FIRST, THEN THE CROWN FALLS, AND LAST THE WOLF HOWLS.', 'MOON IS BLUE. CROWN IS GOLD. WOLF IS RED.'] });
  g.add({ t: 'chest', id: 'vault', x: 2, y: 32, loot: [{ item: 'nordic_shield' }, { item: 'fire_arrow', n: 5 }, { item: 'bleed_arrow', n: 5 }, { gold: 90 }] });
  g.add({ t: 'glow', x: 2, y: 32, r: 30, col: 13 });
  // chamber 1
  for (const [x, y] of [[10, 32], [21, 32]]) g.add({ t: 'enemy', kind: 'draugr', x, y });
  g.add({ t: 'enemy', kind: 'warden', x: 13, y: 35 });
  g.add({ t: 'enemy', kind: 'reaver', x: 18, y: 35 });
  g.add({ t: 'enemy', kind: 'wight', x: 15, y: 30 });
  g.add({ t: 'enemy', kind: 'draugr', x: 15, y: 24 });
  g.add({ t: 'chest', id: 'crypt1', x: 7, y: 33, loot: [{ item: 'hp_potion', n: 2 }, { item: 'sp_potion' }, { gold: 35 }] });
  // chamber 2
  for (const [x, y] of [[7, 17], [25, 17]]) g.add({ t: 'enemy', kind: 'draugr', x, y });
  g.add({ t: 'enemy', kind: 'knight', x: 14, y: 19 });
  g.add({ t: 'enemy', kind: 'draugr', x: 18, y: 19 });
  g.add({ t: 'enemy', kind: 'wight', x: 8, y: 14 });
  g.add({ t: 'enemy', kind: 'conjurer', x: 23, y: 14 });
  g.add({ t: 'chest', id: 'crypt2', x: 2, y: 16, lock: 'med', loot: [{ item: 'steel_sword' }, { item: 'iron_greatsword' }, { arrows: 12 }] });
  g.add({ t: 'chest', id: 'crypt3', x: 29, y: 16, lock: 'hard', loot: [{ item: 'mana_ring' }, { item: 'mp_potion', n: 2 }] });
  g.add({ t: 'pickup', x: 15, y: 40, spec: { type: 'item', id: 'sp_potion' } });
  g.add({ t: 'pickup', x: 15, y: 27, spec: { type: 'arrows', n: 6 } });
  // a lit brazier just before the boss gate: dying to Valdrek sends you back here, not to the entrance
  g.set(16, 11, TILE.BRAZIER);
  g.add({ t: 'fire', x: 16, y: 11, auto: true });
  g.add({ t: 'glow', x: 16, y: 11, r: 40, col: 12 });
  // boss hall
  g.add({ t: 'boss', x: 15, y: 4 });
  g.add({ t: 'bossgate', x: 15, y: 9, w: 2 });
  return g.out();
}
MAPS.crypt = { name: 'Crypt of the Hollow King', snow: false, ambience: 'crypt', bossTrigger: (pc, T) => pc.y < 8.4 * T && pc.x > 6 * T && pc.x < 26 * T, build: buildCrypt, music: 'crypt', dim: 0.42, crypt: true };


// ---------------------------------------------------------------- interiors
function room(w, h, title) {
  const g = new Grid(w, h, TILE.WOODWALL);
  g.rect(1, 2, w - 2, h - 3, TILE.WOODFLOOR);
  for (let x = 3; x < w - 3; x += 5) g.set(x, 1, TILE.WINDOW);
  g.rect(1, 2, w - 2, 1, TILE.WOODFLOOR);
  return g;
}

function buildHall() {
  const g = room(22, 14);
  g.rect(8, 3, 6, 8, TILE.RUG);
  g.set(11, 2, TILE.FIRE); g.add({ t: 'fire', x: 11, y: 2, rest: true });
  g.add({ t: 'glow', x: 11, y: 3, r: 70, col: 12 });
  for (const x of [2, 4]) g.add({ t: 'prop', tex: 'bookshelf', x, y: 2 });
  g.add({ t: 'lore', id: 'hearth', tex: 'bookshelf', x: 17, y: 2 });
  g.add({ t: 'lore', id: 'valdrek', tex: 'book', x: 6, y: 6 });
  g.add({ t: 'lore', id: 'frostheart', tex: 'book', x: 15, y: 7 });
  g.add({ t: 'prop', tex: 'table', x: 7, y: 6 }); g.add({ t: 'prop', tex: 'table', x: 15, y: 6 });
  g.add({ t: 'prop', tex: 'table', x: 4, y: 9 }); g.add({ t: 'prop', tex: 'table', x: 17, y: 9 });
  g.add({ t: 'chest', id: 'hall', x: 19, y: 11, lock: 'med', loot: [{ item: 'steel_sword' }, { item: 'hp_potion_g', n: 2 }, { item: 'lockpick', n: 3 }] });
  g.add({ t: 'pot', x: 2, y: 11, skin: 'pot' }); g.add({ t: 'pot', x: 3, y: 11, skin: 'barrel' });
  g.add({ t: 'npc', id: 'sigrid', x: 11, y: 5, night: true });
  g.add({ t: 'spawn', name: 'in', x: 11, y: 11 });
  g.add({ t: 'exit', x: 10, y: 12, w: 2, h: 1, to: 'village', spawn: 'hall', fx: 'door' });
  g.dress('late');
  return g.out();
}

function buildLodge() {
  const g = room(14, 10);
  g.add({ t: 'bed', x: 2, y: 2 });
  g.add({ t: 'prop', tex: 'bed', x: 2, y: 2 });
  g.add({ t: 'cauldron', x: 11, y: 3 }); g.add({ t: 'prop', tex: 'cauldron', x: 11, y: 3 });
  g.add({ t: 'lore', id: 'hunters', tex: 'bookshelf', x: 6, y: 2 });
  g.add({ t: 'lore', id: 'herbs', tex: 'book', x: 9, y: 5 }); g.add({ t: 'prop', tex: 'table', x: 9, y: 5 });
  g.add({ t: 'chest', id: 'lodge', x: 12, y: 7, loot: [{ arrows: 12 }, { item: 'sp_potion', n: 2 }, { gold: 25 }] });
  g.add({ t: 'npc', id: 'bjorn', x: 7, y: 5, night: true });
  g.add({ t: 'spawn', name: 'in', x: 7, y: 7 });
  g.add({ t: 'exit', x: 6, y: 8, w: 2, h: 1, to: 'village', spawn: 'lodge', fx: 'door' });
  g.add({ t: 'glow', x: 11, y: 4, r: 50, col: 13 });
  return g.out();
}

function buildShop() {
  const g = room(14, 10);
  for (const x of [2, 3, 4, 9, 10, 11]) g.add({ t: 'prop', tex: 'shelf', x, y: 2 });
  g.add({ t: 'lore', id: 'ward', tex: 'bookshelf', x: 6, y: 2 });
  g.add({ t: 'prop', tex: 'table', x: 6, y: 5 }); g.add({ t: 'prop', tex: 'table', x: 7, y: 5 });
  g.add({ t: 'npc', id: 'mirra', x: 6, y: 4, night: true });
  g.add({ t: 'pot', x: 2, y: 7, skin: 'pot' }); g.add({ t: 'pot', x: 11, y: 7, skin: 'barrel' });
  g.add({ t: 'spawn', name: 'in', x: 7, y: 7 });
  g.add({ t: 'exit', x: 6, y: 8, w: 2, h: 1, to: 'village', spawn: 'shop', fx: 'door' });
  g.add({ t: 'glow', x: 7, y: 4, r: 50, col: 13 });
  return g.out();
}

export const FURNITURE = [
  { id: 'table', name: 'Oak Table', price: 30, tex: 'table', x: 7, y: 5, desc: 'A sturdy table. It makes the room feel lived in.' },
  { id: 'shelf', name: 'Shelves', price: 40, tex: 'shelf', x: 3, y: 2, desc: 'Open shelves along the wall.' },
  { id: 'bookshelf', name: 'Bookshelf', price: 60, tex: 'bookshelf', x: 6, y: 2, desc: 'Fills the cottage with the smell of old paper.' },
  { id: 'cauldron', name: 'Alchemy Cauldron', price: 120, tex: 'cauldron', x: 11, y: 3, desc: 'Brew potions at home. Needs the alchemy lesson from Mirra.' },
  { id: 'anvil', name: 'Forge Anvil', price: 200, tex: 'anvil', x: 11, y: 6, desc: 'Upgrade your weapon and armour without leaving home.' },
];

function buildCottage() {
  const g = room(14, 10);
  g.add({ t: 'bed', x: 2, y: 2 }); g.add({ t: 'prop', tex: 'bed', x: 2, y: 2 });
  g.add({ t: 'furnisher', x: 12, y: 2 });
  for (const f of FURNITURE) g.add({ t: 'furn', id: f.id, tex: f.tex, x: f.x, y: f.y });
  g.add({ t: 'fire', x: 7, y: 2, rest: true }); g.set(7, 2, TILE.FIRE);
  g.add({ t: 'glow', x: 7, y: 3, r: 60, col: 12 });
  g.add({ t: 'spawn', name: 'in', x: 7, y: 7 });
  g.add({ t: 'exit', x: 6, y: 8, w: 2, h: 1, to: 'village', spawn: 'cottage', fx: 'door' });
  return g.out();
}
MAPS.cottage = { name: 'Snowdrift Cottage', snow: false, build: buildCottage, music: 'village', dim: 0.1, interior: true };

MAPS.hall = { name: "Elder's Hall", snow: false, build: buildHall, music: 'village', dim: 0.1, interior: true };
MAPS.lodge = { name: "Hunter's Lodge", snow: false, build: buildLodge, music: 'village', dim: 0.1, interior: true };
MAPS.shop = { name: "Mirra's Remedies", snow: false, build: buildShop, music: 'village', dim: 0.1, interior: true };


function buildPass() {
  const g = new Grid(48, 40, TILE.SNOW);
  g.noise(TILE.SNOW2, 0.2, 15, TILE.SNOW);
  g.dress('snow');
  g.border(TILE.PINE, 2);
  // sheer cliffs on both sides
  for (let y = 2; y < 38; y++) {
    const lw = 2 + Math.floor(hash(y, 1, 5) * 3), rw = 2 + Math.floor(hash(y, 2, 5) * 3);
    for (let i = 0; i < lw; i++) g.set(2 + i, y, TILE.STONE);
    for (let i = 0; i < rw; i++) g.set(45 - i, y, TILE.STONE);
  }
  const open = (x, y, w, h) => g.rect(x, y, w, h, TILE.SNOW2);
  open(19, 31, 10, 8); open(7, 30, 34, 5); open(6, 6, 8, 26); open(36, 6, 6, 26);
  open(9, 2, 30, 9); open(12, 11, 24, 3); open(12, 26, 24, 4);
  g.rect(15, 14, 18, 12, TILE.ICE);
  g.noise(TILE.ICE2, 0.3, 16, TILE.ICE);
  // ruined watchtower on the west side
  g.rect(6, 15, 5, 6, TILE.STONE);
  g.rect(7, 16, 3, 4, TILE.CFLOOR);
  g.set(8, 20, TILE.CFLOOR); g.res[20][8] = true;
  g.set(9, 18, TILE.FIRE);
  for (const [x, y] of [[24, 34], [22, 33], [14, 13], [33, 13], [14, 27], [34, 27], [40, 30], [8, 32]]) g.clear(x, y);
  g.scatter(TILE.PINE, 90, 31, TILE.SNOW);
  g.scatter(TILE.ROCK, 18, 32, TILE.SNOW);
  g.scatter(TILE.DEADTREE, 8, 33, TILE.SNOW);
  g.dress('late');
  g.add({ t: 'spawn', name: 'south', x: 24, y: 36 });
  g.add({ t: 'exit', x: 20, y: 38, w: 8, h: 1, to: 'forest', spawn: 'north', fx: 'door' });
  g.add({ t: 'sign', x: 24, y: 34, text: ['FROSTWIND PASS.', 'THE WOLVES HERE ANSWER TO ONE MASTER. DO NOT MEET HIM UNPREPARED.'] });
  g.add({ t: 'lore', id: 'grimfang', tex: 'book', x: 22, y: 33 });
  g.add({ t: 'fire', x: 9, y: 18, rest: true });
  g.add({ t: 'glow', x: 9, y: 18, r: 54, col: 12 });
  g.add({ t: 'chest', id: 'tower', x: 7, y: 16, lock: 'hard', loot: [{ item: 'nordic_shield' }, { item: 'hp_potion_g', n: 2 }, { item: 'lockpick', n: 2 }, { gold: 120 }] });
  g.add({ t: 'lore', id: 'tower', tex: 'book', x: 9, y: 16 });
  for (const [x, y] of [[38, 12], [39, 20], [37, 27], [10, 28]]) g.add({ t: 'enemy', kind: 'wolf', x, y });
  for (const [x, y] of [[20, 19], [28, 21]]) g.add({ t: 'enemy', kind: 'wight', x, y });
  for (const [x, y] of [[9, 26], [40, 24]]) g.add({ t: 'enemy', kind: 'archer', x, y });
  g.add({ t: 'enemy', kind: 'warden', x: 24, y: 28 });
  g.add({ t: 'enemy', kind: 'fencer', x: 33, y: 17 });
  g.add({ t: 'boss', kind: 'grimfang', x: 24, y: 5 });
  for (const [x, y, item] of [[14, 13, 'frost_lily'], [33, 13, 'frost_lily'], [14, 27, 'frost_lily'], [34, 27, 'frost_lily'], [40, 30, 'snowberry'], [8, 32, 'snowberry']]) g.add({ t: 'herb', item, x, y });
  g.add({ t: 'pickup', x: 22, y: 31, spec: { type: 'arrows', n: 8 } });
  g.add({ t: 'pickup', x: 13, y: 22, spec: { type: 'item', id: 'hp_potion_g' } });
  for (const [x, y, skin] of [[11, 30, 'barrel'], [38, 31, 'pot'], [12, 8, 'pot']]) g.add({ t: 'pot', x, y, skin });
  return g.out();
}
MAPS.pass = { name: 'Frostwind Pass', snow: true, ambience: 'wind', build: buildPass, music: 'pass', flag: 'pass', dim: 0.1,
  bossTrigger: (pc, T) => pc.y < 11 * T && pc.x > 9 * T && pc.x < 39 * T };
