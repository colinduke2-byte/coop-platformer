// Maps are built in code. Entities use tile coordinates (x, y = tile cell).
import { TILE } from '../config.js';
import { Grid } from './mapkit.js';

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
  for (let y = 2; y < 24; y++) for (let x = 2; x < 38; x++) g.res[y][x] = g.t[y][x] !== TILE.SNOW && g.t[y][x] !== TILE.SNOW2;
  for (let y = 9; y <= 18; y++) for (let x = 14; x <= 26; x++) g.res[y][x] = true;
  for (let x = 24; x < 38; x++) { g.res[12][x] = true; g.res[13][x] = true; g.res[14][x] = true; g.res[15][x] = true; }
  for (const [x, y] of [[36, 11], [34, 12], [24, 19], [16, 8], [22, 8], [4, 10], [10, 9], [31, 11], [34, 10], [13, 16], [26, 16], [27, 10], [24, 9]]) g.clear(x, y);
  g.scatter(TILE.PINE, 34, 3);
  g.scatter(TILE.ROCK, 8, 4);
  g.add({ t: 'npc', id: 'sigrid', x: 19, y: 9 });
  g.add({ t: 'npc', id: 'bjorn', x: 7, y: 11 });
  g.add({ t: 'npc', id: 'mirra', x: 32, y: 10 });
  g.add({ t: 'spawn', name: 'start', x: 19, y: 15 });
  g.add({ t: 'spawn', name: 'east', x: 37, y: 13 });
  g.add({ t: 'fire', x: 19, y: 13, rest: true });
  g.add({ t: 'npc', id: 'guard', x: 34, y: 12 });
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
  for (const [x, y] of [[5, 13], [22, 11]]) g.clear(x, y);
  g.scatter(TILE.PINE, 250, 21);
  g.scatter(TILE.ROCK, 22, 22);
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
  g.add({ t: 'chest', id: 'camp', x: 50, y: 26, loot: [{ item: 'iron_cuirass' }, { item: 'iron_shield' }, { item: 'hp_potion', n: 2 }, { gold: 45 }] });
  g.add({ t: 'chest', id: 'glade', x: 6, y: 6, loot: [{ item: 'bear_charm' }, { item: 'hunting_knife' }, { arrows: 10 }] });
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
    g.add({ t: 'fire', x, y });
    g.add({ t: 'glow', x, y, r: 46, col: 12 });
  }
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
  g.add({ t: 'chest', id: 'crypt2', x: 2, y: 16, loot: [{ item: 'steel_sword' }, { item: 'iron_greatsword' }, { arrows: 12 }] });
  g.add({ t: 'chest', id: 'crypt3', x: 29, y: 16, loot: [{ item: 'mana_ring' }, { item: 'mp_potion', n: 2 }] });
  g.add({ t: 'pickup', x: 15, y: 40, spec: { type: 'item', id: 'sp_potion' } });
  g.add({ t: 'pickup', x: 15, y: 27, spec: { type: 'arrows', n: 6 } });
  // boss hall
  g.add({ t: 'boss', x: 15, y: 4 });
  g.add({ t: 'bossgate', x: 15, y: 9, w: 2 });
  return g.out();
}
MAPS.crypt = { name: 'Crypt of the Hollow King', snow: false, ambience: 'crypt', build: buildCrypt, music: 'crypt', dim: 0.42, crypt: true };
