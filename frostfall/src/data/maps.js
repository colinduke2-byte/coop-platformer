// Maps are built in code. Entities use tile coordinates (x, y = tile cell).
import { TILE } from '../config.js';
import { Grid } from './mapkit.js';
import { hash } from '../util.js';

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
  g.add({ t: 'npc', id: 'bjorn', x: 7, y: 11 });
  g.add({ t: 'npc', id: 'mirra', x: 32, y: 10 });
  g.dress('late');
  g.add({ t: 'door', x: 19, y: 7, to: 'hall', spawn: 'in', label: "E: ENTER HALL" });
  g.add({ t: 'door', x: 7, y: 9, to: 'lodge', spawn: 'in', label: 'E: ENTER LODGE' });
  g.add({ t: 'door', x: 32, y: 8, to: 'shop', spawn: 'in', label: 'E: ENTER SHOP' });
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

function buildForest() {
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
  for (const [x, y] of [[11, 10], [13, 11], [15, 9], [32, 13], [20, 22]]) g.add({ t: 'enemy', kind: 'wolf', x, y });
  g.add({ t: 'enemy', kind: 'alpha', x: 30, y: 12 });
  // bandits
  for (const [x, y] of [[43, 21], [49, 22], [45, 26]]) g.add({ t: 'enemy', kind: 'bandit', x, y });
  for (const [x, y] of [[51, 20], [42, 26]]) g.add({ t: 'enemy', kind: 'archer', x, y });
  g.add({ t: 'enemy', kind: 'chief', x: 47, y: 25 });
  // loot
  for (const [x, y, item] of [[8, 17, 'snowberry'], [16, 17, 'snowberry'], [26, 17, 'snowberry'], [33, 17, 'snowberry'], [37, 12, 'snowberry'], [20, 10, 'frost_lily'], [9, 6, 'frost_lily'], [29, 9, 'frost_lily'], [23, 16, 'frost_lily'], [36, 9, 'snowberry']]) g.add({ t: 'herb', item, x, y });
  g.add({ t: 'chest', id: 'camp', x: 50, y: 26, lock: 'med', loot: [{ item: 'silver_locket' }, { item: 'iron_cuirass' }, { item: 'iron_shield' }, { item: 'hp_potion', n: 2 }, { gold: 45 }] });
  g.add({ t: 'chest', id: 'glade', x: 6, y: 6, loot: [{ item: 'bear_charm' }, { item: 'hunting_knife' }, { item: 'lockpick', n: 4 }, { arrows: 10 }] });
  g.add({ t: 'pickup', x: 6, y: 16, spec: { type: 'arrows', n: 6 } });
  g.add({ t: 'pickup', x: 20, y: 14, spec: { type: 'item', id: 'hp_potion' } });
  g.add({ t: 'pickup', x: 36, y: 7, spec: { type: 'arrows', n: 5 } });
  return g.out();
}

MAPS.forest = { name: 'Pine Forest', snow: true, ambience: 'wind', build: buildForest, music: 'forest', dim: 0.12 };

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
  // chamber 1
  for (const [x, y] of [[10, 32], [21, 32]]) g.add({ t: 'enemy', kind: 'draugr', x, y });
  for (const [x, y] of [[13, 35], [18, 35]]) g.add({ t: 'enemy', kind: 'warden', x, y });
  g.add({ t: 'enemy', kind: 'wight', x: 15, y: 30 });
  g.add({ t: 'enemy', kind: 'draugr', x: 15, y: 24 });
  g.add({ t: 'chest', id: 'crypt1', x: 7, y: 33, loot: [{ item: 'hp_potion', n: 2 }, { item: 'sp_potion' }, { gold: 35 }] });
  // chamber 2
  for (const [x, y] of [[7, 17], [25, 17]]) g.add({ t: 'enemy', kind: 'draugr', x, y });
  g.add({ t: 'enemy', kind: 'warden', x: 14, y: 19 });
  g.add({ t: 'enemy', kind: 'draugr', x: 18, y: 19 });
  g.add({ t: 'enemy', kind: 'wight', x: 8, y: 14 });
  g.add({ t: 'enemy', kind: 'conjurer', x: 23, y: 14 });
  g.add({ t: 'chest', id: 'crypt2', x: 2, y: 16, lock: 'med', loot: [{ item: 'steel_sword' }, { item: 'iron_greatsword' }, { arrows: 12 }] });
  g.add({ t: 'chest', id: 'crypt3', x: 29, y: 16, lock: 'hard', loot: [{ item: 'mana_ring' }, { item: 'mp_potion', n: 2 }] });
  g.add({ t: 'pickup', x: 15, y: 40, spec: { type: 'item', id: 'sp_potion' } });
  g.add({ t: 'pickup', x: 15, y: 27, spec: { type: 'arrows', n: 6 } });
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
  g.add({ t: 'boss', kind: 'grimfang', x: 24, y: 5 });
  for (const [x, y, item] of [[14, 13, 'frost_lily'], [33, 13, 'frost_lily'], [14, 27, 'frost_lily'], [34, 27, 'frost_lily'], [40, 30, 'snowberry'], [8, 32, 'snowberry']]) g.add({ t: 'herb', item, x, y });
  g.add({ t: 'pickup', x: 22, y: 31, spec: { type: 'arrows', n: 8 } });
  g.add({ t: 'pickup', x: 13, y: 22, spec: { type: 'item', id: 'hp_potion_g' } });
  for (const [x, y, skin] of [[11, 30, 'barrel'], [38, 31, 'pot'], [12, 8, 'pot']]) g.add({ t: 'pot', x, y, skin });
  return g.out();
}
MAPS.pass = { name: 'Frostwind Pass', snow: true, ambience: 'wind', build: buildPass, music: 'pass', flag: 'pass', dim: 0.1,
  bossTrigger: (pc, T) => pc.y < 11 * T && pc.x > 9 * T && pc.x < 39 * T };
