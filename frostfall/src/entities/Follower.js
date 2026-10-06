import Phaser from 'phaser';
import Projectile from './Projectile.js';
import { S } from '../systems/state.js';
import { sfx } from '../audio/sfx.js';
import { norm, dist, facingKind, dir8 } from '../util.js';
import { runScript } from '../systems/dialogue.js';
import { SCRIPTS } from '../data/dialogue.js';

// A companion who follows the player: Ragna (an archer who shoots nearby enemies) or Pell (a scout who darts in with a knife
// and brings a little extra gold). Talk to them (E) to send them home.
export default class Follower extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, kind = 'ragna') {
    super(scene, x, y, kind === 'pell' ? 'spr_pell' : 'spr_ragna', 'down0');
    this.kind = kind;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(8, 7).setOffset(4, 9);
    this.shadow = scene.add.image(x, y, 'shadow');
    this.face = { x: 0, y: 1 };
    this.cd = 0.5;
    this.phase = 0;
    this.wp = null; this.pathT = 0;
  }
  // you can talk to a companion: dismiss, chat
  get ix() { return this.x; }
  get iy() { return this.y; }
  canInteract() { return this.active && !this.scene.leaving; }
  label() { return `E: TALK TO ${this.kind.toUpperCase()}`; }
  async interact() { await runScript(() => SCRIPTS[this.kind]()); }

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
      if (this.kind === 'pell') {                                  // the scout darts in and stabs
        if (td > 16) { vx = to.x * 96; vy = to.y * 96; }
        if (td < 22 && this.cd <= 0) { this.cd = 0.8; tgt.takeHit({ dmg: 9, kx: to.x, ky: to.y, kb: 40, src: 'melee' }); sfx.play('hit'); }
      } else {
      if (td < 46) { vx = -to.x * 50; vy = -to.y * 50; }          // keep some distance
      if (this.cd <= 0) {
        this.cd = 1.15;
        const pr = new Projectile(sc, this.x + to.x * 8, this.y + 3 + to.y * 8, 'arrow', to.x * 220, to.y * 220, { dmg: 8, life: 0.9, ally: true });
        sc.shots.add(pr);
        pr.body.setVelocity(to.x * 220, to.y * 220);
        sfx.play('shoot');
        if (S.flags.ragnaVeteran) sc.time.delayedCall(140, () => { if (!this.active) return; const p2 = new Projectile(sc, this.x + to.x * 8, this.y + 3 + to.y * 8, 'arrow', to.x * 220, to.y * 220, { dmg: 8, life: 0.9, ally: true }); sc.shots.add(p2); p2.body.setVelocity(to.x * 220, to.y * 220); });
      }
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
