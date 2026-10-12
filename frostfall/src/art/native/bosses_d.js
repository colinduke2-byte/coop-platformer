// Hand-designed bosses, part D (the Embergreen Vale and the Sunscorch Reach): the Blight Mother and the Vault Sovereign.
import { bossSheet, flat } from './boss_kit.js';
import { registerNative } from '../native_registry.js';

const reg = (kind, scale, design) => { const N = Math.round(16 * scale); registerNative(kind, { scale, w: N, h: N, build: (scene, key) => bossSheet(scene, key, N, design) }); };

// ------------------------------------------------------------------------------------------------------------------------
// The Blight Mother: the grove's guardian gone to rot. A tall woman of bark and moss with a skirt of roots, a crown of thorn
// antlers, branches for arms, and red blight flowers blooming through the cracks. A beating green seed shows between her ribs.
const BLIGHT = {
  palette: { bark: [10, 9, 1], moss: [8, 8, 7], leaf: [8, 7, 1], rot: [14, 14, 1], bloom: flat(11), glow: flat(11), thorn: [6, 5, 4], black: [1, 0, 0], seed: flat(13) },
  dither: [1], groups: {},
  dead: { body: 'bark', head: 'moss' },
  draw(c) {
    const { R, E, T, Q, Y, P, id, view, bob, fr } = c, back = view === 'back', side = view === 'side', b = bob * 0.6, sway = fr === 1 ? 0.5 : fr === 2 ? -0.5 : 0;
    const thorn = (x, y, h, w, col) => Y([[x - w, y], [x + 0.2, y - h], [x + w, y]], col);
    const crown = (cx) => {
      for (const sx of [-1, 1]) {
        T(cx + sx * 1.8, 2.4 + b, cx + sx * 3.4, 0.8 + b, 0.9, id.bark); T(cx + sx * 3.4, 0.8 + b, cx + sx * 4.6, -0.2 + b, 0.7, id.bark);
        thorn(cx + sx * 2.8, 1.6 + b, 1.6, 0.4, id.thorn); thorn(cx + sx * 4.2, 0.5 + b, 1.4, 0.4, id.thorn);
      }
    };
    if (!side) {
      c.leg(6.4, 11.6, 3.2, 1.8, id.bark, id.moss, 2.4); c.leg(9.6, 11.6, 3.2, 1.8, id.bark, id.moss, 2.4);
      // skirt of roots and a ragged hem of leaves
      Y([[4.4, 7.4 + b], [11.6, 7.4 + b], [13.4, 12.6], [8, 11.8], [2.6, 12.6]], id.bark);
      for (let i = 0; i < 7; i++) Y([[2.6 + i * 1.6, 12.2], [3.4 + i * 1.6 + sway * (i % 2 ? 1 : -1) * 0.3, 14 + (i % 3) * 0.5], [4.2 + i * 1.6, 12.2]], id.leaf);
      // torso and moss mantle
      Q(5, 5.4 + b, 6, 5.4, id.bark, 1.2);
      for (const sx of [-1, 1]) E(8 + sx * 3.8, 6.4 + b, 2, 1.5, id.moss);
      if (!back) {
        E(8, 8.4 + b, 1.3, 1.4, id.seed); E(8, 8.4 + b, 0.6, 0.7, id.bloom);
        for (const [x, y] of [[5.8, 9], [10.6, 8], [6.6, 6.4], [9.8, 6.8]]) E(x, y + b, 0.8, 0.7, id.rot);
        for (const [x, y] of [[4.6, 7], [11.8, 7.2], [10.4, 10]]) { E(x, y + b, 0.8, 0.8, id.bloom); P(x, y + b, 13, 1, 1); }
      } else { for (const [x, y] of [[6, 7], [10, 8], [8, 9.6]]) E(x, y + b, 0.9, 0.8, id.rot); E(8, 8 + b, 1, 1, id.seed); }
      // branch arms ending in thorn claws
      for (const sx of [-1, 1]) { const a = c.arm(sx < 0 ? 'L' : 'R', 8 + sx * 4.2, 6.6 + b, 4.6, 1.5, id.bark, null); for (let i = -1; i <= 1; i++) T(a[0], a[1], a[0] + sx * 0.8 + i * 0.9, a[1] + 1.7, 0.45, id.thorn); }
      // hanging vines
      for (const x of [4.2, 11.8]) { T(x, 7.8 + b, x + sway * 0.4, 11 + b, 0.45, id.moss); E(x + sway * 0.4, 11.2 + b, 0.5, 0.5, id.bloom); }
      // head: long face of moss, crown of thorn antlers
      Q(6, 1.6 + b, 4, 4.4, id.moss, 1.4);
      if (!back) { P(6.8, 3.2 + b, 11, 1, 1); P(8.6, 3.2 + b, 11, 1, 1); R(7.2, 5 + b, 1.6, 0.6, id.black); }
      else T(6.6, 3.6 + b, 9.4, 3.6 + b, 0.5, id.leaf);
      crown(8);
    } else {
      c.leg(7, 11.6, 3.2, 1.8, id.bark, id.moss, 2.4); c.leg(9.4, 11.6, 3.2, 1.8, id.bark, id.moss, 2.4);
      Y([[5.6, 7.4 + b], [10.6, 7.4 + b], [12, 12.6], [7, 11.8], [4.2, 12.6]], id.bark);
      for (let i = 0; i < 5; i++) Y([[4 + i * 1.6, 12.2], [4.8 + i * 1.6 + sway * 0.3, 14 + (i % 3) * 0.5], [5.6 + i * 1.6, 12.2]], id.leaf);
      Q(6, 5.4 + b, 4.6, 5.4, id.bark, 1.2); E(8.4, 6.4 + b, 2, 1.5, id.moss); E(9.4, 8.4 + b, 0.9, 1, id.seed);
      for (const [x, y] of [[7.2, 9], [9.8, 10]]) E(x, y + b, 0.8, 0.7, id.rot);
      const a = c.arm('R', 9, 6.6 + b, 4.6, 1.5, id.bark, null); for (let i = -1; i <= 1; i++) T(a[0], a[1], a[0] + 0.8 + i * 0.6, a[1] + 1.7, 0.45, id.thorn);
      Q(7.4, 1.6 + b, 4, 4.4, id.moss, 1.4); P(10.4, 3.2 + b, 11, 1, 1); R(10, 5 + b, 1.6, 0.6, id.black);
      T(8.8, 2.4 + b, 10.4, 0.8 + b, 0.9, id.bark); T(10.4, 0.8 + b, 11.8, -0.2 + b, 0.7, id.bark); thorn(10, 1.6 + b, 1.6, 0.4, id.thorn);
      T(7.6, 2.6 + b, 6.2, 1 + b, 0.8, id.bark);
    }
  },
};

