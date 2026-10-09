// Native-pixel bosses that are not humanoid: the Tidemother (jellyfish), the Ashen Root (living stump) and Skaldrath (dragon).
import { Grid, render, blit, makeNativeSheet, shaper, flippedV } from '../native.js';
import { registerNative } from '../native_registry.js';

const sheetOf = (scene, key, W, H, frames) => makeNativeSheet(scene, key, W, H, frames.map(([name, pix]) => ({ name, draw: (ctx, ox) => blit(ctx, pix, W, H, ox, 0) })));
const dot = (k) => Math.max(1, Math.round(k * 0.6));

// ------------------------------------------------------------------ Tidemother: a drowned jellyfish queen
// ids: 1 bell, 2 inner glow, 3 frill, 4 tentacle, 5 pearl, 6 sheen
const TIDE_R = { 1: [5, 15, 4], 2: [7, 7, 7], 3: [14, 14, 1], 4: [15, 15, 4], 5: [13, 13, 12], 6: [6, 6, 5] };
function tidePix(N, f) {
  const k = N / 16, g = new Grid(N, N), { R, E, T, Q, P } = shaper(g, k);
  const ph = f * 2.1;
  // tentacles first so the bell overlaps their roots
  for (let i = 0; i < 6; i++) {
    const x0 = 3.6 + i * 1.7, w = i % 2 ? 1.1 : 1.5, len = 6.6 - (i % 3) * 0.9;
    let px = x0, py = 8;
    for (let s = 1; s <= 5; s++) {
      const nx = x0 + Math.sin(ph + i * 1.3 + s * 0.9) * 0.9, ny = 8 + (len * s) / 5;
      T(px, py, nx, ny, Math.max(0.5, w - s * 0.14), 4); px = nx; py = ny;
    }
  }
  // long ribbon arms at the sides
  T(3.2, 8, 2.4 + Math.sin(ph) * 0.5, 13.6, 1.2, 4); T(12.8, 8, 13.6 + Math.sin(ph + 2) * 0.5, 13.4, 1.2, 4);
  E(8, 5.4, 6, 4.6, 1, (x, y) => y < 8.1 * k);                // the bell, flat underneath
  E(5.2, 5.6, 1.7, 1.5, 2);                                    // inner glow
  R(2, 7.7, 12, 1, 3);                                         // frill
  for (let i = 0; i < 6; i++) R(2.2 + i * 2.1, 8.4, 0.9, 0.8, 3);
  R(5.6, 2.2, 3.8, 0.8, 6); R(4.2, 3.2, 1.4, 0.7, 6);          // sheen
  for (const [x, y] of [[11.4, 4.2], [9.6, 6.2], [12.4, 6.4]]) P(x, y, 13, dot(k), dot(k));
  P(7.6, 4.6, 0, dot(k), dot(k));
  return render(g, TIDE_R, { dither: [1] });
}

