import Phaser from 'phaser';
import { ENEMIES } from '../data/enemies.js';
import { C } from '../config.js';
import { dist, norm, rand, facingKind, dir8 } from '../util.js';
import { txtS } from '../art/font.js';
import { sfx } from '../audio/sfx.js';
import { bus } from '../systems/bus.js';
import { S } from '../systems/state.js';
import Projectile from './Projectile.js';
import { TUNE } from '../data/tuning.js';
import { elementMult } from '../systems/damage.js';
import { BARKS } from '../data/enemies.js';
import { settings } from '../systems/settings.js';
import { applyElite } from './elite.js';
import { stats } from '../systems/stats.js';

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, kind, spec = {}) {
    const cfg = ENEMIES[kind];
    super(scene, x, y, cfg.tex, 'down0');
    this.kind = kind;
    this.cfg = (kind === 'wolf' && S.flags.alphaSpared) ? { ...cfg, detect: 0 } : cfg;   // the pack is calmer once its alpha was spared
    scene.add.existing(this);
    scene.physics.add.existing(this);
    const [bw, bh, ox, oy] = cfg.body;
    this.body.setSize(bw, bh).setOffset(ox, oy);
    this.shadow = scene.add.image(x, y, 'shadow');
    this.maxHp = Math.round(cfg.hp * TUNE.difficulty[settings.difficulty].enemyHp);
    this.tier = spec.tier || 0;
    this.poise = 0;
    const ng = S.ngPlus || 0;
    if (ng > 0 && !cfg.title) { this.cfg = { ...this.cfg, dmg: Math.round(this.cfg.dmg * (1 + 0.15 * ng)) }; this.maxHp = Math.round(this.maxHp * (1 + 0.4 * ng)); }
    this.camp = spec.camp || null;
    this.takenMul = 1;
    // regions further from the start hit harder and last longer
    if (this.tier > 0 && !cfg.title) {
      this.cfg = { ...this.cfg, dmg: Math.round(this.cfg.dmg * (1 + 0.13 * this.tier)) };
      if (this.cfg.loot) this.cfg.loot = { ...this.cfg.loot, gold: [Math.round(this.cfg.loot.gold[0] * (1 + 0.5 * this.tier)), Math.round(this.cfg.loot.gold[1] * (1 + 0.5 * this.tier))] };
      this.maxHp = Math.round(this.maxHp * (1 + 0.28 * this.tier));
    }
    this.hp = this.maxHp;
    this.displayName = this.cfg.name;
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
    S.seen[this.kind] = true;
    this.state = 'chase';
    if (!silent) { this.mark('!', 13, 0.7); sfx.play('alert'); this.bark('alert'); this.scene.onFirstAlert?.(this); }
    // wake nearby friends (a howl / rally call reaches much further)
    const reach = this.cfg.call ? this.cfg.call : 60;
    if (this.cfg.call) { sfx.play(this.cfg.bark === 'wolf' ? 'howl' : 'alert'); this.scene.fx.ring(this.x, this.y + 4, reach / 32, 0.6, 'ring', 0xf4d460); }
    for (const o of this.scene.enemies.getChildren()) {
      if (o !== this && !o.alerted && !o.dead && dist(o.x, o.y, this.x, this.y) < reach) o.alert(true);
    }
  }

  // Short spoken line / growl above the head (throttled so crowds are not noisy).
  bark(kind) {
    const sc = this.scene, set = BARKS[this.cfg.bark];
    if (!set || !set[kind] || sc.t - (sc.lastBark || -9) < 1.6) return;
    sc.lastBark = sc.t;
    const lines = set[kind];
    sc.fx.text(this.x, this.y - 24, lines[Math.floor(Math.random() * lines.length)], this.cfg.bark === 'undead' ? 15 : 13, 1.0);
    sfx.play('bark_' + this.cfg.bark);
  }

  setState(s, t = 0) { this.state = s; this.stateT = t; }

  update(dt, player) {
    if (this.dead) return;
    const b = this.body;
    const sc = this.scene;
    this.cd -= dt;
    this.flashT -= dt;
    this.slowT -= dt;
    this.guardBroken = Math.max(0, (this.guardBroken || 0) - dt);
    this.openT = Math.max(0, (this.openT || 0) - dt);
    this.staggerT = Math.max(0, (this.staggerT || 0) - dt);
    if (this.poise > 0) { this.poiseT = (this.poiseT || 0) - dt; if (this.poiseT < 0) this.poise = Math.max(0, this.poise - this.maxHp * 0.16 * dt); }
    this.dodgeCd = (this.dodgeCd || 0) - dt;
    if (this.markT > 0) {
      this.markT -= dt;
      if (this.markT <= 0) { this.marker?.destroy(); this.marker = null; }
    }
    const slow = this.slowT > 0 ? 0.5 : 1;
    if (this.dot) this.tickDot(dt);
    if (this.dead) return;
    if (this.regen && this.hp < this.maxHp && this.flashT < -2.5) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * this.regen * dt);

    // ---- stun / knockback: velocity decays, no AI
    if (this.stun > 0) {
      this.stun -= dt;
      b.velocity.scale(Math.pow(0.02, dt));
      this.finish(dt, slow);
      return;
    }

    const d = dist(this.x, this.y, player.x, player.y);
    const dead = player.mode === 'dead';
    if (this.cfg.passive) {                          // deer: never fights, bolts when you come close or it is hurt
      this.scaredT = (this.scaredT || 0) - dt;
      if (d < 60 || this.scaredT > 0) {
        const away = norm(this.x - player.x, this.y - player.y);
        b.setVelocity(away.x * this.cfg.chase * slow, away.y * this.cfg.chase * slow); this.face = dir8(away.x, away.y);
        if (b.blocked.left || b.blocked.right) b.setVelocity(0, (away.y || 1) * this.cfg.chase);
        else if (b.blocked.up || b.blocked.down) b.setVelocity((away.x || 1) * this.cfg.chase, 0);
      } else this.doIdle(dt, slow);
      this.finish(dt, slow);
      return;
    }

    // dodgers sidestep a swing in progress (they cannot dodge twice in a row)
    if (this.evade > 0) { this.evade -= dt; this.finish(dt, slow); return; }
    if (this.cfg.dodge && this.alerted && this.dodgeCd <= 0 && player.swing && d < 34 && (this.state === 'chase' || this.state === 'idle')) {
      const to = norm(player.x - this.x, player.y - this.y), side = Math.random() < 0.5 ? 1 : -1;
      this.evade = 0.24; this.dodgeCd = 1.7;
      b.setVelocity(-to.y * side * 230 - to.x * 40, to.x * side * 230 - to.y * 40);
      sc.fx.puff(this.x, this.y + 4, 5, 4, 30, 0.25); sfx.play('roll');
      this.finish(dt, slow);
      return;
    }

    // ---- awareness
    if (!this.alerted) {
      const range = this.cfg.detect * player.detectMult();
      const seen = !dead && d < range && sc.hasLOS(this.cx, this.cy, player.body.center.x, player.body.center.y);
      this.notice = seen ? this.notice + dt : Math.max(0, this.notice - dt * 0.7);
      if (this.notice > (d < range * 0.5 ? 0.12 : 0.4) * (S.perks.ghost ? 1.6 : 1)) this.alert();
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

  // Burning / bleeding: small ticks of damage every half second.
  tickDot(dt) {
    const d = this.dot;
    d.t -= dt; d.tick -= dt;
    if (d.tick <= 0) {
      d.tick = 0.5;
      const n = Math.max(1, Math.round(d.dps * 0.5));
      this.hp -= n; this.flashT = 0.05;
      this.scene.fx.text(this.x, this.y - 12, String(n), d.col, 0.5);
      if (!this.alerted) this.alert(true);
      if (this.hp <= 0) { this.dot = null; this.die({ dot: true }); return; }
    }
    if (d.t <= 0) this.dot = null;
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
        if (cfg.kind === 'shoot' || cfg.kind === 'cast') { this.archerMove(dt, player, d, to, slow); break; }
        if (cfg.flee && !this.fled && this.hp < this.maxHp * 0.25) {
          this.fled = true; this.setState('flee', 2.6); this.bark('flee'); this.mark('?', 11, 1);
          break;
        }
        if (this.cd <= 0 && d <= cfg.range && this.canAttack(player, d)) {
          if (sc.takeToken(this)) { this.startWindup(to); break; }
          // others wait their turn: circle the player instead of crowding in
          this.strafe(to, d, slow);
          break;
        }
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
      case 'flee': {
        const away = norm(this.x - player.x, this.y - player.y);
        let ax = away.x, ay = away.y;
        if (b.blocked.left || b.blocked.right) { ax = 0; ay = away.y || 1; } else if (b.blocked.up || b.blocked.down) { ay = 0; ax = away.x || 1; }
        b.setVelocity(ax * cfg.chase * 1.1 * slow, ay * cfg.chase * 1.1 * slow);
        this.face = dir8(-ax, -ay);
        if (this.stateT <= 0) { this.setState('chase'); this.cd = 0.4; }
        break;
      }
      case 'windup': {
        b.setVelocity(0, 0);
        this.blink -= dt;
        if (this.blink <= 0) { this.blink = 0.07; this.blinkOn = !this.blinkOn; }
        // roll-punishers hold the swing while you are mid-roll and strike as you land
        if (cfg.punishRoll && this.stateT <= 0.08 && player.mode === 'roll' && (this.holdT = (this.holdT || 0) + dt) < 0.8) { this.stateT = 0.08; break; }
        if (this.stateT <= 0) { this.holdT = 0; this.startAttack(player, to); }
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

  strafe(to, d, slow) {
    if (!this.strafeDir) this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    const want = 36;                       // keep a ring around the player
    const radial = d > want + 6 ? 0.8 : d < want - 6 ? -0.8 : 0;
    const vx = (-to.y * this.strafeDir + to.x * radial), vy = (to.x * this.strafeDir + to.y * radial);
    const n = norm(vx, vy);
    const sp = this.cfg.chase * 0.65 * slow;
    this.body.setVelocity(n.x * sp, n.y * sp);
    if (this.body.blocked.none === false) this.strafeDir *= -1;
  }

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
    this.castTarget = { x: this.scene.player.x, y: this.scene.player.y + 3 };
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
    if (cfg.kind === 'cast') {
      this.scene.addZone(this.castTarget.x, this.castTarget.y, cfg.zoneR, cfg.zoneDelay, cfg.dmg, this);
      this.body.setVelocity(0, 0);
      sfx.play('frost');
      this.scene.fx.puff(this.x, this.y, 14, 8, 40, 0.3);
      return;
    }
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
    if (this.hitDone || this.cfg.kind === 'shoot' || this.cfg.kind === 'cast') return;
    let r = this.hitRect();
    if (this.cfg.kind === 'lunge') { const b = this.body; r = new Phaser.Geom.Rectangle(b.x - 3, b.y - 3, b.width + 6, b.height + 6); }
    if (Phaser.Geom.Intersects.RectangleToRectangle(r, player.hurtRect)) {
      this.hitDone = true;
      const landed = player.hurt(this.cfg.dmg, this.x, this.y, { attacker: this });
      if (landed && this.leech) this.hp = Math.min(this.maxHp, this.hp + this.cfg.dmg * this.leech);
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
    if (this.cfg.sideOnly || this.cfg.tex === 'spr_wolf') {
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
    else if (this.cfg.tint) this.setTint(this.cfg.tint);
    else this.clearTint();
    this.setDepth(this.y + 8);
    this.shadow.setPosition(this.x, this.y + 7).setDepth(this.y + 6);
    this.updateBlade();
    if (this.marker) this.marker.setPosition(Math.round(this.x - 2), Math.round(this.y - 18 - (this.scaleX > 1 ? 10 : 0))).setDepth(99300);
  }

  // Held weapon raised during the telegraph and swung during the attack.
  updateBlade() {
    const cfg = this.cfg;
    const show = cfg.blade && !this.isBoss && !this.dead && (this.state === 'windup' || this.state === 'attack') && this.stun <= 0;
    if (!show) { this.weaponImg?.setVisible(false); return; }
    if (!this.weaponImg) this.weaponImg = this.scene.add.image(this.x, this.y, 'held_e' + cfg.blade).setOrigin(0.08, 0.5);
    const f = this.face, base = Math.atan2(f.y, f.x);
    let ang;
    if (this.state === 'windup') { const k = 1 - this.stateT / cfg.windup; ang = base - 1.35 - k * 0.3 + Math.sin(k * 40) * 0.05; }
    else { const k = Math.min(1, 1 - this.stateT / cfg.atkDur); ang = base - 1.35 + k * 2.7; }
    this.weaponImg.setVisible(true).setPosition(this.x + Math.cos(ang) * 3, this.y + 3 + Math.sin(ang) * 3).setRotation(ang)
      .setDepth(this.y + (f.y < 0 ? 4 : 12));
  }

  // info: { dmg, kx, ky, kb, src, stun, slow, sneak }  -> returns damage dealt
  takeHit(info) {
    if (this.dead) return 0;
    const sc = this.scene;
    // shield guard: frontal melee / arrows are blocked unless the guard is broken by a heavy blow
    if (this.cfg.shield && (info.src === 'melee' || info.src === 'arrow')) {
      if (this.guardBroken > 0) { /* open */ } else {
        const k = norm(-info.kx, -info.ky);
        const front = this.face.x * k.x + this.face.y * k.y > 0.3;
        if (front && info.heavy) {
          this.guardBroken = 1.6; this.stun = Math.max(this.stun, 1.0);
          sc.fx.text(this.x, this.y - 20, 'GUARD BREAK', 12, 0.9); sfx.play('guardbreak'); sc.fx.puff(this.x, this.y, 5, 8, 60, 0.3);
        } else if (front) {
          sfx.play('block'); sc.fx.text(this.x, this.y - 14, 'BLOCKED', 5, 0.6); sc.fx.puff(this.x + this.face.x * 8, this.y + 2, 5, 4, 40, 0.2);
          this.body.setVelocity(-k.x * 20, -k.y * 20);
          if (!this.alerted) this.alert(true);
          return 0;
        }
      }
    }
    // dodging: nothing touches a fencer mid-sidestep
    if (this.evade > 0) { sc.fx.text(this.x, this.y - 18, 'MISS', 4, 0.6); return 0; }
    const em = elementMult(this.cfg, info.element);
    let dmg = Math.max(1, Math.round(info.dmg * em * this.takenMul));
    // armour: only a parry (or a guard-break) opens a knight up; everything else mostly bounces
    if (this.cfg.armored && info.src !== 'shout') {
      if (this.openT > 0) { dmg = Math.round(dmg * 1.6); }
      else {
        dmg = Math.max(1, Math.round(dmg * (info.element ? 0.45 : 0.18)));
        sc.fx.text(this.x, this.y - 22, 'ARMORED', 4, 0.7); sfx.play('block');
      }
    }
    if (em >= 1.2) sc.fx.text(this.x, this.y - 21, 'WEAK', 12, 0.8); else if (em <= 0.7) sc.fx.text(this.x, this.y - 21, 'RESIST', 4, 0.8);
    if (info.src === 'arrow') this.stuck = (this.stuck || 0) + 1;
    if (this.staggerT > 0) dmg = Math.round(dmg * 1.35);
    this.hp -= dmg;
    this.flashT = 0.1;
    // poise: chip away enough and the enemy staggers, opening it (and armour) up for a burst
    if (!this.isBoss && !this.cfg.passive && (info.src === 'melee' || info.src === 'arrow' || info.src === 'fire' || info.src === 'shock')) {
      this.poise = (this.poise || 0) + dmg * (info.poise || 1) * (info.src === 'melee' ? 1 : 0.6);
      this.poiseT = 1.6;
      if (this.poise >= this.maxHp * 0.42 && this.staggerT <= 0 && this.hp > 0) {
        this.poise = 0; this.staggerT = 1.5; this.stun = Math.max(this.stun, 1.5); this.openT = Math.max(this.openT || 0, 1.5);
        this.setState('recover', 1.5); this.marker?.destroy(); this.marker = null;
        sc.fx.text(this.x, this.y - 24, 'STAGGERED', 13, 1); sfx.play('guardbreak'); sc.fx.ring(this.x, this.y + 4, 0.8, 0.4, 'ring', 0xf4d460);
      }
    }
    if (this.cfg.passive) this.scaredT = 5;
    if (!this.alerted && !this.cfg.passive) this.alert(true);
    if (info.slow) this.slowT = Math.max(this.slowT, info.slow);
    if (info.dot) this.dot = { dps: info.dot.dps, t: info.dot.t, col: info.dot.col, acc: 0, tick: 0 };
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
    if (this.summons && !this.summoned && this.hp > 0 && this.hp < this.maxHp * 0.55) this.callHelp();
    if (this.hp <= 0) this.die(info);
    return dmg;
  }

  // Streamed out of the world while the player is far away (not a kill).
  despawn() {
    this.marker?.destroy(); this.marker = null;
    this.weaponImg?.destroy(); this.weaponImg = null;
    this.shadow?.destroy();
    this.scene.enemies.remove(this);
    this.destroy();
  }

  callHelp() {
    this.summoned = true;
    this.scene.fx.ring(this.x, this.y + 4, 1.4, 0.6, 'ring', 0xb0a0ff); sfx.play('alert');
    this.scene.fx.text(this.x, this.y - 24, 'REINFORCEMENTS', 14, 1);
    for (let i = 0; i < this.summons; i++) {
      const m = this.scene.addEnemy(this.kind === 'wolf' || this.kind === 'alpha' ? 'wolf' : 'draugr', this.x + (i ? 14 : -14), this.y + 6, { tier: Math.max(0, this.tier - 1) });
      m.alert(true);
    }
  }

  die(info) {
    this.dead = true;
    if (this.explodes) { this.scene.addZone(this.x, this.y + 3, 30, 0.9, Math.round(this.cfg.dmg * 0.9), null); this.scene.fx.text(this.x, this.y - 26, 'ABOUT TO BLOW!', 12, 1); }
    if (this.spawnKey) this.scene.markKilled?.(this);
    if (this.champion) this.scene.onChampionDown?.(this);
    this.marker?.destroy(); this.marker = null;
    this.body.enable = false;
    this.scene.enemies.remove(this);
    sfx.play('kill');
    this.scene.fx.puff(this.x, this.y, 5, 10, 55, 0.5);
    this.scene.fx.puff(this.x, this.y, 4, 6, 40, 0.5);
    this.clearTint();
    this.setTintFill(0xb4c7e0);
    this.shadow.destroy();
    this.weaponImg?.destroy(); this.weaponImg = null;
    const sc = this.scene, dir = this.flipX ? -1 : 1;
    // fall over, lie there a moment, then crumble away
    sc.tweens.add({
      targets: this, angle: 90 * dir, y: this.y + 4, duration: 260, ease: 'Back.easeOut',
      onComplete: () => {
        sc.fx.puff(this.x, this.y + 4, 5, 6, 30, 0.4);
        sc.time.delayedCall(900, () => {
          if (!this.scene) return;
          sc.tweens.add({ targets: this, alpha: 0, duration: 600, onComplete: () => this.destroy() });
        });
      },
    });
    this.scene.onEnemyKilled(this, info);
    if (this.stuck) {
      let n = 0; for (let i = 0; i < this.stuck; i++) if (Math.random() < 0.6) n++;
      if (n) this.scene.spawnLoot(this.x, this.y + 2, null, [['arrows', 1, [n, n]]]);
    }
    bus.emit('enemy:killed', this.kind, this);
  }
}
