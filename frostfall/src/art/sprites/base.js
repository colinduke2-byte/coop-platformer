// Shared canvas helpers for the sprite builders (CH16).
import { PAL } from '../../config.js';

export const canvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
};
export const R = (ctx, col, x, y, w = 1, h = 1) => {
  ctx.fillStyle = PAL[col];
  ctx.fillRect(x, y, w, h);
};


export function px(ctx, col, x, y) { ctx.fillStyle = PAL[col]; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
export function line(ctx, col, x0, y0, x1, y1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for (let i = 0; i <= n; i++) px(ctx, col, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n);
}
export function tri(ctx, col, ax, ay, bx, by, cx, cy) {
  const x0 = Math.floor(Math.min(ax, bx, cx)), x1 = Math.ceil(Math.max(ax, bx, cx));
  const y0 = Math.floor(Math.min(ay, by, cy)), y1 = Math.ceil(Math.max(ay, by, cy));
  const d = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay) || 1;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const u = ((x - ax) * (cy - ay) - (cx - ax) * (y - ay)) / d, v = ((bx - ax) * (y - ay) - (x - ax) * (by - ay)) / d;
    if (u >= -0.02 && v >= -0.02 && u + v <= 1.02) px(ctx, col, x, y);
  }
}

// 1px dark outline inside each 16x16 cell so sprites read on bright snow.
export function outline(ctx, w, h, cw = 16) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  const a = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : d[(y * w + x) * 4 + 3]);
  const add = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (a(x, y)) continue;
    const cx = x % cw;
    const nb = (cx > 0 && a(x - 1, y)) || (cx < cw - 1 && a(x + 1, y)) || (y > 0 && a(x, y - 1)) || (y < h - 1 && a(x, y + 1));
    if (nb) add.push([x, y]);
  }
  ctx.fillStyle = PAL[0];
  for (const [x, y] of add) ctx.fillRect(x, y, 1, 1);
}

// A sheet of named frames of any cell size: frames = [{ name, draw(ctx, ox) }]. Used by creatures that need more than the

export function tex(scene, key, w, h, fn) {
  const cv = canvas(w, h);
  fn(cv.getContext('2d'), w, h);
  scene.textures.addCanvas(key, cv);
}

// A ring of colour `col` with a 1px dark rim inside and out, so a white or frost ring still reads on snow (VX-09).
export function ring(ctx, size, th, col = 6, rim = 2) {
  const c = size / 2 - 0.5, ro = size / 2 - 0.3;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.hypot(x - c, y - c);
    if (d <= ro - 1 && d >= ro - 1 - th) R(ctx, col, x, y);
    else if ((d <= ro && d > ro - 1) || (d < ro - 1 - th && d >= ro - 2 - th)) R(ctx, rim, x, y);
  }
}

