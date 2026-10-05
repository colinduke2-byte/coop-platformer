import Phaser from 'phaser';
import { keys } from '../systems/keys.js';
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { bonus, addXp, lvl } from '../systems/skills.js';
import { stats } from '../systems/stats.js';
import { sfx } from '../audio/sfx.js';
import { dir8, facingKind, norm } from '../util.js';

// Feel numbers in one place.
export const P = {
  speed: 72, sneakSpeed: 38, accel: 900,
  regen: 30, regenDelay: 0.75,
  mpRegen: 4.5, mpDelay: 1.2,
  roll: { cost: 22, time: 0.34, speed: 152, iframes: 0.27, cooldown: 0.12 },
  sword: { cost: 14, total: 0.3, hitStart: 0.06, hitEnd: 0.2, move: 0.3, kb: 120, reach: 13, size: 18, xp: 3 },
  hurt: { invuln: 0.7, stun: 0.2, kb: 130 },
};

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'spr_player', 'down0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(8, 7).setOffset(4, 9);
    this.shadow = scene.add.image(x, y, 'shadow');
    this.face = { x: 0, y: 1 };
    this.phase = 0;
    this.mode = 'free'; // free | roll | hurt | dead | lying
    this.sneaking = false;
    this.lockT = 0;      // action lock (swing/cast/shout): no new actions
    this.lockMove = 1;
    this.rollT = 0;
    this.rollDir = { x: 0, y: 1 };
    this.rollCd = 0;
    this.iframes = 0;
    this.invuln = 0;
    this.stunT = 0;
    this.spDelay = 0;
    this.mpDelay = 0;
    this.swing = null;
    this.flashT = 0;
    this.spin = 0;
  }

  get hurtRect() { const b = this.body; return new Phaser.Geom.Rectangle(b.x - 1, b.y - 3, b.width + 2, b.height + 3); }
  get speedNow() { return Math.hypot(this.body.velocity.x, this.body.velocity.y); }

  // Multiplier on enemies' sight radius.
  detectMult() {
    let m = 1;
    if (this.mode === 'roll') m = 1.2;
    else if (this.sneaking) m = this.speedNow < 6 ? 0.3 : 0.5;
    else if (this.speedNow < 6) m = 0.85;
    return m * (this.sneaking ? bonus.detect() : 1);
  }

  spend(cost) {
    if (S.sp < cost) { sfx.play('nostamina'); bus.emit('nostamina'); return false; }
    S.sp -= cost; this.spDelay = P.regenDelay;
    return true;
  }

  gainXp(skill, amt) { addXp(skill, amt); }

  update(dt) {
    if (this.mode === 'dead') { this.animate(false); return; }
    this.flashT -= dt;
    this.invuln -= dt; this.iframes -= dt; this.rollCd -= dt; this.lockT -= dt;
    this.spDelay -= dt; this.mpDelay -= dt;

    const ix = (keys.isDown('right') ? 1 : 0) - (keys.isDown('left') ? 1 : 0);
    const iy = (keys.isDown('down') ? 1 : 0) - (keys.isDown('up') ? 1 : 0);
    const b = this.body;
    this.sneaking = keys.isDown('sneak') && this.mode === 'free';

    if (this.mode === 'lying') { b.setVelocity(0, 0); this.animate(false); return; }

    if (this.stunT > 0) {
      this.stunT -= dt;
      b.velocity.scale(Math.pow(0.03, dt));
      if (this.stunT <= 0 && this.mode === 'hurt') this.mode = 'free';
    } else if (this.mode === 'roll') {
      this.rollT -= dt;
      const k = this.rollT / P.roll.time;
      const sp = P.roll.speed * (0.45 + 0.55 * k);
      b.setVelocity(this.rollDir.x * sp, this.rollDir.y * sp);
      this.spin = (1 - k) * Math.PI * 2;
      if (this.rollT <= 0) { this.mode = 'free'; this.rollCd = P.roll.cooldown; this.spin = 0; }
    } else {
      this.actions(ix, iy, dt);
      this.move(ix, iy, dt);
    }

    this.tickSwing(dt);

    // regen
    if (this.spDelay <= 0 && !this.drawing) S.sp = Math.min(S.maxSp, S.sp + P.regen * dt);
    if (this.mpDelay <= 0) S.mp = Math.min(S.maxMp, S.mp + P.mpRegen * dt);

    const moving = this.speedNow > 8;
    if (moving) this.phase += this.speedNow * dt * 0.16;
    this.animate(moving);
    this.shadow.setPosition(this.x, this.y + 7).setDepth(this.y + 6);
    this.setDepth(this.y + 8);
  }

  move(ix, iy, dt) {
    const b = this.body;
    let sp = this.sneaking ? P.sneakSpeed : P.speed;
    if (this.lockT > 0) sp *= this.lockMove;
    if (this.drawing) sp *= 0.45;
    const l = Math.hypot(ix, iy) || 1;
    const tx = (ix / l) * sp, ty = (iy / l) * sp;
    const a = P.accel * dt;
    b.velocity.x += Phaser.Math.Clamp(tx - b.velocity.x, -a, a);
    b.velocity.y += Phaser.Math.Clamp(ty - b.velocity.y, -a, a);
    // facing: locked during swings, otherwise follows input
    if ((ix || iy) && !(this.swing)) this.face = dir8(ix, iy);
  }

  actions(ix, iy) {
    if (keys.pressed('roll') && this.rollCd <= 0 && !this.swing && this.spend(P.roll.cost)) {
      this.mode = 'roll';
      this.rollT = P.roll.time;
      this.iframes = P.roll.iframes;
      this.rollDir = ix || iy ? norm(ix, iy) : { ...this.face };
      this.face = dir8(this.rollDir.x, this.rollDir.y);
      this.drawing = false;
      this.swing = null;
      sfx.play('roll');
      this.scene.fx.puff(this.x, this.y + 6, 5, 4, 25, 0.3);
      return;
    }
    if (this.lockT > 0) return;
    if (keys.pressed('sword')) this.startSwing();
    for (const [act, id] of [['potion1', 'hp_potion'], ['potion2', 'mp_potion'], ['potion3', 'sp_potion']]) {
      if (keys.pressed(act)) this.usePotion(id);
    }
  }

  // ---------------------------------------------------------------- sword
  startSwing() {
    const cost = P.sword.cost * bonus.swingCost();
    if (!this.spend(cost)) return;
    this.swing = { t: 0, hit: new Set(), fx: false };
    this.lockT = P.sword.total;
    this.lockMove = P.sword.move;
    sfx.play('sword');
    const a = Math.atan2(this.face.y, this.face.x);
    this.scene.fx.slash(this.x + this.face.x * 4, this.y + 2 + this.face.y * 4, a);
    // lunge a little
    this.body.velocity.x += this.face.x * 40; this.body.velocity.y += this.face.y * 40;
  }

  tickSwing(dt) {
    const s = this.swing;
    if (!s) return;
    s.t += dt;
    if (s.t >= P.sword.hitStart && s.t <= P.sword.hitEnd) this.swordHit(s);
    if (s.t >= P.sword.total) this.swing = null;
  }

  swordHit(s) {
    const f = this.face;
    const cx = this.x + f.x * P.sword.reach, cy = this.y + 3 + f.y * P.sword.reach;
    const r = new Phaser.Geom.Rectangle(cx - P.sword.size / 2, cy - P.sword.size / 2, P.sword.size, P.sword.size);
    for (const e of this.scene.enemies.getChildren()) {
      if (e.dead || s.hit.has(e)) continue;
      if (!Phaser.Geom.Intersects.RectangleToRectangle(r, e.rect)) continue;
      s.hit.add(e);
      const sneak = this.sneaking && !e.alerted;
      const mult = sneak ? 3 + bonus.sneakAttack() : 1;
      const dmg = stats.weaponDmg() * bonus.melee() * mult * (0.9 + Math.random() * 0.2);
      const dealt = e.takeHit({ dmg, kx: e.x - this.x, ky: e.y - this.y, kb: P.sword.kb, src: 'melee' });
      this.scene.fx.text(e.x, e.y - 10, String(dealt), sneak ? 13 : 6);
      if (sneak) { this.scene.fx.text(e.x, e.y - 20, 'SNEAK ATTACK', 13); this.gainXp('sneak', 10); sfx.play('crit'); }
      else sfx.play('hit');
      this.gainXp('oneHanded', P.sword.xp + (e.dead ? 3 : 0));
      this.scene.hitStop(0.05);
      this.scene.shake(80, 0.004);
    }
  }

  // --------------------------------------------------------------- potions
  usePotion(id) {
    if (!S.inv[id]) { sfx.play('nostamina'); return false; }
    const it = this.scene.items[id];
    const key = it.restore, maxKey = { hp: 'maxHp', mp: 'maxMp', sp: 'maxSp' }[key];
    if (S[key] >= S[maxKey]) return false;
    S.inv[id]--; if (S.inv[id] <= 0) delete S.inv[id];
    S[key] = Math.min(S[maxKey], S[key] + it.amount);
    sfx.play('potion');
    this.scene.fx.puff(this.x, this.y, key === 'hp' ? 11 : key === 'mp' ? 15 : 8, 8, 30, 0.5);
    this.scene.fx.text(this.x, this.y - 12, '+' + it.amount, key === 'hp' ? 11 : key === 'mp' ? 15 : 8);
    return true;
  }

  // ------------------------------------------------------------------ hurt
  hurt(dmg, sx, sy, opts = {}) {
    if (this.mode === 'dead' || this.mode === 'lying') return false;
    if (this.iframes > 0 || this.invuln > 0) return false;
    const taken = Math.max(1, Math.round(dmg * (1 - stats.armor())));
    S.hp -= taken;
    this.flashT = 0.12;
    this.invuln = P.hurt.invuln;
    this.stunT = P.hurt.stun;
    this.mode = 'hurt';
    this.swing = null; this.drawing = false; this.lockT = 0;
    const n = norm(this.x - sx, this.y - sy);
    this.body.setVelocity(n.x * (opts.kb ?? P.hurt.kb), n.y * (opts.kb ?? P.hurt.kb));
    sfx.play('hurt');
    this.scene.fx.text(this.x, this.y - 10, String(taken), 11);
    this.scene.fx.puff(this.x, this.y, 11, 5, 45, 0.35);
    this.scene.shake(130, 0.008);
    if (S.hp <= 0) {
      S.hp = 0;
      this.mode = 'dead';
      this.body.setVelocity(0, 0);
      sfx.play('die');
      bus.emit('player:dead');
    }
    return true;
  }

  heal(n) { S.hp = Math.min(S.maxHp, S.hp + n); }

  // ------------------------------------------------------------------ anim
  animate(moving) {
    const kind = facingKind(this.face.x, this.face.y);
    const fr = moving && this.mode !== 'roll' ? 1 + (Math.floor(this.phase) % 2) : 0;
    this.setFrame(kind + fr);
    this.setFlipX(kind === 'side' && this.face.x < 0);
    this.setRotation(this.mode === 'roll' ? (this.face.x < 0 ? -this.spin : this.spin) : 0);
    if (this.mode === 'lying') { this.setFrame('side0'); this.setRotation(-Math.PI / 2); this.setFlipX(false); }
    if (this.flashT > 0) this.setTintFill(0xffffff);
    else if (this.invuln > 0 && this.mode !== 'roll' && Math.floor(this.invuln * 18) % 2 === 0) this.setTint(0xff9090);
    else if (this.sneaking) this.setTint(0x8fa0d0);
    else this.clearTint();
    this.setAlpha(this.mode === 'roll' ? 0.85 : 1);
  }
}
