// Little helper for building tile grids + entity lists in code.
import { TILE } from '../config.js';
import { hash } from '../util.js';

export class Grid {
  constructor(w, h, fill = TILE.SNOW) {
    this.w = w; this.h = h;
    this.t = Array.from({ length: h }, () => Array(w).fill(fill));
    this.res = Array.from({ length: h }, () => Array(w).fill(false)); // reserved: no scatter
    this.entities = [];
    this.n = 0;
  }
  inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  set(x, y, t) { if (this.inb(x, y)) this.t[y][x] = t; }
  get(x, y) { return this.inb(x, y) ? this.t[y][x] : -1; }
  rect(x, y, w, h, t, reserve = true) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { this.set(i, j, t); if (reserve && this.inb(i, j)) this.res[j][i] = true; }
  }
  // L-shaped trail through waypoints (x first, then y), `th` tiles thick.
  path(pts, th, t) {
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      this.rect(Math.min(x0, x1), y0, Math.abs(x1 - x0) + th, th, t);
      this.rect(x1, Math.min(y0, y1), th, Math.abs(y1 - y0) + th, t);
    }
  }
  reserve(x, y, w, h) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (this.inb(i, j)) this.res[j][i] = true; }
  border(t, th) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (x < th || y < th || x >= this.w - th || y >= this.h - th) { this.t[y][x] = t; this.res[y][x] = true; }
    }
  }
  // Random speckle of a tile over base tiles only (never over reserved).
  scatter(t, count, seed, only = null) {
    let placed = 0;
    for (let i = 0; i < count * 20 && placed < count; i++) {
      const x = Math.floor(hash(i, seed, 11) * this.w), y = Math.floor(hash(i, seed, 12) * this.h);
      if (this.res[y][x]) continue;
      if (only != null && this.t[y][x] !== only) continue;
      this.t[y][x] = t; this.res[y][x] = true; placed++;
    }
  }
  noise(t, p, seed, base) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.t[y][x] === base && hash(x, y, seed) < p) this.t[y][x] = t;
    }
  }
  // Force a walkable tile and protect it from scatter (for props / signs / NPC spots).
  clear(x, y, t = TILE.SNOW2) { if (this.inb(x, y)) { this.t[y][x] = t; this.res[y][x] = true; } }
  // Sprinkle visual variety: snow pebbles / frozen tufts, worn paths, cracked ice or floors.
  dress(kind) {
    const T_ = TILE;
    if (kind === 'snow') {
      this.noise(T_.SNOW3, 0.045, 61, T_.SNOW); this.noise(T_.SNOW4, 0.05, 62, T_.SNOW); this.noise(T_.TUFT, 0.04, 63, T_.SNOW);
      this.noise(T_.SNOW3, 0.03, 64, T_.SNOW2);
    } else if (kind === 'late') {
      this.noise(T_.PATH2, 0.18, 65, T_.PATH); this.noise(T_.ICE2, 0.3, 66, T_.ICE);
    } else if (kind === 'crypt') {
      this.noise(T_.CFLOOR2, 0.2, 67, T_.CFLOOR); this.noise(T_.CWALL2, 0.25, 68, T_.CWALL);
    }
  }
  add(e) { this.entities.push(e); return this; }
  out() { return { grid: this.t, entities: this.entities, w: this.w, h: this.h }; }
}
