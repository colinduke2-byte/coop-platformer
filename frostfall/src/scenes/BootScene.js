import { setIconBuilder, rehydrateGen } from '../systems/genloot.js';
import Phaser from 'phaser';
import { S } from '../systems/state.js';
import { generateArt, buildIcon, buildHeld, heldKind } from '../art/sprites.js';
import { buildFonts } from '../art/font.js';
import { ITEMS, iconKey } from '../data/items.js';
import { fitCam } from '../systems/gfx.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    fitCam(this);
    buildFonts(this);
    generateArt(this);
    for (const [id, it] of Object.entries(ITEMS)) buildIcon(this, iconKey(id), it.icon[0], it.icon[1]);
    setIconBuilder((id, it) => {
      if (!this.textures.exists(iconKey(id))) buildIcon(this, iconKey(id), it.icon[0], it.icon[1]);
      const hk = 'held_' + id;
      if (!this.textures.exists(hk)) {
        const k = heldKind(it); if (k) buildHeld(this, hk, k, it.icon[1]);
      }
    });
    rehydrateGen();
    buildHeld(this, 'blade_default', 'blade', 5);
    for (const col of [3, 4, 5]) buildHeld(this, 'held_e' + col, 'blade', col);
    for (const [id, it] of Object.entries(ITEMS)) {
      const k = heldKind(it); if (k) buildHeld(this, 'held_' + id, k, it.icon[1]);
    }
    for (const [k, kind, col] of [['shock', 'shock', 13], ['heal', 'heal', 8], ['ward', 'ward', 15], ['blink', 'blink', 14], ['nova', 'nova', 15], ['meteor', 'meteor', 12], ['embernova', 'fire', 13], ['glacier', 'frost', 15], ['wolf', 'wolf', 15], ['coin', 'coin', 13], ['fire', 'fire', 12], ['frost', 'frost', 15], ['shout', 'shout', 6], ['arrows', 'arrows', 5]]) {
      buildIcon(this, 'icon_' + k, kind, col);
    }
    const q = new URLSearchParams(location.search);
    if (q.get('seed')) S.seed = Number(q.get('seed'));
    if (q.get('scene') === 'game') this.scene.start('Game', { map: q.get('map') || 'village', spawn: q.get('spawn') || 'start' });
    else if (q.get('scene') === 'intro') this.scene.start('Intro');
    else this.scene.start('Title');
  }
}
