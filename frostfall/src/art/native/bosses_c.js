// Hand-designed bosses, part C: Mire Mother, Storm Giant, Hartking, Lode Colossus.
import { bossSheet, flat } from './boss_kit.js';
import { registerNative } from '../native_registry.js';

const reg = (kind, scale, design) => { const N = Math.round(16 * scale); registerNative(kind, { scale, w: N, h: N, build: (scene, key) => bossSheet(scene, key, N, design) }); };

// ------------------------------------------------------------------------------------------------------------------------
// The Mire Mother: a hunched bog hag. A mound of moss and roots with a small face in it, branching antler-roots, curtains of
// vines, long gnarled arms, a skirt of reeds, mushrooms on her shoulders and a drip of slime.
const MIRE = {
  palette: { moss: [8, 7, 1], moss2: [7, 1, 0], skin: [8, 7, 1], root: [10, 9, 1], vine: [8, 8, 7], glow: flat(15), black: [1, 0, 0], cap: [11, 9, 1], bone: [6, 5, 4], reed: [8, 7, 1], slime: flat(15) },
  dither: [1, 2], groups: {},
  dead: { body: 'moss', head: 'skin' },
  draw(c) {
    const { R, E, T, Q, Y, P, id, view, bob, fr } = c, back = view === 'back', side = view === 'side', b = bob;
    const sway = fr === 1 ? 0.5 : fr === 2 ? -0.5 : 0;
    const vine = (x, y, len, ph) => { let px = x, py = y; for (let i = 1; i <= 4; i++) { const nx = x + Math.sin(ph + i * 0.9 + fr * 1.3) * 0.5, ny = y + (len * i) / 4; T(px, py, nx, ny, 0.5, id.vine); px = nx; py = ny; } };
    if (!side) {
      // skirt of reeds hides the legs entirely
      for (let i = 0; i < 12; i++) { const x = 2.4 + i * 1.1, h = 13.4 + ((i * 7) % 5) * 0.5; Y([[x - 0.45, 11], [x + sway * (i % 2 ? 1 : -1) * 0.4, h + 1.6], [x + 0.55, 11]], id.reed); }
      // huge round mound of moss, wider than she is tall
      E(8, 9.6 + b, 6.8, 4.4, id.moss);
      for (const [x, y, r] of [[4, 11, 1.4], [12, 11.4, 1.3], [8, 12.4, 1.5], [2.8, 8.4, 1.2], [13.2, 8.8, 1.2]]) E(x, y + b, r, r * 0.8, id.moss2);
      // gnarled arms hang outward from the mound, hands curled into claws
      for (const sx of [-1, 1]) { const a = c.arm(sx < 0 ? 'L' : 'R', 8 + sx * 6.4, 7.8 + b, 4.2, 1.2, id.root, null); for (let i = -1; i <= 1; i++) T(a[0], a[1], a[0] + sx * 0.8 + i * 0.4, a[1] + 1.4, 0.4, id.root); }
      // mushrooms and drips
      for (const [x, y, w] of [[3.6, 5.6, 1.5], [12.6, 6.4, 1.3]]) { E(x, y + b, w, 0.9, id.cap); R(x - 0.3, y + 0.6 + b, 0.6, 1.4, id.bone); P(x - 0.6, y - 0.2 + b, 6, 1, 1); }
      P(5.2, 12.6, 15, 1, 1); P(11, 13.4 + (fr ? 0.6 : 0), 15, 1, 1);
      // head: small, wrinkled, peering from a hood of vines, under a rack of root-antlers
      Q(5.8, 3.4 + b, 4.4, 4.2, id.skin, 1.8);
      if (!back) { P(6.6, 4.8 + b, 15, 1, 2); P(8.8, 4.8 + b, 15, 1, 2); Y([[7.6, 5.4 + b], [8.4, 5.4 + b], [8, 7.2 + b]], id.moss2); R(6.6, 7 + b, 2.8, 0.5, id.black); }
      vine(5.2, 3.8 + b, 5.6, 0); vine(10.8, 3.8 + b, 6.4, 2); vine(6.4, 3.4 + b, 4.4, 4); vine(9.6, 3.4 + b, 4, 1);
      for (const [x0, y0, x1, y1] of [[6.4, 3.4, 3.4, 1.2], [3.4, 1.2, 2, 0], [4.8, 2.4, 3.8, 0.2], [9.6, 3.4, 12.6, 1.2], [12.6, 1.2, 14, 0], [11.2, 2.4, 12.2, 0.2], [8, 3, 8, 0.2]]) T(x0, y0 + b, x1, y1 + b, 0.8, id.root);
    } else {
      for (let i = 0; i < 11; i++) { const x = 2.6 + i * 1, h = 13.4 + ((i * 7) % 5) * 0.5; Y([[x - 0.45, 11], [x + sway * 0.4, h + 1.6], [x + 0.55, 11]], id.reed); }
      E(7.6, 9.6 + b, 6.2, 4.4, id.moss); E(5.4, 8.4 + b, 3, 2.6, id.moss2);
      const a = c.arm('R', 9.6, 7.8 + b, 4.2, 1.2, id.root, null); for (let i = -1; i <= 1; i++) T(a[0], a[1], a[0] + 1.2, a[1] + 0.8 + i * 0.5, 0.4, id.root);
      E(4, 5.6 + b, 1.5, 0.9, id.cap); R(3.7, 6 + b, 0.6, 1.4, id.bone);
      Q(8.2, 3.6 + b, 4, 4.2, id.skin, 1.8); P(11, 4.8 + b, 15, 1, 2); Y([[11.4, 5.6 + b], [12.4, 6.4 + b], [11, 6.8 + b]], id.moss2); R(10, 7.2 + b, 2, 0.5, id.black);
      vine(8.4, 4 + b, 5.6, 0); vine(11.4, 3.6 + b, 5, 2); vine(9.6, 3.4 + b, 4.6, 4);
      for (const [x0, y0, x1, y1] of [[8.8, 3.6, 6.4, 1.4], [6.4, 1.4, 5.6, 0], [10, 3, 12, 1.2], [12, 1.2, 13.4, 0], [9.2, 3, 9.2, 0.2]]) T(x0, y0 + b, x1, y1 + b, 0.8, id.root);
    }
  },
};

