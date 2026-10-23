// Native-pixel creatures of the Embergreen Vale and the Sunscorch Reach: thornling, hornet, blightbloom, dewsprite, mosshulk,
// sandburrower, scorpion, dustdevil. Drawn in the 16-unit design cell facing right, rasterised at k = size / 16 (like animals.js).
import { Grid, render, blit, makeNativeSheet, shaper, flippedV } from '../native.js';
import { registerNative } from '../native_registry.js';

const sheet = (scene, key, N, frames) => makeNativeSheet(scene, key, N, N, frames.map(([name, pix]) => ({ name, draw: (ctx, ox) => blit(ctx, pix, N, N, ox, 0) })));
const jolt = (pix, N, dx, dy) => { const o = new Int16Array(N * N).fill(-1); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < N && ny < N) o[ny * N + nx] = pix[y * N + x]; } return o; };
const full = (draw) => (scene, key, N) => {
  const a = draw(N, 0), b = draw(N, 1), c = draw(N, 2), j = Math.max(1, Math.round(N / 16));
  sheet(scene, key, N, [['side0', a], ['side1', b], ['side2', c], ['hurt0', jolt(b, N, -j, -j)], ['death0', flippedV(a, N, N)]]);
};
const px = (k) => Math.max(1, Math.round(k * 0.7));

// ------------------------------------------------------------------ thornling: a walking knot of briars
// ids: 1 body, 2 thorn, 3 vine (dark), 4 leaf tuft
const THORN_R = { 1: [8, 8, 7], 2: [6, 5, 4], 3: [8, 7, 1], 4: [8, 8, 8] };
function thornPix(N, f) {
  const k = N / 16, g = new Grid(N, N), { R, E, T, P, Y } = shaper(g, k);
  const sw = f === 1 ? 1.2 : f === 2 ? -1.2 : 0;
  T(5.6, 11, 5.4 + sw, 15, 1.5, 3); T(9, 11, 9.2 - sw, 15, 1.5, 3);                          // legs of twisted vine
  R(4.4 + sw, 14.6, 2.6, 1, 3); R(8.2 - sw, 14.6, 2.6, 1, 3);
  E(7.4, 8.4, 3, 4, 1);                                                                        // narrow torso
  for (const y of [6.2, 8.4, 10.4]) T(5.2, y, 9.8, y + 0.8, 0.7, 3);                           // vines wound round it
  for (const [x, y] of [[4.6, 5.6], [4.4, 8.6], [5, 11], [10.2, 6.4], [10.4, 9.8]]) Y([[x, y + 1], [x - 2, y - 0.6], [x + 0.6, y - 1]], 2);   // long thorns
  T(9.6, 7.4, 12.8, 9 + (f === 1 ? -1 : 0), 1.3, 3); Y([[12.2, 7.6], [15.4, 9], [12.8, 10.4]], 2);    // reaching arm, thorn claw
  T(5.2, 7.2, 2.6, 9.2 + sw * 0.4, 1.1, 3); Y([[2.6, 8], [0.6, 9.4], [3, 10.4]], 2);
  E(9, 3.4, 2.2, 2.1, 1);
  Y([[7.4, 2], [7.2, -0.6], [8.6, 1.4]], 2); Y([[9.4, 1.4], [10.4, -1], [10.8, 1.8]], 2); Y([[6.6, 3.4], [4.8, 2.4], [6.8, 4.8]], 2);
  P(9.8, 3.2, 13, px(k), px(k)); P(8.2, 3.4, 13, px(k), px(k));
  return render(g, THORN_R, { dither: [1] });
}

// ------------------------------------------------------------------ hornet: a hand-long wasp
// ids: 1 thorax, 2 abdomen, 3 stripe, 4 head, 5 wing
const HORNET_R = { 1: [13, 12, 9], 2: [13, 13, 12], 3: [1, 0, 0], 4: [12, 11, 9], 5: [6, 5, 4] };
function hornetPix(N, f) {
  const k = N / 16, g = new Grid(N, N), { R, E, T, P, Y } = shaper(g, k);
  const wy = f === 0 ? 1.4 : f === 1 ? 3.4 : 0;
  T(7.4, 6.4, 5.4, wy, 2.4, 5); T(8.4, 6.4, 8.8, wy - 0.4, 2, 5);                               // wings, a blur
  E(4.2, 9.4, 3.2, 2.5, 2);
  for (const x of [3, 4.8]) R(x, 7.6, 0.9, 3.6, 3);
  Y([[1.4, 10.6], [-0.4, 11.8], [1.4, 12]], 4);                                                // stinger
  E(8, 8.4, 2.2, 2.1, 1);
  E(11.2, 7.8, 1.9, 1.8, 4);
  T(12.4, 9.2, 14.2, 10, 0.8, 3);
  for (const x of [6.2, 8.2]) T(x, 10, x - 0.4 + (f === 1 ? 0.6 : 0), 12.8, 0.55, 3);
  P(11.8, 7, 0, px(k), px(k));
  return render(g, HORNET_R, { dither: false });
}

