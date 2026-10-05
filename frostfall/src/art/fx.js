import { txtS } from './font.js';

// Particles, floating text, slashes, rings: small timed effects for a scene.
export class Fx {
  constructor(scene) {
    this.s = scene;
    this.parts = [];
    this.texts = [];
    this.temp = [];
  }

  puff(x, y, col, n = 6, speed = 40, life = 0.4, grav = 0) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.8);
      const sp = this.s.add.image(x, y, 'p' + col).setDepth(99000);
      this.parts.push({ sp, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: life * (0.6 + Math.random() * 0.6), life, grav });
    }
  }

  trail(x, y, col, life = 0.25) {
    const sp = this.s.add.image(x, y, 'p' + col).setDepth(99000);
    this.parts.push({ sp, vx: 0, vy: -4, t: life, life, grav: 0 });
  }

  text(x, y, str, col = 6, life = 0.8) {
    const t = txtS(this.s, Math.round(x - str.length * 3), Math.round(y), str, col, 0).setDepth(99500);
    this.texts.push({ t, y, t0: life, life });
  }

  slash(x, y, angle, flip = false, scale = 1) {
    const sp = this.s.add.image(x, y, 'slash').setOrigin(0.1, 0.5).setRotation(angle).setDepth(99100).setScale(scale);
    if (flip) sp.setFlipY(true);
    this.temp.push({ sp, t: 0.14, grow: 0 });
  }

  ring(x, y, to = 1.2, life = 0.4, key = 'ring', tint = null) {
    const sp = this.s.add.image(x, y, key).setDepth(99050).setAlpha(0.9).setScale(0.1);
    if (tint != null) sp.setTint(tint);
    this.temp.push({ sp, t: life, life, to, ring: true });
  }

  update(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.t -= dt;
      if (p.t <= 0) { p.sp.destroy(); this.parts.splice(i, 1); continue; }
      p.vy += p.grav * dt;
      p.sp.x += p.vx * dt; p.sp.y += p.vy * dt;
      p.sp.setAlpha(Math.min(1, (p.t / p.life) * 1.6));
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const f = this.texts[i];
      f.life -= dt;
      if (f.life <= 0) { f.t.destroy(); this.texts.splice(i, 1); continue; }
      const k = 1 - f.life / f.t0;
      f.t.setPosition(f.t.x, Math.round(f.y - k * 12));
      f.t.setAlpha(f.life < 0.25 ? f.life / 0.25 : 1);
    }
    for (let i = this.temp.length - 1; i >= 0; i--) {
      const e = this.temp[i];
      e.t -= dt;
      if (e.t <= 0) { e.sp.destroy(); this.temp.splice(i, 1); continue; }
      if (e.ring) {
        const k = 1 - e.t / e.life;
        e.sp.setScale(Math.max(0.1, e.to * (1 - (1 - k) * (1 - k))));
        e.sp.setAlpha(1 - k);
      }
    }
  }

  clear() {
    [...this.parts.map((p) => p.sp), ...this.texts.map((f) => f.t), ...this.temp.map((e) => e.sp)].forEach((o) => o.destroy());
    this.parts.length = this.texts.length = this.temp.length = 0;
  }
}