// ------------------------------------------------------------------------------------------------------------------------
// The Storm Giant: the tallest figure, with a thundercloud cloak, a white beard to the belt, a winged helm and sparking fists.
const STORM = {
  palette: { skin: [5, 4, 3], beard: [6, 6, 5], cloak: [3, 2, 1], cloud: [5, 4, 3], bolt: flat(13), glow: flat(15), kilt: [4, 3, 2], boot: [2, 1, 0], helm: [6, 5, 4], black: [1, 0, 0], spark: flat(15) },
  dither: [1, 2], groups: {},
  dead: { body: 'cloak', head: 'skin' },
  draw(c) {
    const { R, E, T, Q, Y, P, id, view, bob, fr } = c, back = view === 'back', side = view === 'side', b = bob * 0.8;
    const zig = (x, y, n, col, w = 0.45) => { let px = x, py = y; for (let i = 1; i <= n; i++) { const nx = x + (i % 2 ? 0.9 : -0.9), ny = y + i * 1.1; T(px, py, nx, ny, w, col); px = nx; py = ny; } };
    if (!side) {
      // billowing cloud cloak behind the shoulders, bolts crackling inside it
      for (const [x, y, r] of [[2.6, 8, 2], [13.4, 8, 2], [1.8, 11, 1.8], [14.2, 11, 1.8], [3.6, 13, 1.6], [12.4, 13, 1.6]]) E(x, y + b, r, r * 0.9, id.cloud);
      E(8, 10 + b, 6.4, 4.6, id.cloak);
      // thick tree-trunk legs and a kilt
      c.leg(5.6, 12, 2.6, 3, id.kilt, id.boot, 3.6); c.leg(10.4, 12, 2.6, 3, id.kilt, id.boot, 3.6);
      Q(4.4, 9.6 + b, 7.2, 3.4, id.kilt, 0.8);
      // chest and long white beard
      Q(4.2, 6.4 + b, 7.6, 4.4, id.skin, 1.4);
      if (!back) {
        Y([[5.2, 5.6 + b], [10.8, 5.6 + b], [11.2, 8 + b], [9.6, 11 + b], [8, 12.2 + b], [6.4, 11 + b], [4.8, 8 + b]], id.beard);
        for (const x of [6.2, 7.2, 8.8, 9.8]) T(x, 7 + b, x + (x < 8 ? -0.3 : 0.3), 11.4 + b, 0.3, id.cloud);
        Y([[7.4, 8.4 + b], [8.8, 8.4 + b], [8.2, 9.6 + b], [8.9, 9.6 + b], [7.4, 11.8 + b], [7.9, 10 + b], [7.2, 10 + b]], id.bolt);
      } else { Q(4.6, 6.8 + b, 6.8, 5, id.cloak, 1.2); zig(8, 7 + b, 4, id.bolt); }
      // arms like logs, fists crackling
      for (const sx of [-1, 1]) { const a = c.arm(sx < 0 ? 'L' : 'R', 8 + sx * 5.2, 7.4 + b, 4, 2.4, id.skin, id.skin, 1.5); R(a[0] - 1.3, a[1] - 1.8, 2.6, 0.9, id.helm); if (fr) { P(a[0] - sx * 1.6, a[1] - 1, 15, 1, 1); } T(a[0] + sx * 1.1, a[1] - 1, a[0] + sx * 2, a[1] - 2, 0.35, id.spark); }
      // large head, winged helm with a lightning stripe
      Q(5.2, 1.6 + b, 5.6, 4.6, id.skin, 1.8);
      if (!back) { P(6.4, 3.6 + b, 15, 1, 2); P(9, 3.6 + b, 15, 1, 2); R(6, 2.4 + b, 4, 0.8, id.black); }
      Q(5.2, 0.8 + b, 5.6, 2.2, id.helm, 1.2); Y([[7.6, 0.8 + b], [8.8, 0.8 + b], [8.2, 1.8 + b], [8.9, 1.8 + b], [7.4, 3 + b], [7.9, 2 + b], [7.2, 2 + b]], id.bolt);
      for (const sx of [-1, 1]) { T(8 + sx * 2.8, 1.8 + b, 8 + sx * 5.4, 0.4 + b, 1.1, id.helm); T(8 + sx * 3, 2.6 + b, 8 + sx * 5.6, 1.8 + b, 0.9, id.helm); T(8 + sx * 3.2, 3.2 + b, 8 + sx * 5.2, 3 + b, 0.7, id.helm); }
    } else {
      E(4, 9 + b, 3, 3, id.cloud); E(5, 12 + b, 2.2, 2, id.cloud); E(7, 10 + b, 5, 4.6, id.cloak);
      c.leg(7.6, 12, 2.8, 3, id.kilt, id.boot, 4); Q(5.4, 9.6 + b, 6.4, 3.4, id.kilt, 0.8);
      Q(5.4, 6.4 + b, 6.4, 4.4, id.skin, 1.4);
      Y([[8, 5.6 + b], [11.2, 5.8 + b], [11.6, 9 + b], [10, 12 + b], [8.2, 10 + b]], id.beard);
      const a = c.arm('R', 8.2, 7.4 + b, 4, 2.4, id.skin, id.skin, 1.5); R(a[0] - 1.3, a[1] - 1.8, 2.6, 0.9, id.helm); T(a[0] + 1, a[1] - 1, a[0] + 2, a[1] - 2, 0.35, id.spark);
      Q(6.4, 1.6 + b, 5.6, 4.6, id.skin, 1.8); P(10.2, 3.6 + b, 15, 1, 2); R(9, 2.4 + b, 3, 0.8, id.black);
      Q(6.4, 0.8 + b, 5.6, 2.2, id.helm, 1.2); T(7.6, 2 + b, 4.6, 0.6 + b, 1.2, id.helm); T(7.8, 2.8 + b, 5, 2.4 + b, 0.9, id.helm);
    }
  },
};

