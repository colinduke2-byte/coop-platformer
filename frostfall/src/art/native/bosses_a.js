// Hand-designed bosses, part A. Each has its own anatomy so no two share a body or head shape.
import { bossSheet, ramp, flat } from './boss_kit.js';
import { registerNative } from '../native_registry.js';

const reg = (kind, scale, design) => { const N = Math.round(16 * scale); registerNative(kind, { scale, w: N, h: N, build: (scene, key) => bossSheet(scene, key, N, design) }); };

// ------------------------------------------------------------------------------------------------------------------------
// Hrolf Ironmarch: an undead warband chief. Broad iron plate, huge spiked pauldrons, horned great helm, a war banner on his back.
const WARLORD = {
  palette: { iron: [4, 3, 2], dark: [3, 2, 1], gold: flat(13), cloth: [12, 11, 9], skin: [4, 3, 2], banner: [12, 11, 9], pole: [10, 9, 1], glow: [13, 12, 12], horn: [6, 5, 4], black: [1, 0, 0] },
  dither: [1, 2], groups: {},
  dead: { body: 'iron', head: 'iron' },
  draw(c) {
    const { R, E, T, Q, Y, P, id, view, bob } = c, back = view === 'back', side = view === 'side';
    const b = bob;
    // war banner on his back: pole with a tattered flag, so the silhouette reads from every side
    if (side) { T(5.4, 12.5, 5.4, -0.2, 0.7, id.pole); Y([[5.4, 0.2], [0.4, 0.8 + b], [-0.2, 2.6], [1.2, 3.2], [0.4, 4.6], [5.4, 5]], id.banner); }
    else { T(12.8, 12, 12.8, -0.3, 0.7, id.pole); Y([[12.8, 0.2], [15.8, 0.9 + b], [15.4, 2.4], [16, 3.4], [14.4, 4.4], [12.8, 4.2]], id.banner); }
    if (!side) {
      // legs: thick greaves, tassets over the thighs
      c.leg(5.6, 11, 3.8, 2.6, id.iron, id.dark, 3.4); c.leg(10.4, 11, 3.8, 2.6, id.iron, id.dark, 3.4);
      // torso: wide plate with a ridge and rivets
      Q(3, 6.2 + b, 10, 5.6, id.iron, 1.2); R(3, 10 + b, 10, 1.1, id.dark);
      if (!back) { R(7.6, 6.4 + b, 0.8, 4, id.dark); for (const [x, y] of [[4.6, 7.4], [11, 7.4], [4.6, 9.4], [11, 9.4]]) P(x, y + b, 13); R(7.2, 10.1 + b, 1.6, 1.1, id.gold); }
      else { Q(3.6, 6.6 + b, 8.8, 4.4, id.dark, 1); R(7.6, 6.6 + b, 0.8, 4.4, id.black); }
      for (const x of [3.6, 6.4, 9.2]) Y([[x, 11.2 + b], [x + 2.6, 11.2 + b], [x + 1.3, 13 + b]], id.dark);   // tassets
      // arms: thick, gauntleted
      c.arm('L', 2.2, 8 + b, 3.2, 2.2, id.iron, id.dark, 1.3); c.arm('R', 13.8, 8 + b, 3.2, 2.2, id.iron, id.dark, 1.3);
      // pauldrons with spikes
      for (const sx of [-1, 1]) {
        const cx = 8 + sx * 5.6;
        E(cx, 7 + b, 2.7, 2, id.iron); E(cx, 6.6 + b, 2.2, 1.2, id.dark);
        for (const dx of [-0.7, 0.7]) Y([[cx + dx - 0.55, 5.7 + b], [cx + dx + sx * 0.3, 3.4 + b], [cx + dx + 0.55, 5.7 + b]], id.horn);
      }
      // head: horned great helm
      Q(5, 1.8 + b, 6, 5.2, id.iron, 1.6);
      if (!back) { R(5.4, 4 + b, 5.2, 1, id.black); P(6.2, 4.2 + b, 12, 1, 1); P(9.4, 4.2 + b, 12, 1, 1); R(7.6, 1.8 + b, 0.8, 2.2, id.dark); R(6.4, 5.6 + b, 3.2, 1, id.dark); }
      T(5.2, 3, 2.4, 1.6, 1.3, id.horn); T(2.4, 1.6, 1.8, -0.2, 0.9, id.horn); T(10.8, 3, 13.6, 1.6, 1.3, id.horn); T(13.6, 1.6, 14.2, -0.2, 0.9, id.horn);
      E(8, 1.2 + b, 1.2, 1.2, id.cloth);                                       // horsehair crest
    } else {
      c.leg(7, 11, 3.8, 3.2, id.iron, id.dark, 4); Q(4.6, 6.2 + b, 7, 5.6, id.iron, 1.4); R(4.6, 10 + b, 7, 1.1, id.dark); Q(6, 11 + b, 4, 2.2, id.dark, 0.5);
      c.arm('R', 7.6, 8 + b, 3.4, 2.4, id.iron, id.dark, 1.4);
      E(7, 7 + b, 2.6, 2, id.iron); for (const dx of [-1, 0.6]) Y([[7 + dx - 0.5, 5.7 + b], [7 + dx, 3.6 + b], [7 + dx + 0.5, 5.7 + b]], id.horn);
      Q(5.6, 1.8 + b, 5.8, 5.2, id.iron, 1.6); R(8.4, 4 + b, 3, 1, id.black); P(10.4, 4.2 + b, 12, 1, 1); R(8, 1.8 + b, 0.8, 2.2, id.dark);
      T(7, 3, 5, 1.4, 1.3, id.horn); T(5, 1.4, 4.6, -0.2, 0.9, id.horn); T(10.4, 3, 12, 1.4, 1.2, id.horn);
      E(8.4, 1.2 + b, 1.2, 1.2, id.cloth);
    }
  },
};

