import Phaser from 'phaser';
import Enemy from './Enemy.js';
import Projectile from './Projectile.js';
import { C } from '../config.js';
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { sfx } from '../audio/sfx.js';
import { dist, norm, dir8, rand } from '../util.js';

// Jarl Valdrek, the Hollow King. Two phases (split at 50% HP).
//  Phase 1: slow; slam (circle), sweep (wide box), frost volley (3 orbs).
//  Phase 2: roars and summons draugr; faster; adds frost nova (ring of orbs) and a charge.
const B = {
  slam: { windup: 0.85, recover: 0.8, dmg: 24, r: 30, reach: 24 },
  sweep: { windup: 0.6, recover: 0.7, dmg: 18, w: 52, h: 38, reach: 26 },
  volley: { windup: 0.75, recover: 0.7, dmg: 11, speed: 100, spread: 0.26 },
  nova: { windup: 1.05, recover: 1.0, dmg: 12, speed: 78, count: 14 },
  charge: { windup: 0.75, recover: 1.4, dmg: 26, speed: 190, time: 0.6 },
};

export default class Boss extends Enemy {
  constructor(scene, x, y) {
    super(scene, x, y, 'boss');
    this.setScale(2);
    this.isBoss = true;
    this.superArmor = true;
    this.noKnock = true;
    this.engaged = false;
    this.bphase = 1;
    this.atk = null;
    this.tele = [];
    this.invulnerable = false;
    this.summoned = false;
    this.state = 'idle';
    this.cdMul = 1;
    this.speedMul = 1;
    this.lastAtk = '';
  }

  alert() { /* only engage() wakes the boss */ }
  get hpFrac() { return Math.max(0, this.hp / this.maxHp); }

  engage() {
    if (this.engaged) return;
    this.engaged = true;
    this.alerted = true;
    this.setState('roar', 2.0);
    this.invulnerable = true;
    sfx.play('roar');
    this.scene.shake(900, 0.012);
    this.scene.fx.ring(this.x, this.y + 6, 3.5, 0.9, 'ring', 0x5cc8d8);
    bus.emit('boss:engaged', this);
  }

  clearTele() { this.tele.forEach((t) => t.destroy()); this.tele.length = 0; }

  takeHit(info) {
    if (this.invulnerable || !this.engaged) { this.scene.fx.puff(this.x, this.y, 4, 3, 30, 0.2); return 0; }
    const dealt = super.takeHit(info);
    if (!this.dead && this.bphase === 1 && this.hp <= this.maxHp * 0.5) this.enterPhase2();
    return dealt;
  }

  enterPhase2() {
    this.bphase = 2;
    this.clearTele();
    this.setState('roar', 2.2);
    this.invulnerable = true;
    this.summoned = false;
    this.body.setVelocity(0, 0);
    sfx.play('roar');
    this.scene.shake(1000, 0.016);
    this.scene.fx.ring(this.x, this.y + 6, 4.5, 1.0, 'ring', 0xc8383c);
    this.scene.fx.text(this.x, this.y - 30, 'ENRAGED', 11, 1.4);
    this.cdMul = 0.65; this.speedMul = 1.55;
    bus.emit('boss:phase', 2);
  }

