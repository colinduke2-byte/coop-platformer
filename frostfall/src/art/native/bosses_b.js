// Hand-designed bosses, part B: Ashen Sovereign, Kragnar, Long Winter, Mire Mother, Storm Giant, Hartking, Lode Colossus.
import { bossSheet, flat } from './boss_kit.js';
import { registerNative } from '../native_registry.js';

const reg = (kind, scale, design) => { const N = Math.round(16 * scale); registerNative(kind, { scale, w: N, h: N, build: (scene, key) => bossSheet(scene, key, N, design) }); };

// ------------------------------------------------------------------------------------------------------------------------
// The Ashen Sovereign: a figure of cooling coal with fire for a crown and mantle. Tall flame tongues, glowing cracks, drifting embers.
const SOVEREIGN = {
  palette: { coal: [2, 1, 0], ash: [3, 2, 1], flame: [13, 12, 11], fire: [12, 11, 9], core: flat(13), glow: flat(13), black: [1, 0, 0], ember: flat(12), skin: [2, 1, 0] },
  dither: [1], groups: {},
  dead: { body: 'coal', head: 'coal' },
  draw(c) {
    const { R, E, T, Q, Y, P, id, view, bob, fr } = c, back = view === 'back', side = view === 'side', b = bob;
    const tongue = (x, y, h, w, ph, col) => { const s = Math.sin(fr * 2.1 + ph) * 0.7; Y([[x - w, y], [x + s * 0.6, y - h], [x + w, y]], col); };
    if (!side) {
      // skirt of ash robes that breaks up into embers at the hem, no feet
      Y([[4.4, 7 + b], [11.6, 7 + b], [13.2, 13.6], [10.6, 12.6], [9, 14.2], [8, 12.8], [7, 14.2], [5.4, 12.6], [2.8, 13.6]], id.ash);
      for (const [x, y] of [[3.4, 14.6], [6.6, 15.2], [9.6, 15], [12.4, 14.4]]) P(x + (fr ? 0.4 : 0), y, 12, 1, 1);
      if (!back) { E(8, 9.4 + b, 1.6, 1.6, id.fire); E(8, 9.4 + b, 0.9, 0.9, id.core); T(5.6, 8 + b, 7.2, 9.8 + b, 0.35, id.core); T(7, 12, 6, 13.4, 0.35, id.core); T(10.4, 8 + b, 9, 9.6 + b, 0.35, id.core); T(9, 11, 10.2, 13, 0.35, id.core); }
      else { T(8, 7.6 + b, 8.6, 10 + b, 0.4, id.core); T(8.6, 10 + b, 7.4, 12.6, 0.4, id.core); }
      // mantle of flame on the shoulders
      E(8, 7 + b, 5.6, 1.4, id.coal);
      for (const [x, h, p] of [[3, 2.8, 0], [4.4, 4.4, 1], [11.6, 4.4, 2], [13, 2.8, 3]]) tongue(x, 7.4 + b, h, 0.6, p, id.flame);
      for (const sx of [-1, 1]) { const a = c.arm(sx < 0 ? 'L' : 'R', 8 + sx * 5.2, 8 + b, 3.6, 1.5, id.ash, id.fire, 1.1); P(a[0], a[1] + 1.4, 12, 1, 1); }
      // head: a charred skull with white-hot eyes under a tall flame crown
      Q(5.6, 2.8 + b, 4.8, 4.6, id.coal, 1.8);
      if (!back) { P(6.6, 4.4 + b, 13, 1, 1); P(6.6, 4.4 + b, 13, 2, 1); P(8.8, 4.4 + b, 13, 2, 1); R(7, 6.4 + b, 2, 0.5, id.fire); }
      for (const [x, h, p, w] of [[5.8, 2.6, 0, 0.5], [6.9, 4.4, 1, 0.55], [8, 6.2, 2, 0.6], [9.1, 4.4, 3, 0.55], [10.2, 2.6, 4, 0.5]]) tongue(x, 3.4 + b, h, w, p, id.flame);
      for (const [x, y] of [[2.4, 3], [13.6, 2], [1.6, 9.2], [14.6, 8.6]]) P(x, y + (fr ? -0.6 : 0), 12, 1, 1);
    } else {
      Y([[5.4, 7 + b], [10.6, 7 + b], [12, 13.6], [9, 12.8], [7.4, 14.2], [5.6, 12.6], [3, 13.6]], id.ash);
      for (const [x, y] of [[3.2, 14.4], [7, 15.2], [11, 14.6]]) P(x, y, 12, 1, 1);
      E(8.6, 9.4 + b, 1.5, 1.5, id.fire); E(8.6, 9.4 + b, 0.8, 0.8, id.core);
      E(8, 7 + b, 4, 1.4, id.coal); for (const [x, h, p] of [[4.4, 3.4, 0], [6.2, 4.4, 1], [11, 3, 2]]) tongue(x, 7.4 + b, h, 0.9, p, id.flame);
      const a = c.arm('R', 8.8, 8 + b, 3.6, 1.5, id.ash, id.fire, 1.1);
      Q(6.6, 2.8 + b, 4.8, 4.6, id.coal, 1.8); P(10, 4.4 + b, 13, 2, 1); R(9.6, 6.4 + b, 1.8, 0.5, id.fire);
      for (const [x, h, p, w] of [[7, 3, 0, 0.5], [8.1, 5, 1, 0.55], [9.2, 6.2, 2, 0.6], [10.3, 3.6, 3, 0.5]]) tongue(x, 3.4 + b, h, w, p, id.flame);
    }
  },
};

