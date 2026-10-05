import Phaser from 'phaser';
import { W, H } from '../config.js';
import { txt, wrap } from '../art/font.js';
import { keys } from '../systems/keys.js';
import { sfx } from '../audio/sfx.js';

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
    this.hint = txt(this, W - 80, H - 12, 'E: SKIP', 3);
    this.cameras.main.fadeIn(600, 11, 14, 26);
  }
  update(_, ms) {
    const dt = ms / 1000;
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
