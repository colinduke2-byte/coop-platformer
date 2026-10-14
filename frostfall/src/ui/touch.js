// On-screen touch controls: a virtual stick and action buttons that feed the same key system.
// Shown on touch devices (or with ?touch=1). Pure DOM, no assets.
import { keys, padActive, touchUsed, virt, onPadChange } from '../systems/keys.js';
import { ui } from '../systems/ui.js';

// positions keep clear of the notch and the home bar (safe-area insets)
const R = (n) => `calc(${n}px + env(safe-area-inset-right))`, B = (n) => `calc(${n}px + env(safe-area-inset-bottom))`;
const L = (n) => `calc(${n}px + env(safe-area-inset-left))`, TP = (n) => `calc(${n}px + env(safe-area-inset-top))`;
const BUTTONS = [
  // [label, code, css position, size, colour, keepInMenus]: the four things you press all the time
  ['ROLL', 'Space', `right:${R(100)};bottom:${B(18)}`, 54, '#4a5c86'],
  ['HIT', 'KeyJ', `right:${R(18)};bottom:${B(62)}`, 62, '#c8383c'],
  ['E', 'KeyE', `right:${R(18)};bottom:${B(4)}`, 44, '#f4d460', false, true],
  ['LOCK', 'KeyT', `right:${R(104)};bottom:${B(84)}`, 40, '#b88a30'],
  // potions get their own buttons (no trip to the pack mid-fight), above the stick
  ['HP', 'Digit1', `left:${L(18)};bottom:${B(148)}`, 36, '#8a2430'],
  ['MP', 'Digit2', `left:${L(60)};bottom:${B(148)}`, 36, '#2a5a9a'],
  ['SP', 'Digit3', `left:${L(102)};bottom:${B(148)}`, 36, '#2f7a46'],
];
// Everything else lives in a ring that opens from MORE. [label, code, toggle]
const RING = [
  ['BOW', 'KeyK'], ['MAG', 'KeyL'], ['SWAP', 'KeyQ'], ['SHOUT', 'KeyR'],
  ['BLOCK', 'KeyF', true], ['SNEAK', 'KeyC', true], ['AMMO', 'KeyV'], ['HEAVY', 'KeyU'], ['PACK', 'KeyI'], ['MAP', 'KeyM'],
];
const TOP = [['||', 'Escape', `right:${R(10)};top:${TP(10)}`]];

