import Phaser from 'phaser';
import Boss from './Boss.js';
import Enemy from './Enemy.js';
import Pickup from './Pickup.js';
import { C } from '../config.js';
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { sfx, music } from '../audio/sfx.js';
import { TUNE } from '../data/tuning.js';
import { dist, rand } from '../util.js';
import { saveGame } from '../systems/save.js';

// Shared base for the Heart guardians. A boss is a subclass that sets `tune` (its numbers in TUNE), `info`
// (flag / heart / toast / summon kind) and an attackPool(d). The moves themselves live here:
//   tail (ring around the boss), breath (cone of orbs), spikes (telegraphed ground bursts), leap (jump + slam),
//   plus everything in Boss: slam, sweep, volley, nova, charge.
export default class PatternBoss extends Boss {
  constructor(scene, x, y, kind, tune, info) {
    super(scene, x, y, kind);
    this.B = tune;
    this.info = info;
    this.setScale(info.scale || 3);
    this.phaseAt = info.phaseAt || [0.5];
    this.leaping = false;
  }

  // ---- phases (two by default, three for the final boss) ----
  takeHit(info) {
    if (this.invulnerable || !this.engaged) { this.scene.fx.puff(this.x, this.y, 4, 3, 30, 0.2); return 0; }
    const dealt = Enemy.prototype.takeHit.call(this, info);
    if (!this.dead && this.bphase <= this.phaseAt.length && this.hp <= this.maxHp * this.phaseAt[this.bphase - 1]) this.enterPhase();
    return dealt;
  }
  enterPhase() {
    this.bphase++;
    this.clearTele();
    this.setState('roar', 2.2);
    this.invulnerable = true; this.summoned = false;
    this.body.setVelocity(0, 0);
    sfx.play('roar');
    this.scene.shake(1000, 0.016);
    this.scene.fx.ring(this.x, this.y + 6, 4.5, 1.0, 'ring', this.bphase === 2 ? 0xc8383c : 0xeaf2f8);
    this.scene.fx.text(this.x, this.y - 30, this.info.phaseText?.[this.bphase] || 'ENRAGED', 11, 1.4);
    this.phase2Stats();
    this.scene.arenaPhase?.(2);
    bus.emit('boss:phase', this.bphase);
    music.setPhase(this.bphase);
  }
  enterPhase2() { /* handled by enterPhase */ }
  phase2Stats() { this.cdMul = this.bphase >= 3 ? 0.5 : 0.7; this.speedMul = this.bphase >= 3 ? 1.8 : 1.5; }

  // ---- telegraphs ----
  makeTele(a) {
    const sc = this.scene;
    if (a === 'breath') {
      this.clearTele();
      this.tele.push(sc.add.rectangle(this.cx + this.dir.x * 55, this.cy + this.dir.y * 55, 110, 54, C[15], 0.18).setRotation(Math.atan2(this.dir.y, this.dir.x)).setDepth(5));
    } else if (a === 'tail') {
      this.clearTele();
      const r = this.B.tail.r;
      this.tele.push(sc.add.image(this.cx, this.cy + 4, 'disc').setTint(C[11]).setAlpha(0.25).setScale(r / 32).setDepth(5), sc.add.image(this.cx, this.cy + 4, 'ring').setTint(C[11]).setAlpha(0.8).setScale(r / 32).setDepth(6));
    } else if (a === 'spikes') {
      this.clearTele();
      this.tele.push(sc.add.image(this.cx, this.cy, 'ring').setTint(C[15]).setAlpha(0.7).setScale(0.4).setDepth(6));
    } else if (a === 'leap') {
      this.clearTele();
      const p = sc.player.body.center;
      this.leapTo = { x: p.x, y: p.y };
      this.tele.push(sc.add.image(p.x, p.y, 'disc').setTint(C[11]).setAlpha(0.22).setScale(this.B.leap.r / 32).setDepth(5), sc.add.image(p.x, p.y, 'ring').setTint(C[11]).setAlpha(0.8).setScale(this.B.leap.r / 32).setDepth(6));
    } else super.makeTele(a);
  }

