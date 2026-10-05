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
  g.add({ t: 'enemy', kind: 'draugr', x: 25, y: 17 }); // stage-2 test dummy
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
