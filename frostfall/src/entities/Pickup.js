import Phaser from 'phaser';
import { S } from '../systems/state.js';
import { addItem, addGold, addArrows } from '../systems/inventory.js';
import { sfx } from '../audio/sfx.js';
import { rand } from '../util.js';
import { HEARTS } from '../data/hearts.js';
import { recalc } from '../systems/stats.js';
import { bus } from '../systems/bus.js';
import { ITEMS } from '../data/items.js';
import { RARITY } from '../systems/genloot.js';
import { C } from '../config.js';

// spec: { type: 'gold'|'arrows'|'item', n, id }
export default class Pickup extends Phaser.GameObjects.Image {
  constructor(scene, x, y, spec) {
    const tex = spec.type === 'orb' ? 'orb_' + spec.kind : spec.type === 'gold' ? 'mini_coin' : spec.type === 'arrows' ? 'icon_arrows' : spec.type === 'heart' ? 'icon_frostheart' : 'icon_' + spec.id;
    super(scene, x, y, tex);
    scene.add.existing(this);
    this.spec = spec;
    this.t = 0;
    this.gx = x; this.gy = y;
    this.vx = rand(-30, 30); this.vy = rand(-45, -20);
    this.z = 0; this.vz = rand(60, 90);
    this.done = false;
    if (spec.type !== 'gold' && spec.type !== 'orb') this.setScale(0.75);
    const rar = spec.type === 'item' && ITEMS[spec.id]?.rarity;
    if (rar && rar !== 'common') {
      const col = RARITY.find((r) => r.id === rar).col;
      this.halo = scene.add.image(x, y, 'glow').setTint(C[col]).setBlendMode(Phaser.BlendModes.ADD).setScale(0.55).setAlpha(0.8);
    }
    this.shadow = scene.add.image(x, y + 3, 'shadow').setAlpha(0.7).setScale(0.6);
  }

  update(dt, player) {
    if (this.done) return;
    this.t += dt;
    if (this.z > 0 || this.vz > 0) {
      this.vz -= 300 * dt; this.z = Math.max(0, this.z + this.vz * dt);
      if (this.z === 0) { this.vz = 0; this.vx = this.vy = 0; }
      const nx = this.gx + this.vx * dt, ny = this.gy + this.vy * dt;
      if (!this.scene.solidAt(nx, ny)) { this.gx = nx; this.gy = ny; } else { this.vx = this.vy = 0; }
    }
    const bob = this.z > 0 ? 0 : Math.sin(this.t * 4) * 1.5;
    this.setPosition(this.gx, Math.round(this.gy - this.z - 4 + bob));
    this.shadow.setPosition(this.gx, this.gy + 1).setDepth(this.gy - 1);
    this.setDepth(this.gy + 5);
    this.halo?.setPosition(this.x, this.y).setDepth(this.gy + 4).setAlpha(0.55 + 0.25 * Math.sin(this.t * 5));
    if (this.t < (this.spec.big ? 1.2 : 0.45)) return;
    const dx = player.x - this.gx, dy = player.y + 3 - this.gy;
    const d = Math.hypot(dx, dy);
    if (d < (this.spec.big ? 400 : 34) && player.mode !== 'dead') { // magnet
      const sp = (this.spec.big ? 70 : 90) * dt;
      this.gx += (dx / (d || 1)) * Math.min(sp, d); this.gy += (dy / (d || 1)) * Math.min(sp, d);
    }
    if (d < 9) this.collect();
  }

  collect() {
    this.done = true;
    const s = this.spec;
    if (s.type === 'orb') { this.scene.collectOrb?.(s.kind); sfx.play('pickup'); }
    else if (s.type === 'gold') { addGold(s.n); sfx.play('coin'); }
    else if (s.type === 'arrows') { addArrows(s.n); sfx.play('pickup'); }
    else if (s.type === 'heart') { S.hearts = S.hearts || {}; S.hearts[s.id] = true; recalc(); sfx.play('levelup'); bus.emit('toast', HEARTS[s.id].name.toUpperCase() + ' CLAIMED', 15); bus.emit('heart', s.id); }
    else { addItem(s.id, s.n || 1); sfx.play('pickup'); }
    this.scene.fx.puff(this.gx, this.gy - 4, 13, 4, 25, 0.25);
    this.shadow.destroy();
    this.halo?.destroy();
    this.destroy();
  }
}
