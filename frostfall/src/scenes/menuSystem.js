import { C, W, BINDINGS } from '../config.js';
import { S } from '../systems/state.js';
import { keys, capture, capturing, setBinding, resetBindings, codeName } from '../systems/keys.js';
import { fit, setContrast } from '../art/font.js';
import { saveGame, loadGame, saveInfo, fmtTime, SLOTS, lastSaveTime, storage, tabs } from '../systems/save.js';
import { openSaveTools } from '../ui/savetools.js';
import { unlockedCloaks, currentCloak } from '../systems/achievements.js';
import { runScore } from '../systems/daily.js';
import { sfx, setVolume, setMusic, setChannel, music } from '../audio/sfx.js';
import { settings, saveSettings } from '../systems/settings.js';
import { ui } from '../systems/ui.js';
import { bus } from '../systems/bus.js';
import { PAD_ACTIONS, padMap, setPadBinding, resetPadMap, getPadInfo, capturePad } from '../systems/keys.js';
import { textW } from '../art/font.js';
import { panel } from '../ui/panel.js';
import { MAPS } from '../data/maps.js';
import { CVD_MODES, applyCvd, padLabel } from '../systems/access.js';
import { padActive } from '../systems/keys.js';
import { durOn } from '../systems/durability.js';
import { unstick } from '../systems/unstick.js';

const ACTION_NAMES = [
  ['up', 'MOVE UP'], ['down', 'MOVE DOWN'], ['left', 'MOVE LEFT'], ['right', 'MOVE RIGHT'], ['roll', 'DODGE ROLL'], ['sword', 'SWORD'], ['bow', 'BOW'],
  ['spell', 'CAST SPELL'], ['swap', 'SWAP SPELL'], ['shout', 'SHOUT'], ['shoutswap', 'SWAP SHOUT'], ['lockon', 'LOCK ON'], ['ammo', 'SWITCH ARROWS'], ['heavy', 'HEAVY ATTACK'], ['block', 'BLOCK'], ['sneak', 'SNEAK'], ['interact', 'INTERACT'],
  ['potion1', 'HEALTH POTION'], ['potion2', 'MANA POTION'], ['potion3', 'STAMINA POTION'], ['inventory', 'PACK'], ['journal', 'JOURNAL'], ['map', 'MAP'], ['pause', 'PAUSE MENU'],
  ['spell1', 'QUICK FIREBALL'], ['spell2', 'QUICK FROST'], ['spell3', 'QUICK LIGHTNING'], ['spell4', 'QUICK HEALING'], ['spell5', 'QUICK WARD'], ['spell6', 'QUICK BLINK'], ['spell7', 'QUICK FROST NOVA'], ['spell8', 'QUICK EMBER NOVA'],
];
// The keyboard cheat sheet, read from the player's own bindings (so it stays right after rebinding).
const kn = (a) => codeName((BINDINGS[a] || [])[0] || '-');
const CONTROLS = () => {
  const mv = ['up', 'left', 'down', 'right'].map(kn);
  return [
    [mv.every((k) => k.length === 1) ? mv.join('') : mv.join(' '), 'MOVE'], [kn('roll'), 'DODGE ROLL'], [kn('sword'), 'SWORD 3X COMBO'], [kn('bow') + ' HOLD', 'BOW, CHARGE'],
    [kn('spell') + ' / ' + kn('swap'), 'SPELL / SWAP'], [kn('shout') + ' / ' + kn('shoutswap'), 'SHOUT / SWAP'], [kn('heavy') + ' / ' + kn('lockon'), 'HEAVY / LOCK ON'],
    [kn('block') + ' HOLD', 'BLOCK, PARRY'], [kn('sneak'), 'SNEAK'], [kn('interact'), 'TALK/OPEN/REST'],
    [`${kn('potion1')}-${kn('potion3')} / ${kn('spell1')}+`, 'POTIONS / SPELLS'], [[kn('inventory'), kn('journal'), kn('map'), kn('pause')].join(' '), 'PACK/LOG/MAP/MENU'],
  ];
};
// The same list for a controller, read from the player's own pad mapping.
const PAD_CONTROLS = [[['Space'], 'DODGE ROLL'], [['KeyJ'], 'SWORD COMBO'], [['KeyK'], 'BOW (HOLD)'], [['KeyL', 'KeyQ'], 'SPELL / SWAP'], [['KeyR', 'KeyG'], 'SHOUT / SWAP'],
  [['KeyU', 'KeyT'], 'HEAVY / LOCK'], [['KeyF'], 'BLOCK, PARRY'], [['KeyC'], 'SNEAK'], [['KeyE'], 'TALK/OPEN/REST'], [['Digit1', 'Digit2'], 'HP / MP POTION'], [['Escape'], 'MENU']];
