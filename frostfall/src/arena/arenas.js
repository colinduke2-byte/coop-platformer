// Arena Mode rooms. Every room is 32x24 with the same walkable floor (3,3 to 28,20), so the wave spawn points and the
// player start work in all of them. `hazard` names a per-room danger handled in quickRun.js.
import { TILE } from '../config.js';
import { Grid } from '../data/mapkit.js';
import { MAPS } from '../data/maps.js';

const finish = (g, lights) => {
  g.add({ t: 'spawn', name: 'in', x: 16, y: 20 });
  for (const [x, y, r, col] of lights) g.add({ t: 'glow', x, y, r, col });
  return g.out();
};

function buildLake() {
  const g = new Grid(32, 24, TILE.ROCK);
  g.rect(3, 3, 26, 18, TILE.ICE);
  g.noise(TILE.ICE2, 0.3, 17, TILE.ICE);
  for (const [x, y] of [[9, 9], [22, 9], [9, 14], [22, 14]]) { g.rect(x, y, 2, 2, TILE.ROCK); }
  return finish(g, [[16, 12, 150, 15], [5, 5, 60, 15], [26, 18, 60, 15]]);
}
function buildFoundry() {
  const g = new Grid(32, 24, TILE.CWALL);
  g.rect(3, 3, 26, 18, TILE.ASH);
  g.noise(TILE.CFLOOR2, 0.3, 23, TILE.ASH);
  g.rect(3, 3, 26, 1, TILE.LAVA); g.rect(10, 10, 3, 2, TILE.LAVA); g.rect(19, 13, 3, 2, TILE.LAVA); g.rect(14, 16, 4, 1, TILE.LAVA);
  return finish(g, [[11, 11, 70, 12], [20, 14, 70, 12], [16, 6, 90, 12], [4, 19, 60, 12], [27, 19, 60, 12]]);
}
function buildCourt() {
  const g = new Grid(32, 24, TILE.RUINWALL);
  g.rect(3, 3, 26, 18, TILE.MARBLE);
  for (const [x, y] of [[8, 8], [23, 8], [8, 15], [23, 15], [12, 12], [19, 12], [14, 5], [17, 17], [5, 12], [26, 12]]) g.set(x, y, TILE.PILLAR);
  return finish(g, [[16, 12, 130, 14], [8, 8, 50, 14], [23, 8, 50, 14], [8, 15, 50, 14], [23, 15, 50, 14]]);
}

export const ARENAS = [
  { id: 'pit', name: 'HOLLOW PIT', map: 'pit', blurb: 'OPEN STONE FLOOR.' },
  { id: 'lake', name: 'FROZEN LAKE', map: 'pit_lake', blurb: 'ICE. NOTHING STOPS WHEN YOU DO.' },
  { id: 'foundry', name: 'EMBER FOUNDRY', map: 'pit_foundry', blurb: 'LAVA, AND EMBERS FROM ABOVE.' },
  { id: 'court', name: 'OLD COURT', map: 'pit_court', blurb: 'PILLARS TO HIDE BEHIND.' },
];
export const arenaById = (id) => ARENAS.find((a) => a.id === id) || ARENAS[0];

MAPS.pit_lake = { name: 'The Frozen Lake', snow: true, ambience: 'wind', build: buildLake, music: 'pass', dim: 0, arena: true, quick: true, hazard: null };
MAPS.pit_foundry = { name: 'The Ember Foundry', snow: false, ambience: 'crypt', build: buildFoundry, music: 'ashen', dim: 0.15, cave: true, arena: true, quick: true, hazard: 'embers' };
MAPS.pit_court = { name: 'The Old Court', snow: false, ambience: 'crypt', build: buildCourt, music: 'kingdom', dim: 0.15, cave: true, arena: true, quick: true, hazard: null };