// ------------------------------------------------------------------------------------------------------------------------
// Kragnar the Hollowed: a hulking brute, almost no neck, long arms that drag low, great curved horns, shackles with broken chains.
const KRAGNAR = {
  palette: { skin: [4, 3, 2], skin2: [3, 2, 1], horn: [6, 5, 4], iron: [3, 2, 1], rust: [10, 9, 1], cloth: [9, 1, 0], glow: flat(12), black: [1, 0, 0], tusk: [6, 6, 5], crack: flat(12) },
  dither: [1, 2], groups: {},
  dead: { body: 'skin', head: 'skin' },
  draw(c) {
    const { R, E, T, Q, Y, P, id, view, bob } = c, back = view === 'back', side = view === 'side', b = bob + 0.6;
    if (!side) {
      // short bowed legs, ragged loincloth
      c.leg(5, 12.2, 2.6, 3, id.skin2, id.rust, 3.6); c.leg(11, 12.2, 2.6, 3, id.skin2, id.rust, 3.6);
      Y([[5, 10.8 + b], [11, 10.8 + b], [10.6, 13.6], [9.4, 12.6], [8, 14.2], [6.6, 12.6], [5.4, 13.6]], id.cloth);
      // barrel chest and sloping shoulders
      E(8, 9 + b, 5.6, 4.2, id.skin); E(4.6, 7 + b, 2.4, 1.8, id.skin); E(11.4, 7 + b, 2.4, 1.8, id.skin);
      if (!back) { T(8, 6.4 + b, 8, 11.6 + b, 0.35, id.black); for (const y of [8, 9.4, 10.8]) { T(8, y + b, 5.4, y + 0.5 + b, 0.3, id.black); T(8, y + b, 10.6, y + 0.5 + b, 0.3, id.black); }
        T(5.4, 12 + b, 8, 11 + b, 0.7, id.iron); T(10.6, 12 + b, 8, 11 + b, 0.7, id.iron); E(8, 11 + b, 1, 0.9, id.rust); P(6.6, 8, 12, 1, 1); P(9.4, 7.6, 12, 1, 1); }
      else { T(5.4, 6.4 + b, 8, 12 + b, 0.35, id.black); T(10.6, 6.4 + b, 8, 12 + b, 0.35, id.black); }
      // arms long enough to hang past the belt, ending in oversized fists with iron cuffs and broken chain
      for (const sx of [-1, 1]) {
        const a = c.arm(sx < 0 ? 'L' : 'R', 8 + sx * 6, 7.6 + b, 4.4, 2.8, id.skin, id.skin, 1.9);
        R(a[0] - 1.5, a[1] - 1.5, 3, 1, id.iron); T(a[0], a[1] - 1, a[0] + sx * 0.8, a[1] + 1.6, 0.4, id.iron); E(a[0] + sx * 0.8, a[1] + 1.8, 0.5, 0.5, id.iron);
      }
      // a small head sunk between the shoulders under enormous horns
      Q(6.2, 3.6 + b, 3.6, 3.4, id.skin2, 1.2);
      if (!back) { P(6.8, 4.8 + b, 12, 1, 1); P(8.8, 4.8 + b, 12, 1, 1); R(6.6, 6.2 + b, 2.8, 0.7, id.black); Y([[6.8, 6.4 + b], [7.2, 7.6 + b], [7.6, 6.4 + b]], id.tusk); Y([[8.4, 6.4 + b], [8.8, 7.6 + b], [9.2, 6.4 + b]], id.tusk); }
      T(6.4, 4.4 + b, 3, 3.6 + b, 1.6, id.horn); T(3, 3.6 + b, 1.2, 1.4 + b, 1.4, id.horn); T(1.2, 1.4 + b, 2, -0.2, 0.8, id.horn);
      T(9.6, 4.4 + b, 13, 3.6 + b, 1.6, id.horn); T(13, 3.6 + b, 14.8, 1.4 + b, 1.4, id.horn); T(14.8, 1.4 + b, 14, -0.2, 0.8, id.horn);
    } else {
      c.leg(7, 12.2, 2.6, 3.4, id.skin2, id.rust, 4); Y([[5.4, 10.8 + b], [10.6, 10.8 + b], [10, 13.6], [8, 12.6], [6, 13.6]], id.cloth);
      E(8, 9 + b, 5, 4.2, id.skin); E(9.6, 6.8 + b, 2.6, 2, id.skin); T(3.4, 8 + b, 1.6, 11 + b, 2, id.skin);                                  // hunched back
      const a = c.arm('R', 9.4, 7.6 + b, 4.8, 2.8, id.skin, id.skin, 1.9); R(a[0] - 1.5, a[1] - 1.5, 3, 1, id.iron);
      Q(8.2, 3.8 + b, 3.6, 3.4, id.skin2, 1.2); P(10.4, 4.8 + b, 12, 1, 1); R(10, 6.2 + b, 2, 0.7, id.black); Y([[10.4, 6.4 + b], [10.8, 7.6 + b], [11.2, 6.4 + b]], id.tusk);
      T(8.8, 4.4 + b, 5, 3.4 + b, 1.6, id.horn); T(5, 3.4 + b, 2.4, 1.4 + b, 1.4, id.horn); T(2.4, 1.4 + b, 3, -0.2, 0.8, id.horn); T(10.6, 4.4 + b, 13.4, 3.4 + b, 1.2, id.horn);
    }
  },
};

