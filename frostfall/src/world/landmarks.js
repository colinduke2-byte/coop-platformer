// Landmarks and scatter terrain for every region. A landmark is a small hand-drawn structure you can spot from a distance (it is "sighted"
// from further away than an ordinary place), with a guardian, a chest and a line of lore. Scatter terrain is tile-only (no RNG), so it
// never moves anything else: patches of snowdrift, frostbloom, ember blooms, lily pads, glass flowers and spores, and lone boulders.
import { TILE } from '../config.js';
import { hash } from '../util.js';
import { vnoise, REACH, ASHEN, COAST, KINGDOM, EXTRA_KIND_NAME, MAJOR } from './worldgen.js';
import { FENS, HIGHLANDS } from './regions2.js';
import { GLASSWOOD, UNDERDEEP } from './regions3.js';
import { VALE, SUNSCORCH } from './regions4.js';
import { PLACE_NAME, PLACE_COL, LANDMARKS } from './discovery.js';
import { LORE } from '../data/lore.js';

const L = {
  R: TILE.ROCK, S: TILE.STONE, P: TILE.PILLAR, B: TILE.BRAZIER, G: TILE.GRAVE, D: TILE.DEADTREE, T: TILE.PINE, I: TILE.PACKICE, M: TILE.MARBLE, W: TILE.WRECK,
  L: TILE.LAVA, A: TILE.BASALT, H: TILE.HEATHROCK, C: TILE.CRYSTAL, m: TILE.GLOWCAP, r: TILE.RUINWALL, b: TILE.BLACKWATER, o: TILE.BOGTREE, e: TILE.BIRCH,
  h: TILE.HEARTROOT, n: TILE.SANDSTONE, c: TILE.CACTUS, q: TILE.SANDRUIN, p: TILE.POND, a: TILE.OASIS, g: TILE.GLYPH, i: TILE.ICE2, '~': TILE.CAVERNPOOL,
};

