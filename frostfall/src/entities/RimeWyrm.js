import Phaser from 'phaser';
import Boss from './Boss.js';
import Pickup from './Pickup.js';
import { C } from '../config.js';
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { sfx, music } from '../audio/sfx.js';
import { TUNE } from '../data/tuning.js';
import { dist } from '../util.js';
import { saveGame } from '../systems/save.js';

// The Rime Wyrm, serpent of the Glacial Maw. Guards the second Heart.
//  Phase 1: tail sweep up close; frost breath cone, ground spikes and a lunge from range.
//  Phase 2 (50%): shrieks and calls frost wights, faster, adds frost novas and more spikes.
export default class RimeWyrm extends Boss {
  constructor(scene, x, y) {
    super(scene, x, y, 'wyrm');
    this.B = TUNE.wyrm;
    this.setScale(3);
    this.cdMul = 1;
  }

  attackPool(d) {
    const opts = [];
    if (d < 48) opts.push('tail', 'tail', 'charge');
    else opts.push('breath', 'breath', 'spikes', 'spikes', 'charge');
    if (this.bphase === 2) { opts.push('spikes', 'nova'); if (d < 70) opts.push('tail'); }
    return opts;
  }

  makeTele(a) {
    const sc = this.scene;
    if (a === 'breath') {
      this.clearTele();
      const len = 110;
      this.tele.push(sc.add.rectangle(this.cx + this.dir.x * len / 2, this.cy + this.dir.y * len / 2, len, 54, C[15], 0.18).setRotation(Math.atan2(this.dir.y, this.dir.x)).setDepth(5));
    } else if (a === 'tail') {
      this.clearTele();
      const r = this.B.tail.r;
      this.tele.push(sc.add.image(this.cx, this.cy + 4, 'disc').setTint(C[11]).setAlpha(0.25).setScale(r / 32).setDepth(5), sc.add.image(this.cx, this.cy + 4, 'ring').setTint(C[11]).setAlpha(0.8).setScale(r / 32).setDepth(6));
    } else if (a === 'spikes') {
      this.clearTele();
      this.tele.push(sc.add.image(this.cx, this.cy, 'ring').setTint(C[15]).setAlpha(0.7).setScale(0.4).setDepth(6));
    } else super.makeTele(a);
  }

  telegraphTick(dt, player) {
    if (this.atk === 'breath') {
      const k = 1 - this.stateT / this.windTotal;
      this.blink -= dt; if (this.blink <= 0) { this.blink = 0.08; this.blinkOn = !this.blinkOn; }
      const p = this.scene.player.body.center;
      if (k < 0.65) { this.dir = { x: p.x - this.cx, y: p.y - this.cy }; const l = Math.hypot(this.dir.x, this.dir.y) || 1; this.dir.x /= l; this.dir.y /= l; this.face = { x: Math.sign(this.dir.x) || this.face.x, y: 0 }; }
      this.tele[0]?.setRotation(Math.atan2(this.dir.y, this.dir.x)).setPosition(this.cx + this.dir.x * 55, this.cy + this.dir.y * 55).setAlpha(0.15 + k * 0.4);
    } else if (this.atk === 'spikes') {
      const k = 1 - this.stateT / this.windTotal;
      this.blink -= dt; if (this.blink <= 0) { this.blink = 0.08; this.blinkOn = !this.blinkOn; }
      this.tele[0]?.setScale(0.4 + k * 1.2).setAlpha(0.8 - k * 0.5);
    } else super.telegraphTick(dt, player);
  }

  fireAttack(player) {
    const a = this.atk, sc = this.scene, pc = player.body.center;
    if (a === 'breath') {
      this.clearTele(); this.marker?.destroy(); this.marker = null;
      this.setState('attack', 0.5);
      sfx.play('frost'); sc.shake(200, 0.008);
      const base = Math.atan2(this.dir.y, this.dir.x), n = this.B.breath.count, sp = this.B.breath.spread;
      for (let i = 0; i < n; i++) this.orb(base + (i - (n - 1) / 2) * sp, this.B.breath.speed + (i % 2) * 14, this.B.breath.dmg);
      sc.fx.puff(this.cx + this.dir.x * 14, this.cy + this.dir.y * 14, 15, 10, 70, 0.4);
    } else if (a === 'tail') {
      this.clearTele(); this.marker?.destroy(); this.marker = null;
      this.setState('attack', 0.3);
      sfx.play('boom'); sc.shake(200, 0.01);
      sc.fx.ring(this.cx, this.cy + 4, this.B.tail.r / 32 * 1.1, 0.35, 'ring', 0xeaf2f8);
      sc.fx.puff(this.cx, this.cy, 5, 12, 60, 0.4);
      if (dist(this.cx, this.cy + 4, pc.x, pc.y) < this.B.tail.r + 3) player.hurt(this.B.tail.dmg, this.cx, this.cy, { kb: 190, attacker: this });
    } else if (a === 'spikes') {
      this.clearTele(); this.marker?.destroy(); this.marker = null;
      this.setState('attack', 0.5);
      sfx.play('nova'); sc.shake(150, 0.007);
      const n = this.B.spikes.n + (this.bphase === 2 ? 2 : 0);
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + Math.random(), rad = i === 0 ? 0 : 22 + Math.random() * 40;
        const x = pc.x + Math.cos(ang) * rad, y = pc.y + Math.sin(ang) * rad;
        if (!sc.solidAt(x, y)) sc.addZone(x, y, this.B.spikes.r, this.B.spikes.delay + i * 0.12, this.B.spikes.dmg, this);
      }
    } else super.fireAttack(player);
  }

  // phase 2: frost wights step out of the ice
  doSummon() {
    const sc = this.scene;
    let made = 0;
    for (let i = 0; i < 30 && made < 2; i++) {
      const ang = Math.random() * Math.PI * 2, r = 40 + Math.random() * 60;
      const x = this.x + Math.cos(ang) * r, y = this.y + Math.sin(ang) * r;
      if (sc.solidAt(x, y) || sc.solidAt(x + 7, y) || sc.solidAt(x - 7, y) || sc.solidAt(x, y + 7)) continue;
      const w = sc.addEnemy('wight', x, y, { tier: 2 });
      w.alert(true); sc.fx.puff(x, y, 15, 10, 50, 0.5); made++;
    }
    sfx.play('nova');
  }

  phase2Stats() { this.cdMul = 0.7; this.speedMul = 1.5; }

  markDefeated() { S.flags.wyrmDead = true; S.bossState = null; }

  victory(sc) {
    sc.onEnemyKilled(this);
    sc.setGate(false);
    music.play('crypt');
    bus.emit('toast', 'THE RIME WYRM FALLS', 13);
    sc.time.delayedCall(3000, () => { if (sc.scene.isActive('Game')) saveGame(sc, { auto: false }); });
    sc.time.delayedCall(1500, () => {
      if (!sc.scene.isActive('Game')) return;
      sfx.play('levelup');
      sc.fx.ring(this.x, this.y + 4, 2.5, 0.8, 'ring', 0x5cc8d8);
      sc.pickups.push(new Pickup(sc, this.x, this.y + 6, { type: 'heart', id: 'rime', big: true }));
    });
  }
}