// ------------------------------------------------------------------------------------------------------------------------
// The Long Winter: a tall, slender ice queen. A gown that flows to a point of icicles, frost mantle with hanging spears of ice,
// a crown of crystal and long white hair. Nothing here is round or heavy.
const WINTER = {
  palette: { gown: [5, 15, 4], gown2: [6, 5, 4], skin: [6, 5, 4], hair: [6, 6, 5], crown: [6, 15, 15], ice: [6, 15, 4], glow: flat(15), black: [2, 1, 0], mantle: [6, 5, 4] },
  dither: [1], groups: {},
  dead: { body: 'gown', head: 'skin' },
  draw(c) {
    const { R, E, T, Q, Y, P, id, view, bob, fr } = c, back = view === 'back', side = view === 'side', b = bob * 0.6;
    const icicle = (x, y, h, w, col) => Y([[x - w, y], [x, y + h], [x + w, y]], col);
    if (!side) {
      // long gown, narrow at the waist, a rim of icicles for a hem
      Y([[6.2, 8 + b], [9.8, 8 + b], [12, 14], [4, 14]], id.gown);
      Y([[7, 9 + b], [9, 9 + b], [10.2, 14], [5.8, 14]], id.gown2);
      for (let i = 0; i < 8; i++) icicle(4.4 + i * 1, 13.6, 1.6 + (i % 3) * 0.5, 0.6, id.ice);
      if (!back) { T(8, 8.4 + b, 8, 13.4, 0.35, id.ice); R(6.6, 9 + b, 2.8, 0.5, id.crown); P(7, 11, 6, 1, 1); P(9, 12, 6, 1, 1); }
      // frost mantle across the shoulders with icicle fringe
      E(8, 7.2 + b, 5.2, 1.3, id.mantle); for (const x of [3.4, 4.8, 6.2, 9.8, 11.2, 12.6]) icicle(x, 7.8 + b, 1.8 + (x % 2), 0.5, id.ice);
      // slim arms with crystal gauntlets
      for (const sx of [-1, 1]) { const a = c.arm(sx < 0 ? 'L' : 'R', 8 + sx * 4.2, 7.8 + b, 3.4, 1.1, id.gown2, id.ice, 0.9); icicle(a[0], a[1] + 0.8, 1.6, 0.5, id.ice); }
      // long hair falls behind the shoulders; narrow face
      Y([[5, 3.6 + b], [4, 11 + b], [6, 8 + b]], id.hair); Y([[11, 3.6 + b], [12, 11 + b], [10, 8 + b]], id.hair);
      Q(5.8, 2.8 + b, 4.4, 4.6, id.skin, 1.8);
      if (!back) { P(6.6, 4.6 + b, 15, 1, 2); P(8.8, 4.6 + b, 15, 1, 2); P(7.6, 6.4 + b, 11, 1, 1); R(5.8, 2.6 + b, 4.4, 1.4, id.hair); }
      else Q(5.4, 2.4 + b, 5.2, 5.4, id.hair, 2);
      // crown of crystal spikes
      for (const [x, h] of [[5.8, 2], [6.8, 3], [8, 4.2], [9.2, 3], [10.2, 2]]) Y([[x - 0.45, 3 + b], [x, 3 - h + b], [x + 0.5, 3 + b]], id.crown);
      R(5.8, 2.8 + b, 4.4, 0.7, id.crown);
      for (const [x, y] of [[2, 4], [14, 3], [1.8, 11], [14.2, 10]]) { P(x, y, 6, 1, 1); P(x - 1, y, 5, 1, 1); P(x + 1, y, 5, 1, 1); P(x, y - 1, 5, 1, 1); P(x, y + 1, 5, 1, 1); }
    } else {
      Y([[6.8, 8 + b], [10, 8 + b], [12.6, 14], [3.4, 14]], id.gown); Y([[7.6, 9 + b], [9.4, 9 + b], [10.6, 14], [6, 14]], id.gown2);
      for (let i = 0; i < 9; i++) icicle(3.6 + i * 1, 13.6, 1.6 + (i % 3) * 0.5, 0.6, id.ice);
      E(8, 7.2 + b, 3, 1.3, id.mantle); for (const x of [5.4, 7, 8.6, 10.2]) icicle(x, 7.8 + b, 1.8 + (x % 2), 0.5, id.ice);
      const a = c.arm('R', 8.6, 7.8 + b, 3.4, 1.1, id.gown2, id.ice, 0.9); icicle(a[0], a[1] + 0.8, 1.6, 0.5, id.ice);
      Y([[6.8, 3.6 + b], [4, 12 + b], [7, 9 + b]], id.hair); Y([[7.6, 3 + b], [5.4, 13 + b], [8.4, 9 + b]], id.hair);
      Q(7, 2.8 + b, 4.4, 4.6, id.skin, 1.8); P(10, 4.6 + b, 15, 1, 2); P(11, 6.4 + b, 11, 1, 1); R(7, 2.6 + b, 3.4, 1.4, id.hair);
      for (const [x, h] of [[7.2, 2], [8.2, 3.2], [9.4, 4.2], [10.4, 3]]) Y([[x - 0.45, 3 + b], [x, 3 - h + b], [x + 0.5, 3 + b]], id.crown);
    }
  },
};

reg('sovereign', 2.8, SOVEREIGN);
reg('kragnar', 2.6, KRAGNAR);
reg('winter', 3, WINTER);
