// Procedural barrow dungeons: a chain of rooms (fight, trap, treasure, mini-boss) generated from the run seed.
// The layout and contents differ for every barrow and every new game.
import { Grid } from '../data/mapkit.js';
import { TILE, SOLID_TILES } from '../config.js';
import { rng } from './worldgen.js';
import { dressSpecialRoom, runeCarving } from './roomkinds.js';

const THEMES = [
  { id: 'draugr', name: 'Barrow of the Restless', mobs: ['draugr', 'warden', 'wight'] },
  { id: 'wolf', name: 'Den under the Hill', mobs: ['wolf', 'alpha', 'fencer'] },
  { id: 'bandit', name: 'Smugglers\' Hollow', mobs: ['bandit', 'archer', 'fencer', 'chief'] },
  { id: 'rime', name: 'Rimebound Vault', mobs: ['reaver', 'knight', 'conjurer', 'wight'] },
  { id: 'mine', name: 'The Frozen Mine', mobs: ['golem', 'frostworm', 'imp', 'necro'] },
  { id: 'warren', name: 'The Beast Warren', mobs: ['bear', 'boar', 'lynx', 'alpha'] },
];

export const THEME_HELM = { vale: 'leaf_cowl', dune: 'veil_helm', draugr: 'nordic_helm', rime: 'rime_helm', wolf: 'pale_cowl', bandit: 'hunter_hood', warren: 'clan_skull' };
export const THEME_UNIQUE = { draugr: 'grave_brand', wolf: 'packbreaker', bandit: 'smuggler_cloak', rime: 'rimebound_mail', mine: 'delvers_charm', warren: 'bearclaw_charm', cinder: 'cinder_brooch', sea: 'tide_talisman', royal: 'court_ring', bog: 'bogfire_ring', storm: 'stormglass_amulet', vale: 'bloom_charm', dune: 'scarab_charm' };
// WQ23: the brazier puzzle's beasts and the carving that gives their order
export const BRAZIER_BEASTS = ['hawk', 'stag', 'serpent'];
const BEAST_LINE = { hawk: 'THE HAWK SAW THE DAWN', stag: 'THE STAG CALLED THE HERD', serpent: 'THE SERPENT WOKE' };
export const brazierCarving = (o) => ['A CARVING OF THREE FIRES:', `FIRST ${BEAST_LINE[o[0]]}, THEN ${BEAST_LINE[o[1]]}, AND LAST ${BEAST_LINE[o[2]]}.`];
export function barrowTheme(seed, idx) { return THEMES[(Math.abs(seed) + idx * 7) % THEMES.length]; }
// Themes for the delves of the other regions (chosen by the region, not the seed).
export const EXTRA_THEMES = {
  cinder: { id: 'cinder', name: 'The Cinder Warren', mobs: ['imp', 'golem', 'conjurer', 'knight'] },
  sea: { id: 'sea', name: 'The Tidecaves', mobs: ['draugr', 'wight', 'frostworm', 'warden', 'reaver'] },
  glass: { id: 'glass', name: 'The Glass Hollows', mobs: ['glimmerkin', 'crystalgolem', 'glassstag', 'wisp', 'warden'] },
  deep: { id: 'deep', name: 'The Deep Galleries', mobs: ['caveweaver', 'lodeling', 'deepdelver', 'gloomcap', 'golem'] },
  bog: { id: 'bog', name: 'The Sunken Hollow', mobs: ['leech', 'mudlurker', 'bogwraith', 'boghag', 'draugr'] },
  storm: { id: 'storm', name: 'The Shepherd Caves', mobs: ['nomad', 'wolf', 'nomadshaman', 'thunderbird', 'stonegiant'] },
  vale: { id: 'vale', name: 'The Root Burrows', mobs: ['thornling', 'hornet', 'thornboar', 'hedgeknight', 'dewsprite'] },
  dune: { id: 'dune', name: 'The Sand Tombs', mobs: ['scorpion', 'wrapped', 'sandburrower', 'jackal', 'duneraider'] },
  royal: { id: 'royal', name: 'The Undercrypts', mobs: ['knight', 'warden', 'reaver', 'necro', 'conjurer', 'wight'] },
};

