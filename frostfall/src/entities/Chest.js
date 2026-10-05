import Phaser from 'phaser';
import { S } from '../systems/state.js';
import { addItem, addGold, addArrows } from '../systems/inventory.js';
import { sfx } from '../audio/sfx.js';
import { runScript, say } from '../systems/dialogue.js';
import { dialogue } from '../systems/dialogue.js';
import { count, removeItem } from '../systems/inventory.js';
import { bus } from '../systems/bus.js';

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
  get locked() { return !!this.spec.lock && !S.flags[this.flag + '_u']; }
  label() { return this.locked ? 'E: PICK LOCK' : 'E: OPEN'; }

  async interact() {
    if (this.locked) {
      if (!count('lockpick')) { bus.emit('toast', 'LOCKED - NEED LOCKPICKS', 11); sfx.play('nostamina'); return; }
      let ok = false;
      await runScript(async () => { ok = await dialogue.hud.lockpick(this.spec.lock); });
      if (!ok) return;
      S.flags[this.flag + '_u'] = true;
      this.scene.player.gainXp('sneak', { easy: 8, med: 14, hard: 22 }[this.spec.lock] || 10);
    }
    this.open();
  }

  open() {
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
