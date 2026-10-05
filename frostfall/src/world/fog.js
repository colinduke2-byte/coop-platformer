// Fog of war for the map screen (mixed into GameScene).
import { T } from '../config.js';
import { S } from '../systems/state.js';
import { fogDims } from '../scenes/menuMap.js';

export const fogMethods = {
  // Fog of war for the map screen: 2x2-tile chunks revealed as you walk.
  initFog() {
    const { cw, ch } = fogDims(this.built.w, this.built.h);
    S.fog = S.fog || {};
    this.fogArr = (S.fog[this.mapId] || '').padEnd(cw * ch, '0').split('');
    this.fogT = 0;
    this.revealFog(true);
  },

  revealFog(force) {
    const { cw, ch } = fogDims(this.built.w, this.built.h);
    const tx = this.player.x / T, ty = this.player.y / T, R = this.def.crypt ? 5 : 6;
    let changed = false;
    for (let cy = Math.max(0, Math.floor((ty - R) / 2)); cy <= Math.min(ch - 1, Math.floor((ty + R) / 2)); cy++) {
      for (let cx = Math.max(0, Math.floor((tx - R) / 2)); cx <= Math.min(cw - 1, Math.floor((tx + R) / 2)); cx++) {
        const i = cy * cw + cx;
        if (this.fogArr[i] === '1') continue;
        if (Math.hypot(cx * 2 + 1 - tx, cy * 2 + 1 - ty) <= R) { this.fogArr[i] = '1'; changed = true; }
      }
    }
    if (changed || force) S.fog[this.mapId] = this.fogArr.join('');
  },
};
