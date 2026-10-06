// Emberhold, the forge-city under the Ashen Peaks: one outdoor map (five districts) and its interiors.
import { TILE } from '../config.js';
import { Grid } from './mapkit.js';

function house(g, x, y, w, rows, doorX, winXs) {
  g.rect(x, y, w, rows, TILE.ROOF);
  g.rect(x, y + rows, w, 2, TILE.CWALL);
  for (const wx of winXs) g.set(wx, y + rows, TILE.WINDOW);
  g.set(doorX, y + rows + 1, TILE.DOOR);
  g.reserve(x - 1, y - 1, w + 2, rows + 4);
}
function eroom(w, h) {
  const g = new Grid(w, h, TILE.CWALL);
  g.rect(1, 2, w - 2, h - 3, TILE.CFLOOR);
  g.noise(TILE.CFLOOR2, 0.12, 21, TILE.CFLOOR);
  return g;
}

// Where things are in the city (tile coordinates), shared with quests and tests.
export const EMBERHOLD = {
  gate: { x: 6, y: 29 }, mines: { x: 70, y: 52 }, court: { x: 45, y: 7 }, forge: { x: 15, y: 11 }, guild: { x: 59, y: 43 }, plaza: { x: 43, y: 30 },
};

export function buildEmberhold() {
  const W = 88, H = 60;
  const g = new Grid(W, H, TILE.CFLOOR);
  g.noise(TILE.CFLOOR2, 0.16, 31, TILE.CFLOOR);
  g.border(TILE.STONE, 3);
  // roads and the plaza (Ashfall Market)
  g.rect(3, 28, 82, 3, TILE.PATH);
  g.rect(30, 22, 26, 16, TILE.PATH);
  g.rect(14, 11, 2, 18, TILE.PATH);
  g.rect(44, 7, 2, 16, TILE.PATH);
  g.rect(30, 13, 2, 9, TILE.PATH);
  g.rect(70, 38, 2, 14, TILE.PATH);
  g.rect(12, 38, 2, 0, TILE.PATH);
  g.rect(13, 39, 2, 0, TILE.PATH);
  // Forge Row
  house(g, 8, 6, 14, 3, 15, [10, 19]);                // Brannoch's forge
  house(g, 26, 8, 9, 3, 30, [28, 33]);                // the rune-cutter
  // the Court of Anvils
  house(g, 36, 2, 20, 3, 45, [39, 42, 48, 52]);
  // Delvers' Quarter
  house(g, 52, 38, 14, 3, 59, [54, 63]);              // guild hall
  house(g, 74, 38, 11, 3, 79, [76, 82]);              // the Last Lantern
  // wardens' post by the gate and the house for sale
  house(g, 8, 34, 12, 3, 13, [10, 16]);
  house(g, 26, 42, 10, 2, 30, [28, 33]);
  g.rect(13, 38, 2, 8, TILE.PATH); g.rect(30, 45, 2, 6, TILE.PATH);
  g.rect(13, 28, 2, 7, TILE.PATH);
  // the shrine of the First Flame
  g.rect(58, 8, 10, 9, TILE.CFLOOR2);
  for (const [dx, dy] of [[0, 0], [9, 0], [0, 8], [9, 8]]) g.set(58 + dx, 8 + dy, TILE.PILLAR);
  g.set(62, 12, TILE.BRAZIER); g.set(63, 12, TILE.BRAZIER);
  g.rect(60, 17, 6, 11, TILE.PATH);
  // the mine gate
  g.rect(65, 47, 12, 8, TILE.STONE); g.rect(67, 49, 8, 6, TILE.CFLOOR2); g.set(70, 49, TILE.STAIRS); g.set(71, 49, TILE.STAIRS);
  for (const dx of [-1, 2, 5, 8]) g.set(66 + dx, 49, TILE.PILLAR);
  g.rect(70, 50, 2, 4, TILE.PATH);
  // market stalls (fences) and braziers
  for (const [x, y] of [[32, 24], [36, 24], [48, 24], [52, 24], [32, 34], [36, 34], [48, 34], [52, 34]]) { g.rect(x, y, 3, 1, TILE.FENCE); }
  for (const [x, y] of [[42, 26], [45, 26], [42, 34], [45, 34]]) g.set(x, y, TILE.BRAZIER);
  // doors and spawns
  const door = (x, y, to, label, extra = {}) => { g.add({ t: 'door', x, y, to, spawn: 'in', label, ...extra }); g.add({ t: 'spawn', name: to, x, y: y + 1 }); };
  door(15, 10, 'forgehall', 'E: BRANNOCH\'S FORGE');
  door(30, 12, 'runehouse', 'E: RUNE-CUTTER');
  door(45, 6, 'courthall', 'E: COURT OF ANVILS');
  door(59, 42, 'guildhall', "E: DELVERS' HALL");
  door(79, 42, 'lantern', 'E: THE LAST LANTERN');
  door(13, 38, 'wardpost', "E: WARDENS' POST");
  door(30, 44, 'emberhouse', 'E: ENTER HOUSE', { price: 500, flag: 'emberHouse', house: 'HOUSE', houseName: 'A HOUSE ON ASHFALL STREET' });
  g.add({ t: 'spawn', name: 'gate', x: 6, y: 29 });
  g.add({ t: 'spawn', name: 'mines', x: 70, y: 52 });
  g.add({ t: 'exit', x: 3, y: 28, w: 1, h: 3, to: 'ashen', spawn: 'emberhold', fx: 'door' });
  g.add({ t: 'exit', x: 70, y: 49, w: 2, h: 1, to: 'mines0', spawn: 'entry', fx: 'door' });
  g.add({ t: 'sign', x: 5, y: 31, text: ['EMBERHOLD, THE FORGE-CITY.', 'THE FIRST FIRE SLEEPS UNDER THIS MOUNTAIN. KEEP YOUR VOICE LOW.'] });
  g.add({ t: 'sign', x: 69, y: 53, text: ['THE DEEP MINES.', 'THE LANTERNS WENT OUT. THE DELVERS WHO WENT AFTER THEM DID NOT COME BACK.'] });
  g.add({ t: 'sign', x: 47, y: 9, text: ['THE COURT OF ANVILS.', 'WHAT IS FORGED HERE IS FORGED FOR ALL TIME.'] });
  // fires (rest + fast travel) and glow
  g.add({ t: 'fire', x: 43, y: 30, rest: true, id: 'emberfire' }); g.set(43, 30, TILE.BRAZIER);
  g.add({ t: 'fire', x: 62, y: 18, rest: true, id: 'shrinefire' });
  g.add({ t: 'fire', x: 8, y: 30, rest: true, id: 'gatefire' });
  for (const [x, y, r, col] of [[43, 30, 70, 12], [62, 12, 54, 12], [8, 30, 44, 12], [15, 9, 36, 12], [59, 41, 30, 13], [79, 41, 30, 13], [70, 48, 44, 12], [45, 5, 40, 13]]) g.add({ t: 'glow', x, y, r, col });
  for (const [x, y] of [[42, 26], [45, 26], [42, 34], [45, 34]]) g.add({ t: 'glow', x, y, r: 26, col: 12 });
  // the people of Emberhold (outdoors); the rest stand in their halls
  for (const [id, x, y] of [['hesper', 9, 32], ['corvin', 11, 27], ['pell', 38, 29], ['rook', 55, 27], ['dunmar', 34, 26], ['hildsoot', 50, 26], ['nessa', 38, 32], ['varro', 52, 32], ['ketil', 41, 31], ['aurel', 62, 14], ['brisa', 28, 47], ['goran', 17, 20], ['garrow', 69, 48]]) g.add({ t: 'npc', id, x, y });
  for (const [x, y, skin] of [[16, 14, 'barrel'], [12, 20, 'pot'], [47, 19, 'pot'], [53, 29, 'barrel'], [34, 36, 'pot'], [50, 36, 'barrel'], [66, 36, 'pot'], [60, 30, 'pot']]) g.add({ t: 'pot', x, y, skin });
  g.add({ t: 'prop', tex: 'anvil', x: 17, y: 12 });
  for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) g.res[y][x] = true;
  g.dress('crypt');
  return g.out();
}