// ------------------------------------------------------------------------------------------------------------------------
// The Hartking: a stag-skulled lord. A long muzzle and a tall rack of antlers wider than his shoulders, a mane of glass shards,
// slender legs ending in hooves. Elegant and thin where Kragnar is a block.
const HART = {
  palette: { fur: [6, 5, 4], robe: [4, 3, 2], glass: [6, 15, 4], horn: [10, 9, 1], skull: [6, 5, 4], hoof: [1, 0, 0], glow: flat(15), black: [1, 0, 0], leaf: [8, 7, 1] },
  dither: [1], groups: {},
  dead: { body: 'robe', head: 'skull' },
  draw(c) {
    const { R, E, T, Q, Y, P, id, view, bob, fr } = c, back = view === 'back', side = view === 'side', b = bob * 0.6;
    const shard = (x, y, h, w, col) => Y([[x - w, y], [x + 0.2, y - h], [x + w, y]], col);
    const rack = (cx, ox) => {   // antler rack: a main beam each side with branching tines
      for (const sx of [-1, 1]) {
        const x0 = cx + sx * 1.8 * ox, y0 = 2.6 + b;
        const pts = [[x0, y0], [cx + sx * 3.4 * ox, 1 + b], [cx + sx * 4.8 * ox, 0 + b]];
        T(pts[0][0], pts[0][1], pts[1][0], pts[1][1], 0.9, id.horn); T(pts[1][0], pts[1][1], pts[2][0], pts[2][1], 0.7, id.horn);
        T(cx + sx * 2.6 * ox, 1.8 + b, cx + sx * 1.6 * ox, 0.2 + b, 0.55, id.horn);
        T(cx + sx * 3.6 * ox, 1 + b, cx + sx * 5.6 * ox, 1.6 + b, 0.55, id.horn);
        T(cx + sx * 4 * ox, 0.6 + b, cx + sx * 3.6 * ox, -0.4 + b, 0.5, id.horn);
      }
    };
    if (!side) {
      // slim digitigrade legs with cloven hooves
      c.leg(6.2, 11.6, 3.2, 1.4, id.fur, id.hoof, 1.8); c.leg(9.8, 11.6, 3.2, 1.4, id.fur, id.hoof, 1.8);
      // long robe with a ragged leaf hem and a cape of glass behind
      Y([[5, 6.8 + b], [11, 6.8 + b], [12, 12.4], [8, 11.6], [4, 12.4]], id.robe);
      for (let i = 0; i < 6; i++) Y([[4 + i * 1.6, 12.2], [4.8 + i * 1.6, 13.6 + (i % 2) * 0.7], [5.6 + i * 1.6, 12.2]], id.leaf);
      if (!back) { Y([[7, 7 + b], [9, 7 + b], [8.4, 11], [7.6, 11]], id.fur); for (const y of [8, 9.4]) P(7.6, y + b, 15, 1, 1); }
      else { for (const [x, y] of [[6, 9], [10, 10], [8, 8.4]]) shard(x, y + 1.4 + b, 1.8, 0.5, id.glass); }
      // mane and shoulder shards: the glass fans out like a collar
      for (const [x, h, w] of [[3.8, 2.6, 0.7], [5, 3.4, 0.8], [11, 3.4, 0.8], [12.2, 2.6, 0.7], [2.6, 1.6, 0.5], [13.4, 1.6, 0.5]]) shard(x, 7.4 + b, h, w, id.glass);
      for (const sx of [-1, 1]) c.arm(sx < 0 ? 'L' : 'R', 8 + sx * 4, 7.6 + b, 3.6, 1.2, id.robe, id.fur, 1);
      // head: long muzzle, tall ears, dark nose, glowing eyes
      Q(6.2, 2.4 + b, 3.6, 3.8, id.skull, 1.4); Q(6.8, 5.2 + b, 2.4, 3, id.skull, 1);
      if (!back) { P(6.8, 3.8 + b, 15, 1, 1); P(8.6, 3.8 + b, 15, 1, 1); R(7.4, 7.6 + b, 1.2, 0.7, id.black); R(6.4, 4.8 + b, 0.7, 0.5, id.black); R(8.9, 4.8 + b, 0.7, 0.5, id.black); }
      T(6.2, 3.2 + b, 4.2, 2.6 + b, 1, id.skull); T(9.8, 3.2 + b, 11.8, 2.6 + b, 1, id.skull);
      rack(8, 1);
      for (const [x, y] of [[2, 5], [14, 4], [3, 10], [13.4, 11]]) shard(x, y, 1.4, 0.4, id.glass);
    } else {
      c.leg(7.4, 11.6, 3.2, 1.4, id.fur, id.hoof, 2); c.leg(9.6, 11.6, 3.2, 1.4, id.fur, id.hoof, 2);
      Y([[5.6, 6.8 + b], [10.6, 6.8 + b], [11.4, 12.4], [4, 12.4]], id.robe);
      for (let i = 0; i < 6; i++) Y([[4 + i * 1.3, 12.2], [4.8 + i * 1.3, 13.6 + (i % 2) * 0.7], [5.6 + i * 1.3, 12.2]], id.leaf);
      for (const [x, h, w] of [[5, 3, 0.8], [6.4, 3.6, 0.8], [8, 3, 0.7]]) shard(x, 7.4 + b, h, w, id.glass);
      c.arm('R', 8.4, 7.6 + b, 3.6, 1.2, id.robe, id.fur, 1);
      Q(7, 2.4 + b, 3.4, 3.8, id.skull, 1.4); Q(9.2, 4.4 + b, 3.6, 2.2, id.skull, 0.9); R(12, 4.6 + b, 0.8, 0.8, id.black); P(9.2, 3.6 + b, 15, 1, 1);
      T(7.4, 3 + b, 5.4, 2.4 + b, 1, id.skull);
      for (const [x0, y0, x1, y1] of [[8, 2.6, 6, 0.8], [6, 0.8, 4.4, 0], [7, 1.6, 8.6, 0], [6.4, 1.2, 5, 1.8], [9.4, 2.6, 11.4, 1], [11.4, 1, 12.6, 0]]) T(x0, y0 + b, x1, y1 + b, 0.7, id.horn);
    }
  },
};

