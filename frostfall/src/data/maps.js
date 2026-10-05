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
  g.scatter(TILE.PINE, 34, 3);
  g.scatter(TILE.ROCK, 8, 4);
  g.add({ t: 'spawn', name: 'start', x: 19, y: 15 });
  g.add({ t: 'spawn', name: 'east', x: 37, y: 13 });
  g.add({ t: 'fire', x: 19, y: 13 });
  g.add({ t: 'exit', x: 38, y: 12, w: 2, h: 3, to: 'forest', spawn: 'west' });
  g.add({ t: 'glow', x: 19, y: 13, r: 52, col: 12 });
  g.add({ t: 'glow', x: 32, y: 8, r: 24, col: 13 });
  g.add({ t: 'glow', x: 19, y: 7, r: 24, col: 13 });
  return g.out();
}

export const MAPS = {
  village: { name: 'Hollowfrost Village', snow: true, build: buildVillage, tint: 0, music: 'village' },
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
  g.scatter(TILE.PINE, 250, 21);
  g.scatter(TILE.ROCK, 22, 22);
  g.add({ t: 'spawn', name: 'west', x: 3, y: 15 });
  g.add({ t: 'spawn', name: 'crypt', x: 46, y: 4 });
  g.add({ t: 'exit', x: 0, y: 14, w: 2, h: 3, to: 'village', spawn: 'east' });
  g.add({ t: 'exit', x: 46, y: 2, w: 1, h: 1, to: 'crypt', spawn: 'entry', fx: 'door' });
  g.add({ t: 'fire', x: 46, y: 23 });
  g.add({ t: 'glow', x: 46, y: 23, r: 56, col: 12 });
  g.add({ t: 'glow', x: 45, y: 3, r: 26, col: 12 });
  g.add({ t: 'glow', x: 47, y: 3, r: 26, col: 12 });
  // wolves
  for (const [x, y] of [[11, 10], [13, 11], [15, 9], [30, 12], [32, 13], [20, 22]]) g.add({ t: 'enemy', kind: 'wolf', x, y });
  // bandits
  for (const [x, y] of [[43, 21], [49, 22], [45, 26]]) g.add({ t: 'enemy', kind: 'bandit', x, y });
  for (const [x, y] of [[51, 20], [42, 26]]) g.add({ t: 'enemy', kind: 'archer', x, y });
  // loot
  g.add({ t: 'chest', id: 'camp', x: 50, y: 26, loot: [{ item: 'iron_cuirass' }, { item: 'hp_potion', n: 2 }, { gold: 45 }] });
  g.add({ t: 'chest', id: 'glade', x: 6, y: 6, loot: [{ item: 'bear_charm' }, { arrows: 10 }] });
  g.add({ t: 'pickup', x: 6, y: 16, spec: { type: 'arrows', n: 6 } });
  g.add({ t: 'pickup', x: 20, y: 14, spec: { type: 'item', id: 'hp_potion' } });
  g.add({ t: 'pickup', x: 36, y: 7, spec: { type: 'arrows', n: 5 } });
  return g.out();
}

MAPS.forest = { name: 'Pine Forest', snow: true, build: buildForest, music: 'forest', dim: 0.12 };
