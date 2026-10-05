import Phaser from 'phaser';
import { sfx } from '../audio/sfx.js';

// Pots, barrels and urns: smash with sword, arrows or fire for a little loot.
export default class Breakable extends Phaser.GameObjects.Image {
  constructor(scene, x, y, skin = 'pot') {
    super(scene, x, y, skin);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.body.setSize(10, 8).setOffset(3, 7);
    this.skin = skin;
    this.broken = false;
    this.setDepth(y + 6);
    this.shadow = scene.add.image(x, y + 7, 'shadow').setDepth(y + 5).setScale(0.8);
  }

  get cx() { return this.x; }
  get cy() { return this.y + 3; }

  smash() {
    if (this.broken) return;
    this.broken = true;
    const sc = this.scene;
    const col = this.skin === 'urn' ? 4 : 10;
    sc.fx.puff(this.x, this.y, col, 8, 55, 0.5, 120);
    sc.fx.puff(this.x, this.y, 9, 5, 40, 0.45, 120);
    sfx.play('smash');
    sc.spawnLoot(this.x, this.y + 2, this.skin === 'urn' ? { gold: [2, 9], chance: 0.8 } : { gold: [1, 5], chance: 0.55 }, [['arrows', 0.14, [2, 3]], ['hp_potion', 0.05], ['sp_potion', 0.05], ['mp_potion', 0.04]]);
    sc.breakBodies.remove(this);
    this.shadow.destroy();
    this.destroy();
  }
}