// id: [name, lore title, lore text, glow colour, glow radius, shape rows (base row last, centred on the place)]
const DEFS = {
  frozenfall: ['THE FROZEN FALL', 'The Frozen Fall', 'The river stopped mid-leap in the first week of the Winter. You can still see the splash.', 15, 70, ['  IIIII  ', ' IIIIIII ', '  IIiII  ', '  IIiII  ', '  IIiII  ', '  IIiII  ', ' IIiiiII ', '  iiiii  ']],
  mammothbones: ['MAMMOTH BONES', 'A Hunter\'s Count', 'Eleven ribs, one tusk, and a spear that was thrown by someone who did not intend to miss.', 6, 50, ['  P P P  ', ' PPPPPPP ', 'P       P', 'P   G   P']],
  lonepine: ['THE LONE GIANT', 'The Lone Giant', 'Older than the Kings, taller than the keep. Nobody planted it. Nobody cut it. Nobody has asked it for a name.', 8, 60, ['   TTT   ', '  TTTTT  ', ' TTTTTTT ', '  TTDTT  ', '   TDT   ']],
  fallenstatue: ['A FALLEN STATUE', 'The Fallen King', 'Cast in the first year, toppled in the last. The sculptor was never paid. The sculptor was never found.', 5, 40, ['    P    ', '   MMM   ', ' PPMMMPP ', '   M M   ']],
  lavafall: ['A LAVAFALL', 'The Lavafall', 'The mountain bleeds from this one place. The old smiths bathed their blades in it and swore it tasted of honey.', 12, 80, ['  AAAAA  ', ' AALLLAA ', '  ALLLA  ', '  ALLLA  ', '  ALLLA  ', '  ALLLA  ', ' AALLLAA ']],
  obsidianspire: ['AN OBSIDIAN SPIRE', 'The Glass Needle', 'A spike of black glass, fused by a bolt from a clear sky. It rings at dawn.', 14, 60, ['    A    ', '    A    ', '   AAA   ', '   AAA   ', '  AAAAA  ', '  AAAAA  ']],
  ashbell: ['THE ASH BELL', 'The Ash Bell', 'A forge-bell the size of a hut. It rang once when the Fire fell. It has been ringing, very slowly, ever since.', 12, 70, [' P     P ', ' PBBBBBP ', ' P     P ', 'AAA   AAA']],
  whalebones: ['WHALE BONES', 'The Last Whale', 'It beached itself here, they say, to see the end of the world. It was early, but it was not wrong.', 5, 50, ['W W W W W', 'WWWWWWWWW', 'W       W']],
  icearch: ['AN ICE ARCH', 'The Arch of Winter', 'It has stood since the first freeze. Pass beneath it and your breath will hang in the air for a full minute.', 15, 60, ['  IIIII  ', ' II   II ', 'II     II', 'I       I']],
  sunkenstatue: ['A SUNKEN STATUE', 'The Harbour Watchman', 'A giant\'s hand, pointing at the water. The ice has risen to its wrist.', 15, 50, ['    PP   ', '   PIIP  ', '  IIIII  ']],
  brokenbridge: ['A BROKEN BRIDGE', 'The King\'s Span', 'It crossed a river that is no longer there. The kings did not tell the river.', 13, 40, ['rrr   rrr', 'r       r', 'r       r']],
  emptythrone: ['AN EMPTY THRONE', 'The Seat of Nobody', 'A throne with no king, and a dust-free seat. Someone is still sitting here. Just not in this century.', 14, 60, ['  P   P  ', ' PMMMMMP ', '  M r M  ', '  MMMMM  ']],
  obelisk: ['A BLACK OBELISK', 'The Obelisk', 'Names, in twelve languages, and the same one repeated in each. It is not a kind name.', 14, 60, ['    S    ', '    S    ', '    S    ', '   SSS   ', '  SSSSS  ']],
  drownedbell: ['A DROWNED BELL', 'The Bell Under the Water', 'It rings when the water rises. The water has not risen in sixty years. It rang last night.', 8, 60, ['   PPP   ', '   PBP   ', '  bbbbb  ', ' bbbbbbb ']],
  sinkingtower: ['A SINKING TOWER', 'The Leaning Keep', 'A hundred years ago it was ten floors tall. It is two floors tall now. It is still standing, mostly out of embarrassment.', 8, 50, ['  rrr    ', '  rrr    ', ' rrrrr   ', ' rrrrr   ', 'oooooo   ']],
  stormpillar: ['A STORM PILLAR', 'The Pillar of the Gods', 'Lightning visits this stone daily and has never once been late. Please do not stand on it.', 15, 70, ['    H    ', '    H    ', '   HHH   ', '   HHH   ', '  HHAHH  ']],
  eaglenest: ['AN EAGLE NEST', 'The Highest Nest', 'A nest the size of a barn on a spire of stone. The eagles are away. Do not stay until they are not.', 13, 50, ['  HHHHH  ', ' HH   HH ', ' H     H ', ' HHHHHHH ']],
  songtree: ['A SINGING TREE', 'The Tree That Sings', 'It sings in the wind. If you sing back it sings louder. If you stop it holds a note until you start again.', 15, 70, ['   CCC   ', '  CCCCC  ', ' CCCCCCC ', '   CCC   ', '   CCC   ']],
  prismarch: ['A PRISM ARCH', 'The Arch of Light', 'The sun hits it once a year at an angle that paints the whole glade. Today is not that day.', 15, 60, ['  CCCCC  ', ' CC   CC ', 'CC     CC']],
  lightshaft: ['A SHAFT OF LIGHT', 'The Shaft', 'A crack in the roof of the world, one finger wide, and daylight pouring through it to the cavern floor.', 13, 90, ['    S    ', '   S S   ', '   S S   ', '  SSSSS  ']],
  bonehall: ['A BONE HALL', 'The Delvers\' Hall', 'Thirty delvers laid out in rows, hands on their picks. The hall is swept. By whom, nobody says.', 6, 60, ['P G G G P', 'P       P', 'P G G G P']],
  greatoak: ['THE GREAT OAK', 'The Great Oak', 'The Vale\'s second-oldest tree, and its first-most-opinionated. Gardeners leave it gifts and do not stay for the reply.', 13, 70, ['  eeeee  ', ' eeeeeee ', 'eeeehheee ', ' eeehhee  ', '   hh     ']],
  rainfall: ['A RAINBOW FALL', 'The Rainbow Fall', 'A waterfall that catches the light in colours the Vale has no word for. The pool below is cold and wholly without fish.', 15, 70, ['  RRRRR  ', ' RRppppR ', '  Rpppp  ', '  Rpppp  ', '  Rpppp  ', ' ppppppp ']],
  sphinx: ['THE GREAT SPHINX', 'The Sphinx', 'It asks one question and always the same: what does the sun want? Every answer so far has been wrong in an interesting way.', 13, 70, ['     n   ', '   nnnn  ', '  nnnnnn ', 'nnnnnnnnn', 'nnnnnnnnn']],
  sunobelisk: ['A SUN OBELISK', 'The Sun Obelisk', 'It points at noon all day. The kings could not decide if this was wisdom or laziness.', 13, 80, ['    q    ', '    q    ', '    q    ', '   qqq   ', '  qqqqq  ']],
  buriedcolossus: ['A BURIED COLOSSUS', 'The Colossus', 'A head the size of a house, a shoulder, and a hand holding nothing at all. The rest is in the sand. Possibly. Hopefully.', 12, 60, ['   nnn   ', '  nnnnn  ', ' nnnnnnn ', ' nnqnqnn ', 'nnnnnnnnn']],
};
const WHERE = {
  reach: [REACH, [['frozenfall', 2], ['mammothbones', 2], ['lonepine', 2], ['fallenstatue', 2]]],
  ashen: [ASHEN, [['lavafall', 2], ['obsidianspire', 1], ['ashbell', 1]]],
  coast: [COAST, [['whalebones', 1], ['icearch', 1], ['sunkenstatue', 1]]],
  kingdom: [KINGDOM, [['brokenbridge', 1], ['emptythrone', 1], ['obelisk', 1]]],
  fens: [FENS, [['drownedbell', 1], ['sinkingtower', 1]]],
  highlands: [HIGHLANDS, [['stormpillar', 1], ['eaglenest', 1]]],
  glasswood: [GLASSWOOD, [['songtree', 1], ['prismarch', 1]]],
  underdeep: [UNDERDEEP, [['lightshaft', 1], ['bonehall', 1]]],
  vale: [VALE, [['greatoak', 1], ['rainfall', 1]]],
  sunscorch: [SUNSCORCH, [['sphinx', 1], ['sunobelisk', 1], ['buriedcolossus', 1]]],
};