// ------------------------------------------------------------------------------------------------------------------------
// The Lode Colossus: a mountain of cut stone. No neck, a boulder for a head, slabs for limbs, amber crystals bursting from the
// shoulders and molten seams across the body. Rectangular where everything else is organic.
const LODE = {
  palette: { stone: [4, 3, 2], dark: [3, 2, 1], deep: [2, 1, 0], amber: [13, 12, 11], lava: flat(12), core: flat(13), black: [1, 0, 0] },
  dither: [1, 2], groups: {},
  dead: { body: 'stone', head: 'stone' },
  draw(c) {
    const { R, E, T, Q, Y, P, id, view, bob, fr } = c, back = view === 'back', side = view === 'side', b = bob * 0.8;
    const crystal = (x, y, h, w) => { Y([[x - w, y], [x - w * 0.3, y - h], [x, y - h - 0.8], [x + w * 0.6, y - h * 0.7], [x + w, y]], id.amber); };
    const seam = (pts, w = 0.4) => { for (let i = 0; i + 1 < pts.length; i++) T(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w, id.lava); };
    if (!side) {
      // two square pillars for legs and wide stone feet
      Q(4.4, 11.6, 3.2, 3.2, id.dark, 0.3); Q(8.4, 11.6, 3.2, 3.2, id.dark, 0.3); Q(3.8, 14, 4.4, 1.8, id.deep, 0.3); Q(8, 14, 4.4, 1.8, id.deep, 0.3);
      // a big blocky torso built from stacked slabs
      Q(2.6, 5.6 + b, 10.8, 6.6, id.stone, 0.5); Q(3.4, 11 + b, 9.2, 1.8, id.dark, 0.3);
      R(2.6, 8.6 + b, 10.8, 0.4, id.deep); R(7.8, 5.6 + b, 0.4, 6.6, id.deep);
      if (!back) { seam([[4, 6.8 + b], [5.6, 8 + b], [5, 9.6 + b], [6.6, 10.8 + b]]); seam([[11.6, 6.4 + b], [10.2, 7.8 + b], [11, 9.2 + b], [9.6, 10.6 + b]]); E(8, 8.6 + b, 1.2, 1.2, id.core); E(8, 8.6 + b, 0.6, 0.6, id.lava); }
      else { seam([[4.6, 6.6 + b], [6.4, 8.4 + b], [5.4, 10.6 + b]]); seam([[11.2, 6.4 + b], [9.6, 8.8 + b], [10.8, 10.8 + b]]); }
      // shoulders are boulders with crystal clusters
      for (const sx of [-1, 1]) { const cx = 8 + sx * 5.6; E(cx, 6.2 + b, 2.2, 1.9, id.stone); crystal(cx - 0.8, 5.6 + b, 2.4, 0.6); crystal(cx + 0.7, 5.6 + b, 3.4, 0.7); crystal(cx + sx * 1.4, 5.8 + b, 1.8, 0.5); }
      // arms: slabs that reach below the belt, slab fists
      for (const sx of [-1, 1]) { const a = c.arm(sx < 0 ? 'L' : 'R', 8 + sx * 6.2, 7 + b, 4.4, 3, id.dark, null); Q(a[0] - 1.8, a[1] - 0.6, 3.6, 3, id.stone, 0.4); R(a[0] - 1.8, a[1] + 1, 3.6, 0.4, id.deep); }
      // small boulder head hunched down between the shoulders, a glowing slit for eyes
      Q(5.8, 2.4 + b, 4.4, 3.6, id.stone, 0.8); R(5.8, 4.6 + b, 4.4, 0.4, id.deep);
      if (!back) { R(6.4, 3.8 + b, 3.2, 0.7, id.black); R(6.6, 3.9 + b, 1, 0.5, id.lava); R(8.4, 3.9 + b, 1, 0.5, id.lava); }
      crystal(8, 2.8 + b, 1.8, 0.6);
      for (const [x, y] of [[3, 5], [13, 4.6]]) P(x, y, 12, 1, 1);
    } else {
      Q(5.6, 11.6, 3.2, 3.2, id.dark, 0.3); Q(7.6, 11.6, 3.2, 3.2, id.deep, 0.3); Q(4.8, 14, 5, 1.8, id.deep, 0.3);
      Q(4.4, 5.6 + b, 7.4, 6.6, id.stone, 0.5); R(4.4, 8.6 + b, 7.4, 0.4, id.deep); seam([[8, 6.4 + b], [6.6, 8.2 + b], [8, 10 + b]]);
      E(6.2, 6.2 + b, 2.4, 2, id.stone); crystal(5.2, 5.6 + b, 3, 0.7); crystal(6.8, 5.6 + b, 2.2, 0.6); crystal(4, 6.4 + b, 1.8, 0.5);
      const a = c.arm('R', 9.4, 7 + b, 4.4, 3, id.dark, null); Q(a[0] - 1.8, a[1] - 0.6, 3.6, 3, id.stone, 0.4);
      Q(7.2, 2.4 + b, 4.6, 3.6, id.stone, 0.8); R(9, 3.8 + b, 2.2, 0.7, id.black); R(9.4, 3.9 + b, 1, 0.5, id.lava); crystal(8.4, 2.8 + b, 1.8, 0.6);
    }
  },
};

reg('miremother', 2.6, MIRE);
reg('stormgiant', 2.8, STORM);
reg('hartking', 2.6, HART);
reg('lodecolossus', 3, LODE);
