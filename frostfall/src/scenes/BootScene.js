import Phaser from 'phaser';
import { generateArt, buildIcon } from '../art/sprites.js';
import { buildFonts } from '../art/font.js';
import { ITEMS, iconKey } from '../data/items.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    buildFonts(this);
    generateArt(this);
    for (const [id, it] of Object.entries(ITEMS)) buildIcon(this, iconKey(id), it.icon[0], it.icon[1]);
    for (const [k, kind, col] of [['coin', 'coin', 13], ['fire', 'fire', 12], ['frost', 'frost', 15], ['shout', 'shout', 6], ['arrows', 'arrows', 5]]) {
      buildIcon(this, 'icon_' + k, kind, col);
    }
    const q = new URLSearchParams(location.search);
    if (q.get('scene') === 'game') this.scene.start('Game', { map: q.get('map') || 'village', spawn: q.get('spawn') || 'start' });
    else if (q.get('scene') === 'intro') this.scene.start('Intro');
    else this.scene.start('Title');
  }
}
