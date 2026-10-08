// Round 6 (leftovers): two more regions and three gates.
//   The Glasswood: a crystalline forest of glass-barked trees and singing glades, west of nowhere in particular. Tier 1 to 3.
//   The Underdeep: the caverns under the Ashen Peaks, entered by the Deep Stair. Dark, fungal, tier 2 to 3 (plus a harder end).
//   Saltmarket: the Frozen Coast's harbour city (a hub map) and the Smugglers' Cove under it (a boss delve).
import { TILE } from '../config.js';
import { hash } from '../util.js';
import { vnoise, tierFrom, regionExtras, REGION_DEFS, REACH, ASHEN, COAST, EXTRA_KIND_NAME, EXTRA_GATES, FACADE_EXTRA, MAJOR } from './worldgen.js';

Object.assign(EXTRA_KIND_NAME, {
  glassroad: 'THE ROAD TO THE GLASSWOOD', lanternglade: 'A GLADE VILLAGE', hartspire: 'A GLASS SPIRE',
  deepdoor: 'THE DEEP STAIR', lanternfall: 'A CAVERN TOWN', lodenest: 'A CHASM OF RAW ORE',
  saltgate: 'A HARBOUR CITY', smugglercove: 'A SMUGGLERS\' COVE',
  crystalgrove: 'A GROVE OF CRYSTAL TREES', glimmerpool: 'A GLIMMERING POOL', antlerstone: 'AN ANTLER STONE',
  glowcapgrove: 'A GLOWCAP GROVE', weavernest: 'A WEAVER NEST', lodevein: 'A RICH ORE VEIN',
});
for (const k of ['glassroad', 'lanternglade', 'hartspire', 'deepdoor', 'lanternfall', 'lodenest', 'saltgate', 'smugglercove']) { MAJOR.add(k); FACADE_EXTRA.add(k); }

// How a gate looks and where it leads: { to: map id, col: glow colour, stone: facade tile, text, spawn: the spawn name this gate offers when you come back }
Object.assign(EXTRA_GATES, {
  glassroad: { to: 'glasswood', col: 15, stone: TILE.CRYSTAL, spawn: 'glassroad', text: ['THE ROAD TO THE GLASSWOOD.', 'THE TREES BEYOND HAVE BARK LIKE WINDOW-GLASS. THEY RING WHEN THE WIND TOUCHES THEM.'] },
  lanternglade: { to: 'lanternglade', col: 15, stone: TILE.WOODWALL, spawn: 'lanternglade', text: ['LANTERN GLADE.', 'LAMPS HUNG FROM THE CRYSTAL TREES. EVERY LAMP IS LIT BY SOMEONE WHO REMEMBERS IT.'] },
  hartspire: { to: 'hartspire', col: 15, stone: TILE.CRYSTAL, spawn: 'hartspire', text: ['THE HART SPIRE.', 'A TOWER OF GLASS GROWN AROUND AN ANTLER THE SIZE OF A MILL. SOMETHING WEARS THE REST OF IT.'] },
  deepdoor: { to: 'underdeep', col: 12, stone: TILE.BASALT, spawn: 'deepdoor', text: ['THE DEEP STAIR.', 'THE MINERS CAPPED IT WITH IRON AND A PRAYER. THE CAP HAS BEEN LIFTED FROM BELOW.'] },
  lanternfall: { to: 'lanternfall', col: 12, stone: TILE.STONE, spawn: 'lanternfall', text: ['LANTERNFALL.', 'THE LAST LANTERN OF THE DELVERS WHO WENT DOWN AND DID NOT STOP.'] },
  lodenest: { to: 'lodenest', col: 11, stone: TILE.BASALT, spawn: 'lodenest', text: ['THE LODE CHASM.', 'THE ORE HERE RUNS LIKE A VEIN IN A LIVING THING. IT IS WARM. IT IS MOVING.'] },
  saltgate: { to: 'saltmarket', col: 13, stone: TILE.STONE, spawn: 'saltgate', text: ['SALTMARKET.', 'THE HARBOUR THE ICE ALLOWS. SMOKE, GULLS AND THE NOISE OF A THOUSAND BARGAINS.'] },
  smugglercove: { to: 'smugglercove', col: 15, stone: TILE.PACKICE, spawn: 'smugglercove', text: ['SEAWEED COVE.', 'A SEA CAVE THAT SMELLS OF TAR AND SOMEONE ELSE\'S CARGO. THE BOATS ARE STILL WARM.'] },
});

