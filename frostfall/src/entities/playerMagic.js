// Player spellcasting (mixed into Player). Spells unlock with skill levels.
import { S } from '../systems/state.js';
import { modMul } from '../data/mods.js';
import { unlockedShouts, currentShout } from '../systems/shouts.js';
import { stats } from '../systems/stats.js';
import { keys } from '../systems/keys.js';
import { bus } from '../systems/bus.js';
import { bonus } from '../systems/skills.js';
import { spellDamage, elementMult } from '../systems/damage.js';
import { sfx } from '../audio/sfx.js';
import { lvl } from '../systems/skills.js';
import Projectile from './Projectile.js';
import { TUNE } from '../data/tuning.js';
import { clearStatus } from '../systems/status.js';

// cost = mana. skill/lvl = unlock requirement.
export const SPELLS = {
  fire: { name: 'Fireball', cost: 18, dmg: 15, speed: 135, icon: 'icon_fire', col: 12, skill: 'destruction', lvl: 1, desc: 'Explodes on impact' },
  frost: { name: 'Frost Bolt', cost: 13, dmg: 7, speed: 155, icon: 'icon_frost', col: 15, skill: 'destruction', lvl: 1, desc: 'Slows enemies' },
  shock: { name: 'Lightning', cost: 22, dmg: 13, range: 118, icon: 'icon_shock', col: 13, skill: 'destruction', lvl: 4, desc: 'Chains between foes' },
  heal: { name: 'Healing', cost: 26, amount: 36, icon: 'icon_heal', col: 8, skill: 'restoration', lvl: 1, desc: 'Restores health' },
  blink: { name: 'Blink', cost: 20, icon: 'icon_blink', col: 14, skill: 'sneak', lvl: 4, desc: 'Teleport a short way, untouchable' },
  nova: { name: 'Frost Nova', cost: 30, dmg: 14, icon: 'icon_nova', col: 15, skill: 'destruction', lvl: 7, desc: 'Ring of ice around you' },
  wolf: { name: 'Spirit Wolf', cost: 34, dmg: 9, icon: 'icon_wolf', col: 15, skill: 'restoration', lvl: 5, desc: 'A spectral wolf fights for you' },
  embernova: { name: 'Ember Nova', cost: 36, dmg: 18, icon: 'icon_embernova', col: 12, skill: 'destruction', lvl: 99, tome: true, desc: 'A ring of fire that burns' },
  glacier: { name: 'Glacier Spear', cost: 28, dmg: 20, icon: 'icon_glacier', col: 15, skill: 'destruction', lvl: 99, tome: true, desc: 'A lance of ice through a whole line' },
  meteor: { name: 'Meteor', cost: 48, dmg: 38, icon: 'icon_meteor', col: 12, skill: 'destruction', lvl: 99, tome: true, desc: 'A star falls where you aim' },
  ward: { name: 'Ward', cost: 30, absorb: 30, time: 8, icon: 'icon_ward', col: 15, skill: 'restoration', lvl: 3, desc: 'Absorbs damage' },
};
export const SPELL_ORDER = ['fire', 'frost', 'shock', 'heal', 'ward', 'blink', 'nova', 'embernova', 'glacier', 'wolf', 'meteor'];
export const spellUnlocked = (id) => !!S.tomes?.[id] || lvl(SPELLS[id].skill) >= SPELLS[id].lvl;

