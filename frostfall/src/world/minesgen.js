// The Deep Mines under Emberhold: three floors of ore-vaults. Floors I and II are a chain of rooms (fight, rune-plate trap,
// treasure) with a stair down; floor III ends in the lair of Kragnar the Hollowed. Layout comes from the run seed.
import { Grid } from '../data/mapkit.js';
import { TILE } from '../config.js';
import { rng } from './worldgen.js';

export const MINE_FLOORS = 3;
const MOBS = [['imp', 'golem', 'bandit', 'archer'], ['golem', 'necro', 'wight', 'imp', 'warden'], ['golem', 'knight', 'imp', 'conjurer']];
const TITLES = ['The Deep Mines: First Delve', 'The Deep Mines: The Lanterns Gone Dark', 'The Deep Mines: Kragnar\'s Lode'];

export function buildMines(seed, floor, o = {}) {
  const R = rng(seed * 53 + floor * 1237 + 11);
  const W = 46, H = 22 + 12 * 3 + 8, tier = o.tier ?? 1 + floor;
  const g = new Grid(W, H, TILE.CWALL);
  const mobs = o.mobs || MOBS[floor], pick = (a) => a[Math.floor(R() * a.length)];
  const rooms = [], ents = [], add = (e) => ents.push(e);
  const finalBoss = o.boss === undefined ? (floor === 2 ? 'kragnar' : null) : o.boss;
  const n = o.rooms ?? (finalBoss ? 4 : 5);
  let y = H - 2, prevX = 23;
  for (let i = 0; i < n; i++) {
    const last = i === n - 1;
    const rw = last && finalBoss ? 26 : 10 + Math.floor(R() * 12), rh = last && finalBoss ? 12 : 7 + Math.floor(R() * 3);
    const rx = Math.max(2, Math.min(W - rw - 2, Math.floor(prevX - rw / 2 + (R() - 0.5) * 10)));
    const ry = y - rh;
    g.rect(rx, ry, rw, rh, TILE.CFLOOR);
    const room = { x: rx, y: ry, w: rw, h: rh, cx: rx + (rw >> 1), cy: ry + (rh >> 1), kind: i === 0 ? 'entry' : last ? (finalBoss ? 'boss' : 'stairs') : (o.kinds && o.kinds[i - 1]) || ['fight', 'fight', 'trap', 'treasure'][Math.floor(R() * 4)] };
    if (rooms.length) {
      const p = rooms[rooms.length - 1];
      const cx = Math.max(rx + 1, Math.min(rx + rw - 2, p.cx));
      g.rect(cx, room.y + room.h - 1, 2, p.y - (room.y + room.h) + 2, TILE.CFLOOR);
      room.door = { x: cx, y: p.y - 1 };
    }
    rooms.push(room);
    prevX = room.cx; y = ry - 3;
  }
  g.dress('crypt');
  // ore seams in the walls: rough rock and the odd glowing vein
  for (let k = 0; k < 40; k++) { const x = 2 + Math.floor(R() * (W - 4)), yy = 2 + Math.floor(R() * (H - 4)); if (g.t[yy][x] === TILE.CWALL) g.t[yy][x] = TILE.ROCK; }
  const foe = (kind, x, yy, extra = {}) => add({ t: 'enemy', kind, x, y: yy, tier, ...extra });
  const e0 = rooms[0];
  // up: the previous floor (floor I leads back to Emberhold)
  add({ t: 'spawn', name: 'entry', x: e0.cx, y: e0.y + e0.h - 2 });
  add({ t: 'exit', x: e0.cx, y: e0.y + e0.h - 1, w: 2, h: 1, to: o.exitTo ?? (floor === 0 ? 'emberhold' : 'mines' + (floor - 1)), spawn: o.exitSpawn ?? (floor === 0 ? 'mines' : 'down'), fx: 'door' });
  g.set(e0.cx, e0.y + e0.h - 1, TILE.STAIRS); g.set(e0.cx + 1, e0.y + e0.h - 1, TILE.STAIRS);
  add({ t: 'fire', x: e0.x + 1, y: e0.y + 1, rest: true, id: 'mines' + floor }); g.set(e0.x + 1, e0.y + 1, TILE.BRAZIER);
  add({ t: 'glow', x: e0.x + 1, y: e0.y + 1, r: 40, col: 12 });
  rooms.forEach((r, i) => {
    if (i === 0) return;
    for (const [dx, dy] of [[1, 1], [r.w - 2, 1], [1, r.h - 2], [r.w - 2, r.h - 2]]) if (R() < 0.7) g.set(r.x + dx, r.y + dy, TILE.PILLAR);
    if (R() < 0.7) add({ t: 'glow', x: r.cx, y: r.cy, r: 36, col: R() < 0.6 ? 12 : 15 });
    const ore = () => add({ t: 'node', x: r.x + 1 + Math.floor(R() * (r.w - 2)), y: r.y + 1 + Math.floor(R() * (r.h - 2)), ore: R() < 0.25 ? 'ember_ore' : 'ash_iron' });
    if (r.kind === 'fight') {
      const count = 3 + Math.floor(R() * 3) + Math.min(floor, 3);
      for (let k = 0; k < count; k++) foe(pick(mobs), r.x + 2 + Math.floor(R() * (r.w - 4)), r.y + 2 + Math.floor(R() * (r.h - 4)), { camp: `mine${floor}r${i}` });
      ore(); ore();
      for (let k = 0; k < 3; k++) { const px = r.x + 1 + Math.floor(R() * (r.w - 2)), py = r.y + r.h - 2; if (g.t[py][px] === TILE.CFLOOR || g.t[py][px] === TILE.CFLOOR2) add({ t: 'pot', x: px, y: py, skin: 'barrel' }); }
    } else if (r.kind === 'trap') {
      const order = ['moon', 'crown', 'wolf'].sort(() => R() - 0.5);
      add({ t: 'plateorder', order });
      const names = { moon: 'MOON (BLUE)', crown: 'CROWN (GOLD)', wolf: 'WOLF (RED)' };
      add({ t: 'sign', x: r.x + 2, y: r.y + 2, text: [`THE DELVERS SCRATCHED THIS ON THE WALL: ${order.map((o) => names[o]).join(', THEN ')}.`] });
      ['moon', 'crown', 'wolf'].forEach((rune, k) => add({ t: 'plate', rune, x: r.x + 2 + k * Math.floor((r.w - 4) / 2), y: r.cy + 1 }));
      add({ t: 'vaultwall', x: r.x + r.w, y: r.cy });
      g.rect(r.x + r.w + 1, r.cy - 1, 3, 3, TILE.CFLOOR);
      add({ t: 'chest', id: `mn${floor}_${i}`, x: r.x + r.w + 2, y: r.cy, loot: [{ gen: tier + 1 }, { item: 'ember_ore' }, { gold: 60 + tier * 30 }] });
      foe(pick(mobs), r.cx, r.y + 2, { camp: `mine${floor}r${i}` });
    } else if (r.kind === 'treasure') {
      add({ t: 'chest', id: `mn${floor}_${i}a`, x: r.cx - 1, y: r.cy, lock: 'med', loot: [{ gen: tier }, { item: pick(['gem_ruby', 'gem_sapphire', 'gem_emerald', 'gem_topaz', 'gem_amber']) }, { gold: 40 + tier * 25 }] });
      add({ t: 'chest', id: `mn${floor}_${i}b`, x: r.cx + 1, y: r.cy, loot: [{ item: 'hp_potion', n: 2 }, { item: 'ash_iron', n: 2 }, { arrows: 8 }] });
      for (let k = 0; k < 2; k++) foe(pick(mobs), r.x + 2 + k * (r.w - 5), r.y + 2, { camp: `mine${floor}r${i}` });
      ore();
    } else if (r.kind === 'stairs') {
      for (let k = 0; k < 3; k++) foe(pick(mobs), r.x + 2 + k * 3, r.y + 2, { camp: `mine${floor}r${i}` });
      g.set(r.cx, r.y, TILE.STAIRS); g.set(r.cx + 1, r.y, TILE.STAIRS);
      add({ t: 'exit', x: r.cx, y: r.y, w: 2, h: 1, to: 'mines' + (floor + 1), spawn: 'entry', fx: 'door' });
      add({ t: 'spawn', name: 'down', x: r.cx, y: r.y + 2 });
      add({ t: 'fire', x: r.x + 1, y: r.y + r.h - 2, rest: true, id: 'mines' + floor + 'b' }); g.set(r.x + 1, r.y + r.h - 2, TILE.BRAZIER);
      add({ t: 'chest', id: `mn${floor}_s`, x: r.x + r.w - 2, y: r.cy, loot: [{ gen: tier + 1 }, { gold: 70 + tier * 30 }, { item: 'hp_potion_g' }] });
    } else if (r.kind === 'boss') {
      g.rect(r.x + 2, r.y + 2, r.w - 4, r.h - 4, TILE.CFLOOR2);
      for (const dx of [3, r.w - 4]) for (const dy of [3, r.h - 4]) g.set(r.x + dx, r.y + dy, TILE.PILLAR);
      add({ t: 'bossgate', x: r.cx - 1, y: r.y + r.h - 1, w: 2 });
      add({ t: 'boss', kind: finalBoss, x: r.cx, y: r.y + 4 });
      add({ t: 'glow', x: r.cx, y: r.y + 4, r: 60, col: 12 });
      add({ t: 'sign', x: r.cx - 3, y: r.y + r.h - 3, text: o.bossSign || ["KRAGNAR'S LODE.", 'THE DELVERS BURIED THEIR KING HERE. SOMETHING STILL DIGS.'] });
      add({ t: 'chest', id: (o.id || 'mn') + '_boss', x: r.cx, y: r.y + 1, loot: o.bossLoot || [{ gen: 3, rarity: 2 }, { item: 'kragnar_core' }, { item: 'gem_ruby' }, { gold: 200 }] });
    }
  });
  add({ t: 'sign', x: e0.cx - 3, y: e0.y + e0.h - 3, text: [(o.title || TITLES[floor]).toUpperCase(), o.signLine || (floor === 0 ? 'THE LANTERNS ALONG THE ROAD WENT OUT ONE BY ONE.' : 'GO CAREFULLY. THE LODE REMEMBERS.')] });
  const bossRoom = rooms.find((r) => r.kind === 'boss') || null;
  return { grid: g.t, w: W, h: H, entities: ents, title: o.title || TITLES[floor], bossRoom };
}

