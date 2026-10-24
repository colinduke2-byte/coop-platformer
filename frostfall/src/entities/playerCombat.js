// Player melee, blocking and taking damage.
// Mixed into Player (see the bottom of Player.js).
import Phaser from 'phaser';
import { keys, rumble } from '../systems/keys.js';
import { ITEMS, heldKey } from '../data/items.js';
import { S } from '../systems/state.js';
import { curseMul } from '../world/nightlife.js';
import { bus } from '../systems/bus.js';
import { bonus } from '../systems/skills.js';
import { foodVal } from '../systems/food.js';
import { elixirVal } from '../systems/elixir.js';
import { modMul, modSum } from '../data/mods.js';
import { wear } from '../systems/durability.js';
import { statusMods, inflictOn, applyStatus } from '../systems/status.js';
import { stats } from '../systems/stats.js';
import { sfx } from '../audio/sfx.js';
import { norm, dir8 } from '../util.js';
import { tip } from '../systems/tips.js';
import { TUNE } from '../data/tuning.js';
import { runeThorns } from '../systems/sockets.js';
import { MODS } from '../data/mods.js';
import { damageTaken, meleeDamage, blockResult, blockStaminaCost } from '../systems/damage.js';
import { settings } from '../systems/settings.js';
import { bl } from '../systems/bless.js';
import { classMix } from '../systems/burden.js';
import Projectile from './Projectile.js';
const P = TUNE.player;
const styleOf = (w) => w?.style || (w?.type === 'weapon2h' ? 'great' : 'sword');