function interior(id) {
  const spawn = (g, to, spawnName) => { g.add({ t: 'spawn', name: 'in', x: 7, y: g.h - 4 }); g.add({ t: 'exit', x: 6, y: g.h - 3, w: 2, h: 1, to, spawn: spawnName, fx: 'door' }); };
  if (id === 'forgehall') {
    const g = eroom(20, 12);
    g.rect(2, 2, 16, 2, TILE.CFLOOR2);
    g.add({ t: 'prop', tex: 'anvil', x: 9, y: 5 }); g.set(5, 3, TILE.BRAZIER); g.set(14, 3, TILE.BRAZIER);
    g.add({ t: 'npc', id: 'brannoch', x: 10, y: 5 }); g.add({ t: 'npc', id: 'isolt', x: 14, y: 7 });
    g.add({ t: 'glow', x: 10, y: 4, r: 70, col: 12 });
    for (const [x, y] of [[3, 8], [16, 8]]) g.add({ t: 'pot', x, y, skin: 'barrel' });
    spawn(g, 'emberhold', 'forgehall'); return g.out();
  }
  if (id === 'runehouse') {
    const g = eroom(14, 10);
    g.add({ t: 'prop', tex: 'bookshelf', x: 3, y: 2 }); g.add({ t: 'prop', tex: 'table', x: 7, y: 5 });
    g.add({ t: 'npc', id: 'tamsin', x: 7, y: 4 }); g.add({ t: 'glow', x: 7, y: 4, r: 56, col: 15 });
    spawn(g, 'emberhold', 'runehouse'); return g.out();
  }
  if (id === 'courthall') {
    const g = eroom(26, 14);
    g.rect(10, 3, 6, 9, TILE.RUG);
    for (const x of [4, 21]) for (const y of [3, 9]) g.set(x, y, TILE.PILLAR);
    g.add({ t: 'npc', id: 'ysolde', x: 13, y: 4 }); g.add({ t: 'npc', id: 'thessaly', x: 5, y: 5 });
    g.add({ t: 'prop', tex: 'bookshelf', x: 3, y: 2 }); g.add({ t: 'prop', tex: 'bookshelf', x: 5, y: 2 });
    g.add({ t: 'glow', x: 13, y: 4, r: 70, col: 13 });
    g.add({ t: 'lore', id: 'chains', tex: 'bookshelf', x: 20, y: 2 });
    g.add({ t: 'spawn', name: 'in', x: 13, y: 10 }); g.add({ t: 'exit', x: 12, y: 11, w: 2, h: 1, to: 'emberhold', spawn: 'courthall', fx: 'door' });
    return g.out();
  }
  if (id === 'guildhall') {
    const g = eroom(20, 12);
    g.add({ t: 'prop', tex: 'table', x: 8, y: 5 }); g.add({ t: 'prop', tex: 'table', x: 9, y: 5 });
    g.add({ t: 'npc', id: 'orrin', x: 9, y: 4 }); g.add({ t: 'board', x: 14, y: 2 });
    for (const [x, y] of [[3, 3], [16, 3]]) g.set(x, y, TILE.BRAZIER);
    g.add({ t: 'glow', x: 9, y: 4, r: 60, col: 13 });
    spawn(g, 'emberhold', 'guildhall'); return g.out();
  }
  if (id === 'lantern') {
    const g = eroom(18, 11);
    for (const x of [4, 5, 9, 10, 13, 14]) g.add({ t: 'prop', tex: 'table', x, y: 6 });
    g.add({ t: 'npc', id: 'maelis', x: 8, y: 3 }); g.add({ t: 'fire', x: 14, y: 2, rest: true, id: 'lanternfire' }); g.set(14, 2, TILE.FIRE);
    g.add({ t: 'glow', x: 14, y: 3, r: 56, col: 12 });
    spawn(g, 'emberhold', 'lantern'); return g.out();
  }
  if (id === 'wardpost') {
    const g = eroom(16, 10);
    g.add({ t: 'prop', tex: 'table', x: 7, y: 4 }); g.add({ t: 'prop', tex: 'shelf', x: 3, y: 2 }); g.add({ t: 'board', x: 11, y: 2 });
    g.add({ t: 'glow', x: 8, y: 4, r: 50, col: 13 });
    spawn(g, 'emberhold', 'wardpost'); return g.out();
  }
  // emberhouse: a bed and a hearth
  const g = eroom(14, 10);
  g.add({ t: 'bed', x: 2, y: 2 }); g.add({ t: 'prop', tex: 'bed', x: 2, y: 2 });
  g.add({ t: 'fire', x: 7, y: 2, rest: true, id: 'emberhouse' }); g.set(7, 2, TILE.FIRE); g.add({ t: 'glow', x: 7, y: 3, r: 60, col: 12 });
  spawn(g, 'emberhold', 'emberhouse'); return g.out();
}

export const EMBER_INTERIORS = {
  forgehall: "Brannoch's Forge", runehouse: "Tamsin's Runehouse", courthall: 'The Court of Anvils',
  guildhall: "The Delvers' Hall", lantern: 'The Last Lantern', wardpost: "The Wardens' Post", emberhouse: 'A House on Ashfall Street',
};
export const buildEmberInterior = interior;
