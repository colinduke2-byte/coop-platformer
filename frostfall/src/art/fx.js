import { settings } from '../systems/settings.js';
import { txtS, fontKey } from './font.js';
import { C } from '../config.js';
import { TUNE } from '../data/tuning.js';

// Particles, floating text, slashes, rings: small timed effects for a scene.
export class Fx {
  constructor(scene) {
    this.s = scene;
    this.parts = [];
    this.texts = [];
    this.temp = [];
    this.pool = [];
    this.textPool = [];          // floating texts, slashes, rings and bolts are recycled too (crowd fights made hundreds)
    this.imgPool = {};
    this.gfxPool = [];
  }
  // a floating text from the pool
  getText(x, y, str, col) {
    const o = this.textPool.pop();
    if (!o) return txtS(this.s, x, y, str, col, 0).setDepth(99500);
    o.main.setFont(fontKey(col)); o.setText(str).setPosition(x, y).setAlpha(1);
    o.main.setVisible(true); o.shadow.setVisible(true);
    return o;
  }
  freeText(o) { o.main.setVisible(false); o.shadow.setVisible(false); this.textPool.push(o); }
  getImg(key, x, y, depth) {
    const l = this.imgPool[key];
    const sp = l && l.pop();
    if (!sp) return this.s.add.image(x, y, key).setDepth(depth);
    return sp.setPosition(x, y).setVisible(true).setActive(true).setAlpha(1).setScale(1).setRotation(0).setFlip(false, false).clearTint().setOrigin(0.5).setDepth(depth);
  }
  freeImg(sp) { sp.setVisible(false).setActive(false); (this.imgPool[sp.texture.key] ||= []).push(sp); }

  acquire(col, x, y) {
    const sp = this.pool.pop();
    if (!sp) return this.s.add.image(x, y, 'p' + col).setDepth(99000);
    return sp.setTexture('p' + col).setPosition(x, y).setVisible(true).setActive(true).setAlpha(1);
  }

  release(sp) { sp.setVisible(false).setActive(false); this.pool.push(sp); }

