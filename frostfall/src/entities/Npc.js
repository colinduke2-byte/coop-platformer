import Phaser from 'phaser';
import { SCRIPTS, NPC_DEFS } from '../data/dialogue.js';
import { runScript } from '../systems/dialogue.js';
import { txtS, textW } from '../art/font.js';
import { facingKind } from '../util.js';

export default class Npc extends Phaser.GameObjects.Sprite {
  constructor(scene, x, y, id) {
    const def = NPC_DEFS[id];
    super(scene, x, y, def.tex, 'down0');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.body.setSize(10, 7).setOffset(3, 9);
    this.id = id;
    this.ix = x; this.iy = y;
    this.face = { x: 0, y: 1 };
    this.t = Math.random() * 6;
    this.shadow = scene.add.image(x, y + 7, 'shadow');
    this.nameTxt = txtS(scene, Math.round(x - textW(def.name) / 2), Math.round(y - 20), def.name, 4, 0);
    this.setDepth(y + 8); this.shadow.setDepth(y + 6); this.nameTxt.setDepth(99300);
    this.walking = false;
  }

  canInteract() { return !this.walking; }
  label() { return 'E: TALK'; }

  async interact() {
    const p = this.scene.player;
    this.lookAt(p.x, p.y);
    await runScript(() => SCRIPTS[this.id]());
  }

  lookAt(x, y) {
    const dx = x - this.x, dy = y - this.y;
    this.face = Math.abs(dx) > Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
  }

  // Walk to a world position (used after the intro).
  walkTo(x, y, speed = 36) {
    return new Promise((res) => {
      this.walking = true;
      const d = Math.hypot(x - this.x, y - this.y);
      this.face = Math.abs(x - this.x) > Math.abs(y - this.y) ? { x: Math.sign(x - this.x), y: 0 } : { x: 0, y: Math.sign(y - this.y) };
      this.scene.tweens.add({
        targets: this, x, y, duration: (d / speed) * 1000,
        onUpdate: () => { this.ix = this.x; this.iy = this.y; this.body.updateFromGameObject(); },
        onComplete: () => { this.walking = false; this.ix = x; this.iy = y; this.body.updateFromGameObject(); res(); },
      });
    });
  }

  update(dt, player) {
    this.t += dt;
    const near = Math.hypot(player.x - this.x, player.y - this.y) < 44;
    if (near && !this.walking) this.lookAt(player.x, player.y);
    const kind = facingKind(this.face.x, this.face.y);
    const fr = this.walking ? 1 + (Math.floor(this.t * 6) % 2) : 0;
    this.setFrame(kind + fr).setFlipX(kind === 'side' && this.face.x < 0);
    this.setDepth(this.y + 8);
    this.shadow.setPosition(this.x, this.y + 7).setDepth(this.y + 6);
    this.nameTxt.setPosition(Math.round(this.x - this.nameTxt.width / 2), Math.round(this.y - 21));
  }
}
