import Phaser from 'phaser';
import Projectile from './Projectile.js';
import { sfx } from '../audio/sfx.js';
import { norm, dist, facingKind, dir8 } from '../util.js';

// Ragna, a hired archer who follows the player and shoots nearby enemies.
export default class Follower extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'spr_ragna', 'down0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(8, 7).setOffset(4, 9);
    this.shadow = scene.add.image(x, y, 'shadow');
    this.face = { x: 0, y: 1 };
    this.cd = 0.5;
    this.phase = 0;
    this.wp = null; this.pathT = 0;
  }

  update(dt, player) {
    const sc = this.scene, b = this.body;
    this.cd -= dt;
    const d = dist(this.x, this.y, player.x, player.y);
    if (d > 150) { this.setPosition(player.x - 14, player.y); b.setVelocity(0, 0); }
    // target: nearest alerted enemy we can see
    let tgt = null, td = 120;
    for (const e of sc.enemies.getChildren()) {
      if (e.dead || !e.alerted) continue;
      const ed = dist(this.x, this.y, e.x, e.y);
      if (ed < td && sc.hasLOS(this.x, this.y, e.x, e.y)) { td = ed; tgt = e; }
    }
    let vx = 0, vy = 0;
    if (tgt) {
      const to = norm(tgt.x - this.x, tgt.y - this.y);
      this.face = dir8(to.x, to.y);
      if (td < 46) { vx = -to.x * 50; vy = -to.y * 50; }          // keep some distance
      if (this.cd <= 0) {
        this.cd = 1.15;
        const pr = new Projectile(sc, this.x + to.x * 8, this.y + 3 + to.y * 8, 'arrow', to.x * 220, to.y * 220, { dmg: 8, life: 0.9, ally: true });
        sc.shots.add(pr);
        pr.body.setVelocity(to.x * 220, to.y * 220);
        sfx.play('shoot');
      }
    } else if (d > 30) {
      let tx = player.x, ty = player.y;
      if (!sc.clearLine(this.x, this.y, player.x, player.y, 4)) {
        this.pathT -= dt;
        if (this.pathT <= 0 || !this.wp) { this.wp = sc.nextWaypoint(this.x, this.y, player.x, player.y); this.pathT = 0.3; }
        if (this.wp) { tx = this.wp.x; ty = this.wp.y; }
      }
      const n = norm(tx - this.x, ty - this.y);
      const sp = d > 70 ? 86 : 62;
      vx = n.x * sp; vy = n.y * sp;
      this.face = dir8(n.x, n.y);
    }
    b.setVelocity(vx, vy);
    const sp = Math.hypot(vx, vy);
    if (sp > 6) this.phase += sp * dt * 0.16;
    const k = facingKind(this.face.x, this.face.y);
    this.setFrame(k + (sp > 6 ? 1 + (Math.floor(this.phase) % 2) : 0)).setFlipX(k === 'side' && this.face.x < 0);
    this.setDepth(this.y + 8);
    this.shadow.setPosition(this.x, this.y + 7).setDepth(this.y + 6);
  }

  destroy(fromScene) { this.shadow?.destroy(); super.destroy(fromScene); }
}