  puff(x, y, col, n = 6, speed = 40, life = 0.4, grav = 0) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.8);
      const sp = this.acquire(col, x, y);
      this.parts.push({ sp, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: life * (0.6 + Math.random() * 0.6), life, grav });
    }
  }

  // Hit sparks: a short fan of bright streaks thrown out along the blow's direction (kx, ky).
  spark(x, y, kx, ky, big = false, col = 13) {
    const l = Math.hypot(kx, ky) || 1, bx = kx / l, by = ky / l, n = big ? 9 : 5;
    for (let i = 0; i < n; i++) {
      const a = Math.atan2(by, bx) + (Math.random() - 0.5) * 1.6, v = (big ? 130 : 95) * (0.5 + Math.random() * 0.7);
      const sp = this.acquire(i % 3 === 0 ? 15 : col, x, y);
      this.parts.push({ sp, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0.14 + Math.random() * 0.1, life: 0.2, grav: 0 });
    }
  }

  trail(x, y, col, life = 0.25) {
    const sp = this.acquire(col, x, y);
    this.parts.push({ sp, vx: 0, vy: -4, t: life, life, grav: 0 });
  }

  text(x, y, str, col = 6, life = 0.8) {
    str = String(str);
    const isNum = /^\d+$/.test(str);
    if (settings.dmgNumbers === false && isNum) return;       // option: hide damage numbers
    // damage numbers pile up in crowd fights: merge close ones into a running total and fade sooner
    if (isNum && life === 0.8) {
      const near = this.texts.find((o) => o.num != null && o.col === col && o.life > o.t0 * 0.35 && Math.abs(o.x - x) < 14 && Math.abs(o.y - y) < 14);
      if (near) {
        near.num += Number(str); near.life = near.t0; near.t.setText(String(near.num)).setPosition(Math.round(near.x - String(near.num).length * 3), Math.round(near.y));
        return;
      }
      if (this.texts.length > 9) { const old = this.texts.shift(); this.freeText(old.t); }
      if (this.texts.length > 4) life = 0.55;
    }
    // VX-05: a word (WEAK, RESIST, ARMORED...) already floating over the same foe is refreshed, not stacked; and a crowd
    // fight never shows more than TUNE.hud.maxTexts floating texts in all
    if (!isNum) {
      const same = this.texts.find((o) => o.str === str && o.life > 0 && Math.abs(o.x - x) < 14 && Math.abs(o.y - y) < 14);
      if (same) { same.life = same.t0; return; }
    }
    if (this.texts.length >= TUNE.hud.maxTexts) { const old = this.texts.shift(); this.freeText(old.t); }
    const t = this.getText(Math.round(x - str.length * 3), Math.round(y), str, col);
    this.texts.push({ t, y, x, y0: y, t0: life, life, col, str, num: isNum ? Number(str) : null });
  }

  slash(x, y, angle, flip = false, scale = 1) {
    const sp = this.getImg('slash', x, y, 99100).setOrigin(0.1, 0.5).setRotation(angle).setScale(scale);
    if (flip) sp.setFlipY(true);
    this.temp.push({ sp, t: 0.14, grow: 0 });
  }

  // Jagged lightning through a list of points.
  bolt(pts, col = 13) {
    const g = this.gfxPool.pop()?.setVisible(true) || this.s.add.graphics().setDepth(99200);
    g.clear();
    const draw = (c, w) => {
      g.lineStyle(w, C[c], 1); g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], n = Math.max(2, Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 8));
        for (let k = 1; k <= n; k++) {
          const t = k / n, jx = k === n ? 0 : (Math.random() - 0.5) * 7, jy = k === n ? 0 : (Math.random() - 0.5) * 7;
          g.lineTo(Math.round(a.x + (b.x - a.x) * t + jx), Math.round(a.y + (b.y - a.y) * t + jy));
        }
      }
      g.strokePath();
    };
    draw(col, 3); draw(6, 1);
    this.s.time.delayedCall(130, () => { if (g.scene) { g.clear(); g.setVisible(false); this.gfxPool.push(g); } });
  }

  ring(x, y, to = 1.2, life = 0.4, key = 'ring', tint = null) {
    const sp = this.getImg(key, x, y, 99050).setAlpha(0.9).setScale(0.1);
    if (tint != null) sp.setTint(tint);
    this.temp.push({ sp, t: life, life, to, ring: true });
  }

  update(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.t -= dt;
      if (p.t <= 0) { this.release(p.sp); this.parts.splice(i, 1); continue; }
      p.vy += p.grav * dt;
      p.sp.x += p.vx * dt; p.sp.y += p.vy * dt;
      p.sp.setAlpha(Math.min(1, (p.t / p.life) * 1.6));
    }
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const f = this.texts[i];
      f.life -= dt;
      if (f.life <= 0) { this.freeText(f.t); this.texts.splice(i, 1); continue; }
      const k = 1 - f.life / f.t0;
      f.t.setPosition(f.t.x, Math.round(f.y - k * 12));
      f.t.setAlpha(f.life < 0.25 ? f.life / 0.25 : 1);
    }
    for (let i = this.temp.length - 1; i >= 0; i--) {
      const e = this.temp[i];
      e.t -= dt;
      if (e.t <= 0) { if (e.pooled === false) e.sp.destroy(); else this.freeImg(e.sp); this.temp.splice(i, 1); continue; }
      if (e.ring) {
        const k = 1 - e.t / e.life;
        e.sp.setScale(Math.max(0.1, e.to * (1 - (1 - k) * (1 - k))));
        e.sp.setAlpha(1 - k);
      }
    }
  }

  clear() {
    [...this.parts.map((p) => p.sp), ...this.pool, ...this.texts.map((f) => f.t), ...this.temp.map((e) => e.sp), ...this.textPool, ...Object.values(this.imgPool).flat(), ...this.gfxPool].forEach((o) => o.destroy?.());
    this.parts.length = this.texts.length = this.temp.length = this.pool.length = this.textPool.length = this.gfxPool.length = 0;
    this.imgPool = {};
  }
}
