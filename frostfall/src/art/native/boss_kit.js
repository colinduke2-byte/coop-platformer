// Kit for hand-designed native-pixel humanoid bosses. Every boss supplies its own anatomy as a function draw(c) that places shapes
// in the old 16-unit design space (feet near y 15, head near y 1-7); the kit supplies the animation state and builds the same
// 24-frame sheet (down0..dead2) the game expects, so a boss can be a stag, a rock heap or a ghost and still animate and attack.
//
//   c.view   'front' | 'back' | 'side' (side faces right)       c.pose  null | 'atk' | 'hurt'
//   c.fr     walk frame 0..2                                     c.atk   attack phase 0 windup, 1 strike, 2 recover
//   c.stride -1 | 0 | 1  which leg is forward                    c.bob   body drop in design units while stepping
//   c.id.<name>  numeric part id for each entry of design.palette
//   c.R c.E c.T c.Q c.Y c.P  shape helpers (rect, ellipse, thick line, rounded rect, polygon, detail pixels) in design units
//   c.arm(side, x, y, len, w, part, hand)  an arm that swings / raises with the pose;  c.leg(x, y, len, w, part, boot)
import { Grid, render, blit, makeNativeSheet, shaper } from '../native.js';

// Palette neighbours used to derive highlight / shadow from one colour.
const LO = [0, 0, 1, 2, 3, 4, 5, 1, 7, 1, 9, 9, 11, 12, 1, 14];
const HI = [1, 2, 3, 4, 5, 6, 6, 8, 10, 10, 13, 12, 13, 13, 4, 6];
export const ramp = (c) => [HI[c], c, LO[c]];
export const flat = (c) => [c, c, LO[c]];

const POSES = ['down', 'up', 'side', 'atkdown', 'atkup', 'atkside', 'hurt', 'dead'];

function context(N, design, dirIn, frIn) {
  const k = N / 16, g = new Grid(N, N), sh = shaper(g, k);
  let dir = dirIn, pose = null;
  if (dir.startsWith('atk')) { pose = 'atk'; dir = dir.slice(3); } else if (dir === 'hurt') { pose = 'hurt'; dir = 'down'; }
  const fr = pose ? 0 : frIn;
  const id = {}; const ramps = {};
  Object.entries(design.palette).forEach(([name, v], i) => { id[name] = i + 1; ramps[i + 1] = Array.isArray(v) ? v : ramp(v); });
  const c = { ...sh, g, k, N, id, view: dir === 'down' ? 'front' : dir === 'up' ? 'back' : 'side', pose, fr, atk: pose === 'atk' ? frIn : -1,
    stride: fr === 1 ? -1 : fr === 2 ? 1 : 0, bob: fr ? 0.35 : 0, hurt: pose === 'hurt' };
  const { R, Q, E, T } = sh;
  // an arm hanging from (x, y); lifts for the attack windup, thrusts forward on the strike, flinches up when hurt
  c.arm = (side, x, y, len, w, part, hand = null, handR = 0.9) => {
    const sgn = side === 'R' ? 1 : -1;
    let dx = 0, dy = 0, l = len;
    if (c.hurt) { dy = -len * 0.8; dx = sgn * 0.4; }
    else if (pose === 'atk' && side === 'R') { if (c.atk === 0) { dy = -len * 0.95; } else if (c.atk === 1) { dy = len * 0.3; dx = 0.2; l = len * 1.05; } else dy = -len * 0.15; }
    else if (pose === 'atk') { dy = c.atk === 1 ? len * 0.15 : 0; }
    else dy = (side === 'L' ? -1 : 1) * c.stride * 0.8;
    const x1 = x + dx, y1 = y + dy + l;
    T(x, y, x1, y1, w, part);
    if (hand != null) E(x1, y1 + 0.1, handR, handR, hand);
    return [x1, y1];
  };
  c.leg = (x, y, len, w, part, boot = null, bootW = null) => {
    const lift = c.stride !== 0 && ((x < 8 && c.stride === -1) || (x >= 8 && c.stride === 1)) ? 0.9 : 0;
    Q(x - w / 2, y, w, len - lift, part, 0.4);
    if (boot != null) Q(x - (bootW || w + 0.6) / 2, y + len - lift - 0.9, bootW || w + 0.6, 1.4, boot, 0.4);
  };
  return { c, ramps };
}

function figure(N, design, dir, fr) {
  if (dir === 'dead') return deadFigure(N, design);
  const { c, ramps } = context(N, design, dir, fr);
  design.draw(c);
  return render(c.g, ramps, { dither: design.dither || [], groups: design.groups || null, outline: true });
}

// Lying on the ground, head left, built from the design's first colours so every boss still falls in its own colours.
function deadFigure(N, design) {
  const k = N / 16, g = new Grid(N, N), { R, Q, E, T, P } = shaper(g, k);
  const names = Object.keys(design.palette), ramps = {};
  names.forEach((n, i) => { const v = design.palette[n]; ramps[i + 1] = Array.isArray(v) ? v : ramp(v); });
  const d = design.dead || {}, bi = (d.body ?? 'body'), hi = (d.head ?? 'head');
  const B = names.indexOf(bi) + 1 || 1, H = names.indexOf(hi) + 1 || 1;
  Q(3.6, 9.4, 8.6, 3.6, B, 1.2); Q(0.4, 9, 4, 4, H, 1.4); Q(11, 10.2, 4.6, 2.4, B, 0.8);
  if (d.extra) d.extra({ R, Q, E, T, P, id: Object.fromEntries(names.map((n, i) => [n, i + 1])) });
  P(1.8, 10.8, 0, 2, 1);
  return render(g, ramps, { dither: [], groups: design.groups || null, outline: true });
}

export function bossSheet(scene, key, N, design) {
  const frames = [];
  for (const d of POSES) for (let f = 0; f < 3; f++) {
    const pix = figure(N, design, d, f);
    frames.push({ name: `${d}${f}`, draw: (ctx, ox) => blit(ctx, pix, N, N, ox, 0) });
  }
  return makeNativeSheet(scene, key, N, N, frames);
}
