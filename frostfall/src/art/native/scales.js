// VX-11: creatures that were shown at a stretched or shrunk scale (1.2, 1.3, 0.7...) and so had uneven or sub-hero pixels.
// Each now has art drawn at its real on-screen size (scale 1, hero-sized pixels), with the same hitbox:
//   Spore Mother and Gloomcap (a fungus matriarch), the Glass Prism, the Cave Weaver, the Lodeling (a crab), the Slimeling,
//   the Bear Cub, and the humanoid Cinder Imp, Sun Sentinel, Red Sula and Captain Karrow.
// Drawn in the 16-unit design cell facing right and rasterised at k = size / 16, like animals.js and newfauna.js.
import { Grid, render, blit, makeNativeSheet, shaper, flippedV } from '../native.js';
import { registerNative } from '../native_registry.js';
import { registerHumanoid } from './humanoid.js';
import { bearSheet } from './animals.js';
import { roleSheet } from '../sprites.js';

const sheet = (scene, key, N, frames) => makeNativeSheet(scene, key, N, N, frames.map(([name, pix]) => ({ name, draw: (ctx, ox) => blit(ctx, pix, N, N, ox, 0) })));
const jolt = (pix, N, dx, dy) => { const o = new Int16Array(N * N).fill(-1); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < N && ny < N) o[ny * N + nx] = pix[y * N + x]; } return o; };
const full = (draw) => (scene, key, N) => {
  const a = draw(N, 0), b = draw(N, 1), c = draw(N, 2), j = Math.max(1, Math.round(N / 16));
  sheet(scene, key, N, [['side0', a], ['side1', b], ['side2', c], ['hurt0', jolt(b, N, -j, -j)], ['death0', flippedV(a, N, N)]]);
};
const px = (k) => Math.max(1, Math.round(k * 0.7));

// ------------------------------------------------------------------ spore mother: a squat toadstool matriarch
// ids: 1 cap, 2 gills / rim, 3 stem, 4 spot, 5 root
const SHROOM_R = { 1: [12, 11, 9], 2: [14, 14, 1], 3: [6, 5, 4], 4: [6, 6, 5], 5: [10, 9, 1] };
function shroomPix(N, f) {
  const k = N / 16, g = new Grid(N, N), { R, E, T, P } = shaper(g, k);
  const puff = f === 1 ? 0.7 : f === 2 ? 0.3 : 0;
  for (const [x0, x1] of [[5.4, 3.4], [10.6, 12.8], [8, 8.2]]) T(x0, 13.6, x1, 15.4, 1.2, 5);                // roots gripping the ground
  E(8, 11.4, 3.2, 3.8, 3);                                                                                   // fat stem
  E(8, 6.6 + puff * 0.4, 6.8 + puff * 0.5, 2.3, 2);                                                          // gills under the cap
  E(8, 5.2 + puff * 0.3, 7 + puff * 0.6, 4.2 - puff * 0.4, 1, (x, y) => y < (6.4 + puff * 0.4) * k);       // the cap
  for (const [x, y, r] of [[5, 3.6, 1.1], [9.6, 2.6, 1.2], [12, 4.6, 0.9], [7.4, 5.2, 0.7]]) E(x, y + puff * 0.3, r, r * 0.8, 4);
  P(6.8, 10.6, 13, px(k), px(k)); P(9.2, 10.6, 13, px(k), px(k));                                           // two glowing eyes in the stem
  R(7.2, 12.6, 1.6, 0.6, 2);
  if (f) for (const [x, y] of [[4, 0.6], [11.6, 0.2], [8, -0.2 + f]]) P(x + f, y + 1, 14, px(k), px(k));    // spores rising when it puffs
  return render(g, SHROOM_R, { dither: [1, 3] });
}

// ------------------------------------------------------------------ glass prism: a floating faceted crystal
// ids: 1 face (lit), 2 face (shade), 3 core, 4 shard
const PRISM_R = { 1: [6, 15, 5], 2: [5, 4, 3], 3: [6, 6, 15], 4: [15, 5, 4] };
function prismPix(N, f) {
  const k = N / 16, g = new Grid(N, N), { Y, E, P } = shaper(g, k);
  const b = f === 1 ? -0.6 : f === 2 ? 0.4 : 0;
  Y([[8, 0.6 + b], [12.2, 6.2 + b], [8, 12.4 + b], [3.8, 6.2 + b]], 2);
  Y([[8, 0.6 + b], [8, 12.4 + b], [3.8, 6.2 + b]], 1);
  E(8, 6.4 + b, 1.3, 1.6, 3);
  Y([[1.6, 3 + b], [2.6, 1.6 + b], [3, 4 + b]], 4); Y([[13.6, 8.6 + b], [14.6, 7 + b], [14.2, 10 + b]], 4);   // two orbiting shards
  P(6.4, 3.4 + b, 6, px(k), px(k));
  E(8, 15, 2.6 + (f === 1 ? 0.4 : 0), 0.5, 4);                                                                // a glint of light under it
  return render(g, PRISM_R, { dither: false });
}

