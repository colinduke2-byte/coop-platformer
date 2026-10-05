// Tile-based line of sight and BFS path-finding (mixed into GameScene).
import Phaser from 'phaser';
import { T } from '../config.js';

export const pathingMethods = {
  tileIdAt(px, py) {
    const x = Math.floor(px / T), y = Math.floor(py / T);
    return this.built.grid[y]?.[x] ?? -1;
  },

  solidAt(px, py) {
    const x = Math.floor(px / T), y = Math.floor(py / T);
    return this.solid[y]?.[x] ?? true;
  },

  // Tile-based line of sight (trees and walls block it).
  hasLOS(ax, ay, bx, by) {
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 6);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (this.solidAt(ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
    }
    return true;
  },

  // Line is clear for a body ~8px wide (centre ray + two side rays).
  clearLine(ax, ay, bx, by, half = 4) {
    const l = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / l * half, ny = (bx - ax) / l * half;
    return this.hasLOS(ax, ay, bx, by) && this.hasLOS(ax + nx, ay + ny, bx + nx, by + ny) && this.hasLOS(ax - nx, ay - ny, bx - nx, by - ny);
  },

  // BFS on the tile grid; returns the next point to steer toward, or null.
  nextWaypoint(ax, ay, bx, by) {
    const w = this.built.w, h = this.built.h;
    const sx = Phaser.Math.Clamp(Math.floor(ax / T), 0, w - 1), sy = Phaser.Math.Clamp(Math.floor(ay / T), 0, h - 1);
    let gx = Phaser.Math.Clamp(Math.floor(bx / T), 0, w - 1), gy = Phaser.Math.Clamp(Math.floor(by / T), 0, h - 1);
    const free = (x, y) => x >= 0 && y >= 0 && x < w && y < h && !this.solid[y][x];
    if (!free(gx, gy)) {
      let found = false;
      for (let r = 1; r < 3 && !found; r++) for (let dy = -r; dy <= r && !found; dy++) for (let dx = -r; dx <= r && !found; dx++) {
        if (free(gx + dx, gy + dy)) { gx += dx; gy += dy; found = true; }
      }
      if (!found) return null;
    }
    const prev = new Int32Array(w * h).fill(-2);
    const q = [sy * w + sx];
    prev[q[0]] = -1;
    const goal = gy * w + gx;
    let qi = 0, hit = false;
    while (qi < q.length && q.length < 2500) {
      const cur = q[qi++];
      if (cur === goal) { hit = true; break; }
      const cx = cur % w, cy = (cur / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (!free(nx, ny) || prev[ny * w + nx] !== -2) continue;
        if (dx && dy && (!free(cx + dx, cy) || !free(cx, cy + dy))) continue;
        prev[ny * w + nx] = cur; q.push(ny * w + nx);
      }
    }
    if (!hit) return null;
    const path = [];
    for (let c = goal; c !== -1; c = prev[c]) path.push(c);
    path.reverse(); // start..goal
    let best = path[Math.min(1, path.length - 1)];
    for (let i = 1; i < Math.min(path.length, 8); i++) {
      const px = (path[i] % w + 0.5) * T, py = (((path[i] / w) | 0) + 0.5) * T;
      if (this.clearLine(ax, ay, px, py, 3)) best = path[i];
    }
    return { x: (best % w + 0.5) * T, y: (((best / w) | 0) + 0.5) * T };
  },
};