  telegraphTick(dt, player) {
    const k = 1 - this.stateT / this.windTotal;
    if (this.atk === 'breath') {
      this.blink -= dt; if (this.blink <= 0) { this.blink = 0.08; this.blinkOn = !this.blinkOn; }
      const p = player.body.center;
      if (k < 0.65) { const l = Math.hypot(p.x - this.cx, p.y - this.cy) || 1; this.dir = { x: (p.x - this.cx) / l, y: (p.y - this.cy) / l }; this.face = { x: Math.sign(this.dir.x) || this.face.x, y: 0 }; }
      this.tele[0]?.setRotation(Math.atan2(this.dir.y, this.dir.x)).setPosition(this.cx + this.dir.x * 55, this.cy + this.dir.y * 55).setAlpha(0.15 + k * 0.4);
    } else if (this.atk === 'spikes') {
      this.blink -= dt; if (this.blink <= 0) { this.blink = 0.08; this.blinkOn = !this.blinkOn; }
      this.tele[0]?.setScale(0.4 + k * 1.2).setAlpha(0.8 - k * 0.5);
    } else if (this.atk === 'leap') {
      this.blink -= dt; if (this.blink <= 0) { this.blink = 0.08; this.blinkOn = !this.blinkOn; }
      this.tele.forEach((t) => t.setAlpha(0.2 + k * 0.5));
      if (k < 0.6) { const p = player.body.center; this.leapTo = { x: p.x, y: p.y }; this.tele.forEach((t) => t.setPosition(p.x, p.y)); }
    } else if (this.atk === 'tail') {
      this.tele.forEach((t) => t.setAlpha(0.2 + k * 0.5));
      this.blink -= dt; if (this.blink <= 0) { this.blink = 0.08; this.blinkOn = !this.blinkOn; }
    } else super.telegraphTick(dt, player);
  }

