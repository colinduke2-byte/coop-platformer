import { setIconBuilder, rehydrateGen } from '../systems/genloot.js';
import Phaser from 'phaser';
import { S } from '../systems/state.js';
import { generateArt, buildIcon, buildHeld, heldKind } from '../art/sprites.js';
import { buildFonts } from '../art/font.js';
import { ITEMS, iconKey, setArtEnsure } from '../data/items.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    buildFonts(this);
    generateArt(this);
    // item art on demand: whatever asks for an icon or a held sprite first gets it drawn on the spot
    const tex = this.textures;
    const icon = (id) => { if (tex.exists('icon_' + id)) return; const it = ITEMS[id]; if (it?.icon) buildIcon(this, 'icon_' + id, it.icon[0], it.icon[1]); };
    const held = (id) => { if (tex.exists('held_' + id)) return; const it = ITEMS[id]; const k = it && heldKind(it); if (k) buildHeld(this, 'held_' + id, k, it.icon[1]); };
    setArtEnsure(icon, held);
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
    // ...and the rest in small slices while the title screen is up, so no menu ever waits for it
    const todo = Object.keys(ITEMS);
    const slice = () => {
      const end = performance.now() + 6;
      while (todo.length && performance.now() < end) { const id = todo.pop(); icon(id); held(id); }
      if (todo.length) setTimeout(slice, 0);
    };
    setTimeout(slice, 0);
    for (const [k, kind, col] of [['shock', 'shock', 13], ['heal', 'heal', 8], ['ward', 'ward', 15], ['blink', 'blink', 14], ['nova', 'nova', 15], ['meteor', 'meteor', 12], ['embernova', 'fire', 13], ['glacier', 'frost', 15], ['wolf', 'wolf', 15], ['regrow', 'regrow', 8], ['thorns', 'thorns', 8], ['sandstorm', 'sandstorm', 10], ['sunbeam', 'sunbeam', 13], ['coin', 'coin', 13], ['fire', 'fire', 12], ['frost', 'frost', 15], ['shout', 'shout', 6], ['arrows', 'arrows', 5]]) {
      buildIcon(this, 'icon_' + k, kind, col);
    }
    const q = new URLSearchParams(location.search);
    if (q.get('seed')) S.seed = Number(q.get('seed'));
    if (q.get('scene') === 'game') this.scene.start('Game', { map: q.get('map') || 'village', spawn: q.get('spawn') || 'start' });
    else if (q.get('scene') === 'intro') this.scene.start('Intro');
    else this.scene.start('Title');
  }
}
