// Save / load via localStorage: 3 slots, a backup copy of each, and corruption recovery.
import { S, loadInto } from './state.js';
import { recalc } from './stats.js';
import { bus } from './bus.js';
import { sfx } from '../audio/sfx.js';
import { settings, saveSettings } from './settings.js';
import { MAPS } from '../data/maps.js';
import { rehydrateGen } from './genloot.js';

export const SLOTS = 3;
const keyFor = (slot) => (slot === 1 ? 'frostfall_save_v1' : `frostfall_save_s${slot}`);
const bakFor = (slot) => keyFor(slot) + '_bak';

// A save must look sane before we trust it.
export function validate(d) {
  return !!(d && d.s && typeof d.s === 'object' && MAPS[d.s.map] && Number.isFinite(d.s.maxHp) && Number.isFinite(d.s.hp)
    && d.s.skills && d.s.inv && typeof d.s.inv === 'object' && d.s.quests);
}

// Returns { data, recovered } or null.
export function readSlot(slot = settings.slot) {
  for (const [k, recovered] of [[keyFor(slot), false], [bakFor(slot), true]]) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const d = JSON.parse(raw);
      if (validate(d)) return { data: d, recovered };
    } catch { /* corrupt: try the backup */ }
  }
  return null;
}

export function hasSave(slot = settings.slot) { return !!readSlot(slot); }
export function anySave() { for (let i = 1; i <= SLOTS; i++) if (readSlot(i)) return true; return false; }

export function saveInfo(slot = settings.slot) {
  const r = readSlot(slot);
  return r ? { t: r.data.t, map: r.data.s.map, playtime: r.data.s.playtime, level: r.data.s.charLevel || 1, recovered: r.recovered } : null;
}
export function listSaves() { return Array.from({ length: SLOTS }, (_, i) => ({ slot: i + 1, info: saveInfo(i + 1) })); }

// auto: silent save to the current slot (e.g. when travelling).
export function saveGame(scene, { auto = false, slot = settings.slot } = {}) {
  if (S.quick) return false;          // Arena Mode never writes a save
  try {
    if (auto) { S.x = S.y = null; S.bossState = null; }
    else if (scene?.player) { S.x = Math.round(scene.player.x); S.y = Math.round(scene.player.y); }
    if (!auto && scene?.mapId) S.map = scene.mapId;
    // remember an ongoing boss fight (hp + phase) so a reload resumes it
    const b = scene?.boss;
    if (!auto && b && b.engaged && !b.dead && !b.yieldDone) S.bossState = { map: scene.mapId, hp: Math.round(b.hp), phase: b.bphase };
    else if (!auto) S.bossState = null;
    const prev = localStorage.getItem(keyFor(slot));
    if (prev) { try { if (validate(JSON.parse(prev))) localStorage.setItem(bakFor(slot), prev); } catch { /* ignore */ } }
    localStorage.setItem(keyFor(slot), JSON.stringify({ v: 2, t: Date.now(), s: S }));
    if (!auto) { bus.emit('toast', slot > 1 || settings.slot > 1 ? `GAME SAVED (SLOT ${slot})` : 'GAME SAVED', 15); sfx.play('save'); }
    return true;
  } catch (e) {
    bus.emit('toast', 'SAVE FAILED', 11);
    return false;
  }
}

// Returns true if a save was loaded into S. Falls back to the backup when the main file is damaged.
export function loadGame(slot = settings.slot) {
  const r = readSlot(slot);
  if (!r) return false;
  loadInto(r.data.s);
  rehydrateGen();
  recalc();
  settings.slot = slot; saveSettings();
  if (r.recovered) bus.emit('toast', 'SAVE RECOVERED FROM BACKUP', 13);
  return true;
}

export function deleteSave(slot = settings.slot) { try { localStorage.removeItem(keyFor(slot)); localStorage.removeItem(bakFor(slot)); } catch { /* ignore */ } }

export const fmtTime = (sec) => {
  const m = Math.floor(sec / 60);
  return `${Math.floor(m / 60)}H ${String(m % 60).padStart(2, '0')}M`;
};