const shortPad = (n) => (n || '-').replace('R-STICK ', 'RS ').replace('D-PAD ', 'DP ').replace('LEFT', 'L').replace('RIGHT', 'R').replace('UP', 'U').replace('DOWN', 'D');
const padControls = () => [['L-STICK', 'MOVE'], ...PAD_CONTROLS.map(([codes, what]) => [codes.map((c) => shortPad(padLabel(c))).join('/'), what])];
const DIFFS = ['easy', 'normal', 'hard'];
// One line about each row, shown in the help bar while it is selected.
const HINTS = {
  'RESUME': 'BACK TO THE GAME', 'UNSTUCK': 'STUCK? MOVES YOU TO THE NEAREST OPEN SPOT', 'SAVE GAME': 'SAVE TO THIS SLOT. FIRES AND BEDS SAVE TOO',
  'LOAD GAME': 'RELOAD THIS SLOT. UNSAVED PROGRESS IS LOST', 'SAVES & BUG REPORT': 'EXPORT OR IMPORT SAVES, COPY A BUG REPORT',
  'VOLUME': 'MASTER VOLUME', 'MUSIC': 'MUSIC ON OR OFF', 'MUSIC LVL': 'MUSIC LOUDNESS', 'SFX LVL': 'EFFECTS LOUDNESS', 'AMBIENT': 'WIND, CRYPT AND TOWN SOUNDS',
  'FULLSCREEN': 'FILL THE SCREEN (ALSO F11)', 'SLOT': 'THREE SAVE SLOTS', 'DIFFICULTY': 'CHANGES ENEMIES, PRICES AND DROPS',
  'SCREEN SHAKE': 'OFF, LOW OR FULL', 'FLASHES': 'SCREEN FLASHES AND THE LOW-HEALTH PULSE', 'PIXEL SCALE': 'INTEGER IS CRISP. FIT FILLS THE WINDOW',
  'MOUSE': 'AIM AND ATTACK WITH THE MOUSE', 'SNEAK MODE': 'HOLD THE SNEAK KEY, OR TOGGLE IT', 'HOLD TO CHAIN': 'HOLD SWORD TO KEEP THE COMBO GOING',
  'LARGE UI': 'BIGGER HUD BARS, NUMBERS AND TARGET BAR', 'ROTATE VIEW': 'PHONE HELD UPRIGHT: TURN THE PICTURE',
  'COLOUR MODE': 'COLOUR-BLIND FRIENDLY PALETTES', 'HIT STOP': 'THE TINY PAUSE WHEN A BLOW LANDS', 'PAD LAYOUT': 'MODERN: LB BLOCK, RB HEAVY. CLASSIC: L3, STICK', 'DAMAGE NUMBERS': 'SHOW DAMAGE ABOVE ENEMIES',
  'DURABILITY': 'GEAR WEARS OUT. ALWAYS ON IN HARD', 'CLOAK': 'CLOAKS COME FROM TROPHIES',
  'CONTROLS': 'REBIND EVERY KEY', 'CONTROLLER': 'REBIND THE GAMEPAD, SEE WHAT IT SENDS', 'QUIT TO TITLE': 'SAVES, THEN GOES BACK TO THE TITLE',
  'REDUCE MOTION': 'STILL MARKERS, NO BLINKING, LESS SNOW', 'HIGH CONTRAST': 'BRIGHTER TEXT ON THE DARK PANELS', 'BAR NUMBERS': 'NUMBERS ON THE HEALTH, MAGIC, STAMINA BARS',
  'TEXT SPEED': 'HOW FAST DIALOGUE TYPES OUT', 'FRAME RATE': 'LOWER SAVES BATTERY ON LAPTOPS AND PHONES', 'STICK DEADZONE': 'HOW FAR A STICK MOVES BEFORE IT COUNTS',
};
const SHAKES = [0, 0.5, 1];