export const magicMethods = {
  // Mana cost climbs while casts are chained (overcast), and cools off again.
  // Spell strength: skill, the staff in hand (all spells, plus its favoured element) and its crit chance.
  spellPow() {
    const w = stats.weapon() || {};
    let m = bonus.spell() * (w.spellMul ?? 1) * (w.elemMul?.[S.spell] ?? 1);
    if (w.spellCrit && Math.random() < w.spellCrit) { m *= 1.6; this.scene.fx.text(this.x, this.y - 22, 'SPELL CRIT', 15, 0.7); }
    return m;
  },
  spellCost(sp) {
    const w = stats.weapon() || {};
    return sp.cost * (w.manaCostMul ?? 1) * (w.spellCost?.[S.spell] ?? 1) * bonus.manaCost() * (S.perks.spellweaver ? 0.8 : 1) * stats.trait('manaCostMul') * modMul('manaMul') * (1 + (this.heat || 0) * TUNE.player.cast.heatCost);
  },

  quickCast() {
    for (let i = 0; i < SPELL_ORDER.length; i++) {
      if (!keys.pressed('spell' + (i + 1))) continue;
      if (!spellUnlocked(SPELL_ORDER[i])) { sfx.play('nostamina'); bus.emit('toast', 'SPELL LOCKED', 11); return true; }
      S.spell = SPELL_ORDER[i]; this.cast(); return true;
    }
    return false;
  },

  nextSpell() {
    let i = SPELL_ORDER.indexOf(S.spell);
    for (let k = 0; k < SPELL_ORDER.length; k++) {
      i = (i + 1) % SPELL_ORDER.length;
      if (spellUnlocked(SPELL_ORDER[i])) { S.spell = SPELL_ORDER[i]; return; }
    }
  },

  cast() {
    if (!spellUnlocked(S.spell)) S.spell = 'fire';
    const sp = SPELLS[S.spell];
    const cost = this.spellCost(sp);
    if (S.mp < cost) { sfx.play('nostamina'); bus.emit('nomana'); return; }
    if (S.spell === 'heal' && S.hp >= S.maxHp) { sfx.play('nostamina'); return; }
    const wpn = stats.weapon() || {};
    const freeCast = (S.perks.archmage && ((this.castN = (this.castN || 0) + 1) % 4 === 0)) || (wpn.freeEvery && ((this.castW = (this.castW || 0) + 1) % wpn.freeEvery === 0));
    if (freeCast) this.scene.fx.text(this.x, this.y - 16, 'FREE CAST', 15, 0.6);
    S.mp -= freeCast ? 0 : cost; this.mpDelay = 1.2;
    this.heat = Math.min(TUNE.player.cast.heatMax, (this.heat || 0) + 1);
    const sc = this.scene, f = this.face;
    this.lockT = TUNE.player.cast.lock; this.lockMove = TUNE.player.cast.move;
    switch (S.spell) {
      case 'fire':
      case 'frost': {
        const dmg = spellDamage({ base: sp.dmg, skill: this.spellPow(), perk: S.perks.pyromancer && S.spell === 'fire' ? 1.15 : 1 });
        const pr = new Projectile(sc, this.x + f.x * 9, this.y + 3 + f.y * 9, S.spell, f.x * sp.speed, f.y * sp.speed, { dmg, life: S.spell === 'fire' ? 1.1 : 1.3 });
        sc.shots.add(pr);
        pr.body.setVelocity(f.x * sp.speed, f.y * sp.speed);
        sfx.play(S.spell === 'fire' ? 'fire' : 'frost');
        sc.fx.puff(this.x + f.x * 8, this.y + 3 + f.y * 8, sp.col, 6, 40, 0.3);
        break;
      }
      case 'shock': this.castShock(sp); break;
      case 'heal': {
        const amt = Math.round(sp.amount * bonus.heal() * (S.perks.mender ? 1.3 : 1));
        S.hp = Math.min(S.maxHp, S.hp + amt);
        sfx.play('heal');
        sc.fx.text(this.x, this.y - 12, '+' + amt, 8);
        sc.fx.puff(this.x, this.y, 8, 10, 30, 0.7, -25);
        sc.fx.ring(this.x, this.y + 4, 0.5, 0.5, 'ring', 0x3f7050);
        this.gainXp('restoration', 6);
        break;
      }
      case 'ward': {
        this.ward = { hp: sp.absorb * bonus.ward() * (S.perks.warding ? 1.35 : 1) * (wpn.wardMul ?? 1), t: (sp.time + (S.perks.warding ? 3 : 0)) * (wpn.wardTime ?? 1) };
        sfx.play('ward');
        sc.fx.ring(this.x, this.y + 4, 0.7, 0.5, 'ring', 0x5cc8d8);
        this.gainXp('restoration', 5);
        break;
      }
      case 'blink': {
        let d = 0;
        const dx = f.x, dy = f.y, steps = 8, stepLen = 8;
        for (let k = 1; k <= steps; k++) { if (sc.solidAt(this.x + dx * k * stepLen, this.y + 6 + dy * k * stepLen)) break; d = k * stepLen; }
        sc.fx.puff(this.x, this.y, 14, 10, 40, 0.4);
        this.setPosition(this.x + dx * d, this.y + dy * d);
        this.body.updateFromGameObject();
        this.iframes = Math.max(this.iframes, 0.3);
        sc.fx.puff(this.x, this.y, 14, 10, 40, 0.4); sc.fx.ring(this.x, this.y + 4, 0.5, 0.3, 'ring', 0x8a5aa8);
        sfx.play('roll'); this.gainXp('sneak', 5);
        break;
      }
      case 'nova': {
        const R = 58;
        sfx.play('frost'); sc.shake(180, 0.007);
        sc.fx.ring(this.x, this.y + 4, R / 32, 0.5, 'ring', 0x5cc8d8); sc.fx.ring(this.x, this.y + 4, R / 46, 0.35, 'ring', 0xeaf2f8);
        for (const e of sc.enemies.getChildren()) {
          if (e.dead || Math.hypot(e.x - this.x, e.y - this.y) > R) continue;
          const dealt = e.takeHit({ dmg: spellDamage({ base: sp.dmg, skill: this.spellPow(), perk: 1 }), kx: e.x - this.x, ky: e.y - this.y, kb: 130, src: 'frost', element: 'frost', slow: 4, stun: 0.6 });
          sc.fx.text(e.x, e.y - 10, String(dealt), 15); sc.fx.puff(e.x, e.y, 15, 6, 40, 0.3);
        }
        for (const sh of sc.eshots.getChildren()) if (Math.hypot(sh.x - this.x, sh.y - this.y) < R) sh.finish();
        this.gainXp('destruction', 6);
        break;
      }
      case 'embernova': {
        const R = 64;
        sfx.play('fire'); sc.shake(200, 0.008);
        sc.fx.ring(this.x, this.y + 4, R / 32, 0.5, 'ring', 0xf08a30); sc.fx.ring(this.x, this.y + 4, R / 46, 0.35, 'ring', 0xf4d460);
        for (const e of sc.enemies.getChildren()) {
          if (e.dead || Math.hypot(e.x - this.x, e.y - this.y) > R) continue;
          const dealt = e.takeHit({ dmg: spellDamage({ base: sp.dmg, skill: this.spellPow(), perk: S.perks.pyromancer ? 1.15 : 1 }), kx: e.x - this.x, ky: e.y - this.y, kb: 110, src: 'fire', element: 'fire', stun: 0.4, status: { type: 'burn', t: 4, dps: 5 } });
          sc.fx.text(e.x, e.y - 10, String(dealt), 12); sc.fx.puff(e.x, e.y, 12, 6, 40, 0.3);
        }
        for (const sh of sc.eshots.getChildren()) if (Math.hypot(sh.x - this.x, sh.y - this.y) < R) sh.finish();
        this.gainXp('destruction', 7);
        break;
      }
      case 'glacier': {
        const LEN = 128, W2 = 22;
        sfx.play('frost'); sc.shake(150, 0.006);
        for (let k = 1; k <= 8; k++) sc.fx.puff(this.x + f.x * k * 16, this.y + 3 + f.y * k * 16, 15, 5, 40, 0.4);
        for (const e of sc.enemies.getChildren()) {
          const dx = e.x - this.x, dy = e.y - (this.y + 3), along = dx * f.x + dy * f.y, across = Math.abs(dx * -f.y + dy * f.x);
          if (e.dead || along < 0 || along > LEN || across > W2 / 2) continue;
          const dealt = e.takeHit({ dmg: spellDamage({ base: sp.dmg, skill: this.spellPow(), perk: 1 }), kx: f.x, ky: f.y, kb: 90, src: 'frost', element: 'frost', slow: 3, stun: 0.35 });
          sc.fx.text(e.x, e.y - 10, String(dealt), 15);
        }
        for (const sh of sc.eshots.getChildren()) { const dx = sh.x - this.x, dy = sh.y - this.y; if ((dx * f.x + dy * f.y) > 0 && Math.hypot(dx, dy) < LEN) sh.finish(); }
        this.gainXp('destruction', 6);
        break;
      }
      case 'meteor': {
        const tg = this.target && !this.target.dead ? { x: this.target.x, y: this.target.y } : { x: this.x + f.x * 70, y: this.y + 3 + f.y * 70 };
        const R = 38, dmg = spellDamage({ base: sp.dmg, skill: this.spellPow(), perk: S.perks.pyromancer ? 1.15 : 1 });
        sfx.play('telegraph'); sc.fx.ring(tg.x, tg.y + 4, R / 32, 0.9, 'ring', 0xf08a30);
        sc.time.delayedCall(900, () => {
          if (!sc.scene.isActive('Game')) return;
          sc.shake(320, 0.012); sfx.play('fire'); sc.fx.puff(tg.x, tg.y, 12, 16, 80, 0.7); sc.fx.puff(tg.x, tg.y, 13, 10, 50, 0.6); sc.fx.ring(tg.x, tg.y + 4, R / 24, 0.45, 'ring', 0xf4d460);
          for (const e of sc.enemies.getChildren()) {
            if (e.dead || Math.hypot(e.x - tg.x, e.y - tg.y) > R) continue;
            const dealt = e.takeHit({ dmg, kx: e.x - tg.x, ky: e.y - tg.y, kb: 190, src: 'fire', element: 'fire', stun: 0.8, forceStun: !e.isBoss, status: { type: 'burn', t: 4, dps: 6 } });
            sc.fx.text(e.x, e.y - 10, String(dealt), 12);
          }
          this.gainXp('destruction', 10);
        });
        this.gainXp('destruction', 4);
        break;
      }
      case 'wolf': {
        sc.summonSpiritWolf(this);
        sfx.play('howl'); this.gainXp('restoration', 6);
        break;
      }
      default: break;
    }
  },

  // ---- shouts (Force is the base shout; the others come with the Hearts)
  swapShout() {
    const list = unlockedShouts();
    if (list.length < 2) { sfx.play('nostamina'); return; }
    S.shout = list[(list.indexOf(currentShout()) + 1) % list.length];
    sfx.play('select'); bus.emit('toast', TUNE.player.shouts[S.shout].name, TUNE.player.shouts[S.shout].col);
  },

  shoutSpecial(id) {
    const sc = this.scene, T = TUNE.player.shouts[id], f = this.face;
    this.shoutCd = this.shoutCdMax = T.cd;
    this.lockT = 0.5; this.lockMove = 0;
    this.body.setVelocity(0, 0);
    sfx.play('shout'); sc.shake(260, 0.01); sc.flashScreen(70); sc.noise(this.x, this.y, 150);
    const col = { frost: 0x9fe8ff, cry: 0xf08a30, surge: 0x3f7050, grasp: 0x3f7050, hearthcall: 0xf4d460, cinderstep: 0xf08a30 }[id];
    if (id === 'frost') {
      sc.fx.text(this.x, this.y - 18, 'FROST BREATH', 15, 1);
      for (let i = -3; i <= 3; i++) { const a = Math.atan2(f.y, f.x) + i * 0.18; sc.fx.puff(this.x + Math.cos(a) * 30, this.y + 3 + Math.sin(a) * 30, 15, 6, 90, 0.6); sc.fx.puff(this.x + Math.cos(a) * 60, this.y + 3 + Math.sin(a) * 60, 6, 5, 70, 0.5); }
      for (const e of sc.enemies.getChildren()) {
        const dx = e.x - this.x, dy = e.y - this.y, d = Math.hypot(dx, dy);
        if (e.dead || d > T.r || d < 1 || (dx * f.x + dy * f.y) / d < 0.5) continue;
        const dealt = e.takeHit({ dmg: T.dmg * bonus.spell(), kx: dx, ky: dy, kb: 60, src: 'frost', element: 'frost', slow: T.slow, stun: 0.5, forceStun: !e.isBoss });
        sc.fx.text(e.x, e.y - 10, String(dealt), 15);
      }
      for (const sh of sc.eshots.getChildren()) { const dx = sh.x - this.x, dy = sh.y - this.y; if (Math.hypot(dx, dy) < T.r && (dx * f.x + dy * f.y) > 0) sh.finish(); }
    } else if (id === 'cry') {
      this.cryT = T.time;
      sc.fx.text(this.x, this.y - 18, 'BATTLE CRY!', 12, 1);
      sc.fx.ring(this.x, this.y + 4, 1.4, 0.5, 'ring', 0xf08a30); sc.fx.ring(this.x, this.y + 4, 2.2, 0.7, 'ring', 0xf4d460);
      for (const e of sc.enemies.getChildren()) {
        if (e.dead || Math.hypot(e.x - this.x, e.y - this.y) > T.r) continue;
        e.takeHit({ dmg: 1, kx: e.x - this.x, ky: e.y - this.y, kb: 160, src: 'shout', stun: 0.7, forceStun: !e.isBoss });
      }
      S.sp = Math.min(S.maxSp, S.sp + 30);
    } else if (id === 'surge') {
      sc.fx.text(this.x, this.y - 18, 'TIDAL SURGE', 8, 1);
      for (let k = 1; k <= 7; k++) sc.fx.puff(this.x + f.x * k * 17, this.y + 3 + f.y * k * 17, 15, 6, 60, 0.5);
      for (const e of sc.enemies.getChildren()) {
        const dx = e.x - this.x, dy = e.y - this.y, along = dx * f.x + dy * f.y, across = Math.abs(dx * -f.y + dy * f.x);
        if (e.dead || along < 0 || along > T.len || across > T.w / 2) continue;
        const dealt = e.takeHit({ dmg: T.dmg, kx: f.x, ky: f.y, kb: T.kb, src: 'shout', element: 'shock', stun: 1.1, forceStun: !e.isBoss });
        sc.fx.text(e.x, e.y - 10, String(dealt), 8);
      }
      for (const sh of sc.eshots.getChildren()) { const dx = sh.x - this.x, dy = sh.y - this.y; if ((dx * f.x + dy * f.y) > 0 && Math.hypot(dx, dy) < T.len) sh.finish(); }
    } else if (id === 'fire') {
      sc.fx.text(this.x, this.y - 18, 'DRAGONFIRE', 12, 1);
      sc.shake(380, 0.014);
      for (let i = -4; i <= 4; i++) { const a = Math.atan2(f.y, f.x) + i * 0.17; for (const rr of [26, 52, 78]) sc.fx.puff(this.x + Math.cos(a) * rr, this.y + 3 + Math.sin(a) * rr, i % 2 ? 12 : 13, 6, 80, 0.6); }
      for (const e of sc.enemies.getChildren()) {
        const dx = e.x - this.x, dy = e.y - this.y, d = Math.hypot(dx, dy);
        if (e.dead || d > T.r || d < 1 || (dx * f.x + dy * f.y) / d < 0.45) continue;
        const dealt = e.takeHit({ dmg: T.dmg * bonus.spell(), kx: dx, ky: dy, kb: 120, src: 'fire', element: 'fire', stun: 0.5, forceStun: !e.isBoss });
        e.dot = { dps: T.burn, t: 4, col: 12, acc: 0, tick: 0 };
        sc.fx.text(e.x, e.y - 10, String(dealt), 12);
      }
      sc.breakAt(this.x + f.x * 40, this.y + f.y * 40, 40);
      for (const sh of sc.eshots.getChildren()) { const dx = sh.x - this.x, dy = sh.y - this.y; if (Math.hypot(dx, dy) < T.r && (dx * f.x + dy * f.y) > 0) sh.finish(); }
    } else if (id === 'hearthcall') {
      sc.fx.text(this.x, this.y - 18, 'HEARTHCALL', 8, 1);
      sc.fx.ring(this.x, this.y + 4, T.r / 32, 0.6, 'ring', 0xf4d460); sc.fx.puff(this.x, this.y, 13, 14, 40, 0.6);
      S.hp = Math.min(S.maxHp, S.hp + Math.round(S.maxHp * T.heal));
      if (this.statuses) clearStatus(this, 'potion');
    } else if (id === 'cinderstep') {
      sc.fx.text(this.x, this.y - 18, 'CINDERSTEP', 12, 1);
      const L = T.len;
      for (const e of sc.enemies.getChildren()) {
        const dx = e.x - this.x, dy = e.y - (this.y + 3), along = dx * f.x + dy * f.y, across = Math.abs(dx * -f.y + dy * f.x);
        if (e.dead || along < 0 || along > L || across > 16) continue;
        const dealt = e.takeHit({ dmg: T.dmg * bonus.spell(), kx: f.x, ky: f.y, kb: 90, src: 'fire', element: 'fire', stun: 0.4, status: { type: 'burn', t: 3, dps: T.burn } });
        sc.fx.text(e.x, e.y - 10, String(dealt), 12);
      }
      for (let k = 1; k <= 6; k++) sc.fx.puff(this.x + f.x * k * (L / 6), this.y + 3 + f.y * k * (L / 6), k % 2 ? 12 : 13, 6, 40, 0.5);
      let d = L; while (d > 8 && sc.solidAt(this.x + f.x * d, this.y + 4 + f.y * d)) d -= 8;
      this.setPosition(this.x + f.x * d, this.y + f.y * d); this.body.updateFromGameObject(); this.iframes = Math.max(this.iframes, 0.35);
    } else if (id === 'grasp') {
      sc.fx.text(this.x, this.y - 18, 'VERDANT GRASP', 8, 1);
      sc.fx.ring(this.x, this.y + 4, T.r / 32, 0.6, 'ring', 0x3f7050);
      for (const e of sc.enemies.getChildren()) {
        if (e.dead || Math.hypot(e.x - this.x, e.y - this.y) > T.r) continue;
        e.stun = Math.max(e.stun || 0, e.isBoss ? 0.7 : T.root); e.body.setVelocity(0, 0);
        e.dot = { dps: T.dps, t: T.root, col: 8, acc: 0, tick: 0 };
        sc.fx.puff(e.x, e.y + 4, 8, 8, 30, 0.5);
      }
    }
  },

  castShock(sp) {
    const sc = this.scene, f = this.face;
    sfx.play('shock');
    const ox = this.x + f.x * 6, oy = this.y + 3 + f.y * 6;
    let first = null, best = 1e9;
    for (const e of sc.enemies.getChildren()) {
      if (e.dead) continue;
      const dx = e.x - ox, dy = e.y + 2 - oy, d = Math.hypot(dx, dy);
      if (d > sp.range || d < 1) continue;
      if ((dx * f.x + dy * f.y) / d < 0.82) continue;           // inside a narrow cone
      if (!sc.hasLOS(ox, oy, e.x, e.y)) continue;
      if (d < best) { best = d; first = e; }
    }
    const pts = [{ x: ox, y: oy }];
    if (!first) {
      pts.push({ x: ox + f.x * sp.range * 0.8, y: oy + f.y * sp.range * 0.8 });
      sc.fx.bolt(pts, 13);
      return;
    }
    const hitSet = new Set([first]);
    let cur = first, mult = 1;
    for (let hop = 0; hop < 3 + ((stats.weapon() || {}).chainAdd || 0) && cur; hop++) {
      pts.push({ x: cur.x, y: cur.y + 2 });
      const base = spellDamage({ base: sp.dmg, skill: this.spellPow(), perk: mult });
      const dealt = cur.takeHit({ dmg: base, kx: cur.x - ox, ky: cur.y - oy, kb: 30, src: 'shock', element: 'shock', stun: 0.35 });
      sc.fx.text(cur.x, cur.y - 10, String(dealt), 13);
      sc.fx.puff(cur.x, cur.y, 13, 6, 40, 0.3);
      this.gainXp('destruction', 3 + (cur.dead ? 3 : 0));
      mult *= 0.6;
      let nxt = null, nd = 52;
      for (const e of sc.enemies.getChildren()) {
        if (e.dead || hitSet.has(e)) continue;
        const d = Math.hypot(e.x - cur.x, e.y - cur.y);
        if (d < nd) { nd = d; nxt = e; }
      }
      if (nxt) hitSet.add(nxt);
      cur = nxt;
    }
    sc.fx.bolt(pts, 13);
    sc.hitStop(0.04);
    sc.breakAt(first.x, first.y, 10);
  },

  // A staff's heavy attack: a weak bolt of its own element that costs stamina, not mana.
  staffBolt() {
    const w = stats.weapon() || {}, T = TUNE.player.staff, sc = this.scene, f = this.face;
    if (!this.spend(T.boltCost)) return;
    const kind = w.bolt === 'fire' ? 'fire' : 'frost', sp = SPELLS[kind];
    const dmg = spellDamage({ base: T.boltDmg + (w.dmg || 0) * T.boltWeaponMul, skill: bonus.spell() * (w.spellMul ?? 1), perk: 1 });
    this.lockT = TUNE.player.cast.lock; this.lockMove = TUNE.player.cast.move;
    const pr = new Projectile(sc, this.x + f.x * 9, this.y + 3 + f.y * 9, kind, f.x * sp.speed, f.y * sp.speed, { dmg, life: 1 });
    sc.shots.add(pr); pr.body.setVelocity(f.x * sp.speed, f.y * sp.speed);
    sfx.play(kind === 'fire' ? 'fire' : 'frost');
    sc.fx.puff(this.x + f.x * 8, this.y + 3 + f.y * 8, sp.col, 5, 36, 0.25);
    this.gainXp('destruction', 1);
  },

  tickWard(dt) {
    const w = this.ward;
    if (!w) { this.wardImg?.setVisible(false); return; }
    w.t -= dt;
    if (w.t <= 0 || w.hp <= 0) { this.ward = null; this.wardImg?.setVisible(false); this.scene.fx.puff(this.x, this.y, 15, 8, 40, 0.3); return; }
    if (!this.wardImg) this.wardImg = this.scene.add.image(this.x, this.y, 'ring_small').setTint(0x5cc8d8);
    const pulse = 0.55 + Math.sin(this.scene.t * 6) * 0.08;
    this.wardImg.setVisible(true).setPosition(this.x, this.y + 3).setScale(0.62).setAlpha(Math.min(1, w.t) * pulse + 0.2).setDepth(this.y + 30);
  },
};
