// Expansion: two warm regions that the Long Winter has not reached (yet).
//   The Embergreen Vale: a green valley kept alive by an old grove. Meadows, birch woods, ponds. Tier 1 to 2. Gate in the Hollow Reach.
//   The Sunscorch Reach: dunes, oases and the buried capital of the sun kings. Tier 2 to 3. Gate in the Hollow Reach.
import { TILE } from '../config.js';
import { hash } from '../util.js';
import { vnoise, tierFrom, regionExtras, REGION_DEFS, REACH, EXTRA_KIND_NAME, EXTRA_GATES, FACADE_EXTRA, MAJOR } from './worldgen.js';
import '../data/enemies4.js';

Object.assign(EXTRA_KIND_NAME, {
  valegate: 'THE ROAD TO THE EMBERGREEN VALE', greenhollow: 'A GREEN VILLAGE', thornroot: 'THE THORNROOT HOLLOW',
  dunegate: 'THE DESERT ROAD', amberwell: 'AN OASIS CITY', sealedvault: 'A SEALED VAULT',
  flowerfield: 'A FIELD OF FLOWERS', hive: 'A HORNET HIVE', heartgrove: 'A SACRED GROVE', thornpatch: 'A THORN PATCH',
  oasis: 'AN OASIS', raidercamp: 'A RAIDER CAMP', burrowpit: 'A SAND PIT', tombmouth: 'A TOMB MOUTH', dustspire: 'A DUST SPIRE', thiefden: 'A THIEVES\' DEN',
});
for (const k of ['valegate', 'greenhollow', 'thornroot', 'dunegate', 'amberwell', 'sealedvault']) { MAJOR.add(k); FACADE_EXTRA.add(k); }
Object.assign(EXTRA_GATES, {
  valegate: { to: 'vale', col: 8, stone: TILE.HEARTROOT, spawn: 'valegate', text: ['THE EMBERGREEN VALE.', 'A BREATH OF WARM AIR. THE SNOW STOPS AT THE ARCH LIKE A TIDE AT A WALL, AND BEYOND IT SOMETHING IS IN BLOOM.'] },
  greenhollow: { to: 'greenhollow', col: 13, stone: TILE.WOODWALL, spawn: 'greenhollow', text: ['GREENHOLLOW.', 'A VILLAGE OF ROUND DOORS AND WINDOW-BOXES. THE GARDENERS ARE WORRIED AND TOO POLITE TO SAY SO.'] },
  thornroot: { to: 'thornroot', col: 8, stone: TILE.HEARTROOT, spawn: 'thornroot', text: ['THE THORNROOT HOLLOW.', 'THE GROVE\'S OLDEST TREE HAS A DOOR IN IT. THE DOOR IS GROWING SHUT FROM THE INSIDE.'] },
  dunegate: { to: 'sunscorch', col: 12, stone: TILE.SANDSTONE, spawn: 'dunegate', text: ['THE DESERT ROAD.', 'A DRY WIND BLOWS OUT OF THE ARCH AND THE SNOW MELTS BEFORE IT TOUCHES THE STONE. SOMEONE HAS LEFT A WATER-SKIN ON THE STEP. IT IS FULL.'] },
  amberwell: { to: 'amberwell', col: 13, stone: TILE.SANDRUIN, spawn: 'amberwell', text: ['AMBERWELL.', 'AN OASIS CITY OF SAND-COLOURED WALLS. THE WELL IN ITS HEART HAS NEVER RUN DRY, AND THE CITY HAS NEVER ASKED WHY.'] },
  sealedvault: { to: 'sealedvault', col: 13, stone: TILE.SANDRUIN, spawn: 'sealedvault', text: ['THE SEALED VAULT.', 'THE SUN KINGS CLOSED THIS DOOR WITH A SEAL AND A CURSE. SOMEONE IS OPENING IT FROM THE OTHER SIDE.'] },
});

const clampTier = (lo, hi, f) => (x, y) => Math.max(lo, Math.min(hi, lo + f(x, y)));