// The Forge of the First Fire (Chapter 3): one long delve ending in the Ashen Sovereign's hall.
export function buildForge(seed) {
  return buildMines(seed, 7, {
    tier: 3, rooms: 5, kinds: ['fight', 'trap', 'fight'], boss: 'sovereign', id: 'fg', mobs: ['imp', 'golem', 'knight', 'conjurer', 'wisp', 'necro'], exitTo: 'ashen', exitSpawn: 'forge',
    title: 'The Forge of the First Fire', signLine: 'THE AIR SHIMMERS. THE ANVILS RING, AND NOTHING STRIKES THEM.',
    bossSign: ['THE SOVEREIGN\'S HALL.', 'THE FIRST FIRE WEARS A CROWN OF CINDERS. IT HAS WAITED A THOUSAND YEARS TO BE ASKED A QUESTION.'],
    bossLoot: [{ gen: 3, rarity: 2 }, { item: 'sovereign_heart' }, { item: 'gem_ruby' }, { item: 'gem_bloodstone' }, { gold: 400 }],
  });
}

// The Frozen Coast's boss delve: Tidebreak Cavern, ending in the Drowned Admiral.
export function buildTidebreak(seed) {
  return buildMines(seed, 8, {
    tier: 3, rooms: 5, kinds: ['fight', 'trap', 'fight'], boss: 'admiral', id: 'tb', mobs: ['draugr', 'wight', 'frostworm', 'warden', 'reaver'], exitTo: 'coast', exitSpawn: 'tidebreak',
    title: 'Tidebreak Cavern', signLine: 'WATER DRIPS UP. A SHIP\'S BELL RINGS, SOMEWHERE BELOW THE ICE.',
    bossSign: ['THE ADMIRAL\'S HOLD.', 'HE NEVER GAVE THE ORDER TO ABANDON SHIP. HE IS STILL WAITING FOR THE CREW.'],
    bossLoot: [{ gen: 3, rarity: 2 }, { item: 'admiral_cutlass' }, { item: 'gem_sapphire' }, { gold: 360 }],
  });
}
// The Old Kingdom's boss delve: the Hollow Sepulchre, ending in the last of the Hollow Kings.
export function buildSepulchre(seed) {
  return buildMines(seed, 9, {
    tier: 3, rooms: 5, kinds: ['fight', 'trap', 'fight'], boss: 'hollowking', id: 'sp', mobs: ['knight', 'warden', 'reaver', 'necro', 'conjurer', 'wight'], exitTo: 'kingdom', exitSpawn: 'sepulchre',
    title: 'The Hollow Sepulchre', signLine: 'EVERY NICHE IS EMPTY. THE KINGS ARE NOT IN THEIR TOMBS.',
    bossSign: ['THE HOLLOW THRONE.', 'THE LAST KING SITS A THRONE OF HIS OWN ROOTS. HE WOULD LIKE YOU TO REMEMBER HIS NAME.'],
    bossLoot: [{ gen: 3, rarity: 2 }, { item: 'kings_blade' }, { item: 'gem_bloodstone' }, { gold: 600 }],
  });
}
