import Phaser from 'phaser';
import { W, H, C } from '../config.js';
import { txt, wrap } from '../art/font.js';
import { keys } from '../systems/keys.js';
import { sfx } from '../audio/sfx.js';
import { ui } from '../systems/ui.js';

const ENDINGS = {
  give: {
    title: 'THE HEARTH REMEMBERS', col: 13,
    text: 'You laid the Frostheart in the great hall, and the elders sang it to sleep. By morning the icicles were weeping from the eaves, and the first green thing in three years pushed up through the snow by Bjorn\'s lodge.\n\nHollowfrost will remember the Dreamer who walked into the dark and came back with a gift instead of a crown.',
  },
  keep: {
    title: 'THE WINTER KING', col: 15,
    text: 'The Frostheart settled against your ribs like a second heart, slow and cold and patient. The draugr bowed their heads as you passed.\n\nHollowfrost shuttered its doors. Behind you, the snow began to fall again, and it did not stop for a hundred years.',
  },
  sell: {
    title: 'A COLD BARGAIN', col: 11,
    text: 'Mirra\'s gold was heavy in your pack, and warm for almost a week. Then the crystal in her cellar began to hum, and the frost crept up the stairs.\n\nYou were far away by then, with a full purse and a lighter conscience than you deserved.',
  },
};

export default class EndingScene extends Phaser.Scene {
  constructor() { super('Ending'); }
  init(data) { this.kind = data.kind; }
  create() {
    ui.modal = true;
    const e = ENDINGS[this.kind];
    this.add.rectangle(0, 0, W, H, 0x0b0e1a, 1).setOrigin(0);
    this.cameras.main.fadeIn(800, 11, 14, 26);
    sfx.play('ending');
    txt(this, W / 2, 18, e.title, e.col).setScale(2).setOrigin(0.5, 0);
    this.body = txt(this, 14, 48, '', 5);
    this.full = wrap(e.text, 49);
    this.n = 0; this.t = 0; this.warm = 20;
    this.end = txt(this, 0, H - 14, '', 4);
  }
  update(_, ms) {
    const dt = ms / 1000;
    if (this.warm > 0) { this.warm--; return; }
    if (this.n < this.full.length) {
      this.t += dt;
      while (this.t > 0.03 && this.n < this.full.length) { this.t -= 0.03; this.n++; }
      if (keys.pressed('interact')) this.n = this.full.length;
      this.body.setText(this.full.slice(0, this.n));
    } else {
      this.end.setText('THE END   -   E: KEEP EXPLORING').x = Math.round((W - this.end.width) / 2);
      if (keys.pressed('interact')) {
        ui.modal = false;
        this.scene.get('Game').events.emit('ending-done');
        this.scene.stop();
      }
    }
  }
}