// ------------------------------------------------------------------------------------------------ the Embergreen Vale
const VALE_START = { x: 6, y: 64 };
const VL1 = { melee: ['bandit', 'thornling', 'thornboar', 'hedgeknight'], ranged: ['archer', 'dewsprite', 'blightbloom'], wild: ['deer', 'thornboar', 'boar', 'hornet', 'wolf'] };
const VL2 = { melee: ['hedgeknight', 'thornling', 'mosshulk', 'knight'], ranged: ['dewsprite', 'blightbloom', 'archer', 'conjurer'], wild: ['thornboar', 'bear', 'hornet', 'mirelynx', 'mosshulk'] };
export const VALE = {
  id: 'vale', w: 260, h: 190, start: VALE_START, salt: 0x7a31, gap: 34, majorGap: 70,
  ground: TILE.MEADOW, ground2: TILE.FLOWERS, clear: TILE.MEADOW, wall1: TILE.BIRCH, wall2: TILE.BIRCH, pillar: TILE.BIRCH, caveSign: 'A BURROW UNDER THE ROOTS. THE EARTH INSIDE IS WARM AND SOMETHING IS HUMMING.', flora: ['valeroot', 'sunpetal'], ores: ['iron_ingot', 'bone_dust'],
  mobs: [VL1, VL1, VL2, VL2],
  tierAt: clampTier(1, 2, tierFrom(VALE_START, 80, 140, 999)),
  biome(seed) {
    const hill = (seed >> 3) % 991, pond = (seed >> 7) % 977, wood = (seed >> 11) % 983, field = (seed >> 13) % 971;
    return (x, y) => (vnoise(x, y, 14, hill) > 0.69 && x > 24 ? 'cliff' : vnoise(x, y, 11, pond) > 0.7 && x > 24 ? 'pool' : vnoise(x, y, 13, wood) > 0.55 ? 'grove' : vnoise(x, y, 12, field) > 0.55 ? 'field' : 'meadow');
  },
  paint(g, bio, W, H) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const b = bio[y][x];
      if (b === 'cliff') g.t[y][x] = hash(x, y, 331) < 0.72 ? TILE.ROCK : TILE.STONE;
      else if (b === 'pool') g.t[y][x] = hash(x, y, 332) < 0.92 ? TILE.POND : TILE.MEADOW;
      else if (b === 'field') g.t[y][x] = hash(x, y, 333) < 0.78 ? TILE.FLOWERS : TILE.MEADOW;
      else if (b === 'meadow' && hash(x, y, 334) < 0.12) g.t[y][x] = TILE.FLOWERS;
    }
  },
  nodes: [{ x: VALE_START.x + 8, y: VALE_START.y }],
  taken: [{ x: VALE_START.x, y: VALE_START.y, r: 14 }],
  plan(place, mustHave) {
    mustHave('greenhollow', 12, 1);
    mustHave('thornroot', 12, 2, null, { x: 205, y: 100, r: 60 });
    place('cave', 3, 7); place('camp', 3, 11); place('hamlet', 1, 9); place('ruin', 2, 10); place('den', 2, 9);
    place('flowerfield', 4, 9); place('hive', 2, 9); place('heartgrove', 2, 10); place('thornpatch', 2, 9);
    place('standing', 2, 8); place('rest', 8, 4); place('rest', 1, 4, { x: VALE_START.x + 22, y: VALE_START.y, r: 14 });
    place('cache', 3, 5); place('hermit', 1, 7); place('ancient', 1, 7);
  },
  dressers: {
    // a flower field: gather herbs while dew sprites tend the bees
    flowerfield({ p, g, add, enemy, chest, clearing, pickOf, m }) {
      clearing(p, 15, 11, TILE.FLOWERS);
      for (let i = 0; i < 5; i++) add({ t: 'herb', item: i % 2 ? 'sunpetal' : 'valeroot', x: p.x - 5 + (i % 3) * 5, y: p.y - 2 + Math.floor(i / 3) * 4 });
      add({ t: 'glow', x: p.x, y: p.y, r: 46, col: 13 });
      for (let i = 0; i < 2 + p.tier; i++) enemy('hornet', p.x + Math.round((i - 1) * 4), p.y - 3, p.tier, { camp: p.id });
      enemy('dewsprite', p.x + 3, p.y + 3, p.tier, { camp: p.id });
      chest(p, 0, 5, p.tier, 'med');
      add({ t: 'sign', x: p.x - 7, y: p.y + 1, text: ['A FIELD OF FLOWERS.', 'THE BEES HERE ARE NOT THE FRIENDLY KIND. THE FLOWERS ARE WORTH IT.'] });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'ruin' });
    },
    // a hornet hive in a birch ring; the queen holds court inside
    hive({ p, g, add, enemy, chest, clearing, m }) {
      clearing(p, 13, 10, TILE.MEADOW);
      for (const [dx, dy] of [[-5, -3], [5, -3], [-6, 1], [6, 1], [-4, 4], [4, 4], [0, -4]]) g.set(p.x + dx, p.y + dy, TILE.BIRCH);
      add({ t: 'glow', x: p.x, y: p.y, r: 40, col: 13 });
      enemy('hornetqueen', p.x, p.y, p.tier + 1, { camp: p.id });
      for (let i = 0; i < 3 + p.tier; i++) enemy('hornet', p.x + Math.round((i % 3 - 1) * 4), p.y + 3 + Math.floor(i / 3) * 2, p.tier, { camp: p.id });
      chest(p, 0, -3, p.tier + 1, 'hard');
      add({ t: 'pickup', x: p.x - 2, y: p.y + 5, spec: { type: 'item', id: 'honeycomb' } });
      add({ t: 'sign', x: p.x - 7, y: p.y + 1, text: ['A HORNET HIVE.', 'THE HUM CARRIES. SO DOES THE QUEEN\'S TEMPER.'] });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'champion' });
    },
    // the sacred grove: a great root tree, a shrine, and the warden of the grove
    heartgrove({ p, g, add, enemy, chest, clearing, m }) {
      clearing(p, 15, 11, TILE.MEADOW);
      g.set(p.x, p.y - 2, TILE.HEARTROOT);
      for (const [dx, dy] of [[-5, -3], [5, -3], [-6, 2], [6, 2]]) g.set(p.x + dx, p.y + dy, TILE.BIRCH);
      add({ t: 'shrine', id: p.id, x: p.x, y: p.y + 1 }); add({ t: 'glow', x: p.x, y: p.y - 1, r: 54, col: 13 });
      enemy('grovewarden', p.x + 4, p.y + 3, p.tier + 1, { camp: p.id });
      for (let i = 0; i < 2; i++) enemy('thornling', p.x - 4 + i * 8, p.y + 4, p.tier, { camp: p.id });
      chest(p, -4, 4, p.tier + 1, 'hard');
      add({ t: 'lore', id: 'grove' + (Number((p.id.match(/\d+$/) || ['0'])[0]) % 3), tex: 'book', x: p.x - 3, y: p.y + 2 });
      add({ t: 'sign', x: p.x - 7, y: p.y + 2, text: ['A SACRED GROVE.', 'THE GREAT TREE IS A PROMISE THE VALE MADE TO ITSELF. THE WARDEN KEEPS IT.'] });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'champion' });
    },
    // a thorn patch: briars a hundred years old, and the oldest briar of all
    thornpatch({ p, g, add, enemy, chest, clearing, m }) {
      clearing(p, 13, 10, TILE.MEADOW);
      for (const [dx, dy] of [[-5, -3], [5, -3], [-5, 3], [5, 3]]) g.set(p.x + dx, p.y + dy, TILE.BIRCH);
      enemy('elderthorn', p.x, p.y, p.tier + 1, { camp: p.id });
      for (let i = 0; i < 3; i++) enemy('thornling', p.x - 5 + i * 5, p.y + 3, p.tier, { camp: p.id });
      chest(p, 0, -4, p.tier + 1, 'hard');
      add({ t: 'sign', x: p.x - 6, y: p.y + 2, text: ['A THORN PATCH.', 'STAY ON THE PATH. THE BRIARS DO NOT DRAW A DIFFERENCE BETWEEN WALKERS AND PREY.'] });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'champion' });
    },
  },
  extras: null,
  scenery(g, bio, W, H) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (g.res[y][x] || g.t[y][x] === TILE.PATH) continue;
      const r = hash(x, y, 335), t = g.t[y][x];
      if ((t === TILE.MEADOW || t === TILE.FLOWERS) && bio[y][x] === 'grove' && r < 0.15) g.t[y][x] = TILE.BIRCH;
      else if ((t === TILE.MEADOW || t === TILE.FLOWERS) && bio[y][x] === 'meadow' && r < 0.012) g.t[y][x] = TILE.BIRCH;
    }
  },
  dress: [],
};
VALE.extras = regionExtras({ start: VALE_START, exitTo: 'forest', exitSpawn: 'valegate', fireId: 'valefire', clear: TILE.MEADOW, mobs: VALE.mobs, tierAt: VALE.tierAt, nWild: 60,
  sign: ['THE EMBERGREEN VALE.', 'THE ROAD BACK LEADS TO THE HOLLOW REACH. THE SNOW WAITS AT THE ARCH, VERY PATIENT.'], roamers: [['mossking', 'mosshulk', 2, 1, 5]] });

