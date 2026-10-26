import Phaser from 'phaser';
import Projectile from './Projectile.js';
import { S } from '../systems/state.js';
import { sfx } from '../audio/sfx.js';
import { TUNE } from '../data/tuning.js';
import { norm, dist, facingKind, dir8, walkFrame } from '../util.js';
import { runScript } from '../systems/dialogue.js';
import { SCRIPTS } from '../data/dialogue.js';
import { allyHit, skirmish, steer, goTo, initVitals, tickVitals, goDownCommon, bark } from './companionAI.js';

// A companion who follows the player: Ragna (an archer who shoots nearby enemies) or Pell (a scout who darts in with a knife
// and brings a little extra gold). Talk to them (E) to send them home.
// Ragna keeps a shooting distance beside your line to the foe and holds her fire while you stand in the way; Pell circles
// to a foe's back, darts in, stabs and darts out (companionAI.skirmish). Both can be knocked DOWN for a while.
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
    this.shootT = 0; this.holdT = 0;
    initVitals(this, TUNE.companion[kind === 'pell' ? 'pell' : 'ragna'].hp);
  }
  // you can talk to a companion: dismiss, chat
  get ix() { return this.x; }
  get iy() { return this.y; }
  canInteract() { return this.active && !this.scene.leaving && !this.downed; }
  label() { return `E: TALK TO ${this.kind.toUpperCase()}`; }
  async interact() { await runScript(() => SCRIPTS[this.kind]()); }

  update(dt, player) {
    const sc = this.scene, b = this.body;
    this.cd -= dt; this.shootT -= dt;
    const down = tickVitals(this, dt);
    const d = dist(this.x, this.y, player.x, player.y);
    const mode = S.followMode || 'follow';
    if (!down && d > 150 && mode !== 'wait') { this.setPosition(player.x - 14, player.y); b.setVelocity(0, 0); this.sk = null; }
    // target: nearest alerted enemy we can see
    let tgt = null, td = mode === 'fight' ? 190 : 120;
    if (!down) {
      for (const e of sc.enemies.getChildren()) {
        if (e.dead || !e.alerted || e.hidden) continue;
        const ed = dist(this.x, this.y, e.x, e.y);
        if (ed < td && sc.hasLOS(this.x, this.y, e.x, e.y)) { td = ed; tgt = e; }
      }
      if (tgt && mode === 'wait' && this.kind === 'pell' && td > 40) tgt = null;     // told to wait: only what comes close
    }
    let v = { vx: 0, vy: 0 }, st = null;
    if (down) { /* lying there */ }
    else if (this.hurtT > 0) v = { vx: b.velocity.x * 0.9, vy: b.velocity.y * 0.9 };
    else if (tgt) {
      const to = norm(tgt.x - this.x, tgt.y - this.y);
      this.face = dir8(to.x, to.y);
      if (this.kind === 'pell') {                                  // the scout darts in and stabs, from behind if he can
        const P = TUNE.companion.pell;
        ({ st, ...v } = skirmish(this, dt, tgt, P, (e, dir) => {
          sfx.play('swing_dagger', this);
          const dealt = allyHit(this, e, { dmg: P.dmg, kx: dir.x, ky: dir.y, kb: P.kb, stun: P.stun });
          if (dealt > 0) sfx.play(sfx.hitOn(e), this);
        }, { back: true }));
        if (st === 'circle') this.face = dir8(to.x, to.y);
      } else v = this.archer(dt, tgt, td, to, mode, player);
    } else if (d > 30 && mode !== 'wait') {
      const sp = d > 70 ? 86 : 62;
      v = goTo(this, player.x, player.y, sp, dt, 0);
      if (Math.hypot(v.vx, v.vy) > 6) this.face = dir8(v.vx, v.vy);
    } else v = steer(this, this.x, this.y, 0);                     // standing: still step out of the way
    b.setVelocity(v.vx, v.vy);
    const sp = Math.hypot(v.vx, v.vy);
    if (sp > 6) this.phase += sp * dt * 0.24;
    const k = facingKind(this.face.x, this.face.y);
    let fr = k + (sp > 6 ? walkFrame(this.phase) : 0);
    if (down) fr = this.has('dead0') ? 'dead0' : 'down0';
    else if (this.hurtT > 0 && this.has('hurt0')) fr = 'hurt0';
    else if (this.has('atkdown0')) {
      if (st === 'wind') fr = 'atk' + k + '0';
      else if (st === 'dash') fr = 'atk' + k + '1';
      else if (st === 'back' && this.sk?.t > 0.08) fr = 'atk' + k + '2';
      else if (this.shootT > 0) fr = 'atk' + k + (this.shootT > 0.12 ? '1' : '2');
    }
    this.setFrame(fr).setFlipX(k === 'side' && this.face.x < 0);     // the four-beat walk (VX-17)
    this.setAngle(down && !this.has('dead0') ? 90 : 0);
    this.setDepth(this.y + 8);
    this.shadow.setPosition(this.x, this.y + 7).setDepth(this.y + 6);
  }

  has(frame) { return this.texture.has(frame); }

  // Ragna: stand beside your line to the foe at a shooting distance, back off when it comes close, and never shoot while you
  // are in the line of fire (she steps sideways for a clear shot instead).
  archer(dt, tgt, td, to, mode, player) {
    const sc = this.scene, P = TUNE.companion.ragna;
    const u = norm(tgt.x - player.x, tgt.y - player.y);
    let side = Math.sign((this.x - player.x) * -u.y + (this.y - player.y) * u.x) || 1;      // her side of your line to the foe
    const stand = (s) => ({ x: tgt.x - u.x * P.keep * 0.55 - u.y * s * P.keep * 0.85, y: tgt.y - u.y * P.keep * 0.55 + u.x * s * P.keep * 0.85 });
    let p = stand(side);
    if (sc.solidAt(p.x, p.y) || !sc.hasLOS(p.x, p.y, tgt.x, tgt.y)) { const q = stand(-side); if (!sc.solidAt(q.x, q.y)) { side = -side; p = q; } }
    const blocked = this.inLine(player, tgt);
    let v;
    if (td < P.near) { const away = norm(this.x - tgt.x, this.y - tgt.y); v = steer(this, this.x + away.x * 30, this.y + away.y * 30, P.speed * 0.9, 0); }
    else if (mode === 'wait') {                                    // told to wait: only a sidestep for a clear shot
      v = blocked ? steer(this, this.x - u.y * side * 20, this.y + u.x * side * 20, P.speed * 0.8, 0) : steer(this, this.x, this.y, 0);
    } else v = goTo(this, p.x, p.y, P.speed, dt, 8);
    if (blocked) { this.holdT += dt; if (this.holdT > 0.6) bark(this, 'hold'); return v; }
    this.holdT = 0;
    if (this.cd <= 0 && sc.hasLOS(this.x, this.y, tgt.x, tgt.y)) {
      this.cd = P.cd; this.shootT = 0.22;
      const shoot = () => {
        if (!this.active || this.downed) return;
        const pr = new Projectile(sc, this.x + to.x * 8, this.y + 3 + to.y * 8, 'arrow', to.x * P.arrow, to.y * P.arrow, { dmg: P.dmg, life: 0.9, ally: true, owner: this });
        sc.shots.add(pr);
        pr.body.setVelocity(to.x * P.arrow, to.y * P.arrow);
        sfx.play('shoot', this);
      };
      shoot();
      if (S.flags.ragnaVeteran) sc.time.delayedCall(140, shoot);
    }
    return v;
  }

  // you stand between her and the foe, close enough to the arrow's path to be hit by it
  inLine(player, tgt) {
    const dx = tgt.x - this.x, dy = tgt.y - this.y, l2 = dx * dx + dy * dy || 1;
    const t = ((player.x - this.x) * dx + (player.y - this.y) * dy) / l2;
    if (t <= 0 || t >= 1) return false;
    return Math.hypot(this.x + dx * t - player.x, this.y + dy * t - player.y) < TUNE.companion.ragna.lineClear;
  }

  goDown() { goDownCommon(this); }

  destroy(fromScene) { this.shadow?.destroy(); this.downLabel?.destroy(); super.destroy(fromScene); }
}