export function systemTab(m) {
  // The list is long, so it is grouped into pages, in this order. Q jumps to the first row of the next page.
  const PAGES = [['GAME', ['RESUME', 'SAVE GAME', 'LOAD GAME', 'SLOT', 'SAVES & BUG REPORT', 'DIFFICULTY', 'DURABILITY', 'TEXT SPEED', 'UNSTUCK', 'QUIT TO TITLE']],
    ['SOUND', ['VOLUME', 'MUSIC', 'MUSIC LVL', 'SFX LVL', 'AMBIENT']],
    ['SCREEN', ['FULLSCREEN', 'FRAME RATE', 'SCREEN SHAKE', 'FLASHES', 'REDUCE MOTION', 'PIXEL SCALE', 'LARGE UI', 'BAR NUMBERS', 'HIGH CONTRAST', 'ROTATE VIEW', 'COLOUR MODE', 'HIT STOP', 'DAMAGE NUMBERS', 'CLOAK']],
    ['INPUT', ['MOUSE', 'SNEAK MODE', 'HOLD TO CHAIN', 'STICK DEADZONE', 'PAD LAYOUT', 'CONTROLS', 'CONTROLLER']]];
  const rows = PAGES.flatMap(([, l]) => l).filter((r) => !(S.quick || S.daily) || !['SAVE GAME', 'LOAD GAME', 'SLOT'].includes(r));   // no saving inside Arena or a Daily run
  let armed = null;           // 'LOAD GAME' / 'QUIT TO TITLE' wait for a second press
  const VISIBLE = 9;
  let mode = 'main';          // main | controls | pad
  let waitingPad = null;      // game key code being learned from the controller
  const pc = { cursor: 0, scroll: 0 };
  let waiting = null;         // action being rebound
  const ctrl = { cursor: 0, scroll: 0 };
  const SLIDERS = ['COLOUR MODE', 'CLOAK', 'VOLUME', 'MUSIC LVL', 'SFX LVL', 'AMBIENT', 'SLOT', 'DIFFICULTY', 'SCREEN SHAKE', 'TEXT SPEED', 'FRAME RATE', 'STICK DEADZONE'];
  const SPEEDS = ['slow', 'normal', 'fast', 'instant'], RATES = [0, 60, 30];
  const CHANNEL = { 'MUSIC LVL': ['music', 'musicVol'], 'SFX LVL': ['sfx', 'sfxVol'], 'AMBIENT': ['amb', 'ambVol'] };

  const adjust = (dir) => {
    const r = rows[m.cursor];
    if (r === 'VOLUME') setVolume(Math.round((settings.volume + dir * 0.1) * 10) / 10);
    else if (CHANNEL[r]) setChannel(CHANNEL[r][0], Math.round(((settings[CHANNEL[r][1]] ?? 1) + dir * 0.1) * 10) / 10);
    else if (r === 'CLOAK') { const l = unlockedCloaks(), i = Math.max(0, l.indexOf(currentCloak())); S.cloak = l[(i + dir + l.length) % l.length].col; m.gs.player?.applyCloak?.(); }
    else if (r === 'COLOUR MODE') { settings.cvd = CVD_MODES[(CVD_MODES.indexOf(settings.cvd) + dir + CVD_MODES.length) % CVD_MODES.length]; applyCvd(); }
    else if (r === 'SLOT') settings.slot = ((settings.slot - 1 + dir + SLOTS) % SLOTS) + 1;
    else if (r === 'DIFFICULTY') settings.difficulty = DIFFS[(DIFFS.indexOf(settings.difficulty) + dir + 3) % 3];
    else if (r === 'SCREEN SHAKE') settings.shake = SHAKES[(SHAKES.indexOf(settings.shake) + dir + 3) % 3];
    else if (r === 'TEXT SPEED') settings.textSpeed = SPEEDS[(SPEEDS.indexOf(settings.textSpeed) + dir + 4) % 4];
    else if (r === 'FRAME RATE') { settings.fpsCap = RATES[(RATES.indexOf(settings.fpsCap) + dir + 3) % 3]; window.__applyFps?.(); }
    else if (r === 'STICK DEADZONE') settings.deadzone = Math.round(Math.max(0.2, Math.min(0.7, (settings.deadzone ?? 0.45) + dir * 0.05)) * 100) / 100;
    else return;
    saveSettings(); sfx.play('select'); m.dirty = true;
  };

  const toggle = (key) => { settings[key] = !settings[key]; saveSettings(); sfx.play('select'); m.dirty = true; };

  const pageOf = (row) => Math.max(0, PAGES.findIndex(([, l]) => l.includes(row)));
  function nextPage() {
    const to = (pageOf(rows[m.cursor]) + 1) % PAGES.length;
    const i = rows.findIndex((r) => PAGES[to][1].includes(r));
    if (i < 0) return;
    m.cursor = i; m.scroll = Math.max(0, Math.min(i, rows.length - VISIBLE)); sfx.play('select'); m.dirty = true;
  }
  function mainInput() {
    const was = m.cursor;
    m.nav(rows.length, VISIBLE);
    if (m.cursor !== was) armed = null;
    if (keys.pressed('swap')) { nextPage(); armed = null; }
    if (SLIDERS.includes(rows[m.cursor])) {
      if (keys.pressed('left')) adjust(-1);
      if (keys.pressed('right')) adjust(1);
    }
    if (!keys.pressed('interact')) return;
    const gs = m.gs;
    switch (rows[m.cursor]) {
      case 'RESUME': m.close(); break;
      case 'UNSTUCK': { const moved = unstick(gs, gs.player, 'manual'); if (!moved) bus.emit('toast', 'YOU ARE NOT STUCK', 4); m.close(); break; }
      case 'SAVE GAME': saveGame(gs); m.dirty = true; break;
      case 'SAVES & BUG REPORT': openSaveTools(m, { onImported: () => { m.dirty = true; } }); sfx.play('select'); break;
      case 'LOAD GAME':
        if (!saveInfo()) { bus.emit('toast', 'NO SAVE IN THIS SLOT', 11); sfx.play('nostamina'); break; }
        if (armed !== 'LOAD GAME') { armed = 'LOAD GAME'; sfx.play('alert'); m.dirty = true; break; }
        armed = null;
        if (!loadGame()) { sfx.play('nostamina'); break; }
        m.scene.stop();
        ui.releaseAll();
        gs.scene.restart({ map: S.map, spawn: S.spawn, pos: S.x != null ? { x: S.x, y: S.y } : null });
        bus.emit('toast', 'GAME LOADED', 15);
        break;
      case 'MUSIC': setMusic(!settings.music); sfx.play('select'); m.dirty = true; break;
      case 'FULLSCREEN': m.scale.toggleFullscreen(); break;
      case 'FLASHES': toggle('flashes'); break;
      case 'HIT STOP': toggle('hitStop'); break;
      case 'PAD LAYOUT': settings.padLayout = settings.padLayout === 'classic' ? 'modern' : 'classic'; saveSettings(); sfx.play('select'); m.dirty = true; break;
      case 'DURABILITY': if (settings.difficulty !== 'easy') toggle(settings.difficulty === 'hard' ? 'durabilityHard' : 'durability'); break;
      case 'DAMAGE NUMBERS': toggle('dmgNumbers'); break;
      case 'PIXEL SCALE': toggle('intScale'); window.__applyScaling?.(); break;
      case 'MOUSE': toggle('mouse'); break;
      case 'SNEAK MODE': toggle('sneakToggle'); break;
      case 'HOLD TO CHAIN': toggle('holdChain'); break;
      case 'REDUCE MOTION': toggle('reduceMotion'); break;
      case 'HIGH CONTRAST': toggle('highContrast'); setContrast(settings.highContrast); bus.emit('uiscale'); break;
      case 'BAR NUMBERS': toggle('hudNumbers'); break;
      case 'LARGE UI': toggle('largeUi'); bus.emit('uiscale'); break;
      case 'ROTATE VIEW': settings.autoRotate = settings.autoRotate === false; saveSettings(); m.dirty = true; sfx.play('select'); break;
      case 'CONTROLLER': mode = 'pad'; pc.cursor = 0; pc.scroll = 0; m.dirty = true; sfx.play('select'); break;
      case 'CONTROLS': mode = 'controls'; ctrl.cursor = 0; ctrl.scroll = 0; m.dirty = true; sfx.play('select'); break;
      case 'QUIT TO TITLE':
        if (armed !== 'QUIT TO TITLE') { armed = 'QUIT TO TITLE'; sfx.play('alert'); m.dirty = true; break; }
        armed = null;
        if (!S.quick && !S.daily) saveGame(gs, { quiet: true });        // your progress goes with you
        music.stop();
        ui.releaseAll();
        m.scene.stop('Hud'); m.scene.stop('Game'); m.scene.start('Title');
        break;
      default: break;
    }
  }

  const ctrlRows = ACTION_NAMES.length + 1;      // + reset
  function ctrlInput() {
    if (waiting) return;
    let moved = false;
    if (keys.repeat('down')) { ctrl.cursor = (ctrl.cursor + 1) % ctrlRows; moved = true; }
    if (keys.repeat('up')) { ctrl.cursor = (ctrl.cursor + ctrlRows - 1) % ctrlRows; moved = true; }
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
        const other = setBinding(act, code);
        const nameOf = (a) => (ACTION_NAMES.find(([x]) => x === a) || [a, a.toUpperCase()])[1];
        bus.emit('toast', other ? `${nameOf(act)}: ${codeName(code)}  (SWAPPED WITH ${nameOf(other)})` : `${nameOf(act)}: ${codeName(code)}`, other ? 12 : 13);
        sfx.play('equip');
      });
    }
  }

  const padRows = PAD_ACTIONS.length + 1;
  const STD = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'BACK', 'START', 'L3', 'R3'];
  const niceId = (id) => {
    if (/^b\d+$/.test(id)) { const n = Number(id.slice(1)), pi = getPadInfo(); return (!pi.id || pi.mapping === 'standard') && STD[n] ? STD[n] : 'BTN ' + n; }   // no pad yet: show the standard names
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
    if (keys.repeat('down')) { pc.cursor = (pc.cursor + 1) % padRows; moved = true; }
    if (keys.repeat('up')) { pc.cursor = (pc.cursor + padRows - 1) % padRows; moved = true; }
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
    rowIndex: (name) => rows.indexOf(name),          // for tests and tools: where a row is in the current list
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
        m.T(12, 26, info.id ? fit(info.id, 34) : 'NO PAD - PRESS A BUTTON ON IT', info.id ? 13 : 11);
        m.T(12, 35, info.id ? 'MODE: ' + info.mapping.toUpperCase() + '   LIVE: ' + (info.live.map(niceId).join(' ').slice(0, 30) || '-') : 'PAIR IT IN YOUR SYSTEM SETTINGS FIRST', 4);
        m.T(W - 14 - textW('L-STICK: MOVE'), 26, 'L-STICK: MOVE', 5);        // movement is fixed to the left stick and d-pad
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
            // mouse buttons only matter (and are only shown) with mouse controls on
            const txt = waiting === act ? '...' : (BINDINGS[act] || []).filter((c) => settings.mouse || !/^(Mouse|Wheel)/.test(c)).slice(0, 2).map(codeName).join(' / ') || '-';
            m.T(W - 14 - textW(txt), y, txt, waiting === act ? 13 : 15);
          }
        });
        if (ctrlRows > VISIBLE) {          // scrollbar: where you are in the list
          const frac = ctrl.scroll / (ctrlRows - VISIBLE), hgt = VISIBLE * 13;
          g.fillStyle(C[3]); g.fillRect(W - 10, 26, 2, hgt); g.fillStyle(C[13]); g.fillRect(W - 10, 26 + frac * (hgt - 12), 2, 12);
        }
        return;
      }
      m.help = armed === 'LOAD GAME' ? 'E AGAIN TO LOAD. UNSAVED PROGRESS IS LOST' : armed === 'QUIT TO TITLE' ? (S.quick || S.daily ? 'E AGAIN TO QUIT THIS RUN' : 'E AGAIN TO SAVE AND QUIT') : HINTS[rows[m.cursor]] || null;
      m.helpCol = armed ? 12 : null;
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
        else if (r === 'LOAD GAME') { v = armed === r ? 'SURE?' : saveInfo() ? null : 'EMPTY'; vc = armed === r ? 12 : 3; }
        else if (r === 'QUIT TO TITLE' && armed === r) { v = 'SURE?'; vc = 12; }
        else if (r === 'SLOT') { v = `${settings.slot}/${SLOTS}${saveInfo() ? '' : ' EMPTY'}`; vc = 13; }
        else if (r === 'DIFFICULTY') { v = settings.difficulty.toUpperCase(); vc = { easy: 8, normal: 5, hard: 11 }[settings.difficulty]; }
        else if (r === 'SCREEN SHAKE') v = settings.shake === 0 ? 'OFF' : settings.shake === 0.5 ? 'LOW' : 'FULL';
        else if (r === 'CLOAK') { v = currentCloak().name.toUpperCase(); vc = currentCloak().col; }
        else if (r === 'DURABILITY') { const on = durOn(); v = settings.difficulty === 'easy' ? 'OFF (EASY)' : on ? 'ON' : 'OFF'; vc = on ? 13 : 4; }
        else if (r === 'PAD LAYOUT') { v = settings.padLayout === 'classic' ? 'CLASSIC' : 'MODERN'; vc = 13; }
        else if (r === 'HIT STOP') { v = settings.hitStop === false ? 'OFF' : 'ON'; vc = settings.hitStop === false ? 11 : 8; }
        else if (r === 'DAMAGE NUMBERS') { v = settings.dmgNumbers === false ? 'OFF' : 'ON'; vc = settings.dmgNumbers === false ? 11 : 8; }
        else if (r === 'FLASHES') { v = settings.flashes ? 'ON' : 'OFF'; vc = settings.flashes ? 8 : 11; }
        else if (r === 'PIXEL SCALE') { v = settings.intScale ? 'INTEGER' : 'FIT'; }
        else if (r === 'MOUSE') { v = settings.mouse ? 'ON' : 'OFF'; vc = settings.mouse ? 8 : 4; }
        else if (r === 'SNEAK MODE') { v = settings.sneakToggle ? 'TOGGLE' : 'HOLD'; }
        else if (r === 'HOLD TO CHAIN') { v = settings.holdChain ? 'ON' : 'OFF'; vc = settings.holdChain ? 8 : 4; }
        else if (r === 'COLOUR MODE') { v = settings.cvd.toUpperCase(); vc = settings.cvd === 'off' ? 4 : 8; }
        else if (r === 'ROTATE VIEW') { v = settings.autoRotate === false ? 'OFF' : 'AUTO'; vc = settings.autoRotate === false ? 4 : 8; }
        else if (r === 'LARGE UI') { v = settings.largeUi ? 'ON' : 'OFF'; vc = settings.largeUi ? 8 : 4; }
        else if (r === 'REDUCE MOTION') { v = settings.reduceMotion ? 'ON' : 'OFF'; vc = settings.reduceMotion ? 8 : 4; }
        else if (r === 'HIGH CONTRAST') { v = settings.highContrast ? 'ON' : 'OFF'; vc = settings.highContrast ? 8 : 4; }
        else if (r === 'BAR NUMBERS') { v = settings.hudNumbers ? 'ON' : 'OFF'; vc = settings.hudNumbers ? 8 : 4; }
        else if (r === 'TEXT SPEED') { v = settings.textSpeed.toUpperCase(); }
        else if (r === 'FRAME RATE') { v = settings.fpsCap ? settings.fpsCap + ' FPS' : 'SCREEN'; }
        else if (r === 'STICK DEADZONE') { v = Math.round((settings.deadzone ?? 0.45) * 100) + '%'; }
        else if (r === 'FULLSCREEN' && document.fullscreenEnabled === false) { v = 'N/A'; vc = 3; }
        else if (r === 'SAVES & BUG REPORT') { v = storage.ok ? null : '!'; vc = 11; }
        row(g, i, y, r, v, vc);
      });
      m.T(12, 146, `${PAGES[pageOf(rows[m.cursor])][0]} ${pageOf(rows[m.cursor]) + 1}/${PAGES.length}  Q NEXT`, 13);
      if (rows.length > VISIBLE) {
        const frac = m.scroll / (rows.length - VISIBLE);
        g.fillStyle(C[3]); g.fillRect(131, 24, 2, 128); g.fillStyle(C[13]); g.fillRect(131, 24 + frac * 116, 2, 12);
      }
      // right: info + controls
      panel(g, 138, 22, W - 144, 134, 2);
      const info = saveInfo();
      m.T(144, 27, fit(MAPS[S.map]?.name || '', 28), 13);
      // how long ago progress was last written, in a colour that says whether that is a worry
      const at = Math.max(lastSaveTime(), info?.t || 0), mins = at ? Math.floor((Date.now() - at) / 60000) : null;
      const saveLine = S.quick ? 'ARENA RUNS ARE NOT SAVED' : S.daily ? 'DAILY ' + runScore() + '  (NOT SAVED)' : tabs.other ? 'OTHER TAB OPEN: NOT SAVING' : !storage.ok ? 'SAVING IS BLOCKED HERE' : at ? `${fmtTime(S.playtime)}  SAVED ${mins < 1 ? 'JUST NOW' : mins + ' MIN AGO'}` : `${fmtTime(S.playtime)}  NOT SAVED YET`;
      m.T(144, 36, fit(saveLine, 28), !at || !storage.ok || tabs.other ? 12 : 5);
      g.fillStyle(C[3]); g.fillRect(144, 44, W - 156, 1);
      (padActive() ? padControls() : CONTROLS()).forEach(([k, v], i) => {      // controller in hand: its buttons
        m.T(144, 48 + i * 9, fit(k, 10), 6);
        m.T(208, 48 + i * 9, fit(v, 17), 4);
      });
    },
  };
}