// ------------------------------------------------------------------------------------------------------------------------
// The Vault Sovereign: the last of the sun kings. A tall figure in gold-plated armour, a red cape, a spiked crown with a ring
// of sun behind the head, cyan eyes in the visor and a sun disc on the chest.
const SOVEREIGN = {
  palette: { gold: [13, 13, 12], armor: [4, 3, 2], dark: [2, 1, 0], cape: [12, 11, 9], glow: flat(15), black: [1, 0, 0], sun: flat(13) },
  dither: [1], groups: {},
  dead: { body: 'armor', head: 'gold' },
  draw(c) {
    const { R, E, T, Q, Y, P, id, view, bob, fr } = c, back = view === 'back', side = view === 'side', b = bob * 0.6;
    const spike = (x, y, h, w, col) => Y([[x - w, y], [x + 0.1, y - h], [x + w, y]], col);
    const halo = (cx, cy) => { E(cx, cy, 5.4, 5.4, id.sun); E(cx, cy, 4.3, 4.3, 0); };
    if (!side) {
      halo(8, 3.6 + b);
      Y([[3.4, 6 + b], [12.6, 6 + b], [14.2, 14.4], [8, 13.6], [1.8, 14.4]], id.cape);
      for (const x of [4.2, 7, 9.8, 12]) T(x, 8 + b, x + 0.2, 13.6, 0.3, id.black);
      c.leg(6.4, 11.6, 3.2, 1.9, id.armor, id.dark, 2.6); c.leg(9.6, 11.6, 3.2, 1.9, id.armor, id.dark, 2.6);
      Y([[5.4, 8.6 + b], [10.6, 8.6 + b], [11.2, 12], [8, 11.4], [4.8, 12]], id.dark);
      R(5.6, 10 + b, 4.8, 0.7, id.gold);
      Q(5, 5.2 + b, 6, 5.2, id.armor, 1.2);
      if (!back) { E(8, 7.6 + b, 1.5, 1.5, id.sun); E(8, 7.6 + b, 0.7, 0.7, id.cape); R(5.4, 5.6 + b, 5.2, 0.6, id.gold); for (const a2 of [0, 1, 2, 3, 4, 5, 6, 7]) { const r = a2 * Math.PI / 4; P(8 + Math.cos(r) * 2.3, 7.6 + b + Math.sin(r) * 2.3, 13, 1, 1); } }
      for (const sx of [-1, 1]) { E(8 + sx * 3.8, 6 + b, 1.9, 1.5, id.gold); spike(8 + sx * 4.6, 5.2 + b, 1.8, 0.5, id.gold); }
      for (const sx of [-1, 1]) c.arm(sx < 0 ? 'L' : 'R', 8 + sx * 4, 6.6 + b, 4.4, 1.6, id.armor, id.gold, 1.1);
      Q(6.2, 1.8 + b, 3.6, 4.2, id.armor, 1.2);
      if (!back) { R(6.8, 3.4 + b, 2.4, 0.8, id.black); P(7, 3.5 + b, 15, 1, 1); P(8.4, 3.5 + b, 15, 1, 1); R(7.6, 4.6 + b, 0.8, 1.2, id.dark); }
      for (const [x, h] of [[6.4, 1.4], [7.2, 2.2], [8, 2.8], [8.8, 2.2], [9.6, 1.4]]) spike(x, 2 + b, h, 0.4, id.gold);
    } else {
      halo(9, 3.6 + b);
      Y([[4, 6 + b], [9, 6 + b], [8.4, 13.6], [2.6, 14.4]], id.cape);
      c.leg(7, 11.6, 3.2, 1.9, id.armor, id.dark, 2.6); c.leg(9.4, 11.6, 3.2, 1.9, id.armor, id.dark, 2.6);
      Y([[6.2, 8.6 + b], [10.4, 8.6 + b], [11, 12], [7.6, 11.4], [5.8, 12]], id.dark);
      Q(6.2, 5.2 + b, 4.6, 5.2, id.armor, 1.2); E(9, 7.6 + b, 1.1, 1.4, id.sun);
      E(8.4, 6 + b, 1.9, 1.5, id.gold); spike(9.6, 5.2 + b, 1.8, 0.5, id.gold);
      c.arm('R', 8.8, 6.6 + b, 4.4, 1.6, id.armor, id.gold, 1.1);
      Q(7.4, 1.8 + b, 3.8, 4.2, id.armor, 1.2); R(9.2, 3.4 + b, 2.2, 0.8, id.black); P(10.2, 3.5 + b, 15, 1, 1);
      for (const [x, h] of [[7.8, 1.4], [8.6, 2.2], [9.4, 2.8], [10.2, 2.2], [11, 1.4]]) spike(x, 2 + b, h, 0.4, id.gold);
    }
  },
};

reg('blightmother', 2.6, BLIGHT);
reg('vaultsovereign', 2.6, SOVEREIGN);
