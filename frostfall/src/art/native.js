// Native-pixel toolkit. Large creatures are drawn at their real on-screen size (16 x scale) and shown at scale 1,
// so every pixel on screen is the same size as the hero's. Same 16-colour palette, same outlined, stepped-shading look.
//
// Draw with part ids on a Grid (rect / ell / thick / put), then render(): each id gets a 3-colour ramp
// (highlight / mid / shadow), shaded from the part's own top and bottom edges with a light checker dither, then a
// 1px outline in palette 0 is added around the whole silhouette.
import { PAL } from '../config.js';

export class Grid {
  constructor(w, h) { this.w = w; this.h = h; this.p = new Uint8Array(w * h); this.det = []; }
  get(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.p[y * this.w + x]; }
  put(x, y, id) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.p[y * this.w + x] = id; return this; }
  rect(x, y, w, h, id) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.put(i, j, id); return this; }
  // Filled ellipse centred on (cx, cy); `keep(x, y)` can mask pixels out.
  ell(cx, cy, rx, ry, id, keep = null) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1 && (!keep || keep(x, y))) this.put(x, y, id);
    }
    return this;
  }
  // A round-ended stroke of width w (limbs, tails, horns).
  thick(x0, y0, x1, y1, w, id) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 3 + 1;
    for (let i = 0; i <= n; i++) { const t = i / n; this.ell(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w / 2, w / 2, id); }
    return this;
  }
  // Single pixels drawn after shading: [x, y, paletteIndex]. They only land on filled pixels unless force is set.
  detail(list, force = false) { for (const d of list) this.det.push([d[0], d[1], d[2], force || d[2] === 0]); return this; }
}

// Ramps are PAL indices [highlight, mid, shadow].
export const RAMPS = {
  skin: [10, 10, 9], hair: [10, 9, 1], cloth: [4, 3, 2], dark: [3, 2, 1], pale: [6, 5, 4], wood: [10, 9, 1],
  red: [12, 11, 9], gold: [13, 12, 9], ice: [6, 5, 4], steel: [5, 4, 3], stone: [4, 3, 2], leaf: [8, 8, 7], moss: [8, 7, 1], purple: [15, 14, 1], fur: [10, 9, 1],
};

// grid -> array of palette indices (-1 = empty). ramps: { id: [hi, mid, lo] }.
export function render(grid, ramps, { outline = true, dither = true } = {}) {
  const { w, h } = grid, out = new Int16Array(w * h).fill(-1);
  const same = (x, y, id) => grid.get(x, y) === id;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const id = grid.get(x, y); if (!id) continue;
    const r = ramps[id] || RAMPS.cloth;
    let dt = 0, db = 0;
    for (let k = y - 1; k >= 0 && same(x, k, id) && dt < 4; k--) dt++;
    for (let k = y + 1; k < h && same(x, k, id) && db < 4; k++) db++;
    const chk = ((x + y) & 1) === 0;
    let c = r[1];
    if (dt === 0) c = r[0];
    if (db === 0) c = r[2]; else if (dither && db === 1 && chk) c = r[2];
    out[y * w + x] = c;
  }
  for (const [x, y, c, force] of grid.det) if (x >= 0 && y >= 0 && x < w && y < h && (force || grid.get(x, y))) out[y * w + x] = c;
  if (outline) {
    const res = out.slice();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (out[y * w + x] !== -1) continue;
      if ((x > 0 && out[y * w + x - 1] !== -1) || (x < w - 1 && out[y * w + x + 1] !== -1) || (y > 0 && out[(y - 1) * w + x] !== -1) || (y < h - 1 && out[(y + 1) * w + x] !== -1)) res[y * w + x] = 0;
    }
    return res;
  }
  return out;
}

// Paint rendered pixels into a canvas context at (ox, oy).
export function blit(ctx, pix, w, h, ox = 0, oy = 0) {
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = pix[y * w + x]; if (c >= 0) { ctx.fillStyle = PAL[c]; ctx.fillRect(ox + x, oy + y, 1, 1); } }
}

// Mirror pixels left-right inside a w x h cell.
export function flipped(pix, w, h) {
  const o = new Int16Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o[y * w + x] = pix[y * w + (w - 1 - x)];
  return o;
}

// Build a texture of named frames, all w x h. frames: [{ name, draw(ctx, ox) }]. Nearest-neighbour, no smoothing.
export function makeNativeSheet(scene, key, w, h, frames) {
  const cv = document.createElement('canvas');
  cv.width = w * frames.length; cv.height = h;
  const ctx = cv.getContext('2d');
  frames.forEach((f, i) => f.draw(ctx, i * w));
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.addCanvas(key, cv);
  frames.forEach((f, i) => tex.add(f.name, 0, i * w, 0, w, h));
  return tex;
}
