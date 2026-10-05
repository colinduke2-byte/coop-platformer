// Player spellcasting (mixed into Player). Spells unlock with skill levels.
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { bonus } from '../systems/skills.js';
import { spellDamage, elementMult } from '../systems/damage.js';
import { sfx } from '../audio/sfx.js';
import { lvl } from '../systems/skills.js';
import Projectile from './Projectile.js';
import { TUNE } from '../data/tuning.js';

// cost = mana. skill/lvl = unlock requirement.
export const SPELLS = {
  fire: { name: 'Fireball', cost: 18, dmg: 15, speed: 135, icon: 'icon_fire', col: 12, skill: 'destruction', lvl: 1, desc: 'Explodes on impact' },
  frost: { name: 'Frost Bolt', cost: 13, dmg: 7, speed: 155, icon: 'icon_frost', col: 15, skill: 'destruction', lvl: 1, desc: 'Slows enemies' },
  shock: { name: 'Lightning', cost: 22, dmg: 13, range: 118, icon: 'icon_shock', col: 13, skill: 'destruction', lvl: 4, desc: 'Chains between foes' },
  heal: { name: 'Healing', cost: 26, amount: 36, icon: 'icon_heal', col: 8, skill: 'restoration', lvl: 1, desc: 'Restores health' },
  ward: { name: 'Ward', cost: 30, absorb: 30, time: 8, icon: 'icon_ward', col: 15, skill: 'restoration', lvl: 3, desc: 'Absorbs damage' },
};
export const SPELL_ORDER = ['fire', 'frost', 'shock', 'heal', 'ward'];
export const spellUnlocked = (id) => lvl(SPELLS[id].skill) >= SPELLS[id].lvl;

export const magicMethods = {
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
    const cost = sp.cost * bonus.manaCost() * (S.perks.spellweaver ? 0.8 : 1);
    if (S.mp < cost) { sfx.play('nostamina'); bus.emit('nomana'); return; }
    if (S.spell === 'heal' && S.hp >= S.maxHp) { sfx.play('nostamina'); return; }
    S.mp -= cost; this.mpDelay = 1.2;
    const sc = this.scene, f = this.face;
    this.lockT = TUNE.player.cast.lock; this.lockMove = TUNE.player.cast.move;
    switch (S.spell) {
      case 'fire':
      case 'frost': {
        const dmg = spellDamage({ base: sp.dmg, skill: bonus.spell(), perk: S.perks.pyromancer && S.spell === 'fire' ? 1.15 : 1 });
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
        this.ward = { hp: sp.absorb * bonus.ward() * (S.perks.warding ? 1.35 : 1), t: sp.time + (S.perks.warding ? 3 : 0) };
        sfx.play('ward');
        sc.fx.ring(this.x, this.y + 4, 0.7, 0.5, 'ring', 0x5cc8d8);
        this.gainXp('restoration', 5);
        break;
      }
      default: break;
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
    for (let hop = 0; hop < 3 && cur; hop++) {
      pts.push({ x: cur.x, y: cur.y + 2 });
      const base = spellDamage({ base: sp.dmg, skill: bonus.spell(), perk: mult });
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
