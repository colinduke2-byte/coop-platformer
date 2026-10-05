import Phaser from 'phaser';
import { generateArt, buildIcon, buildHeld } from '../art/sprites.js';
import { buildFonts } from '../art/font.js';
import { ITEMS, iconKey } from '../data/items.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    buildFonts(this);
    generateArt(this);
    for (const [id, it] of Object.entries(ITEMS)) buildIcon(this, iconKey(id), it.icon[0], it.icon[1]);
    buildHeld(this, 'blade_default', 'blade', 5);
    for (const [id, it] of Object.entries(ITEMS)) {
      if (it.type === 'weapon') buildHeld(this, 'held_' + id, 'blade', it.icon[1]);
      else if (it.type === 'weapon2h') buildHeld(this, 'held_' + id, 'greatblade', it.icon[1]);
      else if (it.type === 'shield') buildHeld(this, 'held_' + id, 'shield', it.icon[1]);
    }
    for (const [k, kind, col] of [['shock', 'shock', 13], ['heal', 'heal', 8], ['ward', 'ward', 15], ['coin', 'coin', 13], ['fire', 'fire', 12], ['frost', 'frost', 15], ['shout', 'shout', 6], ['arrows', 'arrows', 5]]) {
      buildIcon(this, 'icon_' + k, kind, col);
    }
    const q = new URLSearchParams(location.search);
    if (q.get('scene') === 'game') this.scene.start('Game', { map: q.get('map') || 'village', spawn: q.get('spawn') || 'start' });
    else if (q.get('scene') === 'intro') this.scene.start('Intro');
    else this.scene.start('Title');
  }
}
