import Phaser from 'phaser';
import { generateArt } from '../art/sprites.js';
import { buildFonts } from '../art/font.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    buildFonts(this);
    generateArt(this);
    const q = new URLSearchParams(location.search);
    if (q.get('scene') === 'game') this.scene.start('Game', { map: q.get('map') || 'village', spawn: q.get('spawn') || 'start' });
    else this.scene.start('Title');
  }
}
