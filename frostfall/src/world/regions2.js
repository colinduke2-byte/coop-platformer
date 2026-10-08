// Round 6: two more regions, reachable from the Hollow Reach from the very start (Skyrim style: you can walk there,
// the danger colours tell you if you should).
//   The Weeping Fens: a drowned bog of black water, boardwalks and lantern poles. Tier 1 to 3.
//   The Stormcrown Highlands: a wind-scoured plateau of heath and slate under a storm that never leaves. Tier 1 to 3.
import { TILE } from '../config.js';
import { hash } from '../util.js';
import { vnoise, tierFrom, regionExtras, REGION_DEFS, EXTRA_KIND_NAME } from './worldgen.js';

Object.assign(EXTRA_KIND_NAME, {
  peatfire: 'A PEAT FIRE', hagshut: "A HAG'S HUT", drownedshrine: 'A DROWNED SHRINE',
  hearthcamp: 'A CLAN HEARTH', giantcairn: "A GIANT'S CAIRN", stormcircle: 'A STORM CIRCLE',
});

const base1 = (f) => (x, y) => Math.min(3, 1 + f(x, y));       // these regions have no gentle end: the border is already tier 1

// ------------------------------------------------------------------------------------------------ the Weeping Fens
const FEN_START = { x: 6, y: 64 };
export const FENS = {
  id: 'fens', w: 260, h: 190, start: FEN_START, salt: 0xfe45, gap: 34, majorGap: 70,
  ground: TILE.BOG, ground2: TILE.MOSS, clear: TILE.BOARDWALK, caveSign: 'A SUNKEN HOLLOW. THE WATER IN IT IS WARM, AND IT LEANS TOWARD YOU.', flora: ['marsh_orchid', 'snowberry'], ores: ['iron_ingot', 'bone_dust'],
  mobs: [
    { melee: ['mudlurker', 'bandit', 'leech'], ranged: ['archer', 'bogwraith'], wild: ['leech', 'leech', 'mudlurker', 'boar'] },
    { melee: ['mudlurker', 'draugr', 'leech', 'warden'], ranged: ['bogwraith', 'boghag', 'archer'], wild: ['leech', 'leech', 'mudlurker', 'bogwraith', 'bear'] },
    { melee: ['mudlurker', 'warden', 'reaver', 'leech'], ranged: ['bogwraith', 'boghag', 'necro'], wild: ['leech', 'mudlurker', 'bogwraith', 'boghag', 'bear'] },
    { melee: ['mudlurker', 'reaver', 'warden', 'knight'], ranged: ['bogwraith', 'boghag', 'necro', 'wisp'], wild: ['mudlurker', 'bogwraith', 'boghag', 'bear', 'wisp'] },
  ],
  tierAt: base1(tierFrom(FEN_START, 60, 105, 150)),
  biome(seed) {
    const pool = (seed >> 3) % 991, hum = (seed >> 7) % 977, reed = (seed >> 11) % 983;
    return (x, y) => (vnoise(x, y, 11, pool) > 0.66 && x > 24 ? 'pool' : vnoise(x, y, 9, hum) > 0.6 ? 'hummock' : vnoise(x, y, 14, reed) > 0.58 ? 'reed' : 'bog');
  },
  paint(g, bio, W, H) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const b = bio[y][x];
      if (b === 'pool') g.t[y][x] = hash(x, y, 201) < 0.9 ? TILE.BLACKWATER : TILE.BOG;
      else if (b === 'hummock') g.t[y][x] = hash(x, y, 202) < 0.7 ? TILE.MOSS : TILE.BOG;
    }
  },
  nodes: [{ x: FEN_START.x + 8, y: FEN_START.y }],
  taken: [{ x: FEN_START.x, y: FEN_START.y, r: 14 }],
  plan(place, mustHave) {
    mustHave('reedwick', 12, 1);
    mustHave('mirebarrow', 12, 3, null, { x: 215, y: 100, r: 60 });
    place('cave', 3, 7); place('camp', 3, 11); place('hamlet', 1, 9); place('ruin', 3, 10); place('champion', 3, 8);
    place('peatfire', 4, 7); place('hagshut', 3, 9); place('drownedshrine', 3, 8);
    place('standing', 2, 8); place('rest', 8, 4); place('rest', 1, 4, { x: FEN_START.x + 22, y: FEN_START.y, r: 14 });
    place('cache', 3, 5); place('hermit', 1, 7); place('ancient', 1, 7);
  },
  dressers: {
    // a bog fire that has burned under the peat for a century: orchids bloom in its warmth, things gather to watch it
    peatfire({ p, g, add, enemy, chest, clearing, potsAround, FL, m }) {
      clearing(p, 11, 8, TILE.MOSS);
      for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) g.set(p.x + dx, p.y + dy, TILE.FIRE);
      add({ t: 'glow', x: p.x, y: p.y, r: 56, col: 12 });
      for (let i = 0; i < 4; i++) add({ t: 'herb', item: 'marsh_orchid', x: p.x + (i < 2 ? -4 : 4), y: p.y - 1 + (i % 2) * 3 });
      for (let i = 0; i < 2 + p.tier; i++) enemy(m.ranged[i % m.ranged.length], p.x + (i % 2 ? 3 : -3), p.y + 3, p.tier, { camp: p.id });
      chest(p, 0, 4, p.tier, 'med');
      add({ t: 'sign', x: p.x - 5, y: p.y + 1, text: ['A PEAT FIRE.', 'IT HAS BURNED BELOW THE BOG FOR A HUNDRED YEARS. THE ORCHIDS LIKE IT. SO DO OTHER THINGS.'] });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'ruin' });
    },
    // the hag's hut: a champion hag, her leeches, and a cauldron of ruined notes
    hagshut({ p, g, add, enemy, chest, clearing, potsAround, pickOf, m }) {
      clearing(p, 12, 9, TILE.BOARDWALK);
      g.rect(p.x - 3, p.y - 4, 7, 2, TILE.ROOF); g.rect(p.x - 3, p.y - 2, 7, 2, TILE.WOODWALL); g.set(p.x, p.y - 2, TILE.DOOR); g.set(p.x - 2, p.y - 2, TILE.WINDOW);
      add({ t: 'enemy', kind: 'boghag', x: p.x, y: p.y + 1, tier: p.tier + 1, elite: true, camp: p.id, champion: true });
      for (let i = 0; i < 3; i++) enemy('leech', p.x - 3 + i * 3, p.y + 3, p.tier, { camp: p.id });
      for (let i = 0; i < 2; i++) enemy(pickOf(m.melee), p.x + (i ? 5 : -5), p.y + 2, p.tier, { camp: p.id });
      chest(p, 4, 0, p.tier + 1, 'hard');
      add({ t: 'glow', x: p.x, y: p.y - 1, r: 38, col: 8 });
      add({ t: 'lore', id: 'hag' + (Number((p.id.match(/\d+$/) || ['0'])[0]) % 3), tex: 'book', x: p.x - 4, y: p.y + 1 });
      potsAround(p, 3, 4, 'urn');
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'champion' });
    },
    // a shrine half under the water, kept by wraiths
    drownedshrine({ p, g, add, enemy, chest, clearing, m }) {
      clearing(p, 11, 9, TILE.BOARDWALK);
      for (const [dx, dy] of [[-4, -3], [4, -3], [-4, 3], [4, 3]]) g.set(p.x + dx, p.y + dy, TILE.PILLAR);
      add({ t: 'shrine', id: p.id, x: p.x, y: p.y }); add({ t: 'glow', x: p.x, y: p.y, r: 46, col: 15 });
      for (let i = 0; i < 2 + p.tier; i++) enemy('bogwraith', p.x + Math.round((i % 3 - 1) * 4), p.y + 3, p.tier, { camp: p.id });
      chest(p, 0, 4, p.tier + 1, 'hard');
      add({ t: 'sign', x: p.x - 5, y: p.y + 1, text: ['A DROWNED SHRINE.', 'THE OFFERINGS ARE STILL DRY. THE WATER ROSE AROUND THEM AND THEN POLITELY STOPPED.'] });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'ruin' });
    },
  },
  extras: null,
  scenery(g, bio, W, H) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (g.res[y][x] || g.t[y][x] === TILE.PATH) continue;
      const r = hash(x, y, 203), t = g.t[y][x];
      if ((t === TILE.BOG || t === TILE.MOSS) && bio[y][x] !== 'pool') {
        if (bio[y][x] === 'reed' && r < 0.1) g.t[y][x] = r < 0.04 ? TILE.BOGTREE : TILE.BOGREED;
        else if (bio[y][x] === 'hummock' && r < 0.05) g.t[y][x] = r < 0.02 ? TILE.BOGTREE : TILE.PINE;
        else if (r < 0.012) g.t[y][x] = TILE.BOGREED;
      }
    }
  },
  // the roads are boardwalks over the black water
  finish(g, bio, W, H) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g.t[y][x] === TILE.PATH) g.t[y][x] = TILE.BOARDWALK;
  },
  dress: [],
};
FENS.extras = regionExtras({ start: FEN_START, exitTo: 'forest', exitSpawn: 'fenroad', fireId: 'fenfire', clear: TILE.BOARDWALK, mobs: FENS.mobs, tierAt: FENS.tierAt, nWild: 60,
  sign: ['THE WEEPING FENS.', 'THE ROAD NORTH RETURNS TO THE HOLLOW REACH. KEEP TO THE BOARDS. THE WATER WEEPS FOR A REASON.'], roamers: [['slough', 'troll', 3, 2, 5]] });

