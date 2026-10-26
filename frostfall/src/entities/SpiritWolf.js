import Phaser from 'phaser';
import { sfx } from '../audio/sfx.js';
import { norm } from '../util.js';
import { TUNE } from '../data/tuning.js';
import { allyHit, skirmish, steer, initVitals, tickVitals } from './companionAI.js';

// A spectral wolf summoned by the Spirit Wolf spell: hunts the nearest foe for a while, then fades. It circles its prey,
// crouches, pounces for a bite and springs back out (companionAI.skirmish). Foes can turn on it; at 0 HP it fades early.
export default class SpiritWolf extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, dmg) {
    super(scene, x, y, 'spr_wolf', 'side0');
    scene.add.existing(this); scene.physics.add.existing(this);
    this.kind = 'spirit';
    this.body.setSize(12, 6).setOffset(2, 8);
    this.baseTint = 0x9fe8ff;
    this.setTint(this.baseTint).setAlpha(0.8);
    this.shadow = scene.add.image(x, y, 'shadow').setAlpha(0.5);
    this.life = 14; this.dmg = dmg; this.phase = 0; this.dead = false;
    initVitals(this, TUNE.companion.wolf.hp);
  }

  update(dt, player) {
    if (this.dead) return;
    const sc = this.scene, P = TUNE.companion.wolf;
    this.life -= dt;
    if (this.life <= 0) { this.fade(); return; }
    tickVitals(this, dt);
    let tgt = null, td = 170;
    for (const e of sc.enemies.getChildren()) {
      if (e.dead || e.cfg.passive || e.hidden) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d < td) { td = d; tgt = e; }
    }
    let v = { vx: 0, vy: 0 }, st = null;
    if (this.hurtT > 0) v = { vx: this.body.velocity.x * 0.9, vy: this.body.velocity.y * 0.9 };
    else if (tgt) {
      ({ st, ...v } = skirmish(this, dt, tgt, P, (e, to) => {
        const dealt = allyHit(this, e, { dmg: this.dmg * P.dmgMul, kx: to.x, ky: to.y, kb: P.kb, element: 'frost', slow: 1.5, stun: P.stun, poise: 1.4 });
        sc.fx.puff(e.x, e.y, 15, 5, 40, 0.3); if (dealt > 0) sfx.play(sfx.hitOn(e), this);
      }));
      if (st === 'wind' || st === 'dash') this.setFlipX(tgt.x < this.x);
    } else {
      const d = Math.hypot(player.x - this.x, player.y - this.y);
      if (d > 26) { const n = norm(player.x - this.x, player.y - this.y); v = steer(this, this.x + n.x * 30, this.y + n.y * 30, 90, 0); }
    }
    this.body.setVelocity(v.vx, v.vy);
    if (Math.abs(v.vx) > 4 && st !== 'back' && st !== 'wind') this.setFlipX(v.vx < 0);
    const sp = Math.hypot(v.vx, v.vy);
    this.phase += sp * dt * 0.16;
    // the crouch: the standing frame pressed low and long; the pounce: the stride frame stretched out
    if (st === 'wind') this.setFrame('side0').setScale(1.15, 0.72);
    else if (st === 'dash') this.setFrame('side2').setScale(1.15, 0.9);
    else this.setFrame(this.hurtT > 0 ? 'hurt0' : 'side' + (sp > 6 ? 1 + (Math.floor(this.phase) % 2) : 0)).setScale(1);
    this.setDepth(this.y + 8); this.shadow.setPosition(this.x, this.y + 7).setDepth(this.y + 6);
    if (this.life < 2) this.setAlpha(0.8 * (this.life / 2));
  }

  goDown() { this.fade(); }            // a spirit has no body to lie down: it fades early

  // (a second fade, e.g. a new cast after this wolf had already faded on its own, does nothing)
  fade() {
    if (this.dead || !this.scene) return;
    this.dead = true; this.scene.fx.puff(this.x, this.y, 15, 8, 40, 0.4); this.shadow.destroy();
    for (const e of this.scene.enemies.getChildren()) if (e.foe === this) e.foe = null;
    this.destroy();
  }
}
