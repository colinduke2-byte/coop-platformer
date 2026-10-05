import Phaser from 'phaser';
import { S } from '../systems/state.js';
import { addItem, addGold, addArrows } from '../systems/inventory.js';
import { sfx } from '../audio/sfx.js';

export default class Chest extends Phaser.GameObjects.Image {
  constructor(scene, x, y, spec) {
    super(scene, x, y, 'chest0');
    scene.add.existing(this);
    this.spec = spec;
    this.flag = 'chest_' + spec.id;
    this.ix = x; this.iy = y;
    this.setDepth(y + 6);
    if (S.flags[this.flag]) this.setTexture('chest1');
    scene.physics.add.existing(this, true);
    this.body.setSize(14, 8).setOffset(1, 6);
    scene.add.image(x, y + 7, 'shadow').setDepth(y + 5);
  }

  canInteract() { return !S.flags[this.flag]; }
  label() { return 'E: OPEN'; }

  interact() {
    S.flags[this.flag] = true;
    this.setTexture('chest1');
    sfx.play('chest');
    this.scene.fx.puff(this.x, this.y - 4, 13, 8, 40, 0.5);
    for (const l of this.spec.loot) {
      if (l.item) addItem(l.item, l.n || 1);
      else if (l.gold) addGold(l.gold);
      else if (l.arrows) addArrows(l.arrows);
    }
  }
}
