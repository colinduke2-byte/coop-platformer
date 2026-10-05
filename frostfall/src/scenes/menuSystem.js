import { C, W, H } from '../config.js';
import { S } from '../systems/state.js';
import { keys } from '../systems/keys.js';
import { hasSave, saveGame, loadGame, saveInfo, fmtTime } from '../systems/save.js';
import { sfx, settings, setVolume, setMusic, music } from '../audio/sfx.js';
import { ui } from '../systems/ui.js';
import { bus } from '../systems/bus.js';
import { textW } from '../art/font.js';
import { panel } from './MenuScene.js';
import { MAPS } from '../data/maps.js';

const CONTROLS = [
  ['WASD', 'MOVE'], ['SPACE', 'DODGE ROLL'], ['J', 'SWORD'], ['K HOLD', 'BOW, CHARGE'],
  ['L', 'CAST SPELL'], ['Q / TAB', 'SWAP SPELL'], ['R', 'SHOUT'], ['C / SHIFT', 'SNEAK (HOLD)'],
  ['E', 'TALK / OPEN'], ['1 2 3', 'POTIONS'], ['I O ESC', 'PACK JOURNAL MENU'],
];

export function systemTab(m) {
  const rows = ['RESUME', 'SAVE GAME', 'LOAD GAME', 'VOLUME', 'MUSIC', 'FULLSCREEN', 'QUIT TO TITLE'];
  const adjust = (dir) => {
    if (rows[m.cursor] === 'VOLUME') { setVolume(Math.round((settings.volume + dir * 0.1) * 10) / 10); sfx.play('select'); m.dirty = true; }
  };
  return {
    name: 'SYSTEM',
    help: 'W/S MOVE  E SELECT  A/D VOLUME  ESC RESUME',
    captureLR: () => rows[m.cursor] === 'VOLUME',
    input() {
      m.nav(rows.length);
      if (rows[m.cursor] === 'VOLUME') {
        if (keys.pressed('left')) adjust(-1);
        if (keys.pressed('right')) adjust(1);
      }
      if (!keys.pressed('interact')) return;
      const gs = m.gs;
      switch (rows[m.cursor]) {
        case 'RESUME': m.close(); break;
        case 'SAVE GAME': saveGame(gs); m.dirty = true; break;
        case 'LOAD GAME':
          if (!loadGame()) { bus.emit('toast', 'NO SAVE FOUND', 11); sfx.play('nostamina'); break; }
          m.scene.stop();
          ui.modal = false;
          gs.scene.restart({ map: S.map, spawn: S.spawn, pos: S.x != null ? { x: S.x, y: S.y } : null });
          bus.emit('toast', 'GAME LOADED', 15);
          break;
        case 'MUSIC': setMusic(!settings.music); sfx.play('select'); m.dirty = true; break;
        case 'FULLSCREEN': m.scale.toggleFullscreen(); break;
        case 'QUIT TO TITLE':
          music.stop();
          ui.modal = false;
          m.scene.stop('Hud'); m.scene.stop('Game'); m.scene.start('Title');
          break;
        default: break;
      }
    },
    render() {
      const g = m.bg;
      panel(g, 6, 22, 128, 134, 2);
      rows.forEach((r, i) => {
        const y = 28 + i * 16;
        if (i === m.cursor) { g.fillStyle(C[3]); g.fillRect(8, y - 3, 124, 14); g.fillStyle(C[13]); g.fillRect(8, y - 3, 2, 14); }
        let label = r;
        m.T(16, y, label, i === m.cursor ? 6 : 5);
        if (r === 'VOLUME') {
          const n = Math.round(settings.volume * 10);
          g.fillStyle(C[0]); g.fillRect(70, y, 56, 7); g.fillStyle(C[1]); g.fillRect(71, y + 1, 54, 5);
          g.fillStyle(C[15]); g.fillRect(71, y + 1, n * 5.4, 5);
        } else if (r === 'MUSIC') m.T(130 - textW(settings.music ? 'ON' : 'OFF') - 4, y, settings.music ? 'ON' : 'OFF', settings.music ? 8 : 11);
        else if (r === 'LOAD GAME' && !hasSave()) m.T(130 - textW('EMPTY') - 4, y, 'EMPTY', 3);
      });
      // right: info + controls
      panel(g, 138, 22, W - 144, 134, 2);
      const info = saveInfo();
      m.T(144, 27, MAPS[S.map]?.name || '', 13);
      m.T(144, 36, 'PLAYTIME ' + fmtTime(S.playtime), 5);
      m.T(144, 45, info ? 'LAST SAVE: ' + new Date(info.t).toLocaleTimeString().slice(0, 5) : 'NOT SAVED YET', 4);
      g.fillStyle(C[3]); g.fillRect(144, 52, W - 156, 1);
      m.T(144, 55, 'CONTROLS', 15);
      CONTROLS.forEach(([k, v], i) => {
        m.T(144, 65 + i * 8, k, 6);
        m.T(204, 65 + i * 8, v, 4);
      });
    },
  };
}
