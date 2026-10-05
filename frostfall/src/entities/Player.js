import Phaser from 'phaser';
import { keys } from '../systems/keys.js';
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { bonus, addXp, lvl } from '../systems/skills.js';
import { stats } from '../systems/stats.js';
import { sfx } from '../audio/sfx.js';
import { dir8, facingKind, norm } from '../util.js';
import Projectile from './Projectile.js';
import { TILE } from '../config.js';
import { tip } from '../systems/tips.js';
import { TUNE } from '../data/tuning.js';
import { damageTaken, meleeDamage, blockResult, blockStaminaCost, elementMult } from '../systems/damage.js';
import { ITEMS } from '../data/items.js';
import { magicMethods } from './playerMagic.js';
import { settings } from '../systems/settings.js';

// Feel numbers live in data/tuning.js
export const P = TUNE.player;

export { SPELLS, SPELL_ORDER, spellUnlocked } from './playerMagic.js';

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
    this.drawing = false;
    this.comboN = 0;
    this.comboT = 0;
    this.drawT = 0;
    this.shoutCd = 0;
    this.aim = scene.add.image(x, y, 'arrow').setVisible(false);
    this.blocking = false;
    this.blockT = 0;
    this.ward = null;
    this.lastHurt = -99;
    this.heldImg = scene.add.image(x, y, 'blade_default').setVisible(false);
    this.sneakOn = false;
    this.target = null;      // lock-on target
    this.lockG = scene.add.graphics();
  }

  // ---------------------------------------------------------------- lock-on
  // Best foe within range: nearest, with a small bonus for the one we are already facing.
  pickTarget(range = P.lock.range, skip = null) {
    let best = null, bs = 1e9;
    for (const e of this.scene.enemies.getChildren()) {
      if (e.dead || e === skip || !e.active) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d > range) continue;
      const dot = ((e.x - this.x) * this.face.x + (e.y - this.y) * this.face.y) / (d || 1);
      const sc = d * (1.25 - 0.25 * dot);
      if (sc < bs) { bs = sc; best = e; }
    }
    return best;
  }

  updateLock() {
    const t = this.target;
    if (keys.pressed('lockon') && this.mode !== 'lying') {
      if (t) { this.target = null; sfx.play('select'); }
      else { this.target = this.pickTarget(); if (this.target) sfx.play('select'); }
    }
    const tg = this.target;
    if (tg && (tg.dead || !tg.active || Math.hypot(tg.x - this.x, tg.y - this.y) > P.lock.drop || this.mode === 'dead')) this.target = null;
    this.drawLock();
  }

  drawLock() {
    const g = this.lockG, t = this.target;
    g.clear();
    if (!t) return;
    const r = (t.body ? Math.max(t.body.width, t.body.height) : 10) / 2 + 5 + Math.sin(this.scene.time.now / 120);
    g.setDepth(9999).lineStyle(1, 0xf4d460, 1);
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cx = t.x + sx * r, cy = t.y + 2 + sy * r;
      g.lineBetween(cx, cy, cx - sx * 3, cy); g.lineBetween(cx, cy, cx, cy - sy * 3);
    }
  }

  get hurtRect() { const b = this.body; return new Phaser.Geom.Rectangle(b.x - 1, b.y - 3, b.width + 2, b.height + 3); }
  get speedNow() { return Math.hypot(this.body.velocity.x, this.body.velocity.y); }

  // Multiplier on enemies' sight radius.
  detectMult() {
    let m = 1;
    if (this.mode === 'roll') m = 1.2;
    else if (this.sneaking) m = this.speedNow < 6 ? 0.3 : 0.5;
    else if (this.speedNow < 6) m = 0.85;
    return m * (this.sneaking ? bonus.detect() : 1) * this.scene.stealthEnv();
  }

  spend(cost) {
    if (S.sp < cost) { sfx.play('nostamina'); bus.emit('nostamina'); return false; }
    S.sp -= cost; this.spDelay = P.regenDelay;
    return true;
  }

  gainXp(skill, amt) { addXp(skill, amt); }

  update(dt) {
    this.currentDt = dt;
    if (this.mode === 'dead') { this.animate(false); return; }
    this.flashT -= dt;
    this.invuln -= dt; this.iframes -= dt; this.rollCd -= dt; this.lockT -= dt;
    this.heat = Math.max(0, (this.heat || 0) - P.cast.heatDecay * dt);
    this.spDelay -= dt; this.mpDelay -= dt; this.shoutCd -= dt; this.comboT -= dt;

    const ix = (keys.isDown('right') ? 1 : 0) - (keys.isDown('left') ? 1 : 0);
    const iy = (keys.isDown('down') ? 1 : 0) - (keys.isDown('up') ? 1 : 0);
    const b = this.body;
    if (settings.sneakToggle) { if (keys.pressed('sneak')) this.sneakOn = !this.sneakOn; } else this.sneakOn = keys.isDown('sneak');
    this.sneaking = this.sneakOn && this.mode === 'free';
    this.updateLock();

    if (this.mode === 'lying') { b.setVelocity(0, 0); this.animate(false); return; }

    // with the mouse option on, attacks and aiming face the pointer
    if (settings.mouse && this.mode === 'free' && !this.swing && (keys.isDown('sword') || keys.pressed('sword') || keys.isDown('bow') || keys.pressed('bow') || keys.isDown('spell') || keys.pressed('spell') || this.drawing)) {
      const ptr = this.scene.input.activePointer;
      const cam = this.scene.cameras.main;           // pointer.worldX is shared with the HUD camera, so convert here
      this.face = dir8(cam.scrollX + ptr.x - this.x, cam.scrollY + ptr.y - (this.y + 3));
    }

    if (this.mode === 'hurt' && this.stunT <= 0) this.mode = 'free';
    if (this.stunT > 0) {
      this.stunT -= dt;
      b.velocity.scale(Math.pow(0.03, dt));
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
    this.tickWard(dt);
    this.tickBlock(dt);
    this.tickRegen(dt);

    // regen
    if (this.spDelay <= 0 && !this.drawing) S.sp = Math.min(S.maxSp, S.sp + P.regen * dt);
    if (this.mpDelay <= 0) S.mp = Math.min(S.maxMp, S.mp + P.mpRegen * dt);

    const moving = this.speedNow > 8;
    if (moving) {
      const before = Math.floor(this.phase);
      this.phase += this.speedNow * dt * 0.16;
      if (Math.floor(this.phase) !== before && this.mode === 'free' && !this.sneaking) sfx.play('step');
    }
    this.animate(moving);
    this.shadow.setPosition(this.x, this.y + 7).setDepth(this.y + 6);
    this.setDepth(this.y + 8);
    if (this.drawing) {
      const pull = Math.min(1, this.drawT / (P.bow.fullDraw * bonus.drawTime()));
      this.aim.setVisible(true).setPosition(this.x + this.face.x * (9 - pull * 2), this.y + 3 + this.face.y * (9 - pull * 2))
        .setRotation(Math.atan2(this.face.y, this.face.x)).setDepth(this.y + 20);
      if (this.drawFull) this.aim.setTint(0xf4d460); else this.aim.clearTint();
    }
  }

  move(ix, iy, dt) {
    const b = this.body;
    let sp = this.sneaking ? P.sneakSpeed : P.speed;
    if (this.lockT > 0) sp *= this.lockMove;
    if (this.drawing) sp *= P.bow.move;
    if (this.blocking) sp *= P.block.move;
    const l = Math.hypot(ix, iy) || 1;
    const tx = (ix / l) * sp, ty = (iy / l) * sp;
    const onIce = this.mode === 'free' && [TILE.ICE, TILE.ICE2].includes(this.scene.tileIdAt(this.x, this.y + 7));
    const a = P.accel * dt * (onIce ? 0.12 : 1);
    b.velocity.x += Phaser.Math.Clamp(tx - b.velocity.x, -a, a);
    b.velocity.y += Phaser.Math.Clamp(ty - b.velocity.y, -a, a);
    // facing: locked during swings, otherwise follows input (or the lock-on target)
    if (this.target && !this.swing && !this.drawing) this.face = dir8(this.target.x - this.x, this.target.y - (this.y + 3));
    else if ((ix || iy) && !this.swing) this.face = dir8(ix, iy);
    if (this.target && this.drawing) this.face = dir8(this.target.x - this.x, this.target.y - (this.y + 3));
  }

  actions(ix, iy) {
    if (keys.pressed('roll') && this.rollCd <= 0 && (!this.swing || this.swing.t >= this.swing.c.total * P.sword.rollCancel) && this.spend(P.roll.cost)) {
      this.mode = 'roll';
      this.rollCount = (this.rollCount || 0) + 1;
      this.rollT = P.roll.time;
      this.iframes = P.roll.iframes;
      this.rollDir = ix || iy ? norm(ix, iy) : { ...this.face };
      this.face = dir8(this.rollDir.x, this.rollDir.y);
      this.drawing = false; this.aim.setVisible(false);
      this.swing = null;
      sfx.play('roll');
      this.scene.fx.puff(this.x, this.y + 6, 5, 4, 25, 0.3);
      return;
    }
    if (keys.pressed('swap')) { this.nextSpell(); sfx.play('select'); }
    if (this.lockT > 0) return;
    this.bowInput();
    if (this.drawing) return;
    if (keys.pressed('sword') || (settings.holdChain && keys.isDown('sword') && this.comboT > 0 && !this.swing)) this.startSwing();
    else if (keys.pressed('spell')) this.cast();
    else if (this.quickCast()) { /* cast chosen spell directly */ }
    else if (keys.pressed('shout')) this.shout();
    for (const [act, id] of [['potion1', 'hp_potion'], ['potion2', 'mp_potion'], ['potion3', 'sp_potion']]) {
      if (keys.pressed(act)) this.usePotion(id);
    }
  }

  // ---------------------------------------------------------------- sword
  startSwing() {
    const n = this.comboT > 0 ? (this.comboN + 1) % P.combo.length : 0;
    const w = stats.weapon() || {};
    const off = stats.offhandDmg() > 0;
    const c0 = P.combo[n];
    const c = { ...c0, total: c0.total * (w.swing || 1), size: c0.size + (w.sizeAdd || 0) };
    const cost = P.sword.cost * c.cost * (w.costMul || 1) * (off ? 1.3 : 1) * bonus.swingCost();
    if (!this.spend(cost)) { this.comboT = 0; return; }
    this.comboN = n;
    this.comboT = c.total + P.sword.chain;
    this.swing = { t: 0, hit: new Set(), c };
    this.lockT = c.total;
    this.lockMove = P.sword.move;
    sfx.play('sword');
    const a = Math.atan2(this.face.y, this.face.x);
    this.scene.fx.slash(this.x + this.face.x * 4, this.y + 2 + this.face.y * 4, a, c.flip, c.scale);
    if (n === 2) this.scene.fx.puff(this.x + this.face.x * 14, this.y + 3 + this.face.y * 14, 6, 5, 40, 0.25);
    // lunge a little
    this.body.velocity.x += this.face.x * (n === 2 ? 70 : 40); this.body.velocity.y += this.face.y * (n === 2 ? 70 : 40);
  }

  tickSwing(dt) {
    const s = this.swing;
    if (!s) { if (!this.blocking) this.heldImg.setVisible(false); return; }
    s.t += dt;
    {
      // animate the held blade through its arc
      const f = this.face, k = Math.min(1, s.t / s.c.total);
      const key = 'held_' + S.equip.weapon;
      const sweep = 1.25 - 2.5 * k;
      const ang = Math.atan2(f.y, f.x) + (s.c.flip ? -sweep : sweep);
      this.heldImg.setTexture(this.scene.textures.exists(key) ? key : 'blade_default').setOrigin(0.08, 0.5).setVisible(true)
        .setPosition(this.x + Math.cos(ang) * 3, this.y + 3 + Math.sin(ang) * 3).setRotation(ang).setScale(s.c.scale > 1 ? 1.15 : 1)
        .setDepth(this.y + (f.y < 0 ? 4 : 12)).setAlpha(1);
    }
    if (s.t >= P.sword.hitStart && s.t <= P.sword.hitEnd) this.swordHit(s);
    if (s.t >= s.c.total) this.swing = null;
  }

  swordHit(s) {
    const f = this.face;
    const cx = this.x + f.x * P.sword.reach, cy = this.y + 3 + f.y * P.sword.reach;
    const sz = s.c.size;
    const r = new Phaser.Geom.Rectangle(cx - sz / 2, cy - sz / 2, sz, sz);
    this.scene.breakRect(r);
    const en = stats.enchant();
    const off = stats.offhandDmg();
    const heavy = s.c.scale > 1;
    for (const e of this.scene.enemies.getChildren()) {
      if (e.dead || s.hit.has(e)) continue;
      if (!Phaser.Geom.Intersects.RectangleToRectangle(r, e.rect)) continue;
      s.hit.add(e);
      const sneak = this.sneaking && !e.alerted;
      const perkMult = (S.perks.keenedge ? 1.15 : 1) * (heavy && S.perks.rending ? 1.25 : 1);
      let dmg = meleeDamage({
        weapon: stats.weaponDmg() + off * 0.6, skill: bonus.melee(), combo: s.c.dmg, perk: perkMult,
        sneak, sneakBonus: bonus.sneakAttack() + (S.perks.backstab && sneak ? 0.5 : 0), noise: 0.9 + Math.random() * 0.2,
      });
      // finishing blow: a staggered, nearly-dead foe is executed outright
      const exec = !e.isBoss && !sneak && e.stun > 0 && e.hp <= e.maxHp * 0.28;
      if (exec) dmg = e.hp + 999;
      if (en) dmg += en.power;
      const dealt = e.takeHit({
        dmg, kx: e.x - this.x, ky: e.y - this.y, kb: s.c.kb, src: 'melee', stun: s.c.stun, heavy,
        element: en ? en.type : null, slow: en && en.type === 'frost' ? 2.5 : 0, fromX: this.x, fromY: this.y,
      });
      if (dealt <= 0) { s.hit.add(e); continue; }       // blocked by a shield
      this.scene.fx.text(e.x, e.y - 10, String(Math.min(dealt, 999)), sneak ? 13 : en ? ({ fire: 12, frost: 15, shock: 13 })[en.type] : 6);
      if (exec) {
        this.scene.fx.text(e.x, e.y - 22, 'FINISHER', 11, 1);
        this.scene.fx.puff(e.x, e.y, 11, 10, 70, 0.5); sfx.play('execute');
        this.scene.hitStop(0.16); this.scene.shake(220, 0.01); this.gainXp('oneHanded', 4);
      } else if (sneak) { this.scene.fx.text(e.x, e.y - 20, 'SNEAK ATTACK', 13); this.gainXp('sneak', 10); sfx.play('crit'); }
      else sfx.play('hit');
      this.gainXp('oneHanded', P.sword.xp + (e.dead ? 3 : 0));
      if (!exec) { this.scene.hitStop(heavy ? 0.09 : 0.05); this.scene.shake(heavy ? 160 : 80, heavy ? 0.008 : 0.004); }
      if (heavy) this.scene.fx.text(e.x, e.y - 20, 'HEAVY', 12);
    }
  }

  // ------------------------------------------------------------------ bow
  bowInput() {
    if (!this.drawing) {
      if (keys.pressed('bow')) {
        if (S.arrows <= 0) { sfx.play('nostamina'); bus.emit('toast', 'NO ARROWS'); return; }
        if (S.sp < P.bow.startCost) { sfx.play('nostamina'); bus.emit('nostamina'); return; }
        this.drawing = true; this.drawT = 0; this.drawFull = false;
        tip('bow');
        sfx.play('draw');
      }
      return;
    }
    this.drawT += this.currentDt;
    const full = P.bow.fullDraw * bonus.drawTime();
    if (!this.drawFull && this.drawT >= full) { this.drawFull = true; this.scene.fx.puff(this.x, this.y, 13, 4, 25, 0.25); }
    if (!keys.isDown('bow')) this.releaseBow(Math.min(1, this.drawT / full));
  }

  releaseBow(charge01) {
    const wasDrawn = this.drawT >= P.bow.minDraw;
    this.drawing = false;
    this.aim.setVisible(false);
    if (!wasDrawn) return;
    const cost = P.bow.shotCost + P.bow.chargeCost * charge01;
    S.sp = Math.max(0, S.sp - cost);
    this.spDelay = P.regenDelay + 0.2;
    S.arrows--;
    const sp = P.bow.speedMin + (P.bow.speedMax - P.bow.speedMin) * charge01;
    const dmg = stats.bowDmg() * (P.bow.dmgMin + (P.bow.dmgMax - P.bow.dmgMin) * charge01) * bonus.arrow();
    const f = this.face;
    const pr = new Projectile(this.scene, this.x + f.x * 8, this.y + 3 + f.y * 8, 'arrow', f.x * sp, f.y * sp, { dmg, charge: charge01, life: 0.4 + 0.5 * charge01 + 0.5 });
    this.scene.shots.add(pr);
    pr.body.setVelocity(f.x * sp, f.y * sp);
    sfx.play('shoot');
    this.lockT = 0.12; this.lockMove = 0.5;
    this.scene.fx.puff(this.x + f.x * 8, this.y + 3 + f.y * 8, 6, 3, 25, 0.2);
    // recoil
    this.body.velocity.x -= f.x * 25; this.body.velocity.y -= f.y * 25;
  }

  // ----------------------------------------------------------------- shout
  shout() {
    if (this.shoutCd > 0) { sfx.play('nostamina'); return; }
    this.shoutCd = P.shout.cooldown;
    this.lockT = P.shout.lock; this.lockMove = 0;
    this.body.setVelocity(0, 0);
    sfx.play('shout');
    const sc = this.scene;
    sc.fx.ring(this.x, this.y + 4, P.shout.radius / 32 * 1.05, 0.5, 'ring');
    sc.fx.ring(this.x, this.y + 4, P.shout.radius / 32 * 0.7, 0.4, 'ring', 0x5cc8d8);
    sc.fx.text(this.x, this.y - 18, 'FUS!', 13, 1);
    sc.shake(320, 0.014);
    sc.flashScreen(90);
    for (const e of sc.enemies.getChildren()) {
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (e.dead || d > P.shout.radius) continue;
      const push = P.shout.push * (1 - 0.35 * (d / P.shout.radius));
      e.takeHit({ dmg: P.shout.dmg, kx: e.x - this.x, ky: e.y - this.y, kb: push, stun: P.shout.stun, src: 'shout', forceStun: !e.isBoss });
      sc.fx.puff(e.x, e.y, 5, 5, 50, 0.4);
    }
    for (const sh of sc.eshots.getChildren()) if (Math.hypot(sh.x - this.x, sh.y - this.y) < P.shout.radius) sh.finish();
  }

  // --------------------------------------------------------------- potions
  usePotion(id) {
    if (!S.inv[id] && S.inv[id + '_g']) id = id + '_g';      // fall back to the greater potion
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
    const sc = this.scene;
    let incoming = dmg, knock = opts.kb ?? P.hurt.kb, blocked = false;

    // ---- shield block / parry
    const sh = this.blocking ? stats.shield() : null;
    if (sh) {
      const n = norm(sx - this.x, sy - this.y);
      const r = blockResult({
        dmg: incoming, blocking: true, blockT: this.blockT, parryWindow: P.block.parry + (S.perks.duelist ? 0.1 : 0),
        facing: this.face, from: n, reduction: sh.block, arc: P.block.arc,
      });
      if (r.blocked) {
        if (r.parried) { this.onParry(opts.attacker, sx, sy); return true; }
        const cost = blockStaminaCost(incoming, sh.cost);
        if (S.sp >= cost) {
          S.sp -= cost; this.spDelay = P.regenDelay + 0.3;
          incoming = r.taken; knock *= 0.35; blocked = true;
          sfx.play('block'); sc.fx.puff(this.x + this.face.x * 9, this.y + 3 + this.face.y * 9, 5, 6, 45, 0.25);
          sc.fx.text(this.x, this.y - 14, 'BLOCK', 5, 0.6);
          this.gainXp('oneHanded', 2);
        } else {
          S.sp = 0; this.blocking = false; this.stunT = 0.5; this.mode = 'hurt';
          sfx.play('guardbreak'); sc.fx.text(this.x, this.y - 14, 'GUARD BROKEN', 11, 0.9);
        }
      }
    }

    let taken = damageTaken(incoming, stats.armor(), TUNE.difficulty[settings.difficulty].dmgTaken);

    // ---- ward absorbs first
    if (this.ward && this.ward.hp > 0) {
      const ab = Math.min(this.ward.hp, taken);
      this.ward.hp -= ab; taken -= ab;
      sc.fx.puff(this.x, this.y, 15, 5, 40, 0.25);
      this.gainXp('restoration', Math.ceil(ab / 4));
      if (taken <= 0) { sfx.play('block'); this.invuln = 0.25; return true; }
    }

    S.hp -= taken;
    this.lastHurt = sc.t;
    this.flashT = 0.12;
    this.invuln = blocked ? 0.3 : P.hurt.invuln;
    if (!blocked) {
      this.stunT = Math.max(this.stunT, P.hurt.stun);
      this.mode = 'hurt';
      this.swing = null; this.drawing = false; this.aim.setVisible(false); this.lockT = 0;
    }
    const n2 = norm(this.x - sx, this.y - sy);
    this.body.setVelocity(n2.x * knock, n2.y * knock);
    if (!blocked) sfx.play('hurt');
    sc.fx.text(this.x, this.y - 10, String(taken), 11);
    if (S.hp < S.maxHp * 0.4) tip('potion');
    sc.fx.puff(this.x, this.y, 11, 5, 45, 0.35);
    sc.shake(blocked ? 70 : 130, blocked ? 0.004 : 0.008);
    if (S.hp <= 0) {
      S.hp = 0;
      this.mode = 'dead';
      this.body.setVelocity(0, 0);
      sfx.play('die');
      bus.emit('player:dead');
    }
    return true;
  }

  onParry(attacker, sx, sy) {
    const sc = this.scene;
    sfx.play('parry');
    this.invuln = 0.35;
    sc.fx.ring(this.x + this.face.x * 9, this.y + 3 + this.face.y * 9, 0.5, 0.3, 'ring', 0xeaf2f8);
    sc.fx.text(this.x, this.y - 14, 'PARRY!', 13, 0.8);
    sc.hitStop(0.1); sc.shake(120, 0.006);
    this.gainXp('oneHanded', 5);
    if (attacker && !attacker.dead) {
      attacker.staggered = true;
      attacker.stun = Math.max(attacker.stun || 0, attacker.isBoss ? 0.5 : 1.1);
      if (attacker.state === 'windup' || attacker.state === 'attack') { attacker.setState('recover', 0.6); attacker.marker?.destroy(); attacker.marker = null; }
      attacker.body.setVelocity(0, 0);
      sc.fx.text(attacker.x, attacker.y - 16, 'STAGGER', 12, 0.8);
    }
  }

  // ---------------------------------------------------------------- block
  tickBlock(dt) {
    const sh = stats.shield();
    const want = !!sh && keys.isDown('block') && this.mode === 'free' && this.lockT <= 0 && !this.drawing && !this.swing;
    if (want && !this.blocking) { this.blocking = true; this.blockT = 0; sfx.play('move'); }
    else if (!want && this.blocking) this.blocking = false;
    if (this.blocking) {
      this.blockT += dt;
      this.spDelay = Math.max(this.spDelay, 0.25);
      const key = 'held_' + sh.id;
      this.heldImg.setTexture(this.scene.textures.exists(key) ? key : 'blade_default').setVisible(true)
        .setPosition(this.x + this.face.x * 8, this.y + 3 + this.face.y * 8).setDepth(this.y + (this.face.y < 0 ? 4 : 12))
        .setOrigin(0.5, 0.5).setRotation(0).setScale(1).setAlpha(this.blockT < 0.18 ? 1 : 0.92);
    } else if (!this.swing) this.heldImg.setVisible(false);
  }

  // ---------------------------------------------------------------- regen
  tickRegen(dt) {
    if (S.hp <= 0 || S.hp >= S.maxHp) return;
    const sc = this.scene;
    if (sc.t - this.lastHurt < 6) return;
    if (sc.enemies.getChildren().some((e) => e.alerted && !e.dead && Math.hypot(e.x - this.x, e.y - this.y) < 170)) return;
    S.hp = Math.min(S.maxHp, S.hp + 0.6 * TUNE.difficulty[settings.difficulty].regen * (S.perks.hardy ? 1.8 : 1) * dt);
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

Object.assign(Player.prototype, magicMethods);