// ------------------------------------------------------------------------------------------------------------------------
// Admiral Veyl: a drowned sea captain. Tall tricorn, long split-tailed coat, seaweed and barnacles, a skull face with cold eyes.
const ADMIRAL = {
  palette: { coat: [3, 2, 1], lapel: [4, 3, 2], gold: flat(13), skin: [5, 4, 3], hat: [2, 1, 0], weed: [8, 7, 1], barn: [6, 5, 4], glow: flat(15), black: [1, 0, 0], boot: [2, 1, 0] },
  dither: [1], groups: {},
  dead: { body: 'coat', head: 'skin' },
  draw(c) {
    const { R, E, T, Q, Y, P, id, view, bob } = c, back = view === 'back', side = view === 'side', b = bob;
    const sw = (x, y, len, ph) => { let px = x, py = y; for (let i = 1; i <= 4; i++) { const nx = x + Math.sin(ph + i * 1.1 + c.fr) * 0.6, ny = y + (len * i) / 4; T(px, py, nx, ny, 0.55, id.weed); px = nx; py = ny; } };
    if (!side) {
      // boots peek out under a long coat that flares into two tails
      Q(5.4, 14, 2.2, 1.6, id.boot, 0.4); Q(8.4, 14, 2.2, 1.6, id.boot, 0.4);
      Y([[4.4, 6.8 + b], [11.6, 6.8 + b], [14, 14.4], [8.7, 13 + b], [8, 14.8], [7.3, 13 + b], [2, 14.4]], id.coat);
      if (!back) {
        Y([[6.6, 6.8 + b], [9.4, 6.8 + b], [8.6, 14], [7.4, 14]], id.lapel);
        for (const y of [8.2, 9.6, 11]) { P(7, y + b, 13); P(9, y + b, 13); }
        T(4.6, 7.2 + b, 11.4, 11.2 + b, 0.7, id.gold);                                      // sash
      } else { R(7.6, 7 + b, 0.8, 7, id.black); }
      c.arm('L', 3.8, 7.6 + b, 3.6, 1.8, id.coat, id.skin, 1); c.arm('R', 12.2, 7.6 + b, 3.6, 1.8, id.coat, id.skin, 1);
      R(3.1, 6.8 + b, 1.8, 1, id.gold); R(11.1, 6.8 + b, 1.8, 1, id.gold);                   // epaulettes
      for (const [x, y] of [[3.6, 7.8], [12.2, 7.8], [5, 12.4]]) E(x, y + b, 0.7, 0.55, id.barn);
      sw(3.4, 8 + b, 3.4, 0); sw(12.6, 8 + b, 3.8, 1.6);
      // head: a gaunt skull under the tricorn
      Q(5.7, 3.2 + b, 4.6, 4.2, id.skin, 1.5);
      if (!back) { Q(6.1, 4.2 + b, 1.4, 1.6, id.black, 0.5); Q(8.5, 4.2 + b, 1.4, 1.6, id.black, 0.5); P(6.7, 4.8 + b, 15, 1, 1); P(9.1, 4.8 + b, 15, 1, 1); P(7.8, 6 + b, 1, 1, 1); R(6.6, 7 + b, 2.8, 0.6, id.black); }
      // tricorn: wide brim that points up at both ends, tall crown, gold band, a soggy plume
      Y([[2.2, 3.4 + b], [5.2, 2.6 + b], [10.8, 2.6 + b], [13.8, 3.4 + b], [11, 4.2 + b], [5, 4.2 + b]], id.hat);
      Y([[2.2, 3.4 + b], [3, 1.6 + b], [4.6, 3 + b]], id.hat); Y([[13.8, 3.4 + b], [13, 1.6 + b], [11.4, 3 + b]], id.hat);
      Q(5.6, 0.4 + b, 4.8, 3, id.hat, 1.2); R(5.6, 2.6 + b, 4.8, 0.7, id.gold);
      T(10.2, 1.2 + b, 13, -0.2, 1.1, id.weed); sw(5.4, 4.2 + b, 2.6, 2.4);
    } else {
      Q(6.4, 14, 2.8, 1.6, id.boot, 0.4);
      Y([[5.6, 6.8 + b], [10.6, 6.8 + b], [12, 12 + b], [10.6, 14.6], [5.4, 14.6], [3.2, 13.4], [4.6, 11 + b]], id.coat);
      T(5, 9 + b, 2, 13.8, 2.6, id.coat);                                                       // coat tail streaming behind
      c.arm('R', 8, 7.8 + b, 3.4, 1.8, id.coat, id.skin, 1); R(5.6, 9.6 + b, 4.8, 0.8, id.gold);
      for (const [x, y] of [[6.6, 8.2], [4.2, 12.2]]) E(x, y + b, 0.7, 0.55, id.barn);
      Q(7, 3.2 + b, 4.4, 4.2, id.skin, 1.5); Q(9.4, 4.2 + b, 1.4, 1.6, id.black, 0.5); P(10.2, 4.8 + b, 15, 1, 1); R(8.6, 7 + b, 2.6, 0.6, id.black);
      Y([[3.4, 3.4 + b], [6, 2.6 + b], [12.2, 2.6 + b], [13.6, 3.6 + b], [10.6, 4.2 + b], [5.6, 4.2 + b]], id.hat);
      Q(6.4, 0.4 + b, 4.8, 3, id.hat, 1.2); R(6.4, 2.6 + b, 4.8, 0.7, id.gold); T(7, 1.2 + b, 4, -0.2, 1.1, id.weed); sw(5, 4.2 + b, 2.6, 1.2);
    }
  },
};

