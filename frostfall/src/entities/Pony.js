import Phaser from 'phaser';
import { S } from '../systems/state.js';
import { sfx } from '../audio/sfx.js';
import { bus } from '../systems/bus.js';
import { TILE } from '../config.js';
import { dist } from '../util.js';

export const PONY_SPEED = 1.55;                // mounted speed multiplier
export const PONY_DRAIN = 2.5;                 // stamina per second off the roads
// Your pony: it follows you outdoors; stand beside it and press E to ride or get off. Faster on foot's terms, free on roads, tiring off them.
export default class Pony extends Phaser.GameObjects.Image {
  constructor(scene, x, y) {
    super(scene, x, y, 'spr_pony', 'side0');
    scene.add.existing(this);
    this.shadow = scene.add.image(x, y, 'shadow');
    this.t = 0; this.fx = 1;
  }
  get ix() { return this.x; }
  get iy() { return this.y; }
  canInteract() { return this.active && !this.scene.leaving; }
  label() { return S.mounted ? 'E: GET OFF' : 'E: RIDE PONY'; }
  interact() { if (S.mounted) this.dismount(); else this.mount(); }
  mount() {
    const p = this.scene.player;
    if (p.mode !== 'free' || S.mounted) return;
    S.mounted = true; p.mountOffset = true; p.setOrigin(0.5, 0.62);
    p.swing = null; p.drawing = false;
    sfx.play('select'); bus.emit('toast', 'ON THE PONY: FAST ON ROADS, TIRING OFF THEM', 15);
  }
  dismount(tired = false) {
    if (!S.mounted) return;
    const p = this.scene.player;
    S.mounted = false; p.setOrigin(0.5, 0.5);
    if (tired) bus.emit('toast', 'THE PONY TIRES', 4);
    this.setPosition(p.x, p.y + 3);
  }
  update(dt, player) {
    this.t += dt;
    const moving = Math.hypot(player.body.velocity.x, player.body.velocity.y) > 8;
    if (S.mounted) {
      this.setPosition(player.x, player.y + 4);
      if (player.face.x) this.fx = Math.sign(player.face.x);
      const tile = this.scene.tileIdAt(player.x, player.y + 7);
      if (moving && tile !== TILE.PATH && tile !== TILE.PATH2) { S.sp = Math.max(0, S.sp - PONY_DRAIN * dt); player.spDelay = Math.max(player.spDelay || 0, 0.3); if (S.sp <= 0) this.dismount(true); }
    } else if (this.scene.leaving !== true) {
      const d = dist(this.x, this.y, player.x, player.y);
      if (d > 220) this.setPosition(player.x - 20, player.y + 6);
      else if (d > 36) { const k = Math.min(1, 74 * dt / d); this.x += (player.x - this.x) * k; this.y += (player.y + 4 - this.y) * k; if (Math.abs(player.x - this.x) > 3) this.fx = Math.sign(player.x - this.x); }
    }
    const walk = (S.mounted ? moving : d2(this, player) > 36) ? 1 + (Math.floor(this.t * 9) % 2) : 0;
    this.setFrame('side' + walk).setFlipX(this.fx < 0);
    this.setDepth(this.y + (S.mounted ? 4 : 5));
    this.shadow.setPosition(this.x, this.y + 6).setDepth(this.y - 1).setScale(1.3, 1);
  }
}
const d2 = (a, b) => dist(a.x, a.y, b.x, b.y);
