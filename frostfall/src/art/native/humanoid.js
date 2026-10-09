// Native-pixel humanoids: the same style table as the 16px sprites (STYLES in sprites.js), but drawn at the creature's real
// on-screen size. The figure is modelled in 16-unit design space (the old cell) and rasterised at k = size / 16, so the
// silhouette, hitbox and animation frames match the stretched sprite while every pixel is hero-sized.
import { Grid, render, blit, makeNativeSheet } from '../native.js';
import { STYLES } from '../sprites.js';
import { registerNative } from '../native_registry.js';

// Palette neighbours used to derive highlight / shadow from a style colour.
const LO = [0, 0, 1, 2, 3, 4, 5, 1, 7, 1, 9, 9, 11, 12, 1, 14];
const HI = [1, 2, 3, 4, 5, 6, 6, 8, 10, 10, 13, 12, 13, 13, 4, 6];
const ramp = (c) => [HI[c], c, LO[c]];

const ID = { legs: 1, boots: 2, body: 3, arm: 4, trim: 5, chest: 6, cape: 7, skin: 8, hair: 9, helm: 10, beard: 11, horns: 12, crown: 13, hood: 14, mask: 16, farleg: 17, fararm: 18, hand: 19 };

const DITHER = [ID.body, ID.legs];

function ramps(s) {
  const r = {};
  const set = (id, c) => { r[id] = ramp(c); };
  set(ID.legs, s.legs); set(ID.boots, s.boots ?? 0); set(ID.body, s.body); set(ID.arm, s.body); set(ID.trim, s.trim);
  set(ID.chest, s.chest ?? s.body); set(ID.cape, s.cape ?? 0); set(ID.skin, s.skin); set(ID.hair, s.hair); set(ID.helm, s.helm ?? s.hair);
  set(ID.beard, s.beard ?? s.hair); set(ID.horns, s.horns ?? 6); set(ID.crown, s.crown ?? 13); set(ID.hood, s.hood ?? s.hair); set(ID.mask, s.mask ?? 0);
  set(ID.hand, s.skin);
  const far = (c) => { const l = LO[c]; return [l, l, LO[l]]; };
  r[ID.cape] = [r[ID.cape][1], r[ID.cape][1], r[ID.cape][2]];
  r[ID.trim] = [r[ID.trim][1], r[ID.trim][1], r[ID.trim][2]];
  r[ID.farleg] = far(s.legs); r[ID.fararm] = far(s.body);
  r[ID.skin] = [s.skin, s.skin, LO[s.skin]];                       // faces stay flat-lit with a shadowed jaw
  return r;
}

