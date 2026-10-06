import Phaser from 'phaser';
import { W, H, C } from '../config.js';
import { txt, wrap } from '../art/font.js';
import { keys } from '../systems/keys.js';
import { sfx } from '../audio/sfx.js';
import { ui } from '../systems/ui.js';
import { epilogueLines, chapter3Ending, CH2_TAIL } from '../data/story.js';

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

ENDINGS.thaw = {
  title: 'THE LONG THAW', col: 8,
  text: 'You set the Winter free, and it did not strike you down. It rose from the throne like breath from a sleeper and went north, over the mountains, and did not come back.\n\nThe snow melted off the Reach in a single week. The Hearts crumbled to dust in your hands, and you let them. In Hollowfrost, children learned the word summer.',
};
ENDINGS.warden = {
  title: 'THE NEW WARDEN', col: 15,
  text: 'You pressed the four Hearts back into the chains, and set your own into the fifth. The Winter sighed, and slept.\n\nThe cold did not leave the Reach. It softened, like a hound that has found its master. Travellers say there is a lantern burning at the Winter Throne, and that whoever keeps it never grows old, or warm.',
};
ENDINGS.crown = {
  title: 'THE CROWN OF RIME', col: 14,
  text: 'The crown was colder than anything you had touched, and it fit.\n\nThe wolves came first, then the dead, then the mountains. The Hollow Kings had bound the Winter; you wore it. Nothing in the Reach ever grew again, and nothing in the Reach ever dared to disagree.',
};

export default class EndingScene extends Phaser.Scene {
  constructor() { super('Ending'); }
  init(data) { this.kind = data.kind; }
  create() {
    ui.modal = true;
    const ch2 = ['thaw', 'warden', 'crown'].includes(this.kind);
    const e = ENDINGS[this.kind] || chapter3Ending(this.kind);
    this.add.rectangle(0, 0, W, H, 0x0b0e1a, 1).setOrigin(0);
    this.cameras.main.fadeIn(800, 11, 14, 26);
    sfx.play('ending');
    txt(this, W / 2, 18, e.title, e.col).setScale(2).setOrigin(0.5, 0);
    this.body = txt(this, 14, 48, '', 5);
    const epi = epilogueLines();
    const lines = wrap(e.text + (ch2 ? '\n\n' + CH2_TAIL : '') + (epi.length ? '\n\n' + epi.join('\n\n') : ''), 49).split('\n');
    const PER = 13;                                               // lines that fit under the title
    this.pages = [];
    for (let i = 0; i < lines.length; i += PER) this.pages.push(lines.slice(i, i + PER).join('\n'));
    this.pi = 0; this.full = this.pages[0];
    this.ch2 = ch2;
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
    } else if (this.pi < this.pages.length - 1) {
      this.end.setText(`E: CONTINUE  ${this.pi + 1}/${this.pages.length}`).x = Math.round((W - this.end.width) / 2);
      if (keys.pressed('interact')) { this.pi++; this.full = this.pages[this.pi]; this.n = 0; this.t = 0; this.body.setText(''); this.end.setText(''); }
    } else {
      this.end.setText(this.ch2 ? 'CHAPTER TWO ENDS   -   E: THE MOUNTAIN STIRS' : 'THE END   -   E: KEEP EXPLORING').x = Math.round((W - this.end.width) / 2);
      if (keys.pressed('interact')) {
        ui.modal = false;
        this.scene.get('Game').events.emit('ending-done');
        this.scene.stop();
      }
    }
  }
}