const base1 = (f) => (x, y) => Math.min(3, 1 + f(x, y));
const base2 = (f) => (x, y) => Math.min(3, 2 + f(x, y));

// ------------------------------------------------------------------------------------------------ the Glasswood
const GLASS_START = { x: 6, y: 64 };
export const GLASSWOOD = {
  id: 'glasswood', w: 260, h: 190, start: GLASS_START, salt: 0x91a5, gap: 34, majorGap: 70,
  ground: TILE.GLASSMOSS, ground2: TILE.MOSS, clear: TILE.GLADEPATH, pillar: TILE.CRYSTAL, caveSign: 'A GLASS HOLLOW. THE WALLS CHIME WHEN YOU BREATHE.', flora: ['glass_bloom', 'frost_lily'], ores: ['iron_ingot', 'bone_dust'],
  mobs: [
    { melee: ['bandit', 'wolf', 'crystalgolem'], ranged: ['archer', 'glimmerkin'], wild: ['glassstag', 'deer', 'wolf', 'boar'] },
    { melee: ['crystalgolem', 'warden', 'wolf', 'fencer'], ranged: ['glimmerkin', 'archer', 'wisp'], wild: ['glassstag', 'lynx', 'bear', 'wolf'] },
    { melee: ['crystalgolem', 'reaver', 'warden', 'fencer'], ranged: ['glimmerkin', 'conjurer', 'wisp'], wild: ['glassstag', 'lynx', 'bear', 'alpha'] },
    { melee: ['crystalgolem', 'knight', 'reaver', 'warden'], ranged: ['glimmerkin', 'conjurer', 'necro', 'wisp'], wild: ['glassstag', 'alpha', 'bear', 'wyvern'] },
  ],
  tierAt: base1(tierFrom(GLASS_START, 60, 105, 150)),
  biome(seed) {
    const crystal = (seed >> 3) % 991, grove = (seed >> 7) % 977, pool = (seed >> 11) % 983;
    return (x, y) => (vnoise(x, y, 13, crystal) > 0.67 && x > 24 ? 'cliff' : vnoise(x, y, 11, pool) > 0.7 && x > 24 ? 'pool' : vnoise(x, y, 15, grove) > 0.5 ? 'grove' : 'glade');
  },
  paint(g, bio, W, H) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const b = bio[y][x];
      if (b === 'cliff') g.t[y][x] = hash(x, y, 231) < 0.7 ? TILE.CRYSTAL : TILE.GLASSMOSS;
      else if (b === 'pool') g.t[y][x] = hash(x, y, 232) < 0.9 ? TILE.CAVERNPOOL : TILE.GLASSMOSS;
      else if (b === 'glade' && hash(x, y, 233) < 0.25) g.t[y][x] = TILE.MOSS;
    }
  },
  nodes: [{ x: GLASS_START.x + 8, y: GLASS_START.y }],
  taken: [{ x: GLASS_START.x, y: GLASS_START.y, r: 14 }],
  plan(place, mustHave) {
    mustHave('lanternglade', 12, 1);
    mustHave('hartspire', 12, 3, null, { x: 215, y: 100, r: 60 });
    place('cave', 3, 7); place('camp', 3, 11); place('hamlet', 1, 9); place('ruin', 3, 10); place('champion', 3, 8); place('den', 2, 9);
    place('crystalgrove', 4, 8); place('glimmerpool', 3, 8); place('antlerstone', 3, 9);
    place('standing', 2, 8); place('rest', 8, 4); place('rest', 1, 4, { x: GLASS_START.x + 22, y: GLASS_START.y, r: 14 });
    place('cache', 3, 5); place('hermit', 1, 7); place('ancient', 1, 7);
  },
  dressers: {
    // a ring of crystal trees where glimmerkin dance and guard a chest of shards
    crystalgrove({ p, g, add, enemy, chest, clearing, m }) {
      clearing(p, 12, 9, TILE.GLADEPATH);
      for (const [dx, dy] of [[-4, -3], [4, -3], [-5, 1], [5, 1], [-3, 4], [3, 4], [0, -4]]) g.set(p.x + dx, p.y + dy, TILE.CRYSTAL);
      add({ t: 'glow', x: p.x, y: p.y, r: 54, col: 15 });
      for (let i = 0; i < 2 + p.tier; i++) enemy('glimmerkin', p.x + Math.round((i % 3 - 1) * 3), p.y + 2, p.tier, { camp: p.id });
      enemy('crystalgolem', p.x, p.y - 1, p.tier, { camp: p.id });
      chest(p, 0, 4, p.tier + 1, 'med');
      add({ t: 'sign', x: p.x - 6, y: p.y + 1, text: ['A CRYSTAL GROVE.', 'THE TREES GREW THEIR LEAVES OUT OF LIGHT. THE LIGHT ARGUES WITH ANYONE WHO TAKES IT.'] });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'ruin' });
    },
    // a pool that holds a piece of the sky; a shrine on its rim, kept by fey things
    glimmerpool({ p, g, add, enemy, chest, clearing, m }) {
      clearing(p, 11, 9, TILE.GLADEPATH);
      g.rect(p.x - 2, p.y - 1, 5, 3, TILE.CAVERNPOOL);
      add({ t: 'shrine', id: p.id, x: p.x, y: p.y + 3 }); add({ t: 'glow', x: p.x, y: p.y, r: 50, col: 15 });
      for (let i = 0; i < 2 + p.tier; i++) enemy(i % 2 ? 'wisp' : 'glimmerkin', p.x + Math.round((i - 1) * 4), p.y - 3, p.tier, { camp: p.id });
      for (let i = 0; i < 3; i++) add({ t: 'herb', item: 'glass_bloom', x: p.x - 4 + i * 4, y: p.y + 4 });
      chest(p, 0, 5, p.tier, 'med');
      add({ t: 'sign', x: p.x - 5, y: p.y + 1, text: ['A GLIMMERING POOL.', 'LOOK INTO IT AND YOU SEE THE SKY AS IT WAS WHEN YOU WERE SMALL.'] });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'ruin' });
    },
    // an antler stone: an old hart's shed antler, grown over with glass; a champion stag guards it
    antlerstone({ p, g, add, enemy, chest, clearing, pickOf, m }) {
      clearing(p, 12, 9, TILE.GLADEPATH);
      for (const [dx, dy] of [[-3, -2], [3, -2], [-4, 2], [4, 2]]) g.set(p.x + dx, p.y + dy, TILE.CRYSTAL);
      add({ t: 'enemy', kind: 'glassstag', x: p.x, y: p.y, tier: p.tier + 1, elite: true, camp: p.id, champion: true });
      for (let i = 0; i < 2; i++) enemy(pickOf(m.melee), p.x + (i ? 5 : -5), p.y + 3, p.tier, { camp: p.id });
      chest(p, 0, -3, p.tier + 1, 'hard');
      add({ t: 'lore', id: 'antler' + (Number((p.id.match(/\d+$/) || ['0'])[0]) % 3), tex: 'book', x: p.x + 3, y: p.y + 3 });
      add({ t: 'sign', x: p.x - 5, y: p.y + 2, text: ['AN ANTLER STONE.', 'THE HARTKING SHED THIS IN HIS FIRST WINTER. THE GLASS HAS BEEN GROWING OVER IT SINCE.'] });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'champion' });
    },
  },
  extras: null,
  scenery(g, bio, W, H) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (g.res[y][x] || g.t[y][x] === TILE.PATH) continue;
      const r = hash(x, y, 234), t = g.t[y][x];
      if ((t === TILE.GLASSMOSS || t === TILE.MOSS) && bio[y][x] === 'grove' && r < 0.12) g.t[y][x] = r < 0.05 ? TILE.CRYSTAL : TILE.PINE;
      else if (t === TILE.GLASSMOSS && r < 0.01) g.t[y][x] = TILE.CRYSTAL;
    }
  },
  dress: [],
};
GLASSWOOD.extras = regionExtras({ start: GLASS_START, exitTo: 'forest', exitSpawn: 'glassroad', fireId: 'glassfire', clear: TILE.GLADEPATH, mobs: GLASSWOOD.mobs, tierAt: GLASSWOOD.tierAt, nWild: 60,
  sign: ['THE GLASSWOOD.', 'THE ROAD BACK LEADS TO THE HOLLOW REACH. THE TREES WILL REMEMBER YOUR FACE FOR A WHILE.'], roamers: [['shardstag', 'elk', 3, 2, 5]] });

