// Player bow, ammo, shouts and potions.
// Mixed into Player (see the bottom of Player.js).
import { keys } from '../systems/keys.js';
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { bonus } from '../systems/skills.js';
import { modMul } from '../data/mods.js';
import { clearStatus } from '../systems/status.js';
import { stats } from '../systems/stats.js';
import { sfx } from '../audio/sfx.js';
import Projectile from './Projectile.js';
import { tip } from '../systems/tips.js';
import { ITEMS } from '../data/items.js';
import { currentShout } from '../systems/shouts.js';
import { TUNE } from '../data/tuning.js';
const P = TUNE.player;

export const bowMethods = {
  // ------------------------------------------------------------------ bow
  // Ammo kinds in the quiver: plain arrows (S.arrows) plus crafted fire / barbed arrows (inventory).
  ammoKinds() { return ['arrow', ...['fire_arrow', 'bleed_arrow'].filter((k) => (S.inv[k] || 0) > 0)]; },
  curAmmo() { const a = S.ammo || 'arrow'; return a === 'arrow' || (S.inv[a] || 0) > 0 ? a : 'arrow'; },
  ammoLeft() { const a = this.curAmmo(); return a === 'arrow' ? S.arrows : S.inv[a]; },
  cycleAmmo() {
    const ks = this.ammoKinds(); if (ks.length < 2) { sfx.play('nostamina'); return; }
    S.ammo = ks[(ks.indexOf(this.curAmmo()) + 1) % ks.length]; sfx.play('select');
    bus.emit('toast', S.ammo === 'arrow' ? 'PLAIN ARROWS' : ITEMS[S.ammo].name.toUpperCase() + 'S', S.ammo === 'fire_arrow' ? 12 : S.ammo === 'bleed_arrow' ? 11 : 5);
  },
  bowInput() {
    this.xbowT = Math.max(0, (this.xbowT || 0) - (this.currentDt || 0));
    if (keys.pressed('ammo') && !this.drawing) this.cycleAmmo();
    if (!this.drawing) {
      if (keys.pressed('bow')) {
        if (this.xbowT > 0) { sfx.play('nostamina'); return; }
        if (this.ammoLeft() <= 0) { sfx.play('nostamina'); bus.emit('toast', 'NO ARROWS'); return; }
        if (S.sp < P.bow.startCost) { sfx.play('nostamina'); bus.emit('nostamina'); return; }
        this.drawing = true; this.drawT = 0; this.drawFull = false;
        tip('bow');
        sfx.play('draw');
      }
      return;
    }
    this.drawT += this.currentDt;
    const full = (stats.bow()?.xbow ? P.xbow.windup : P.bow.fullDraw) * bonus.drawTime();
    if (!this.drawFull && this.drawT >= full) { this.drawFull = true; this.scene.fx.puff(this.x, this.y, 13, 4, 25, 0.25); }
    if (!keys.isDown('bow')) this.releaseBow(Math.min(1, this.drawT / full));
  },
  releaseBow(charge01) {
    const X = stats.bow()?.xbow ? P.xbow : null;                  // crossbows must be fully wound; there is no half-draw
    if (X && charge01 < 1) { this.drawing = false; this.aim.setVisible(false); return; }
    const wasDrawn = this.drawT >= P.bow.minDraw;
    this.drawing = false;
    this.aim.setVisible(false);
    if (!wasDrawn) return;
    const cost = X ? X.shotCost : P.bow.shotCost + P.bow.chargeCost * charge01;
    S.sp = Math.max(0, S.sp - cost);
    this.spDelay = P.regenDelay + 0.2;
    const ammo = this.curAmmo();
    if (ammo === 'arrow') S.arrows--; else { S.inv[ammo]--; if (S.inv[ammo] <= 0) delete S.inv[ammo]; }
    const sp = X ? X.speed : P.bow.speedMin + (P.bow.speedMax - P.bow.speedMin) * charge01;
    const dmg = stats.bowDmg() * (X ? X.dmgMul : P.bow.dmgMin + (P.bow.dmgMax - P.bow.dmgMin) * charge01) * bonus.arrow();
    const f = this.face;
    const pr = new Projectile(this.scene, this.x + f.x * 8, this.y + 3 + f.y * 8, 'arrow', f.x * sp, f.y * sp, { dmg, charge: charge01, life: 0.4 + 0.5 * charge01 + 0.5, ammo, pierce: X ? X.pierce : 0 });
    if (X) this.xbowT = X.reload;
    this.scene.shots.add(pr);
    pr.body.setVelocity(f.x * sp, f.y * sp);
    sfx.play('shoot');
    this.lockT = 0.12; this.lockMove = 0.5;
    this.scene.fx.puff(this.x + f.x * 8, this.y + 3 + f.y * 8, 6, 3, 25, 0.2);
    // recoil
    this.body.velocity.x -= f.x * 25; this.body.velocity.y -= f.y * 25;
  },
  // ----------------------------------------------------------------- shout
  shout() {
    if (this.shoutCd > 0) { sfx.play('nostamina'); return; }
    const which = currentShout();
    if (which !== 'force') { this.shoutSpecial(which); return; }
    this.shoutCd = this.shoutCdMax = P.shout.cooldown;
    this.lockT = P.shout.lock; this.lockMove = 0;
    this.body.setVelocity(0, 0);
    sfx.play('shout');
    const sc = this.scene;
    sc.fx.ring(this.x, this.y + 4, P.shout.radius / 32 * 1.05, 0.5, 'ring');
    sc.fx.ring(this.x, this.y + 4, P.shout.radius / 32 * 0.7, 0.4, 'ring', 0x5cc8d8);
    sc.fx.text(this.x, this.y - 18, 'FUS!', 13, 1);
    sc.shake(320, 0.014);
    sc.flashScreen(90);
    sc.noise(this.x, this.y, 150);
    for (const e of sc.enemies.getChildren()) {
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (e.dead || d > P.shout.radius) continue;
      const push = P.shout.push * (1 - 0.35 * (d / P.shout.radius));
      e.takeHit({ dmg: P.shout.dmg, kx: e.x - this.x, ky: e.y - this.y, kb: push, stun: P.shout.stun, src: 'shout', forceStun: !e.isBoss });
      sc.fx.puff(e.x, e.y, 5, 5, 50, 0.4);
    }
    for (const sh of sc.eshots.getChildren()) if (Math.hypot(sh.x - this.x, sh.y - this.y) < P.shout.radius) sh.finish();
  },
  // --------------------------------------------------------------- potions
  usePotion(id) {
    if (!S.inv[id] && S.inv[id + '_g']) id = id + '_g';      // fall back to the greater potion
    if (!S.inv[id]) { sfx.play('nostamina'); return false; }
    const it = this.scene.items[id];
    const key = it.restore, maxKey = { hp: 'maxHp', mp: 'maxMp', sp: 'maxSp' }[key];
    if (S[key] >= S[maxKey]) return false;
    S.inv[id]--; if (S.inv[id] <= 0) delete S.inv[id];
    if (key === 'hp') clearStatus(this, 'potion');
    const amt = Math.round(it.amount * (S.hearts?.root ? 1.25 : 1) * modMul('potionMul'));
    S[key] = Math.min(S[maxKey], S[key] + amt);
    sfx.play('potion');
    this.scene.fx.puff(this.x, this.y, key === 'hp' ? 11 : key === 'mp' ? 15 : 8, 8, 30, 0.5);
    this.scene.fx.text(this.x, this.y - 12, '+' + amt, key === 'hp' ? 11 : key === 'mp' ? 15 : 8);
    return true;
  },
};