// ------------------------------------------------------------------------------------------------ the Stormcrown Highlands
const HIGH_START = { x: 6, y: 64 };
export const HIGHLANDS = {
  id: 'highlands', w: 260, h: 190, start: HIGH_START, salt: 0x5707, gap: 34, majorGap: 70,
  ground: TILE.HEATH, ground2: TILE.SLATE, clear: TILE.SLATE, pillar: TILE.HEATHROCK, caveSign: 'A SHEPHERD\'S CAVE IN THE SCREE. SOMETHING MADE IT ITS WINTER HOME.', flora: ['snowberry', 'frost_lily'], ores: ['iron_ingot', 'bone_dust'],
  mobs: [
    { melee: ['nomad', 'bandit', 'wolf'], ranged: ['archer', 'nomadshaman'], wild: ['wolf', 'thunderbird', 'boar', 'mammoth'] },
    { melee: ['nomad', 'fencer', 'warden', 'wolf'], ranged: ['archer', 'nomadshaman', 'wight'], wild: ['thunderbird', 'mammoth', 'lynx', 'bear', 'alpha'] },
    { melee: ['nomad', 'reaver', 'stonegiant', 'warden'], ranged: ['nomadshaman', 'conjurer', 'wisp'], wild: ['thunderbird', 'mammoth', 'bear', 'alpha', 'wyvern'] },
    { melee: ['stonegiant', 'reaver', 'knight', 'nomad'], ranged: ['nomadshaman', 'conjurer', 'wisp', 'necro'], wild: ['thunderbird', 'mammoth', 'alpha', 'wyvern'] },
  ],
  tierAt: base1(tierFrom(HIGH_START, 60, 105, 150)),
  biome(seed) {
    const cliff = (seed >> 3) % 991, scree = (seed >> 7) % 977, sno = (seed >> 11) % 983;
    return (x, y) => (vnoise(x, y, 15, cliff) > 0.66 && x > 24 ? 'cliff' : vnoise(x, y, 12, scree) > 0.58 ? 'scree' : vnoise(x, y, 16, sno) > 0.64 ? 'snow' : 'heath');
  },
  paint(g, bio, W, H) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const b = bio[y][x];
      if (b === 'cliff') g.t[y][x] = hash(x, y, 211) < 0.6 ? TILE.ROCK : (hash(x, y, 212) < 0.5 ? TILE.STONE : TILE.SLATE);
      else if (b === 'scree') g.t[y][x] = hash(x, y, 213) < 0.75 ? TILE.SLATE : TILE.HEATH;
      else if (b === 'snow') g.t[y][x] = hash(x, y, 214) < 0.8 ? TILE.SNOW : TILE.SNOW3;
    }
  },
  nodes: [{ x: HIGH_START.x + 8, y: HIGH_START.y }],
  taken: [{ x: HIGH_START.x, y: HIGH_START.y, r: 14 }],
  plan(place, mustHave) {
    mustHave('skarnhold', 12, 1);
    mustHave('stormspire', 12, 3, null, { x: 215, y: 95, r: 60 });
    place('cave', 3, 7); place('camp', 4, 11); place('hamlet', 1, 9); place('tower', 3, 7); place('champion', 3, 8); place('den', 2, 9);
    place('hearthcamp', 3, 9); place('giantcairn', 3, 9); place('stormcircle', 3, 8);
    place('standing', 2, 8); place('rest', 8, 4); place('rest', 1, 4, { x: HIGH_START.x + 22, y: HIGH_START.y, r: 14 });
    place('cache', 3, 5); place('hermit', 1, 7); place('ancient', 1, 7);
  },
  dressers: {
    // a clan hearth: a fire, a trader's tent, a few clanfolk and a shaman who knows the weather
    hearthcamp({ p, g, add, enemy, chest, clearing, potsAround, m }) {
      clearing(p, 13, 9, TILE.SLATE);
      g.set(p.x, p.y, TILE.FIRE);
      add({ t: 'fire', x: p.x, y: p.y, rest: true, id: p.id }); add({ t: 'glow', x: p.x, y: p.y, r: 56, col: 12 });
      g.rect(p.x - 5, p.y - 4, 4, 2, TILE.ROOF); g.rect(p.x + 3, p.y - 4, 4, 2, TILE.ROOF);
      add({ t: 'npc', id: 'clantrader', x: p.x + 2, y: p.y + 2 });
      chest(p, -4, 3, p.tier, 'med');
      potsAround(p, 3, 5, 'barrel');
      add({ t: 'sign', x: p.x - 3, y: p.y + 3, text: ['A CLAN HEARTH.', 'THE FIRE IS FOR ANYONE WHO BRINGS NO TROUBLE. THE ELDERS WATCH THE WEATHER FROM HERE.'] });
    },
    // a cairn of giant-stacked boulders: a stone giant sleeps against it
    giantcairn({ p, g, add, enemy, chest, clearing, potsAround, m }) {
      clearing(p, 13, 10, TILE.SLATE);
      for (const [dx, dy] of [[-4, -3], [4, -3], [-5, 0], [5, 0], [0, -4]]) g.set(p.x + dx, p.y + dy, TILE.ROCK);
      add({ t: 'enemy', kind: 'stonegiant', x: p.x, y: p.y, tier: p.tier + 1, elite: true, camp: p.id, champion: true });
      for (let i = 0; i < 2 + (p.tier > 1 ? 1 : 0); i++) enemy('thunderbird', p.x - 4 + i * 4, p.y + 4, p.tier, { camp: p.id });
      chest(p, 0, -2, p.tier + 1, 'hard');
      add({ t: 'lore', id: 'giant' + (Number((p.id.match(/\d+$/) || ['0'])[0]) % 3), tex: 'book', x: p.x + 3, y: p.y + 2 });
      add({ t: 'sign', x: p.x - 6, y: p.y + 2, text: ["A GIANT'S CAIRN.", 'EVERY STONE WAS PLACED BY HAND. IT WAS A VERY LARGE HAND.'] });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'champion' });
    },
    // a circle where lightning has struck a thousand times: a blessing, and the birds that follow the storm
    stormcircle({ p, g, add, enemy, chest, clearing, m }) {
      clearing(p, 12, 10, TILE.SLATE);
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.set(p.x + Math.round(Math.cos(a) * 4.4), p.y + Math.round(Math.sin(a) * 3.4), TILE.PILLAR); }
      add({ t: 'shrine', id: p.id, x: p.x, y: p.y }); add({ t: 'glow', x: p.x, y: p.y, r: 50, col: 15 });
      for (let i = 0; i < 2 + p.tier; i++) enemy(i % 2 ? 'nomadshaman' : 'thunderbird', p.x + Math.round((i - 1) * 4), p.y + 5, p.tier, { camp: p.id });
      chest(p, 0, 4, p.tier + 1, 'med');
      add({ t: 'sign', x: p.x - 5, y: p.y + 1, text: ['A STORM CIRCLE.', 'THE STONES ARE GLASS WHERE LIGHTNING STRUCK. STAND IN THE MIDDLE AND IT WILL NOT STRIKE YOU. PROBABLY.'] });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'ruin' });
    },
  },
  extras: null,
  scenery(g, bio, W, H) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (g.res[y][x] || g.t[y][x] === TILE.PATH) continue;
      const r = hash(x, y, 215), t = g.t[y][x];
      if (t === TILE.HEATH && r < 0.035) g.t[y][x] = TILE.HEATHROCK;
      else if (t === TILE.SLATE && r < 0.02) g.t[y][x] = TILE.HEATHROCK;
    }
  },
  dress: [],
};
HIGHLANDS.extras = regionExtras({ start: HIGH_START, exitTo: 'forest', exitSpawn: 'stormroad', fireId: 'stormfire', clear: TILE.SLATE, mobs: HIGHLANDS.mobs, tierAt: HIGHLANDS.tierAt, nWild: 60,
  sign: ['THE STORMCROWN HIGHLANDS.', 'THE PASS SOUTH RETURNS TO THE HOLLOW REACH. THE STORM ABOVE HAS NOT MOVED IN A HUNDRED YEARS.'], roamers: [['greytusk', 'mammoth', 3, 2, 5]] });

REGION_DEFS.fens = FENS;
REGION_DEFS.highlands = HIGHLANDS;
