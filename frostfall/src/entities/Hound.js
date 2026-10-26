import Phaser from 'phaser';
import { S } from '../systems/state.js';
import { sfx } from '../audio/sfx.js';
import { norm } from '../util.js';
import { TUNE } from '../data/tuning.js';
import { allyHit, skirmish, steer, initVitals, tickVitals, goDownCommon } from './companionAI.js';

// Your frost hound (or bear cub): follows you everywhere and hunts what hunts you. It circles a foe, crouches, darts in for a
// bite and springs back out (companionAI.skirmish). Foes can turn on it: at 0 HP it is down for a while, then gets back up.
export default class Hound extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, kind = 'hound') {
    super(scene, x, y, kind === 'cub' ? 'spr_bear' : 'spr_wolf', 'side0');
    this.kind = kind;
    scene.add.existing(this); scene.physics.add.existing(this);
    this.body.setSize(12, 6).setOffset(2, 8);
    this.baseScale = kind === 'cub' ? 0.7 : 0.85;
    if (kind !== 'cub') this.baseTint = 0xcfe8ff;
    this.setScale(this.baseScale); if (this.baseTint) this.setTint(this.baseTint);
    this.shadow = scene.add.image(x, y, 'shadow');
    this.phase = 0; this.howl = 0;
    initVitals(this, TUNE.companion.hound.hp);
  }
  get dmg() { return this.kind === 'cub' ? 3 + Math.floor((S.charLevel || 1) * 0.5) : 6 + Math.floor((S.charLevel || 1) * 0.7); }

  update(dt, player) {
    const sc = this.scene, b = this.body, P = TUNE.companion.hound;
    if (this.kind === 'cub' && S.hp < S.maxHp && S.hp > 0 && !this.downed) S.hp = Math.min(S.maxHp, S.hp + 0.8 * dt);      // a cub's company soothes wounds
    const pd = Math.hypot(player.x - this.x, player.y - this.y);
    const down = tickVitals(this, dt);
    if (!down && pd > 170) { this.setPosition(player.x - 12, player.y + 4); b.setVelocity(0, 0); }
    let tgt = null, td = 120;
    if (!down) {
      for (const e of sc.enemies.getChildren()) {
        if (e.dead || e.cfg.passive || !e.alerted || e.hidden) continue;
        const d = Math.hypot(e.x - this.x, e.y - this.y);
        if (d < td && Math.hypot(e.x - player.x, e.y - player.y) < 150) { td = d; tgt = e; }
      }
    }
    let v = { vx: 0, vy: 0 }, st = null;
    if (down) { /* lying there */ }
    else if (this.hurtT > 0) v = { vx: b.velocity.x * 0.9, vy: b.velocity.y * 0.9 };
    else if (tgt) {
      ({ st, ...v } = skirmish(this, dt, tgt, P, (e, to) => {
        const dealt = allyHit(this, e, { dmg: this.dmg, kx: to.x, ky: to.y, kb: P.kb, stun: P.stun, poise: 1.2 });
        sc.fx.puff(e.x, e.y, 6, 4, 36, 0.3); if (dealt > 0) sfx.play(sfx.hitOn(e), this);
      }));
      if (st === 'wind' || st === 'dash') this.setFlipX(tgt.x < this.x);
    } else if (pd > 28) {
      const n = norm(player.x - this.x, player.y - this.y), sp = pd > 80 ? 100 : 66;
      v = steer(this, this.x + n.x * 30, this.y + n.y * 30, sp, 0);
    }
    b.setVelocity(v.vx, v.vy);
    const sp = Math.hypot(v.vx, v.vy);
    if (Math.abs(v.vx) > 4 && st !== 'back' && st !== 'wind' && !down) this.setFlipX(v.vx < 0);
    if (sp > 6) this.phase += sp * dt * 0.16;
    const s = this.baseScale;
    if (down) this.setFrame('death0').setScale(s);
    else if (st === 'wind') this.setFrame('side0').setScale(s * 1.15, s * 0.72);       // the crouch
    else if (st === 'dash') this.setFrame('side2').setScale(s * 1.15, s * 0.9);        // the pounce
    else this.setFrame(this.hurtT > 0 ? 'hurt0' : 'side' + (sp > 6 ? 1 + (Math.floor(this.phase) % 2) : 0)).setScale(s);
    this.setDepth(this.y + 8); this.shadow.setPosition(this.x, this.y + 6).setDepth(this.y + 5);
  }

  goDown() { goDownCommon(this); this.setAlpha(0.85); }

  destroy(fromScene) { this.shadow?.destroy(); this.downLabel?.destroy(); super.destroy(fromScene); }
}
