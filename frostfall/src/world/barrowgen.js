// Procedural barrow dungeons: a chain of rooms (fight, trap, treasure, mini-boss) generated from the run seed.
// The layout and contents differ for every barrow and every new game.
import { Grid } from '../data/mapkit.js';
import { TILE } from '../config.js';
import { rng } from './worldgen.js';

const THEMES = [
  { id: 'draugr', name: 'Barrow of the Restless', mobs: ['draugr', 'warden', 'wight'] },
  { id: 'wolf', name: 'Den under the Hill', mobs: ['wolf', 'alpha', 'fencer'] },
  { id: 'bandit', name: 'Smugglers\' Hollow', mobs: ['bandit', 'archer', 'fencer', 'chief'] },
  { id: 'rime', name: 'Rimebound Vault', mobs: ['reaver', 'knight', 'conjurer', 'wight'] },
];

export function barrowTheme(seed, idx) { return THEMES[(Math.abs(seed) + idx * 7) % THEMES.length]; }

// tier 0..3 picks the mob strength; idx is 0..2
export function buildBarrow(seed, idx, tier) {
  const R = rng(seed * 31 + idx * 977 + 5);
  const theme = barrowTheme(seed, idx);
  const rooms = [];
  const W = 44, H = 20 + 12 * 3;
  const g = new Grid(W, H, TILE.CWALL);
  const n = 4 + Math.floor(R() * 2);                  // 4-5 rooms, bottom to top
  let y = H - 2, prevX = 22;
  for (let i = 0; i < n; i++) {
    const rw = 10 + Math.floor(R() * 12), rh = 7 + Math.floor(R() * 3);
    const rx = Math.max(2, Math.min(W - rw - 2, Math.floor(prevX - rw / 2 + (R() - 0.5) * 10)));
    const ry = y - rh;
    g.rect(rx, ry, rw, rh, TILE.CFLOOR);
    const room = { x: rx, y: ry, w: rw, h: rh, cx: rx + (rw >> 1), cy: ry + (rh >> 1), kind: i === 0 ? 'entry' : i === n - 1 ? 'boss' : ['fight', 'fight', 'trap', 'treasure'][Math.floor(R() * 4)] };
    if (rooms.length) {                               // corridor from the previous room up to this one
      const p = rooms[rooms.length - 1];
      const cx = Math.max(rx + 1, Math.min(rx + rw - 2, p.cx));
      g.rect(cx, room.y + room.h - 1, 2, p.y - (room.y + room.h) + 2, TILE.CFLOOR);
      room.door = { x: cx, y: p.y - 1 };
    }
    rooms.push(room);
    prevX = room.cx; y = ry - 3;
  }
  g.dress('crypt');
  const out = { grid: g.t, w: W, h: H };
  const mobs = theme.mobs;
  const pick = (a) => a[Math.floor(R() * a.length)];
  const ents = [];
  const add = (e) => ents.push(e);
  const e0 = rooms[0];
  add({ t: 'spawn', name: 'entry', x: e0.cx, y: e0.y + e0.h - 2 });
  add({ t: 'exit', x: e0.cx, y: e0.y + e0.h - 1, w: 2, h: 1, to: 'forest', spawn: 'barrow' + idx, fx: 'door' });
  g.set(e0.cx, e0.y + e0.h - 1, TILE.STAIRS); g.set(e0.cx + 1, e0.y + e0.h - 1, TILE.STAIRS);
  add({ t: 'fire', x: e0.x + 1, y: e0.y + 1, rest: true, id: 'barrow' + idx }); g.set(e0.x + 1, e0.y + 1, TILE.BRAZIER);
  add({ t: 'glow', x: e0.x + 1, y: e0.y + 1, r: 40, col: 12 });
  const foe = (kind, x, y, extra = {}) => add({ t: 'enemy', kind, x, y, tier, ...extra });
  rooms.forEach((r, i) => {
    if (i === 0) return;
    for (const [dx, dy] of [[1, 1], [r.w - 2, 1], [1, r.h - 2], [r.w - 2, r.h - 2]]) if (R() < 0.7) { g.set(r.x + dx, r.y + dy, TILE.PILLAR); }
    if (R() < 0.6) add({ t: 'glow', x: r.cx, y: r.cy, r: 36, col: R() < 0.5 ? 15 : 12 });
    if (r.kind === 'fight') {
      const count = 3 + Math.floor(R() * 3) + (tier > 1 ? 1 : 0);
      for (let k = 0; k < count; k++) foe(pick(mobs), r.x + 2 + Math.floor(R() * (r.w - 4)), r.y + 2 + Math.floor(R() * (r.h - 4)), { camp: `${theme.id}${idx}r${i}` });
      for (let k = 0; k < 3; k++) { const px = r.x + 1 + Math.floor(R() * (r.w - 2)), py = r.y + r.h - 2; if (g.t[py][px] === TILE.CFLOOR || g.t[py][px] === TILE.CFLOOR2) add({ t: 'pot', x: px, y: py, skin: 'urn' }); }
    } else if (r.kind === 'trap') {
      // three rune plates and a sealed chest alcove: a quick order puzzle
      const order = ['moon', 'crown', 'wolf'].sort(() => R() - 0.5);
      add({ t: 'plateorder', order });
      const names = { moon: 'MOON (BLUE)', crown: 'CROWN (GOLD)', wolf: 'WOLF (RED)' };
      add({ t: 'sign', x: r.x + 2, y: r.y + 2, text: [`THE RUNES REMEMBER: ${order.map((o) => names[o]).join(', THEN ')}.`] });
      ['moon', 'crown', 'wolf'].forEach((rune, k) => add({ t: 'plate', rune, x: r.x + 2 + k * Math.floor((r.w - 4) / 2), y: r.cy + 1 }));
      add({ t: 'vaultwall', x: r.x + r.w, y: r.cy });
      g.rect(r.x + r.w + 1, r.cy - 1, 3, 3, TILE.CFLOOR);
      add({ t: 'chest', id: `bt${idx}_${i}`, x: r.x + r.w + 2, y: r.cy, loot: [{ gen: tier + 1 }, { gen: tier }, { gold: 40 + tier * 30 }] });
      foe(pick(mobs), r.cx, r.y + 2, { camp: `${theme.id}${idx}r${i}` });
    } else if (r.kind === 'treasure') {
      add({ t: 'chest', id: `bt${idx}_${i}a`, x: r.cx - 1, y: r.cy, lock: 'med', loot: [{ gen: tier }, { gold: 30 + tier * 20 }, { item: 'hp_potion', n: 2 }] });
      add({ t: 'chest', id: `bt${idx}_${i}b`, x: r.cx + 1, y: r.cy, loot: [{ item: 'sp_potion' }, { arrows: 8 }, { gold: 25 }] });
      for (let k = 0; k < 2; k++) foe(pick(mobs), r.x + 2 + k * (r.w - 5), r.y + 2, { camp: `${theme.id}${idx}r${i}` });
    } else if (r.kind === 'boss') {
      add({ t: 'enemy', kind: pick(mobs.filter((m) => m !== 'wolf' && m !== 'archer').concat(['warden'])), x: r.cx, y: r.cy, tier: tier + 1, elite: true, champion: true, camp: `${theme.id}${idx}boss` });
      foe(pick(mobs), r.x + 2, r.y + 2, { camp: `${theme.id}${idx}boss` }); foe(pick(mobs), r.x + r.w - 3, r.y + 2, { camp: `${theme.id}${idx}boss` });
      add({ t: 'chest', id: `bt${idx}_boss`, x: r.cx, y: r.y + 1, loot: [{ gen: tier + 1, rarity: 2 }, { gen: tier + 1 }, { gold: 80 + tier * 50 }, { item: 'hp_potion_g', n: 2 }] });
      add({ t: 'glow', x: r.cx, y: r.y + 1, r: 40, col: 13 });
    }
  });
  add({ t: 'sign', x: e0.cx - 3, y: e0.y + e0.h - 3, text: [theme.name.toUpperCase(), 'THE DEAD HERE ARE NOT THE ONES YOU MET BEFORE.'] });
  return { ...out, entities: ents, title: theme.name };
}
