import { C, W, H, BINDINGS } from '../config.js';
import { S } from '../systems/state.js';
import { keys, capture, capturing, setBinding, resetBindings, codeName } from '../systems/keys.js';
import { saveGame, loadGame, saveInfo, fmtTime, SLOTS } from '../systems/save.js';
import { sfx, setVolume, setMusic, music } from '../audio/sfx.js';
import { settings, saveSettings } from '../systems/settings.js';
import { ui } from '../systems/ui.js';
import { bus } from '../systems/bus.js';
import { textW } from '../art/font.js';
import { panel } from './MenuScene.js';
import { MAPS } from '../data/maps.js';

const ACTION_NAMES = [
  ['up', 'MOVE UP'], ['down', 'MOVE DOWN'], ['left', 'MOVE LEFT'], ['right', 'MOVE RIGHT'], ['roll', 'DODGE ROLL'], ['sword', 'SWORD'], ['bow', 'BOW'],
  ['spell', 'CAST SPELL'], ['swap', 'SWAP SPELL'], ['shout', 'SHOUT'], ['lockon', 'LOCK ON'], ['ammo', 'SWITCH ARROWS'], ['heavy', 'HEAVY ATTACK'], ['block', 'BLOCK'], ['sneak', 'SNEAK'], ['interact', 'INTERACT'],
  ['potion1', 'HEALTH POTION'], ['potion2', 'MANA POTION'], ['potion3', 'STAMINA POTION'], ['inventory', 'PACK'], ['journal', 'JOURNAL'], ['map', 'MAP'], ['pause', 'PAUSE MENU'],
  ['spell1', 'QUICK FIREBALL'], ['spell2', 'QUICK FROST'], ['spell3', 'QUICK LIGHTNING'], ['spell4', 'QUICK HEALING'], ['spell5', 'QUICK WARD'],
];
const CONTROLS = [
  ['WASD', 'MOVE'], ['SPACE', 'DODGE ROLL'], ['J', 'SWORD 3X COMBO'], ['K HOLD', 'BOW, CHARGE'],
  ['L / Q', 'SPELL / SWAP'], ['R', 'SHOUT'], ['U', 'HEAVY ATTACK'], ['T', 'LOCK ON TARGET'], ['F HOLD', 'BLOCK, PARRY'], ['C / SHIFT', 'SNEAK (HOLD)'],
  ['E', 'TALK/OPEN/REST'], ['1 2 3', 'POTIONS'], ['4-8', 'QUICK-CAST SPELL'], ['I O M ESC', 'PACK/LOG/MAP/MENU'],
];
const DIFFS = ['easy', 'normal', 'hard'];
const SHAKES = [0, 0.5, 1];

