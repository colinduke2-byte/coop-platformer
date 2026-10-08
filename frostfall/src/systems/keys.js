// Global keyboard tracker. Works across scenes (including paused ones) because
// it listens on window and clears "pressed" flags once per rendered frame.
import { BINDINGS } from '../config.js';
import { settings, saveSettings } from './settings.js';

const down = new Set();
const pressedSet = new Set();
const releasedSet = new Set();
export const DEFAULT_BINDINGS = JSON.parse(JSON.stringify(BINDINGS));
let codeToActions = {};
function rebuild() {
  codeToActions = {};
  for (const [act, codes] of Object.entries(BINDINGS)) for (const c of codes) (codeToActions[c] ||= []).push(act);
}
rebuild();
// Apply saved custom bindings on top of the defaults.
export function applyBindings(custom = settings.keys) {
  for (const k of Object.keys(BINDINGS)) BINDINGS[k] = [...DEFAULT_BINDINGS[k]];
  for (const [act, codes] of Object.entries(custom || {})) if (BINDINGS[act] && codes?.length) BINDINGS[act] = [...codes];
  rebuild();
}
export function setBinding(act, code) {
  const old = BINDINGS[act][0];
  // swap with whoever owned this key so nothing is left unbound
  for (const [other, codes] of Object.entries(BINDINGS)) {
    if (other !== act && codes[0] === code) BINDINGS[other] = [old, ...codes.slice(1)];
    else if (other !== act) BINDINGS[other] = codes.filter((c) => c !== code);
  }
  BINDINGS[act] = [code, ...BINDINGS[act].slice(1).filter((c) => c !== code)];
  settings.keys = JSON.parse(JSON.stringify(BINDINGS));
  saveSettings(); rebuild();
}
export function resetBindings() { settings.keys = {}; saveSettings(); applyBindings({}); }
export function codeName(c) {
  const m = { Space: 'SPACE', ShiftLeft: 'LSHIFT', ShiftRight: 'RSHIFT', Escape: 'ESC', Enter: 'ENTER', Tab: 'TAB', ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', Mouse0: 'CLICK', Mouse1: 'MID-CLICK', Mouse2: 'R-CLICK', WheelUp: 'WHEEL', WheelDown: 'WHEEL' };
  return m[c] || String(c).replace(/^Key|^Digit/, '');
}
let captureCb = null;
export const capture = (cb) => { captureCb = cb; };
export const capturing = () => !!captureCb;
applyBindings();
const blockDefault = new Set(['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export const keys = {
  isDown(act) { return (BINDINGS[act] || []).some((c) => down.has(c)); },
  pressed(act) { return (BINDINGS[act] || []).some((c) => pressedSet.has(c)); },
  released(act) { return (BINDINGS[act] || []).some((c) => releasedSet.has(c)); },
  // Raw access for text-less menus (e.g. any key to continue).
  anyPressed() { return pressedSet.size > 0; },
  // Test hooks: let automated tests inject presses without the DOM.
  _press(code) { if (captureCb) { const cb = captureCb; captureCb = null; cb(code); return; } if (!down.has(code)) { down.add(code); pressedSet.add(code); } },
  _release(code) { if (down.delete(code)) releasedSet.add(code); },
  endFrame() { pressedSet.clear(); releasedSet.clear(); },
  clearAll() { down.clear(); pressedSet.clear(); releasedSet.clear(); },
};

// ---------------------------------------------------------------------------------------------
// Gamepads (USB or Bluetooth, incl. 8BitDo in X-input / Switch / D-input modes).
// Every physical input gets an id: b<N> = button N, a<N>+ / a<N>- = axis N pushed one way, h<udlr> = hat / d-pad.
// A map from input id -> virtual key code drives the game; players can re-learn it in Pause > System > Controller.
export const PAD_DEFAULT = {
  b0: 'Space', b1: 'KeyE', b2: 'KeyJ', b3: 'KeyK', b4: 'KeyQ', b5: 'KeyL', b6: 'KeyC', b7: 'KeyR', b8: 'KeyG', b9: 'Escape', b10: 'KeyF', b11: 'KeyT',
  b12: 'KeyW', b13: 'KeyS', b14: 'KeyA', b15: 'KeyD',
  hu: 'KeyW', hd: 'KeyS', hl: 'KeyA', hr: 'KeyD',
  'a3-': 'KeyU', 'a3+': 'KeyV', 'a2-': 'Digit1', 'a2+': 'Digit2',          // right stick: heavy / ammo / health potion / mana potion
};
export const PAD_ACTIONS = [
  ['Space', 'DODGE ROLL'], ['KeyJ', 'SWORD'], ['KeyK', 'BOW'], ['KeyL', 'CAST SPELL'], ['KeyQ', 'SWAP SPELL'], ['KeyR', 'SHOUT'], ['KeyG', 'SWAP SHOUT'],
  ['KeyU', 'HEAVY ATTACK'], ['KeyT', 'LOCK ON'], ['KeyF', 'BLOCK'], ['KeyC', 'SNEAK'], ['KeyE', 'INTERACT'], ['KeyV', 'SWITCH ARROWS'],
  ['Digit1', 'HEALTH POTION'], ['Digit2', 'MANA POTION'], ['Digit3', 'STAMINA POTION'], ['KeyI', 'PACK'], ['KeyM', 'MAP'], ['KeyO', 'JOURNAL'], ['Escape', 'PAUSE'],
];
export const padMap = () => { const m = { ...PAD_DEFAULT, ...(settings.padMap || {}) }; for (const k of Object.keys(m)) if (!m[k]) delete m[k]; return m; };
export function setPadBinding(code, inputId) {
  const map = { ...PAD_DEFAULT, ...(settings.padMap || {}) };
  for (const k of Object.keys(map)) if (map[k] === code && !/^h[udlr]$/.test(k)) map[k] = null;      // null = explicitly unbound
  map[inputId] = code;
  settings.padMap = map; saveSettings();
}
export function resetPadMap() { settings.padMap = null; saveSettings(); }

const HAT = [['hu', -1], ['hu+r', -0.714], ['hr', -0.428], ['hd+r', -0.143], ['hd', 0.143], ['hd+l', 0.429], ['hl', 0.714], ['hu+l', 1]];
const decodeHat = (v) => {
  if (typeof v !== 'number' || Math.abs(v) > 1.05) return [];
  const best = HAT.reduce((a, h) => (Math.abs(h[1] - v) < Math.abs(a[1] - v) ? h : a));
  if (Math.abs(best[1] - v) > 0.12) return [];
  return best[0].split('+').map((x) => (x === 'r' ? 'hr' : x === 'l' ? 'hl' : x));
};

let padInfo = { id: '', mapping: '', live: [] };
export const getPadInfo = () => padInfo;
let usingPad = false;                       // true after the last input came from a controller
export const padActive = () => usingPad;
export const touchUsed = () => { usingPad = false; };      // the on-screen controls were touched
let padCapture = null;
export const capturePad = (cb) => { padCapture = cb || null; };
export const capturingPad = () => !!padCapture;
const padHeld = new Set();
const padDown = new Set();       // input ids currently active (for "newly pressed" detection)

function activeInputs(pad) {
  const out = new Set();
  pad.buttons.forEach((b, i) => { if (b.pressed || b.value > 0.55) out.add('b' + i); });
  const std = pad.mapping === 'standard';
  pad.axes.forEach((v, i) => {
    if (!std && i === 9) return;                                   // hat axis on non-standard pads, decoded below
    if (v > 0.55) out.add('a' + i + '+'); else if (v < -0.55) out.add('a' + i + '-');
  });
  if (!std && pad.axes.length >= 10) for (const h of decodeHat(pad.axes[9])) out.add(h);
  // standard layout d-pad is buttons 12-15: also report as hat ids so one map works for everything
  if (std) { if (pad.buttons[12]?.pressed) out.add('hu'); if (pad.buttons[13]?.pressed) out.add('hd'); if (pad.buttons[14]?.pressed) out.add('hl'); if (pad.buttons[15]?.pressed) out.add('hr'); out.delete('b12'); out.delete('b13'); out.delete('b14'); out.delete('b15'); }
  return out;
}

// How far the left stick is pushed (0..1) and whether it alone is steering: lets the player walk slowly with a gentle push.
export const stick = { mag: 0, kb: false };
export function stickWalk() { return !stick.kb && stick.mag > 0.4 && stick.mag < 0.95 ? Math.max(0.5, stick.mag * 1.05) : 1; }

export function pollPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const list = [...pads].filter((p) => p && p.connected);
  // prefer a pad that is actually being used (some browsers list phantom devices first)
  const pad = list.find((p) => p.buttons.some((b) => b.pressed) || p.axes.some((v) => Math.abs(v) > 0.5)) || list[0];
  const want = new Set();
  if (pad) {
    const act = activeInputs(pad);
    padInfo = { id: pad.id, mapping: pad.mapping || 'non-standard', live: [...act] };
    const map = padMap();
    if (act.size) usingPad = true;
    // left stick always moves / navigates
    const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
    stick.mag = Math.min(1, Math.hypot(ax, ay));
    if (ax < -0.45) want.add('KeyA'); if (ax > 0.45) want.add('KeyD');
    if (ay < -0.45) want.add('KeyW'); if (ay > 0.45) want.add('KeyS');
    // learn mode: the first newly pressed input (ignoring the left stick) is handed to the callback
    if (padCapture) {
      for (const id of act) if (!padDown.has(id) && id !== 'a0+' && id !== 'a0-' && id !== 'a1+' && id !== 'a1-') { const cb = padCapture; padCapture = null; padDown.clear(); act.forEach((x) => padDown.add(x)); cb(id); return; }
      padDown.clear(); act.forEach((x) => padDown.add(x));
    } else {
      padDown.clear(); act.forEach((x) => padDown.add(x));
      for (const id of act) { const c = map[id]; if (c) want.add(c); }
    }
  } else { padInfo = { id: '', mapping: '', live: [] }; stick.mag = 0; }
  stick.kb = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].some((c) => down.has(c) && !padHeld.has(c));
  for (const c of want) if (!padHeld.has(c)) { keys._press(c); padHeld.add(c); }
  for (const c of [...padHeld]) if (!want.has(c)) { keys._release(c); padHeld.delete(c); }
  // another source (the on-screen buttons, a stray key-up) may have released a key the controller is still holding: put it back
  for (const c of padHeld) if (!down.has(c)) down.add(c);
}

