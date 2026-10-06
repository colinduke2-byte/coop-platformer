import { C, T, TILE } from '../config.js';
import { S } from '../systems/state.js';
import { MAPS } from '../data/maps.js';
import { TARGETS, trackedId } from '../data/quests.js';
import { panel } from './MenuScene.js';
import { keys } from '../systems/keys.js';
import { sfx } from '../audio/sfx.js';
import { bus } from '../systems/bus.js';

const COL = {
  [TILE.SNOW]: 5, [TILE.SNOW2]: 5, [TILE.ICE]: 4, [TILE.STONE]: 3, [TILE.PINE]: 7, [TILE.PATH]: 10, [TILE.WOODFLOOR]: 10,
  [TILE.WOODWALL]: 9, [TILE.ROOF]: 6, [TILE.CFLOOR]: 3, [TILE.CWALL]: 1, [TILE.ROCK]: 4, [TILE.PILLAR]: 5, [TILE.BRAZIER]: 12,
  [TILE.STAIRS]: 0, [TILE.FENCE]: 9, [TILE.RUG]: 11, [TILE.DOOR]: 9, [TILE.FIRE]: 12, [TILE.WINDOW]: 13, [TILE.GRAVE]: 4, [TILE.SARCO]: 4,
  [TILE.SNOW3]: 5, [TILE.SNOW4]: 5, [TILE.PATH2]: 10, [TILE.CFLOOR2]: 3, [TILE.CWALL2]: 1, [TILE.DEADTREE]: 9, [TILE.STUMP]: 9, [TILE.ICE2]: 4, [TILE.TUFT]: 5,
};
export const FOG = 2; // fog chunk = 2x2 tiles

export function fogDims(w, h) { return { cw: Math.ceil(w / FOG), ch: Math.ceil(h / FOG) }; }

const ZOOMS = [1, 2, 3];
const VX = 10, VY = 26, VW = 300, VH = 112;