export function systemTab(m) {
  const rows = ['RESUME', 'SAVE GAME', 'LOAD GAME', 'VOLUME', 'MUSIC', 'FULLSCREEN', 'SLOT', 'DIFFICULTY', 'SCREEN SHAKE', 'FLASHES', 'PIXEL SCALE', 'MOUSE', 'SNEAK MODE', 'HOLD TO CHAIN', 'LARGE UI', 'CONTROLS', 'QUIT TO TITLE'];
  const VISIBLE = 9;
  let mode = 'main';          // main | controls
  let waiting = null;         // action being rebound
  const ctrl = { cursor: 0, scroll: 0 };
  const SLIDERS = ['VOLUME', 'SLOT', 'DIFFICULTY', 'SCREEN SHAKE'];

  const adjust = (dir) => {
    const r = rows[m.cursor];
    if (r === 'VOLUME') setVolume(Math.round((settings.volume + dir * 0.1) * 10) / 10);
    else if (r === 'SLOT') settings.slot = ((settings.slot - 1 + dir + SLOTS) % SLOTS) + 1;
    else if (r === 'DIFFICULTY') settings.difficulty = DIFFS[(DIFFS.indexOf(settings.difficulty) + dir + 3) % 3];
    else if (r === 'SCREEN SHAKE') settings.shake = SHAKES[(SHAKES.indexOf(settings.shake) + dir + 3) % 3];
    else return;
    saveSettings(); sfx.play('select'); m.dirty = true;
  };

  const toggle = (key) => { settings[key] = !settings[key]; saveSettings(); sfx.play('select'); m.dirty = true; };

  function mainInput() {
    m.nav(rows.length, VISIBLE);
    if (SLIDERS.includes(rows[m.cursor])) {
      if (keys.pressed('left')) adjust(-1);
      if (keys.pressed('right')) adjust(1);
    }
    if (!keys.pressed('interact')) return;
    const gs = m.gs;
    switch (rows[m.cursor]) {
      case 'RESUME': m.close(); break;
      case 'SAVE GAME': saveGame(gs); m.dirty = true; break;
      case 'LOAD GAME':
        if (!loadGame()) { bus.emit('toast', 'NO SAVE IN THIS SLOT', 11); sfx.play('nostamina'); break; }
        m.scene.stop();
        ui.modal = false;
        gs.scene.restart({ map: S.map, spawn: S.spawn, pos: S.x != null ? { x: S.x, y: S.y } : null });
        bus.emit('toast', 'GAME LOADED', 15);
        break;
      case 'MUSIC': setMusic(!settings.music); sfx.play('select'); m.dirty = true; break;
      case 'FULLSCREEN': m.scale.toggleFullscreen(); break;
      case 'FLASHES': toggle('flashes'); break;
      case 'PIXEL SCALE': toggle('intScale'); window.__applyScaling?.(); break;
      case 'MOUSE': toggle('mouse'); break;
      case 'SNEAK MODE': toggle('sneakToggle'); break;
      case 'HOLD TO CHAIN': toggle('holdChain'); break;
      case 'LARGE UI': toggle('largeUi'); bus.emit('uiscale'); break;
      case 'CONTROLS': mode = 'controls'; ctrl.cursor = 0; ctrl.scroll = 0; m.dirty = true; sfx.play('select'); break;
      case 'QUIT TO TITLE':
        music.stop();
        ui.modal = false;
        m.scene.stop('Hud'); m.scene.stop('Game'); m.scene.start('Title');
        break;
      default: break;
    }
  }

  const ctrlRows = ACTION_NAMES.length + 1;      // + reset
  function ctrlInput() {
    if (waiting) return;
    let moved = false;
    if (keys.pressed('down')) { ctrl.cursor = (ctrl.cursor + 1) % ctrlRows; moved = true; }
    if (keys.pressed('up')) { ctrl.cursor = (ctrl.cursor + ctrlRows - 1) % ctrlRows; moved = true; }
    if (moved) {
      if (ctrl.cursor < ctrl.scroll) ctrl.scroll = ctrl.cursor;
      if (ctrl.cursor >= ctrl.scroll + VISIBLE) ctrl.scroll = ctrl.cursor - VISIBLE + 1;
      sfx.play('move'); m.dirty = true;
    }
    if (keys.pressed('pause')) { mode = 'main'; m.dirty = true; sfx.play('back'); m.warm = 2; return; }
    if (keys.pressed('interact')) {
      if (ctrl.cursor === ACTION_NAMES.length) { resetBindings(); sfx.play('back'); bus.emit('toast', 'CONTROLS RESET', 13); m.dirty = true; return; }
      const act = ACTION_NAMES[ctrl.cursor][0];
      waiting = act; m.dirty = true; sfx.play('select');
      m.warm = 2;
      capture((code) => {
        waiting = null; m.dirty = true;
        if (code === 'Escape') { sfx.play('back'); return; }
        setBinding(act, code);
        sfx.play('equip');
      });
    }
  }

  const row = (g, i, y, label, value, vcol = 5) => {
    if (i === m.cursor) { g.fillStyle(C[3]); g.fillRect(8, y - 2, 124, 12); g.fillStyle(C[13]); g.fillRect(8, y - 2, 2, 12); }
    m.T(14, y, label, i === m.cursor ? 6 : 5);
    if (value != null) m.T(128 - textW(String(value)), y, String(value), vcol);
  };

  return {
    name: 'SYSTEM',
    help: 'W/S MOVE  E SELECT  A/D ADJUST  ESC RESUME',
    busy: () => mode === 'controls' || !!waiting || capturing(),
    captureLR: () => mode === 'controls' || SLIDERS.includes(rows[m.cursor]),
    cursorOf: () => (mode === 'controls' ? ctrl.cursor : m.cursor),
    rowAt: (x, y) => {
      if (waiting || x < 8 || x > (mode === 'controls' ? W - 8 : 132) || y < 26) return -1;
      const k = Math.floor((y - 26) / 13);
      if (k >= VISIBLE) return -1;
      const i = (mode === 'controls' ? ctrl.scroll : m.scroll) + k;
      return i < (mode === 'controls' ? ctrlRows : rows.length) ? i : -1;
    },
    hover: (i) => { if (mode === 'controls') ctrl.cursor = i; else m.cursor = i; },
    clickKey: (i) => (mode === 'main' && SLIDERS.includes(rows[i]) ? BINDINGS.right[0] : BINDINGS.interact[0]),
    input() {
      if (mode === 'controls') ctrlInput(); else mainInput();
    },
    render() {
      const g = m.bg;
      if (mode === 'controls') {
        m.help = waiting ? 'PRESS THE NEW KEY  (ESC CANCELS)' : 'E REBIND  ESC BACK';
        panel(g, 6, 22, W - 12, 134, 2);
        ACTION_NAMES.concat([['reset', 'RESET TO DEFAULTS']]).slice(ctrl.scroll, ctrl.scroll + VISIBLE).forEach(([act, name], k) => {
          const i = ctrl.scroll + k, y = 28 + k * 13;
          if (i === ctrl.cursor) { g.fillStyle(C[3]); g.fillRect(8, y - 2, W - 16, 12); g.fillStyle(C[13]); g.fillRect(8, y - 2, 2, 12); }
          m.T(14, y, name, i === ctrl.cursor ? 6 : 5);
          if (act !== 'reset') {
            const txt = waiting === act ? '...' : (BINDINGS[act] || []).slice(0, 2).map(codeName).join(' / ');
            m.T(W - 14 - textW(txt), y, txt, waiting === act ? 13 : 15);
          }
        });
        return;
      }
      panel(g, 6, 22, 128, 134, 2);
      rows.slice(m.scroll, m.scroll + VISIBLE).forEach((r, k) => {
        const i = m.scroll + k, y = 28 + k * 13;
        let v = null, vc = 5;
        if (r === 'VOLUME') {
          const n = Math.round(settings.volume * 10);
          if (i === m.cursor) { g.fillStyle(C[3]); g.fillRect(8, y - 2, 124, 12); g.fillStyle(C[13]); g.fillRect(8, y - 2, 2, 12); }
          m.T(14, y, r, i === m.cursor ? 6 : 5);
          g.fillStyle(C[0]); g.fillRect(70, y, 56, 7); g.fillStyle(C[1]); g.fillRect(71, y + 1, 54, 5); g.fillStyle(C[15]); g.fillRect(71, y + 1, n * 5.4, 5);
          return;
        }
        if (r === 'MUSIC') { v = settings.music ? 'ON' : 'OFF'; vc = settings.music ? 8 : 11; }
        else if (r === 'LOAD GAME') { v = saveInfo() ? null : 'EMPTY'; vc = 3; }
        else if (r === 'SLOT') { v = `${settings.slot}/${SLOTS}${saveInfo() ? '' : ' EMPTY'}`; vc = 13; }
        else if (r === 'DIFFICULTY') { v = settings.difficulty.toUpperCase(); vc = { easy: 8, normal: 5, hard: 11 }[settings.difficulty]; }
        else if (r === 'SCREEN SHAKE') v = settings.shake === 0 ? 'OFF' : settings.shake === 0.5 ? 'LOW' : 'FULL';
        else if (r === 'FLASHES') { v = settings.flashes ? 'ON' : 'OFF'; vc = settings.flashes ? 8 : 11; }
        else if (r === 'PIXEL SCALE') { v = settings.intScale ? 'INTEGER' : 'FIT'; }
        else if (r === 'MOUSE') { v = settings.mouse ? 'ON' : 'OFF'; vc = settings.mouse ? 8 : 4; }
        else if (r === 'SNEAK MODE') { v = settings.sneakToggle ? 'TOGGLE' : 'HOLD'; }
        else if (r === 'HOLD TO CHAIN') { v = settings.holdChain ? 'ON' : 'OFF'; vc = settings.holdChain ? 8 : 4; }
        else if (r === 'LARGE UI') { v = settings.largeUi ? 'ON' : 'OFF'; vc = settings.largeUi ? 8 : 4; }
        row(g, i, y, r, v, vc);
      });
      if (rows.length > VISIBLE) {
        const frac = m.scroll / (rows.length - VISIBLE);
        g.fillStyle(C[3]); g.fillRect(131, 24, 2, 128); g.fillStyle(C[13]); g.fillRect(131, 24 + frac * 116, 2, 12);
      }
      // right: info + controls
      panel(g, 138, 22, W - 144, 134, 2);
      const info = saveInfo();
      m.T(144, 27, MAPS[S.map]?.name || '', 13);
      m.T(144, 36, 'PLAYTIME ' + fmtTime(S.playtime), 5);
      m.T(144, 45, info ? (info.recovered ? 'SLOT RECOVERED FROM BACKUP' : 'LAST SAVE ' + new Date(info.t).toLocaleTimeString().slice(0, 5)) : 'SLOT ' + settings.slot + ' IS EMPTY', 4);
      g.fillStyle(C[3]); g.fillRect(144, 52, W - 156, 1);
      m.T(144, 55, 'CONTROLS', 15);
      CONTROLS.forEach(([k, v], i) => {
        m.T(144, 65 + i * 8, k, 6);
        m.T(204, 65 + i * 8, v, 4);
      });
    },
  };
}