// Short vibration for hits, parries and big moments (ignored if the pad has no motors).
export function rumble(ms = 120, strong = 0.6, weak = 0.3) {
  try {
    const pad = [...(navigator.getGamepads?.() || [])].find((p) => p && p.connected);
    const act = pad?.vibrationActuator;
    if (act?.playEffect) act.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak });
    else if (pad?.hapticActuators?.[0]?.pulse) pad.hapticActuators[0].pulse(strong, ms);
  } catch { /* no rumble */ }
}

export function installKeys(game) {
  game.events.on('prestep', pollPad);
  window.addEventListener('gamepadconnected', (e) => { import('./bus.js').then(({ bus }) => bus.emit('toast', 'CONTROLLER CONNECTED', 13)); void e; });
  window.addEventListener('keydown', (e) => {
    usingPad = false;
    if (captureCb) { e.preventDefault(); if (!e.repeat) { const cb = captureCb; captureCb = null; cb(e.code); } return; }
    if (blockDefault.has(e.code) || e.code in codeToActions) e.preventDefault();
    if (!e.repeat) keys._press(e.code);
  });
  window.addEventListener('keyup', (e) => keys._release(e.code));
  window.addEventListener('blur', () => keys.clearAll());
  game.events.on('postrender', () => keys.endFrame());
  // mouse (only when the option is on)
  const cv = () => game.canvas;
  window.addEventListener('mousedown', (e) => { if (settings.mouse && e.target === cv()) { e.preventDefault(); keys._press('Mouse' + e.button); } });
  window.addEventListener('mouseup', (e) => { if (settings.mouse) keys._release('Mouse' + e.button); });
  window.addEventListener('contextmenu', (e) => { if (settings.mouse && e.target === cv()) e.preventDefault(); });
  window.addEventListener('wheel', (e) => {
    if (!settings.mouse || e.target !== cv()) return;
    const c = e.deltaY < 0 ? 'WheelUp' : 'WheelDown';
    keys._press(c); setTimeout(() => keys._release(c), 30);
  }, { passive: true });
}
