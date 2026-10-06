import Phaser from 'phaser';
import { S } from '../systems/state.js';
import { sfx } from '../audio/sfx.js';
import { norm } from '../util.js';

// Your frost hound: follows you everywhere, hunts what hunts you, and cannot be killed (it just gets knocked back).
export default class Hound extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'spr_wolf', 'side0');
    scene.add.existing(this); scene.physics.add.existing(this);
    this.body.setSize(12, 6).setOffset(2, 8);
    this.setTint(0xcfe8ff).setScale(0.85);
    this.shadow = scene.add.image(x, y, 'shadow');
    this.cd = 0; this.phase = 0; this.howl = 0;
  }
  get dmg() { return 6 + Math.floor((S.charLevel || 1) * 0.7); }

  update(dt, player) {
    const sc = this.scene, b = this.body;
    this.cd -= dt;
    const pd = Math.hypot(player.x - this.x, player.y - this.y);
    if (pd > 170) { this.setPosition(player.x - 12, player.y + 4); b.setVelocity(0, 0); }
    let tgt = null, td = 120;
    for (const e of sc.enemies.getChildren()) {
      if (e.dead || e.cfg.passive || !e.alerted || e.hidden) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d < td && Math.hypot(e.x - player.x, e.y - player.y) < 150) { td = d; tgt = e; }
    }
    let vx = 0, vy = 0;
    if (tgt) {
      const n = norm(tgt.x - this.x, tgt.y - this.y);
      vx = n.x * 112; vy = n.y * 112;
      if (td < 17 && this.cd <= 0) {
        this.cd = 0.9;
        const dealt = tgt.takeHit({ dmg: this.dmg, kx: n.x, ky: n.y, kb: 60, src: 'melee', poise: 1.2 });
        sc.fx.text(tgt.x, tgt.y - 10, String(dealt), 6); sc.fx.puff(tgt.x, tgt.y, 6, 4, 36, 0.3); sfx.play('hit');
      }
    } else if (pd > 28) {
      const n = norm(player.x - this.x, player.y - this.y), sp = pd > 80 ? 100 : 66;
      vx = n.x * sp; vy = n.y * sp;
    }
    b.setVelocity(vx, vy);
    const sp = Math.hypot(vx, vy);
    if (Math.abs(vx) > 4) this.setFlipX(vx < 0);
    if (sp > 6) this.phase += sp * dt * 0.16;
    this.setFrame('side' + (sp > 6 ? 1 + (Math.floor(this.phase) % 2) : 0));
    this.setDepth(this.y + 8); this.shadow.setPosition(this.x, this.y + 6).setDepth(this.y + 5);
  }

  destroy(fromScene) { this.shadow?.destroy(); super.destroy(fromScene); }
}