// ------------------------------------------------------------------ cave weaver: a long-legged cave spider
// ids: 1 abdomen, 2 head, 3 leg, 4 marking, 5 fang
const WEAVER_R = { 1: [3, 2, 1], 2: [3, 2, 1], 3: [2, 1, 0], 4: [14, 14, 1], 5: [6, 5, 4] };
function weaverPix(N, f) {
  const k = N / 16, g = new Grid(N, N), { E, T, P } = shaper(g, k);
  const s = f === 1 ? 1 : f === 2 ? -1 : 0;
  // eight legs: knee high, foot on the ground, alternating pairs step
  [[4.2, 1.6, 0], [6, 4, 1], [9, 11.6, 0], [10.6, 14.6, 1]].forEach(([hip, foot, odd]) => {
    const st = odd ? s : -s, kx = (hip + foot) / 2 + st * 0.6;
    T(hip, 9.6, kx, 5.6 - Math.abs(st) * 0.5, 0.9, 3); T(kx, 5.6 - Math.abs(st) * 0.5, foot + st * 0.8, 14.8, 0.8, 3);
  });
  E(5.2, 9.2, 3.8, 3.1, 1);                                                                    // abdomen
  E(5.2, 8.4, 1.4, 1.6, 4); E(3.4, 9.6, 0.7, 0.8, 4);                                         // hourglass mark
  E(10.6, 10, 2.3, 2, 2);                                                                      // head
  T(12.2, 11.4, 13.2, 12.8, 0.7, 5); T(11.2, 11.8, 11.8, 13.2, 0.6, 5);                       // fangs
  P(11.4, 9.2, 11, px(k), px(k)); P(12.4, 9.4, 11, px(k), px(k));
  return render(g, WEAVER_R, { dither: [1] });
}

// ------------------------------------------------------------------ crab (the lodeling wears its own tint over this)
// ids: 1 shell, 2 belly, 3 claw, 4 leg, 5 eye stalk
const CRAB_R = { 1: [5, 4, 3], 2: [4, 3, 2], 3: [12, 11, 9], 4: [10, 9, 1], 5: [4, 3, 2] };
function crabPix(N, f) {
  const k = N / 16, g = new Grid(N, N), { R, E, T, P } = shaper(g, k);
  const a = f === 1 ? 0.8 : 0, b = f === 2 ? 0.8 : 0;
  for (const [x, ph] of [[4, 0], [6, 1], [10, 0], [12, 1]]) T(x, 11, x + (x < 8 ? -1.4 : 1.4), 14.4 + (((ph + f) % 2) ? -0.5 : 0), 0.8, 4);
  E(8, 10.4, 5.4, 2.6, 2);
  E(8, 9, 5.6, 3.1, 1, (x, y) => y < 10.2 * k);                                                // domed shell
  for (const [x, y] of [[5.4, 7.4], [8, 6.6], [10.6, 7.4]]) E(x, y, 0.8, 0.5, 2);              // shell ridges
  T(3, 9.6, 1.6, 7.4 - a, 1.1, 3); E(1.4, 5.8 - a, 1.7, 1.5, 3); R(0, 4.2 - a, 1.4, 1.2, 3);    // claws up
  T(13, 9.6, 14.4, 7.4 - b, 1.1, 3); E(14.6, 5.8 - b, 1.7, 1.5, 3); R(14.6, 4.2 - b, 1.4, 1.2, 3);
  T(6.6, 6.6, 6.2, 4.6, 0.6, 5); T(9.4, 6.6, 9.8, 4.6, 0.6, 5);
  P(6, 4.2, 0, px(k), px(k)); P(9.6, 4.2, 0, px(k), px(k));
  return render(g, CRAB_R, { dither: [1] });
}

// ------------------------------------------------------------------ slime (a slimeling: small, molten)
// ids: 1 body, 2 hot core, 3 eye-white
const SLIME_R = { 1: [12, 11, 9], 2: [13, 13, 12], 3: [6, 6, 5] };
function slimePix(N, f) {
  const k = N / 16, g = new Grid(N, N), { E, P } = shaper(g, k);
  const sq = f === 1 ? 1 : f === 2 ? 0.4 : 0;
  E(8, 11.6 + sq * 0.5, 6.4 + sq * 0.8, 4.2 - sq * 0.6, 1, (x, y) => y < 15 * k);
  E(9.6, 10.4 + sq * 0.5, 2.2, 1.4, 2);
  P(5.6, 10.6 + sq * 0.6, 0, px(k), px(k) + 1); P(9.8, 10.6 + sq * 0.6, 0, px(k), px(k) + 1);
  return render(g, SLIME_R, { dither: false });
}

const reg = (kind, scale, draw) => { const N = Math.round(16 * scale); registerNative(kind, { scale, w: N, h: N, build: (scene, key) => full(draw)(scene, key, N) }); };
reg('shroom', 1.3, shroomPix);
reg('gloomcap', 1.3, shroomPix);
reg('prism', 1.2, prismPix);
reg('caveweaver', 1.2, weaverPix);
reg('lodeling', 1.2, crabPix);
reg('slimeling', 0.7, slimePix);
{ const N = Math.round(16 * 0.65); registerNative('bearcub', { scale: 0.65, w: N, h: N, build: (scene, key) => bearSheet(false)(scene, key, N) }); }
registerHumanoid('imp', 'imp', 0.85);
registerHumanoid('sunsentinel', 'sunsentinel', 1.35);
registerHumanoid('redsula', 'cutpurse', 1.25);
registerHumanoid('captainkarrow', 'duneraider', 1.3);
// VX-20: the Rime Reaver keeps the draugr's 16px body but carries a two-hander on its shoulder
registerNative('reaver', { scale: 1, w: 16, h: 16, build: (scene, key) => roleSheet(scene, key, 'draugr', 'greatsword') });