// tier 0..3 picks the mob strength; idx is 0..2
// o: { theme: key of EXTRA_THEMES, home: map to leave to, spawn: spawn name there }
export function buildBarrow(seed, idx, tier, o = {}) {
  const R = rng(seed * 31 + idx * 977 + 5);
  const theme = o.theme ? EXTRA_THEMES[o.theme] : barrowTheme(seed, idx);
  const rooms = [];
  const W = 44, H = 72;                // tall enough for five rooms of nine rows and the gaps between
  const g = new Grid(W, H, TILE.CWALL);
  const n = 4 + Math.floor(R() * 2);                  // 4-5 rooms, bottom to top
  let y = H - 2, prevX = 22;
  for (let i = 0; i < n; i++) {
    const rw = 10 + Math.floor(R() * 12), rh = 7 + Math.floor(R() * 3);
    const rx = Math.max(2, Math.min(W - rw - 2, Math.floor(prevX - rw / 2 + (R() - 0.5) * 10)));
    const ry = y - rh;
    g.rect(rx, ry, rw, rh, TILE.CFLOOR);
    const room = { x: rx, y: ry, w: rw, h: rh, cx: rx + (rw >> 1), cy: ry + (rh >> 1), kind: i === 0 ? 'entry' : i === n - 1 ? 'boss' : ['fight', 'fight', 'trap', 'treasure', 'ambush', 'spikes', 'flood'][Math.floor(R() * 7)] };
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
  add({ t: 'exit', x: e0.cx, y: e0.y + e0.h - 1, w: 2, h: 1, to: o.home || 'forest', spawn: o.spawn || 'barrow' + idx, fx: 'door' });
  g.set(e0.cx, e0.y + e0.h - 1, TILE.STAIRS); g.set(e0.cx + 1, e0.y + e0.h - 1, TILE.STAIRS);
  add({ t: 'fire', x: e0.x + 1, y: e0.y + 1, rest: true, id: 'barrow' + idx }); g.set(e0.x + 1, e0.y + 1, TILE.BRAZIER);
  add({ t: 'glow', x: e0.x + 1, y: e0.y + 1, r: 40, col: 12 });
  const foe = (kind, x, y, extra = {}) => add({ t: 'enemy', kind, x, y, tier, ...extra });
  rooms.forEach((r, i) => {
    if (i === 0) return;
    for (const [dx, dy] of [[1, 1], [r.w - 2, 1], [1, r.h - 2], [r.w - 2, r.h - 2]]) if (R() < 0.7) { g.set(r.x + dx, r.y + dy, TILE.PILLAR); }
    if (R() < 0.6) add({ t: 'glow', x: r.cx, y: r.cy, r: 36, col: R() < 0.5 ? 15 : 12 });
    if (dressSpecialRoom(r, { g, add, foe, R, tier, mobs, pick, key: `${theme.id}${idx}r${i}` })) return;
    if (r.kind === 'fight') {
      const count = 3 + Math.floor(R() * 3) + (tier > 1 ? 1 : 0);
      for (let k = 0; k < count; k++) foe(pick(mobs), r.x + 2 + Math.floor(R() * (r.w - 4)), r.y + 2 + Math.floor(R() * (r.h - 4)), { camp: `${theme.id}${idx}r${i}` });
      for (let k = 0; k < 3; k++) { const px = r.x + 1 + Math.floor(R() * (r.w - 2)), py = r.y + r.h - 2; if (g.t[py][px] === TILE.CFLOOR || g.t[py][px] === TILE.CFLOOR2) add({ t: 'pot', x: px, y: py, skin: 'urn' }); }
    } else if (r.kind === 'trap') {
      // three rune plates and a sealed chest alcove: a quick order puzzle
      const order = ['moon', 'crown', 'wolf'].sort(() => R() - 0.5);
      add({ t: 'plateorder', order });
      // WQ14: the order is carved in the room before, as a little story; this room only says that it was
      const pr = rooms[i - 1];
      add({ t: 'sign', x: pr.x + pr.w - 3, y: pr.y + 2, text: runeCarving(order) });
      add({ t: 'sign', x: r.x + 2, y: r.y + 2, text: ['THREE RUNE PLATES, AND A SEALED DOOR.', 'THE ORDER WAS CARVED ON THE WAY IN. A WRONG STEP BITES.'] });
      ['moon', 'crown', 'wolf'].forEach((rune, k) => add({ t: 'plate', rune, x: r.x + 2 + k * Math.floor((r.w - 4) / 2), y: r.cy + 1 }));
      // the sealed alcove goes on whichever side of the room has space for it
      const east = r.x + r.w + 4 < W - 1, wx = east ? r.x + r.w : r.x - 1, ax = east ? r.x + r.w + 1 : r.x - 4;
      add({ t: 'vaultwall', x: wx, y: r.cy });
      g.rect(ax, r.cy - 1, 3, 3, TILE.CFLOOR);
      add({ t: 'chest', id: `bt${idx}_${i}`, x: east ? ax + 1 : ax + 1, y: r.cy, loot: [{ gen: tier + 1 }, { gen: tier }, { gold: 40 + tier * 30 }] });
      foe(pick(mobs), r.cx, r.y + 2, { camp: `${theme.id}${idx}r${i}` });
    } else if (r.kind === 'treasure') {
      add({ t: 'chest', id: `bt${idx}_${i}a`, x: r.cx - 1, y: r.cy, lock: 'med', loot: [{ gen: tier }, { gold: 30 + tier * 20 }, { item: 'hp_potion', n: 2 }] });
      add({ t: 'chest', id: `bt${idx}_${i}b`, x: r.cx + 1, y: r.cy, loot: [{ item: 'sp_potion' }, { arrows: 8 }, { gold: 25 }] });
      for (let k = 0; k < 2; k++) foe(pick(mobs), r.x + 2 + k * (r.w - 5), r.y + 2, { camp: `${theme.id}${idx}r${i}` });
    } else if (r.kind === 'boss') {
      add({ t: 'enemy', kind: pick(mobs.filter((m) => m !== 'wolf' && m !== 'archer').concat(['warden'])), x: r.cx, y: r.cy, tier: tier + 1, elite: true, champion: true, camp: `${theme.id}${idx}boss` });
      foe(pick(mobs), r.x + 2, r.y + 2, { camp: `${theme.id}${idx}boss` }); foe(pick(mobs), r.x + r.w - 3, r.y + 2, { camp: `${theme.id}${idx}boss` });
      add({ t: 'chest', id: `bt${idx}_boss`, x: r.cx, y: r.y + 1, loot: [{ gen: tier + 1, rarity: 2 }, { item: THEME_UNIQUE[theme.id] }, ...(THEME_HELM[theme.id] ? [{ item: THEME_HELM[theme.id] }] : []), { gold: 80 + tier * 50 }, { item: 'hp_potion_g', n: 2 }] });
      add({ t: 'glow', x: r.cx, y: r.y + 1, r: 40, col: 13 });
    }
  });
  add({ t: 'sign', x: e0.cx - 3, y: e0.y + e0.h - 3, text: [theme.name.toUpperCase(), 'THE DEAD HERE ARE NOT THE ONES YOU MET BEFORE.'] });
  // ---- WQ23: a shape to the delve. A side room barred by a gate whose key waits deeper in; a cracked wall that breaks to a
  // secret room; and a stair in the boss room that takes you straight back out (no walk back through every room).
  const solidAll = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || g.t[y][x] !== TILE.CWALL && g.t[y][x] !== TILE.CWALL2) return false; return true; };
  const alcove = (r) => {
    for (const east of [R() < 0.5, true, false]) {
      const wx = east ? r.x + r.w : r.x - 1, ax = east ? r.x + r.w + 1 : r.x - 4;
      if (!solidAll(east ? wx : ax - 1, r.cy - 2, 5, 5) || ents.some((e) => e.t === 'vaultwall' && e.y === r.cy && Math.abs(e.x - wx) < 6)) continue;
      g.rect(ax, r.cy - 1, 3, 3, TILE.CFLOOR);
      return { wx, ax };
    }
    return null;
  };
  const mid = rooms.filter((r, i) => i > 0 && r.kind !== 'boss' && r.kind !== 'trap');
  // the first open floor cell of a room from its top-left corner (its corner can be pillar or wall), with no entity on it
  const openCell = (r) => { for (let yy = r.y + 1; yy < r.y + r.h - 1; yy++) for (let xx = r.x + 1; xx < r.x + r.w - 1; xx++) if (!SOLID_TILES.includes(g.t[yy][xx]) && !ents.some((e) => e.x === xx && e.y === yy)) return { x: xx, y: yy }; return null; };
  const branchRoom = mid[0], keyRoom = rooms[rooms.length - 2], secretRoom = mid[mid.length - 1];
  if (branchRoom && keyRoom && keyRoom !== branchRoom && keyRoom.kind !== 'entry') {
    const a = alcove(branchRoom);
    if (a) {
      add({ t: 'keygate', id: `bk_${theme.id}${idx}_${tier}`, x: a.wx, y: branchRoom.cy, w: 1 });
      add({ t: 'chest', id: `bt${idx}_8`, x: a.ax + 1, y: branchRoom.cy, loot: [{ gen: tier + 1, rarity: 1 }, { gold: 50 + tier * 30 }, { item: 'hp_potion_g' }] });
      let kp = null;
      for (let yy = keyRoom.y + 1; yy < keyRoom.y + keyRoom.h - 1 && !kp; yy++) for (let xx = keyRoom.x + 1; xx < keyRoom.x + keyRoom.w - 1; xx++) if (g.t[yy][xx] === TILE.CFLOOR && !ents.some((e) => Math.abs(e.x - xx) < 2 && Math.abs(e.y - yy) < 2)) { kp = { x: xx, y: yy }; break; }
      if (kp) { add({ t: 'chest', id: `bt${idx}_key`, x: kp.x, y: kp.y, loot: [{ item: 'delve_key' }, { gold: 20 + tier * 10 }] }); const sp = openCell(branchRoom); if (sp) add({ t: 'sign', x: sp.x, y: sp.y, text: ['A BARRED SIDE DOOR.', 'THE KEY WENT DEEPER WITH THE LAST KEEPER. HE DID NOT COME BACK UP.'] }); }
      else { ents.splice(ents.findIndex((e) => e.t === 'keygate' && e.id.startsWith('bk_')), 1); }
    }
  }
  if (secretRoom && secretRoom !== branchRoom) {
    const a = alcove(secretRoom);
    if (a) {
      add({ t: 'crackwall', id: `cw_${theme.id}${idx}_${tier}_${secretRoom.cy}`, x: a.wx, y: secretRoom.cy });
      add({ t: 'chest', id: `bt${idx}_9`, x: a.ax + 1, y: secretRoom.cy, loot: [{ gen: tier + 1, rarity: 2 }, { gold: 60 + tier * 40 }] });
    }
  }
  // WQ23: a brazier puzzle. Three braziers in a fight room, each carved with a beast; a carving in the room before tells the
  // order to light them (a blow, a fire spell or a torch); frost puts one out, and a wrong order wakes a guardian. The right
  // order opens a sealed alcove. No random draws here, so every other room of the delve comes out as before.
  const brzRoom = rooms.find((r, i) => i > 0 && r.kind === 'fight' && r.w >= 11);
  if (brzRoom) {
    const a = alcove(brzRoom), prev = rooms[rooms.indexOf(brzRoom) - 1], sp = prev && openCell(prev);
    if (a && sp) {
      const id = `bz_${theme.id}${idx}_${tier}_${brzRoom.cy}`, k0 = (Math.abs(seed) + idx) % 6;
      const order = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]][k0].map((k) => BRAZIER_BEASTS[k]);
      add({ t: 'brazierorder', id, order, wx: a.wx, wy: brzRoom.cy, guard: mobs[k0 % mobs.length], tier });
      BRAZIER_BEASTS.forEach((beast, k) => add({ t: 'brazier', id, beast, x: brzRoom.x + 3 + Math.floor(k * (brzRoom.w - 7) / 2), y: brzRoom.y + 2 }));
      add({ t: 'sign', x: sp.x, y: sp.y, text: brazierCarving(order) });
      add({ t: 'chest', id: `bt${idx}_7`, x: a.ax + 1, y: brzRoom.cy, loot: [{ gen: tier + 1, rarity: 1 }, { gold: 50 + tier * 30 }, { item: 'sp_potion' }] });
    }
  }
  const boss = rooms[rooms.length - 1];
  if (boss.kind === 'boss') {
    const sx = boss.x + 1, sy = boss.y + boss.h - 2;
    g.set(sx, sy, TILE.STAIRS);
    add({ t: 'exit', x: sx, y: sy, w: 1, h: 1, to: o.home || 'forest', spawn: o.spawn || 'barrow' + idx, fx: 'door', shortcut: true });
    add({ t: 'sign', x: sx + 1, y: sy - 1, text: ['A NARROW STAIR UP.', 'THE KEEPERS\' OWN WAY OUT. IT ONLY GOES ONE WAY.'] });
  }
  return { ...out, entities: ents, title: theme.name };
}
