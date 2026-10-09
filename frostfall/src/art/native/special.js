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
// A lean, long-necked dragon in the manner of a black Nordic wyrm, but red: swept-back horn crown, bony ragged wings, spined back.
// ids: 1 body, 2 belly, 3 wing membrane, 4 bone/rib lines, 5 spine, 6 horn/claw/tooth, 7 far limb, 8 far wing, 9 glow
const DRAGON_R = { 1: [12, 11, 9], 2: [12, 12, 11], 3: [11, 9, 1], 4: [1, 1, 1], 5: [10, 9, 1], 6: [10, 9, 1], 7: [11, 9, 1], 8: [9, 1, 1], 9: [13, 13, 12], 10: [6, 6, 5] };
function dragonPix(W, H, pose) {
  const k = W / 48, g = new Grid(W, H), { R, E, T, Q, P, Y } = shaper(g, k);
  const attack = pose === 'attack', hurt = pose === 'hurt', dead = pose === 'death';
  const wing = pose === 'side1' ? 1 : pose === 'side2' ? 2 : 0;
  // --- wings. The wing is an arm (shoulder, elbow, wrist) with fingers fanned from the wrist and a scalloped trailing edge.
  const sh = [27, 15];
  const W0 = { up: { el: [22, 7], wr: [12, 1.6], tips: [[0.5, 3], [1.5, 11], [6, 17.5], [13, 19.5]], notch: [[4.4, 6.6], [5.4, 14], [10.5, 15.6]] },
    flap: { el: [23, 5], wr: [14, -1.5], tips: [[2, -0.5], [0, 8], [4, 15.5], [12, 18]], notch: [[6, 4], [4.6, 11.5], [9.5, 14.4]] },
    down: { el: [20, 16], wr: [12, 21], tips: [[2.5, 22], [4, 28.5], [10, 31], [17, 30]], notch: [[7, 21.5], [8.4, 27], [13, 28]] } }[wing === 0 ? 'up' : wing === 1 ? 'flap' : 'down'];
  const wingShape = (dx, dy, mem, bone) => {
    const sp = (p) => [p[0] + dx, p[1] + dy];
    const pts = [sp(sh), sp(W0.el), sp(W0.wr), sp(W0.tips[0]), sp(W0.notch[0]), sp(W0.tips[1]), sp(W0.notch[1]), sp(W0.tips[2]), sp(W0.notch[2]), sp(W0.tips[3]), sp([20, 17.6])];
    Y(pts, mem);
    T(sh[0] + dx, sh[1] + dy, W0.el[0] + dx, W0.el[1] + dy, 1.5, bone); T(W0.el[0] + dx, W0.el[1] + dy, W0.wr[0] + dx, W0.wr[1] + dy, 1.2, bone);
    for (const t of W0.tips) T(W0.wr[0] + dx, W0.wr[1] + dy, t[0] + dx, t[1] + dy, 0.55, bone === 1 ? 4 : bone);
    return pts;
  };
  wingShape(3.4, -1, 8, 8);                                   // far wing, shaded and offset for depth
  // --- tail, far legs
  T(15, 19.4, 9, 21.2, 4.4, 7); T(9, 21.2, 4, 23.4, 3, 7); T(4, 23.4, 0.6, 25.4, 1.7, 7); T(0.6, 25.4, -0.5, 26.6, 0.8, 6);
  const leg = (hipx, hipy, kneex, kneey, footx, footy, w, id) => { T(hipx, hipy, kneex, kneey, w, id); T(kneex, kneey, footx - 1.2, footy - 2.2, w * 0.7, id); T(footx - 1.2, footy - 2.2, footx, footy, w * 0.6, id); R(footx - 1.2, footy, 4, 1, id); };
  leg(20, 20.4, 22.6, 24.8, 20, 29.6, 4, 7); leg(30.6, 21, 29, 25, 31.4, 29.6, 3.4, 7);
  // --- body: deep chest, tucked waist, thick tail root
  E(29.6, 18.4, 6, 4.5, 1); E(23, 18.6, 6.4, 3.4, 1); E(17, 19, 4.6, 3, 1);
  E(28.6, 21.6, 5, 1.4, 2);
  for (let i = 0; i < 4; i++) T(24.6 + i * 2.2, 22.6, 24.6 + i * 2.2, 21.2, 0.4, 4);
  T(15, 19.2, 9, 21, 4.4, 1); T(9, 21, 4, 23.2, 3, 1); T(4, 23.2, 0.6, 25.2, 1.6, 1);
  for (let i = 0; i < 6; i++) Q(16.6 - i * 2.6, 16 + (i * 0.3), 1.1, 1.8 - i * 0.12, 5, 0.3);          // tail spines
  // --- neck: an S-curve rising to the head; the attack stretches it forward, a hit snaps it back
  const nx = attack ? 3.5 : hurt ? -2.5 : 0, ny = attack ? 4 : hurt ? -2 : 0;
  const nk = [[32.5, 16.4], [35.4 + nx * 0.4, 12.2 + ny * 0.3], [36.6 + nx * 0.7, 8.8 + ny * 0.6], [39.6 + nx, 6.8 + ny]];
  T(nk[0][0], nk[0][1], nk[1][0], nk[1][1], 5.2, 1); T(nk[1][0], nk[1][1], nk[2][0], nk[2][1], 4, 1); T(nk[2][0], nk[2][1], nk[3][0], nk[3][1], 3.2, 1);
  for (let i = 0; i < 5; i++) { const t = i / 4, x = nk[0][0] + (nk[3][0] - nk[0][0]) * t, y = nk[0][1] + (nk[3][1] - nk[0][1]) * t; Q(x - 1.8 - (i === 2 ? 0.5 : 0), y - 2.5 - (i % 2) * 0.3, 1, 1.5, 5, 0.3); }
  for (let i = 0; i < 4; i++) T(34.8 + i * 0.5 + nx * 0.3, 11.6 + i * 1.5 + ny * 0.3, 36 + i * 0.5 + nx * 0.4, 11.8 + i * 1.5 + ny * 0.3, 0.35, 4);   // throat plates
  // --- head
  const hx = 43 + nx, hy = 6.4 + ny;
  E(hx, hy, 3.7, 2.5, 1);                                        // skull
  T(hx + 1, hy + 0.2, hx + 5.2, hy + 1.2, 2.5, 1);              // snout
  const jaw = attack ? 2.8 : hurt ? 1.8 : 0.5;
  T(hx - 1, hy + 2.2, hx + 4.8, hy + 2.6 + jaw, 1.3, 7);        // lower jaw
  E(hx + 3.2, hy + 1.2, 3.4, 0.6, 3);
  if (attack) { T(hx + 1.2, hy + 1.8, hx + 4.4, hy + 3 + jaw * 0.4, 1.6, 9); P(hx + 2, hy + 1.8, 12, 3, 2); }       // fire in the throat
  for (let i = 0; i < 4; i++) T(hx + 1.6 + i * 1.1, hy + 1.8, hx + 1.4 + i * 1.1, hy + 2.8, 0.35, 10);                // teeth
  // horn crown: four long swept-back horns and a brow spike
  T(hx - 1.6, hy - 1.8, hx - 6.2, hy - 4.4, 1.3, 6); T(hx - 0.6, hy - 2.2, hx - 4.6, hy - 6, 1.2, 6);
  T(hx - 2.2, hy - 0.8, hx - 7.4, hy - 1.4, 1.1, 6); T(hx - 2.6, hy + 0.6, hx - 6.6, hy + 1.8, 0.9, 6);
  T(hx + 1.8, hy - 2, hx + 3.2, hy - 3.8, 0.8, 6);
  T(hx - 0.4, hy + 2.8, hx - 1.4, hy + 4.4, 0.6, 6);                                                                    // chin spike
  const e = Math.max(1, Math.round(k * 0.8));
  if (hurt || dead) for (const [dx, dy] of [[0, 0], [1, 1], [1, 0], [0, 1]]) g.detail([[Math.round((hx + 0.8) * k) + dx * 2, Math.round((hy - 1) * k) + dy * 2, 0]], true);
  else P(hx + 0.8, hy - 1.1, 13, e + 2, e);
  P(hx + 5.6, hy + 0.2, 0, e, e);
  // --- near wing over the body, near legs
  wingShape(0, 0, 3, 1);
  E(18.8, 21.4, 3.6, 3.4, 1); leg(19, 20.8, 21.6, 25, 18.6, 29.9, 4.4, 1); leg(29.4, 21.4, 27.8, 25.4, 30, 29.9, 3.8, 1);
  for (const [x, y] of [[20, 30.6], [18, 30.6], [31.4, 30.6], [29.6, 30.6]]) T(x, y, x + 0.8, y + 1, 0.5, 6);              // claws
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
