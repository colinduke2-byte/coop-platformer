import Phaser from 'phaser';
import { bonus } from '../systems/skills.js';
import { sfx } from '../audio/sfx.js';
import { TUNE } from '../data/tuning.js';
import { norm, dir8 } from '../util.js';

// A spectral wolf summoned by the Spirit Wolf spell: hunts the nearest foe for a while, then fades.
export default class SpiritWolf extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, dmg) {
    super(scene, x, y, 'spr_wolf', 'side0');
    scene.add.existing(this); scene.physics.add.existing(this);
    this.body.setSize(12, 6).setOffset(2, 8);
    this.setTint(0x9fe8ff).setAlpha(0.8);
    this.shadow = scene.add.image(x, y, 'shadow').setAlpha(0.5);
    this.life = 14; this.cd = 0; this.dmg = dmg; this.phase = 0; this.dead = false;
  }

  update(dt, player) {
    if (this.dead) return;
    const sc = this.scene, b = this.body;
    this.life -= dt; this.cd -= dt;
    if (this.life <= 0) { this.fade(); return; }
    let tgt = null, td = 170;
    for (const e of sc.enemies.getChildren()) {
      if (e.dead || e.cfg.passive) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d < td) { td = d; tgt = e; }
    }
    let vx = 0, vy = 0;
    if (tgt) {
      const n = norm(tgt.x - this.x, tgt.y - this.y);
      vx = n.x * 118; vy = n.y * 118;
      if (td < 16 && this.cd <= 0) {
        this.cd = 0.55;
        const dealt = tgt.takeHit({ dmg: this.dmg, kx: n.x, ky: n.y, kb: 90, src: 'melee', element: 'frost', slow: 1.5, stun: 0.2, poise: 1.4 });
        sc.fx.text(tgt.x, tgt.y - 10, String(dealt), 15); sc.fx.puff(tgt.x, tgt.y, 15, 5, 40, 0.3); sfx.play('hit');
      }
    } else {
      const d = Math.hypot(player.x - this.x, player.y - this.y);
      if (d > 26) { const n = norm(player.x - this.x, player.y - this.y); vx = n.x * 90; vy = n.y * 90; }
    }
    b.setVelocity(vx, vy);
    if (Math.abs(vx) > 4) this.setFlipX(vx < 0);
    this.phase += Math.hypot(vx, vy) * dt * 0.16;
    this.setFrame('side' + (Math.hypot(vx, vy) > 6 ? 1 + (Math.floor(this.phase) % 2) : 0));
    this.setDepth(this.y + 8); this.shadow.setPosition(this.x, this.y + 7).setDepth(this.y + 6);
    if (this.life < 2) this.setAlpha(0.8 * (this.life / 2));
  }

  fade() { this.dead = true; this.scene.fx.puff(this.x, this.y, 15, 8, 40, 0.4); this.shadow.destroy(); this.destroy(); }
}
