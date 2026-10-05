// Save / load via localStorage (single slot).
import { S, loadInto } from './state.js';
import { recalc } from './stats.js';
import { bus } from './bus.js';
import { sfx } from '../audio/sfx.js';

const KEY = 'frostfall_save_v1';

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}

export function saveInfo() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    return d ? { t: d.t, map: d.s.map, playtime: d.s.playtime } : null;
  } catch { return null; }
}

// opts.pos: {x,y} to remember the exact spot; null => start at the map's spawn.
export function saveGame(scene, { auto = false } = {}) {
  try {
    if (auto) { S.x = S.y = null; } else if (scene?.player) { S.x = Math.round(scene.player.x); S.y = Math.round(scene.player.y); }
    if (!auto && scene?.mapId) S.map = scene.mapId;
    localStorage.setItem(KEY, JSON.stringify({ v: 1, t: Date.now(), s: S }));
    if (!auto) { bus.emit('toast', 'GAME SAVED', 15); sfx.play('save'); }
    return true;
  } catch (e) {
    bus.emit('toast', 'SAVE FAILED', 11);
    return false;
  }
}

// Returns true if a save was loaded into S.
export function loadGame() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (!d?.s) return false;
    loadInto(d.s);
    recalc();
    return true;
  } catch { return false; }
}

export function deleteSave() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }

export const fmtTime = (sec) => {
  const m = Math.floor(sec / 60);
  return `${Math.floor(m / 60)}H ${String(m % 60).padStart(2, '0')}M`;
};