  // ------------------------------------------------------------------ AI
  update(dt, player) {
    if (this.dead) return;
    const b = this.body, sc = this.scene;
    this.cd -= dt; this.flashT -= dt; this.stateT -= dt; this.slowT -= dt;
    if (!this.engaged) { b.setVelocity(0, 0); this.finishBoss(dt); return; }
    const d = dist(this.cx, this.cy, player.body.center.x, player.body.center.y);
    const to = norm(player.body.center.x - this.cx, player.body.center.y - this.cy);
    const slow = this.slowT > 0 ? 0.7 : 1;

    switch (this.state) {
      case 'roar':
        b.setVelocity(0, 0);
        if (this.bphase === 2 && !this.summoned && this.stateT < 1.0) {
          this.summoned = true;
          sc.summonAdds(this);
        }
        if (this.stateT <= 0) { this.invulnerable = false; this.setState('chase'); this.cd = 0.5; }
        break;
      case 'chase': {
        this.face = dir8(to.x, to.y);
        if (this.cd <= 0) { this.pickAttack(d, to); if (this.state !== 'chase') break; }
        let tx = player.x, ty = player.y;
        if (!sc.clearLine(this.cx, this.cy, player.body.center.x, player.body.center.y, 6)) {
          this.pathT -= dt;
          if (this.pathT <= 0 || !this.wp) { this.wp = sc.nextWaypoint(this.cx, this.cy, player.body.center.x, player.body.center.y); this.pathT = 0.3; }
          if (this.wp) { tx = this.wp.x; ty = this.wp.y; }
        }
        const n = norm(tx - this.cx, ty - this.cy);
        const sp = this.cfg.chase * this.speedMul * slow * (d < 26 ? 0.2 : 1);
        b.setVelocity(n.x * sp, n.y * sp);
        break;
      }
      case 'windup':
        b.setVelocity(0, 0);
        this.telegraphTick(dt, player);
        if (this.stateT <= 0) this.fireAttack(player);
        break;
      case 'attack':
        if (this.atk === 'charge') this.chargeTick(dt, player);
        else if (this.stateT <= 0) this.setState('recover', B[this.atk].recover * (this.bphase === 2 ? 0.75 : 1));
        break;
      case 'recover':
        b.setVelocity(0, 0);
        this.clearTele();
        if (this.stateT <= 0) { this.setState('chase'); this.cd = this.cfg.cooldown * this.cdMul; }
        break;
      default: break;
    }
    this.finishBoss(dt);
  }

  pickAttack(d, to) {
    const opts = [];
    if (d < 46) opts.push('slam', 'sweep', 'sweep');
    else opts.push('volley', 'volley', 'slam');
    if (this.bphase === 2) {
      opts.push('nova');
      if (d > 50) opts.push('charge', 'charge');
    }
    let a = opts[Math.floor(Math.random() * opts.length)];
    if (a === this.lastAtk && Math.random() < 0.6) a = opts[Math.floor(Math.random() * opts.length)];
    this.lastAtk = a;
    this.atk = a;
    this.dir = { x: to.x, y: to.y };
    this.face = dir8(to.x, to.y);
    this.setState('windup', B[a].windup * (this.bphase === 2 ? 0.8 : 1));
    this.windTotal = this.stateT;
    this.makeTele(a);
    sfx.play('telegraph');
    this.mark('!', 11, this.stateT + 0.05);
  }

  makeTele(a) {
    const sc = this.scene;
    this.clearTele();
    const f = this.face;
    if (a === 'slam') {
      const c = this.slamCenter();
      const img = sc.add.image(c.x, c.y, 'disc').setTint(C[11]).setAlpha(0.25).setScale(B.slam.r / 32).setDepth(5);
      const rg = sc.add.image(c.x, c.y, 'ring').setTint(C[11]).setAlpha(0.8).setScale(B.slam.r / 32).setDepth(6);
      this.tele.push(img, rg);
    } else if (a === 'sweep') {
      const r = this.sweepRect();
      const img = sc.add.rectangle(r.x + r.width / 2, r.y + r.height / 2, r.width, r.height, C[11], 0.3).setDepth(5);
      this.tele.push(img);
    } else if (a === 'charge') {
      const len = B.charge.speed * B.charge.time;
      const img = sc.add.rectangle(this.cx + this.dir.x * len / 2, this.cy + this.dir.y * len / 2, len, 14, C[11], 0.25).setRotation(Math.atan2(this.dir.y, this.dir.x)).setDepth(5);
      this.tele.push(img);
    } else if (a === 'nova') {
      const rg = sc.add.image(this.cx, this.cy, 'ring').setTint(C[15]).setAlpha(0.8).setScale(0.3).setDepth(6);
      this.tele.push(rg);
    }
  }