export function mapTab(m) {
  let zoom = 0, cur = null, curMode = false, rep = 0;
  const base = (b) => Math.max(1, Math.min(Math.floor(296 / b.w), Math.floor(112 / b.h)));
  return {
    name: 'MAP',
    help: 'Q ZOOM  E CURSOR/WAYPOINT  A/D TAB',
    captureLR: () => curMode,
    input() {
      const gs = m.gs, b = gs.built;
      m.dirty = true;
      if (!cur) cur = { x: Math.floor(gs.player.x / T), y: Math.floor((gs.player.y + 3) / T) };
      if (keys.pressed('swap')) { zoom = (zoom + 1) % ZOOMS.length; sfx.play('select'); }
      if (keys.pressed('interact')) {
        if (!curMode) { curMode = true; sfx.play('select'); }
        else {
          const wp = S.flags.waypoint;
          if (wp && wp.map === gs.mapId && Math.abs(wp.x - cur.x) < 2 && Math.abs(wp.y - cur.y) < 2) { delete S.flags.waypoint; bus.emit('toast', 'WAYPOINT REMOVED', 4); }
          else { S.flags.waypoint = { map: gs.mapId, x: cur.x, y: cur.y }; bus.emit('toast', 'WAYPOINT SET', 13); }
          curMode = false; sfx.play('equip');
        }
      }
      if (curMode && keys.pressed('block')) {
        const f = (gs.fires || []).find((q) => S.flags.fires?.[q.key] && Math.abs(q.tx - cur.x) <= 1 && Math.abs(q.ty - cur.y) <= 1);
        if (f) { m.close(); gs.fastTravel(f); return; }
      }
      if (curMode) {
        rep -= 1;
        const dx = (keys.isDown('right') ? 1 : 0) - (keys.isDown('left') ? 1 : 0), dy = (keys.isDown('down') ? 1 : 0) - (keys.isDown('up') ? 1 : 0);
        if ((dx || dy) && (rep <= 0 || keys.pressed('right') || keys.pressed('left') || keys.pressed('up') || keys.pressed('down'))) {
          cur.x = Math.max(0, Math.min(b.w - 1, cur.x + dx)); cur.y = Math.max(0, Math.min(b.h - 1, cur.y + dy));
          rep = 3;
        }
        if (keys.pressed('pause')) { curMode = false; }
      }
    },
    render() {
      const gs = m.gs, g = m.bg;
      panel(g, 6, 22, 308, 134, 2);
      const b = gs.built, w = b.w, h = b.h;
      const sc = base(b) * ZOOMS[zoom];
      const p = gs.player;
      // view centre in tiles: the map centre when it fits, otherwise the cursor (or the player)
      const focus = curMode && cur ? cur : { x: p.x / T, y: (p.y + 3) / T };
      const fitX = w * sc <= VW, fitY = h * sc <= VH;
      const cx = fitX ? w / 2 : Math.max(VW / 2 / sc, Math.min(w - VW / 2 / sc, focus.x));
      const cy = fitY ? h / 2 : Math.max(VH / 2 / sc, Math.min(h - VH / 2 / sc, focus.y));
      const ox = Math.round(VX + VW / 2 - cx * sc), oy = Math.round(VY + VH / 2 - cy * sc);
      const inView = (px, py, pw = sc, ph = sc) => px >= VX && py >= VY && px + pw <= VX + VW && py + ph <= VY + VH;
      const fog = (S.fog && S.fog[gs.mapId]) || '';
      const { cw } = fogDims(w, h);
      const seen = (tx, ty) => fog[Math.floor(ty / FOG) * cw + Math.floor(tx / FOG)] === '1';
      if (fitX && fitY) { g.fillStyle(C[0]); g.fillRect(ox - 1, oy - 1, w * sc + 2, h * sc + 2); } else { g.fillStyle(C[0]); g.fillRect(VX, VY, VW, VH); }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const px = ox + x * sc, py = oy + y * sc;
        if (!inView(px, py) || !seen(x, y)) continue;
        g.fillStyle(C[COL[b.grid[y][x]] ?? 0]);
        g.fillRect(px, py, sc, sc);
      }
      const spot = (tx, ty, size) => [ox + Math.floor(tx * sc + sc / 2 - size / 2), oy + Math.floor(ty * sc + sc / 2 - size / 2)];
      const dot = (tx, ty, col, size = Math.max(2, sc)) => {
        if (!seen(Math.floor(tx), Math.floor(ty))) return;
        const [px, py] = spot(tx, ty, size);
        if (!inView(px, py, size, size)) return;
        g.fillStyle(C[col]); g.fillRect(px, py, size, size);
      };
      const labels = [];
      for (const e of b.entities) {
        if (e.t === 'exit') {
          const tx = e.x + e.w / 2 - 0.5, ty = e.y + e.h / 2 - 0.5;
          dot(tx, ty, 15, sc + 1);
          if (seen(Math.floor(tx), Math.floor(ty)) && MAPS[e.to]) labels.push([tx, ty, 'TO ' + MAPS[e.to].name.toUpperCase()]);
        } else if (e.t === 'npc') dot(e.x, e.y, 6);
        else if (e.t === 'chest' && !S.flags['chest_' + e.id]) dot(e.x, e.y, 13);
        else if (e.t === 'fire' && e.rest) { const found = S.flags.fires?.[`${gs.mapId}:${e.x},${e.y}`]; if (found || !gs.def.stream) dot(e.x, e.y, 12, sc + 2); }
        else if (e.t === 'shrine') dot(e.x, e.y, 14, sc + 1);
        else if (e.t === 'bounty') { if (seen(Math.floor(e.x), Math.floor(e.y))) dot(e.x, e.y, S.bounty[e.id] ? 3 : 11, sc + 1); }
        else if (e.t === 'boss' && !S.flags.bossDead) dot(e.x, e.y, 11, sc + 2);
      }
      const marker = (tg, col) => {
        const qx = ox + Math.floor((tg.x + 0.5) * sc), qy = oy + Math.floor((tg.y + 0.5) * sc), pulse = Math.floor(m.time.now / 300) % 2;
        if (!inView(qx - 3, qy - 3, 7, 7)) return;
        g.fillStyle(C[0]); g.fillRect(qx - 3 - pulse, qy - 3 - pulse, 7 + 2 * pulse, 7 + 2 * pulse);
        g.fillStyle(C[col]); g.fillRect(qx - 2, qy - 2, 5, 5);
      };
      const tid = trackedId();
      const tg = tid && TARGETS[tid]?.(S.quests[tid]);
      if (tg && tg.map === gs.mapId) marker(tg, 15);
      const wp = S.flags.waypoint;
      if (wp && wp.map === gs.mapId) marker(wp, 8);
      const pxp = ox + Math.floor(p.x / T * sc), pyp = oy + Math.floor((p.y + 3) / T * sc);
      if (inView(pxp - 1, pyp - 1, 4, 4) && Math.floor(m.time.now / 350) % 2 === 0) { g.fillStyle(C[0]); g.fillRect(pxp - 1, pyp - 1, 4, 4); g.fillStyle(C[13]); g.fillRect(pxp, pyp, 2, 2); }
      // fast travel hint: cursor on a found campfire
      const fireAt = curMode && cur ? (gs.fires || []).find((f) => S.flags.fires?.[f.key] && Math.abs(f.tx - cur.x) <= 1 && Math.abs(f.ty - cur.y) <= 1) : null;
      if (fireAt) m.T(10, 135, 'F: FAST TRAVEL TO THIS CAMPFIRE', 12);
      if (curMode && cur) {
        const [qx, qy] = [ox + cur.x * sc, oy + cur.y * sc];
        g.lineStyle(1, C[6]); g.strokeRect(qx - 1.5, qy - 1.5, sc + 3, sc + 3);
      }
      // exit labels (only the ones that fit in the view)
      for (const [tx, ty, text] of labels) {
        if (zoom === 0 && labels.length > 3) continue;
        const [px, py] = spot(tx, ty, sc);
        const lw = text.length * 6, lx = Math.max(VX, Math.min(VX + VW - lw, px - lw / 2)), ly = py - 9;
        if (ly < VY) continue;
        g.fillStyle(C[0], 0.7); g.fillRect(lx - 1, ly - 1, lw + 2, 9);
        m.T(lx, ly, text, 15);
      }
      m.T(10, 26, MAPS[gs.mapId].name + (zoom ? '  ' + ZOOMS[zoom] + 'X' : ''), 13);
      const ly = 143;
      let lx = 12;
      [[13, 'YOU'], [15, 'EXIT'], [12, 'FIRE'], [14, 'SHRINE'], [11, 'FOE SITE'], [15, 'QUEST'], [8, 'WAYPOINT']].forEach(([c, t]) => {
        g.fillStyle(C[c]); g.fillRect(lx, ly + 1, 4, 4);
        m.T(lx + 7, ly, t, 4);
        lx += 7 + t.length * 6 + 3;
      });
    },
  };
}
