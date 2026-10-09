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
// A lean, long-necked wyrm: deep ribcage, muscled haunches, digitigrade legs with spread claws, a spined back, a long blade-tipped
// tail and big ragged bat-style wings (jointed arm, thumb claw, four fingers, veined membrane with a scalloped edge).
// ids: 1 body, 2 belly, 3 membrane, 4 dark line, 5 spine, 6 horn/claw, 7 far limb, 8 far wing, 9 glow, 10 teeth,
//      11 muscle, 12 rib line, 13 membrane vein
const DRAGON_R = { 1: [12, 11, 9], 2: [13, 12, 11], 3: [11, 9, 1], 4: [1, 1, 1], 5: [10, 9, 1], 6: [10, 9, 1], 7: [11, 9, 1], 8: [9, 1, 1], 9: [13, 13, 12], 10: [6, 6, 5], 11: [12, 11, 11], 12: [9, 9, 9], 13: [11, 11, 9], 14: [11, 11, 9] };
const WING_POSES = {
  up:   { el: [22.5, 6.6], wr: [12.4, 1.2], tips: [[0.4, 2.6], [0.9, 10.6], [5.4, 17.4], [12.6, 19.8]], notch: [[4.2, 6.2], [4.6, 14], [9.4, 16.2]] },
  flap: { el: [23.6, 4.4], wr: [14.6, -2.2], tips: [[2.4, -1.2], [-0.3, 7.4], [3.4, 15], [11.6, 18.4]], notch: [[6, 3.4], [3.6, 11.4], [8, 14.4]] },
  down: { el: [20.4, 16.6], wr: [12.2, 21.4], tips: [[2, 21.8], [3.8, 28.6], [10.2, 31.4], [17.4, 30.2]], notch: [[6.6, 21.8], [8, 27.6], [13.4, 28.6]] },
};
// y of the back line at x, so spines sit on the spine
const backY = (x) => { const pts = [[13, 17.6], [17, 15.6], [24, 14.4], [30, 13.2], [33, 10.6]]; for (let i = 0; i + 1 < pts.length; i++) if (x >= pts[i][0] && x <= pts[i + 1][0]) return pts[i][1] + ((x - pts[i][0]) / (pts[i + 1][0] - pts[i][0])) * (pts[i + 1][1] - pts[i][1]); return pts[0][1]; };
function dragonPix(W, H, pose) {
  const k = W / 48, g = new Grid(W, H), { R, E, T, Q, P, Y } = shaper(g, k);
  const attack = pose === 'attack', hurt = pose === 'hurt', dead = pose === 'death';
  const wp = WING_POSES[pose === 'side1' ? 'flap' : pose === 'side2' ? 'down' : 'up'];
  const sh = [28.6, 15.2];
  // ------------------------------------------------ wings (far wing first, offset and shaded)
  const wing = (dx, dy, mem, bone, vein) => {
    const sp = (p) => [p[0] + dx, p[1] + dy], W0 = wp;
    Y([sp(sh), sp(W0.el), sp(W0.wr), sp(W0.tips[0]), sp(W0.notch[0]), sp(W0.tips[1]), sp(W0.notch[1]), sp(W0.tips[2]), sp(W0.notch[2]), sp(W0.tips[3]), sp([19.4, 18])], mem);
    // veins: a thin line from the wrist to the middle of every scallop, and one from the arm to the body
    if (vein) { for (const n of W0.notch) T(W0.wr[0] + dx + (n[0] - W0.wr[0]) * 0.18, W0.wr[1] + dy + (n[1] - W0.wr[1]) * 0.18, n[0] + dx, n[1] + dy, 0.32, vein); T(W0.el[0] + dx, W0.el[1] + dy, 19.4 + dx, 18 + dy, 0.32, vein); }
    T(sh[0] + dx, sh[1] + dy, W0.el[0] + dx, W0.el[1] + dy, 2.2, bone); T(W0.el[0] + dx, W0.el[1] + dy, W0.wr[0] + dx, W0.wr[1] + dy, 1.6, bone);
    E(W0.el[0] + dx, W0.el[1] + dy, 1.3, 1.3, bone); E(W0.wr[0] + dx, W0.wr[1] + dy, 1.1, 1.1, bone);                       // joints
    for (const t of W0.tips) { T(W0.wr[0] + dx, W0.wr[1] + dy, t[0] + dx, t[1] + dy, 0.65, bone === 1 ? 1 : bone); }
    if (bone === 1) { T(W0.wr[0], W0.wr[1], W0.wr[0] - 2.4, W0.wr[1] - 1.4, 0.8, 6); T(W0.wr[0] - 2.4, W0.wr[1] - 1.4, W0.wr[0] - 3.2, W0.wr[1] - 0.5, 0.5, 6); }   // thumb claw
  };
  wing(3.6, -0.8, 8, 8, 0);
  // ------------------------------------------------ far limbs (shaded)
  const leg = (hip, knee, ankle, foot, w, id, toes = true) => {
    T(hip[0], hip[1], knee[0], knee[1], w, id); T(knee[0], knee[1], ankle[0], ankle[1], w * 0.7, id); T(ankle[0], ankle[1], foot[0], foot[1], w * 0.6, id);
    if (toes) for (const [dx, dy] of [[-2.2, 0.5], [0.1, 0.9], [2.2, 0.3]]) { T(foot[0], foot[1], foot[0] + dx + 1.4, foot[1] + dy, 0.9, id); }
  };
  leg([21.6, 20.6], [24.6, 24.6], [21.4, 27.6], [22.4, 29.5], 4.2, 7);
  leg([31, 19.6], [29.2, 24.2], [32, 27.4], [33.6, 29.5], 3.2, 7);
  // ------------------------------------------------ tail
  const tail = [[14.6, 18.4, 5.6], [10.2, 20.2, 4.4], [6, 21.8, 3.2], [2.8, 23.6, 2.1], [0.2, 25.6, 1]];
  for (let i = 0; i + 1 < tail.length; i++) T(tail[i][0], tail[i][1], tail[i + 1][0], tail[i + 1][1], (tail[i][2] + tail[i + 1][2]) / 2, 1);
  Y([[2.6, 22.6], [-0.6, 24], [-1.6, 28.6], [1.2, 26.2]], 5);                              // blade at the tip
  for (let i = 0; i < 6; i++) { const x = 15 - i * 2.4, y = 16.4 + i * 0.95; Y([[x - 0.8, y + 0.9], [x - 0.3, y - 1.9 + i * 0.18], [x + 0.9, y + 0.9]], 5); }
  // ------------------------------------------------ torso
  Y([[33.4, 14], [30, 12.4], [25, 13.6], [19.6, 14.6], [15, 16.6], [13.4, 19.2], [15.4, 22], [20, 22.4], [25, 21.8], [29, 22.8], [33, 22.6], [35.4, 19.6], [35.2, 16.2]], 1);
  E(30.8, 16.8, 3.4, 3.4, 11);                                                           // shoulder muscle
  E(19, 19.2, 4.4, 3.9, 11);                                                             // haunch
  for (let i = 0; i < 5; i++) T(23.6 + i * 1.7, 15, 24.4 + i * 1.7, 19.6 - Math.abs(i - 2) * 0.4, 0.34, 12);   // ribs
  Y([[21.6, 21.4], [35.2, 20.8], [34.4, 23.4], [26.4, 23.2], [21.6, 22.8]], 2);                           // belly plates
  for (let i = 0; i < 7; i++) T(26 + i * 1.3, 21.6, 26.2 + i * 1.3, 23.3, 0.3, 12);
  // ------------------------------------------------ neck, spines, head
  const nx = attack ? 0.8 : hurt ? -2.5 : 0, ny = attack ? 4.6 : hurt ? -2 : 0;
  const nk = [[33.2, 16.2], [35.6 + nx * 0.4, 12.2 + ny * 0.3], [36.6 + nx * 0.7, 8.8 + ny * 0.6], [37 + nx, 7 + ny]];
  T(nk[0][0], nk[0][1], nk[1][0], nk[1][1], 5.6, 1); T(nk[1][0], nk[1][1], nk[2][0], nk[2][1], 4.2, 1); T(nk[2][0], nk[2][1], nk[3][0], nk[3][1], 3.2, 1);
  T(nk[0][0] + 1.4, nk[0][1] + 1, nk[1][0] + 1, nk[1][1] + 1, 1.6, 2); T(nk[1][0] + 0.9, nk[1][1] + 1, nk[2][0] + 0.8, nk[2][1] + 1.4, 1.2, 2);   // throat plates
  for (let i = 0; i < 4; i++) T(nk[0][0] + 1.2 + i * 0.25, nk[0][1] + 0.4 - i * 1.4, nk[0][0] + 2.6 + i * 0.25, nk[0][1] + 0.4 - i * 1.4, 0.28, 12);
  for (let i = 0; i < 5; i++) { const t = i / 4, x = nk[0][0] - 1.8 + (nk[3][0] - nk[0][0]) * t * 0.9, y = nk[0][1] - 2.6 + (nk[3][1] - nk[0][1]) * t; Y([[x - 0.8, y + 1.2], [x - 0.3, y - 1.4], [x + 0.8, y + 1.2]], 5); }
  for (let i = 0; i < 7; i++) { const x = 17.8 + i * 2.05, y = backY(x); Y([[x - 0.9, y + 0.9], [x - 0.2, y - 2.2 - Math.min(i, 6 - i) * 0.1], [x + 0.9, y + 0.9]], 5); }
  // head: long wedge skull, brow ridge, upturned nose, jaw full of teeth
  const hx = 40 + nx, hy = 6.6 + ny;
  const jaw = attack ? 3 : hurt ? 1.8 : 0.5;
  E(hx, hy, 3.3, 2.4, 1);
  Y([[hx + 0.5, hy - 1.7], [hx + 4.6, hy - 1.5], [hx + 7.6, hy - 0.6], [hx + 8.2, hy + 0.3], [hx + 7.9, hy + 1.3], [hx + 0.5, hy + 2.1]], 1);
  E(hx + 7.8, hy - 0.1, 0.9, 1, 1);
  T(hx - 0.8, hy + 2.2, hx + 7, hy + 1.9 + jaw, 1.5, 7); T(hx + 6.2, hy + 2.2 + jaw * 0.8, hx + 7.6, hy + 2 + jaw * 0.9, 0.9, 7);
  T(hx + 1.6, hy + 1.4 + jaw * 0.35, hx + 7.6, hy + 1.2 + jaw * 0.5, 0.35, 4);
  T(hx - 0.2, hy - 1.9, hx + 3.6, hy - 1.5, 0.9, 5);
  for (let i = 0; i < 6; i++) T(hx + 2.4 + i * 0.95, hy + 1.4, hx + 2.3 + i * 0.95, hy + 2.5 + (i % 2) * 0.4, 0.32, 10);
  for (let i = 0; i < 4; i++) T(hx + 2.8 + i * 1.2, hy + 1.8 + jaw * 0.6, hx + 2.9 + i * 1.2, hy + 0.9 + jaw * 0.3, 0.3, 10);
  if (attack) { T(hx + 2.4, hy + 1.8, hx + 7, hy + 2.6 + jaw * 0.2, 1.4, 9); P(hx + 4, hy + 1.8, 12, 4, 2); }
  T(hx - 1.4, hy - 1.8, hx - 6, hy - 4.4, 1.3, 6); T(hx - 0.4, hy - 2.2, hx - 4.4, hy - 6, 1.2, 6);
  T(hx - 2, hy - 0.8, hx - 7.2, hy - 1.4, 1.1, 6); T(hx - 2.4, hy + 0.6, hx - 6.4, hy + 1.8, 0.9, 6);
  T(hx + 1.6, hy - 2, hx + 2.8, hy - 3.8, 0.8, 6); T(hx - 0.2, hy + 2.8, hx - 1.2, hy + 4.4, 0.6, 6);
  const e = Math.max(1, Math.round(k * 0.8));
  if (hurt || dead) for (const [dx, dy] of [[0, 0], [1, 1], [1, 0], [0, 1]]) g.detail([[Math.round((hx + 1.2) * k) + dx * 2, Math.round((hy - 0.6) * k) + dy * 2, 0]], true);
  else P(hx + 1.2, hy - 0.8, 13, e + 2, e);
  P(hx + 7, hy - 0.5, 0, e, e);
  // ------------------------------------------------ near limbs
  E(19, 21.2, 4, 3.6, 14);
  leg([19.4, 20.8], [22.2, 25.2], [18.4, 27.8], [19.2, 29.6], 4.8, 14);
  leg([30.2, 19.8], [27.8, 24.6], [30.6, 27.6], [31.8, 29.6], 3.8, 14);
  // contour lines where the limbs meet the torso
  T(14.6, 19.4, 15.6, 22.8, 0.45, 12); T(15.6, 22.8, 19.4, 24.6, 0.45, 12); T(19.4, 24.6, 23.4, 23, 0.45, 12);
  T(27.2, 16.6, 27.6, 20.8, 0.45, 12); T(27.6, 20.8, 31, 22.4, 0.45, 12); T(31, 22.4, 33.6, 20.6, 0.45, 12);
  for (const [x, y] of [[19.2 + 1.6, 30.2], [19.2 - 0.8, 30.1], [19.2 + 3.2, 29.8], [31.8 + 1.6, 30.2], [31.8 - 0.8, 30.1], [31.8 + 3.2, 29.8]]) T(x, y, x + 0.9, y + 1.1, 0.5, 6);   // claws
  wing(0, 0, 3, 1, 13);                                                                   // near wing over the body
  let pix = render(g, DRAGON_R, { dither: [1, 11, 12, 3, 13], groups: { 11: 1, 12: 1, 13: 3, 7: 8, 14: 14 } });
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
