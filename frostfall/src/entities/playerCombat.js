// Player melee, blocking and taking damage.
// Mixed into Player (see the bottom of Player.js).
import Phaser from 'phaser';
import { keys, rumble } from '../systems/keys.js';
import { ITEMS } from '../data/items.js';
import { S } from '../systems/state.js';
import { curseMul } from '../world/nightlife.js';
import { bus } from '../systems/bus.js';
import { bonus } from '../systems/skills.js';
import { foodVal } from '../systems/food.js';
import { elixirVal } from '../systems/elixir.js';
import { modMul, modSum } from '../data/mods.js';
import { wear } from '../systems/durability.js';
import { statusMods, inflictOn } from '../systems/status.js';
import { stats } from '../systems/stats.js';
import { sfx } from '../audio/sfx.js';
import { norm } from '../util.js';
import { tip } from '../systems/tips.js';
import { TUNE } from '../data/tuning.js';
import { runeThorns } from '../systems/sockets.js';
import { MODS } from '../data/mods.js';
import { damageTaken, meleeDamage, blockResult, blockStaminaCost } from '../systems/damage.js';
import { settings } from '../systems/settings.js';
import { bl } from '../systems/bless.js';
const P = TUNE.player;

export const combatMethods = {
  perfectDodge(attacker) {
    const sc = this.scene;
    rumble(120, 0.4, 0.6);
    this.lastPerfect = sc.t; this.counterT = P.perfect.counter;
    S.sp = Math.min(S.maxSp, S.sp + P.perfect.refund);
    sc.slowmo(P.perfect.slow, P.perfect.slowMs);
    sc.fx.text(this.x, this.y - 22, 'PERFECT DODGE', 15, 1.1);
    sc.fx.ring(this.x, this.y + 4, 1.1, 0.5, 'ring', 0x5cc8d8);
    sfx.play('parry');
    attacker.stun = Math.max(attacker.stun || 0, attacker.isBoss ? 0.25 : 0.7);
    if (attacker.state === 'attack' || attacker.state === 'windup') attacker.setState('recover', 0.7);
    this.gainXp('sneak', 3);
    if (S.hearts?.rime) {                                          // the Rime Heart: a burst of cold on every perfect dodge
      sc.fx.ring(this.x, this.y + 4, 2, 0.6, 'ring', 0x9fe8ff);
      for (const e of sc.enemies.getChildren()) {
        if (e.dead || Math.hypot(e.x - this.x, e.y - this.y) > 70) continue;
        e.slowT = Math.max(e.slowT || 0, 3.5);
        if (!e.isBoss) e.stun = Math.max(e.stun || 0, 0.9);
      }
    }
  },
  // Gear / blessing lifesteal.
  leechHeal(dealt) {
    const ls = stats.sum('lifesteal') + modSum('lifesteal');
    if (ls > 0 && dealt > 0) S.hp = Math.min(S.maxHp, S.hp + Math.max(0.5, dealt * ls));
  },
  // ---------------------------------------------------------------- sword
  startSwing() {
    const w = stats.weapon() || {};
    const set = P.styles[w.style || (w.type === 'weapon2h' ? 'great' : 'sword')] || P.combo;
    const n = this.comboT > 0 ? (this.comboN + 1) % set.length : 0;
    const off = stats.offhandDmg() > 0;
    const c0 = set[n];
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
    const fin = n === set.length - 1;
    if (fin) this.scene.fx.puff(this.x + this.face.x * 14, this.y + 3 + this.face.y * 14, 6, 5, 40, 0.25);
    // lunge a little
    this.body.velocity.x += this.face.x * (fin ? 70 : 40); this.body.velocity.y += this.face.y * (fin ? 70 : 40);
  },
  // Heavy attack: a slow, telegraphed overhead blow that staggers and breaks guards.
  startHeavy() {
    const H = P.heavy, w = stats.weapon() || {};
    if (!this.spend(H.cost * (w.costMul || 1) * bonus.swingCost())) return;
    const c = { dmg: H.dmg, kb: H.kb, size: H.size + (w.sizeAdd || 0), total: H.total * (w.swing || 1), cost: 1, flip: false, scale: 1.6, stun: H.stun, hs: H.windup * (w.swing || 1), he: H.windup * (w.swing || 1) + 0.16, poise: H.poise, heavyAtk: true };
    this.comboN = 0; this.comboT = 0;
    this.swing = { t: 0, hit: new Set(), c };
    this.lockT = c.total; this.lockMove = 0.12;
    sfx.play('telegraph');
    this.scene.fx.ring(this.x + this.face.x * 6, this.y + 3 + this.face.y * 6, 0.35, H.windup, 'ring', 0xf4d460);
  },
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
    if (s.t >= (s.c.hs ?? P.sword.hitStart) && s.t <= (s.c.he ?? P.sword.hitEnd)) {
      if (s.c.heavyAtk && !s.fired) {
        s.fired = true; sfx.play('sword'); this.scene.shake(160, 0.007);
        this.scene.fx.slash(this.x + this.face.x * 6, this.y + 2 + this.face.y * 6, Math.atan2(this.face.y, this.face.x), false, 1.7);
        this.body.velocity.x += this.face.x * 90; this.body.velocity.y += this.face.y * 90;
      }
      this.swordHit(s);
    }
    if (s.t >= s.c.total) this.swing = null;
  },
  swordHit(s) {
    const f = this.face;
    const reach = s.c.reach ?? P.sword.reach;
    const cx = this.x + f.x * reach, cy = this.y + 3 + f.y * reach;
    const sz = s.c.size, nw = s.c.narrow ? sz * s.c.narrow : sz;           // spears: long and thin
    const horiz = Math.abs(f.x) >= Math.abs(f.y);
    const rw = horiz ? sz : nw, rh = horiz ? nw : sz;
    const r = new Phaser.Geom.Rectangle(cx - rw / 2, cy - rh / 2, rw, rh);
    this.scene.breakRect(r);
    const en = stats.enchant();
    const off = stats.offhandDmg();
    const heavy = s.c.scale > 1;
    const wp = stats.weapon() || {}, isDagger = wp.style === 'dagger', DG = TUNE.player.dagger;
    for (const e of this.scene.enemies.getChildren()) {
      if (e.dead || s.hit.has(e)) continue;
      if (!Phaser.Geom.Intersects.RectangleToRectangle(r, e.rect)) continue;
      s.hit.add(e);
      const sneak = this.sneaking && !e.alerted;
      if (heavy && S.perks.unbroken && !s.refunded) { s.refunded = true; S.sp = Math.min(S.maxSp, S.sp + 12); this.scene.fx.text(this.x, this.y - 16, '+STAMINA', 8, 0.6); }
      const perkMult = (S.perks.keenedge ? 1.15 : 1) * (heavy && S.perks.rending ? 1.25 : 1);
      let dmg = meleeDamage({
        weapon: stats.weaponDmg() + off * 0.6, skill: bonus.melee(), combo: s.c.dmg, perk: perkMult,
        sneak, sneakBonus: bonus.sneakAttack() + (S.perks.backstab && sneak ? 0.5 : 0) + (S.perks.assassin && sneak ? 1 : 0) + (isDagger ? DG.sneakBonus : 0) + (wp.sneakBonus || 0), noise: 0.9 + Math.random() * 0.2,
      });
      // a dagger in the back: the enemy is facing away from you
      let backstab = false;
      if (isDagger && !sneak && e.face) { const bx = e.x - this.x, by = e.y - this.y, bl2 = Math.hypot(bx, by) || 1; if ((e.face.x * bx + e.face.y * by) / bl2 > DG.backDot) { dmg *= DG.backMul; backstab = true; } }
      const assassinate = wp.assassinate && sneak && !e.isBoss && !e.cfg?.title;
      // finishing blow: a staggered, nearly-dead foe is executed outright
      const exec = !e.isBoss && !sneak && e.stun > 0 && e.hp <= e.maxHp * 0.28;
      if (en) dmg += en.power;
      dmg *= curseMul(this.scene, e, S.equip.weapon, ITEMS);
      dmg *= bl('dmgMul', 1) * (1 + 0.04 * (S.ngPlus || 0)) * (this.counterT > 0 ? P.perfect.mult : 1) * (S.hearts?.iron ? 1.1 : 1) * (this.cryT > 0 ? TUNE.player.shouts.cry.dmgMul : 1) * elixirVal('dmgMul', 1) * foodVal('dmgMul', 1);
      const riposte = this.riposteT > 0;
      if (riposte) dmg *= P.riposte.mult;
      const crit = Math.random() < stats.sum('crit');
      if (crit) dmg *= 1.8;
      if (exec || assassinate) dmg = e.hp + 999;
      const dealt = e.takeHit({
        dmg, kx: e.x - this.x, ky: e.y - this.y, kb: s.c.kb, src: 'melee', stun: riposte ? Math.max(s.c.stun, 0.9) : s.c.stun, heavy: heavy || !!s.c.breaker, pierce: Math.max(s.c.pierce || 0, heavy ? wp.pierce || 0 : 0), poise: (s.c.poise || 1) * (riposte ? 2 : 1),
        element: en ? en.type : null, slow: en && en.type === 'frost' ? 2.5 : 0, fromX: this.x, fromY: this.y,
      });
      if (dealt <= 0) { s.hit.add(e); continue; }       // blocked by a shield
      wear(S.equip.weapon, wp.wearMul || 1);
      if (wp.inflict) inflictOn(e, wp.inflict.filter((f) => !f.sneakOnly || sneak));
      if (backstab) this.scene.fx.text(e.x, e.y - 32, 'BACKSTAB', 12, 0.8);
      if (assassinate) this.scene.fx.text(e.x, e.y - 32, 'ASSASSINATED', 13, 1);
      if (riposte) { this.riposteT = 0; this.scene.fx.text(e.x, e.y - 30, 'RIPOSTE', 13, 1); this.scene.fx.ring(e.x, e.y + 3, 0.5, 0.3, 'ring', 0xf4d460); }
      if (crit) this.scene.fx.text(e.x, e.y - 21, 'CRIT', 13, 0.8);
      this.leechHeal(dealt);
      this.scene.fx.text(e.x, e.y - 10, String(Math.min(dealt, 999)), sneak ? 13 : en ? ({ fire: 12, frost: 15, shock: 13 })[en.type] : 6);
      if (exec) {
        this.scene.fx.text(e.x, e.y - 22, 'FINISHER', 11, 1);
        this.scene.fx.puff(e.x, e.y, 11, 10, 70, 0.5); sfx.play('execute');
        this.scene.hitStop(0.16); this.scene.shake(220, 0.01); this.gainXp('oneHanded', 4);
      } else if (sneak) { this.scene.fx.text(e.x, e.y - 20, 'SNEAK ATTACK', 13); this.gainXp('sneak', 10); sfx.play('crit'); }
      else sfx.play('hit');
      this.gainXp('oneHanded', P.sword.xp + (e.dead ? 3 : 0));
      if (!exec) { const hf = this.hitFeel(heavy, crit); this.scene.hitStop(hf.stop); this.scene.shake(hf.ms, hf.amt); }
      if (heavy) this.scene.fx.text(e.x, e.y - 20, 'HEAVY', 12);
    }
  },
  // Weight of a landed hit: a dagger flick, a sword cut, an axe chop or a greatsword blow, heavier on heavy attacks and crits.
  hitFeel(heavy, crit) {
    const w = stats.weapon(), F = TUNE.player.hitFeel;
    const f = F[w?.style] || (w?.type === 'weapon2h' ? F.great : F.sword);
    const m = (heavy ? 1.6 : 1) * (crit ? 1.25 : 1);
    return { stop: settings.hitStop === false ? 0 : f.stop * m, ms: Math.round(f.ms * m), amt: f.amt * m };
  },
  // ------------------------------------------------------------------ hurt
  hurt(dmg, sx, sy, opts = {}) {
    if (this.mode === 'dead' || this.mode === 'lying') return false;
    if (this.iframes > 0 || this.invuln > 0) {
      // rolling at the very last moment is a perfect dodge: slow motion, stamina back, and a counter-attack bonus
      if (this.mode === 'roll' && opts.attacker && !opts.attacker.dead && this.scene.t - (this.rollStart ?? -9) <= P.perfect.window && this.scene.t - (this.lastPerfect ?? -9) > 0.7) this.perfectDodge(opts.attacker);
      return false;
    }
    const sc = this.scene;
    let incoming = dmg, knock = (opts.kb ?? P.hurt.kb) * P.weights[stats.weight()].knock, blocked = false;
    const crush = !!(opts.crush || opts.attacker?.cfg?.crush);

    // ---- shield block / parry
    const sh = this.blocking ? stats.shield() : null;
    if (sh && crush && !(this.blockT <= P.block.parry)) {            // a crushing blow smashes through the guard (only a parry beats it)
      this.blocking = false; this.stunT = Math.max(this.stunT, 0.55); S.sp = Math.max(0, S.sp - 22); this.spDelay = P.regenDelay + 0.5;
      sfx.play('guardbreak'); sc.fx.text(this.x, this.y - 14, 'GUARD CRUSHED', 11, 0.9); incoming *= 0.8;
    } else if (sh) {
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

    let taken = damageTaken(incoming, stats.armor(), TUNE.difficulty[settings.difficulty].dmgTaken * bl('takenMul', 1) * (1 + 0.06 * (S.ngPlus || 0)) * (this.statuses ? statusMods(this).takenMul : 1) * elixirVal('takenMul', 1) * modMul('takenMul'));

    // ---- ward absorbs first
    if (this.ward && this.ward.hp > 0) {
      const ab = Math.min(this.ward.hp, taken);
      this.ward.hp -= ab; taken -= ab;
      sc.fx.puff(this.x, this.y, 15, 5, 40, 0.25);
      this.gainXp('restoration', Math.ceil(ab / 4));
      if (taken <= 0) { sfx.play('block'); this.invuln = 0.25; return true; }
    }

    if (S.mounted) this.scene.pony?.dismount();
    if (S.perks.secondwind && S.hp > 0 && S.hp - taken <= S.maxHp * 0.25 && (S.playtime || 0) - (S.flags.windAt ?? -999) > 90) {
      S.flags.windAt = S.playtime || 0; S.hp = Math.min(S.maxHp, S.hp + S.maxHp * 0.35); taken = 0; this.invuln = 1.5;
      sc.fx.text(this.x, this.y - 16, 'SECOND WIND', 8, 1); sc.fx.ring(this.x, this.y + 4, 1.4, 0.6, 'ring', 0xf4d460); sfx.play('potion');
    }
    S.hp -= taken;
    if (!blocked && opts.attacker && !opts.attacker.dead && runeThorns() > 0) opts.attacker.takeHit({ dmg: runeThorns(), kx: opts.attacker.x - this.x, ky: opts.attacker.y - this.y, kb: 30, src: 'thorns' });
    if (!blocked) wear(S.equip.armor, 1); else wear(S.equip.offhand, 1);
    if (!blocked && opts.attacker?.cfg?.inflicts) inflictOn(this, opts.attacker.cfg.inflicts);
    if (!blocked && Object.keys(S.mods || {}).some((m) => S.mods[m] && MODS[m]?.burnOnHit)) inflictOn(this, [{ type: 'burn', chance: 1, t: 2.5, dps: 3 }]);
    if (!blocked && opts.inflict) inflictOn(this, opts.inflict);
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
    if (!blocked) { sfx.play('hurt'); rumble(170, 0.8, 0.4); } else rumble(70, 0.3, 0.2);
    sc.fx.text(this.x, this.y - 10, String(taken), 11);
    if (S.hp < S.maxHp * 0.4) tip('potion');
    sc.fx.puff(this.x, this.y, 11, 5, 45, 0.35);
    sc.shake(blocked ? 70 : 130, blocked ? 0.004 : 0.008);
    if (S.hp <= 0) {
      S.hp = 0;
      this.noteKiller(opts.attacker);
      this.mode = 'dead';
      this.body.setVelocity(0, 0);
      sfx.play('die');
      bus.emit('player:dead');
    }
    return true;
  },
  // Whoever finishes you off in the open world becomes your nemesis: it comes back stronger, where you fell.
  noteKiller(a) {
    const sc = this.scene;
    if (!a || a.isBoss || !a.kind || !sc.def.stream) return;
    if (a.nemesis && S.nemesis) { S.nemesis.kills++; S.nemesis.x = Math.round(a.x); S.nemesis.y = Math.round(a.y); return; }
    if (!S.nemesis) S.nemesis = { kind: a.kind, tier: a.tier || 0, x: Math.round(a.x), y: Math.round(a.y), kills: 1, name: a.cfg.name };
  },
  // Damage-over-time from statuses (burn, bleed, poison).
  statusHit(n, col) {
    if (this.mode === 'dead' || this.mode === 'lying' || this.invuln > 90) return;
    S.hp -= n; this.flashT = 0.06;
    this.scene.fx.text(this.x, this.y - 10, String(n), col, 0.5);
    if (S.hp <= 0) { S.hp = 0; this.mode = 'dead'; this.body.setVelocity(0, 0); sfx.play('die'); bus.emit('player:dead'); }
  },
  onParry(attacker, sx, sy) {
    const sc = this.scene;
    sfx.play('parry'); rumble(90, 0.5, 0.5);
    this.riposteT = P.riposte.window;                        // strike back now
    this.invuln = 0.35;
    sc.fx.ring(this.x + this.face.x * 9, this.y + 3 + this.face.y * 9, 0.5, 0.3, 'ring', 0xeaf2f8);
    sc.fx.text(this.x, this.y - 14, 'PARRY!', 13, 0.8);
    sc.hitStop(0.1); sc.shake(120, 0.006);
    this.gainXp('oneHanded', 5);
    if (attacker && !attacker.dead) {
      attacker.staggered = true; attacker.openT = 1.8;
      attacker.stun = Math.max(attacker.stun || 0, attacker.isBoss ? 0.5 : 1.1);
      if (attacker.state === 'windup' || attacker.state === 'attack') { attacker.setState('recover', 0.6); attacker.marker?.destroy(); attacker.marker = null; }
      attacker.body.setVelocity(0, 0);
      sc.fx.text(attacker.x, attacker.y - 16, 'STAGGER', 12, 0.8);
    }
  },
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
  },
};
