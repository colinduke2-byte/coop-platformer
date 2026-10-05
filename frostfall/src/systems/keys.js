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

// Gamepad -> virtual key codes (standard mapping). Sticks/d-pad move and navigate menus.
const PAD_BUTTONS = { 0: 'Space', 1: 'KeyE', 2: 'KeyJ', 3: 'KeyK', 4: 'KeyQ', 5: 'KeyL', 6: 'KeyC', 7: 'KeyR', 8: 'KeyI', 9: 'Escape', 10: 'KeyF', 11: 'KeyM', 12: 'KeyW', 13: 'KeyS', 14: 'KeyA', 15: 'KeyD' };
const padHeld = new Set();
export function pollPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const pad = [...pads].find((p) => p && p.connected);
  const want = new Set();
  if (pad) {
    pad.buttons.forEach((b, i) => { if (b.pressed && PAD_BUTTONS[i]) want.add(PAD_BUTTONS[i]); });
    const [ax, ay] = pad.axes;
    if (ax < -0.4) want.add('KeyA'); if (ax > 0.4) want.add('KeyD');
    if (ay < -0.4) want.add('KeyW'); if (ay > 0.4) want.add('KeyS');
  }
  for (const c of want) if (!padHeld.has(c)) { keys._press(c); padHeld.add(c); }
  for (const c of [...padHeld]) if (!want.has(c)) { keys._release(c); padHeld.delete(c); }
}

export function installKeys(game) {
  game.events.on('prestep', pollPad);
  window.addEventListener('keydown', (e) => {
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
