// Native-pixel animals and beasts: bear (+ mammoth), winter elk (+ glass stag), ash wyvern (+ thunderbird), frost worm.
// Each is drawn in the old 16-unit cell and rasterised at k = size / 16, so silhouette and animation frames match.
import { Grid, render, blit, makeNativeSheet, shaper, flippedV } from '../native.js';
import { registerNative } from '../native_registry.js';

const sheet = (scene, key, N, frames) => makeNativeSheet(scene, key, N, N, frames.map(([name, pix]) => ({ name, draw: (ctx, ox) => blit(ctx, pix, N, N, ox, 0) })));
const jolt = (pix, N, dx, dy) => { const o = new Int16Array(N * N).fill(-1); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < N && ny < N) o[ny * N + nx] = pix[y * N + x]; } return o; };

// ------------------------------------------------------------------ bear
// ids: 1 fur, 2 head fur, 3 near leg, 4 far leg, 5 ear, 6 snout, 7 tusk, 8 trunk/hump
const BEAR_R = { 1: [6, 5, 4], 2: [6, 6, 5], 3: [4, 3, 2], 4: [3, 2, 1], 5: [5, 4, 3], 6: [5, 5, 4], 7: [6, 6, 5], 8: [5, 4, 3] };
function bearPix(N, f, mammoth) {
  const k = N / 16, g = new Grid(N, N), { R, E, T, Q, P } = shaper(g, k);
  const fa = f === 1 ? 1 : f === 2 ? -1 : 0;
  const leg = (x, id, off, lift) => { Q(x + off, 11 - lift, 2.3, 3.7 + lift - 0.3, id, 0.7); Q(x + off - 0.2, 14.3 - 0.3, 2.7, 1.1, id, 0.5); };
  // far legs (shaded), then body, then near legs
  leg(9.3, 4, -fa * 0.8, fa === 1 ? 0.8 : 0); leg(3.8, 4, fa * 0.8, fa === -1 ? 0.8 : 0);
  E(7, 8, 6.4, 4.5, 1);
  E(10, 6.1, 3.5, 3.2, 1);                                      // shoulder hump
  if (mammoth) { E(9.5, 4.6, 3.6, 2.6, 8); for (let i = 0; i < 6; i++) R(2 + i * 1.8, 11.6 + (i % 2) * 0.6, 1.2, 1.4, 1); }   // shaggy skirt along the belly
  leg(10, 3, fa * 0.8, fa === 1 ? 0.8 : 0); leg(2.6, 3, -fa * 0.8, fa === -1 ? 0.8 : 0);
  E(12.6, 6.7, 3, 2.8, 2);
  E(14.7, 7.7, 1.6, 1.3, 6);
  E(11.5, 4, 1.1, 1.1, 5);
  if (mammoth) { T(13.8, 8.6, 15.2, 11, 1.1, 8); T(15.2, 11, 14.4, 13.2, 0.9, 8); T(12.6, 8.3, 11.2, 11, 1, 7); T(11.2, 11, 12.4, 12.2, 0.8, 7); }
  P(13.1, 5.9, 11, Math.max(1, Math.round(k * 0.7)), Math.max(1, Math.round(k * 0.7)));
  P(15.3, 7.1, 0, Math.max(1, Math.round(k * 0.6)), Math.max(1, Math.round(k * 0.6)));
  P(13.6, 8.7, 0, Math.max(2, Math.round(k * 1.3)), 1);
  // fur flecks
  for (const [x, y] of [[4, 6], [6.5, 5], [8, 7.4], [5.2, 9], [10.5, 9.6]]) P(x, y, 4, Math.max(1, Math.round(k * 0.6)), 1);
  return render(g, BEAR_R, { dither: [1] });
}
function bearSheet(mammoth) {
  return (scene, key, N) => {
    const a = bearPix(N, 0, mammoth), b = bearPix(N, 1, mammoth), c = bearPix(N, 2, mammoth);
    sheet(scene, key, N, [['side0', a], ['side1', b], ['side2', c], ['hurt0', jolt(b, N, -Math.round(N / 16), -Math.round(N / 16))], ['death0', flippedV(jolt(a, N, 0, 0), N, N)]]);
  };
}

// ------------------------------------------------------------------ elk (and glass stag)
// ids: 1 body, 2 neck/head, 3 near leg, 4 far leg, 5 antler, 6 belly, 7 tail
const ELK_R = { 1: [5, 4, 3], 2: [5, 4, 3], 3: [4, 3, 2], 4: [3, 2, 1], 5: [6, 6, 5], 6: [6, 5, 4], 7: [6, 6, 5] };
function elkPix(N, f) {
  const k = N / 16, g = new Grid(N, N), { R, E, T, Q, P } = shaper(g, k);
  const a = f === 1 ? 1 : f === 2 ? -1 : 0;
  const leg = (x, id, sw, lift) => { T(x, 9.6, x + sw, 14.6 - lift, 1.1, id); R(x + sw - 0.4, 14.6 - lift, 1.1, 0.8, id); };
  leg(10.3, 4, -a * 1.1, a === 1 ? 1 : 0); leg(4.2, 4, a * 1.1, a === -1 ? 1 : 0);
  E(7.6, 8.2, 5.2, 2.7, 1);
  E(7.6, 9.4, 4.6, 1.2, 6);
  T(11.4, 7.6, 12.4, 4.2, 2.2, 2); E(13, 3.6, 1.7, 1.4, 2); T(13.8, 4.2, 15.4, 4.9, 1.3, 2);
  P(13.3, 3.2, 0, Math.max(1, Math.round(k * 0.6)), Math.max(1, Math.round(k * 0.7)));
  T(12.2, 2.6, 11.4, 0.4, 0.8, 5); T(11.4, 0.4, 10.2, 0.2, 0.7, 5); T(11.7, 1.4, 13.4, 0.2, 0.8, 5); T(13.4, 0.2, 14.8, 0.5, 0.7, 5);   // antlers
  T(12.8, 2.5, 14.2, 1.3, 0.7, 5);
  E(2.6, 7.4, 0.9, 1.1, 7);
  leg(9, 3, a * 1.1, a === 1 ? 1 : 0); leg(5.6, 3, -a * 1.1, a === -1 ? 1 : 0);
  return render(g, ELK_R, { dither: [1] });
}
function elkSheet(scene, key, N) {
  const a = elkPix(N, 0), b = elkPix(N, 1), c = elkPix(N, 2);
  sheet(scene, key, N, [['side0', a], ['side1', b], ['side2', c], ['hurt0', jolt(b, N, -Math.round(N / 16), -Math.round(N / 16))], ['death0', flippedV(a, N, N)]]);
}

