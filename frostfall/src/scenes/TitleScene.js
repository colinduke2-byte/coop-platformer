import Phaser from 'phaser';
import { W, H } from '../config.js';
import { txt } from '../art/font.js';
import { SnowFx } from '../art/snow.js';
import { keys } from '../systems/keys.js';
import { resetState } from '../systems/state.js';

export default class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }
  create() {
    this.cameras.main.setBackgroundColor(0x0b0e1a);
    this.add.rectangle(0, 0, W, H, 0x1c2338).setOrigin(0).setAlpha(0.6);
    // distant mountains
    const g = this.add.graphics();
    g.fillStyle(0x2e3a5c);
    for (let x = 0; x < W; x += 2) g.fillRect(x, 100 - Math.abs(((x * 0.7) % 60) - 30) - 8 * Math.sin(x / 23), 2, 90);
    g.fillStyle(0x4a5c86);
    for (let x = 0; x < W; x += 2) g.fillRect(x, 125 - Math.abs(((x * 1.1 + 20) % 80) - 40) * 0.6, 2, 90);
    g.fillStyle(0xeaf2f8); g.fillRect(0, 160, W, 20);
    g.fillStyle(0xb4c7e0); g.fillRect(0, 160, W, 2);
    const t1 = txt(this, 0, 30, 'FROSTFALL', 6).setScale(4);
    t1.x = Math.floor((W - t1.width * 4) / 2);
    const t2 = txt(this, 0, 68, 'A TALE OF THE FROZEN NORTH', 4);
    t2.x = Math.floor((W - t2.width) / 2);
    this.prompt = txt(this, 0, 130, 'PRESS ENTER TO BEGIN', 13);
    this.prompt.x = Math.floor((W - this.prompt.width) / 2);
    this.snow = new SnowFx(this, 80);
    this.t = 0;
  }
  update(_, ms) {
    const dt = ms / 1000;
    this.t += dt;
    this.snow.update(dt);
    this.prompt.setVisible(Math.floor(this.t * 2) % 2 === 0);
    if (keys.pressed('interact') || keys.pressed('roll')) {
      resetState();
      this.scene.start('Game', { map: 'village', spawn: 'start' });
    }
  }
}