// ------------------------------------------------------------------ Ashen Root: a stump with one burning eye
// ids: 1 bark, 2 root, 3 leaf, 4 vine, 5 eye, 6 ring
const ROOT_R = { 1: [10, 9, 1], 2: [10, 10, 9], 3: [8, 7, 1], 4: [8, 8, 7], 5: [13, 12, 11], 6: [10, 10, 9] };
function rootPix(N, f) {
  const k = N / 16, g = new Grid(N, N), { R, E, T, Q, P } = shaper(g, k);
  const sw = f === 1 ? 0.7 : f === 2 ? -0.7 : 0;
  for (const [x, dx] of [[3, -2.2], [5.5, -0.8], [8, 0.4], [10.6, 1.4], [13, 2.4]]) { T(x, 11.6, x + dx + sw, 14.6, 1.7, 2); T(x + dx + sw, 14.6, x + dx * 1.4 + sw * 1.4, 15.6, 1.1, 2); }
  T(1, 10.2, 0, 11 + sw, 0.9, 4); T(15, 10, 16, 11.4 - sw, 0.9, 4);
  E(8, 9, 5.6, 5, 1);                                          // trunk
  E(8, 9.2, 3.6, 3.4, 6);                                      // bark ring around the eye
  E(8, 9.2, 2.5, 2.6, 5);                                      // the eye
  P(7.2, 7.8, 0, Math.max(2, Math.round(k * 1.4)), Math.max(3, Math.round(k * 2.6)));
  P(7.2, 8.5, 12, dot(k), dot(k));
  for (const [cx, cy, rx, ry] of [[3.2, 3.6, 2.7, 2], [6.4, 2.2, 2.9, 2.1], [9.9, 2.4, 2.9, 2.1], [12.8, 3.8, 2.6, 2], [8, 4.6, 3.4, 2]]) E(cx + sw * 0.3, cy, rx, ry, 3);
  for (const [x, y] of [[4, 5], [8, 1], [11, 5.2], [2.4, 4.4], [13.4, 4.8]]) T(x, y, x + sw * 0.4, y + 1.7, 0.5, 4);
  for (const [x, y] of [[3, 8], [12.6, 9], [4.6, 11.4], [11.2, 11.8]]) P(x, y, 1, dot(k), Math.max(1, Math.round(k * 1.4)));
  return render(g, ROOT_R, { dither: [1] });
}