// ------------------------------------------------------------------------------------------------------------------------
// The Hollow King: a spectre. No legs, a ragged robe that ends in tatters, a tall spiked crown on a bare skull, long claw hands.
const HOLLOW = {
  palette: { robe: [14, 1, 0], inner: [1, 0, 0], bone: [6, 5, 4], gold: flat(13), glow: flat(14), wisp: [14, 14, 1], black: [0, 0, 0] },
  dither: [1], groups: {},
  dead: { body: 'robe', head: 'bone' },
  draw(c) {
    const { R, E, T, Q, Y, P, id, view, bob, fr } = c, back = view === 'back', side = view === 'side', b = bob;
    const hover = fr ? -0.5 : 0;
    // ragged hem: a row of tatter spikes with a gap showing the dark inside
    const hem = (x0, x1, y, depth) => { const n = Math.round((x1 - x0) / 1.4); for (let i = 0; i < n; i++) { const x = x0 + (i * (x1 - x0)) / n, w = (x1 - x0) / n; Y([[x, y], [x + w, y], [x + w * 0.5, y + depth + (i % 3) * 0.5]], id.robe); } };
    if (!side) {
      Y([[4.2, 6.6 + b + hover], [11.8, 6.6 + b + hover], [14.4, 13.4], [1.6, 13.4]], id.robe);
      hem(1.6, 14.4, 13.2, 1.8);
      if (!back) { Y([[6.4, 8 + b], [9.6, 8 + b], [9.8, 13.4], [6.2, 13.4]], id.inner); for (const y of [8.6, 9.8, 11]) R(6.4, y + b, 3.2, 0.5, id.bone); }   // a ribcage seen through the open robe
      else { R(7.6, 7 + b, 0.8, 6, id.inner); }
      // high spiked collar and drooping sleeves ending in long claw hands
      Y([[3.6, 7.6 + b], [4.8, 4.6 + b], [6, 7.2 + b]], id.robe); Y([[12.4, 7.6 + b], [11.2, 4.6 + b], [10, 7.2 + b]], id.robe);
      for (const sx of [-1, 1]) { const x = 8 + sx * 4.6, a = c.arm(sx < 0 ? 'L' : 'R', x, 8 + b, 3.6, 1.6, id.robe, null); for (let i = -1; i <= 1; i++) T(a[0], a[1], a[0] + i * 0.9 + sx * 0.3, a[1] + 2, 0.45, id.bone); E(a[0], a[1], 0.8, 0.8, id.bone); }
      Q(5.4, 1.6 + b, 5.2, 5.6, id.bone, 1.8);
      if (!back) { E(6.9, 4.4 + b, 1.2, 1.4, id.black); E(9.1, 4.4 + b, 1.2, 1.4, id.black); P(6.7, 4.6 + b, 14, 1, 1); P(8.9, 4.6 + b, 14, 1, 1); Y([[7.5, 5.6 + b], [8.5, 5.6 + b], [8, 6.6 + b]], id.black); for (let i = 0; i < 4; i++) R(6.2 + i * 0.9, 7 + b, 0.5, 0.9, id.black); }
      else { for (const x of [6.4, 8, 9.6]) R(x, 2.4 + b, 0.4, 4, id.inner); }
      // crown: five tall jagged points
      R(5.4, 1.6 + b, 5.2, 1.1, id.gold);
      for (const [x, h] of [[5.4, 1.6], [6.8, 2.6], [8, 3.2], [9.2, 2.6], [10.4, 1.6]]) Y([[x - 0.5, 1.8 + b], [x, 1.6 - h + b], [x + 0.6, 1.8 + b]], id.gold);
      for (const [x, y] of [[2, 10], [14, 11], [3, 6], [13.4, 7]]) Y([[x - 0.5, y], [x, y - 1], [x + 0.5, y], [x, y + 0.8]], id.wisp);   // drifting shards
    } else {
      Y([[5, 6.6 + b + hover], [10.6, 6.6 + b + hover], [12.4, 13.4], [1.2, 13.4]], id.robe); hem(1.2, 12.4, 13.2, 1.8);
      Y([[5.4, 7.8], [4.6, 5 + b], [7, 7]], id.robe);
      const a = c.arm('R', 8.4, 8 + b, 3.6, 1.6, id.robe, null); for (let i = -1; i <= 1; i++) T(a[0], a[1], a[0] + 1.2, a[1] + 0.6 + i * 0.7, 0.45, id.bone);
      Q(6.4, 1.6 + b, 5, 5.6, id.bone, 1.8); E(9.8, 4.4 + b, 1.2, 1.4, id.black); P(10, 4.6 + b, 14, 1, 1); Y([[11.4, 5.2 + b], [12.4, 6.2 + b], [11, 6.4 + b]], id.bone);
      R(7, 1.6 + b, 4.8, 1.1, id.gold); for (const [x, h] of [[7.2, 1.6], [8.6, 2.6], [10, 3.2], [11.2, 2]]) Y([[x - 0.5, 1.8 + b], [x, 1.6 - h + b], [x + 0.6, 1.8 + b]], id.gold);
    }
  },
};