// ------------------------------------------------------------------ wyvern (and thunderbird)
// ids: 1 body, 2 stripe, 3 wing, 4 far wing, 5 beak, 6 tail, 7 claw
const WYV_R = { 1: [13, 13, 12], 2: [6, 6, 5], 3: [4, 3, 2], 4: [3, 2, 1], 5: [12, 12, 11], 6: [13, 12, 11], 7: [12, 12, 11] };
function wyvernPix(N, f) {
  const k = N / 16, g = new Grid(N, N), { R, E, T, Q, P } = shaper(g, k);
  const wy = f === 0 ? 8.4 : f === 1 ? 0.6 : 4.4;               // wing tip height: down, up, level
  const wx = f === 0 ? 4.4 : f === 1 ? 3.4 : 1.4;
  T(7.4, 6.4, wx + 1.4, wy, 3.2, 4); T(wx + 1.4, wy, wx, wy + (f === 1 ? 1.2 : 0.4), 1.6, 4);   // far wing, shaded
  T(2.8, 8.2, 0.6, 9.4, 1.8, 6); T(0.6, 9.4, 0, 10.8, 0.9, 6);                              // tail
  E(7.8, 7.6, 5.2, 2.6, 1);
  E(7.8, 8.3, 4.4, 1.2, 2);
  E(12.2, 6.6, 2.1, 1.9, 1);
  T(13.4, 6.8, 15.6, 7.6, 1.5, 5);
  T(6.4, 9.8, 6.9, 11.8, 0.9, 7); T(9, 9.8, 9.4, 11.6, 0.9, 7); R(6, 11.6, 1.8, 0.7, 7); R(8.6, 11.4, 1.8, 0.7, 7);
  T(8.4, 6, 6.4, wy - 0.4, 3.4, 3); T(6.4, wy - 0.4, 3.6, wy + (f === 1 ? 1.4 : 0.6), 1.8, 3);   // near wing
  P(12.9, 5.8, 0, Math.max(1, Math.round(k * 0.6)), Math.max(1, Math.round(k * 0.6)));
  P(13.5, 5.7, 11, 1, 1);
  return render(g, WYV_R, { dither: [1] });
}
function wyvernSheet(scene, key, N) { sheet(scene, key, N, [['side0', wyvernPix(N, 0)], ['side1', wyvernPix(N, 1)], ['side2', wyvernPix(N, 2)]]); }

// ------------------------------------------------------------------ frost worm
// ids: 1 body, 2 belly plate, 3 head, 4 fang, 5 ridge, 6 crest
const WORM_R = { 1: [10, 9, 1], 2: [10, 10, 9], 3: [10, 9, 1], 4: [6, 6, 5], 5: [9, 9, 1], 6: [11, 12, 11] };
function wormPix(N, f) {
  const k = N / 16, g = new Grid(N, N), { R, E, T, Q, P } = shaper(g, k);
  const sway = f === 1 ? 0.8 : f === 2 ? -0.8 : 0;
  T(2.5, 15.5, 4 + sway, 9, 5.6, 1); T(4 + sway, 9, 7.5 + sway, 5, 5, 1);
  for (let i = 0; i < 5; i++) { const y = 14 - i * 1.7; R(2 + i * 0.7 + (i > 2 ? sway : 0), y, 5 - i * 0.2, 0.6, 5); }
  T(6.5 + sway, 6, 10.8 + sway, 3.6, 4.6, 3);
  E(11 + sway, 3.6, 3.3, 2.7, 3);
  T(12.2 + sway, 4.8, 15, 4.9, 1.6, 4); T(11.6 + sway, 5.4, 13.6, 6.4, 1.3, 4);        // jaw and fangs
  T(9.2 + sway, 1.2, 12.4 + sway, 0.3, 0.9, 6);
  P(11.3 + sway, 2.6, 13, Math.max(1, Math.round(k * 0.8)), Math.max(1, Math.round(k * 0.8)));
  R(5, 13, 2.4, 1.6, 2);
  return render(g, WORM_R, { dither: [1, 3] });
}
function wormSheet(scene, key, N) { sheet(scene, key, N, [['side0', wormPix(N, 0)], ['side1', wormPix(N, 1)], ['side2', wormPix(N, 2)]]); }

const reg = (kind, scale, build) => { const N = Math.round(16 * scale); registerNative(kind, { scale, w: N, h: N, build: (scene, key) => build(scene, key, N) }); };
reg('bear', 1.5, bearSheet(false));
reg('mammoth', 2, bearSheet(true));
reg('elk', 1.9, elkSheet);
reg('glassstag', 1.2, elkSheet);
reg('wyvern', 1.5, wyvernSheet);
reg('thunderbird', 1.3, wyvernSheet);
reg('frostworm', 1.4, wormSheet);
