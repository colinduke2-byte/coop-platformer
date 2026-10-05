import Phaser from 'phaser';
import Boss from './Boss.js';
import Pickup from './Pickup.js';
import { C } from '../config.js';
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { sfx, music } from '../audio/sfx.js';
import { TUNE } from '../data/tuning.js';
import { elementMult } from '../systems/damage.js';
import { dist, norm, rand } from '../util.js';
import { saveGame } from '../systems/save.js';
import { say, choose, runScript } from '../systems/dialogue.js';

// Grimfang, the Pale Alpha. Fast, leaps, howls for the pack. Yields at low health:
// the player decides whether to finish him or let him go (changes the world).
export default class Grimfang extends Boss {
  constructor(scene, x, y) {
    super(scene, x, y, 'grimfang');
    this.B = TUNE.boss2;
    this.setScale(1.9);
    this.yieldDone = false;
    this.howled = false;
  }

  markDefeated() { S.flags.grimfangDone = true; S.flags.alphaSlain = true; S.bossState = null; }
  phase2Stats() { this.cdMul = 0.6; this.speedMul = 1.5; }

  isDash() { return this.atk === 'bite' || this.atk === 'claw'; }
  dashCfg() { return this.B[this.atk]; }

  engage() {
    super.engage();
    this.bark('alert');
    sfx.play('howl');
  }

  enterPhase2() {
    this.bphase = 2;
    this.clearTele();
    this.setState('roar', 1.6);
    this.invulnerable = true;
    this.summoned = false;
    this.body.setVelocity(0, 0);
    sfx.play('howl'); sfx.play('roar');
    this.scene.shake(700, 0.012);
    this.scene.fx.ring(this.x, this.y + 6, 3.5, 0.9, 'ring', 0xc8383c);
    this.scene.fx.text(this.x, this.y - 30, 'ENRAGED', 11, 1.4);
    this.cdMul = 0.6; this.speedMul = 1.5;
    this.scene.arenaPhase?.(2);
    bus.emit('boss:phase', 2);
  }

  pickAttack(d, to) {
    const opts = [];
    if (d < 70) opts.push('bite', 'bite', 'leap');
    else opts.push('leap', 'leap', 'bite');
    const wolves = this.scene.enemies.getChildren().filter((e) => !e.dead && e.kind === 'wolf').length;
    if (wolves < 2 && !this.howled) opts.push('howl', 'howl');
    if (this.bphase === 2) opts.push('claw', 'claw');
    let a = opts[Math.floor(Math.random() * opts.length)];
    if (a === this.lastAtk && Math.random() < 0.6) a = opts[Math.floor(Math.random() * opts.length)];
    this.lastAtk = a; this.atk = a;
    this.dir = { x: to.x, y: to.y };
    this.setState('windup', this.B[a].windup * (this.bphase === 2 ? 0.8 : 1));
    this.windTotal = this.stateT;
    this.makeTele(a);
    sfx.play('telegraph');
    this.mark('!', 11, this.stateT + 0.05);
  }

  makeTele(a) {
    const sc = this.scene;
    this.clearTele();
    if (a === 'bite' || a === 'claw') {
      const dc = this.B[a], len = dc.speed * dc.time;
      this.tele.push(sc.add.rectangle(this.cx + this.dir.x * len / 2, this.cy + this.dir.y * len / 2, len, 14, C[11], 0.25).setRotation(Math.atan2(this.dir.y, this.dir.x)).setDepth(5));
    } else if (a === 'leap') {
      const pc = sc.player.body.center;
      this.leapTo = { x: pc.x, y: pc.y };
      this.tele.push(sc.add.image(pc.x, pc.y, 'disc').setTint(C[11]).setAlpha(0.22).setScale(this.B.leap.r / 32).setDepth(5));
      this.tele.push(sc.add.image(pc.x, pc.y, 'ring').setTint(C[11]).setAlpha(0.8).setScale(this.B.leap.r / 32).setDepth(6));
    } else if (a === 'howl') {
      this.tele.push(sc.add.image(this.cx, this.cy, 'ring').setTint(C[13]).setAlpha(0.8).setScale(0.3).setDepth(6));
    }
  }

  telegraphTick(dt) {
    const k = 1 - this.stateT / this.windTotal;
    this.blink -= dt;
    if (this.blink <= 0) { this.blink = 0.08; this.blinkOn = !this.blinkOn; }
    for (const t of this.tele) {
      if (this.atk === 'howl') t.setScale(0.3 + k * 2.5).setAlpha(0.9 - k * 0.5);
      else t.setAlpha((t.texture?.key === 'ring' ? 0.5 : 0.18) + k * 0.4);
    }
    if ((this.atk === 'bite' || this.atk === 'claw') && k < 0.55) {            // keeps aiming until late
      const p = this.scene.player.body.center, n = norm(p.x - this.cx, p.y - this.cy), dc = this.B[this.atk], len = dc.speed * dc.time;
      this.dir = n; this.face = { x: Math.sign(n.x) || this.face.x, y: 0 };
      this.tele[0]?.setRotation(Math.atan2(n.y, n.x)).setPosition(this.cx + n.x * len / 2, this.cy + n.y * len / 2);
    }
    if (this.atk === 'leap') this.face = { x: Math.sign(this.leapTo.x - this.cx) || this.face.x, y: 0 };
  }

