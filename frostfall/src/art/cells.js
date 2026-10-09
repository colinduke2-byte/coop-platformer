// Shared pixel-cell helpers for hand-built weapons, armour and charms.
// A thing is a list of cells [u, v, colour]; u runs along it (hilt/butt first), v across. These helpers turn cells into a 16x16 icon
// (rotated 45 degrees) or a horizontal held sprite, add the 1px outline, and give a small builder of shape primitives.
import { PAL } from '../config.js';
export const R = (ctx, col, x, y, w = 1, h = 1) => { ctx.fillStyle = PAL[col]; ctx.fillRect(x, y, w, h); };
export const DAG_HI = [1, 2, 3, 4, 5, 6, 6, 8, 10, 10, 13, 12, 13, 13, 4, 6];
export const DAG_LO = [0, 0, 1, 2, 3, 4, 5, 1, 7, 1, 9, 9, 11, 12, 1, 14];

export function outlineCells(map, w, h, put) {
  const add = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (map.has(y * w + x)) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => map.has((y + dy) * w + (x + dx)) && x + dx >= 0 && x + dx < w)) add.push([x, y]);
  }
  for (const [x, y] of add) put(0, x, y);
}
// Draw any weapon from its cells ([u, v, colour], u along the weapon from the butt/hilt, v across) as a 16x16 icon rotated 45 degrees.
export function iconFromCells(g, cells) {
  const src = new Map();
  let u0 = 1e9, u1 = -1e9;
  for (const [u, v, c] of cells) { src.set(u + ',' + v, c); u0 = Math.min(u0, u); u1 = Math.max(u1, u); }
  const len = u1 - u0 + 1, sc = Math.min(1, 14 / (len * 0.7071 * 1.6)), uc = (u0 + u1) / 2, map = new Map();
  const rr = Math.max(0, Math.round(0.5 / sc - 0.2));              // when shrinking, look around the sample point so thin shafts survive
  for (let Y = 0; Y < 16; Y++) for (let X = 0; X < 16; X++) {
    const dx = X - 7.5, dy = Y - 8, u = ((dx - dy) / 1.4142) / sc * 0.98 + uc, v = ((dx + dy) / 1.4142) / sc * 0.98;
    let best, bd = 1e9;
    for (let du = -rr; du <= rr; du++) for (let dv = -rr; dv <= rr; dv++) {
      const c = src.get(Math.round(u) + du + ',' + (Math.round(v) + dv));
      if (c === undefined) continue;
      const d = du * du + dv * dv * 1.3 + (c === 0 ? 0.6 : 0);
      if (d < bd) { bd = d; best = c; }
    }
    if (best !== undefined) map.set(Y * 16 + X, best);
  }
  for (const [k, c] of map) R(g, c, k % 16, Math.floor(k / 16));
  outlineCells(map, 16, 16, (c, x, y) => R(g, c, x, y));
}
// ... and as a horizontal held sprite, hilt at the left, vertically centred at row `cy` of a W x H canvas.
export function heldFromCells(g, cells, W, H, cy, ox = 6) {
  const map = new Map();
  for (const [u, v, c] of cells) { const x = u + ox, y = v + cy; if (x >= 0 && x < W && y >= 0 && y < H) map.set(y * W + x, c); }
  for (const [k, c] of map) R(g, c, k % W, Math.floor(k / W));
  outlineCells(map, W, H, (c, x, y) => R(g, c, x, y));
}

export const LET = { W: 9, T: 10, K: 1, S: 6, C: 15, c: 5, G: 13, O: 12, R: 11, E: 8, M: 7, P: 14, D: 0, I: 3, N: 4 };
export function Cb() {
  const m = new Map();
  const put = (u, v, c) => { m.set(Math.round(u) + ',' + Math.round(v), c); };
  return {
    put,
    cells: () => [...m.entries()].map(([k, c]) => { const [u, v] = k.split(',').map(Number); return [u, v, c]; }),
    slab(u0, u1, top, bot, c) { for (let u = u0; u <= u1; u++) for (let v = Math.round(top(u)); v <= Math.round(bot(u)); v++) put(u, v, typeof c === 'function' ? c(u, v) : c); },
    orb(cu, cv, r, c, c2) { for (let u = Math.floor(cu - r); u <= Math.ceil(cu + r); u++) for (let v = Math.floor(cv - r); v <= Math.ceil(cv + r); v++) if ((u - cu) ** 2 + (v - cv) ** 2 <= r * r + 0.3) put(u, v, c2 && (u + v) % 2 && u < cu ? c2 : c); },
    ring(cu, cv, r, c) { for (let a = 0; a < 360; a += 8) put(cu + Math.cos((a * Math.PI) / 180) * r, cv + Math.sin((a * Math.PI) / 180) * r, c); },
    line(u0, v0, u1, v1, c) { const n = Math.max(Math.abs(u1 - u0), Math.abs(v1 - v0), 1); for (let i = 0; i <= n; i++) put(u0 + ((u1 - u0) * i) / n, v0 + ((v1 - v0) * i) / n, c); },
  };
}
export const col2 = (L, col) => (L === 'B' ? col : L === 'H' ? (DAG_HI[col] ?? 6) : L === 'L' ? (DAG_LO[col] ?? 1) : LET[L] ?? col);
