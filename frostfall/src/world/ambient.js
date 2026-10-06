// Ambient life and atmosphere (mixed into GameScene): ravens that scatter, frost motes at night, footprints in the snow,
// the aurora ribbons, and the wind that bends arrows in a storm.
import { W, H, C, TILE } from '../config.js';
import { S } from '../systems/state.js';
import { sfx } from '../audio/sfx.js';

const SNOWY = new Set([TILE.SNOW, TILE.SNOW2, TILE.SNOW3, TILE.SNOW4, TILE.TUFT]);
const WIND = { blizzard: 14, whiteout: 42 };

export const ambientMethods = {
  initAmbient() {
    this.ravens = []; this.raventT = 4 + Math.random() * 6;
    this.prints = []; this.printT = 0; this.printSide = 1;
    this.motes = Array.from({ length: 16 }, () => ({ x: Math.random() * W, y: Math.random() * H, p: Math.random() * 6, s: 3 + Math.random() * 5 }));
    this.moteG = this.add.graphics().setScrollFactor(0).setDepth(99700);
    this.auroraG = this.add.graphics().setScrollFactor(0).setDepth(99780);
    this.auroraT = 0;
  },

  // Sideways push on arrows and bolts: none in clear weather, strong in a whiteout.
  windX() { return this.def.snow ? (WIND[S.weather] || 0) : 0; },

  ambientLife(dt) {
    if (!this.def.snow || !this.ravens) { this.auroraG?.clear(); this.moteG?.clear(); return; }
    const p = this.player;
    // ---- ravens: perch near you by day, scatter when you come close
    this.raventT -= dt;
    if (this.raventT <= 0) {
      this.raventT = 8 + Math.random() * 10;
      if (this.ravens.length < 3 && this.nightness() < 0.3 && S.weather !== 'whiteout') {
        const a = Math.random() * Math.PI * 2, d = 130 + Math.random() * 90, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
        if (!this.solidAt(x, y) && !this.solidAt(x, y + 6)) {
          const n = 1 + Math.floor(Math.random() * 3);
          for (let i = 0; i < n; i++) this.ravens.push({ img: this.add.image(x + i * 7, y + (i % 2) * 3, 'raven0').setDepth(y + 4), fly: false, t: 0 });
        }
      }
    }
    for (let i = this.ravens.length - 1; i >= 0; i--) {
      const r = this.ravens[i], img = r.img;
      const d = Math.hypot(img.x - p.x, img.y - p.y);
      if (!r.fly && (d < 56 || (p.mode === 'roll' && d < 80))) { r.fly = true; r.vx = (img.x - p.x) / (d || 1) * 60 + (Math.random() - 0.5) * 20; r.vy = -38; sfx.play('caw'); }
      if (r.fly) {
        r.t += dt; img.x += r.vx * dt; img.y += r.vy * dt; img.setTexture(Math.floor(r.t * 9) % 2 ? 'raven1' : 'raven0').setFlipX(r.vx < 0).setDepth(img.y + 30);
        img.setAlpha(Math.max(0, 1 - r.t / 1.8));
        if (r.t > 1.8) { img.destroy(); this.ravens.splice(i, 1); }
      } else if (d > 420) { img.destroy(); this.ravens.splice(i, 1); }
    }
    // ---- frost motes drifting in the dark
    const g = this.moteG; g.clear();
    if (this.nightness() > 0.45 && S.weather !== 'blizzard' && S.weather !== 'whiteout') {
      for (const m of this.motes) {
        m.p += dt; m.x += Math.sin(m.p * 0.7) * m.s * dt; m.y += Math.cos(m.p * 0.5) * m.s * 0.6 * dt - 1.2 * dt;
        if (m.y < -3) { m.y = H + 2; m.x = Math.random() * W; }
        if (m.x < 0) m.x = W; else if (m.x > W) m.x = 0;
        g.fillStyle(m.p % 2 > 1 ? C[15] : C[13], 0.35 + 0.35 * Math.sin(m.p * 2.2));
        g.fillRect(Math.floor(m.x), Math.floor(m.y), 1, 1);
      }
    }
    // ---- footprints in the snow
    this.printT -= dt;
    if (this.printT <= 0 && p.speedNow > 12 && p.mode === 'free') {
      this.printT = 0.2;
      if (SNOWY.has(this.tileIdAt(p.x, p.y + 7))) {
        this.printSide = -this.printSide;
        const img = this.prints.length >= 40 ? this.prints.shift().img : this.add.image(0, 0, 'foot');
        img.setPosition(p.x - p.face.y * this.printSide * 2.5, p.y + 8 + p.face.x * this.printSide * 1.5).setAlpha(0.42).setDepth(p.y - 6).setAngle(Math.atan2(p.face.y, p.face.x) * 57.3 + 90).setVisible(true);
        this.prints.push({ img, t: 0 });
      }
    }
    for (let i = this.prints.length - 1; i >= 0; i--) {
      const q = this.prints[i]; q.t += dt;
      q.img.setAlpha(Math.max(0, 0.42 - q.t * (S.weather === 'whiteout' ? 0.14 : S.weather === 'blizzard' ? 0.08 : 0.05)));
      if (q.img.alpha <= 0) { q.img.destroy(); this.prints.splice(i, 1); }
    }
    this.drawAurora(dt);
  },

  // Slow green and violet ribbons across the night sky.
  drawAurora(dt) {
    const g = this.auroraG; g.clear();
    if (S.weather !== 'aurora') return;
    this.auroraT += dt;
    const t = this.auroraT, bands = [[8, 0.2, 22], [14, 0.14, 26], [15, 0.12, 18]];
    bands.forEach(([col, a, hgt], i) => {
      const base = 14 + i * 12;
      for (let x = 0; x < W; x += 4) {
        const y = base + Math.sin(x * 0.03 + t * (0.5 + i * 0.2) + i * 2) * 9 + Math.sin(x * 0.07 - t * 0.8) * 3;
        g.fillStyle(C[col], a * (0.6 + 0.4 * Math.sin(x * 0.05 + t + i)));
        g.fillRect(x, y, 4, hgt);
        g.fillStyle(C[col], a * 0.5); g.fillRect(x, y + hgt, 4, 8);
      }
    });
  },

  // A wisp pack drifts in when the aurora begins.
  auroraWisps() {
    if (!this.def.stream) return;
    for (let i = 0; i < 3; i++) {
      const spot = this.freeSpotNear(90, 150); if (!spot) continue;
      const e = this.addEnemy('wisp', spot.x, spot.y, { tier: Math.min(3, Math.floor((spot.y / 16) / 40)), elite: true });
      e.alert(true);
    }
  },
};