for (const [id, [name, title, text, col, r, shape]] of Object.entries(DEFS)) {
  EXTRA_KIND_NAME[id] = name; PLACE_NAME[id] = name.replace(/^(A|AN|THE) /, ''); PLACE_COL[id] = col; LANDMARKS.add(id);
  LORE['lm_' + id] = { title, text: [text] };
}
// each landmark: a clearing, the structure, a glow, a guard, a chest, a lore page and a sign
const dresser = (id) => {
  const [name, , , col, gr, shape] = DEFS[id], w = Math.max(...shape.map((s) => s.length)), h = shape.length;
  return ({ p, g, add, enemy, chest, clearing, pickOf, m, def }) => {
    clearing(p, w + 6, h + 5);
    const x0 = p.x - (w >> 1), y0 = p.y - h + 1;
    shape.forEach((row, j) => [...row].forEach((ch, i) => { const t = L[ch]; if (t !== undefined) g.set(x0 + i, y0 + j, t); }));
    add({ t: 'glow', x: p.x, y: p.y - (h >> 1), r: gr, col });
    for (let i = 0; i < 1 + (p.tier > 0 ? 1 : 0) + (p.tier > 2 ? 1 : 0); i++) enemy(pickOf(m.melee), p.x - 4 + i * 4, p.y + 3, p.tier, { camp: p.id });
    chest(p, (w >> 1) + 2, 2, p.tier, p.tier >= 2 ? 'hard' : 'med');
    add({ t: 'lore', id: 'lm_' + id, tex: 'book', x: p.x + 1, y: p.y + 2 });
    add({ t: 'sign', x: p.x - (w >> 1) - 2, y: p.y + 1, text: [name + '.', 'A LANDMARK. YOU CAN SEE IT FROM FAR AWAY; THAT WAS THE POINT.'] });
    add({ t: 'bounty', id: p.id, x: p.x, y: p.y, kind: 'ruin' });
  };
};
for (const [, [def, list]] of Object.entries(WHERE)) {
  def.dressers = def.dressers || {};
  const old = def.plan;
  for (const [id] of list) def.dressers[id] = dresser(id);
  def.plan = (place, mustHave) => { old(place, mustHave); for (const [id, n] of list) place(id, n, 8); };
}

// ---------------------------------------------------------------------------------------------- scatter terrain (tile-only: uses hash noise, not the world's RNG)
const SNOWS = new Set([TILE.SNOW, TILE.SNOW2, TILE.SNOW3, TILE.SNOW4]);
const SCATTER = [
  [REACH, [[SNOWS, TILE.SNOWDRIFT, 9, 0.64, 0.7, 401], [SNOWS, TILE.FROSTBLOOM, 7, 0.7, 0.5, 402]], [SNOWS, TILE.BOULDER, 0.006, 403]],
  [ASHEN, [[new Set([TILE.ASH]), TILE.EMBERBLOOM, 8, 0.68, 0.55, 404]], null],
  [COAST, [[SNOWS, TILE.SNOWDRIFT, 9, 0.62, 0.7, 405]], [SNOWS, TILE.BOULDER, 0.005, 406]],
  [KINGDOM, [[new Set([TILE.MARBLE]), TILE.MARBLEMOSS, 8, 0.6, 0.6, 407]], null],
  [FENS, [[new Set([TILE.BOG]), TILE.LILYPAD, 7, 0.62, 0.65, 408]], null],
  [HIGHLANDS, [[SNOWS, TILE.SNOWDRIFT, 9, 0.64, 0.7, 409]], [new Set([TILE.HEATH, TILE.SLATE]), TILE.BOULDER, 0.007, 410]],
  [GLASSWOOD, [[new Set([TILE.GLASSMOSS, TILE.MOSS]), TILE.GLASSBLOOM, 7, 0.62, 0.6, 411]], null],
  [UNDERDEEP, [[new Set([TILE.DEEPSTONE, TILE.CFLOOR2]), TILE.SPORES, 7, 0.62, 0.6, 412]], null],
];
for (const [def, patches, boulders] of SCATTER) {
  const old = def.scenery;
  def.scenery = (g, bio, W, H) => {
    old(g, bio, W, H);
    for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
      if (g.res[y][x]) continue;
      const t = g.t[y][x];
      for (const [base, tile, scale, thr, dens, salt] of patches) if (base.has(t) && vnoise(x, y, scale, salt) > thr && hash(x, y, salt + 50) < dens) { g.t[y][x] = tile; break; }
      if (boulders && boulders[0].has(g.t[y][x]) && hash(x, y, boulders[3]) < boulders[2]) g.t[y][x] = boulders[1];
    }
  };
}
