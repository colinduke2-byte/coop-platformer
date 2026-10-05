import { C, T, TILE } from '../config.js';
import { S } from '../systems/state.js';
import { MAPS } from '../data/maps.js';
import { panel } from './MenuScene.js';

const COL = {
  [TILE.SNOW]: 5, [TILE.SNOW2]: 5, [TILE.ICE]: 4, [TILE.STONE]: 3, [TILE.PINE]: 7, [TILE.PATH]: 10, [TILE.WOODFLOOR]: 10,
  [TILE.WOODWALL]: 9, [TILE.ROOF]: 6, [TILE.CFLOOR]: 3, [TILE.CWALL]: 1, [TILE.ROCK]: 4, [TILE.PILLAR]: 5, [TILE.BRAZIER]: 12,
  [TILE.STAIRS]: 0, [TILE.FENCE]: 9, [TILE.RUG]: 11, [TILE.DOOR]: 9, [TILE.FIRE]: 12, [TILE.WINDOW]: 13, [TILE.GRAVE]: 4, [TILE.SARCO]: 4,
};
export const FOG = 2; // fog chunk = 2x2 tiles

export function fogDims(w, h) { return { cw: Math.ceil(w / FOG), ch: Math.ceil(h / FOG) }; }

export function mapTab(m) {
  return {
    name: 'MAP',
    help: 'A/D TAB  ESC CLOSE',
    input() { /* view only */ },
    render() {
      const gs = m.gs, g = m.bg;
      panel(g, 6, 22, 308, 134, 2);
      const b = gs.built, w = b.w, h = b.h;
      const sc = Math.max(1, Math.min(Math.floor(296 / w), Math.floor(112 / h)));
      const ox = Math.round(160 - (w * sc) / 2), oy = 26;
      const fog = (S.fog && S.fog[gs.mapId]) || '';
      const { cw } = fogDims(w, h);
      const seen = (tx, ty) => fog[Math.floor(ty / FOG) * cw + Math.floor(tx / FOG)] === '1';
      g.fillStyle(C[0]); g.fillRect(ox - 1, oy - 1, w * sc + 2, h * sc + 2);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!seen(x, y)) continue;
        g.fillStyle(C[COL[b.grid[y][x]] ?? 0]);
        g.fillRect(ox + x * sc, oy + y * sc, sc, sc);
      }
      const dot = (tx, ty, col, size = Math.max(2, sc)) => {
        if (!seen(Math.floor(tx), Math.floor(ty))) return;
        g.fillStyle(C[col]); g.fillRect(ox + Math.floor(tx * sc + sc / 2 - size / 2), oy + Math.floor(ty * sc + sc / 2 - size / 2), size, size);
      };
      for (const e of b.entities) {
        if (e.t === 'exit') dot(e.x + e.w / 2 - 0.5, e.y + e.h / 2 - 0.5, 15, sc + 1);
        else if (e.t === 'npc') dot(e.x, e.y, 6);
        else if (e.t === 'chest' && !S.flags['chest_' + e.id]) dot(e.x, e.y, 13);
        else if (e.t === 'fire' && e.rest) dot(e.x, e.y, 12, sc + 1);
        else if (e.t === 'boss' && !S.flags.bossDead) dot(e.x, e.y, 11, sc + 2);
      }
      const p = gs.player;
      if (Math.floor(m.time.now / 350) % 2 === 0) { g.fillStyle(C[0]); g.fillRect(ox + Math.floor(p.x / T * sc) - 1, oy + Math.floor((p.y + 3) / T * sc) - 1, 4, 4); g.fillStyle(C[13]); g.fillRect(ox + Math.floor(p.x / T * sc), oy + Math.floor((p.y + 3) / T * sc), 2, 2); }
      m.T(10, 26, MAPS[gs.mapId].name, 13);
      const ly = 143;
      let lx = 12;
      [[13, 'YOU'], [15, 'EXIT'], [12, 'CAMPFIRE'], [6, 'PERSON'], [13, 'CHEST'], [11, 'BOSS']].forEach(([c, t]) => {
        g.fillStyle(C[c]); g.fillRect(lx, ly + 1, 4, 4);
        m.T(lx + 7, ly, t, 4);
        lx += 7 + t.length * 6 + 9;
      });
    },
  };
}
