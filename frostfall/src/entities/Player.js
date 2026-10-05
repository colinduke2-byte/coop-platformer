import Phaser from 'phaser';
import { keys } from '../systems/keys.js';
import { S } from '../systems/state.js';
import { dir8, facingKind } from '../util.js';

export const P = {
  speed: 72,
  sneakSpeed: 38,
  accel: 900,
};

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'spr_player', 'down0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setSize(8, 7).setOffset(4, 9);
    this.body.setMaxVelocity(200, 200);
    this.shadow = scene.add.image(x, y, 'shadow');
    this.face = { x: 0, y: 1 };
    this.phase = 0;
    this.sneaking = false;
  }

  get feetY() { return this.y + 7; }

  update(dt) {
    const ix = (keys.isDown('right') ? 1 : 0) - (keys.isDown('left') ? 1 : 0);
    const iy = (keys.isDown('down') ? 1 : 0) - (keys.isDown('up') ? 1 : 0);
    this.sneaking = keys.isDown('sneak');
    const sp = this.sneaking ? P.sneakSpeed : P.speed;
    const l = Math.hypot(ix, iy) || 1;
    const tx = (ix / l) * sp, ty = (iy / l) * sp;
    const b = this.body;
    const a = P.accel * dt;
    b.velocity.x = Phaser.Math.Linear(b.velocity.x, tx, Math.min(1, a / Math.max(1, Math.abs(tx - b.velocity.x))));
    b.velocity.y = Phaser.Math.Linear(b.velocity.y, ty, Math.min(1, a / Math.max(1, Math.abs(ty - b.velocity.y))));
    if (ix || iy) this.face = dir8(ix, iy);
    const moving = Math.hypot(b.velocity.x, b.velocity.y) > 8;
    if (moving) this.phase += Math.hypot(b.velocity.x, b.velocity.y) * dt * 0.16;
    this.animate(moving);
    this.shadow.setPosition(this.x, this.y + 7).setDepth(this.y + 6);
    this.setDepth(this.y + 8);
  }

  animate(moving) {
    const kind = facingKind(this.face.x, this.face.y);
    const fr = moving ? 1 + (Math.floor(this.phase) % 2) : 0;
    this.setFrame(kind + fr);
    this.setFlipX(kind === 'side' && this.face.x < 0);
    this.setTint(this.sneaking ? 0x9aa9d0 : 0xffffff);
  }
}