// ------------------------------------------------------------------------------------------------ the Underdeep
const DEEP_START = { x: 6, y: 64 };
export const UNDERDEEP = {
  id: 'underdeep', w: 240, h: 180, start: DEEP_START, salt: 0xd33b, gap: 34, majorGap: 70,
  ground: TILE.DEEPSTONE, ground2: TILE.CFLOOR2, clear: TILE.CFLOOR2, pillar: TILE.ROCK, caveSign: 'A SIDE-TUNNEL. THE FLOOR HAS BEEN WORN SMOOTH BY SOMETHING THAT DOES NOT WALK.', flora: ['glowcap', 'bone_dust'], ores: ['iron_ingot', 'bone_dust'],
  mobs: [
    { melee: ['caveweaver', 'lodeling', 'deepdelver'], ranged: ['gloomcap', 'archer'], wild: ['caveweaver', 'caveweaver', 'lodeling', 'frostworm'] },
    { melee: ['caveweaver', 'lodeling', 'deepdelver', 'golem'], ranged: ['gloomcap', 'conjurer', 'wisp'], wild: ['caveweaver', 'lodeling', 'frostworm', 'bear'] },
    { melee: ['lodeling', 'deepdelver', 'golem', 'reaver'], ranged: ['gloomcap', 'conjurer', 'necro', 'wisp'], wild: ['caveweaver', 'lodeling', 'frostworm', 'bear'] },
    { melee: ['lodeling', 'golem', 'knight', 'reaver'], ranged: ['gloomcap', 'conjurer', 'necro', 'lavawraith'], wild: ['caveweaver', 'lodeling', 'frostworm', 'wyvern'] },
  ],
  tierAt: base2(tierFrom(DEEP_START, 60, 105, 150)),
  biome(seed) {
    const rock = (seed >> 3) % 991, lake = (seed >> 7) % 977, fung = (seed >> 11) % 983;
    return (x, y) => (vnoise(x, y, 14, rock) > 0.66 && x > 24 ? 'cliff' : vnoise(x, y, 12, lake) > 0.7 && x > 24 ? 'pool' : vnoise(x, y, 13, fung) > 0.58 ? 'fungus' : 'cavern');
  },
  paint(g, bio, W, H) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const b = bio[y][x];
      if (b === 'cliff') g.t[y][x] = hash(x, y, 241) < 0.7 ? TILE.ROCK : TILE.BASALT;
      else if (b === 'pool') g.t[y][x] = hash(x, y, 242) < 0.9 ? TILE.CAVERNPOOL : TILE.DEEPSTONE;
      else if (b === 'cavern' && hash(x, y, 243) < 0.25) g.t[y][x] = TILE.CFLOOR2;
    }
  },
  nodes: [{ x: DEEP_START.x + 8, y: DEEP_START.y }],
  taken: [{ x: DEEP_START.x, y: DEEP_START.y, r: 14 }],
  plan(place, mustHave) {
    mustHave('lanternfall', 12, 1);
    mustHave('lodenest', 12, 3, null, { x: 205, y: 95, r: 55 });
    place('cave', 3, 7); place('camp', 3, 11); place('ruin', 3, 10); place('champion', 3, 8); place('foundry', 2, 11);
    place('glowcapgrove', 4, 8); place('weavernest', 3, 9); place('lodevein', 3, 9);
    place('rest', 8, 4); place('rest', 1, 4, { x: DEEP_START.x + 22, y: DEEP_START.y, r: 14 });
    place('cache', 3, 5); place('hermit', 1, 7); place('ancient', 1, 7);
  },
  dressers: {
    // a bank of glowing mushrooms: herb picking with company
    glowcapgrove({ p, g, add, enemy, chest, clearing, m }) {
      clearing(p, 11, 9, TILE.CFLOOR2);
      for (const [dx, dy] of [[-4, -2], [4, -2], [-4, 2], [4, 2]]) g.set(p.x + dx, p.y + dy, TILE.GLOWCAP);
      add({ t: 'glow', x: p.x, y: p.y, r: 54, col: 8 });
      for (let i = 0; i < 5; i++) add({ t: 'herb', item: 'glowcap', x: p.x - 4 + (i % 3) * 4, y: p.y - 1 + Math.floor(i / 3) * 3 });
      for (let i = 0; i < 2 + p.tier; i++) enemy(i % 2 ? 'gloomcap' : 'caveweaver', p.x + Math.round((i % 3 - 1) * 3), p.y + 4, p.tier, { camp: p.id });
      chest(p, 0, -4, p.tier, 'med');
      add({ t: 'sign', x: p.x - 6, y: p.y + 1, text: ['A GLOWCAP GROVE.', 'THE MUSHROOMS GLOW BECAUSE THEY ARE LISTENING TO SOMETHING. DO NOT ASK WHAT.'] });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'ruin' });
    },
    // the weavers' nest: a champion weaver, her brood, and the silk-wrapped dead
    weavernest({ p, g, add, enemy, chest, clearing, pickOf, m }) {
      clearing(p, 12, 9, TILE.DEEPSTONE);
      add({ t: 'enemy', kind: 'caveweaver', x: p.x, y: p.y, tier: p.tier + 1, elite: true, camp: p.id, champion: true });
      for (let i = 0; i < 3; i++) enemy('caveweaver', p.x - 4 + i * 4, p.y + 3, p.tier, { camp: p.id });
      chest(p, 4, -3, p.tier + 1, 'hard');
      add({ t: 'lore', id: 'weaver' + (Number((p.id.match(/\d+$/) || ['0'])[0]) % 3), tex: 'book', x: p.x - 4, y: p.y - 2 });
      add({ t: 'glow', x: p.x, y: p.y, r: 38, col: 14 });
      add({ t: 'sign', x: p.x - 6, y: p.y + 2, text: ['A WEAVER NEST.', 'THE WALLS ARE HUNG WITH SILK AND THE SILK IS HUNG WITH MINERS. ONE OF THEM IS STILL MOVING.'] });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'champion' });
    },
    // a rich vein: ore for the taking, lodelings for the taking back
    lodevein({ p, g, add, enemy, chest, clearing, m }) {
      clearing(p, 11, 8, TILE.DEEPSTONE);
      for (const [dx, dy] of [[-3, -3], [3, -3], [0, -3]]) g.set(p.x + dx, p.y + dy, TILE.ROCK);
      add({ t: 'glow', x: p.x, y: p.y - 2, r: 42, col: 12 });
      for (let i = 0; i < 2 + p.tier; i++) enemy('lodeling', p.x + Math.round((i % 3 - 1) * 4), p.y + 2, p.tier, { camp: p.id });
      chest(p, 0, -2, p.tier + 1, 'hard');
      add({ t: 'pickup', x: p.x - 2, y: p.y + 4, spec: { type: 'item', id: 'iron_ingot' } }); add({ t: 'pickup', x: p.x + 2, y: p.y + 4, spec: { type: 'item', id: 'iron_ingot' } });
      add({ t: 'sign', x: p.x - 5, y: p.y + 1, text: ['A RICH VEIN.', 'SOMEONE MARKED IT WITH A CHALK X AND THEN STOPPED MARKING THINGS.'] });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'ruin' });
    },
  },
  extras: null,
  scenery(g, bio, W, H) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (g.res[y][x] || g.t[y][x] === TILE.PATH) continue;
      const r = hash(x, y, 244), t = g.t[y][x];
      if ((t === TILE.DEEPSTONE || t === TILE.CFLOOR2) && bio[y][x] === 'fungus' && r < 0.1) g.t[y][x] = TILE.GLOWCAP;
      else if (t === TILE.DEEPSTONE && r < 0.02) g.t[y][x] = TILE.ROCK;
    }
  },
  dress: [],
};
UNDERDEEP.extras = regionExtras({ start: DEEP_START, exitTo: 'ashen', exitSpawn: 'deepdoor', fireId: 'deepfire', clear: TILE.CFLOOR2, mobs: UNDERDEEP.mobs, tierAt: UNDERDEEP.tierAt, nWild: 60,
  sign: ['THE UNDERDEEP.', 'THE STAIR BACK UP LEADS TO THE ASHEN PEAKS. THE DARK DOWN HERE IS NOT EMPTY, IT IS OCCUPIED.'], roamers: [['lodehulk', 'golem', 3, 2, 5]] });

REGION_DEFS.glasswood = GLASSWOOD;
REGION_DEFS.underdeep = UNDERDEEP;

// ---------------------------------------------------------------------------------------------- the gates, added at the end of each plan
// (the Reach's gate is appended so the Reach places everything else exactly as before; the Ashen Peaks and Coast place theirs first so the spacing rules hold)
const wrapPlan = (def, fn, first = false) => { const old = def.plan; def.plan = (place, mustHave) => { if (first) fn(place, mustHave); old(place, mustHave); if (!first) fn(place, mustHave); }; };
wrapPlan(REACH, (place, mustHave) => { mustHave('glassroad', 10, 2, null, { x: 330, y: 345, r: 60 }); });
wrapPlan(ASHEN, (place, mustHave) => { mustHave('deepdoor', 10, 2, null, { x: 120, y: 140, r: 60 }); }, true);
wrapPlan(COAST, (place, mustHave) => { mustHave('saltgate', 12, 1, null, { x: 70, y: 120, r: 50 }); mustHave('smugglercove', 12, 3, null, { x: 130, y: 150, r: 50 }); }, true);