// ------------------------------------------------------------------ Skaldrath, the ember dragon (cell 48 x 32 in the old art)
// ids: 1 body, 2 belly, 3 wing, 4 rib, 5 spike, 6 horn/tooth, 7 head, 8 far leg, 9 membrane edge, 10 claw
const DRAGON_R = { 1: [12, 11, 9], 2: [13, 12, 11], 3: [13, 12, 11], 4: [1, 1, 1], 5: [13, 13, 12], 6: [6, 6, 5], 7: [12, 11, 9], 8: [11, 1, 1], 9: [14, 14, 1], 10: [6, 6, 5] };
function dragonPix(W, H, pose) {
  const k = W / 48, g = new Grid(W, H), { R, E, T, Q, P, Y } = shaper(g, k);
  const attack = pose === 'attack', hurt = pose === 'hurt', dead = pose === 'death';
  const wingPose = pose === 'side1' ? 1 : pose === 'side2' ? 2 : 0;
  // wing: three finger bones fanned from the shoulder; pose 2 folds it down and back
  const root = [24, 14];
  const tips = wingPose === 2 ? [[3, 24], [8, 28], [14, 30], [20, 28]] : wingPose === 1 ? [[2, 1], [9, -2], [16, -1], [22, 3]] : [[3, 7], [8, 3], [14, 2], [20, 5]];
  Y([root, ...tips], 3);
  T(root[0], root[1], tips[0][0], tips[0][1], 0.8, 9);
  for (const t of tips) T(root[0], root[1], t[0], t[1], 0.55, 4);
  for (let i = 0; i + 1 < tips.length; i++) T(tips[i][0], tips[i][1], tips[i + 1][0], tips[i + 1][1], 0.7, 9);
  // far legs, then tail, body, neck, head
  T(28, 21, 27.4, 29, 3.4, 8); R(25.6, 29, 4, 1.6, 10); T(38, 21, 38.6, 29, 3.4, 8); R(36.6, 29, 4, 1.6, 10);
  T(14, 19, 6, 21.6, 5.4, 1); T(6, 21.6, 1, 25, 3.4, 1); T(1, 25, -1, 27.4, 1.8, 1);
  for (let i = 0; i < 5; i++) Q(5.6 + i * 2.4, 16.2 + i * 0.4, 1.2, 1.8, 5, 0.3);
  E(26, 19.6, 14.6, 5, 1);                                      // body
  E(26, 22, 12.6, 2.1, 2);                                      // belly plates
  for (let i = 0; i < 7; i++) T(16.6 + i * 2.5, 23.4, 16.6 + i * 2.5, 21.2, 0.45, 4);
  for (let i = 0; i < 6; i++) Q(17.4 + i * 2.6, 13.2 + Math.abs(i - 2.5) * 0.35, 1.3, 1.8, 5, 0.3);
  T(31.5, 18.6, 40, 11, 4.6, 1);                                   // neck
  for (let i = 0; i < 4; i++) Q(31.4 + i * 2, 15 - i * 1.7, 1.3, 1.5, 5, 0.3);
  const hx = hurt ? 37 : attack ? 45 : 42, hy = hurt ? 5 : attack ? 11.5 : 8.4;
  E(hx, hy, 5.4, 3.8, 7);                                      // skull
  if (attack) { T(hx + 2, hy + 1.6, hx + 7.6, hy + 4.2, 2.2, 7); T(hx + 3, hy - 0.6, hx + 8.4, hy - 1.2, 2.4, 7); for (let i = 0; i < 4; i++) T(hx + 3.4 + i * 1.5, hy + 0.9, hx + 3.4 + i * 1.5, hy + 2.3, 0.6, 6); }
  else { E(hx + 4, hy + 0.9, 3.8, 2.2, 7); for (let i = 0; i < 4; i++) T(hx + 1.4 + i * 1.4, hy + 2.6, hx + 1.4 + i * 1.4, hy + 3.5, 0.5, 6); }
  T(hx - 3.2, hy - 2.6, hx - 6.4, hy - 6, 1.7, 6); T(hx - 1, hy - 3, hx - 2.8, hy - 7.2, 1.4, 6);                 // horns
  T(hx - 2.4, hy - 3.6, hx - 6, hy - 5, 0.9, 5);
  const e = Math.max(1, Math.round(k * 0.9));
  if (hurt || dead) for (const [dx, dy] of [[0, 0], [1, 1], [1, 0], [0, 1]]) g.detail([[Math.round((hx + 1.2) * k) + dx * 2, Math.round((hy - 1.4) * k) + dy * 2, 0]], true);
  else P(hx + 1.2, hy - 1.4, 13, e + 1, e);
  P(hx + 5.6, hy - 0.6, 0, e, e);
  // near legs
  T(23, 21, 22.4, 29, 4.2, 1); R(20.4, 29, 4.8, 1.8, 10); T(33.4, 21, 34, 29, 4.2, 1); R(31.8, 29, 4.8, 1.8, 10);
  for (const [x, y] of [[22, 17.2], [28, 16.8]]) E(x, y, 1.3, 0.7, 2);           // scale highlights
  let pix = render(g, DRAGON_R, { dither: [1] });
  if (dead) pix = flippedV(pix, W, H);
  return pix;
}
function dragonSheet(scene, key, W, H) {
  sheetOf(scene, key, W, H, ['side0', 'side1', 'side2', 'attack', 'hurt', 'death'].map((p) => [p === 'attack' ? 'attack0' : p === 'hurt' ? 'hurt0' : p === 'death' ? 'death0' : p, dragonPix(W, H, p)]));
}

const reg = (kind, scale, cw, ch, build) => { const W = Math.round(cw * scale), H = Math.round(ch * scale); registerNative(kind, { scale, cw, ch, w: W, h: H, build: (scene, key) => build(scene, key, W, H) }); };
const tideSheet = (scene, key, W, H) => sheetOf(scene, key, W, H, [0, 1, 2].map((f) => ['side' + f, tidePix(W, f)]));
const rootSheet = (scene, key, W, H) => sheetOf(scene, key, W, H, [0, 1, 2].map((f) => ['side' + f, rootPix(W, f)]));
reg('tide', 3, 16, 16, tideSheet);
reg('root', 3, 16, 16, rootSheet);
reg('dragon', 1.9, 48, 32, dragonSheet);
