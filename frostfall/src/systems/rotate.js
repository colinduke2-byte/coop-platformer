// Phone + controller: when the phone is held upright but a controller is in use, turn the picture sideways so the game uses the
// whole long edge of the screen. Touching the screen (or turning the phone to landscape) puts it back.
import { settings } from './settings.js';
import { padActive } from './keys.js';
import { W, H } from '../config.js';

let on = false, key = '';
export const rotated = () => on;
const isTouch = () => new URLSearchParams(location.search).get('touch') === '1' || 'ontouchstart' in window || (window.matchMedia && matchMedia('(pointer: coarse)').matches);

export function updateRotate(applyScaling) {
  const w = window.innerWidth, h = window.innerHeight;
  const want = settings.autoRotate !== false && isTouch() && h > w && padActive();
  const k = want ? `${w}x${h}` : '';
  if (k === key) {
    // Phaser re-measures on its own resize events: if it undid our canvas size, apply it again
    if (on) { const c = document.querySelector('canvas'), z = Math.min(h / W, w / H); if (c && Math.abs(parseFloat(c.style.width) - W * (settings.intScale ? Math.max(1, Math.floor(z)) : z)) > 3) applyScaling(); }
    return;
  }
  key = k; on = want;
  const el = document.getElementById('game');
  if (!el) return;
  if (want) {
    Object.assign(el.style, { position: 'fixed', inset: 'auto', left: '0', top: '0', width: h + 'px', height: w + 'px', transformOrigin: '0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `translateX(${w}px) rotate(90deg)` });
  } else {
    for (const p of ['position', 'inset', 'left', 'top', 'width', 'height', 'transform-origin', 'transform', 'display', 'align-items', 'justify-content']) el.style.removeProperty(p);
  }
  applyScaling();
}