  telegraphTick(dt) {
    const k = 1 - this.stateT / this.windTotal;
    this.blink -= dt;
    if (this.blink <= 0) { this.blink = 0.08; this.blinkOn = !this.blinkOn; }
    for (const t of this.tele) {
      if (t.texture?.key === 'ring' && this.atk === 'nova') t.setScale(0.3 + k * 2.2).setAlpha(0.9 - k * 0.5);
      else t.setAlpha((t.texture?.key === 'ring' ? 0.5 : 0.18) + k * 0.4);
    }
    // Tracking: volley/charge keep aiming until the last third
    if (k < 0.6 && (this.atk === 'volley' || this.atk === 'charge')) {
      const p = this.scene.player.body.center;
      const n = norm(p.x - this.cx, p.y - this.cy);
      this.dir = n; this.face = dir8(n.x, n.y);
      if (this.atk === 'charge' && this.tele[0]) this.tele[0].setRotation(Math.atan2(n.y, n.x)).setPosition(this.cx + n.x * 57, this.cy + n.y * 57);
    }
  }

  slamCenter() { return { x: this.cx + this.face.x * B.slam.reach, y: this.cy + this.face.y * B.slam.reach }; }
  sweepRect() {
    const f = this.face;
    const cx = this.cx + f.x * B.sweep.reach, cy = this.cy + f.y * B.sweep.reach;
    const w = Math.abs(f.x) >= Math.abs(f.y) ? B.sweep.h : B.sweep.w;
    const h = Math.abs(f.x) >= Math.abs(f.y) ? B.sweep.w : B.sweep.h;
    return new Phaser.Geom.Rectangle(cx - w / 2, cy - h / 2, w, h);
  }

  fireAttack(player) {
    const sc = this.scene, a = this.atk;
    this.clearTele();
    this.marker?.destroy(); this.marker = null;
    this.setState('attack', 0.25);
    const pc = player.body.center;
    if (a === 'slam') {
      const c = this.slamCenter();
      sfx.play('boom');
      sc.shake(220, 0.012);
      sc.fx.ring(c.x, c.y, B.slam.r / 32 * 1.1, 0.35, 'ring', 0xeaf2f8);
      sc.fx.puff(c.x, c.y, 5, 14, 70, 0.5);
      sc.fx.puff(c.x, c.y, 15, 8, 50, 0.5);
      if (dist(c.x, c.y, pc.x, pc.y) < B.slam.r + 3) player.hurt(B.slam.dmg, c.x, c.y, { kb: 170 });
    } else if (a === 'sweep') {
      const r = this.sweepRect();
      sfx.play('sword');
      sc.shake(150, 0.008);
      sc.fx.slash(this.cx + this.face.x * 8, this.cy + this.face.y * 8, Math.atan2(this.face.y, this.face.x));
      sc.fx.puff(r.centerX, r.centerY, 15, 8, 60, 0.3);
      if (Phaser.Geom.Intersects.RectangleToRectangle(r, player.hurtRect)) player.hurt(B.sweep.dmg, this.cx, this.cy, { kb: 150 });
    } else if (a === 'volley') {
      sfx.play('frost');
      const base = Math.atan2(this.dir.y, this.dir.x);
      for (const off of [-B.volley.spread, 0, B.volley.spread]) this.orb(base + off, B.volley.speed, B.volley.dmg);
    } else if (a === 'nova') {
      sfx.play('nova');
      sc.shake(250, 0.01);
      sc.fx.ring(this.cx, this.cy, 2.4, 0.5, 'ring', 0x5cc8d8);
      const n = B.nova.count, ph = Math.random() * 6.28;
      for (let i = 0; i < n; i++) this.orb(ph + (i / n) * Math.PI * 2, B.nova.speed, B.nova.dmg);
      this.setState('attack', 0.55);
      this.novaTwo = 0.45;
    } else if (a === 'charge') {
      sfx.play('roar');
      this.chargeT = B.charge.time;
      this.chargeHit = false;
      this.setState('attack', B.charge.time);
    }
  }

