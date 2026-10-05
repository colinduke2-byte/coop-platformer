import Phaser from 'phaser';
import { ENEMIES } from '../data/enemies.js';
import { C } from '../config.js';
import { dist, norm, rand, facingKind, dir8 } from '../util.js';
import { txtS } from '../art/font.js';
import { sfx } from '../audio/sfx.js';
import { bus } from '../systems/bus.js';
import Projectile from './Projectile.js';
import { TUNE } from '../data/tuning.js';
import { settings } from '../systems/settings.js';

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, kind) {
    const cfg = ENEMIES[kind];
    super(scene, x, y, cfg.tex, 'down0');
    this.kind = kind;
    this.cfg = cfg;
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const [bw, bh, ox, oy] = cfg.body;
    this.body.setSize(bw, bh).setOffset(ox, oy);
    this.shadow = scene.add.image(x, y, 'shadow');
    this.maxHp = Math.round(cfg.hp * TUNE.difficulty[settings.difficulty].enemyHp);
    this.hp = this.maxHp;
    this.home = { x, y };
    this.alerted = false;
    this.notice = 0;
    this.state = 'idle';
    this.stateT = 0;
    this.cd = rand(0.2, 0.8);
    this.stun = 0;
    this.slowT = 0;
    this.flashT = 0;
    this.wander = { t: rand(0.2, 1.5), dx: 0, dy: 0 };
    this.face = { x: 0, y: 1 };
    this.phase = Math.random() * 4;
    this.dead = false;
    this.lostT = 0;
    this.marker = null;
    this.markT = 0;
    this.hitDone = false;
    this.dashDir = { x: 0, y: 1 };
    this.blink = 0;
    this.pathT = 0;
    this.wp = null;
  }

  get rect() { const b = this.body; return new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height); }
  get cx() { return this.body.center.x; }
  get cy() { return this.body.center.y; }

  mark(str, col, dur) {
    this.marker?.destroy();
    this.markStr = str;
    this.marker = txtS(this.scene, 0, 0, str, col, 0);
    this.markT = dur;
  }

  alert(silent = false) {
    if (this.alerted || this.dead) return;
    this.alerted = true;
    this.state = 'chase';
    if (!silent) { this.mark('!', 13, 0.7); sfx.play('alert'); }
    // wake nearby friends
    for (const o of this.scene.enemies.getChildren()) {
      if (o !== this && !o.alerted && !o.dead && dist(o.x, o.y, this.x, this.y) < 60) o.alert(true);
    }
  }

  setState(s, t = 0) { this.state = s; this.stateT = t; }

  update(dt, player) {
    if (this.dead) return;
    const b = this.body;
    const sc = this.scene;
    this.cd -= dt;
    this.flashT -= dt;
    this.slowT -= dt;
    if (this.markT > 0) {
      this.markT -= dt;
      if (this.markT <= 0) { this.marker?.destroy(); this.marker = null; }
    }
    const slow = this.slowT > 0 ? 0.5 : 1;

    // ---- stun / knockback: velocity decays, no AI
    if (this.stun > 0) {
      this.stun -= dt;
      b.velocity.scale(Math.pow(0.02, dt));
      this.finish(dt, slow);
      return;
    }

    const d = dist(this.x, this.y, player.x, player.y);
    const dead = player.mode === 'dead';

    // ---- awareness
    if (!this.alerted) {
      const range = this.cfg.detect * player.detectMult();
      const seen = !dead && d < range && sc.hasLOS(this.cx, this.cy, player.body.center.x, player.body.center.y);
      this.notice = seen ? this.notice + dt : Math.max(0, this.notice - dt * 0.7);
      if (this.notice > (d < range * 0.5 ? 0.12 : 0.4)) this.alert();
      else if (this.notice > 0.06) {
        if (!this.marker || this.markStr !== '?') this.mark('?', 13, 0.25); else this.markT = 0.25;
      }
    } else if (dead || d > this.cfg.detect * 2.6) {
      this.lostT += dt;
      if (this.lostT > 4) { this.alerted = false; this.notice = 0; this.lostT = 0; this.setState('idle'); }
    } else this.lostT = 0;

    if (!this.alerted) this.doIdle(dt, slow);
    else this.doCombat(dt, player, d, slow);
    this.finish(dt, slow);
  }

  doIdle(dt, slow) {
    const w = this.wander, b = this.body;
    w.t -= dt;
    if (w.t <= 0) {
      if (Math.random() < 0.45) { w.dx = 0; w.dy = 0; }
      else { const a = Math.random() * Math.PI * 2; w.dx = Math.cos(a); w.dy = Math.sin(a); }
      // drift home if far
      if (dist(this.x, this.y, this.home.x, this.home.y) > 42) { const n = norm(this.home.x - this.x, this.home.y - this.y); w.dx = n.x; w.dy = n.y; }
      w.t = rand(0.8, 2.4);
    }
    const sp = this.cfg.speed * 0.55 * slow;
    b.setVelocity(w.dx * sp, w.dy * sp);
    if (w.dx || w.dy) this.face = dir8(w.dx, w.dy);
  }

  doCombat(dt, player, d, slow) {
    const cfg = this.cfg, b = this.body, sc = this.scene;
    this.stateT -= dt;
    const to = norm(player.x - this.x, player.y - this.y);
    switch (this.state) {
      case 'idle':
      case 'chase': {
        this.face = dir8(to.x, to.y);
        if (cfg.kind === 'shoot') { this.archerMove(dt, player, d, to, slow); break; }
        if (this.cd <= 0 && d <= cfg.range && this.canAttack(player, d)) { this.startWindup(to); break; }
        // approach: straight if the way is clear, else follow the tile path
        let tx = player.x, ty = player.y;
        if (!sc.clearLine(this.cx, this.cy, player.body.center.x, player.body.center.y)) {
          this.pathT -= dt;
          if (this.pathT <= 0 || !this.wp) { this.wp = sc.nextWaypoint(this.cx, this.cy, player.body.center.x, player.body.center.y); this.pathT = 0.25; }
          if (this.wp) { tx = this.wp.x; ty = this.wp.y; }
        } else this.wp = null;
        const n = norm(tx - this.cx, ty - this.cy);
        const sp = cfg.chase * slow;
        b.setVelocity(n.x * sp, n.y * sp);
        break;
      }
      case 'windup': {
        b.setVelocity(0, 0);
        this.blink -= dt;
        if (this.blink <= 0) { this.blink = 0.07; this.blinkOn = !this.blinkOn; }
        if (this.stateT <= 0) this.startAttack(player, to);
        break;
      }
      case 'attack': {
        this.attackTick(dt, player);
        if (this.stateT <= 0) { this.setState('recover', cfg.recover); b.setVelocity(0, 0); this.cd = cfg.cooldown; }
        break;
      }
      case 'recover': {
        b.setVelocity(0, 0);
        if (this.stateT <= 0) this.setState('chase');
        break;
      }
    }
  }

  canAttack() { return true; }

  archerMove(dt, player, d, to, slow) {
    const cfg = this.cfg, b = this.body, sc = this.scene;
    const clear = sc.clearLine(this.cx, this.cy, player.body.center.x, player.body.center.y, 3);
    if (d < cfg.keep && clear) { // back away
      b.setVelocity(-to.x * cfg.chase * 0.9 * slow, -to.y * cfg.chase * 0.9 * slow);
      if (b.blocked.none === false) b.setVelocity(-to.y * cfg.chase * 0.6, to.x * cfg.chase * 0.6);
      if (this.cd <= 0 && d > 30) this.startWindup(to);
    } else if (d <= cfg.range && clear) {
      b.setVelocity(0, 0);
      if (this.cd <= 0) this.startWindup(to);
    } else {
      let tx = player.x, ty = player.y;
      this.pathT -= dt;
      if (!clear) {
        if (this.pathT <= 0 || !this.wp) { this.wp = sc.nextWaypoint(this.cx, this.cy, player.body.center.x, player.body.center.y); this.pathT = 0.25; }
        if (this.wp) { tx = this.wp.x; ty = this.wp.y; }
      }
      const n = norm(tx - this.cx, ty - this.cy);
      b.setVelocity(n.x * cfg.chase * slow, n.y * cfg.chase * slow);
    }
  }

  startWindup(to) {
    this.setState('windup', this.cfg.windup);
    this.face = dir8(to.x, to.y);
    this.dashDir = to;
    this.hitDone = false;
    this.blinkOn = true; this.blink = 0.07;
    this.mark('!', 11, this.cfg.windup + 0.1);
    sfx.play('telegraph');
  }

  startAttack(player, to) {
    this.setState('attack', this.cfg.atkDur);
    this.marker?.destroy(); this.marker = null;
    this.hitDone = false;
    this.attackStart(player, to);
  }

  attackStart(player, to) {
    const cfg = this.cfg;
    if (cfg.kind === 'shoot') {
      const f = this.dashDir;
      const spd = cfg.projSpeed || 125;
      const pr = new Projectile(this.scene, this.x + f.x * 8, this.y + 3 + f.y * 8, cfg.proj || 'bolt', f.x * spd, f.y * spd, { dmg: cfg.dmg, life: 2.2 });
      this.scene.eshots.add(pr);
      pr.body.setVelocity(f.x * spd, f.y * spd);
      this.body.setVelocity(0, 0);
      sfx.play('shoot');
      return;
    }
    if (cfg.kind === 'lunge') {
      this.body.setVelocity(this.dashDir.x * cfg.lunge, this.dashDir.y * cfg.lunge);
      this.face = dir8(this.dashDir.x, this.dashDir.y);
      sfx.play('roll');
      return;
    }
    // melee lunge forward a hair
    this.body.setVelocity(to.x * 90, to.y * 90);
    this.face = dir8(to.x, to.y);
    this.scene.fx.slash(this.x + this.face.x * 6, this.y + this.face.y * 6, Math.atan2(this.face.y, this.face.x));
    sfx.play('sword');
  }

  attackTick(dt, player) {
    if (this.hitDone || this.cfg.kind === 'shoot') return;
    let r = this.hitRect();
    if (this.cfg.kind === 'lunge') { const b = this.body; r = new Phaser.Geom.Rectangle(b.x - 3, b.y - 3, b.width + 6, b.height + 6); }
    if (Phaser.Geom.Intersects.RectangleToRectangle(r, player.hurtRect)) {
      this.hitDone = true;
      player.hurt(this.cfg.dmg, this.x, this.y);
    }
  }

  hitRect() {
    const f = this.face;
    const cx = this.x + f.x * 12, cy = this.y + 3 + f.y * 10;
    return new Phaser.Geom.Rectangle(cx - 9, cy - 9, 18, 18);
  }

  // Called after AI: sprite frame, depth, shadow, tint, marker.
  finish(dt, slow) {
    const b = this.body;
    const sp = Math.hypot(b.velocity.x, b.velocity.y);
    if (sp > 6) this.phase += sp * dt * 0.16;
    const fr = sp > 6 ? 1 + (Math.floor(this.phase) % 2) : 0;
    if (this.cfg.tex === 'spr_wolf') {
      this.setFrame('side' + fr);
      this.setFlipX(this.face.x < 0 || (this.face.x === 0 && this.flipX));
    } else {
      const k = facingKind(this.face.x, this.face.y);
      this.setFrame(k + fr);
      this.setFlipX(k === 'side' && this.face.x < 0);
    }
    if (this.flashT > 0) this.setTintFill(0xffffff);
    else if (this.state === 'windup' && this.blinkOn) this.setTint(0xff8080);
    else if (this.slowT > 0) this.setTint(0x8fe0f0);
    else this.clearTint();
    this.setDepth(this.y + 8);
    this.shadow.setPosition(this.x, this.y + 7).setDepth(this.y + 6);
    if (this.marker) this.marker.setPosition(Math.round(this.x - 2), Math.round(this.y - 18 - (this.scaleX > 1 ? 10 : 0))).setDepth(99300);
  }

  // info: { dmg, kx, ky, kb, src, stun, slow, sneak }  -> returns damage dealt
  takeHit(info) {
    if (this.dead) return 0;
    let dmg = Math.max(1, Math.round(info.dmg));
    this.hp -= dmg;
    this.flashT = 0.1;
    if (!this.alerted) this.alert(true);
    if (info.slow) this.slowT = Math.max(this.slowT, info.slow);
    const resist = this.cfg.kbResist ?? 0;
    if (info.kb && !this.noKnock) {
      const n = norm(info.kx, info.ky);
      this.body.setVelocity(n.x * info.kb * (1 - resist), n.y * info.kb * (1 - resist));
    }
    if (!this.superArmor || info.forceStun) {
      this.stun = Math.max(this.stun, info.stun ?? 0.22);
      if (this.state === 'windup') { this.setState('chase'); this.marker?.destroy(); this.marker = null; this.cd = 0.3; }
    }
    this.scene.fx.puff(this.x, this.y, 11, 4, 40, 0.3);
    if (this.hp <= 0) this.die(info);
    return dmg;
  }

  die(info) {
    this.dead = true;
    this.marker?.destroy(); this.marker = null;
    this.body.enable = false;
    this.scene.enemies.remove(this);
    sfx.play('kill');
    this.scene.fx.puff(this.x, this.y, 5, 10, 55, 0.5);
    this.scene.fx.puff(this.x, this.y, 4, 6, 40, 0.5);
    this.clearTint();
    this.setTintFill(0xb4c7e0);
    this.shadow.destroy();
    this.scene.tweens.add({
      targets: this, alpha: 0, angle: this.flipX ? -90 : 90, y: this.y + 3, duration: 450,
      onComplete: () => this.destroy(),
    });
    this.scene.onEnemyKilled(this, info);
    bus.emit('enemy:killed', this.kind, this);
  }
}