// Draw one frame to a pixel array. dir: down | up | side | atkdown | atkup | atkside | hurt | dead; fr: 0..2.
function figure(N, s, dirIn, frIn) {
  const k = N / 16, g = new Grid(N, N);
  const X = (v) => Math.round(v * k);
  const R = (x, y, w, h, id) => g.rect(X(x), X(y), Math.max(1, X(x + w) - X(x)), Math.max(1, X(y + h) - X(y)), id);
  const E = (cx, cy, rx, ry, id, keep) => g.ell(cx * k, cy * k, rx * k, ry * k, id, keep);
  const T = (x0, y0, x1, y1, w, id) => g.thick(x0 * k, y0 * k, x1 * k, y1 * k, w * k, id);
  // rounded rectangle, corner radius in design units
  const Q = (x, y, w, h, id, r = 0.9) => {
    const x0 = X(x), y0 = X(y), x1 = Math.max(x0 + 1, X(x + w)), y1 = Math.max(y0 + 1, X(y + h)), rr = Math.max(0, Math.round(r * k));
    for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
      const dx = i < x0 + rr ? x0 + rr - i : i >= x1 - rr ? i - (x1 - rr - 1) : 0, dy = j < y0 + rr ? y0 + rr - j : j >= y1 - rr ? j - (y1 - rr - 1) : 0;
      if (dx * dx + dy * dy <= rr * rr + rr * 0.6) g.put(i, j, id);
    }
  };
  const P = (x, y, c) => g.detail([[X(x), X(y), c]]);
  const px = Math.max(1, Math.round(k * 0.5));
  const eye = s.eye ?? 0;
  const armored = s.helm != null || s.chest != null;
  let pose = null, dir = dirIn;
  if (dir.startsWith('atk')) { pose = 'atk'; dir = dir.slice(3); } else if (dir === 'hurt') { pose = 'hurt'; dir = 'down'; }
  const fr = pose ? 0 : frIn;

  if (dir === 'dead') {
    // lying on the ground, head left, feet right
    Q(9.4, 10.4, 4.4, 2.4, ID.legs, 0.6); Q(13.4, 10.5, 2.4, 2.3, ID.boots, 0.5);
    Q(3.6, 9.6, 6.6, 3.4, ID.body, 1); R(7, 9.8, 1.1, 3, ID.trim);
    if (s.cape) Q(3.6, 8.9, 5.4, 1.4, ID.cape, 0.5);
    Q(0.4, 9.2, 4, 3.8, ID.skin, 1.2); Q(0.4, 8.8, 3.6, 1.8, s.helm ? ID.helm : ID.hair, 0.9);
    if (s.beard != null) R(1.2, 11.6, 2.4, 1.1, ID.beard);
    if (s.horns != null) T(1, 9, 0.4, 7.4, 0.9, ID.horns);
    if (s.crown != null) R(0.6, 8.2, 3, 0.8, ID.crown);
    R(4.6, 12.9, 3, 0.9, ID.hand);
    P(1.9, 10.7, 0); P(2.3, 10.7, 0);
    return render(g, ramps(s), { dither: DITHER });
  }

  if (dir === 'down' || dir === 'up') {
    const back = dir === 'up', lUp = fr === 1, rUp = fr === 2;
    if (s.cape && back) Q(3.2, 6.6, 9.6, 8, ID.cape, 1);
    // legs
    Q(5.1, 11.4, 2.6, lUp ? 1.9 : 2.8, ID.legs, 0.5); Q(4.9, lUp ? 12.9 : 13.7, 3, lUp ? 1.7 : 1.5, ID.boots, 0.5);
    Q(8.3, 11.4, 2.6, rUp ? 1.9 : 2.8, ID.legs, 0.5); Q(8.1, rUp ? 12.9 : 13.7, 3, rUp ? 1.7 : 1.5, ID.boots, 0.5);
    // torso, belt, collar
    Q(3.8, 6.6, 8.4, 5.7, ID.body, 1.3);
    R(3.8, 10.1, 8.4, 1.1, ID.trim);
    if (!back && s.chest != null) { R(5.8, 6.7, 4.4, 1, ID.chest); R(6.8, 7.7, 2.4, 0.9, ID.chest); }
    if (!back) { R(7.4, 10.1, 1.2, 1.1, ID.chest); }
    // arms
    const la = fr === 1 ? -0.9 : fr === 2 ? 0.9 : 0;
    const arm = (x, top, len, handUp) => { Q(x, top, 1.5, len, ID.arm, 0.6); if (handUp) Q(x, top - 1.2, 1.5, 1.3, ID.hand, 0.5); else Q(x, top + len - 0.2, 1.5, 1.3, ID.hand, 0.5); };
    if (!pose) { arm(2.4, 7.6 + la, 3.4, false); arm(12.1, 7.6 - la, 3.4, false); }
    else if (pose === 'hurt') { arm(2, 4.6, 3.3, true); arm(12.5, 4.6, 3.3, true); }
    else if (frIn === 0) { arm(2.4, 7.8, 3.2, false); arm(12.1, 3.6, 4.2, true); }
    else if (frIn === 1) { arm(2.4, 8.6, 4, false); arm(12.1, 8.6, 4, false); }
    else { arm(2.4, 9.4, 2.4, false); arm(12.1, 9.4, 2.4, false); }
    // shoulders
    if (s.cape && !back) { E(3.3, 7.4, 1.3, 0.9, ID.cape); E(12.7, 7.4, 1.3, 0.9, ID.cape); }
    else if (armored) { E(3.3, 7.3, 1.4, 1, ID.trim); E(12.7, 7.3, 1.4, 1, ID.trim); }
    // head
    if (back) {
      Q(4.6, 1.6, 6.8, 5.8, s.hood != null ? ID.hood : ID.hair, 1.6);
      if (s.helm) Q(4.6, 1.6, 6.8, 3.4, ID.helm, 1.4);
      if (s.cape) Q(4.2, 7, 7.6, 2.2, ID.cape, 0.8);
    } else {
      Q(4.7, 1.8, 6.6, 5.6, ID.skin, 1.8);
      if (s.hood != null) { Q(4, 1.5, 8, 6.2, ID.hood, 2); Q(5.5, 3, 5, 3.9, ID.skin, 1.4); }
      else {
        Q(4.7, 1.5, 6.6, 2.5, ID.hair, 1.4); R(4.7, 3.5, 1.2, 2.8, ID.hair); R(10.1, 3.5, 1.2, 2.8, ID.hair);
        R(6, 3.4, 1.8, 0.7, ID.hair); R(9, 3.4, 1, 0.6, ID.hair);
      }
      if (s.helm) { Q(4.6, 1.4, 6.8, 2.9, ID.helm, 1.4); R(7.3, 3.8, 1.4, 2, ID.helm); R(4.6, 3.8, 1, 1.6, ID.helm); R(10.4, 3.8, 1, 1.6, ID.helm); }
      if (s.beard != null) { Q(5.2, 5.4, 5.6, 2.2, ID.beard, 0.9); }
      if (s.mask != null) R(4.8, 5, 6.4, 2, ID.mask);
      const ew = Math.max(1, Math.round(k * 0.65)), eh = Math.max(1, Math.round(k * 1.0));
      const ey = X(4.3);
      const col = s.glow != null ? s.glow : eye;
      const hx = pose === 'hurt';
      for (const ex of [X(6.1), X(9.2)]) {
        if (hx) { g.detail([[ex, ey, 0], [ex + ew, ey + eh - 1, 0], [ex + ew, ey, 0], [ex, ey + eh - 1, 0]], true); continue; }
        for (let j = 0; j < eh; j++) for (let i = 0; i < ew; i++) g.detail([[ex + i, ey + j, col]], true);
      }
      if (s.glow != null && k > 2) { P(5.4, 4.3, LO[s.glow]); }
      if (s.beard == null && s.mask == null) { g.detail([[X(7.4), X(6.2), LO[s.skin]], [X(8.4), X(6.2), LO[s.skin]]], true); }
      if (hx) { for (let i = 0; i < Math.round(k * 2); i++) g.detail([[X(7) + i, X(6.4), 0]], true); }
    }
    if (s.horns != null) { T(4.6, 2.6, 3.4, 0.9, 1.3, ID.horns); T(3.4, 0.9, 3.1, 0, 0.8, ID.horns); T(11.4, 2.6, 12.6, 0.9, 1.3, ID.horns); T(12.6, 0.9, 12.9, 0, 0.8, ID.horns); }
    if (s.crown != null) { R(4.8, 1.1, 6.4, 1, ID.crown); for (const cx of [4.8, 7.4, 10.4]) R(cx, 0.1, 0.9, 1.1, ID.crown); }
  } else {
    // side view, facing right
    const spread = fr === 1, together = fr === 2;
    const lx = spread ? 4.6 : together ? 7 : 5.8, rx = spread ? 9.4 : together ? 7 : 8.4;
    if (s.cape) { Q(2.2, 6.8, 4, 7.4, ID.cape, 1); }
    // far limbs first, in shade
    Q(lx - 0.2, 11.4, 2.6, 2.5, ID.farleg, 0.5); Q(lx - 0.4, 13.7, 3.2, 1.6, ID.boots, 0.5);
    Q(rx - 0.2, 11.4, 2.6, 2.5, ID.legs, 0.5); Q(rx - 0.1, 13.7, 3.4, 1.6, ID.boots, 0.5);
    Q(4.8, 6.6, 6.6, 5.7, ID.body, 1.3);
    R(4.8, 10.1, 6.6, 1.1, ID.trim);
    if (s.chest != null) R(9, 6.7, 2.4, 1, ID.chest);
    R(9.4, 10.1, 1.2, 1.1, ID.chest);
    const ax = fr === 1 ? 8 : fr === 2 ? 5.6 : 6.8;
    const arm = (x, y, w, h, hx, hy) => { Q(x, y, w, h, ID.arm, 0.6); Q(hx, hy, 1.5, 1.4, ID.hand, 0.5); };
    if (!pose) arm(ax, 7.8, 1.9, 3.4, ax, 10.9);
    else if (frIn === 0) arm(4.8, 4.8, 1.9, 3.4, 4.8, 3.7);
    else if (frIn === 1) { Q(9, 8, 4.2, 1.8, ID.arm, 0.6); Q(13, 8, 2.2, 1.9, ID.hand, 0.5); }
    else arm(8, 9.8, 2.6, 2.2, 10.2, 10.2);
    if (s.cape) E(6, 7.3, 1.4, 0.9, ID.cape);
    else if (armored) E(7, 7.2, 1.5, 1, ID.trim);
    // head
    Q(5.4, 1.8, 6.4, 5.6, ID.skin, 1.8);
    if (s.hood != null) { Q(4.8, 1.5, 6.6, 6.2, ID.hood, 2); Q(8.6, 2.8, 3.2, 3.8, ID.skin, 1.2); }
    else { Q(5.2, 1.5, 6.4, 2.5, ID.hair, 1.4); R(5.2, 3.5, 2.6, 3, ID.hair); R(6.5, 3.4, 3.4, 0.8, ID.hair); }
    if (s.helm) { Q(5.2, 1.4, 6.6, 2.9, ID.helm, 1.4); R(5.2, 3.8, 2.6, 2.6, ID.helm); R(10.6, 3.8, 1.2, 1.7, ID.helm); }
    if (s.beard != null) Q(8.2, 5.4, 3.4, 2.4, ID.beard, 0.9);
    if (s.mask != null) R(8.8, 5, 3, 2, ID.mask);
    const ew = Math.max(1, Math.round(k * 0.65)), eh = Math.max(1, Math.round(k * 1.0)), ex = X(9.8), ey = X(4.3), col = s.glow != null ? s.glow : eye;
    for (let j = 0; j < eh; j++) for (let i = 0; i < ew; i++) g.detail([[ex + i, ey + j, col]], true);
    if (s.beard == null && s.mask == null) g.detail([[X(10.4), X(6.2), LO[s.skin]], [X(10.4) + 1, X(6.2), LO[s.skin]]], true);
    if (s.horns != null) { T(7, 2.4, 6.4, 0.9, 1.3, ID.horns); T(6.4, 0.9, 6.1, 0, 0.8, ID.horns); T(9.6, 2.4, 10.4, 0.9, 1.1, ID.horns); T(10.4, 0.9, 11, 0, 0.7, ID.horns); }
    if (s.crown != null) { R(5.6, 1.1, 5.8, 1, ID.crown); for (const cx of [5.6, 8, 10.4]) R(cx, 0.1, 0.9, 1.1, ID.crown); }
  }
  return render(g, ramps(s), { dither: DITHER });
}

const POSES = ['down', 'up', 'side', 'atkdown', 'atkup', 'atkside', 'hurt', 'dead'];

// Build the 24-frame sheet (down0..dead2) for a style at N x N.
export function humanoidSheet(scene, key, N, styleName, tweak = null) {
  const s = tweak ? tweak({ ...STYLES[styleName] }) : STYLES[styleName];
  const frames = [];
  for (const d of POSES) for (let f = 0; f < 3; f++) {
    const pix = figure(N, s, d, f);
    frames.push({ name: `${d}${f}`, draw: (ctx, ox) => blit(ctx, pix, N, N, ox, 0) });
  }
  return makeNativeSheet(scene, key, N, N, frames);
}

// Register a humanoid-style creature: kind (ENEMIES key), the STYLES entry it uses, and its on-screen scale.
export function registerHumanoid(kind, styleName, scale, tweak = null) {
  const N = Math.round(16 * scale);
  registerNative(kind, { scale, w: N, h: N, build: (scene, key) => humanoidSheet(scene, key, N, styleName, tweak) });
}
