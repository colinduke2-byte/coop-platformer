import Phaser from 'phaser';
import { txt } from '../art/font.js';

export default class HudScene extends Phaser.Scene {
  constructor() { super('Hud'); }
  create() {
    this.fps = txt(this, 2, 2, '', 4);
  }
  update() {
    this.fps.setText(Math.round(this.game.loop.actualFps) + ' FPS');
  }
}
