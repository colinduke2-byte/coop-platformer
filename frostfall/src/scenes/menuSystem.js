import { C, W, H, BINDINGS } from '../config.js';
import { S } from '../systems/state.js';
import { keys, capture, capturing, setBinding, resetBindings, codeName } from '../systems/keys.js';
import { saveGame, loadGame, saveInfo, fmtTime, SLOTS } from '../systems/save.js';
import { sfx, setVolume, setMusic, setChannel, music } from '../audio/sfx.js';
import { settings, saveSettings } from '../systems/settings.js';
import { ui } from '../systems/ui.js';
import { bus } from '../systems/bus.js';
import { PAD_ACTIONS, padMap, setPadBinding, resetPadMap, getPadInfo, capturePad } from '../systems/keys.js';
import { textW } from '../art/font.js';
import { panel } from './MenuScene.js';
import { MAPS } from '../data/maps.js';

const ACTION_NAMES = [
  ['up', 'MOVE UP'], ['down', 'MOVE DOWN'], ['left', 'MOVE LEFT'], ['right', 'MOVE RIGHT'], ['roll', 'DODGE ROLL'], ['sword', 'SWORD'], ['bow', 'BOW'],
  ['spell', 'CAST SPELL'], ['swap', 'SWAP SPELL'], ['shout', 'SHOUT'], ['shoutswap', 'SWAP SHOUT'], ['lockon', 'LOCK ON'], ['ammo', 'SWITCH ARROWS'], ['heavy', 'HEAVY ATTACK'], ['block', 'BLOCK'], ['sneak', 'SNEAK'], ['interact', 'INTERACT'],
  ['potion1', 'HEALTH POTION'], ['potion2', 'MANA POTION'], ['potion3', 'STAMINA POTION'], ['inventory', 'PACK'], ['journal', 'JOURNAL'], ['map', 'MAP'], ['pause', 'PAUSE MENU'],
  ['spell1', 'QUICK FIREBALL'], ['spell2', 'QUICK FROST'], ['spell3', 'QUICK LIGHTNING'], ['spell4', 'QUICK HEALING'], ['spell5', 'QUICK WARD'], ['spell6', 'QUICK BLINK'], ['spell7', 'QUICK FROST NOVA'], ['spell8', 'QUICK SPIRIT WOLF'],
];
const CONTROLS = [
  ['WASD', 'MOVE'], ['SPACE', 'DODGE ROLL'], ['J', 'SWORD 3X COMBO'], ['K HOLD', 'BOW, CHARGE'],
  ['L / Q', 'SPELL / SWAP'], ['R / G', 'SHOUT / SWAP'], ['U / T', 'HEAVY / LOCK ON'], ['F HOLD', 'BLOCK, PARRY'], ['C / SHIFT', 'SNEAK'],
  ['E', 'TALK/OPEN/REST'], ['1-3 / 4-8', 'POTIONS / SPELLS'], ['I O M ESC', 'PACK/LOG/MAP/MENU'],
];
const DIFFS = ['easy', 'normal', 'hard'];
const SHAKES = [0, 0.5, 1];