export function installTouch(force = false) {
  const q = new URLSearchParams(location.search);
  const touch = force || q.get('touch') === '1' || ('ontouchstart' in window) || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
  if (!touch || document.getElementById('touch-ui')) return;
  const root = document.createElement('div');
  root.id = 'touch-ui';
  root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:20;font:bold 11px monospace;color:#eaf2f8;user-select:none;-webkit-user-select:none;touch-action:none';
  document.body.appendChild(root);

  const combat = [];          // buttons that step aside while a menu or a conversation is open
  const mk = (label, code, pos, size, bg, toggle = false, keep = false) => {
    const b = document.createElement('div');
    b.textContent = label;
    b.dataset.code = code;
    b.style.cssText = `position:absolute;${pos};width:${size}px;height:${size}px;border-radius:50%;background:${bg};opacity:.55;border:2px solid #0b0e1a;display:flex;align-items:center;justify-content:center;pointer-events:auto;touch-action:none;text-shadow:1px 1px #0b0e1a`;
    let on = false;
    const down = (e) => { e.preventDefault(); if (toggle) { on = !on; b.style.opacity = on ? '.95' : '.55'; on ? keys._press(virt(code)) : keys._release(virt(code)); } else { b.style.opacity = '.95'; keys._press(virt(code)); } };
    const up = (e) => { e.preventDefault(); if (!toggle) { b.style.opacity = '.55'; keys._release(virt(code)); } };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
    root.appendChild(b);
    if (!keep) combat.push(b);
  };
  BUTTONS.forEach(([l, c, p, s, bg, t, k]) => mk(l, c, p, s, bg, t, k));
  TOP.forEach(([l, c, p]) => mk(l, c, p, 40, '#1c2338'));

  // MORE button + a two-row ring of the rarer actions
  const more = document.createElement('div');
  more.textContent = 'MORE';
  combat.push(more);
  more.style.cssText = `position:absolute;right:${R(182)};bottom:${B(18)};width:44px;height:44px;border-radius:50%;background:#2e3a5c;opacity:.6;border:2px solid #0b0e1a;display:flex;align-items:center;justify-content:center;pointer-events:auto;touch-action:none;text-shadow:1px 1px #0b0e1a`;
  root.appendChild(more);
  const ring = document.createElement('div');
  ring.style.cssText = `position:absolute;right:${R(182)};bottom:${B(18)};width:44px;height:44px;display:none;pointer-events:none`;
  root.appendChild(ring);
  RING.forEach(([label, code, tog], i) => {
    const x = -(i % 5) * 44 - 20, y = -(Math.floor(i / 5) + 1) * 46 - 2;
    const b = document.createElement('div');
    b.textContent = label; b.dataset.code = code;
    b.style.cssText = `position:absolute;left:${2 + x}px;top:${2 + y}px;width:40px;height:40px;border-radius:50%;background:#1c2338;opacity:.7;border:2px solid #0b0e1a;display:flex;align-items:center;justify-content:center;pointer-events:auto;touch-action:none;text-shadow:1px 1px #0b0e1a;font-size:10px`;
    let on = false;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (tog) { on = !on; b.style.background = on ? '#4a5c86' : '#1c2338'; on ? keys._press(virt(code)) : keys._release(virt(code)); } else { b.style.opacity = '1'; keys._press(virt(code)); } });
    const up = (e) => { e.preventDefault(); if (!tog) { b.style.opacity = '.7'; keys._release(virt(code)); } };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
    ring.appendChild(b);
  });
  more.addEventListener('pointerdown', (e) => { e.preventDefault(); const open = ring.style.display === 'none'; ring.style.display = open ? 'block' : 'none'; more.style.opacity = open ? '.95' : '.6'; });

  // virtual stick
  const pad = document.createElement('div');
  combat.push(pad);
  pad.style.cssText = `position:absolute;left:${L(18)};bottom:${B(18)};width:120px;height:120px;border-radius:50%;background:#1c2338;opacity:.45;border:2px solid #0b0e1a;pointer-events:auto;touch-action:none`;
  const nub = document.createElement('div');
  nub.style.cssText = 'position:absolute;left:40px;top:40px;width:40px;height:40px;border-radius:50%;background:#b4c7e0;opacity:.9';
  pad.appendChild(nub);
  root.appendChild(pad);
  let pid = null;
  const held = new Set();
  const setDir = (dx, dy) => {
    const want = new Set();
    if (dx < -0.35) want.add(virt('KeyA')); if (dx > 0.35) want.add(virt('KeyD'));
    if (dy < -0.35) want.add(virt('KeyW')); if (dy > 0.35) want.add(virt('KeyS'));
    for (const c of want) if (!held.has(c)) { keys._press(c); held.add(c); }
    for (const c of [...held]) if (!want.has(c)) { keys._release(c); held.delete(c); }
  };
  const move = (e) => {
    if (e.pointerId !== pid) return;
    const r = pad.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
    nub.style.left = 40 + dx * 40 + 'px'; nub.style.top = 40 + dy * 40 + 'px';
    setDir(dx, dy);
  };
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); pid = e.pointerId; pad.setPointerCapture(pid); move(e); });
  pad.addEventListener('pointermove', move);
  const end = (e) => { if (e.pointerId !== pid) return; pid = null; nub.style.left = '40px'; nub.style.top = '40px'; setDir(0, 0); };
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);
  document.addEventListener('contextmenu', (e) => { if (root.contains(e.target)) e.preventDefault(); });
  // While a controller is in use the on-screen buttons step aside, so a stray thumb cannot fight it. Touching the screen brings them back.
  const sync = () => { root.style.display = padActive() ? 'none' : ''; };
  onPadChange(sync); sync();
  // menus and conversations take taps on the picture itself: the fight buttons step aside (E and the pause button stay)
  const modal = (on) => { for (const el of combat) el.style.visibility = on ? 'hidden' : ''; if (on) ring.style.display = 'none'; };
  ui.onModal(modal); modal(ui.modal);
  window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch' && root.style.display === 'none') { touchUsed(); sync(); window.__updateRotate?.(); } }, true);
}
