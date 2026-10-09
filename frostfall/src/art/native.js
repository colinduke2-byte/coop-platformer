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
  // Filled polygon, points in pixel coordinates [[x, y], ...].
  poly(pts, id) {
    let y0 = Infinity, y1 = -Infinity;
    for (const [, y] of pts) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(this.h - 1, Math.ceil(y1)); y++) {
      const yy = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yy && by > yy) || (by <= yy && ay > yy)) xs.push(ax + ((yy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) this.put(x, y, id);
    }
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
// groups: { id: groupId } makes parts that overlap one material (a muscle over a body, a rib line) shade as one piece, so overlays do
// not chop the shading into short runs.
export function render(grid, ramps, { outline = true, dither = true, groups = null } = {}) {
  const { w, h } = grid, out = new Int16Array(w * h).fill(-1);
  const gid = (id) => (groups && groups[id]) || id;
  const same = (x, y, id) => gid(grid.get(x, y)) === gid(id);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const id = grid.get(x, y); if (!id) continue;
    const r = ramps[id] || RAMPS.cloth;
    let dt = 0, db = 0;
    for (let k = y - 1; k >= 0 && same(x, k, id) && dt < 4; k--) dt++;
    for (let k = y + 1; k < h && same(x, k, id) && db < 4; k++) db++;
    const chk = ((x + y) & 1) === 0, run = dt + db + 1;
    let c = r[1];
    if (run > 2) {                                  // thin strokes (belts, trims, horn tips) stay one flat colour
      if (dt === 0) c = r[0];
      if (db === 0) c = r[2]; else if ((dither === true || (dither && dither.includes(id))) && db === 1 && chk) c = r[2];
    }
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

// Drawing helpers in design space: coordinates are in units of the old 16px cell (or any unit), scaled by k to pixels.
export function shaper(g, k) {
  const X = (v) => Math.round(v * k);
  const R = (x, y, w, h, id) => g.rect(X(x), X(y), Math.max(1, X(x + w) - X(x)), Math.max(1, X(y + h) - X(y)), id);
  const E = (cx, cy, rx, ry, id, keep) => g.ell(cx * k, cy * k, rx * k, ry * k, id, keep);
  const T = (x0, y0, x1, y1, w, id) => g.thick(x0 * k, y0 * k, x1 * k, y1 * k, w * k, id);
  const Q = (x, y, w, h, id, r = 0.9) => {
    const x0 = X(x), y0 = X(y), x1 = Math.max(x0 + 1, X(x + w)), y1 = Math.max(y0 + 1, X(y + h)), rr = Math.max(0, Math.round(r * k));
    for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) {
      const dx = i < x0 + rr ? x0 + rr - i : i >= x1 - rr ? i - (x1 - rr - 1) : 0, dy = j < y0 + rr ? y0 + rr - j : j >= y1 - rr ? j - (y1 - rr - 1) : 0;
      if (dx * dx + dy * dy <= rr * rr + rr * 0.6) g.put(i, j, id);
    }
  };
  const Y = (pts, id) => g.poly(pts.map(([x, y]) => [x * k, y * k]), id);
  const P = (x, y, c, w = 1, h = 1) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) g.detail([[X(x) + i, X(y) + j, c]], true); };
  return { X, R, E, T, Q, P, Y };
}

// Flip a w x h pixel array upside down (death poses).
export function flippedV(pix, w, h) {
  const o = new Int16Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o[y * w + x] = pix[(h - 1 - y) * w + x];
  return o;
}