export const combatMethods = {
  perfectDodge(attacker, ranged = false) {
    const sc = this.scene;
    rumble(120, 0.4, 0.6);
    this.lastPerfect = sc.t; this.counterT = P.perfect.counter;
    S.sp = Math.min(S.maxSp, S.sp + P.perfect.refund);
    sc.slowmo(P.perfect.slow, P.perfect.slowMs);
    sc.fx.text(this.x, this.y - 22, 'PERFECT DODGE', 15, 1.1);
    sc.fx.ring(this.x, this.y + 4, 1.1, 0.5, 'ring', 0x5cc8d8);
    sfx.play('parry');
    if (!ranged) {                                               // CB8: a dodged arrow or orb does not stun the one who loosed it
      if (!attacker.isBoss) attacker.stun = Math.max(attacker.stun || 0, 0.7);          // CB20: a boss has no stun; its recover is the opening
      if (attacker.state === 'attack' || attacker.state === 'windup') attacker.setState('recover', 0.7);
    }
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
    this.hitWindow(c, styleOf(w), n === set.length - 1);
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
  // CB24: each weapon style has its own heavy (TUNE.combat.heavy[style] over TUNE.player.heavy); a greatsword's is held to charge.
  startHeavy() {
    const w = stats.weapon() || {}, style = styleOf(w);
    if (style === 'staff') { this.staffBolt(); return; }
    const H = this.heavyCfg(style);
    if (style === 'great' && !this.charging) {
      if (S.sp < H.cost * (w.costMul || 1) * bonus.swingCost()) { this.spend(H.cost * (w.costMul || 1) * bonus.swingCost()); return; }
      this.charging = { t: 0, lvl: 0 }; this.lockT = 0.1; this.lockMove = TUNE.combat.great.move;
      sfx.play('draw'); this.scene.fx.ring(this.x, this.y + 4, 0.4, 0.3, 'ring', 0xf4d460);
      return;
    }
    this.heavyBlow(style, w, H, 1);
  },
  heavyCfg(style) {
    const set = P.styles[style] || P.combo, fin = set[set.length - 1];
    return { reach: fin.reach, narrow: fin.narrow, wide: fin.wide, ...P.heavy, ...(TUNE.combat.heavy[style] || {}) };       // CB11: the style's reach
  },
  heavyBlow(style, w, H, mult) {
    if (!this.spend(H.cost * (w.costMul || 1) * bonus.swingCost())) return;
    const sw = w.swing || 1;
    const c = { dmg: H.dmg * mult, kb: H.kb, size: H.size + (w.sizeAdd || 0), reach: H.reach, narrow: H.narrow, wide: H.wide, total: H.total * sw, cost: 1, flip: false, scale: 1.6, stun: H.stun, hs: H.windup * sw, he: H.windup * sw + 0.16, poise: H.poise * mult, heavyAtk: true, fin: true,
      arc: H.arc, r: H.r, shock: H.shock, root: H.root, lunge: H.lunge, tip: H.tip, tipMul: H.tipMul, crushGuard: H.crushGuard, level: mult };
    this.comboN = 0; this.comboT = 0;
    if (style === 'dagger') this.shadowStep(c, H);
    this.swing = { t: 0, hit: new Set(), c };
    this.lockT = c.total; this.lockMove = 0.12;
    sfx.play('telegraph');
    this.scene.fx.ring(this.x + this.face.x * 6, this.y + 3 + this.face.y * 6, c.r || c.shock?.r ? 0.6 : 0.35, c.hs, 'ring', 0xf4d460);
  },
  // CB24 dagger heavy: slip behind the nearest foe in front of you; the blow counts as a backstab
  shadowStep(c, H) {
    const sc = this.scene;
    let e = this.target && !this.target.dead ? this.target : null;
    if (!e) {
      let bd = H.range;
      for (const o of sc.enemies.getChildren()) {
        if (o.dead || o.hidden || o.cfg?.passive) continue;
        const d = Math.hypot(o.x - this.x, o.y - this.y);
        if (d < bd && ((o.x - this.x) * this.face.x + (o.y - this.y) * this.face.y) / (d || 1) > 0.2) { bd = d; e = o; }
      }
    }
    if (!e || Math.hypot(e.x - this.x, e.y - this.y) > H.range) return;
    const n = norm(e.x - this.x, e.y - this.y), x = e.x + n.x * H.step, y = e.y + n.y * H.step;
    if (sc.solidAt(x, y + 4) || sc.solidAt(x - 4, y + 4) || sc.solidAt(x + 4, y + 4)) return;
    sc.fx.puff(this.x, this.y, 14, 6, 30, 0.3);
    this.setPosition(x, y); this.body.reset(x, y);
    this.face = dir8(e.x - x, e.y - (y + 3));
    sc.fx.puff(x, y, 14, 6, 30, 0.3); sfx.play('roll');
    c.backstab = true;
  },
  // CB3 / CB4: when the blow lands inside the swing (fractions of its length, per style); only the last step is a finisher
  hitWindow(c, style, fin) {
    const win = TUNE.combat.hitWin[style] || TUNE.combat.hitWin.sword;
    if (c.hs == null) { c.hs = c.total * win[0]; c.he = c.total * win[1]; }
    c.fin = fin;
  },
  // CB24: area heavies (axe cleave, halberd sweep, mace / hammer ground shock) hit everything in a circle or an arc
  inArea(c, e) {
    const cx = this.x + (c.shock ? this.face.x * c.shock.ahead : 0), cy = this.y + 3 + (c.shock ? this.face.y * c.shock.ahead : 0);
    const R = c.shock ? c.shock.r : c.r, er = e.body ? Math.max(e.body.width, e.body.height) / 2 : 6;
    const dx = e.cx - cx, dy = e.cy - cy, d = Math.hypot(dx, dy);
    if (d > R + er) return false;
    if (c.shock || !c.arc || c.arc >= 180 || d < er) return true;
    return (dx * this.face.x + dy * this.face.y) / (d || 1) >= Math.cos(c.arc * Math.PI / 180);
  },
  // extra damage from the style rules (the halberd's tip)
  styleDmgMul(c, e) {
    if (!c.tip) return 1;
    return Math.hypot(e.cx - this.x, e.cy - (this.y + 3)) >= c.r * c.tip ? c.tipMul : 1;
  },
  // what a landed blow does on top of its damage, per style (CB24)
  styleOnHit(c, e, wp) {
    const sc = this.scene, A = TUNE.combat.axe, style = styleOf(wp);
    if (style === 'axe' && !e.dead) {                       // the axe: blows on the same foe deepen its bleeding
      e.axeStacks = sc.t - (e.axeT ?? -9) < A.keep ? Math.min(A.maxStacks, (e.axeStacks || 0) + 1) : 1; e.axeT = sc.t;
      applyStatus(e, 'bleed', { t: A.bleedT, dps: A.dpsPerStack * e.axeStacks });
      if (e.axeStacks >= 3) sc.fx.text(e.x, e.y - 28, 'BLEED x' + e.axeStacks, 11, 0.6);
    }
    if (c.root && !e.dead && !e.isBoss) { applyStatus(e, 'root', { t: c.root }); sc.fx.text(e.x, e.y - 28, 'PINNED', 8, 0.7); }
    if (c.crushGuard && !e.dead) { e.guardBroken = Math.max(e.guardBroken || 0, 1.6); if (e.cfg.armored) e.openT = Math.max(e.openT || 0, 1.5); }
    if (c.shock && !e.dead && !e.isBoss) e.stun = Math.max(e.stun || 0, c.stun);
  },
  // CB24: a greatsword heavy charges while the key is held (two levels, hyper-armour), and swings on release
  tickCharge(dt) {
    const ch = this.charging, G = TUNE.combat.great;
    if (!ch) return;
    if (this.mode !== 'free') { this.charging = null; return; }
    ch.t += dt; this.lockT = Math.max(this.lockT, 0.05); this.lockMove = G.move;
    const lvl = ch.t >= G.charge[1] ? 2 : ch.t >= G.charge[0] ? 1 : 0;
    if (lvl > ch.lvl) { ch.lvl = lvl; sfx.play('telegraph'); this.scene.fx.ring(this.x, this.y + 4, 0.5 + lvl * 0.3, 0.3, 'ring', 0xf4d460); this.scene.fx.text(this.x, this.y - 18, lvl === 2 ? 'II' : 'I', 13, 0.5); }
    if (ch.t >= G.charge[1] + G.hold || !keys.isDown('heavy')) {
      this.charging = null; this.lockT = 0;
      const w = stats.weapon() || {};
      this.heavyBlow('great', w, this.heavyCfg('great'), G.mult[ch.lvl]);
    }
  },
  tickSwing(dt) {
    this.tickCharge(dt);
    const s = this.swing;
    if (!s) { if (!this.blocking) this.heldImg.setVisible(false); return; }
    s.t += dt;
    {
      // animate the held blade through its arc
      const f = this.face, m = Math.min(0.9, (s.c.hs ?? P.sword.hitStart) / s.c.total), u = Math.min(1, s.t / s.c.total), k = u < m ? 0.5 * u / m : 0.5 + 0.5 * (u - m) / (1 - m);
      const key = heldKey(S.equip.weapon);
      const sweep = 1.25 - 2.5 * k;
      const ang = Math.atan2(f.y, f.x) + (s.c.flip ? -sweep : sweep);
      this.heldImg.setTexture(this.scene.textures.exists(key) ? key : 'blade_default').setOrigin(['staff', 'halberd'].includes(stats.weapon()?.style) ? 0.34 : 0.08, 0.5).setVisible(true)
        .setPosition(this.x + Math.cos(ang) * 3, this.y + 3 + Math.sin(ang) * 3).setRotation(ang).setScale(s.c.scale > 1 ? 1.15 : 1)
        .setDepth(this.y + (f.y < 0 ? 4 : 12)).setAlpha(1);
    }
    if (s.t >= (s.c.hs ?? P.sword.hitStart) && s.t <= (s.c.he ?? P.sword.hitEnd)) {
      if (s.c.heavyAtk && !s.fired) {
        s.fired = true; sfx.play('sword'); this.scene.shake(160, 0.007);
        this.scene.fx.slash(this.x + this.face.x * 6, this.y + 2 + this.face.y * 6, Math.atan2(this.face.y, this.face.x), false, 1.7);
        this.body.velocity.x += this.face.x * (s.c.lunge || 90); this.body.velocity.y += this.face.y * (s.c.lunge || 90);
        if (s.c.shock) { const k = s.c.shock; this.scene.fx.ring(this.x + this.face.x * k.ahead, this.y + 4 + this.face.y * k.ahead, k.r / 32 * 1.1, 0.35, 'ring', 0xeaf2f8); this.scene.fx.puff(this.x + this.face.x * k.ahead, this.y + 4 + this.face.y * k.ahead, 5, 10, 60, 0.4); }
        else if (s.c.arc) this.scene.fx.ring(this.x, this.y + 4, s.c.r / 32 * 1.1, 0.3, 'ring', 0xeaf2f8);
      }
      this.swordHit(s);
    }
    if (s.t >= s.c.total) this.swing = null;
  },
  swordHit(s) {
    const f = this.face;
    const reach = s.c.reach ?? P.sword.reach;
    const cx = this.x + f.x * reach, cy = this.y + 3 + f.y * reach;
    const sz = s.c.size, nw = s.c.narrow ? sz * s.c.narrow : s.c.wide ? sz * s.c.wide : sz;           // spears: long and thin
    const horiz = Math.abs(f.x) >= Math.abs(f.y);
    const rw = horiz ? sz : nw, rh = horiz ? nw : sz;
    const r = new Phaser.Geom.Rectangle(cx - rw / 2, cy - rh / 2, rw, rh);
    this.scene.breakRect(r);
    const en = stats.enchant();
    const off = stats.offhandDmg();
    const heavy = !!(s.c.fin || s.c.heavyAtk);           // CB4: only combo finishers and heavy attacks
    const wp = stats.weapon() || {}, isDagger = wp.style === 'dagger', DG = TUNE.player.dagger;
    for (const e of this.scene.enemies.getChildren()) {
      if (e.dead || s.hit.has(e)) continue;
      if (!(s.c.arc || s.c.shock ? this.inArea(s.c, e) : Phaser.Geom.Intersects.RectangleToRectangle(r, e.rect))) continue;
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
      const assassinate = wp.assassinate && sneak && !e.isBoss && !e.named;          // CB9: never a named foe
      // finishing blow: a staggered, nearly-dead foe is executed outright
      const exec = !e.isBoss && !sneak && e.stun > 0 && (e.named ? e.staggerT > 0 && e.hp <= e.maxHp * TUNE.combat.namedExec : e.hp <= e.maxHp * 0.28);   // CB9
      if (s.c.backstab && !backstab && !sneak) { dmg *= DG.backMul; backstab = true; }      // CB24: the dagger heavy steps behind
      dmg *= this.styleDmgMul(s.c, e);
      if (en) dmg += en.power;
      dmg *= curseMul(this.scene, e, S.equip.weapon, ITEMS);
      if (wp.vsUndead && e.cfg?.bark === 'undead') dmg *= wp.vsUndead;
      dmg *= bl('dmgMul', 1) * (1 + 0.04 * (S.ngPlus || 0)) * (this.counterT > 0 ? P.perfect.mult : 1) * (S.hearts?.iron ? 1.1 : 1) * (this.cryT > 0 ? TUNE.player.shouts.cry.dmgMul : 1) * elixirVal('dmgMul', 1) * foodVal('dmgMul', 1);
      const riposte = this.riposteT > 0;
      if (riposte) dmg *= P.riposte.mult;
      const crit = Math.random() < stats.sum('crit');
      if (crit) dmg *= 1.8;
      if (exec || assassinate) dmg = e.hp + 999;
      const dealt = e.takeHit({
        dmg, kx: e.x - this.x, ky: e.y - this.y, kb: s.c.kb, src: 'melee', stun: riposte ? Math.max(s.c.stun, 0.9) : s.c.stun + (heavy && wp.plantStun ? wp.plantStun : 0), heavy: heavy || !!s.c.breaker, pierce: Math.max(s.c.pierce || 0, heavy ? wp.pierce || 0 : 0), poise: (s.c.poise || 1) * (riposte ? 2 : 1),
        element: en ? en.type : null, slow: en && en.type === 'frost' ? 2.5 : 0, fromX: this.x, fromY: this.y,
      });
      if (dealt <= 0) { s.hit.add(e); continue; }       // blocked by a shield
      wear(S.equip.weapon, wp.wearMul || 1);
      this.styleOnHit(s.c, e, wp);
      if (wp.pull && !e.isBoss && !e.dead) { const px = this.x - e.x, py = this.y - e.y, pd = Math.hypot(px, py) || 1; e.body.velocity.x += (px / pd) * wp.pull * 9; e.body.velocity.y += (py / pd) * wp.pull * 9; }
      if (e.dead && wp.killFreeze) for (const o of this.scene.enemies.getChildren()) if (o !== e && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) < wp.killFreeze) applyStatus(o, 'freeze', {});
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
    return { stop: settings.hitStop === false ? 0 : heavy ? f.stop * m : Math.min(TUNE.combat.hitStopCap, f.stop * m), ms: Math.round(f.ms * m), amt: f.amt * m };   // CB4: ordinary hits stay short
  },
  // ------------------------------------------------------------------ hurt
  hurt(dmg, sx, sy, opts = {}) {
    if (this.mode === 'dead' || this.mode === 'lying') return false;
    if (this.iframes > 0 || this.invuln > 0) {
      // rolling at the very last moment is a perfect dodge: slow motion, stamina back, and a counter-attack bonus
      if (this.mode === 'roll' && opts.attacker && !opts.attacker.dead && this.scene.t - (this.rollStart ?? -9) <= P.perfect.window && this.scene.t - (this.lastPerfect ?? -9) > 0.7) this.perfectDodge(opts.attacker, !!opts.ranged);
      return false;
    }
    const sc = this.scene;
    // remembered for the death screen ("SLAIN BY ...")
    this.lastHitBy = opts.attacker ? (opts.attacker.displayName || opts.attacker.cfg?.title || opts.attacker.cfg?.name || null) : opts.by || this.lastHitBy;
    if (this.swing && stats.weapon()?.swingGuard) dmg *= 1 - stats.weapon().swingGuard;
    const armoured = !!this.charging;                       // CB24: a charging greatsword shrugs off the flinch (not the damage)
    let incoming = dmg, knock = (opts.kb ?? P.hurt.kb) * classMix().knock, blocked = false;
    const crush = !!(opts.crush || (!opts.ranged && opts.attacker?.cfg?.crush));

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
        if (r.parried) { this.onParry(opts.attacker, sx, sy, opts.proj); return true; }
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
    if (!blocked) { wear(S.equip.armor, 1); wear(S.equip.head, 0.5); } else wear(S.equip.offhand, 1);
    if (!blocked && !opts.ranged && opts.attacker?.cfg?.inflicts) inflictOn(this, opts.attacker.cfg.inflicts);
    if (!blocked && Object.keys(S.mods || {}).some((m) => S.mods[m] && MODS[m]?.burnOnHit)) inflictOn(this, [{ type: 'burn', chance: 1, t: 2.5, dps: 3 }]);
    if (!blocked && opts.inflict) inflictOn(this, opts.inflict);
    this.lastHurt = sc.t;
    this.flashT = 0.12;
    this.invuln = blocked ? 0.3 : P.hurt.invuln;
    if (armoured) knock = 0;
    if (!blocked && !armoured) {
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
  onParry(attacker, sx, sy, proj = null) {
    const sc = this.scene;
    this.parried = true;                                     // CB10: this raise of the shield caught something
    sfx.play('parry'); rumble(90, 0.5, 0.5);
    this.riposteT = P.riposte.window + (styleOf(stats.weapon()) === 'sword' ? TUNE.combat.sword.riposteAdd : 0);   // strike back now (CB24: longer with a sword)
    this.invuln = 0.35;
    sc.fx.ring(this.x + this.face.x * 9, this.y + 3 + this.face.y * 9, 0.5, 0.3, 'ring', 0xeaf2f8);
    sc.fx.text(this.x, this.y - 14, 'PARRY!', 13, 0.8);
    sc.hitStop(0.1); sc.shake(120, 0.006);
    this.gainXp('oneHanded', 5);
    if (proj) { this.deflect(proj, attacker); return; }     // CB25: a parried shot flies back; the shooter is not staggered at range
    if (attacker && !attacker.dead) {
      attacker.openT = 1.8;
      if (!attacker.isBoss) attacker.stun = Math.max(attacker.stun || 0, 1.1);      // CB20: bosses use the recover below
      if (attacker.state === 'windup' || attacker.state === 'attack') { attacker.setState('recover', 0.6); attacker.marker?.destroy(); attacker.marker = null; }
      attacker.body.setVelocity(0, 0);
      sc.fx.text(attacker.x, attacker.y - 16, 'STAGGER', 12, 0.8);
    }
  },
  // CB25: a parried arrow or orb flies back at whoever loosed it (boss orbs at half strength)
  deflect(proj, owner) {
    const sc = this.scene, C = TUNE.combat.deflect;
    const tx = owner && !owner.dead && owner.active ? owner.body.center.x : proj.x - proj.body.velocity.x;
    const ty = owner && !owner.dead && owner.active ? owner.body.center.y : proj.y - proj.body.velocity.y;
    const n = norm(tx - proj.x, ty - proj.y), sp = Math.max(C.speed, Math.hypot(proj.body.velocity.x, proj.body.velocity.y));
    const dmg = Math.max(1, Math.round(proj.dmg * (owner?.isBoss ? C.bossMul : C.mul)));
    const pr = new Projectile(sc, proj.x, proj.y, 'arrow', n.x * sp, n.y * sp, { dmg, life: C.life, ally: true });
    pr.noLoot = true; pr.deflected = true;
    if (proj.texture?.key && proj.texture.key !== 'arrow') pr.setTexture(proj.texture.key).setTint(0xf4d460);
    sc.shots.add(pr); pr.body.setVelocity(n.x * sp, n.y * sp);
    sc.fx.text(this.x, this.y - 22, 'DEFLECT', 13, 0.8);
  },
  // ---------------------------------------------------------------- block
  tickBlock(dt) {
    const sh = stats.shield();
    // CB24: a sword can drop out of any combo step straight into the shield
    if (sh && this.swing && !this.swing.c.heavyAtk && styleOf(stats.weapon()) === 'sword' && keys.pressed('block') && this.mode === 'free') { this.swing = null; this.lockT = 0; }
    const want = !!sh && keys.isDown('block') && this.mode === 'free' && this.lockT <= 0 && !this.drawing && !this.swing;
    const win = P.block.parry + (S.perks.duelist ? 0.1 : 0);
    if (want && !this.blocking) {
      // CB10: a parry that caught nothing locks out the next parry window for a moment (the plain block still works)
      this.blocking = true; this.parried = false; this.blockT = this.scene.t < (this.parryLockUntil ?? -9) ? win + 0.01 : 0; sfx.play('move');
    } else if (!want && this.blocking) {
      this.blocking = false;
      if (this.blockT <= win && !this.parried) this.parryLockUntil = this.scene.t + TUNE.combat.parryLockout;
    }
    if (this.blocking) {
      this.blockT += dt;
      this.spDelay = Math.max(this.spDelay, 0.25);
      const key = heldKey(sh.id);
      this.heldImg.setTexture(this.scene.textures.exists(key) ? key : 'blade_default').setVisible(true)
        .setPosition(this.x + this.face.x * 8, this.y + 3 + this.face.y * 8).setDepth(this.y + (this.face.y < 0 ? 4 : 12))
        .setOrigin(0.5, 0.5).setRotation(0).setScale(1).setAlpha(this.blockT < 0.18 ? 1 : 0.92);
    } else if (!this.swing) this.heldImg.setVisible(false);
  },
};