  fireAttack(player) {
    const sc = this.scene, a = this.atk;
    this.clearTele();
    this.marker?.destroy(); this.marker = null;
    this.setState('attack', 0.25);
    if (a === 'bite' || a === 'claw') {
      sfx.play('bark_wolf');
      this.chargeT = this.B[a].time; this.chargeHit = false;
      this.setState('attack', this.B[a].time);
    } else if (a === 'leap') {
      this.leaping = { from: { x: this.x, y: this.y }, to: { ...this.leapTo }, t: 0 };
      this.setState('attack', this.B.leap.air);
      this.body.enable = false;
      sfx.play('roll');
    } else if (a === 'howl') {
      this.howled = true;
      sfx.play('howl');
      sc.shake(250, 0.008);
      sc.fx.ring(this.cx, this.cy, 2.6, 0.6, 'ring', 0xf4d460);
      sc.summonWolves(this);
      this.setState('attack', 0.5);
    }
  }

  update(dt, player) {
    if (this.leaping) { this.leapTick(dt, player); this.finishBoss(dt); return; }
    super.update(dt, player);
    // a chain of bites in phase 2
    if (this.atk === 'claw' && this.state === 'recover' && this.clawN < 2 && !this.clawDone) {
      this.clawN = (this.clawN || 0) + 1;
      const pc = player.body.center, n = norm(pc.x - this.cx, pc.y - this.cy);
      this.dir = n; this.setState('windup', 0.28); this.windTotal = 0.28; this.makeTele('claw');
    }
    if (this.state === 'chase') { this.clawN = 0; }
  }

  leapTick(dt, player) {
    const L = this.leaping, sc = this.scene;
    L.t += dt;
    const k = Math.min(1, L.t / this.B.leap.air);
    this.x = L.from.x + (L.to.x - L.from.x) * k;
    this.y = L.from.y + (L.to.y - L.from.y) * k - Math.sin(k * Math.PI) * 22;
    this.body.reset(this.x, L.from.y + (L.to.y - L.from.y) * k);
    this.setDepth(this.y + 40);
    if (k >= 1) {
      this.leaping = null;
      this.body.enable = true;
      this.setPosition(L.to.x, L.to.y);
      this.body.reset(L.to.x, L.to.y);
      sfx.play('boom'); sc.shake(260, 0.012);
      sc.fx.ring(L.to.x, L.to.y, this.B.leap.r / 32 * 1.1, 0.35, 'ring', 0xeaf2f8);
      sc.fx.puff(L.to.x, L.to.y, 5, 14, 70, 0.5);
      const pc = player.body.center;
      if (dist(L.to.x, L.to.y, pc.x, pc.y) < this.B.leap.r + 3) player.hurt(this.B.leap.dmg, L.to.x, L.to.y, { kb: 190, attacker: this });
      this.setState('recover', this.B.leap.recover);
    }
  }

  // ---- yield at low health
  takeHit(info) {
    if (this.yieldDone) return super.takeHit(info);
    const floorHp = Math.ceil(this.maxHp * 0.12);
    const em = elementMult(this.cfg, info.element) || 1;
    if (this.hp - Math.round(info.dmg * em) <= floorHp) {
      const r = super.takeHit({ ...info, dmg: Math.max(0, this.hp - floorHp - 1) / em });
      this.yieldDone = true;
      this.beginYield();
      return r;
    }
    return super.takeHit(info);
  }

  beginYield() {
    this.invulnerable = true;
    this.clearTele();
    this.marker?.destroy(); this.marker = null;
    this.body.setVelocity(0, 0);
    this.setState('yield', 999);
    this.scene.fx.puff(this.x, this.y, 6, 10, 40, 0.5);
    this.scene.time.delayedCall(700, () => this.askSpare());
  }

  async askSpare() {
    const sc = this.scene;
    if (!sc.scene.isActive('Game') || this.dead) return;
    await runScript(async () => {
      await say('Grimfang', '*The great wolf lowers its head. Its flanks heave. It does not look away.*');
      const c = await choose(['Finish him.', 'Let him go.']);
      if (c === 0) {
        this.invulnerable = false; this.yieldDone = true;
        this.setState('chase', 0);
        this.takeHit({ dmg: 9999, kx: 0, ky: 0, kb: 0, src: 'melee' });
      } else this.spare();
    });
  }

  spare() {
    const sc = this.scene;
    S.flags.alphaSpared = true; S.flags.grimfangDone = true; S.bossState = null;
    sc.enemies.remove(this);
    this.dead = true;
    this.body.enable = false;
    bus.emit('toast', 'GRIMFANG SLIPS INTO THE SNOW', 13);
    sfx.play('howl');
    const q = S.quests.alpha;
    if (q.status === 'active') { q.status = 'ready'; bus.emit('toast', 'QUEST READY: TELL BJORN', 13); }
    sc.pickups.push(new Pickup(sc, this.x, this.y + 6, { type: 'item', id: 'alpha_fang', big: true }));
    sc.tweens.add({ targets: this, alpha: 0, duration: 1500, onComplete: () => { this.shadow?.destroy(); this.destroy(); } });
    music.play('pass');
    sc.time.delayedCall(2500, () => { if (sc.scene.isActive('Game')) saveGame(sc, { auto: false }); });
  }

  victory(sc) {
    sc.onEnemyKilled(this);
    music.play('pass');
    bus.emit('toast', 'GRIMFANG IS DEAD', 13);
    const q = S.quests.alpha;
    if (q.status === 'active') { q.status = 'ready'; bus.emit('toast', 'QUEST READY: TELL BJORN', 13); }
    sc.time.delayedCall(3000, () => { if (sc.scene.isActive('Game')) saveGame(sc, { auto: false }); });
  }
}
