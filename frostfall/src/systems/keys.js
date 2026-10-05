// Global keyboard tracker. Works across scenes (including paused ones) because
// it listens on window and clears "pressed" flags once per rendered frame.
import { BINDINGS } from '../config.js';

const down = new Set();
const pressedSet = new Set();
const releasedSet = new Set();
const codeToActions = {};
for (const [act, codes] of Object.entries(BINDINGS)) {
  for (const c of codes) (codeToActions[c] ||= []).push(act);
}
const blockDefault = new Set(['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export const keys = {
  isDown(act) { return (BINDINGS[act] || []).some((c) => down.has(c)); },
  pressed(act) { return (BINDINGS[act] || []).some((c) => pressedSet.has(c)); },
  released(act) { return (BINDINGS[act] || []).some((c) => releasedSet.has(c)); },
  // Raw access for text-less menus (e.g. any key to continue).
  anyPressed() { return pressedSet.size > 0; },
  // Test hooks: let automated tests inject presses without the DOM.
  _press(code) { if (!down.has(code)) { down.add(code); pressedSet.add(code); } },
  _release(code) { if (down.delete(code)) releasedSet.add(code); },
  endFrame() { pressedSet.clear(); releasedSet.clear(); },
  clearAll() { down.clear(); pressedSet.clear(); releasedSet.clear(); },
};

// Gamepad -> virtual key codes (standard mapping). Sticks/d-pad move and navigate menus.
const PAD_BUTTONS = { 0: 'Space', 1: 'KeyE', 2: 'KeyJ', 3: 'KeyK', 4: 'KeyQ', 5: 'KeyL', 6: 'KeyC', 7: 'KeyR', 8: 'KeyI', 9: 'Escape', 10: 'KeyO', 11: 'KeyM', 12: 'KeyW', 13: 'KeyS', 14: 'KeyA', 15: 'KeyD' };
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
    if (blockDefault.has(e.code) || e.code in codeToActions) e.preventDefault();
    if (!e.repeat) keys._press(e.code);
  });
  window.addEventListener('keyup', (e) => keys._release(e.code));
  window.addEventListener('blur', () => keys.clearAll());
  game.events.on('postrender', () => keys.endFrame());
}