// ------------------------------------------------------------------------------------------------------------------------
// Captain Brinegut: a brawling pirate. Barrel belly, bicorne with a skull, eyepatch, braided black beard, peg leg and a hook.
const BRINE = {
  palette: { coat: [12, 11, 9], shirt: [6, 5, 4], hat: [2, 1, 0], skin: [10, 10, 9], beard: [3, 1, 0], gold: flat(13), wood: [10, 9, 1], steel: [5, 4, 3], black: [1, 0, 0], sash: [11, 9, 1], bone: [6, 6, 5] },
  dither: [1, 2], groups: {},
  dead: { body: 'coat', head: 'skin' },
  draw(c) {
    const { R, E, T, Q, Y, P, id, view, bob } = c, back = view === 'back', side = view === 'side', b = bob;
    if (!side) {
      // one boot, one peg
      c.leg(5.6, 12, 2.6, 2.4, id.coat, id.black, 3);
      T(10.6, 12.2, 10.6, 15.4, 1.1, id.wood); R(10, 15, 1.2, 0.8, id.black);
      // belly: a round barrel under an open coat
      E(8, 10, 5.6, 3.8, id.coat);
      if (!back) { E(8, 10.4, 3.6, 3, id.shirt); for (const y of [9, 10.4, 11.8]) R(5, y, 6, 0.4, id.sash); R(4.6, 11.8, 6.8, 1.3, id.sash); P(8, 12.2, 13, 1, 1); Q(5.2, 11.4, 1.1, 2, id.black, 0.3); Q(9.8, 11.4, 1.1, 2, id.black, 0.3); }
      Y([[3.6, 6.6], [12.4, 6.6], [13.6, 11.6], [11.4, 12.4], [11.6, 7.6], [4.4, 7.6], [4.6, 12.4], [2.4, 11.6]], id.coat);
      R(3.2, 6.6, 1.6, 1, id.gold); R(11.2, 6.6, 1.6, 1, id.gold);
      // left arm swings a fist; right arm ends in a hook
      c.arm('L', 2.6, 8 + b, 3.2, 2, id.coat, id.skin, 1.2);
      const a = c.arm('R', 13.4, 8 + b, 3.2, 2, id.coat, null); T(a[0], a[1], a[0] + 0.4, a[1] + 1.6, 0.6, id.steel); T(a[0] + 0.4, a[1] + 1.6, a[0] - 0.6, a[1] + 2.4, 0.5, id.steel);
      // head
      Q(5.4, 2.8 + b, 5.2, 4.4, id.skin, 1.6);
      if (!back) {
        Q(5.8, 3.8 + b, 1.6, 1.4, id.black, 0.4); T(5.4, 3.7 + b, 8.4, 3.2 + b, 0.3, id.black); P(9.2, 4.2 + b, 1, 1, 1);    // eyepatch strap and an eye
        R(7.8, 5.2 + b, 0.8, 1, id.skin); P(7.6, 5.4 + b, 11, 1, 1);
        Q(5, 5.6 + b, 6, 3.2, id.beard, 1.3); T(6.2, 8.2 + b, 6, 10.6 + b, 0.7, id.beard); T(9.8, 8.2 + b, 10, 10.6 + b, 0.7, id.beard); P(6, 10.4 + b, 13, 1, 1); P(10, 10.4 + b, 13, 1, 1);
        R(7, 6.2 + b, 2, 0.5, id.bone);
      } else { Q(5.2, 3 + b, 5.6, 4, id.beard, 1.4); }
      // bicorne hat with skull
      Y([[1.8, 3.2 + b], [4, 1 + b], [12, 1 + b], [14.2, 3.2 + b], [12, 3.6 + b], [4, 3.6 + b]], id.hat); R(3.4, 3 + b, 9.2, 0.6, id.gold);
      if (!back) { E(8, 2.1 + b, 0.9, 0.8, id.bone); P(7.4, 2.9 + b, 6, 1, 1); P(8.6, 2.9 + b, 6, 1, 1); }
    } else {
      c.leg(7, 12, 2.6, 2.4, id.coat, id.black, 3); T(5.4, 12.4, 4.4, 15.4, 1.1, id.wood);
      E(8.4, 10, 5.4, 3.8, id.coat); E(10, 10.4, 3, 3, id.shirt); R(6, 11.8, 6.6, 1.3, id.sash);
      Y([[5, 6.6], [11, 6.6], [13.4, 11.6], [11, 12.4], [4.6, 11]], id.coat);
      const a = c.arm('R', 8.4, 8 + b, 3.2, 2, id.coat, null); T(a[0], a[1], a[0] + 1.4, a[1] + 0.8, 0.6, id.steel); T(a[0] + 1.4, a[1] + 0.8, a[0] + 1.6, a[1] - 0.2, 0.5, id.steel);
      Q(6.4, 2.8 + b, 5.2, 4.4, id.skin, 1.6); Q(9.4, 3.8 + b, 1.6, 1.4, id.black, 0.4); P(10.6, 5.4 + b, 11, 1, 1);
      Q(7.4, 5.6 + b, 4.6, 3.4, id.beard, 1.3); T(11, 8.4 + b, 11.4, 10.8 + b, 0.7, id.beard);
      Y([[3.4, 3.2 + b], [5.4, 1 + b], [12.6, 1 + b], [13.8, 3.2 + b], [11.6, 3.6 + b], [5.4, 3.6 + b]], id.hat); R(4.4, 3 + b, 8.6, 0.6, id.gold); E(9, 2.1 + b, 0.9, 0.8, id.bone);
    }
  },
};

reg('warlord', 2.4, WARLORD);
reg('admiral', 2.5, ADMIRAL);
reg('hollowking', 2.8, HOLLOW);
reg('brinegut', 2.4, BRINE);
