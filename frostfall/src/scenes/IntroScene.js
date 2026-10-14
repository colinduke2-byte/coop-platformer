import Phaser from 'phaser';
import { W, H } from '../config.js';
import { txt, wrap } from '../art/font.js';
import { keys } from '../systems/keys.js';
import { sfx } from '../audio/sfx.js';
import { padHint } from '../systems/access.js';

const LINES = [
  'The cold took you first.',
  'Then the dark.',
  'Somewhere above the silence, a voice is calling.\nIt sounds like it has called many times.',
];

export default class IntroScene extends Phaser.Scene {
  constructor() { super('Intro'); }
  create() {
    this.cameras.main.setBackgroundColor(0x0b0e1a);
    this.i = 0; this.n = 0; this.t = 0; this.hold = 0;
    this.body = txt(this, 0, 70, '', 5);
    // E (or A) moves on a line; holding it skips the whole intro, with a bar that fills while you hold
    this.hint = txt(this, 0, H - 12, padHint('E NEXT   HOLD E SKIP'), 4); this.hint.x = W - 6 - this.hint.width;
    this.skipBar = this.add.rectangle(this.hint.x, H - 3, 0, 2, 0xf4d460).setOrigin(0);
    this.holdT = 0;
    this.cameras.main.fadeIn(600, 11, 14, 26);
  }
  update(_, ms) {
    const dt = ms / 1000;
    this.holdT = keys.isDown('interact') ? this.holdT + dt : 0;
    this.skipBar.width = Math.min(1, this.holdT / 0.8) * this.hint.width;
    if (this.holdT > 0.8) return this.finish();
    const line = LINES[this.i];
    if (line === undefined) return;
    if (this.n < line.length) {
      this.t += dt;
      while (this.t > 0.045 && this.n < line.length) { this.t -= 0.045; this.n++; if (line[this.n - 1] !== ' ') sfx.play('blip'); }
      if (keys.pressed('interact')) this.n = line.length;
    } else {
      this.hold += dt;
      if (this.hold > 1.5 || keys.pressed('interact')) { this.i++; this.n = 0; this.hold = 0; this.t = 0; if (this.i >= LINES.length) return this.finish(); }
    }
    const shown = LINES[this.i]?.slice(0, this.n) ?? '';
    this.body.setText(shown);
    const w = Math.max(...LINES[this.i].split('\n').map((l) => l.length)) * 6;
    this.body.x = Math.round((W - w) / 2);
  }
  finish() {
    if (this.done) return;
    this.done = true;
    this.cameras.main.fadeOut(700, 11, 14, 26);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game', { map: 'village', spawn: 'start', intro: true }));
  }
}