// ------------------------------------------------------------------------------------------------ the Sunscorch Reach
const SUN_START = { x: 6, y: 64 };
const SL2 = { melee: ['duneraider', 'scorpion', 'jackal', 'sandburrower'], ranged: ['archer', 'warchanter', 'dustdevil'], wild: ['jackal', 'scorpion', 'dustdevil', 'sandburrower', 'wolf'] };
const SL3 = { melee: ['sunsentinel', 'wrapped', 'cutpurse', 'sunfencer', 'sandburrower'], ranged: ['warchanter', 'sandwight', 'conjurer', 'dustdevil'], wild: ['scorpion', 'jackal', 'dustdevil', 'sandburrower', 'wyvern'] };
export const SUNSCORCH = {
  id: 'sunscorch', w: 260, h: 190, start: SUN_START, salt: 0x5c42, gap: 34, majorGap: 70,
  ground: TILE.SAND, ground2: TILE.DUNE, clear: TILE.SAND, wall1: TILE.SANDSTONE, wall2: TILE.SANDSTONE, pillar: TILE.SANDSTONE, caveSign: 'A SANDSTONE MOUTH. THE AIR INSIDE IS COOL AND SMELLS OF CEDAR.', flora: ['sunpetal', 'valeroot'], ores: ['iron_ingot', 'bone_dust'],
  mobs: [SL2, SL2, SL2, SL3],
  tierAt: clampTier(2, 3, tierFrom(SUN_START, 70, 130, 999)),
  biome(seed) {
    const rock = (seed >> 3) % 991, oasis = (seed >> 7) % 977, cact = (seed >> 11) % 983, dune = (seed >> 13) % 971;
    return (x, y) => (vnoise(x, y, 14, rock) > 0.68 && x > 24 ? 'cliff' : vnoise(x, y, 11, oasis) > 0.72 && x > 24 ? 'pool' : vnoise(x, y, 12, cact) > 0.6 ? 'scrub' : vnoise(x, y, 16, dune) > 0.45 ? 'dunes' : 'flat');
  },
  paint(g, bio, W, H) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const b = bio[y][x];
      if (b === 'cliff') g.t[y][x] = hash(x, y, 341) < 0.75 ? TILE.SANDSTONE : TILE.SAND;
      else if (b === 'pool') g.t[y][x] = hash(x, y, 342) < 0.92 ? TILE.OASIS : TILE.SAND;
      else if (b === 'dunes') g.t[y][x] = hash(x, y, 343) < 0.7 ? TILE.DUNE : TILE.SAND;
    }
  },
  nodes: [{ x: SUN_START.x + 8, y: SUN_START.y }],
  taken: [{ x: SUN_START.x, y: SUN_START.y, r: 14 }],
  plan(place, mustHave) {
    mustHave('amberwell', 12, 2);
    mustHave('sealedvault', 12, 3, null, { x: 205, y: 100, r: 60 });
    place('cave', 3, 7); place('camp', 2, 11); place('ruin', 3, 10); place('courtyard', 1, 11);
    place('oasis', 3, 9); place('raidercamp', 2, 11); place('burrowpit', 2, 9); place('tombmouth', 2, 9); place('dustspire', 2, 9); place('thiefden', 1, 9);
    place('standing', 2, 8); place('rest', 8, 4); place('rest', 1, 4, { x: SUN_START.x + 22, y: SUN_START.y, r: 14 });
    place('cache', 3, 5); place('hermit', 1, 7); place('ancient', 1, 7);
  },
  dressers: {
    // an oasis: water, palms, a campfire, and whoever else was thirsty
    oasis({ p, g, add, enemy, chest, clearing, m }) {
      clearing(p, 13, 10, TILE.SAND);
      g.rect(p.x - 2, p.y - 1, 5, 3, TILE.OASIS);
      for (const [dx, dy] of [[-4, -3], [4, -3], [-5, 2], [5, 2]]) g.set(p.x + dx, p.y + dy, TILE.CACTUS);
      add({ t: 'spring', x: p.x, y: p.y + 3 }); add({ t: 'glow', x: p.x, y: p.y, r: 46, col: 15 });
      for (let i = 0; i < 2 + p.tier; i++) enemy(i % 2 ? 'jackal' : 'scorpion', p.x + Math.round((i - 1) * 4), p.y - 4, p.tier, { camp: p.id });
      chest(p, 0, 5, p.tier, 'med');
      add({ t: 'sign', x: p.x - 6, y: p.y + 1, text: ['AN OASIS.', 'WATER, SHADE AND EVERY THIRSTY THING IN THE DESERT, ALL AT ONCE.'] });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'ruin' });
    },
    // a raider camp under a captain's banner
    raidercamp({ p, g, add, enemy, chest, clearing, pickOf, m }) {
      clearing(p, 14, 10, TILE.SAND);
      g.set(p.x, p.y, TILE.FIRE); add({ t: 'fire', x: p.x, y: p.y }); add({ t: 'glow', x: p.x, y: p.y, r: 46, col: 12 });
      enemy('captainkarrow', p.x + 2, p.y + 3, p.tier + 1, { camp: p.id });
      for (let i = 0; i < 3 + p.tier; i++) enemy(i % 3 === 2 ? 'warchanter' : 'duneraider', p.x - 5 + (i % 4) * 3, p.y - 3 + Math.floor(i / 4) * 3, p.tier, { camp: p.id });
      chest(p, 4, 3, p.tier + 1, 'hard');
      add({ t: 'pot', x: p.x - 5, y: p.y + 3, skin: 'barrel' }); add({ t: 'pot', x: p.x + 5, y: p.y - 3, skin: 'barrel' });
      add({ t: 'sign', x: p.x - 8, y: p.y, text: ['A RAIDER CAMP.', 'THE CAPTAIN\'S BANNER HANGS FROM A BROKEN COLUMN. HE KEEPS HIS WORD, WHICH IS WORSE.'] });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'camp' });
    },
    // a sand pit: the Sandmaw's hunting ground
    burrowpit({ p, g, add, enemy, chest, clearing, m }) {
      clearing(p, 13, 10, TILE.DUNE);
      enemy('sandmaw', p.x, p.y, p.tier + 1, { camp: p.id });
      for (let i = 0; i < 2 + p.tier; i++) enemy('sandburrower', p.x - 4 + i * 4, p.y + 3, p.tier, { camp: p.id });
      chest(p, 0, -4, p.tier + 1, 'hard');
      add({ t: 'sign', x: p.x - 6, y: p.y + 2, text: ['A SAND PIT.', 'THE SAND MOVES AGAINST THE WIND. ANYTHING THAT STOPS HERE STOPS FOR GOOD.'] });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'champion' });
    },
    // a tomb mouth: the scorpion queen guards a lost noble
    tombmouth({ p, g, add, enemy, chest, clearing, m }) {
      clearing(p, 13, 10, TILE.GLYPH);
      for (const dx of [-4, 4]) g.set(p.x + dx, p.y - 3, TILE.SANDRUIN);
      g.set(p.x, p.y - 3, TILE.GRAVE); add({ t: 'glow', x: p.x, y: p.y - 3, r: 40, col: 13 });
      enemy('tombscorpion', p.x, p.y, p.tier + 1, { camp: p.id });
      for (let i = 0; i < 2; i++) enemy('wrapped', p.x - 4 + i * 8, p.y + 3, p.tier, { camp: p.id });
      chest(p, 0, 4, p.tier + 1, 'hard');
      add({ t: 'lore', id: 'tomb' + (Number((p.id.match(/\d+$/) || ['0'])[0]) % 3), tex: 'book', x: p.x + 3, y: p.y + 1 });
      add({ t: 'sign', x: p.x - 6, y: p.y + 2, text: ['A TOMB MOUTH.', 'A NOBLE WAS BURIED HERE WITH EVERYTHING HE OWNED, INCLUDING HIS BODYGUARD.'] });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'champion' });
    },
    // a dust spire: a whirl the old kings used for a weathervane
    dustspire({ p, g, add, enemy, chest, clearing, m }) {
      clearing(p, 13, 10, TILE.SAND);
      for (const [dx, dy] of [[-3, -2], [3, -2], [-3, 3], [3, 3]]) g.set(p.x + dx, p.y + dy, TILE.SANDSTONE);
      enemy('dustlord', p.x, p.y, p.tier + 1, { camp: p.id });
      for (let i = 0; i < 3; i++) enemy('dustdevil', p.x - 5 + i * 5, p.y + 3, p.tier, { camp: p.id });
      chest(p, 0, -4, p.tier + 1, 'hard');
      add({ t: 'sign', x: p.x - 6, y: p.y + 2, text: ['A DUST SPIRE.', 'THE WIND HERE HAS A NAME, AN ADDRESS AND A TEMPER.'] });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'champion' });
    },
    // the thieves' den: Red Sula and her crew
    thiefden({ p, g, add, enemy, chest, clearing, m }) {
      clearing(p, 13, 10, TILE.SAND);
      for (const dx of [-5, 5]) { g.rect(p.x + dx, p.y - 4, 3, 2, TILE.ROOF); g.rect(p.x + dx, p.y - 2, 3, 2, TILE.SANDRUIN); }
      enemy('redsula', p.x, p.y + 1, p.tier + 1, { camp: p.id });
      for (let i = 0; i < 3; i++) enemy('cutpurse', p.x - 4 + i * 4, p.y + 3, p.tier, { camp: p.id });
      chest(p, 0, 4, p.tier + 1, 'hard');
      add({ t: 'sign', x: p.x - 6, y: p.y + 3, text: ['A THIEVES\' DEN.', 'KEEP YOUR HAND ON YOUR PURSE. THE SIGN IS A TRICK TOO, BUT AT LEAST IT IS HONEST ABOUT IT.'] });
      add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'champion' });
    },
  },
  extras: null,
  scenery(g, bio, W, H) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (g.res[y][x] || g.t[y][x] === TILE.PATH) continue;
      const r = hash(x, y, 344), t = g.t[y][x];
      if ((t === TILE.SAND || t === TILE.DUNE) && bio[y][x] === 'scrub' && r < 0.1) g.t[y][x] = TILE.CACTUS;
      else if ((t === TILE.SAND || t === TILE.DUNE) && r < 0.012) g.t[y][x] = r < 0.006 ? TILE.CACTUS : TILE.SANDSTONE;
    }
  },
  dress: [],
};
SUNSCORCH.extras = regionExtras({ start: SUN_START, exitTo: 'forest', exitSpawn: 'dunegate', fireId: 'sunfire', clear: TILE.SAND, mobs: SUNSCORCH.mobs, tierAt: SUNSCORCH.tierAt, nWild: 60,
  sign: ['THE SUNSCORCH REACH.', 'THE ROAD BACK LEADS TO THE HOLLOW REACH. THE SAND WILL FILL YOUR FOOTPRINTS BEFORE YOU REACH THE END OF THEM.'], roamers: [['sunwyrm', 'sandburrower', 3, 2, 5]] });

REGION_DEFS.vale = VALE;
REGION_DEFS.sunscorch = SUNSCORCH;

// the gates, appended to the end of each plan so the existing regions place everything else exactly as before
const wrapPlan = (def, fn) => { const old = def.plan; def.plan = (place, mustHave) => { old(place, mustHave); fn(place, mustHave); }; };
wrapPlan(REACH, (place, mustHave) => { mustHave('valegate', 10, 1, null, { x: 180, y: 230, r: 60 }); mustHave('dunegate', 10, 2, null, { x: 400, y: 200, r: 60 }); });