  orb(angle, speed, dmg) {
    const pr = new Projectile(this.scene, this.cx + Math.cos(angle) * 14, this.cy + Math.sin(angle) * 14, 'eshot', Math.cos(angle) * speed, Math.sin(angle) * speed, { dmg, life: 3 });
    this.scene.eshots.add(pr);
    pr.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  chargeTick(dt, player) {
    const b = this.body;
    this.chargeT -= dt;
    b.setVelocity(this.dir.x * B.charge.speed, this.dir.y * B.charge.speed);
    this.scene.fx.puff(this.cx, this.cy + 10, 5, 1, 20, 0.3);
    if (!this.chargeHit) {
      const r = new Phaser.Geom.Rectangle(b.x - 3, b.y - 3, b.width + 6, b.height + 6);
      if (Phaser.Geom.Intersects.RectangleToRectangle(r, player.hurtRect)) { this.chargeHit = true; player.hurt(B.charge.dmg, this.cx, this.cy, { kb: 200 }); }
    }
    const crashed = b.blocked.left || b.blocked.right || b.blocked.up || b.blocked.down;
    if (crashed || this.chargeT <= 0) {
      b.setVelocity(0, 0);
      if (crashed) { // wall crash: dazed, open for attack
        sfx.play('boom'); this.scene.shake(300, 0.014);
        this.scene.fx.puff(this.cx, this.cy, 5, 12, 60, 0.5);
        this.scene.fx.text(this.cx, this.cy - 26, 'DAZED', 13, 1);
        this.setState('recover', 1.6);
      } else this.setState('recover', B.charge.recover);
    }
  }

  finishBoss(dt) {
    if (this.novaTwo > 0) {
      this.novaTwo -= dt;
      if (this.novaTwo <= 0) { const n = 10, ph = Math.random() * 6.28; for (let i = 0; i < n; i++) this.orb(ph + (i / n) * Math.PI * 2, B.nova.speed * 0.8, B.nova.dmg - 2); }
    }
    this.markT -= dt;
    this.finish(dt, 1);
    this.shadow.setScale(2.2).setPosition(this.x, this.y + 14).setDepth(this.y + 6);
    if (this.invulnerable && this.engaged && this.state === 'roar') this.setTint(Math.floor(this.scene.t * 14) % 2 ? 0xffb0b0 : 0xffffff);
    if (this.marker) this.marker.setPosition(Math.round(this.x - 2), Math.round(this.y - 36));
  }

  die(info) {
    this.dead = true;
    this.clearTele();
    this.marker?.destroy(); this.marker = null;
    this.body.enable = false;
    this.scene.enemies.remove(this);
    this.scene.eshots.getChildren().slice().forEach((s) => s.finish());
    sfx.play('roar'); sfx.play('die');
    this.shadow.destroy();
    this.setTintFill(0xeaf2f8);
    const sc = this.scene;
    sc.shake(1400, 0.02);
    sc.hitStop(0.25);
    for (let i = 0; i < 8; i++) sc.time.delayedCall(i * 140, () => { if (sc.fx) sc.fx.puff(this.x + rand(-14, 14), this.y + rand(-16, 12), i % 2 ? 15 : 5, 8, 70, 0.6); });
    sc.tweens.add({ targets: this, alpha: 0, y: this.y + 6, duration: 1400, ease: 'Quad.easeIn', onComplete: () => this.destroy() });
    S.flags.bossDead = true;
    sc.onBossDeath(this);
    bus.emit('enemy:killed', 'boss', this);
    bus.emit('boss:killed', this);
  }
}
