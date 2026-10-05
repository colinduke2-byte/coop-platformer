import { W, H, C } from '../config.js';

// Cheap falling-snow overlay drawn in screen space with one Graphics object.
export class SnowFx {
  constructor(scene, n = 60, color = 6) {
    this.g = scene.add.graphics().setScrollFactor(0).setDepth(99990);
    this.color = C[color];
    this.f = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H, s: 8 + Math.random() * 14, d: Math.random() < 0.3 ? 2 : 1, w: Math.random() * 6,
    }));
    this.t = 0;
  }
  update(dt, windX = 6) {
    this.t += dt;
    const g = this.g;
    g.clear();
    g.fillStyle(this.color, 0.9);
    for (const f of this.f) {
      f.y += f.s * dt; f.x += (windX + Math.sin(this.t * 1.5 + f.w) * 5) * dt;
      if (f.y > H) { f.y = -2; f.x = Math.random() * W; }
      if (f.x > W) f.x = 0; else if (f.x < 0) f.x = W;
      g.fillRect(Math.floor(f.x), Math.floor(f.y), f.d, f.d);
    }
  }
  destroy() { this.g.destroy(); }
}