// ------------------------------------------------------------------ blightbloom: a rooted flower with a mouth
// ids: 1 stem, 2 petal, 3 mouth, 4 tooth, 5 leaf
const BLOOM_R = { 1: [8, 7, 7], 2: [14, 14, 1], 3: [11, 9, 1], 4: [6, 6, 5], 5: [8, 8, 7] };
function bloomPix(N, f) {
  const k = N / 16, g = new Grid(N, N), { E, T, P, Y } = shaper(g, k);
  const open = f === 1 ? 1.1 : f === 2 ? 0.55 : 0.1, sway = f === 1 ? 0.5 : f === 2 ? -0.5 : 0;
  T(7.6, 15.6, 7.6 + sway, 9, 1.9, 1);
  Y([[7.6, 14], [3.6, 12], [3.2, 14.4], [7.4, 15]], 5); Y([[8, 12.8], [12.4, 11], [12.8, 13.4], [8.2, 14.4]], 5);
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; E(8 + sway + Math.cos(a) * 4.1, 5.4 + Math.sin(a) * 3.8, 2.3, 2.1, 2); }
  E(8 + sway, 5.4, 3.2 + open * 0.3, 2.8 + open, 3);
  for (let i = 0; i < 4; i++) { Y([[5.6 + sway + i * 1.5, 3.8], [6.4 + sway + i * 1.5, 5 + open * 0.2], [5.2 + sway + i * 1.5, 4.9]], 4); Y([[5.6 + sway + i * 1.5, 7.6], [6.4 + sway + i * 1.5, 6.4 - open * 0.2], [5.2 + sway + i * 1.5, 6.5]], 4); }
  P(7 + sway, 5, 13, px(k), px(k)); P(9.4 + sway, 5, 13, px(k), px(k));
  return render(g, BLOOM_R, { dither: [1] });
}

// ------------------------------------------------------------------ dewsprite: a drop of living water with wings
// ids: 1 body, 2 wing, 3 tail
const DEW_R = { 1: [6, 15, 4], 2: [6, 5, 4], 3: [15, 4, 3] };
function dewPix(N, f) {
  const k = N / 16, g = new Grid(N, N), { E, T, P } = shaper(g, k);
  const b = f === 1 ? -0.7 : f === 2 ? 0.7 : 0;
  T(6.4, 10.8 + b, 4.4, 14 + b, 1.8, 3); T(4.4, 14 + b, 3, 14.6 + b, 0.9, 3);
  T(6, 6.6 + b, 2.6, 2.6 + b * 2, 2.2, 2); E(3.6, 2.4 + b * 2, 2.4, 1.4, 2);
  T(7.6, 6.6 + b, 8.8, 1.4 + b * 2, 2.2, 2); E(9, 1.8 + b * 2, 1.4, 2, 2);
  E(7.4, 8.2 + b, 3.2, 3.4, 1);
  P(8.4, 7.4 + b, 0, px(k), px(k)); P(6.4, 7.6 + b, 0, px(k), px(k)); P(7.2, 9.4 + b, 11, px(k), 1);
  return render(g, DEW_R, { dither: [1] });
}

// ------------------------------------------------------------------ mosshulk: a boulder that decided to walk
// ids: 1 stone, 2 moss, 3 arm, 4 foot
const HULK_R = { 1: [4, 3, 2], 2: [8, 8, 7], 3: [3, 2, 1], 4: [3, 2, 1] };
function hulkPix(N, f) {
  const k = N / 16, g = new Grid(N, N), { E, T, P, Y } = shaper(g, k);
  const s = f === 1 ? 0.8 : f === 2 ? -0.8 : 0;
  E(5.6 + s, 14, 2.2, 1.7, 4); E(10.4 - s, 14, 2.2, 1.7, 4);
  E(8, 9, 6.4, 5.2, 1);
  T(3.4, 8.6, 2.2, 12.6 + s, 2.6, 3); E(2.2, 13 + s, 1.9, 1.5, 3);
  E(8, 5.6, 5.4, 3, 2);                                                                         // moss mantle
  for (const [x, y] of [[3.4, 7.2], [6, 7.6], [10, 7.4], [12.4, 6.8]]) E(x, y, 1.1, 1, 2);
  T(12.6, 8.4, 13.8 + s * 0.3, 12.4, 2.6, 3); E(13.8, 12.8, 1.9, 1.5, 3);
  E(11.2, 5.4, 2.2, 1.9, 1);
  Y([[6.6, 3.6], [7.4, 1.6], [8.4, 3.4]], 2); Y([[9.2, 3.2], [10.6, 1.2], [11.2, 3.2]], 2);
  P(11.8, 5, 13, px(k), px(k)); P(10.2, 5.2, 13, px(k), px(k));
  return render(g, HULK_R, { dither: [1] });
}