  // ---- the moves ----
  fireAttack(player) {
    const a = this.atk, sc = this.scene, pc = player.body.center;
    if (!['breath', 'tail', 'spikes', 'leap'].includes(a)) { super.fireAttack(player); return; }
    this.clearTele(); this.marker?.destroy(); this.marker = null;
    if (a === 'breath') {
      this.setState('attack', 0.5);
      sfx.play('frost'); sc.shake(200, 0.008);
      const base = Math.atan2(this.dir.y, this.dir.x), n = this.B.breath.count, sp = this.B.breath.spread;
      for (let i = 0; i < n; i++) this.orb(base + (i - (n - 1) / 2) * sp, this.B.breath.speed + (i % 2) * 14, this.B.breath.dmg);
      sc.fx.puff(this.cx + this.dir.x * 14, this.cy + this.dir.y * 14, this.info.col ?? 15, 10, 70, 0.4);
    } else if (a === 'tail') {
      this.setState('attack', 0.3);
      sfx.play('boom'); sc.shake(200, 0.01);
      sc.fx.ring(this.cx, this.cy + 4, this.B.tail.r / 32 * 1.1, 0.35, 'ring', 0xeaf2f8);
      sc.fx.puff(this.cx, this.cy, 5, 12, 60, 0.4);
      if (dist(this.cx, this.cy + 4, pc.x, pc.y) < this.B.tail.r + 3) player.hurt(this.B.tail.dmg, this.cx, this.cy, { kb: 190, attacker: this });
    } else if (a === 'spikes') {
      this.setState('attack', 0.5);
      sfx.play('nova'); sc.shake(150, 0.007);
      const n = this.B.spikes.n + (this.bphase >= 2 ? 2 : 0) + (this.bphase >= 3 ? 2 : 0);
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + Math.random(), rad = i === 0 ? 0 : 22 + Math.random() * 40;
        const x = pc.x + Math.cos(ang) * rad, y = pc.y + Math.sin(ang) * rad;
        if (!sc.solidAt(x, y)) sc.addZone(x, y, this.B.spikes.r, this.B.spikes.delay + i * 0.12, this.B.spikes.dmg, this);
      }
    } else if (a === 'leap') {
      this.setState('attack', 0.7);
      this.leaping = true;
      const to = { ...this.leapTo };
      if (sc.solidAt(to.x, to.y)) { to.x = this.cx; to.y = this.cy; }
      this.body.enable = false;
      sfx.play('roar');
      sc.tweens.add({
        targets: this, x: to.x, y: to.y - 6, duration: 520, ease: 'Sine.easeInOut',
        onComplete: () => {
          this.leaping = false;
          if (this.dead) return;
          this.body.enable = true; this.body.updateFromGameObject();
          sfx.play('boom'); sc.shake(260, 0.014);
          sc.fx.ring(this.cx, this.cy + 4, this.B.leap.r / 32 * 1.2, 0.4, 'ring', 0xeaf2f8);
          sc.fx.puff(this.cx, this.cy + 4, 5, 14, 70, 0.5);
          const q = sc.player.body.center;
          if (dist(this.cx, this.cy, q.x, q.y) < this.B.leap.r + 3) sc.player.hurt(this.B.leap.dmg, this.cx, this.cy, { kb: 200, attacker: this, crush: true });
        },
      });
    }
  }

  // phase minions (override doSummon in subclasses for kinds)
  doSummon() {
    const sc = this.scene, kinds = this.info.summon || ['wight'];
    let made = 0;
    for (let i = 0; i < 40 && made < (this.bphase >= 3 ? 3 : 2); i++) {
      const ang = Math.random() * Math.PI * 2, r = 40 + Math.random() * 60;
      const x = this.x + Math.cos(ang) * r, y = this.y + Math.sin(ang) * r;
      if (sc.solidAt(x, y) || sc.solidAt(x + 7, y) || sc.solidAt(x - 7, y) || sc.solidAt(x, y + 7)) continue;
      const w = sc.addEnemy(kinds[Math.floor(Math.random() * kinds.length)], x, y, { tier: this.info.tier ?? 2 });
      w.alert(true); sc.fx.puff(x, y, 15, 10, 50, 0.5); made++;
    }
    sfx.play('nova');
  }

  // a leaping boss has no collision and cannot be hurt in mid-air
  update(dt, player) {
    if (this.leaping) { this.finishBoss(dt); return; }
    if (this.engaged && !this.dead) this.special?.(dt, player);
    super.update(dt, player);
  }

  markDefeated() { S.flags[this.info.flag] = true; S.bossState = null; }

  restoreState(st) {
    this.hp = Math.max(1, Math.min(this.maxHp, st.hp));
    if (st.phase >= 2) { music.setPhase(st.phase); this.bphase = st.phase; this.phase2Stats(); this.summoned = true; this.scene.arenaPhase?.(2); }
  }

  victory(sc) {
    sc.onEnemyKilled(this);
    if (S.quick) { sc.setGate?.(false); return; }          // Arena Mode: no hearts, finales or saves
    sc.setGate(false);
    music.play('crypt');
    bus.emit('toast', this.info.toast, 13);
    sc.time.delayedCall(3000, () => { if (sc.scene.isActive('Game')) saveGame(sc, { auto: false }); });
    sc.time.delayedCall(1500, () => {
      if (!sc.scene.isActive('Game')) return;
      sfx.play('levelup');
      sc.fx.ring(this.x, this.y + 4, 2.5, 0.8, 'ring', 0x5cc8d8);
      if (this.info.heart) sc.pickups.push(new Pickup(sc, this.x, this.y + 6, { type: 'heart', id: this.info.heart, big: true }));
      if (this.info.onVictory) this.info.onVictory(sc, this);
    });
  }
}