export function systemTab(m) {
  const rows = ['RESUME', 'SAVE GAME', 'LOAD GAME', 'VOLUME', 'MUSIC', 'MUSIC LVL', 'SFX LVL', 'AMBIENT', 'FULLSCREEN', 'SLOT', 'DIFFICULTY', 'SCREEN SHAKE', 'FLASHES', 'PIXEL SCALE', 'MOUSE', 'SNEAK MODE', 'HOLD TO CHAIN', 'LARGE UI', 'HIT STOP', 'DAMAGE NUMBERS', 'CONTROLS', 'CONTROLLER', 'QUIT TO TITLE'];
  const VISIBLE = 9;
  let mode = 'main';          // main | controls | pad
  let waitingPad = null;      // game key code being learned from the controller
  const pc = { cursor: 0, scroll: 0 };
  let waiting = null;         // action being rebound
  const ctrl = { cursor: 0, scroll: 0 };
  const SLIDERS = ['VOLUME', 'MUSIC LVL', 'SFX LVL', 'AMBIENT', 'SLOT', 'DIFFICULTY', 'SCREEN SHAKE'];
  const CHANNEL = { 'MUSIC LVL': ['music', 'musicVol'], 'SFX LVL': ['sfx', 'sfxVol'], 'AMBIENT': ['amb', 'ambVol'] };

  const adjust = (dir) => {
    const r = rows[m.cursor];
    if (r === 'VOLUME') setVolume(Math.round((settings.volume + dir * 0.1) * 10) / 10);
    else if (CHANNEL[r]) setChannel(CHANNEL[r][0], Math.round(((settings[CHANNEL[r][1]] ?? 1) + dir * 0.1) * 10) / 10);
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
      case 'HIT STOP': toggle('hitStop'); break;
      case 'DAMAGE NUMBERS': toggle('dmgNumbers'); break;
      case 'PIXEL SCALE': toggle('intScale'); window.__applyScaling?.(); break;
      case 'MOUSE': toggle('mouse'); break;
      case 'SNEAK MODE': toggle('sneakToggle'); break;
      case 'HOLD TO CHAIN': toggle('holdChain'); break;
      case 'LARGE UI': toggle('largeUi'); bus.emit('uiscale'); break;
      case 'CONTROLLER': mode = 'pad'; pc.cursor = 0; pc.scroll = 0; m.dirty = true; sfx.play('select'); break;
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

  const padRows = PAD_ACTIONS.length + 1;
  const STD = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'BACK', 'START', 'L3', 'R3'];
  const niceId = (id) => {
    if (/^b\d+$/.test(id)) { const n = Number(id.slice(1)); return getPadInfo().mapping === 'standard' && STD[n] ? STD[n] : 'BTN ' + n; }
    if (/^h[udlr]$/.test(id)) return 'DPAD ' + { u: 'UP', d: 'DOWN', l: 'LEFT', r: 'RIGHT' }[id[1]];
    const m2 = id.match(/^a(\d+)([+-])$/); if (m2) return (m2[1] === '2' || m2[1] === '3' ? 'R-STICK ' : 'AXIS ' + m2[1] + ' ') + (m2[1] === '3' ? (m2[2] === '-' ? 'UP' : 'DOWN') : m2[1] === '2' ? (m2[2] === '-' ? 'LEFT' : 'RIGHT') : m2[2]);
    return id;
  };
  const boundTo = (code) => Object.entries(padMap()).filter(([id, c]) => c === code && !/^b1[2-5]$/.test(id)).map(([id]) => niceId(id)).slice(0, 2).join(' / ') || '-';
  function padInput() {
    m.dirty = true;                                      // live input readout
    if (waitingPad) {
      if (keys.pressed('pause')) { capturePad(null); waitingPad = null; sfx.play('back'); }
      return;
    }
    let moved = false;
    if (keys.pressed('down')) { pc.cursor = (pc.cursor + 1) % padRows; moved = true; }
    if (keys.pressed('up')) { pc.cursor = (pc.cursor + padRows - 1) % padRows; moved = true; }
    if (moved) {
      if (pc.cursor < pc.scroll) pc.scroll = pc.cursor;
      if (pc.cursor >= pc.scroll + 7) pc.scroll = pc.cursor - 6;
      sfx.play('move');
    }
    if (keys.pressed('pause')) { mode = 'main'; sfx.play('back'); m.warm = 2; return; }
    if (keys.pressed('interact')) {
      if (pc.cursor === PAD_ACTIONS.length) { resetPadMap(); sfx.play('back'); bus.emit('toast', 'CONTROLLER RESET', 13); return; }
      const code = PAD_ACTIONS[pc.cursor][0];
      waitingPad = code; sfx.play('select'); m.warm = 2;
      capturePad((id) => { waitingPad = null; setPadBinding(code, id); sfx.play('equip'); m.dirty = true; });
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
    busy: () => mode === 'controls' || mode === 'pad' || !!waiting || capturing(),
    captureLR: () => mode === 'controls' || mode === 'pad' || SLIDERS.includes(rows[m.cursor]),
    cursorOf: () => (mode === 'controls' ? ctrl.cursor : m.cursor),
    rowAt: (x, y) => {
      if (mode === 'pad' || waiting || x < 8 || x > (mode === 'controls' ? W - 8 : 132) || y < 26) return -1;
      const k = Math.floor((y - 26) / 13);
      if (k >= VISIBLE) return -1;
      const i = (mode === 'controls' ? ctrl.scroll : m.scroll) + k;
      return i < (mode === 'controls' ? ctrlRows : rows.length) ? i : -1;
    },
    hover: (i) => { if (mode === 'controls') ctrl.cursor = i; else m.cursor = i; },
    clickKey: (i) => (mode === 'main' && SLIDERS.includes(rows[i]) ? BINDINGS.right[0] : BINDINGS.interact[0]),
    input() {
      if (mode === 'controls') ctrlInput(); else if (mode === 'pad') padInput(); else mainInput();
    },
    render() {
      const g = m.bg;
      if (mode === 'pad') {
        const info = getPadInfo();
        m.help = waitingPad ? 'PRESS A BUTTON ON THE CONTROLLER  (ESC CANCELS)' : 'E LEARN BUTTON  ESC BACK';
        panel(g, 6, 22, W - 12, 134, 2);
        m.T(12, 26, info.id ? info.id.slice(0, 44) : 'NO CONTROLLER SEEN - PRESS A BUTTON ON IT', info.id ? 13 : 11);
        m.T(12, 35, info.id ? 'MODE: ' + info.mapping.toUpperCase() + '   LIVE: ' + (info.live.map(niceId).join(' ').slice(0, 30) || '-') : 'PAIR IT IN YOUR SYSTEM SETTINGS FIRST', 4);
        g.fillStyle(C[3]); g.fillRect(8, 44, W - 16, 1);
        PAD_ACTIONS.concat([['reset', 'RESET TO DEFAULTS']]).slice(pc.scroll, pc.scroll + 7).forEach(([code, name], k) => {
          const i = pc.scroll + k, y = 48 + k * 14;
          if (i === pc.cursor) { g.fillStyle(C[3]); g.fillRect(8, y - 2, W - 16, 12); g.fillStyle(C[13]); g.fillRect(8, y - 2, 2, 12); }
          m.T(14, y, name, i === pc.cursor ? 6 : 5);
          if (code !== 'reset') { const t = waitingPad === code ? '...' : boundTo(code); m.T(W - 14 - textW(t), y, t, waitingPad === code ? 13 : 15); }
        });
        return;
      }
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
        if (r === 'VOLUME' || CHANNEL[r]) {
          const n = Math.round((r === 'VOLUME' ? settings.volume : (settings[CHANNEL[r][1]] ?? 1)) * 10);
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
        else if (r === 'HIT STOP') { v = settings.hitStop === false ? 'OFF' : 'ON'; vc = settings.hitStop === false ? 11 : 8; }
        else if (r === 'DAMAGE NUMBERS') { v = settings.dmgNumbers === false ? 'OFF' : 'ON'; vc = settings.dmgNumbers === false ? 11 : 8; }
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
      CONTROLS.forEach(([k, v], i) => {
        m.T(144, 57 + i * 8, k, 6);
        m.T(204, 57 + i * 8, v, 4);
      });
    },
  };
}
