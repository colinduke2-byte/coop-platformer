// On-screen touch controls: a virtual stick and action buttons that feed the same key system.
// Shown on touch devices (or with ?touch=1). Pure DOM, no assets.
import { keys } from '../systems/keys.js';

const BUTTONS = [
  // [label, code, css position, size, colour]: the four things you press all the time
  ['ROLL', 'Space', 'right:100px;bottom:18px', 54, '#4a5c86'],
  ['HIT', 'KeyJ', 'right:18px;bottom:62px', 62, '#c8383c'],
  ['E', 'KeyE', 'right:18px;bottom:4px', 44, '#f4d460'],
  ['LOCK', 'KeyT', 'right:104px;bottom:84px', 40, '#b88a30'],
];
// Everything else lives in a ring that opens from MORE. [label, code, toggle]
const RING = [
  ['BOW', 'KeyK'], ['MAG', 'KeyL'], ['SWAP', 'KeyQ'], ['SHOUT', 'KeyR'],
  ['BLOCK', 'KeyF', true], ['SNEAK', 'KeyC', true], ['PACK', 'KeyI'], ['MAP', 'KeyM'],
];
const TOP = [['||', 'Escape', 'right:10px;top:10px']];

export function installTouch(force = false) {
  const q = new URLSearchParams(location.search);
  const touch = force || q.get('touch') === '1' || ('ontouchstart' in window) || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
  if (!touch || document.getElementById('touch-ui')) return;
  const root = document.createElement('div');
  root.id = 'touch-ui';
  root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:20;font:bold 11px monospace;color:#eaf2f8;user-select:none;-webkit-user-select:none;touch-action:none';
  document.body.appendChild(root);

  const mk = (label, code, pos, size, bg, toggle = false) => {
    const b = document.createElement('div');
    b.textContent = label;
    b.dataset.code = code;
    b.style.cssText = `position:absolute;${pos};width:${size}px;height:${size}px;border-radius:50%;background:${bg};opacity:.55;border:2px solid #0b0e1a;display:flex;align-items:center;justify-content:center;pointer-events:auto;touch-action:none;text-shadow:1px 1px #0b0e1a`;
    let on = false;
    const down = (e) => { e.preventDefault(); if (toggle) { on = !on; b.style.opacity = on ? '.95' : '.55'; on ? keys._press(code) : keys._release(code); } else { b.style.opacity = '.95'; keys._press(code); } };
    const up = (e) => { e.preventDefault(); if (!toggle) { b.style.opacity = '.55'; keys._release(code); } };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
    root.appendChild(b);
  };
  BUTTONS.forEach(([l, c, p, s, bg, t]) => mk(l, c, p, s, bg, t));
  TOP.forEach(([l, c, p]) => mk(l, c, p, 40, '#1c2338'));

  // MORE button + a two-row ring of the rarer actions
  const more = document.createElement('div');
  more.textContent = 'MORE';
  more.style.cssText = 'position:absolute;right:182px;bottom:18px;width:44px;height:44px;border-radius:50%;background:#2e3a5c;opacity:.6;border:2px solid #0b0e1a;display:flex;align-items:center;justify-content:center;pointer-events:auto;touch-action:none;text-shadow:1px 1px #0b0e1a';
  root.appendChild(more);
  const ring = document.createElement('div');
  ring.style.cssText = 'position:absolute;right:182px;bottom:18px;width:44px;height:44px;display:none;pointer-events:none';
  root.appendChild(ring);
  RING.forEach(([label, code, tog], i) => {
    const x = -(i % 4) * 46 - 20, y = -(Math.floor(i / 4) + 1) * 46 - 2;
    const b = document.createElement('div');
    b.textContent = label; b.dataset.code = code;
    b.style.cssText = `position:absolute;left:${2 + x}px;top:${2 + y}px;width:40px;height:40px;border-radius:50%;background:#1c2338;opacity:.7;border:2px solid #0b0e1a;display:flex;align-items:center;justify-content:center;pointer-events:auto;touch-action:none;text-shadow:1px 1px #0b0e1a;font-size:10px`;
    let on = false;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); if (tog) { on = !on; b.style.background = on ? '#4a5c86' : '#1c2338'; on ? keys._press(code) : keys._release(code); } else { b.style.opacity = '1'; keys._press(code); } });
    const up = (e) => { e.preventDefault(); if (!tog) { b.style.opacity = '.7'; keys._release(code); } };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
    ring.appendChild(b);
  });
  more.addEventListener('pointerdown', (e) => { e.preventDefault(); const open = ring.style.display === 'none'; ring.style.display = open ? 'block' : 'none'; more.style.opacity = open ? '.95' : '.6'; });

  // virtual stick
  const pad = document.createElement('div');
  pad.style.cssText = 'position:absolute;left:18px;bottom:18px;width:120px;height:120px;border-radius:50%;background:#1c2338;opacity:.45;border:2px solid #0b0e1a;pointer-events:auto;touch-action:none';
  const nub = document.createElement('div');
  nub.style.cssText = 'position:absolute;left:40px;top:40px;width:40px;height:40px;border-radius:50%;background:#b4c7e0;opacity:.9';
  pad.appendChild(nub);
  root.appendChild(pad);
  let pid = null;
  const held = new Set();
  const setDir = (dx, dy) => {
    const want = new Set();
    if (dx < -0.35) want.add('KeyA'); if (dx > 0.35) want.add('KeyD');
    if (dy < -0.35) want.add('KeyW'); if (dy > 0.35) want.add('KeyS');
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
}
