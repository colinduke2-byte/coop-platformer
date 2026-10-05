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

export function installKeys(game) {
  window.addEventListener('keydown', (e) => {
    if (blockDefault.has(e.code) || e.code in codeToActions) e.preventDefault();
    if (!e.repeat) keys._press(e.code);
  });
  window.addEventListener('keyup', (e) => keys._release(e.code));
  window.addEventListener('blur', () => keys.clearAll());
  game.events.on('postrender', () => keys.endFrame());
}
