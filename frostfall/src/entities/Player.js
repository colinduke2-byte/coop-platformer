import Phaser from 'phaser';
import { PONY_SPEED } from './Pony.js';
import { keys, rumble, stickWalk } from '../systems/keys.js';
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { bonus, addXp, lvl } from '../systems/skills.js';
import { foodVal } from '../systems/food.js';
import { elixirVal } from '../systems/elixir.js';
import { modMul } from '../data/mods.js';
import { currentCloak } from '../systems/achievements.js';
import { wear } from '../systems/durability.js';
import { applyStatus, tickStatuses, statusMods, inflictOn, clearStatus } from '../systems/status.js';
import { stats } from '../systems/stats.js';
import { sfx } from '../audio/sfx.js';
import { dir8, facingKind, norm, walkFrame } from '../util.js';
import Projectile from './Projectile.js';
import { TILE } from '../config.js';
import { tip } from '../systems/tips.js';
import { TUNE } from '../data/tuning.js';
import { damageTaken, meleeDamage, blockResult, blockStaminaCost, elementMult } from '../systems/damage.js';
import { ITEMS } from '../data/items.js';
import { magicMethods } from './playerMagic.js';
import { combatMethods } from './playerCombat.js';
import { bowMethods } from './playerBow.js';
import { settings } from '../systems/settings.js';
import { bl } from '../systems/bless.js';
import { currentShout } from '../systems/shouts.js';

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
    this.isPlayer = true;
    this.applyCloak();
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
    return m * (this.sneaking ? bonus.detect() : 1) * stats.trait('detectMul') * elixirVal('detectMul', 1) * this.scene.stealthEnv() * (S.inv.lantern > 0 && this.scene.isNight() ? 1.25 : 1);
  }

  spend(cost) {
    if (S.sp < cost) { sfx.play('nostamina'); bus.emit('nostamina'); if (S.sp < 6) this.catchBreath(); return false; }
    S.sp -= cost; this.spDelay = P.regenDelay;
    if (S.sp < 0.5) this.catchBreath();
    return true;
  }

  // Running out of stamina leaves you winded: slower, and the stamina is slower to come back.
  catchBreath() {
    if (this.statuses?.winded || this.mode === 'dead') return;
    applyStatus(this, 'winded');
    this.spDelay = Math.max(this.spDelay, P.regenDelay + 0.8);
    this.scene.fx.text(this.x, this.y - 14, 'WINDED', 8, 0.9);
  }

  gainXp(skill, amt) { addXp(skill, amt); }

  update(dt) {
    this.currentDt = dt;
    if (this.mode === 'dead') { this.animate(false); return; }
    this.flashT -= dt;
    if (this.statuses) tickStatuses(this, dt, this.speedNow > 8);
    this.invuln -= dt; this.iframes -= dt; this.rollCd -= dt; this.lockT -= dt;
    this.heat = Math.max(0, (this.heat || 0) - P.cast.heatDecay * dt);
    this.counterT = Math.max(0, (this.counterT || 0) - dt);
    this.riposteT = Math.max(0, (this.riposteT || 0) - dt);
    this.cryT = Math.max(0, (this.cryT || 0) - dt);
    this.spDelay -= dt; this.mpDelay -= dt; this.shoutCd -= dt; this.comboT -= dt;
    // input buffer: a roll or a swing pressed a moment too early (mid-roll, mid-stun) still happens the instant you can act
    this.bufRoll = keys.pressed('roll') ? P.buffer : Math.max(0, (this.bufRoll || 0) - dt);
    this.bufSword = keys.pressed('sword') ? P.buffer : Math.max(0, (this.bufSword || 0) - dt);

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
    if (this.spDelay <= 0 && !this.drawing) S.sp = Math.min(S.maxSp, S.sp + P.regen * stats.trait('spRegenMul') * P.weights[stats.weight()].sp * (S.hearts?.tide ? 1.25 : 1) * dt);
    if (this.mpDelay <= 0) S.mp = Math.min(S.maxMp, S.mp + P.mpRegen * dt);

    const moving = this.speedNow > 8;
    if (moving) {
      const before = Math.floor(this.phase);
      this.phase += this.speedNow * dt * 0.24;
      if (Math.floor(this.phase) !== before && this.mode === 'free' && !this.sneaking && walkFrame(this.phase) !== 0) sfx.play(this.stepSound());
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

  // Cloak colour (unlocked by trophies; see systems/achievements.js).
  applyCloak() {
    const c = currentCloak(), key = c.col === 11 ? 'spr_player' : 'spr_cloak_' + c.col;
    if (this.scene.textures.exists(key) && this.texture.key !== key) this.setTexture(key, 'down0');
  }

  // Footstep sound for the tile underfoot.
  stepSound() {
    const id = this.scene.tileIdAt(this.x, this.y + 7);
    if (id === TILE.ICE || id === TILE.ICE2) return 'step_ice';
    if (id === TILE.WOODFLOOR || id === TILE.RUG) return 'step_wood';
    if (id === TILE.CFLOOR || id === TILE.CFLOOR2 || id === TILE.PATH || id === TILE.PATH2 || id === TILE.STAIRS) return 'step_stone';
    return 'step_snow';
  }

  move(ix, iy, dt) {
    const b = this.body;
    let sp = (this.sneaking ? P.sneakSpeed : P.speed) * stats.trait('moveMul') * (this.statuses ? Math.max(0.25, statusMods(this).speed) : 1) * (this.scene.mireMul ? this.scene.mireMul() : 1);
    if (S.mounted) sp *= PONY_SPEED;
    if (this.lockT > 0) sp *= this.lockMove;
    if (this.drawing) sp *= P.bow.move;
    if (this.blocking) sp *= P.block.move;
    const tileUnder = this.scene.tileIdAt(this.x, this.y + 7), skating = !!S.flags.skates && this.mode === 'free' && [TILE.ICE, TILE.ICE2, TILE.ICESHELF].includes(tileUnder);
    if (skating) sp *= 1.3;
    sp *= stickWalk();
    const l = Math.hypot(ix, iy) || 1;
    const tx = (ix / l) * sp, ty = (iy / l) * sp;
    const onIce = this.mode === 'free' && [TILE.ICE, TILE.ICE2].includes(tileUnder);
    const a = P.accel * dt * (onIce ? (skating ? 0.4 : 0.12) : 1);
    b.velocity.x += Phaser.Math.Clamp(tx - b.velocity.x, -a, a);
    b.velocity.y += Phaser.Math.Clamp(ty - b.velocity.y, -a, a);
    // facing: locked during swings, otherwise follows input (or the lock-on target)
    if (this.target && !this.swing && !this.drawing) this.face = dir8(this.target.x - this.x, this.target.y - (this.y + 3));
    else if ((ix || iy) && !this.swing) this.face = dir8(ix, iy);
    if (this.target && this.drawing) this.face = dir8(this.target.x - this.x, this.target.y - (this.y + 3));
  }

  actions(ix, iy) {
    if (S.mounted) {            // fighting means getting off first
      if (['roll', 'sword', 'bow', 'spell', 'heavy', 'block', 'shout', 'sneak'].some((k) => keys.pressed(k))) this.scene.pony?.dismount();
      return;
    }
    const wantRoll = keys.pressed('roll') || this.bufRoll > 0;
    if (wantRoll && this.rollCd <= 0 && (!this.swing || this.swing.t >= this.swing.c.total * P.sword.rollCancel) && this.spend(P.roll.cost * (S.hearts?.tide ? 0.65 : 1) * P.weights[stats.weight()].roll)) {
      this.mode = 'roll'; this.bufRoll = 0;
      this.rollStart = this.scene.t;
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
    if (keys.pressed('heavy')) this.startHeavy();
    else if (keys.pressed('sword') || (this.bufSword > 0 && !this.swing) || (settings.holdChain && keys.isDown('sword') && this.comboT > 0 && !this.swing)) { this.bufSword = 0; this.startSwing(); }
    else if (keys.pressed('spell')) this.cast();
    else if (this.quickCast()) { /* cast chosen spell directly */ }
    else if (keys.pressed('shout')) this.shout();
    else if (keys.pressed('shoutswap')) this.swapShout();
    for (const [act, id] of [['potion1', 'hp_potion'], ['potion2', 'mp_potion'], ['potion3', 'sp_potion']]) {
      if (keys.pressed(act)) this.usePotion(id);
    }
  }

  // ---------------------------------------------------------------- regen
  tickRegen(dt) {
    if (S.hp <= 0 || S.hp >= S.maxHp) return;
    if (S.hearts?.root) S.hp = Math.min(S.maxHp, S.hp + 1.2 * dt);
    if (foodVal('regen')) S.hp = Math.min(S.maxHp, S.hp + foodVal('regen') * dt);
    const sc = this.scene;
    if (sc.t - this.lastHurt < 6) return;
    if (sc.enemies.getChildren().some((e) => e.alerted && !e.dead && Math.hypot(e.x - this.x, e.y - this.y) < 170)) return;
    S.hp = Math.min(S.maxHp, S.hp + 0.6 * TUNE.difficulty[settings.difficulty].regen * (S.perks.hardy ? 1.8 : 1) * dt);
  }

  heal(n) { S.hp = Math.min(S.maxHp, S.hp + n); }

  // ------------------------------------------------------------------ anim
  animate(moving) {
    const kind = facingKind(this.face.x, this.face.y);
    const fr = moving && this.mode !== 'roll' ? walkFrame(this.phase) : 0;
    // attack / cast / hurt poses
    let pf = null, lean = 0;
    if (this.mode === 'hurt' || (this.stunT > 0 && this.mode !== 'roll')) pf = 'hurt0';
    else if (this.swing) {
      const s = this.swing, hs = s.c.hs ?? P.sword.hitStart, he = s.c.he ?? P.sword.hitEnd;
      const k = s.t < hs ? 0 : s.t <= he ? 1 : 2;
      pf = 'atk' + kind + k; lean = k === 1 ? 2.2 : k === 0 ? -1 : 0.6;
    } else if (this.lockT > 0 && this.mode === 'free' && !this.blocking) { pf = 'atk' + kind + '1'; lean = 1; }
    else if (this.drawing) { pf = 'atk' + kind + '0'; lean = -0.5; }
    this.setFrame(pf || kind + fr);
    this.setOrigin(0.5 - (kind === 'side' ? this.face.x : 0) * lean / 16, 0.5 - (kind !== 'side' ? this.face.y : 0) * lean / 16);
    this.setFlipX(kind === 'side' && this.face.x < 0);
    this.setRotation(this.mode === 'roll' ? (this.face.x < 0 ? -this.spin : this.spin) : 0);
    if (this.mode === 'lying') { this.setFrame('dead0'); this.setRotation(0); this.setFlipX(false); this.setOrigin(0.5, 0.5); }
    if (this.flashT > 0) this.setTintFill(0xffffff);
    else if (this.invuln > 0 && this.mode !== 'roll' && Math.floor(this.invuln * 18) % 2 === 0) this.setTint(0xff9090);
    else if (this.sneaking) this.setTint(0x8fa0d0);
    else this.clearTint();
    this.setAlpha(this.mode === 'roll' ? 0.85 : 1);
  }
}

Object.assign(Player.prototype, magicMethods, combatMethods, bowMethods);