// ------------------------------------------------------------------ sandburrower: a worm half out of the dune
// ids: 1 body, 2 ring, 3 jaw, 4 mound
const BURROW_R = { 1: [12, 11, 9], 2: [10, 9, 1], 3: [6, 6, 5], 4: [10, 10, 9] };
function burrowPix(N, f) {
  const k = N / 16, g = new Grid(N, N), { R, E, T, P, Y } = shaper(g, k);
  const sw = f === 1 ? 0.9 : f === 2 ? -0.9 : 0, open = f === 1 ? 1.3 : 0.4;
  E(8, 14.6, 7.4, 2, 4);
  T(4.2, 14, 5.4 + sw * 0.4, 8, 5.2, 1); T(5.4 + sw * 0.4, 8, 8.8 + sw, 4.6, 4.6, 1);
  for (let i = 0; i < 4; i++) R(2.6 + i * 0.5, 13 - i * 1.5, 5, 0.6, 2);
  E(10 + sw, 4.2, 3.4, 2.9, 1);
  Y([[11.6 + sw, 2.8], [15.4 + sw, 1.6 - open * 0.3], [13 + sw, 4.6]], 3); Y([[11.6 + sw, 5.8], [15.4 + sw, 7 + open * 0.3], [13 + sw, 4.4]], 3);
  Y([[9 + sw, 6.2], [9.6 + sw, 7.8], [10.6 + sw, 6.4]], 3);
  P(10 + sw, 3.2, 0, px(k), px(k));
  return render(g, BURROW_R, { dither: [1] });
}

// ------------------------------------------------------------------ scorpion
// ids: 1 shell, 2 claw, 3 stinger, 4 leg
const SCORP_R = { 1: [12, 11, 9], 2: [11, 9, 1], 3: [6, 6, 5], 4: [11, 9, 1] };
function scorpPix(N, f) {
  const k = N / 16, g = new Grid(N, N), { R, E, T, P, Y } = shaper(g, k);
  const a = f === 1 ? 1 : f === 2 ? -1 : 0;
  for (const [x, o] of [[5, a], [7, -a], [9, a]]) T(x, 10.6, x + o * 0.7 - 1, 14.6, 0.75, 4);
  E(7.2, 10, 4, 2.3, 1);
  for (let i = 0; i < 3; i++) R(4.6 + i * 1.7, 8.2, 0.6, 3.6, 2);
  E(11.2, 9.4, 1.9, 1.7, 1);
  T(3.6, 9.4, 1.2, 6, 1.9, 1); T(1.2, 6, 2.6, 2.6, 1.7, 1); T(2.6, 2.6, 6.2, 2.4 + (f === 1 ? -0.6 : 0), 1.5, 1);   // the tail, curled over the back
  Y([[6, 1.4], [8.2, 2.4], [6.2, 3.8]], 3);
  T(11.6, 8, 13.4, 6.6 - a * 0.4, 1, 2); Y([[12.8, 5.2], [15.2, 5.6], [14.2, 7.2], [13.2, 6.6]], 2);
  T(11.6, 11.2, 13.4, 12.4 + a * 0.3, 0.9, 2); Y([[13, 11.4], [15, 12.2], [13.6, 13.4]], 2);
  P(11.6, 8.6, 0, px(k), px(k));
  return render(g, SCORP_R, { dither: [1] });
}

// ------------------------------------------------------------------ dustdevil: a whirl of sand with a grudge
// ids: 1 sand, 2 bright sand, 3 dark
const DEVIL_R = { 1: [10, 10, 9], 2: [13, 13, 10], 3: [9, 9, 1] };
function devilPix(N, f) {
  const k = N / 16, g = new Grid(N, N), { R, E, P } = shaper(g, k);
  for (let i = 0; i < 7; i++) {
    const y = 13.6 - i * 1.85, rx = 1.5 + i * 0.85, wob = Math.sin(i * 0.9 + f * 2.1) * 1.3;
    E(7.6 + wob, y, rx, 1.05, i % 2 ? 2 : 1);
    if (i % 3 === 1) R(7.6 + wob - rx, y, rx * 0.7, 0.5, 3);
  }
  E(7.8, 1.6, 1, 0.8, 2);
  P(9.4, 4.6, 0, px(k), px(k)); P(6.6, 4.6, 0, px(k), px(k)); P(8, 6, 0, px(k) + 1, 1);
  return render(g, DEVIL_R, { dither: false });
}

const reg = (kind, scale, draw) => { const N = Math.round(16 * scale); registerNative(kind, { scale, w: N, h: N, build: (scene, key) => full(draw)(scene, key, N) }); };
reg('thornling', 1.1, thornPix);
reg('hornet', 1.0, hornetPix);
reg('blightbloom', 1.3, bloomPix);
reg('dewsprite', 1.0, dewPix);
reg('mosshulk', 1.8, hulkPix);
reg('sandburrower', 1.3, burrowPix);
reg('scorpion', 1.2, scorpPix);
reg('dustdevil', 1.2, devilPix);
// the named mini-bosses are the same creatures, bigger
reg('elderthorn', 1.8, thornPix);
reg('hornetqueen', 1.9, hornetPix);
reg('grovewarden', 2.3, hulkPix);
reg('sandmaw', 2.0, burrowPix);
reg('tombscorpion', 1.9, scorpPix);
reg('dustlord', 2.0, devilPix);
export const NEW_FAUNA = ['thornling', 'hornet', 'blightbloom', 'dewsprite', 'mosshulk', 'sandburrower', 'scorpion', 'dustdevil'];
