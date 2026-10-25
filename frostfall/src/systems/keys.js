// Global keyboard tracker. Works across scenes (including paused ones) because
// it listens on window and clears "pressed" flags once per rendered frame.
import { BINDINGS } from '../config.js';
import { settings, saveSettings } from './settings.js';

const down = new Set();
const pressedSet = new Set();
const releasedSet = new Set();
export const DEFAULT_BINDINGS = JSON.parse(JSON.stringify(BINDINGS));
let codeToActions = {};
// The controller and the touch buttons press "virtual" keys (V:<default code>, e.g. V:KeyJ) that always mean the action that
// code had by default. So rebinding a keyboard key never breaks the controller or the touch controls for that action.
const VIRT = {};
for (const [act, codes] of Object.entries(BINDINGS)) VIRT[act] = codes.map((c) => 'V:' + c);
VIRT.pause.push('PadBack2');                     // B in menus backs out wherever ESC would
// Menus (and dialogue, shops, the title) use the usual console layout on a standard pad: A confirms, B goes back,
// LB / RB switch tabs. main.js says when a menu has the keys.
let menuMode = () => false;
export const setMenuMode = (fn) => { menuMode = fn; };
export const inMenu = () => { try { return menuMode(); } catch { return false; } };
const MENU_FACE = { b0: 'V:KeyE', b1: 'PadBack2', b4: 'PadTabL', b5: 'PadTabR' };
const MENU_DPAD = { hu: 'V:KeyW', hd: 'V:KeyS', hl: 'V:KeyA', hr: 'V:KeyD' };
// The pause menu adds its own buttons while it is open (LT / RT sub-pages, X / Y its second actions): MenuScene sets them.
let menuPad = null;
export const setMenuPad = (m) => { menuPad = m || null; };
export const menuPadButton = (code) => (menuPad ? Object.keys(menuPad).find((k) => menuPad[k] === 'V:' + code) || null : null);
export const virt = (code) => 'V:' + code;
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
// Returns the action that gave up the key (it takes your old key instead), or null.
export function setBinding(act, code) {
  const old = BINDINGS[act][0];
  let swapped = null;
  // swap with whoever owned this key so nothing is left unbound
  for (const [other, codes] of Object.entries(BINDINGS)) {
    if (other !== act && codes[0] === code) { BINDINGS[other] = [old, ...codes.slice(1)]; swapped = other; }
    else if (other !== act) BINDINGS[other] = codes.filter((c) => c !== code);
  }
  BINDINGS[act] = [code, ...BINDINGS[act].slice(1).filter((c) => c !== code)];
  // only what differs from the defaults is stored, so later default changes still reach players who rebound something
  const diff = {};
  for (const [a, codes] of Object.entries(BINDINGS)) if (JSON.stringify(codes) !== JSON.stringify(DEFAULT_BINDINGS[a])) diff[a] = [...codes];
  settings.keys = diff;
  saveSettings(); rebuild();
  return swapped;
}
export function resetBindings() { settings.keys = {}; saveSettings(); applyBindings({}); }
// What a key code is called on this keyboard. Codes are physical positions (KeyW is "Z" on AZERTY), so letters come from
// the browser's layout map where it has one, or from what the key typed last time it was pressed.
const layout = new Map();
export const learnKey = (code, key) => { if (/^(Key|Digit)/.test(code) && key && key.length === 1 && /\S/.test(key)) layout.set(code, key.toUpperCase()); };
try { navigator.keyboard?.getLayoutMap?.().then((m) => { for (const [code, key] of m) learnKey(code, key); }).catch(() => {}); } catch { /* not available */ }
export function codeName(c) {
  const m = { Space: 'SPACE', ShiftLeft: 'LSHIFT', ShiftRight: 'RSHIFT', Escape: 'ESC', Enter: 'ENTER', Tab: 'TAB', ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', Mouse0: 'CLICK', Mouse1: 'MID-CLICK', Mouse2: 'R-CLICK', WheelUp: 'WHEEL', WheelDown: 'WHEEL', Minus: '-' };
  return m[c] || layout.get(c) || String(c).replace(/^Key|^Digit/, '');
}
// The name of the key that does `act` right now (first binding), e.g. keyFor('interact') -> 'E'.
export const keyFor = (act) => codeName((BINDINGS[act] || [])[0] || '-');
// The action a default key code stood for (KeyE -> interact), so prompts written with default letters can follow rebinding.
const DEFAULT_ACT = {};
for (const [a, codes] of Object.entries(DEFAULT_BINDINGS)) for (const c of codes) DEFAULT_ACT[c] ||= a;
export const actionOfDefault = (code) => DEFAULT_ACT[code] || null;
let captureCb = null;
export const capture = (cb) => { captureCb = cb; };
export const capturing = () => !!captureCb;
applyBindings();
const blockDefault = new Set(['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

const REP = {};
let frameNo = 0;
const anyIn = (codes, set) => { if (!codes) return false; for (let i = 0; i < codes.length; i++) if (set.has(codes[i])) return true; return false; };
export const keys = {
  isDown(act) { return anyIn(BINDINGS[act], down) || anyIn(VIRT[act], down); },
  pressed(act) { return anyIn(BINDINGS[act], pressedSet) || anyIn(VIRT[act], pressedSet); },
  // Menus: the cast button, or the controller's right bumper (RB) whatever it is mapped to, backs out of anything.
  back() { return this.pressed('spell') || pressedSet.has('PadBack') || pressedSet.has('PadBack2'); },
  // leave a conversation: the cast key (or RB outside menus); never B, which only backs out of a choice
  skipTalk() { return this.pressed('spell') || pressedSet.has('PadBack'); },
  // controller bumpers in menus
  tabLeft() { return pressedSet.has('PadTabL'); },
  tabRight() { return pressedSet.has('PadTabR'); },
  // controller triggers in the pause menu: the sub-pages of a tab
  subLeft() { return pressedSet.has('PadSubL'); },
  subRight() { return pressedSet.has('PadSubR'); },
  released(act) { return anyIn(BINDINGS[act], releasedSet) || anyIn(VIRT[act], releasedSet); },
  // Raw access for text-less menus (e.g. any key to continue).
  anyPressed() { return pressedSet.size > 0; },
  // Test hooks: let automated tests inject presses without the DOM.
  _press(code) { if (captureCb) { const cb = captureCb; captureCb = null; cb(code); return; } if (!down.has(code)) { down.add(code); pressedSet.add(code); } },
  _release(code) { if (down.delete(code)) releasedSet.add(code); },
  // held direction keys repeat in lists: first after 300 ms, then every 80 ms (one answer per frame, however many ask)
  repeat(act) {
    if (this.pressed(act)) { REP[act] = { at: performance.now() + 300, f: frameNo, r: true }; return true; }
    const st = REP[act];
    if (!st || !this.isDown(act)) { if (st) delete REP[act]; return false; }
    if (st.f === frameNo) return st.r;
    st.f = frameNo; st.r = false;
    if (performance.now() >= st.at) { st.at = performance.now() + 80; st.r = true; }
    return st.r;
  },
  endFrame() { pressedSet.clear(); releasedSet.clear(); frameNo++; },
  clearAll() { down.clear(); pressedSet.clear(); releasedSet.clear(); },
};

// ---------------------------------------------------------------------------------------------
// Gamepads (USB or Bluetooth, incl. 8BitDo in X-input / Switch / D-input modes).
// Every physical input gets an id: b<N> = button N, a<N>+ / a<N>- = axis N pushed one way, h<udlr> = hat / d-pad.
// A map from input id -> virtual key code drives the game; players can re-learn it in Pause > System > Controller.
// CB17: the default layout puts block / parry on LB and the heavy attack on RB (never on a stick you are steering with);
// spells move to the d-pad. The old layout stays as Settings > Input > PAD LAYOUT: CLASSIC.
export const PAD_MODERN = {
  b0: 'Space', b1: 'KeyE', b2: 'KeyJ', b3: 'KeyK', b4: 'KeyF', b5: 'KeyU', b6: 'KeyC', b7: 'KeyR', b8: 'KeyG', b9: 'Escape', b11: 'KeyT',
  b12: 'KeyL', b13: 'KeyQ', b14: 'KeyV', b15: 'Digit3',
  hu: 'KeyL', hd: 'KeyQ', hl: 'KeyV', hr: 'Digit3',                        // d-pad: cast / swap spell / switch arrows / stamina potion
  'a2-': 'Digit1', 'a2+': 'Digit2',                                         // right stick: health potion / mana potion
};
export const PAD_CLASSIC = {
  b0: 'Space', b1: 'KeyE', b2: 'KeyJ', b3: 'KeyK', b4: 'KeyQ', b5: 'KeyL', b6: 'KeyC', b7: 'KeyR', b8: 'KeyG', b9: 'Escape', b10: 'KeyF', b11: 'KeyT',
  b12: 'KeyW', b13: 'KeyS', b14: 'KeyA', b15: 'KeyD',
  hu: 'KeyW', hd: 'KeyS', hl: 'KeyA', hr: 'KeyD',
  'a3-': 'KeyU', 'a3+': 'KeyV', 'a2-': 'Digit1', 'a2+': 'Digit2',          // right stick: heavy / ammo / health potion / mana potion
};
export let PAD_DEFAULT = PAD_MODERN;
const padBase = () => (PAD_DEFAULT = settings.padLayout === 'classic' ? PAD_CLASSIC : PAD_MODERN);
export const PAD_ACTIONS = [
  ['Space', 'DODGE ROLL'], ['KeyJ', 'SWORD'], ['KeyK', 'BOW'], ['KeyL', 'CAST SPELL'], ['KeyQ', 'SWAP SPELL'], ['KeyR', 'SHOUT'], ['KeyG', 'SWAP SHOUT'],
  ['KeyU', 'HEAVY ATTACK'], ['KeyT', 'LOCK ON'], ['KeyF', 'BLOCK'], ['KeyC', 'SNEAK'], ['KeyE', 'INTERACT'], ['KeyV', 'SWITCH ARROWS'],
  ['Digit1', 'HEALTH POTION'], ['Digit2', 'MANA POTION'], ['Digit3', 'STAMINA POTION'], ['KeyI', 'PACK'], ['KeyM', 'MAP'], ['KeyO', 'JOURNAL'], ['Escape', 'PAUSE'],
];
// cached until the learned map changes (pollPad reads it every frame)
let mapCache = null, mapSrc, mapLay;
export const padMap = () => {
  if (mapCache && mapSrc === settings.padMap && mapLay === settings.padLayout) return mapCache;
  const m = { ...padBase(), ...(settings.padMap || {}) }; for (const k of Object.keys(m)) if (!m[k]) delete m[k];
  mapSrc = settings.padMap; mapLay = settings.padLayout; mapCache = m; return m;
};
export function setPadBinding(code, inputId) {
  const map = { ...padBase(), ...(settings.padMap || {}) };
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
// listeners told when the device in use switches between controller and keyboard / touch (prompts, rotation, touch UI)
const padWatchers = new Set();
export const onPadChange = (fn) => { padWatchers.add(fn); return () => padWatchers.delete(fn); };
function setUsingPad(v) { if (usingPad === v) return; usingPad = v; for (const fn of padWatchers) { try { fn(v); } catch { /* a watcher must not break input */ } } }
export const touchUsed = () => { setUsingPad(false); };      // the on-screen controls were touched
let padCapture = null;
export const capturePad = (cb) => { padCapture = cb || null; };
const padHeld = new Set();
const padDown = new Set();       // input ids currently active (for "newly pressed" detection)

const actSet = new Set();                    // reused every frame: polling allocates nothing while nobody touches the pad
function activeInputs(pad) {
  const out = actSet; out.clear();
  const btn = pad.buttons;
  for (let i = 0; i < btn.length; i++) if (btn[i].pressed || btn[i].value > 0.55) out.add(BTN_ID[i] || 'b' + i);
  const std = pad.mapping === 'standard';
  const dz = Math.max(0.2, Math.min(0.7, settings.deadzone ?? 0.45)) + 0.1;     // sticks other than the left one: a little past the deadzone
  for (let i = 0; i < pad.axes.length; i++) {
    if (!std && i === 9) continue;                                   // hat axis on non-standard pads, decoded below
    const v = pad.axes[i];
    if (v > dz) out.add(AX_ID[i * 2] || 'a' + i + '+'); else if (v < -dz) out.add(AX_ID[i * 2 + 1] || 'a' + i + '-');
  }
  if (!std && pad.axes.length >= 10) for (const h of decodeHat(pad.axes[9])) out.add(h);
  // standard layout d-pad is buttons 12-15: also report as hat ids so one map works for everything
  if (std) { if (btn[12]?.pressed) out.add('hu'); if (btn[13]?.pressed) out.add('hd'); if (btn[14]?.pressed) out.add('hl'); if (btn[15]?.pressed) out.add('hr'); out.delete('b12'); out.delete('b13'); out.delete('b14'); out.delete('b15'); }
  return out;
}
const BTN_ID = Array.from({ length: 20 }, (_, i) => 'b' + i);
const AX_ID = Array.from({ length: 20 }, (_, i) => 'a' + (i >> 1) + (i % 2 ? '-' : '+'));

// How far the left stick is pushed (0..1) and whether it alone is steering: lets the player walk slowly with a gentle push.
export const stick = { mag: 0, kb: false };
export function stickWalk() { return !stick.kb && stick.mag > 0.4 && stick.mag < 0.95 ? Math.max(0.5, stick.mag * 1.05) : 1; }

const want = new Set();
const KB_MOVE = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
let padIndex = -1;                             // the pad in use (rumble goes to it)
const V = (c) => VCODE[c] || (VCODE[c] = 'V:' + c);
const VCODE = {};
export function pollPad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : null;
  // prefer a pad that is actually being used (some browsers list phantom devices first)
  let pad = null, first = null;
  if (pads) for (let i = 0; i < pads.length; i++) {
    const p = pads[i]; if (!p || !p.connected) continue;
    if (!first) { first = p; if (padIndex < 0) padIndex = i; }
    let busy = false;
    for (const b of p.buttons) if (b.pressed) { busy = true; break; }
    if (!busy) for (const v of p.axes) if (v > 0.5 || v < -0.5) { busy = true; break; }
    if (busy) { pad = p; padIndex = i; break; }
  }
  pad = pad || first;
  want.clear();
  if (pad) {
    const act = activeInputs(pad);
    if (padInfo.id !== pad.id) padInfo = { id: pad.id, mapping: pad.mapping || 'non-standard', live: [] };
    padInfo.live.length = 0; for (const a of act) padInfo.live.push(a);
    const map = padMap();
    if (act.size) setUsingPad(true);
    // left stick always moves / navigates
    const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0, dz = Math.max(0.2, Math.min(0.7, settings.deadzone ?? 0.45));
    stick.mag = Math.min(1, Math.hypot(ax, ay));
    if (ax < -dz) want.add(V('KeyA')); if (ax > dz) want.add(V('KeyD'));
    if (ay < -dz) want.add(V('KeyW')); if (ay > dz) want.add(V('KeyS'));
    // learn mode: the first newly pressed input (ignoring the left stick) is handed to the callback
    if (padCapture) {
      for (const id of act) if (!padDown.has(id) && id !== 'a0+' && id !== 'a0-' && id !== 'a1+' && id !== 'a1-') { const cb = padCapture; padCapture = null; padDown.clear(); act.forEach((x) => padDown.add(x)); cb(id); return; }
      padDown.clear(); act.forEach((x) => padDown.add(x));
    } else {
      padDown.clear(); act.forEach((x) => padDown.add(x));
      const menu = pad.mapping === 'standard' && inMenu();
      for (const id of act) {
        if (menu && menuPad?.[id]) { want.add(menuPad[id]); continue; }
        if (menu && MENU_FACE[id]) { want.add(MENU_FACE[id]); continue; }
        if (menu && MENU_DPAD[id]) { want.add(MENU_DPAD[id]); continue; }      // CB17: the d-pad always navigates menus
        const c = map[id]; if (c) want.add(V(c));
      }
      if (act.has('b5') && !menu) want.add('PadBack');
    }
  } else if (padInfo.id) { padInfo = { id: '', mapping: '', live: [] }; stick.mag = 0; }
  let kb = false; for (const c of KB_MOVE) if (down.has(c)) { kb = true; break; }
  stick.kb = kb;
  for (const c of want) if (!padHeld.has(c)) { keys._press(c); padHeld.add(c); }
  for (const c of padHeld) if (!want.has(c)) { keys._release(c); padHeld.delete(c); }
  // another source (the on-screen buttons, a stray key-up) may have released a key the controller is still holding: put it back
  for (const c of padHeld) if (!down.has(c)) down.add(c);
}

// Short vibration for hits, parries and big moments (ignored if the pad has no motors).
export function rumble(ms = 120, strong = 0.6, weak = 0.3) {
  try {
    const pads = navigator.getGamepads?.() || [];
    const pad = (padIndex >= 0 && pads[padIndex]?.connected ? pads[padIndex] : null) || [...pads].find((p) => p && p.connected);
    const act = pad?.vibrationActuator;
    if (act?.playEffect) act.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak });
    else if (pad?.hapticActuators?.[0]?.pulse) pad.hapticActuators[0].pulse(strong, ms);
  } catch { /* no rumble */ }
}

export function installKeys(game) {
  game.events.on('prestep', pollPad);
  window.addEventListener('gamepadconnected', () => { import('./bus.js').then(({ bus }) => bus.emit('toast', 'CONTROLLER CONNECTED', 13)); });
  // unplugged or out of battery: let go of everything it held, say so, and pause (main.js listens for pad:lost)
  window.addEventListener('gamepaddisconnected', (e) => {
    if (e.gamepad?.index === padIndex) padIndex = -1;
    for (const c of padHeld) keys._release(c);
    padHeld.clear(); setUsingPad(false);
    import('./bus.js').then(({ bus }) => { bus.emit('toast', 'CONTROLLER DISCONNECTED', 11); bus.emit('pad:lost'); });
  });
  window.addEventListener('keydown', (e) => {
    if (e.target?.closest?.('input, textarea, select')) return;          // typing into a panel (save code), not playing
    setUsingPad(false);
    learnKey(e.code, e.key);
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
    if (e.target !== cv()) return;
    keys.wheel = (keys.wheel || 0) + (e.deltaY < 0 ? -1 : 1); keys.wheelT = performance.now();   // menus scroll with the wheel, always
    if (!settings.mouse) return;                                                                 // in play it is an action only with mouse controls on
    const c = e.deltaY < 0 ? 'WheelUp' : 'WheelDown';
    keys._press(c); setTimeout(() => keys._release(c), 30);
  }, { passive: true });
}
